-- ============================================================
-- BATCH 3 — Security Advisor: search_path, revoke anon/admin,
--           rls_policy_always_true, materialized_view_in_api
-- ============================================================

-- ============================================================
-- PARTIE 1 — function_search_path_mutable
-- ============================================================

ALTER FUNCTION public.auto_complete_activation_steps()
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.clerk_sub()
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_dvir_checklist_config()
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.prospect_set_updated_at()
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.rechercher_vehicules_flotte(
  p_fleet_id uuid, p_query text, p_status text[], p_maint text[],
  p_alert text[], p_sort_by text, p_limit integer, p_offset integer
)
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.seo_use_cases_validate_taxonomy()
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_updated_at()
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.test()
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.touch_updated_at()
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.trg_set_updated_at()
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_onboarding_progress_updated_at()
  SET search_path = public, pg_catalog;
ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public, pg_catalog;

-- ============================================================
-- PARTIE 2 — anon_security_definer_function_executable
-- REVOKE EXECUTE FROM anon sur les fonctions SECURITY DEFINER
-- qui n'ont pas besoin d'accès anonyme.
-- ============================================================

-- Gestion membres / accès (authenticated requis)
REVOKE EXECUTE ON FUNCTION public.accepter_invitation(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.access_code_create(access_universe, text, text, integer, integer, integer, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.access_code_generate(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.access_code_revoke(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.activate_profile_on_confirmation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_member_by_email(uuid, text, role_type) FROM anon;
REVOKE EXECUTE ON FUNCTION public.affecter_vehicule(uuid, uuid, uuid, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ajouter_membre_par_email(uuid, text, role_type) FROM anon;
REVOKE EXECUTE ON FUNCTION public.assigner_vehicule(uuid, uuid, uuid, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.assurer_profil_utilisateur() FROM anon;
REVOKE EXECUTE ON FUNCTION public.attach_auth_user(uuid, user_role, access_universe, text, uuid) FROM anon;

-- Triggers audit (pas d'appel direct anon)
REVOKE EXECUTE ON FUNCTION public.audit_cloture_validation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_flotte_adhesion() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_flotte_adhesion_changes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_flotte_invitation_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_flotte_settings() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_organisation_settings() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_travaux_maintenance_changes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.audit_vehicule_changes() FROM anon;

-- Calculs métier (authenticated)
REVOKE EXECUTE ON FUNCTION public.calculate_cemac_taxes(text, text, text, numeric, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculer_recette_attendue(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculer_score_conducteur(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculer_score_conducteur_v2(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculer_score_conducteur_v2(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_activation_step(uuid, text) FROM anon;

-- Création entités (authenticated)
REVOKE EXECUTE ON FUNCTION public.create_esamba_fleet(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_esamba_invitation(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_esamba_vehicle(uuid, text, text, text, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.creer_flotte_esamba(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.creer_invitation_esamba(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.creer_onboarding_organisation_flotte_et_adhesion(text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(uuid, uuid, role_type, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.creer_vehicule_esamba(uuid, text, text, text, integer, integer) FROM anon;

-- Helpers utilisateur (authenticated)
REVOKE EXECUTE ON FUNCTION public.current_user_is_active() FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon;

-- Terrain conducteur (authenticated)
REVOKE EXECUTE ON FUNCTION public.driver_terrain_self_check(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enregistrer_carburant_offline(uuid, uuid, uuid, numeric, integer, integer, timestamptz, text, text, uuid) FROM anon;

-- Créneaux / shifts (authenticated)
REVOKE EXECUTE ON FUNCTION public.fermer_creneau(uuid, integer, integer, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fermer_shift(uuid, integer, integer, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.finaliser_onboarding(uuid) FROM anon;

-- Analytics flotte (authenticated)
REVOKE EXECUTE ON FUNCTION public.fleet_activation_metrics(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fleet_driver_activation_health(uuid) FROM anon;

-- Codes / alertes (authenticated)
REVOKE EXECUTE ON FUNCTION public.generate_access_code(user_role, access_universe, text, uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generer_alertes_automatiques(uuid) FROM anon;

-- Données flotte/utilisateur (authenticated)
REVOKE EXECUTE ON FUNCTION public.get_current_user_permissions(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_current_user_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_due_scheduled_reports(timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_dvir_list(uuid, uuid, uuid, text, date, date, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_fleet_audit_logs(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_fleet_audit_logs(uuid, integer, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_fleet_billing_context(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_fleet_dashboard_metrics(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_fleet_members(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_funnel_metrics(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_inactive_drivers_with_manager() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_inactive_members_for_nudge(integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_org_fleets(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_org_mrr(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_top_driver_scores(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_bootstrap() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_session_context() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_universe(uuid) FROM anon;

-- Trigger auth (pas d'appel direct)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- RBAC helpers (authenticated)
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, role_type) FROM anon;
REVOKE EXECUTE ON FUNCTION public.init_activation_progress(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.invalidate_fleet_metrics_cache(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_dev() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_app_super_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_demo_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_fleet_manager_of_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_internal_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_investor(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_real_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_temporary_user(uuid) FROM anon;

-- Membres / notifications (authenticated)
REVOKE EXECUTE ON FUNCTION public.list_fleet_invitations(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_upcoming_expirations(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.offboard_member(uuid, uuid) FROM anon;

-- Prédiction / RBAC (authenticated)
REVOKE EXECUTE ON FUNCTION public.predict_failure_risk(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rbac_check_permission(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rbac_has_fleet_access(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rbac_is_fleet_manager_or_above(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rbac_is_fleet_organizer(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rbac_is_mechanic_on_fleet(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rbac_role_on_fleet(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rbac_update_fleet_membership(uuid, uuid, role_type, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rbac_user_fleet_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rechercher_utilisateurs(text, integer) FROM anon;

-- Réparation orphelins (authenticated)
REVOKE EXECUTE ON FUNCTION public.repair_orphan_membership(uuid, uuid, role_type) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reparer_adhesion_orpheline(uuid, uuid, role_type) FROM anon;

-- Sessions (authenticated)
REVOKE EXECUTE ON FUNCTION public.revoke_all_other_sessions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.revoke_session(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sauvegarder_progression_onboarding(uuid, integer, boolean, jsonb) FROM anon;

-- Recherche (authenticated)
REVOKE EXECUTE ON FUNCTION public.search_fleet(text, integer, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_users(text) FROM anon;

-- Triggers / email sync (pas d'appel direct anon)
REVOKE EXECUTE ON FUNCTION public.sync_user_email() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_controles_dvir_unsafe_alert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_enforce_fleet_vehicle_limit() FROM anon;

-- Sessions de confiance (authenticated)
REVOKE EXECUTE ON FUNCTION public.trust_session(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_fleet_member_role(uuid, role_type) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_fleet_member_role(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_can_manage_org_onboarding(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verifier_statut_vehicule_actif(uuid, vehicle_status) FROM anon;
REVOKE EXECUTE ON FUNCTION public.write_audit_log(text, uuid, uuid, jsonb, uuid) FROM anon;

-- ============================================================
-- PARTIE 3 — authenticated_security_definer_function_executable
-- REVOKE authenticated des fonctions admin/ops (service_role only)
-- ============================================================

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
REVOKE EXECUTE ON FUNCTION public.verifier_esamba_2024() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.verifier_sante_systeme(uuid) FROM authenticated;

-- Garantir l'accès service_role sur toutes les fonctions admin
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
GRANT EXECUTE ON FUNCTION public.verifier_esamba_2024() TO service_role;
GRANT EXECUTE ON FUNCTION public.verifier_sante_systeme(uuid) TO service_role;

-- ============================================================
-- PARTIE 4 — rls_policy_always_true (INSERT/UPDATE write=true)
-- Politiques service : restreindre aux appels service_role.
-- Les SELECT true sur tables de référence sont intentionnels.
-- ============================================================

DROP POLICY IF EXISTS "al_insert_service" ON public.audit_logs;
CREATE POLICY "al_insert_service" ON public.audit_logs
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "coaching_service_insert" ON public.coaching_sessions;
CREATE POLICY "coaching_service_insert" ON public.coaching_sessions
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "coaching_service_update" ON public.coaching_sessions;
CREATE POLICY "coaching_service_update" ON public.coaching_sessions
  FOR UPDATE
  USING ((auth.jwt() ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "dashcam_alerts_service_insert" ON public.dashcam_alerts;
CREATE POLICY "dashcam_alerts_service_insert" ON public.dashcam_alerts
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- ============================================================
-- PARTIE 5 — materialized_view_in_api
-- Retirer l'accès direct API — accès réservé service_role (cron)
-- ============================================================

REVOKE SELECT ON public.mv_fleet_daily_metrics FROM anon, authenticated;
REVOKE SELECT ON public.mv_driver_score_snapshots FROM anon, authenticated;
GRANT SELECT ON public.mv_fleet_daily_metrics TO service_role;
GRANT SELECT ON public.mv_driver_score_snapshots TO service_role;
