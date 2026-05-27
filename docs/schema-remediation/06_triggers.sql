-- ============================================================
-- 06_triggers.sql — E-Samba
-- Triggers critiques : profil auto, updated_at, audit.
-- CREATE OR REPLACE idempotent.
-- ============================================================

-- ════════════════════════════════════════════════════════════
-- 1. updated_at automatique (générique)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Appliquer sur toutes les tables ayant updated_at

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profils', 'organisations', 'flotte_adhesions', 'flottes'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'updated_at'
    ) THEN
      EXECUTE format('
        DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;
        CREATE TRIGGER trg_%I_updated_at
          BEFORE UPDATE ON public.%I
          FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
      ', t, t, t, t);
    END IF;
  END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════
-- 2. Création automatique du profil après signup Supabase Auth
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_phone     text;
BEGIN
  -- Extraire les métadonnées du signup
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  v_phone := NEW.raw_user_meta_data->>'phone';

  INSERT INTO public.profils (
    user_id, email, full_name, phone,
    universe, status, created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_phone,
    'real'::public.access_universe,
    'pending'::public.account_status,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = COALESCE(EXCLUDED.full_name, profils.full_name),
    updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Ne jamais bloquer le signup
  RAISE WARNING 'handle_new_user error for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ════════════════════════════════════════════════════════════
-- 3. Sync email auth.users → profils sur UPDATE
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profils
    SET email = NEW.email, updated_at = now()
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sync_user_email error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_email();

-- ════════════════════════════════════════════════════════════
-- 4. Activer le profil après confirmation email
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.activate_profile_on_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- email_confirmed_at passe de NULL à une valeur
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profils
    SET status = 'active'::public.account_status, updated_at = now()
    WHERE user_id = NEW.id AND status::text = 'pending';
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'activate_profile_on_confirmation error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.activate_profile_on_confirmation();

-- ════════════════════════════════════════════════════════════
-- 5. Audit log sur actions sensibles (flotte_adhesions)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.audit_flotte_adhesion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (actor_id, action, target_id, metadata)
    VALUES (
      auth.uid(),
      'adhesion_created',
      NEW.user_id,
      jsonb_build_object('fleet_id', NEW.fleet_id, 'role', NEW.role)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    INSERT INTO public.audit_logs (actor_id, action, target_id, metadata)
    VALUES (
      auth.uid(),
      CASE WHEN NEW.is_active THEN 'adhesion_reactivated' ELSE 'adhesion_deactivated' END,
      NEW.user_id,
      jsonb_build_object('fleet_id', NEW.fleet_id, 'role', NEW.role)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_flotte_adhesion ON public.flotte_adhesions;
CREATE TRIGGER trg_audit_flotte_adhesion
  AFTER INSERT OR UPDATE ON public.flotte_adhesions
  FOR EACH ROW EXECUTE FUNCTION public.audit_flotte_adhesion();

-- ════════════════════════════════════════════════════════════
-- 6. Expiration automatique des comptes temporaires
--    (appelé par un cron pg_cron ou Edge Function)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.expire_temporary_accounts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.profils
  SET status = 'expired'::public.account_status, updated_at = now()
  WHERE universe::text = 'temporary'
    AND status::text = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    -- Désactiver aussi les adhésions
    UPDATE public.flotte_adhesions fa
    SET is_active = false, updated_at = now()
    FROM public.profils p
    WHERE fa.user_id = p.user_id
      AND p.status::text = 'expired'
      AND fa.is_active = true;

    INSERT INTO public.audit_logs (actor_id, action, metadata)
    VALUES (NULL, 'expire_temporary_accounts', jsonb_build_object('count', v_count));
  END IF;

  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.expire_temporary_accounts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_temporary_accounts() TO service_role;
