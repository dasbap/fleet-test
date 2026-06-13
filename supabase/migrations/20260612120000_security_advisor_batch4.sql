-- ============================================================
-- BATCH 4 — Security Advisor (juin 2026)
-- 1. search_path mutable (cloturer_creneau, set_help_updated_at)
-- 2. Extension pg_trgm → schéma extensions
-- 3. REVOKE PUBLIC + grants ciblés (authenticated / anon / service_role)
-- 4. RLS demo_requests + help_search_events
-- ============================================================

-- ─── 1. search_path ─────────────────────────────────────────────────────────

ALTER FUNCTION public.set_help_updated_at()
  SET search_path = public, pg_catalog;

DO $$
BEGIN
  IF to_regprocedure(
    'public.cloturer_creneau(uuid,integer,numeric,text,text,text)'
  ) IS NOT NULL THEN
    ALTER FUNCTION public.cloturer_creneau(
      uuid, integer, numeric, text, text, text
    ) SET search_path = public, pg_catalog;
  END IF;
END $$;

-- ─── 2. Extension pg_trgm hors public ───────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- ─── 3. Grants EXECUTE — révoquer l'héritage PUBLIC par défaut ─────────────

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Fonctions admin / cron / diagnostic : service_role uniquement
REVOKE EXECUTE ON FUNCTION public.admin_list_demo_sessions(boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_reset_demo_fleet(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.billing_cancel_subscription(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.billing_enter_grace_period(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.billing_run_daily_lifecycle() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.billing_start_trial(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.billing_suspend_subscription(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_constraint_violations() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_esamba_2024() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_esamba_2024(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_logical_inconsistencies() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_orphaned_data() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_orphaned_data(boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.deactivate_demo_account(uuid, uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_demo_accounts_by_type() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_temporary_accounts() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_database_stats() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.liste_migrations_appliquees() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.nettoyer_base_donnees(boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.prospect_expire_accounts() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.prospect_suspend_expired() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.reactivate_demo_account(uuid, uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.recreate_esamba_2024() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_payment(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_esamba_2024(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_demo_account_expiry(uuid, timestamptz) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.suspend_account(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.verifier_sante_systeme(uuid) FROM authenticated;

-- Triggers / fonctions internes : pas d'appel REST direct
REVOKE EXECUTE ON FUNCTION public.audit_cloture_validation() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_flotte_adhesion() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_flotte_adhesion_changes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_flotte_invitation_insert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_flotte_settings() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_organisation_settings() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_travaux_maintenance_changes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_vehicule_changes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_invitation_signup() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_user_email() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_controles_dvir_unsafe_alert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_enforce_fleet_vehicle_limit() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_analytics_views() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_due_scheduled_reports(timestamptz) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_upcoming_expirations(integer) FROM authenticated;

-- Lecture seule ESAMBA (Paramètres) — rétablir après revoke global
GRANT EXECUTE ON FUNCTION public.verifier_esamba_2024() TO authenticated;

-- service_role : fonctions admin / ops
GRANT EXECUTE ON FUNCTION public.admin_list_demo_sessions(boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_demo_fleet(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.billing_cancel_subscription(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.billing_enter_grace_period(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.billing_run_daily_lifecycle() TO service_role;
GRANT EXECUTE ON FUNCTION public.billing_start_trial(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.billing_suspend_subscription(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_constraint_violations() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_esamba_2024() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_esamba_2024(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_logical_inconsistencies() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_orphaned_data() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_data(boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.deactivate_demo_account(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_demo_accounts_by_type() TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_temporary_accounts() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_database_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.liste_migrations_appliquees() TO service_role;
GRANT EXECUTE ON FUNCTION public.nettoyer_base_donnees(boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.prospect_expire_accounts() TO service_role;
GRANT EXECUTE ON FUNCTION public.prospect_suspend_expired() TO service_role;
GRANT EXECUTE ON FUNCTION public.reactivate_demo_account(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.recreate_esamba_2024() TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_payment(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;
GRANT EXECUTE ON FUNCTION public.seed_esamba_2024(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_demo_account_expiry(uuid, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.suspend_account(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.verifier_sante_systeme(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_analytics_views() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_due_scheduled_reports(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_upcoming_expirations(integer) TO service_role;

-- QR billing (si migration vehicle_qr_engine déployée)
DO $$
BEGIN
  IF to_regprocedure('public.qr_generate_vehicle(uuid,uuid,uuid,integer,integer)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.qr_generate_vehicle(uuid, uuid, uuid, integer, integer) TO service_role;
  END IF;
  IF to_regprocedure('public.qr_generate_fleet_lot(uuid,uuid[],uuid,uuid,integer)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.qr_generate_fleet_lot(uuid, uuid[], uuid, uuid, integer) TO service_role;
  END IF;
  IF to_regprocedure('public.qr_scan_activation(text,uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.qr_scan_activation(text, uuid) TO service_role;
  END IF;
END $$;

-- Allowlist anon : flux pré-authentification uniquement
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

GRANT EXECUTE ON FUNCTION public.access_code_validate(text) TO anon;
GRANT EXECUTE ON FUNCTION public.access_code_consume(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.valider_code_invitation(text) TO anon;
GRANT EXECUTE ON FUNCTION public.activate_with_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.otp_can_send(text) TO anon;
GRANT EXECUTE ON FUNCTION public.otp_record_attempt(text, text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.demo_validate_magic_link(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.demo_upsert_session(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.prospect_get_status() TO anon;
GRANT EXECUTE ON FUNCTION public.prospect_get_demo_fleet_id() TO anon;
GRANT EXECUTE ON FUNCTION public.is_prospect_active() TO anon;
GRANT EXECUTE ON FUNCTION public.track_funnel_event(uuid, text, smallint, text, jsonb, timestamptz) TO anon;

-- ─── 4. RLS permissives ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS demo_requests_public_insert ON public.demo_requests;
CREATE POLICY demo_requests_public_insert ON public.demo_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(full_name)) BETWEEN 2 AND 120
    AND length(trim(phone)) BETWEEN 8 AND 20
    AND length(coalesce(company, '')) <= 200
    AND (fleet_size IS NULL OR fleet_size BETWEEN 1 AND 10000)
  );

DROP POLICY IF EXISTS help_search_events_insert ON public.help_search_events;
CREATE POLICY help_search_events_insert ON public.help_search_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(query)) BETWEEN 1 AND 200
    AND results_count >= 0
    AND (user_id IS NULL OR user_id = auth.uid())
  );
