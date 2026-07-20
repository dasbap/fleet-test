-- ============================================================
-- BATCH 3 - Security Advisor: search_path, revoke anon/admin,
--           rls_policy_always_true, materialized_view_in_api
-- ============================================================

-- ============================================================
-- PARTIE 1 - function_search_path_mutable
-- ============================================================

DO $$
DECLARE
  function_name text;
  function_ref regprocedure;
BEGIN
  FOREACH function_name IN ARRAY ARRAY[
    'auto_complete_activation_steps',
    'clerk_sub',
    'get_dvir_checklist_config',
    'prospect_set_updated_at',
    'rechercher_vehicules_flotte',
    'seo_use_cases_validate_taxonomy',
    'set_updated_at',
    'test',
    'touch_updated_at',
    'trg_set_updated_at',
    'update_onboarding_progress_updated_at',
    'update_updated_at_column'
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

-- ============================================================
-- PARTIE 2 - anon_security_definer_function_executable
-- REVOKE EXECUTE FROM anon sur les fonctions SECURITY DEFINER
-- qui n'ont pas besoin d'acces anonyme.
-- ============================================================

DO $$
DECLARE
  function_name text;
  function_ref regprocedure;
BEGIN
  FOREACH function_name IN ARRAY ARRAY[
    'accepter_invitation',
    'access_code_create',
    'access_code_generate',
    'access_code_revoke',
    'activate_profile_on_confirmation',
    'add_member_by_email',
    'affecter_vehicule',
    'ajouter_membre_par_email',
    'assigner_vehicule',
    'assurer_profil_utilisateur',
    'attach_auth_user',
    'audit_cloture_validation',
    'audit_flotte_adhesion',
    'audit_flotte_adhesion_changes',
    'audit_flotte_invitation_insert',
    'audit_flotte_settings',
    'audit_organisation_settings',
    'audit_travaux_maintenance_changes',
    'audit_vehicule_changes',
    'calculate_cemac_taxes',
    'calculer_recette_attendue',
    'calculer_score_conducteur',
    'calculer_score_conducteur_v2',
    'complete_activation_step',
    'create_esamba_fleet',
    'create_esamba_invitation',
    'create_esamba_vehicle',
    'creer_flotte_esamba',
    'creer_invitation_esamba',
    'creer_onboarding_organisation_flotte_et_adhesion',
    'creer_ou_mettre_a_jour_adhesion_flotte',
    'creer_vehicule_esamba',
    'current_user_is_active',
    'current_user_role',
    'driver_terrain_self_check',
    'enregistrer_carburant_offline',
    'fermer_creneau',
    'fermer_shift',
    'finaliser_onboarding',
    'fleet_activation_metrics',
    'fleet_driver_activation_health',
    'generate_access_code',
    'generer_alertes_automatiques',
    'get_current_user_permissions',
    'get_current_user_role',
    'get_due_scheduled_reports',
    'get_dvir_list',
    'get_fleet_audit_logs',
    'get_fleet_billing_context',
    'get_fleet_dashboard_metrics',
    'get_fleet_members',
    'get_funnel_metrics',
    'get_inactive_drivers_with_manager',
    'get_inactive_members_for_nudge',
    'get_org_fleets',
    'get_org_mrr',
    'get_top_driver_scores',
    'get_user_bootstrap',
    'get_user_session_context',
    'get_user_universe',
    'handle_new_user',
    'has_permission',
    'has_role',
    'init_activation_progress',
    'invalidate_fleet_metrics_cache',
    'is_admin_or_dev',
    'is_app_super_admin',
    'is_demo_user',
    'is_fleet_manager_of_user',
    'is_internal_user',
    'is_investor',
    'is_platform_admin',
    'is_real_user',
    'is_temporary_user',
    'list_fleet_invitations',
    'mark_notifications_read',
    'notify_upcoming_expirations',
    'offboard_member',
    'predict_failure_risk',
    'rbac_check_permission',
    'rbac_has_fleet_access',
    'rbac_is_fleet_manager_or_above',
    'rbac_is_fleet_organizer',
    'rbac_is_mechanic_on_fleet',
    'rbac_role_on_fleet',
    'rbac_update_fleet_membership',
    'rbac_user_fleet_ids',
    'rechercher_utilisateurs',
    'repair_orphan_membership',
    'reparer_adhesion_orpheline',
    'revoke_all_other_sessions',
    'revoke_session',
    'sauvegarder_progression_onboarding',
    'search_fleet',
    'search_users',
    'sync_user_email',
    'trg_controles_dvir_unsafe_alert',
    'trg_enforce_fleet_vehicle_limit',
    'trust_session',
    'update_fleet_member_role',
    'user_can_manage_org_onboarding',
    'verifier_statut_vehicule_actif',
    'write_audit_log'
  ] LOOP
    FOR function_ref IN
      SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = function_name
    LOOP
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', function_ref);
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- PARTIE 3 - authenticated_security_definer_function_executable
-- REVOKE authenticated des fonctions admin/ops (service_role only)
-- ============================================================

DO $$
DECLARE
  function_name text;
  function_ref regprocedure;
BEGIN
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
    'verifier_esamba_2024',
    'verifier_sante_systeme'
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
END $$;

-- ============================================================
-- PARTIE 4 - rls_policy_always_true (INSERT/UPDATE write=true)
-- Politiques service : restreindre aux appels service_role.
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    DROP POLICY IF EXISTS "al_insert_service" ON public.audit_logs;
    CREATE POLICY "al_insert_service" ON public.audit_logs
      FOR INSERT
      WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
  END IF;

  IF to_regclass('public.coaching_sessions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "coaching_service_insert" ON public.coaching_sessions;
    CREATE POLICY "coaching_service_insert" ON public.coaching_sessions
      FOR INSERT
      WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

    DROP POLICY IF EXISTS "coaching_service_update" ON public.coaching_sessions;
    CREATE POLICY "coaching_service_update" ON public.coaching_sessions
      FOR UPDATE
      USING ((auth.jwt() ->> 'role') = 'service_role');
  END IF;

  IF to_regclass('public.dashcam_alerts') IS NOT NULL THEN
    DROP POLICY IF EXISTS "dashcam_alerts_service_insert" ON public.dashcam_alerts;
    CREATE POLICY "dashcam_alerts_service_insert" ON public.dashcam_alerts
      FOR INSERT
      WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
  END IF;
END $$;

-- ============================================================
-- PARTIE 5 - materialized_view_in_api
-- Retirer l'acces direct API, reserver service_role.
-- ============================================================

DO $$
DECLARE
  view_name text;
BEGIN
  FOREACH view_name IN ARRAY ARRAY[
    'public.mv_fleet_daily_metrics',
    'public.mv_driver_score_snapshots'
  ] LOOP
    IF to_regclass(view_name) IS NOT NULL THEN
      EXECUTE format('REVOKE SELECT ON %s FROM anon, authenticated', view_name);
      EXECUTE format('GRANT SELECT ON %s TO service_role', view_name);
    ELSE
      RAISE NOTICE 'Vue materialisee absente, droits ignores: %', view_name;
    END IF;
  END LOOP;
END $$;
