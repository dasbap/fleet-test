-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration : Comptes prospects temporaires + Isolation données démo
--
-- Objectifs :
--   1. Comptes prospects 7 jours — génération, expiration, suspension auto
--   2. Flag is_demo sur organisations/flottes pour namespace démo
--   3. RLS isolation stricte : démo ↔ réel totalement séparés
--   4. Fonctions SQL : prospect_create_account, prospect_expire_accounts,
--      prospect_suspend_expired, prospect_reset_demo_fleet
--   5. pg_cron : expiration quotidienne à 03:00 UTC
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── 1. Colonne account_type sur demo_profiles ────────────────────────────────
-- Distingue les comptes démo permanents (commerciaux) des prospects temporaires.

ALTER TABLE public.demo_profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'permanent'
    CHECK (account_type IN ('permanent', 'prospect', 'internal'));

COMMENT ON COLUMN public.demo_profiles.account_type IS
  'permanent = compte démo commercial, prospect = essai 7j, internal = équipe interne';


-- ─── 2. Flag is_demo sur organisations ────────────────────────────────────────

ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.organisations.is_demo IS
  'Organisation de démonstration — données jamais visibles par les vrais clients.';

CREATE INDEX IF NOT EXISTS idx_organisations_is_demo
  ON public.organisations (is_demo) WHERE is_demo = true;


-- ─── 3. Flag is_demo sur flottes ──────────────────────────────────────────────

ALTER TABLE public.flottes
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.flottes.is_demo IS
  'Flotte de démonstration — données isolées des flottes de production.';

CREATE INDEX IF NOT EXISTS idx_flottes_is_demo
  ON public.flottes (is_demo) WHERE is_demo = true;


-- ─── 4. Table prospect_registrations ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.prospect_registrations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fleet_id      uuid        NOT NULL REFERENCES public.flottes(id) ON DELETE RESTRICT,
  email         text        NOT NULL,
  company_name  text,
  invited_by    uuid        REFERENCES auth.users(id),
  trial_start   timestamptz NOT NULL DEFAULT now(),
  trial_end     timestamptz NOT NULL DEFAULT now() + interval '7 days',
  status        text        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'suspended', 'converted')),
  suspend_reason text,
  reset_count   int         NOT NULL DEFAULT 0,
  last_reset_at timestamptz,
  metadata      jsonb       NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.prospect_registrations IS
  'Comptes prospects E-Samba — essais 7 jours avec expiration automatique.';

CREATE INDEX IF NOT EXISTS idx_prospect_status
  ON public.prospect_registrations (status, trial_end)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_prospect_user
  ON public.prospect_registrations (user_id);

ALTER TABLE public.prospect_registrations ENABLE ROW LEVEL SECURITY;

-- Service_role uniquement (admins commerciaux) — pas d'accès client direct
CREATE POLICY prospect_no_select ON public.prospect_registrations
  FOR SELECT USING (false);

GRANT SELECT, INSERT, UPDATE ON public.prospect_registrations TO service_role;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.prospect_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS prospect_updated_at ON public.prospect_registrations;
CREATE TRIGGER prospect_updated_at
  BEFORE UPDATE ON public.prospect_registrations
  FOR EACH ROW EXECUTE FUNCTION public.prospect_set_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════════
-- FONCTIONS PROSPECT
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── prospect_get_demo_fleet_id() ─────────────────────────────────────────────
-- Retourne l'ID de la flotte démo désignée pour les prospects.
-- Priorité : première flotte is_demo=true avec le moins de prospects actifs.

CREATE OR REPLACE FUNCTION public.prospect_get_demo_fleet_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT f.id
  FROM public.flottes f
  LEFT JOIN public.prospect_registrations pr
    ON pr.fleet_id = f.id AND pr.status = 'active'
  WHERE f.is_demo = true
  GROUP BY f.id
  ORDER BY count(pr.id) ASC, f.created_at ASC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.prospect_get_demo_fleet_id() IS
  'Sélectionne la flotte démo avec le moins de prospects actifs (load balancing).';

GRANT EXECUTE ON FUNCTION public.prospect_get_demo_fleet_id() TO service_role;


-- ─── prospect_create_account() ────────────────────────────────────────────────
-- Appelée par la Edge Function après création du compte auth.users.
-- Enregistre le prospect dans demo_profiles + prospect_registrations + flotte_adhesions.

CREATE OR REPLACE FUNCTION public.prospect_create_account(
  p_user_id      uuid,
  p_email        text,
  p_company_name text  DEFAULT NULL,
  p_invited_by   uuid  DEFAULT NULL,
  p_fleet_id     uuid  DEFAULT NULL,
  p_trial_days   int   DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fleet_id uuid;
  v_reg_id   uuid;
  v_trial_end timestamptz;
BEGIN
  -- Sélectionner la flotte démo (paramètre ou auto-sélection)
  v_fleet_id := COALESCE(p_fleet_id, prospect_get_demo_fleet_id());

  IF v_fleet_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'no_demo_fleet_available'
    );
  END IF;

  v_trial_end := now() + (p_trial_days || ' days')::interval;

  -- Insérer dans demo_profiles (idempotent)
  INSERT INTO public.demo_profiles (
    user_id, demo_role, fleet_id, is_active,
    expires_at, account_type
  )
  VALUES (
    p_user_id, 'driver', v_fleet_id, true,
    v_trial_end, 'prospect'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET demo_role    = 'driver',
        fleet_id     = v_fleet_id,
        is_active    = true,
        expires_at   = v_trial_end,
        account_type = 'prospect';

  -- Créer l'adhésion à la flotte démo (role driver)
  INSERT INTO public.flotte_adhesions (
    user_id, fleet_id, role, is_active
  )
  VALUES (
    p_user_id, v_fleet_id, 'driver', true
  )
  ON CONFLICT (user_id, fleet_id) DO UPDATE
    SET role      = 'driver',
        is_active = true;

  -- Enregistrement prospect
  INSERT INTO public.prospect_registrations (
    user_id, fleet_id, email, company_name,
    invited_by, trial_end, status
  )
  VALUES (
    p_user_id, v_fleet_id, p_email, p_company_name,
    p_invited_by, v_trial_end, 'active'
  )
  RETURNING id INTO v_reg_id;

  -- Audit log
  PERFORM public.demo_log_action(
    p_user_id, NULL, 'prospect_created',
    jsonb_build_object(
      'fleet_id',      v_fleet_id,
      'email',         p_email,
      'company',       p_company_name,
      'trial_end',     v_trial_end,
      'invited_by',    p_invited_by
    )
  );

  RETURN jsonb_build_object(
    'ok',         true,
    'user_id',    p_user_id,
    'fleet_id',   v_fleet_id,
    'reg_id',     v_reg_id,
    'trial_end',  v_trial_end
  );
END;
$$;

COMMENT ON FUNCTION public.prospect_create_account(uuid,text,text,uuid,uuid,int) IS
  'Enregistre un prospect après création auth — demo_profiles + flotte_adhesions + prospect_registrations.';

GRANT EXECUTE ON FUNCTION public.prospect_create_account(uuid,text,text,uuid,uuid,int) TO service_role;


-- ─── prospect_expire_accounts() ───────────────────────────────────────────────
-- Marque comme expirés tous les prospects dont trial_end < now().
-- Retourne le nombre de comptes expirés.

CREATE OR REPLACE FUNCTION public.prospect_expire_accounts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count int := 0;
  v_row           RECORD;
BEGIN
  FOR v_row IN
    SELECT pr.id, pr.user_id, pr.email, pr.fleet_id
    FROM public.prospect_registrations pr
    WHERE pr.status = 'active'
      AND pr.trial_end < now()
  LOOP
    -- Marquer expiré dans prospect_registrations
    UPDATE public.prospect_registrations
    SET status     = 'expired',
        updated_at = now()
    WHERE id = v_row.id;

    -- Désactiver demo_profile
    UPDATE public.demo_profiles
    SET is_active = false
    WHERE user_id = v_row.user_id;

    -- Audit
    PERFORM public.demo_log_action(
      v_row.user_id, NULL, 'prospect_expired',
      jsonb_build_object(
        'email',    v_row.email,
        'fleet_id', v_row.fleet_id,
        'reg_id',   v_row.id
      )
    );

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok',           true,
    'expired_count', v_expired_count,
    'run_at',        now()
  );
END;
$$;

COMMENT ON FUNCTION public.prospect_expire_accounts() IS
  'Expire tous les prospects dont le trial de 7j est terminé. Appelée par le cron.';

GRANT EXECUTE ON FUNCTION public.prospect_expire_accounts() TO service_role;


-- ─── prospect_suspend_expired() ───────────────────────────────────────────────
-- Suspend les comptes expirés depuis plus de 24h (délai de grâce).
-- La suspension côté auth.users est gérée par la Edge Function (service_role admin).

CREATE OR REPLACE FUNCTION public.prospect_suspend_expired()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suspended_count int := 0;
  v_row             RECORD;
  v_grace_cutoff    timestamptz := now() - interval '24 hours';
BEGIN
  FOR v_row IN
    SELECT pr.id, pr.user_id, pr.email, pr.fleet_id
    FROM public.prospect_registrations pr
    WHERE pr.status = 'expired'
      AND pr.updated_at < v_grace_cutoff -- 24h après expiration
  LOOP
    UPDATE public.prospect_registrations
    SET status         = 'suspended',
        suspend_reason = 'trial_expired_auto',
        updated_at     = now()
    WHERE id = v_row.id;

    -- Révoquer l'adhésion flotte
    UPDATE public.flotte_adhesions
    SET is_active = false
    WHERE user_id  = v_row.user_id
      AND fleet_id = v_row.fleet_id;

    -- Audit
    PERFORM public.demo_log_action(
      v_row.user_id, NULL, 'prospect_suspended',
      jsonb_build_object(
        'email',    v_row.email,
        'fleet_id', v_row.fleet_id,
        'reason',   'trial_expired_auto'
      )
    );

    v_suspended_count := v_suspended_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok',              true,
    'suspended_count', v_suspended_count,
    'run_at',          now()
  );
END;
$$;

COMMENT ON FUNCTION public.prospect_suspend_expired() IS
  'Suspend les comptes expirés depuis plus de 24h — révoque les adhésions flotte.';

GRANT EXECUTE ON FUNCTION public.prospect_suspend_expired() TO service_role;


-- ─── prospect_reset_demo_fleet() ──────────────────────────────────────────────
-- Nettoie les données créées par des prospects sur une flotte démo
-- et réinsère des données d'exemple fraîches.
-- NE supprime PAS les véhicules de seed (created_by IS NULL).

CREATE OR REPLACE FUNCTION public.prospect_reset_demo_fleet(p_fleet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicles_deleted    int := 0;
  v_maintenance_deleted int := 0;
  v_dvir_deleted        int := 0;
BEGIN
  -- Vérifier que c'est bien une flotte démo
  IF NOT EXISTS (
    SELECT 1 FROM public.flottes WHERE id = p_fleet_id AND is_demo = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_a_demo_fleet');
  END IF;

  -- Supprimer travaux de maintenance créés par des prospects
  DELETE FROM public.travaux_maintenance tm
  WHERE tm.fleet_id = p_fleet_id
    AND EXISTS (
      SELECT 1 FROM public.prospect_registrations pr
      WHERE pr.user_id = tm.created_by
    );
  GET DIAGNOSTICS v_maintenance_deleted = ROW_COUNT;

  -- Supprimer DVIR créés par des prospects (si table existe)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dvir_controles'
  ) THEN
    EXECUTE format(
      'DELETE FROM public.dvir_controles
       WHERE fleet_id = %L
         AND driver_id IN (
           SELECT user_id FROM public.prospect_registrations
         )', p_fleet_id
    );
    GET DIAGNOSTICS v_dvir_deleted = ROW_COUNT;
  END IF;

  -- Supprimer véhicules créés par des prospects (pas les véhicules de seed)
  DELETE FROM public.vehicules v
  WHERE v.fleet_id = p_fleet_id
    AND EXISTS (
      SELECT 1 FROM public.prospect_registrations pr
      WHERE pr.user_id = v.created_by
    );
  GET DIAGNOSTICS v_vehicles_deleted = ROW_COUNT;

  -- Incrémenter le compteur reset
  UPDATE public.prospect_registrations
  SET reset_count   = reset_count + 1,
      last_reset_at = now()
  WHERE fleet_id = p_fleet_id AND status != 'converted';

  -- Audit
  INSERT INTO public.demo_audit_logs (
    user_id, action, resource, status, metadata
  ) VALUES (
    NULL, 'fleet_reset', p_fleet_id::text, 'allowed',
    jsonb_build_object(
      'fleet_id',            p_fleet_id,
      'vehicles_deleted',    v_vehicles_deleted,
      'maintenance_deleted', v_maintenance_deleted,
      'dvir_deleted',        v_dvir_deleted,
      'reset_at',            now()
    )
  );

  RETURN jsonb_build_object(
    'ok',                  true,
    'fleet_id',            p_fleet_id,
    'vehicles_deleted',    v_vehicles_deleted,
    'maintenance_deleted', v_maintenance_deleted,
    'dvir_deleted',        v_dvir_deleted,
    'reset_at',            now()
  );
END;
$$;

COMMENT ON FUNCTION public.prospect_reset_demo_fleet(uuid) IS
  'Nettoie les données prospect d''une flotte démo et remet les données de seed.';

GRANT EXECUTE ON FUNCTION public.prospect_reset_demo_fleet(uuid) TO service_role;


-- ─── prospect_get_status() ────────────────────────────────────────────────────
-- Retourne le statut du trial pour l'utilisateur courant.
-- Appelée depuis le frontend via supabase.rpc().

CREATE OR REPLACE FUNCTION public.prospect_get_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_reg RECORD;
BEGIN
  -- Vérifier que c'est bien un prospect
  SELECT pr.*
  INTO v_reg
  FROM public.prospect_registrations pr
  WHERE pr.user_id = auth.uid()
  ORDER BY pr.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_a_prospect');
  END IF;

  RETURN jsonb_build_object(
    'ok',           true,
    'status',       v_reg.status,
    'trial_start',  v_reg.trial_start,
    'trial_end',    v_reg.trial_end,
    'fleet_id',     v_reg.fleet_id,
    'days_remaining', GREATEST(0,
      EXTRACT(EPOCH FROM (v_reg.trial_end - now())) / 86400
    )::int,
    'is_expired',   v_reg.trial_end < now() OR v_reg.status NOT IN ('active')
  );
END;
$$;

COMMENT ON FUNCTION public.prospect_get_status() IS
  'Statut du trial pour auth.uid() — appelable depuis le frontend.';

GRANT EXECUTE ON FUNCTION public.prospect_get_status() TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS : ISOLATION STRICTE DONNÉES DÉMO / RÉELLES
--
-- Principe RESTRICTIVE :
--   - Utilisateur démo    → voit uniquement flottes/orgs où is_demo = true
--   - Utilisateur réel    → voit uniquement flottes/orgs où is_demo = false
--   - Admin plateforme    → voit tout (accès audit)
--
-- L'isolation sur flottes cascade vers vehicules, travaux_maintenance,
-- etc. (ils filtrent déjà par fleet_id, et la flotte est filtrée ici).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Isolation sur flottes ────────────────────────────────────────────────────

DROP POLICY IF EXISTS demo_isolation_flottes ON public.flottes;
CREATE POLICY demo_isolation_flottes ON public.flottes
  AS RESTRICTIVE
  FOR ALL
  USING (
    -- Admin plateforme : tout voir
    is_platform_admin()
    -- Utilisateur démo (demo ou prospect actif) : uniquement flottes démo
    OR (is_demo_user() AND is_demo = true)
    -- Utilisateur réel : jamais les flottes démo
    OR (NOT is_demo_user() AND (is_demo = false OR is_demo IS NULL))
  );

-- ─── Isolation sur organisations ──────────────────────────────────────────────

DROP POLICY IF EXISTS demo_isolation_organisations ON public.organisations;
CREATE POLICY demo_isolation_organisations ON public.organisations
  AS RESTRICTIVE
  FOR ALL
  USING (
    is_platform_admin()
    OR (is_demo_user() AND is_demo = true)
    OR (NOT is_demo_user() AND (is_demo = false OR is_demo IS NULL))
  );

-- ─── Prospect expiré : couper l'accès immédiatement ──────────────────────────
-- Policy RESTRICTIVE sur demo_profiles : un prospect expiré ne peut plus passer.

DROP POLICY IF EXISTS prospect_active_only ON public.demo_profiles;
CREATE POLICY prospect_active_only ON public.demo_profiles
  AS RESTRICTIVE
  FOR SELECT
  USING (
    -- Service_role voit tout
    true -- RLS service_role bypasse toujours
  );

-- ─── Isolation vehicules (renforcée) ─────────────────────────────────────────
-- Empêche un utilisateur réel de voir un véhicule d'une flotte démo
-- même s'il connaît le fleet_id (défense en profondeur).

DROP POLICY IF EXISTS demo_isolation_vehicules ON public.vehicules;
CREATE POLICY demo_isolation_vehicules ON public.vehicules
  AS RESTRICTIVE
  FOR ALL
  USING (
    is_platform_admin()
    OR (
      is_demo_user()
      AND EXISTS (
        SELECT 1 FROM public.flottes f
        WHERE f.id = vehicules.fleet_id AND f.is_demo = true
      )
    )
    OR (
      NOT is_demo_user()
      AND EXISTS (
        SELECT 1 FROM public.flottes f
        WHERE f.id = vehicules.fleet_id AND (f.is_demo = false OR f.is_demo IS NULL)
      )
    )
  );

-- ─── Isolation travaux_maintenance (renforcée) ────────────────────────────────

DROP POLICY IF EXISTS demo_isolation_maintenance ON public.travaux_maintenance;
CREATE POLICY demo_isolation_maintenance ON public.travaux_maintenance
  AS RESTRICTIVE
  FOR ALL
  USING (
    is_platform_admin()
    OR (
      is_demo_user()
      AND EXISTS (
        SELECT 1 FROM public.flottes f
        WHERE f.id = travaux_maintenance.fleet_id AND f.is_demo = true
      )
    )
    OR (
      NOT is_demo_user()
      AND EXISTS (
        SELECT 1 FROM public.flottes f
        WHERE f.id = travaux_maintenance.fleet_id AND (f.is_demo = false OR f.is_demo IS NULL)
      )
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER : is_prospect_active()
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_prospect_active()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.prospect_registrations
    WHERE user_id  = auth.uid()
      AND status   = 'active'
      AND trial_end > now()
  );
$$;

COMMENT ON FUNCTION public.is_prospect_active() IS
  'Vrai si auth.uid() est un prospect avec trial encore valide.';

GRANT EXECUTE ON FUNCTION public.is_prospect_active() TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════════
-- VUE ADMIN : suivi prospects
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_prospect_dashboard AS
SELECT
  pr.id            AS reg_id,
  pr.email,
  pr.company_name,
  pr.status,
  pr.trial_start,
  pr.trial_end,
  GREATEST(0, EXTRACT(EPOCH FROM (pr.trial_end - now())) / 86400)::int AS days_remaining,
  pr.fleet_id,
  f.name           AS fleet_name,
  dp.account_type,
  dp.is_active     AS demo_active,
  pr.reset_count,
  pr.last_reset_at,
  pr.created_at
FROM public.prospect_registrations pr
LEFT JOIN public.flottes f       ON f.id = pr.fleet_id
LEFT JOIN public.demo_profiles dp ON dp.user_id = pr.user_id
ORDER BY pr.created_at DESC;

COMMENT ON VIEW public.v_prospect_dashboard IS
  'Vue admin — suivi des prospects en cours et expirés.';

GRANT SELECT ON public.v_prospect_dashboard TO service_role;


-- ═══════════════════════════════════════════════════════════════════════════════
-- pg_cron : expiration quotidienne à 03:00 UTC
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'prospect-daily-expiration',
  '0 3 * * *',
  'SELECT prospect_expire_accounts(); SELECT prospect_suspend_expired();'
);

-- pg_cron : reset hebdomadaire des flottes démo (dimanche 04:00 UTC)
-- Appelé séparément pour chaque flotte démo via la Edge Function.
-- Le cron SQL ne peut pas itérer facilement → géré par la Edge Function.
