-- Migration : audit_logs rôles
-- Ajoute fleet_id sur audit_logs + trigger sur flotte_adhesions pour tracer
-- les changements de rôle et d'activation/désactivation de membres.

-- ── 1. Ajouter fleet_id sur audit_logs (idempotent) ──────────────────────────
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS fleet_id uuid REFERENCES public.flottes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS audit_logs_fleet_id_idx
  ON public.audit_logs (fleet_id, created_at DESC)
  WHERE fleet_id IS NOT NULL;

-- ── 2. Fonction trigger SECURITY DEFINER ──────────────────────────────────────
-- Insère dans audit_logs à chaque changement de rôle ou de statut is_active.
-- SECURITY DEFINER + SET row_security = off pour contourner la RLS sur audit_logs
-- (les membres sans admin ne peuvent pas écrire dans audit_logs directement).

CREATE OR REPLACE FUNCTION public.audit_flotte_adhesion_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_action  text;
  v_meta    jsonb;
BEGIN
  -- INSERT : nouveau membre
  IF TG_OP = 'INSERT' THEN
    v_action := 'member.added';
    v_meta   := jsonb_build_object(
      'fleet_id',  NEW.fleet_id,
      'user_id',   NEW.user_id,
      'role',      NEW.role,
      'is_active', NEW.is_active
    );

  -- UPDATE : changement de rôle ou d'activation
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role AND OLD.is_active IS NOT DISTINCT FROM NEW.is_active THEN
      v_action := 'member.role_changed';
      v_meta   := jsonb_build_object(
        'fleet_id', NEW.fleet_id,
        'user_id',  NEW.user_id,
        'old_role', OLD.role,
        'new_role', NEW.role
      );
    ELSIF OLD.is_active IS DISTINCT FROM NEW.is_active AND OLD.role IS NOT DISTINCT FROM NEW.role THEN
      v_action := CASE WHEN NEW.is_active THEN 'member.reactivated' ELSE 'member.deactivated' END;
      v_meta   := jsonb_build_object(
        'fleet_id',      NEW.fleet_id,
        'user_id',       NEW.user_id,
        'role',          NEW.role,
        'was_active',    OLD.is_active,
        'is_now_active', NEW.is_active
      );
    ELSIF OLD.role IS DISTINCT FROM NEW.role AND OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      -- Les deux changent simultanément (ex: onboarding bootstrap)
      v_action := 'member.updated';
      v_meta   := jsonb_build_object(
        'fleet_id',      NEW.fleet_id,
        'user_id',       NEW.user_id,
        'old_role',      OLD.role,
        'new_role',      NEW.role,
        'old_is_active', OLD.is_active,
        'new_is_active', NEW.is_active
      );
    ELSE
      -- Pas de changement pertinent (timestamp, etc.) → skip
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Insert dans audit_logs
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    target_id,
    fleet_id,
    metadata,
    created_at
  )
  VALUES (
    auth.uid(),           -- peut être NULL si appelé par un trigger système
    v_action,
    NEW.user_id,
    NEW.fleet_id,
    v_meta,
    now()
  );

  RETURN NEW;
END;
$$;

-- ── 3. Attacher le trigger (idempotent) ──────────────────────────────────────
DROP TRIGGER IF EXISTS trg_audit_flotte_adhesion ON public.flotte_adhesions;

CREATE TRIGGER trg_audit_flotte_adhesion
  AFTER INSERT OR UPDATE ON public.flotte_adhesions
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_flotte_adhesion_changes();

COMMENT ON FUNCTION public.audit_flotte_adhesion_changes() IS
  'Trigger : trace les changements de rôle et d''activation dans audit_logs pour chaque flotte.';
