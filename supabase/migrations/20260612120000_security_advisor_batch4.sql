-- ============================================================
-- BATCH 4 - Security Advisor (juin 2026)
-- 1. search_path mutable
-- 2. Extension pg_trgm -> schema extensions
-- 3. REVOKE PUBLIC + grants cibles
-- 4. RLS demo_requests + help_search_events
-- ============================================================

-- 1. search_path
DO $$
DECLARE
  function_name text;
  function_ref regprocedure;
BEGIN
  FOREACH function_name IN ARRAY ARRAY[
    'set_help_updated_at',
    'cloturer_creneau'
  ] LOOP
    FOR function_ref IN
      SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = function_name
    LOOP
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_catalog', function_ref);
    END LOOP;
  END LOOP;
END $$;

-- 2. Extension pg_trgm hors public
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  ELSE
    RAISE NOTICE 'Extension pg_trgm absente - deplacement ignore.';
  END IF;
END $$;

-- 3. Grants EXECUTE - revoquer l'heritage PUBLIC par defaut
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

DO $$
DECLARE
  function_name text;
  function_ref regprocedure;
BEGIN
  -- Fonctions admin / cron / diagnostic : service_role uniquement.
  FOREACH function_name IN ARRAY ARRAY[
    'admin_list_demo_sessions',
    'admin_reset_demo_fleet',
    'billing_cancel_subscription',
    'billing_enter_grace_period',
    'billing_run_daily_lifecycle',
    'billing_start_trial',
    'billing_suspend_subscription',
    'check_constraint_violations',
    'check_esamba_2024',
    'check_logical_inconsistencies',
    'check_orphaned_data',
    'cleanup_orphaned_data',
    'deactivate_demo_account',
    'expire_demo_accounts_by_type',
    'expire_temporary_accounts',
    'get_database_stats',
    'liste_migrations_appliquees',
    'nettoyer_base_donnees',
    'prospect_expire_accounts',
    'prospect_suspend_expired',
    'reactivate_demo_account',
    'recreate_esamba_2024',
    'refund_payment',
    'rls_auto_enable',
    'seed_esamba_2024',
    'set_demo_account_expiry',
    'suspend_account',
    'verifier_sante_systeme',
    'audit_cloture_validation',
    'audit_flotte_adhesion',
    'audit_flotte_adhesion_changes',
    'audit_flotte_invitation_insert',
    'audit_flotte_settings',
    'audit_organisation_settings',
    'audit_travaux_maintenance_changes',
    'audit_vehicule_changes',
    'handle_new_user',
    'handle_invitation_signup',
    'sync_user_email',
    'trg_controles_dvir_unsafe_alert',
    'trg_enforce_fleet_vehicle_limit',
    'refresh_analytics_views',
    'get_due_scheduled_reports',
    'notify_upcoming_expirations'
  ] LOOP
    FOR function_ref IN
      SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = function_name
    LOOP
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', function_ref);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', function_ref);
    END LOOP;
  END LOOP;

  -- Lecture seule ESAMBA (Parametres) - retablir apres revoke global.
  FOR function_ref IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'verifier_esamba_2024'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', function_ref);
  END LOOP;

  -- QR billing (si migration vehicle_qr_engine deployee).
  FOREACH function_name IN ARRAY ARRAY[
    'qr_generate_vehicle',
    'qr_generate_fleet_lot',
    'qr_scan_activation'
  ] LOOP
    FOR function_ref IN
      SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = function_name
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', function_ref);
    END LOOP;
  END LOOP;
END $$;

-- Allowlist anon : flux pre-authentification uniquement.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

DO $$
DECLARE
  function_name text;
  function_ref regprocedure;
BEGIN
  FOREACH function_name IN ARRAY ARRAY[
    'access_code_validate',
    'access_code_consume',
    'valider_code_invitation',
    'activate_with_code',
    'otp_can_send',
    'otp_record_attempt',
    'demo_validate_magic_link',
    'demo_upsert_session',
    'prospect_get_status',
    'prospect_get_demo_fleet_id',
    'is_prospect_active',
    'track_funnel_event'
  ] LOOP
    FOR function_ref IN
      SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = function_name
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', function_ref);
    END LOOP;
  END LOOP;
END $$;

-- 4. RLS permissives
DO $$
BEGIN
  IF to_regclass('public.demo_requests') IS NOT NULL THEN
    DROP POLICY IF EXISTS demo_requests_public_insert ON public.demo_requests;
    CREATE POLICY demo_requests_public_insert ON public.demo_requests
      FOR INSERT TO anon, authenticated
      WITH CHECK (
        length(trim(full_name)) BETWEEN 2 AND 120
        AND length(trim(phone)) BETWEEN 8 AND 20
        AND length(coalesce(company, '')) <= 200
        AND (fleet_size IS NULL OR fleet_size BETWEEN 1 AND 10000)
      );
  END IF;

  IF to_regclass('public.help_search_events') IS NOT NULL THEN
    DROP POLICY IF EXISTS help_search_events_insert ON public.help_search_events;
    CREATE POLICY help_search_events_insert ON public.help_search_events
      FOR INSERT TO anon, authenticated
      WITH CHECK (
        length(trim(query)) BETWEEN 1 AND 200
        AND results_count >= 0
        AND (user_id IS NULL OR user_id = auth.uid())
      );
  END IF;
END $$;
