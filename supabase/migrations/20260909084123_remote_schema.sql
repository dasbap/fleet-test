drop extension if exists "pg_net";

drop extension if exists "pg_trgm";

do $$
begin
  if to_regclass('public.abonnements') is not null then
    drop trigger if exists "trg_abonnements_same_active_subscription_plan" on "public"."abonnements";
  end if;
end $$;

do $$
begin
  if to_regclass('public.activation_progress') is not null then
    drop trigger if exists "trg_activation_updated_at" on "public"."activation_progress";
    drop trigger if exists "trg_auto_complete_steps" on "public"."activation_progress";
  end if;
end $$;

do $$
begin
  if to_regclass('public.clotures_creneaux') is not null then
    drop trigger if exists "trg_audit_cloture" on "public"."clotures_creneaux";
  end if;
end $$;

do $$
begin
  if to_regclass('public.controles_journaliers') is not null then
    drop trigger if exists "controles_journaliers_set_updated_at" on "public"."controles_journaliers";
  end if;
end $$;

do $$
begin
  if to_regclass('public.controles_journaliers') is not null then
    drop trigger if exists "trg_controles_dvir_unsafe_alert" on "public"."controles_journaliers";
  end if;
end $$;

do $$
begin
  if to_regclass('public.flotte_adhesions') is not null then
    drop trigger if exists "trg_audit_flotte_adhesion" on "public"."flotte_adhesions";
  end if;
end $$;

do $$
begin
  if to_regclass('public.flotte_invitations') is not null then
    drop trigger if exists "trg_audit_flotte_invitation" on "public"."flotte_invitations";
  end if;
end $$;

do $$
begin
  if to_regclass('public.flottes') is not null then
    drop trigger if exists "trg_audit_flottes" on "public"."flottes";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_peages') is not null then
    drop trigger if exists "trg_journal_peages_updated_at" on "public"."journal_peages";
  end if;
end $$;

do $$
begin
  if to_regclass('public.organisations') is not null then
    drop trigger if exists "trg_audit_organisations" on "public"."organisations";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_attempts') is not null then
    drop trigger if exists "payment_attempts_updated_at" on "public"."payment_attempts";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_transactions') is not null then
    drop trigger if exists "trg_payment_transactions_updated_at" on "public"."payment_transactions";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_sites') is not null then
    drop trigger if exists "trg_pilot_sites_updated_at" on "public"."pilot_sites";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilotes_terrain_cemac') is not null then
    drop trigger if exists "trg_pilotes_terrain_cemac_updated_at" on "public"."pilotes_terrain_cemac";
  end if;
end $$;

do $$
begin
  if to_regclass('public.prospect_registrations') is not null then
    drop trigger if exists "prospect_updated_at" on "public"."prospect_registrations";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_use_cases') is not null then
    drop trigger if exists "trg_seo_use_cases_validate_taxonomy" on "public"."seo_use_cases";
  end if;
end $$;

do $$
begin
  if to_regclass('public.transits_cemac') is not null then
    drop trigger if exists "transits_cemac_updated_at" on "public"."transits_cemac";
  end if;
end $$;

do $$
begin
  if to_regclass('public.travaux_maintenance') is not null then
    drop trigger if exists "trg_audit_travaux_maintenance" on "public"."travaux_maintenance";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    drop trigger if exists "trg_vehicle_costs_require_finance" on "public"."vehicle_costs";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    drop trigger if exists "trg_vehicle_costs_updated_at" on "public"."vehicle_costs";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicules') is not null then
    drop trigger if exists "trg_audit_vehicule" on "public"."vehicules";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicules') is not null then
    drop trigger if exists "trg_vehicules_enforce_plan_limit" on "public"."vehicules";
  end if;
end $$;

drop policy if exists "demo_block_abonnements" on "public"."abonnements";

drop policy if exists "rbac_abonnements_read" on "public"."abonnements";

drop policy if exists "access_codes_select_admin" on "public"."access_codes";

do $$
begin
  if to_regclass('public.activation_progress') is not null then
    drop policy if exists "Insertion propre ligne" on "public"."activation_progress";
    drop policy if exists "Lecture propre ligne" on "public"."activation_progress";
    drop policy if exists "Mise Ã  jour propre ligne" on "public"."activation_progress";
    drop policy if exists "Mise à jour propre ligne" on "public"."activation_progress";
  end if;
end $$;

drop policy if exists "addons_select_authenticated" on "public"."addons";

drop policy if exists "admin_profiles_no_select" on "public"."admin_profiles";

drop policy if exists "alert_comments_insert" on "public"."alert_comments";

drop policy if exists "alert_comments_select" on "public"."alert_comments";

drop policy if exists "alertes_automatiques_select_roles" on "public"."alertes_automatiques";

drop policy if exists "al_insert_service" on "public"."audit_logs";

drop policy if exists "billing_events_insert_service" on "public"."billing_events";

drop policy if exists "billing_events_select_manager" on "public"."billing_events";

drop policy if exists "demo_block_billing_events" on "public"."billing_events";

drop policy if exists "blocages_discipline_select_roles" on "public"."blocages_discipline";

drop policy if exists "coaching_driver_select" on "public"."coaching_sessions";

drop policy if exists "coaching_fleet_select" on "public"."coaching_sessions";

drop policy if exists "coaching_service_insert" on "public"."coaching_sessions";

drop policy if exists "coaching_service_update" on "public"."coaching_sessions";

drop policy if exists "fleet_managers_update_controles" on "public"."controles_journaliers";

drop policy if exists "Insert propre" on "public"."conversion_events";

drop policy if exists "Select propre" on "public"."conversion_events";

drop policy if exists "demo_expiration_log_no_select" on "public"."demo_expiration_log";

drop policy if exists "demo_magic_links_no_public" on "public"."demo_magic_links";

drop policy if exists "demo_onboarding_logs_insert" on "public"."demo_onboarding_logs";

drop policy if exists "demo_onboarding_logs_own_read" on "public"."demo_onboarding_logs";

drop policy if exists "demo_profiles_no_self_read" on "public"."demo_profiles";

drop policy if exists "demo_profiles_universe_isolation" on "public"."demo_profiles";

drop policy if exists "prospect_active_only" on "public"."demo_profiles";

drop policy if exists "demo_requests_no_select" on "public"."demo_requests";

drop policy if exists "demo_isolation_driver_licenses" on "public"."driver_licenses";

drop policy if exists "rbac_driver_licenses_delete" on "public"."driver_licenses";

drop policy if exists "rbac_driver_licenses_read" on "public"."driver_licenses";

drop policy if exists "rbac_driver_licenses_update" on "public"."driver_licenses";

drop policy if exists "rbac_driver_licenses_write" on "public"."driver_licenses";

drop policy if exists "superadmin_all_driver_licenses" on "public"."driver_licenses";

drop policy if exists "driver_score_snapshots_insert_manager_org" on "public"."driver_score_snapshots";

drop policy if exists "driver_score_snapshots_select_roles" on "public"."driver_score_snapshots";

drop policy if exists "failure_pred_fleet_access" on "public"."failure_predictions";

drop policy if exists "adhesions_insert_organizer" on "public"."flotte_adhesions";

drop policy if exists "adhesions_lecture_soi" on "public"."flotte_adhesions";

drop policy if exists "adhesions_select_manager" on "public"."flotte_adhesions";

drop policy if exists "adhesions_select_own" on "public"."flotte_adhesions";

drop policy if exists "adhesions_update_organizer" on "public"."flotte_adhesions";

drop policy if exists "rbac_adhesions_delete" on "public"."flotte_adhesions";

drop policy if exists "rbac_adhesions_insert" on "public"."flotte_adhesions";

drop policy if exists "rbac_adhesions_role_read" on "public"."flotte_adhesions";

drop policy if exists "rbac_adhesions_update" on "public"."flotte_adhesions";

drop policy if exists "invitations_suppression_manager_org" on "public"."flotte_invitations";

drop policy if exists "demo_isolation_flottes" on "public"."flottes";

drop policy if exists "flottes_select_active_member" on "public"."flottes";

drop policy if exists "flottes_select_member" on "public"."flottes";

drop policy if exists "flottes_update_organizer" on "public"."flottes";

drop policy if exists "rbac_flottes_delete" on "public"."flottes";

drop policy if exists "rbac_flottes_insert" on "public"."flottes";

drop policy if exists "rbac_flottes_update" on "public"."flottes";

drop policy if exists "jetons_qr_insert_manager" on "public"."jetons_qr";

drop policy if exists "jetons_qr_select_manager_org" on "public"."jetons_qr";

drop policy if exists "journal_peages_insert_driver" on "public"."journal_peages";

drop policy if exists "journal_peages_select_member" on "public"."journal_peages";

drop policy if exists "journal_peages_update_owner" on "public"."journal_peages";

drop policy if exists "journal_scans_qr_insert_authenticated" on "public"."journal_scans_qr";

drop policy if exists "journal_scans_qr_select_manager" on "public"."journal_scans_qr";

drop policy if exists "journal_scans_qr_select_manager_org" on "public"."journal_scans_qr";

drop policy if exists "demo_block_notification_queue" on "public"."notification_queue";

drop policy if exists "Users can manage own onboarding" on "public"."onboarding_progress";

drop policy if exists "demo_isolation_organisations" on "public"."organisations";

drop policy if exists "organisations_select_member" on "public"."organisations";

drop policy if exists "organisations_update_organizer" on "public"."organisations";

drop policy if exists "otp_rate_limits_service_only" on "public"."otp_rate_limits";

drop policy if exists "demo_block_paiements" on "public"."paiements";

drop policy if exists "paiements_select_manager_org" on "public"."paiements";

drop policy if exists "demo_block_payment_attempts" on "public"."payment_attempts";

drop policy if exists "payment_attempts_select_manager" on "public"."payment_attempts";

drop policy if exists "payment_attempts_service_role" on "public"."payment_attempts";

drop policy if exists "fleet members can create own transactions" on "public"."payment_transactions";

drop policy if exists "fleet members can read own transactions" on "public"."payment_transactions";

drop policy if exists "service role can update transactions" on "public"."payment_transactions";

drop policy if exists "pilot_contacts_delete" on "public"."pilot_contacts";

drop policy if exists "pilot_contacts_insert" on "public"."pilot_contacts";

drop policy if exists "pilot_contacts_select" on "public"."pilot_contacts";

drop policy if exists "pilot_contacts_update" on "public"."pilot_contacts";

drop policy if exists "pilot_events_delete" on "public"."pilot_events";

drop policy if exists "pilot_events_insert" on "public"."pilot_events";

drop policy if exists "pilot_events_select" on "public"."pilot_events";

drop policy if exists "pilot_events_update" on "public"."pilot_events";

drop policy if exists "pilot_sites_delete" on "public"."pilot_sites";

drop policy if exists "pilot_sites_insert" on "public"."pilot_sites";

drop policy if exists "pilot_sites_select" on "public"."pilot_sites";

drop policy if exists "pilot_sites_update" on "public"."pilot_sites";

drop policy if exists "pilotes_terrain_insert" on "public"."pilotes_terrain_cemac";

drop policy if exists "pilotes_terrain_select" on "public"."pilotes_terrain_cemac";

drop policy if exists "pilotes_terrain_update" on "public"."pilotes_terrain_cemac";

drop policy if exists "profils_insert_own" on "public"."profils";

drop policy if exists "profils_select_own" on "public"."profils";

drop policy if exists "profils_update_own" on "public"."profils";

drop policy if exists "prospect_no_select" on "public"."prospect_registrations";

drop policy if exists "scores_select_manager" on "public"."scores_conducteurs";

drop policy if exists "scores_select_own" on "public"."scores_conducteurs";

drop policy if exists "security_notifications_select_own" on "public"."security_notifications";

drop policy if exists "security_notifications_update_own" on "public"."security_notifications";

drop policy if exists "seo_taxonomy_public_read" on "public"."seo_taxonomy";

drop policy if exists "seo_use_cases_public_read" on "public"."seo_use_cases";

drop policy if exists "session_events_select_own" on "public"."session_events";

drop policy if exists "Users can view their own events" on "public"."system_events";

drop policy if exists "fleet_members_create_transits" on "public"."transits_cemac";

drop policy if exists "fleet_members_read_transits" on "public"."transits_cemac";

drop policy if exists "fleet_members_update_transits" on "public"."transits_cemac";

drop policy if exists "demo_isolation_maintenance" on "public"."travaux_maintenance";

drop policy if exists "user_sessions_insert_own" on "public"."user_sessions";

drop policy if exists "user_sessions_select_own" on "public"."user_sessions";

drop policy if exists "user_sessions_update_own" on "public"."user_sessions";

drop policy if exists "vehicle_costs_feature_finance_select" on "public"."vehicle_costs";

drop policy if exists "vehicle_costs_insertion_mgr_org" on "public"."vehicle_costs";

drop policy if exists "vehicle_costs_lecture_mgr_org" on "public"."vehicle_costs";

drop policy if exists "vehicle_costs_modification_org" on "public"."vehicle_costs";

drop policy if exists "vehicle_costs_suppression_org" on "public"."vehicle_costs";

drop policy if exists "demo_isolation_vehicle_documents" on "public"."vehicle_documents";

drop policy if exists "rbac_vehicle_documents_delete" on "public"."vehicle_documents";

drop policy if exists "rbac_vehicle_documents_read" on "public"."vehicle_documents";

drop policy if exists "rbac_vehicle_documents_update" on "public"."vehicle_documents";

drop policy if exists "rbac_vehicle_documents_write" on "public"."vehicle_documents";

drop policy if exists "superadmin_all_vehicle_documents" on "public"."vehicle_documents";

drop policy if exists "vehicle_documents_insertion_mgr_org_mec" on "public"."vehicle_documents";

drop policy if exists "vehicle_documents_lecture_mgr_org_mec" on "public"."vehicle_documents";

drop policy if exists "vehicle_documents_modification_mgr_org_mec" on "public"."vehicle_documents";

drop policy if exists "vehicle_documents_suppression_mgr_org" on "public"."vehicle_documents";

drop policy if exists "memberships_select_self_or_manager_org" on "public"."flotte_adhesions";

drop policy if exists "invitations_ecriture_manager_org" on "public"."flotte_invitations";

drop policy if exists "invitations_modification_manager_org" on "public"."flotte_invitations";

drop policy if exists "help_articles_admin_select" on "public"."help_articles";

drop policy if exists "help_search_events_insert" on "public"."help_search_events";

drop policy if exists "journal_carburant_insert_driver" on "public"."journal_carburant";

drop policy if exists "journal_carburant_select_member" on "public"."journal_carburant";

drop policy if exists "journal_carburant_update_owner" on "public"."journal_carburant";

drop policy if exists "orgs_delete_manager_org" on "public"."organisations";

drop policy if exists "orgs_select_member" on "public"."organisations";

drop policy if exists "orgs_update_member" on "public"."organisations";

drop policy if exists "tutorial_favorites_delete_own" on "public"."tutorial_favorites";

drop policy if exists "tutorial_favorites_insert_own" on "public"."tutorial_favorites";

drop policy if exists "tutorial_favorites_select_own" on "public"."tutorial_favorites";

drop policy if exists "tutorial_progress_insert_own" on "public"."tutorial_progress";

drop policy if exists "tutorial_progress_select_own" on "public"."tutorial_progress";

drop policy if exists "tutorial_progress_update_own" on "public"."tutorial_progress";

drop policy if exists "tutorial_views_insert_own" on "public"."tutorial_views";

drop policy if exists "tutorial_views_select_own" on "public"."tutorial_views";

do $$
begin
  if to_regclass('public.abonnements_addons') is not null then
    revoke references on table "public"."abonnements_addons" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.abonnements_addons') is not null then
    revoke trigger on table "public"."abonnements_addons" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.abonnements_addons') is not null then
    revoke truncate on table "public"."abonnements_addons" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.abonnements_addons') is not null then
    revoke references on table "public"."abonnements_addons" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.abonnements_addons') is not null then
    revoke trigger on table "public"."abonnements_addons" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.abonnements_addons') is not null then
    revoke truncate on table "public"."abonnements_addons" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.abonnements_addons') is not null then
    revoke references on table "public"."abonnements_addons" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.abonnements_addons') is not null then
    revoke trigger on table "public"."abonnements_addons" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.abonnements_addons') is not null then
    revoke truncate on table "public"."abonnements_addons" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.activation_progress') is not null then
    revoke references on table "public"."activation_progress" from "anon";
    revoke trigger on table "public"."activation_progress" from "anon";
    revoke truncate on table "public"."activation_progress" from "anon";
    revoke references on table "public"."activation_progress" from "authenticated";
    revoke trigger on table "public"."activation_progress" from "authenticated";
    revoke truncate on table "public"."activation_progress" from "authenticated";
    revoke references on table "public"."activation_progress" from "service_role";
    revoke trigger on table "public"."activation_progress" from "service_role";
    revoke truncate on table "public"."activation_progress" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.addons') is not null then
    revoke references on table "public"."addons" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.addons') is not null then
    revoke trigger on table "public"."addons" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.addons') is not null then
    revoke truncate on table "public"."addons" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.addons') is not null then
    revoke references on table "public"."addons" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.addons') is not null then
    revoke trigger on table "public"."addons" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.addons') is not null then
    revoke truncate on table "public"."addons" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.addons') is not null then
    revoke references on table "public"."addons" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.addons') is not null then
    revoke trigger on table "public"."addons" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.addons') is not null then
    revoke truncate on table "public"."addons" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.billing_events') is not null then
    revoke references on table "public"."billing_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.billing_events') is not null then
    revoke trigger on table "public"."billing_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.billing_events') is not null then
    revoke truncate on table "public"."billing_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.billing_events') is not null then
    revoke references on table "public"."billing_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.billing_events') is not null then
    revoke trigger on table "public"."billing_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.billing_events') is not null then
    revoke truncate on table "public"."billing_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.billing_events') is not null then
    revoke delete on table "public"."billing_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.billing_events') is not null then
    revoke insert on table "public"."billing_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.billing_events') is not null then
    revoke references on table "public"."billing_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.billing_events') is not null then
    revoke select on table "public"."billing_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.billing_events') is not null then
    revoke trigger on table "public"."billing_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.billing_events') is not null then
    revoke truncate on table "public"."billing_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.billing_events') is not null then
    revoke update on table "public"."billing_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.blocages_discipline') is not null then
    revoke references on table "public"."blocages_discipline" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.blocages_discipline') is not null then
    revoke trigger on table "public"."blocages_discipline" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.blocages_discipline') is not null then
    revoke truncate on table "public"."blocages_discipline" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.blocages_discipline') is not null then
    revoke references on table "public"."blocages_discipline" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.blocages_discipline') is not null then
    revoke trigger on table "public"."blocages_discipline" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.blocages_discipline') is not null then
    revoke truncate on table "public"."blocages_discipline" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.blocages_discipline') is not null then
    revoke references on table "public"."blocages_discipline" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.blocages_discipline') is not null then
    revoke trigger on table "public"."blocages_discipline" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.blocages_discipline') is not null then
    revoke truncate on table "public"."blocages_discipline" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.clerk_webhook_events') is not null then
    revoke references on table "public"."clerk_webhook_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.clerk_webhook_events') is not null then
    revoke trigger on table "public"."clerk_webhook_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.clerk_webhook_events') is not null then
    revoke truncate on table "public"."clerk_webhook_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.clerk_webhook_events') is not null then
    revoke references on table "public"."clerk_webhook_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.clerk_webhook_events') is not null then
    revoke trigger on table "public"."clerk_webhook_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.clerk_webhook_events') is not null then
    revoke truncate on table "public"."clerk_webhook_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.clerk_webhook_events') is not null then
    revoke references on table "public"."clerk_webhook_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.clerk_webhook_events') is not null then
    revoke trigger on table "public"."clerk_webhook_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.clerk_webhook_events') is not null then
    revoke truncate on table "public"."clerk_webhook_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.coaching_sessions') is not null then
    revoke references on table "public"."coaching_sessions" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.coaching_sessions') is not null then
    revoke trigger on table "public"."coaching_sessions" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.coaching_sessions') is not null then
    revoke truncate on table "public"."coaching_sessions" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.coaching_sessions') is not null then
    revoke references on table "public"."coaching_sessions" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.coaching_sessions') is not null then
    revoke trigger on table "public"."coaching_sessions" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.coaching_sessions') is not null then
    revoke truncate on table "public"."coaching_sessions" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.coaching_sessions') is not null then
    revoke references on table "public"."coaching_sessions" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.coaching_sessions') is not null then
    revoke trigger on table "public"."coaching_sessions" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.coaching_sessions') is not null then
    revoke truncate on table "public"."coaching_sessions" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.conversion_events') is not null then
    revoke references on table "public"."conversion_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.conversion_events') is not null then
    revoke trigger on table "public"."conversion_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.conversion_events') is not null then
    revoke truncate on table "public"."conversion_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.conversion_events') is not null then
    revoke references on table "public"."conversion_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.conversion_events') is not null then
    revoke trigger on table "public"."conversion_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.conversion_events') is not null then
    revoke truncate on table "public"."conversion_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.conversion_events') is not null then
    revoke references on table "public"."conversion_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.conversion_events') is not null then
    revoke trigger on table "public"."conversion_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.conversion_events') is not null then
    revoke truncate on table "public"."conversion_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.driver_score_snapshots') is not null then
    revoke references on table "public"."driver_score_snapshots" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.driver_score_snapshots') is not null then
    revoke trigger on table "public"."driver_score_snapshots" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.driver_score_snapshots') is not null then
    revoke truncate on table "public"."driver_score_snapshots" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.driver_score_snapshots') is not null then
    revoke references on table "public"."driver_score_snapshots" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.driver_score_snapshots') is not null then
    revoke trigger on table "public"."driver_score_snapshots" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.driver_score_snapshots') is not null then
    revoke truncate on table "public"."driver_score_snapshots" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.driver_score_snapshots') is not null then
    revoke references on table "public"."driver_score_snapshots" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.driver_score_snapshots') is not null then
    revoke trigger on table "public"."driver_score_snapshots" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.driver_score_snapshots') is not null then
    revoke truncate on table "public"."driver_score_snapshots" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_peages') is not null then
    revoke references on table "public"."journal_peages" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_peages') is not null then
    revoke trigger on table "public"."journal_peages" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_peages') is not null then
    revoke truncate on table "public"."journal_peages" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_peages') is not null then
    revoke delete on table "public"."journal_peages" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_peages') is not null then
    revoke insert on table "public"."journal_peages" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_peages') is not null then
    revoke references on table "public"."journal_peages" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_peages') is not null then
    revoke select on table "public"."journal_peages" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_peages') is not null then
    revoke trigger on table "public"."journal_peages" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_peages') is not null then
    revoke truncate on table "public"."journal_peages" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_peages') is not null then
    revoke update on table "public"."journal_peages" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_peages') is not null then
    revoke delete on table "public"."journal_peages" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_peages') is not null then
    revoke insert on table "public"."journal_peages" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_peages') is not null then
    revoke references on table "public"."journal_peages" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_peages') is not null then
    revoke select on table "public"."journal_peages" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_peages') is not null then
    revoke trigger on table "public"."journal_peages" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_peages') is not null then
    revoke truncate on table "public"."journal_peages" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_peages') is not null then
    revoke update on table "public"."journal_peages" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_scans_qr') is not null then
    revoke references on table "public"."journal_scans_qr" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_scans_qr') is not null then
    revoke trigger on table "public"."journal_scans_qr" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_scans_qr') is not null then
    revoke truncate on table "public"."journal_scans_qr" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_scans_qr') is not null then
    revoke references on table "public"."journal_scans_qr" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_scans_qr') is not null then
    revoke trigger on table "public"."journal_scans_qr" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_scans_qr') is not null then
    revoke truncate on table "public"."journal_scans_qr" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_scans_qr') is not null then
    revoke references on table "public"."journal_scans_qr" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_scans_qr') is not null then
    revoke trigger on table "public"."journal_scans_qr" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.journal_scans_qr') is not null then
    revoke truncate on table "public"."journal_scans_qr" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.notification_queue') is not null then
    revoke references on table "public"."notification_queue" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.notification_queue') is not null then
    revoke trigger on table "public"."notification_queue" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.notification_queue') is not null then
    revoke truncate on table "public"."notification_queue" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.notification_queue') is not null then
    revoke references on table "public"."notification_queue" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.notification_queue') is not null then
    revoke trigger on table "public"."notification_queue" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.notification_queue') is not null then
    revoke truncate on table "public"."notification_queue" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.notification_queue') is not null then
    revoke delete on table "public"."notification_queue" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.notification_queue') is not null then
    revoke insert on table "public"."notification_queue" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.notification_queue') is not null then
    revoke references on table "public"."notification_queue" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.notification_queue') is not null then
    revoke select on table "public"."notification_queue" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.notification_queue') is not null then
    revoke trigger on table "public"."notification_queue" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.notification_queue') is not null then
    revoke truncate on table "public"."notification_queue" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.notification_queue') is not null then
    revoke update on table "public"."notification_queue" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.onboarding_sequence_log') is not null then
    revoke references on table "public"."onboarding_sequence_log" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.onboarding_sequence_log') is not null then
    revoke trigger on table "public"."onboarding_sequence_log" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.onboarding_sequence_log') is not null then
    revoke truncate on table "public"."onboarding_sequence_log" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.onboarding_sequence_log') is not null then
    revoke references on table "public"."onboarding_sequence_log" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.onboarding_sequence_log') is not null then
    revoke trigger on table "public"."onboarding_sequence_log" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.onboarding_sequence_log') is not null then
    revoke truncate on table "public"."onboarding_sequence_log" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.onboarding_sequence_log') is not null then
    revoke references on table "public"."onboarding_sequence_log" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.onboarding_sequence_log') is not null then
    revoke trigger on table "public"."onboarding_sequence_log" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.onboarding_sequence_log') is not null then
    revoke truncate on table "public"."onboarding_sequence_log" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.otp_rate_limits') is not null then
    revoke references on table "public"."otp_rate_limits" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.otp_rate_limits') is not null then
    revoke trigger on table "public"."otp_rate_limits" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.otp_rate_limits') is not null then
    revoke truncate on table "public"."otp_rate_limits" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.otp_rate_limits') is not null then
    revoke references on table "public"."otp_rate_limits" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.otp_rate_limits') is not null then
    revoke trigger on table "public"."otp_rate_limits" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.otp_rate_limits') is not null then
    revoke truncate on table "public"."otp_rate_limits" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.otp_rate_limits') is not null then
    revoke insert on table "public"."otp_rate_limits" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.otp_rate_limits') is not null then
    revoke references on table "public"."otp_rate_limits" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.otp_rate_limits') is not null then
    revoke select on table "public"."otp_rate_limits" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.otp_rate_limits') is not null then
    revoke trigger on table "public"."otp_rate_limits" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.otp_rate_limits') is not null then
    revoke truncate on table "public"."otp_rate_limits" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_attempts') is not null then
    revoke references on table "public"."payment_attempts" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_attempts') is not null then
    revoke trigger on table "public"."payment_attempts" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_attempts') is not null then
    revoke truncate on table "public"."payment_attempts" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_attempts') is not null then
    revoke references on table "public"."payment_attempts" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_attempts') is not null then
    revoke trigger on table "public"."payment_attempts" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_attempts') is not null then
    revoke truncate on table "public"."payment_attempts" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_attempts') is not null then
    revoke delete on table "public"."payment_attempts" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_attempts') is not null then
    revoke insert on table "public"."payment_attempts" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_attempts') is not null then
    revoke references on table "public"."payment_attempts" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_attempts') is not null then
    revoke select on table "public"."payment_attempts" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_attempts') is not null then
    revoke trigger on table "public"."payment_attempts" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_attempts') is not null then
    revoke truncate on table "public"."payment_attempts" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_attempts') is not null then
    revoke update on table "public"."payment_attempts" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_transactions') is not null then
    revoke references on table "public"."payment_transactions" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_transactions') is not null then
    revoke trigger on table "public"."payment_transactions" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_transactions') is not null then
    revoke truncate on table "public"."payment_transactions" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_transactions') is not null then
    revoke references on table "public"."payment_transactions" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_transactions') is not null then
    revoke trigger on table "public"."payment_transactions" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_transactions') is not null then
    revoke truncate on table "public"."payment_transactions" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_transactions') is not null then
    revoke references on table "public"."payment_transactions" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_transactions') is not null then
    revoke trigger on table "public"."payment_transactions" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.payment_transactions') is not null then
    revoke truncate on table "public"."payment_transactions" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_contacts') is not null then
    revoke references on table "public"."pilot_contacts" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_contacts') is not null then
    revoke trigger on table "public"."pilot_contacts" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_contacts') is not null then
    revoke truncate on table "public"."pilot_contacts" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_contacts') is not null then
    revoke delete on table "public"."pilot_contacts" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_contacts') is not null then
    revoke insert on table "public"."pilot_contacts" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_contacts') is not null then
    revoke references on table "public"."pilot_contacts" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_contacts') is not null then
    revoke select on table "public"."pilot_contacts" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_contacts') is not null then
    revoke trigger on table "public"."pilot_contacts" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_contacts') is not null then
    revoke truncate on table "public"."pilot_contacts" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_contacts') is not null then
    revoke update on table "public"."pilot_contacts" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_contacts') is not null then
    revoke delete on table "public"."pilot_contacts" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_contacts') is not null then
    revoke insert on table "public"."pilot_contacts" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_contacts') is not null then
    revoke references on table "public"."pilot_contacts" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_contacts') is not null then
    revoke select on table "public"."pilot_contacts" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_contacts') is not null then
    revoke trigger on table "public"."pilot_contacts" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_contacts') is not null then
    revoke truncate on table "public"."pilot_contacts" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_contacts') is not null then
    revoke update on table "public"."pilot_contacts" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_events') is not null then
    revoke references on table "public"."pilot_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_events') is not null then
    revoke trigger on table "public"."pilot_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_events') is not null then
    revoke truncate on table "public"."pilot_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_events') is not null then
    revoke delete on table "public"."pilot_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_events') is not null then
    revoke insert on table "public"."pilot_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_events') is not null then
    revoke references on table "public"."pilot_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_events') is not null then
    revoke select on table "public"."pilot_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_events') is not null then
    revoke trigger on table "public"."pilot_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_events') is not null then
    revoke truncate on table "public"."pilot_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_events') is not null then
    revoke update on table "public"."pilot_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_events') is not null then
    revoke delete on table "public"."pilot_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_events') is not null then
    revoke insert on table "public"."pilot_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_events') is not null then
    revoke references on table "public"."pilot_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_events') is not null then
    revoke select on table "public"."pilot_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_events') is not null then
    revoke trigger on table "public"."pilot_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_events') is not null then
    revoke truncate on table "public"."pilot_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_events') is not null then
    revoke update on table "public"."pilot_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_sites') is not null then
    revoke references on table "public"."pilot_sites" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_sites') is not null then
    revoke trigger on table "public"."pilot_sites" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_sites') is not null then
    revoke truncate on table "public"."pilot_sites" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_sites') is not null then
    revoke delete on table "public"."pilot_sites" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_sites') is not null then
    revoke insert on table "public"."pilot_sites" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_sites') is not null then
    revoke references on table "public"."pilot_sites" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_sites') is not null then
    revoke select on table "public"."pilot_sites" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_sites') is not null then
    revoke trigger on table "public"."pilot_sites" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_sites') is not null then
    revoke truncate on table "public"."pilot_sites" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_sites') is not null then
    revoke update on table "public"."pilot_sites" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_sites') is not null then
    revoke delete on table "public"."pilot_sites" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_sites') is not null then
    revoke insert on table "public"."pilot_sites" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_sites') is not null then
    revoke references on table "public"."pilot_sites" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_sites') is not null then
    revoke select on table "public"."pilot_sites" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_sites') is not null then
    revoke trigger on table "public"."pilot_sites" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_sites') is not null then
    revoke truncate on table "public"."pilot_sites" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilot_sites') is not null then
    revoke update on table "public"."pilot_sites" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilotes_terrain_cemac') is not null then
    revoke references on table "public"."pilotes_terrain_cemac" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilotes_terrain_cemac') is not null then
    revoke trigger on table "public"."pilotes_terrain_cemac" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilotes_terrain_cemac') is not null then
    revoke truncate on table "public"."pilotes_terrain_cemac" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilotes_terrain_cemac') is not null then
    revoke delete on table "public"."pilotes_terrain_cemac" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilotes_terrain_cemac') is not null then
    revoke insert on table "public"."pilotes_terrain_cemac" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilotes_terrain_cemac') is not null then
    revoke references on table "public"."pilotes_terrain_cemac" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilotes_terrain_cemac') is not null then
    revoke select on table "public"."pilotes_terrain_cemac" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilotes_terrain_cemac') is not null then
    revoke trigger on table "public"."pilotes_terrain_cemac" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilotes_terrain_cemac') is not null then
    revoke truncate on table "public"."pilotes_terrain_cemac" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilotes_terrain_cemac') is not null then
    revoke update on table "public"."pilotes_terrain_cemac" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilotes_terrain_cemac') is not null then
    revoke delete on table "public"."pilotes_terrain_cemac" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilotes_terrain_cemac') is not null then
    revoke insert on table "public"."pilotes_terrain_cemac" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilotes_terrain_cemac') is not null then
    revoke references on table "public"."pilotes_terrain_cemac" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilotes_terrain_cemac') is not null then
    revoke select on table "public"."pilotes_terrain_cemac" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilotes_terrain_cemac') is not null then
    revoke trigger on table "public"."pilotes_terrain_cemac" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilotes_terrain_cemac') is not null then
    revoke truncate on table "public"."pilotes_terrain_cemac" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.pilotes_terrain_cemac') is not null then
    revoke update on table "public"."pilotes_terrain_cemac" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.prospect_registrations') is not null then
    revoke references on table "public"."prospect_registrations" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.prospect_registrations') is not null then
    revoke trigger on table "public"."prospect_registrations" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.prospect_registrations') is not null then
    revoke truncate on table "public"."prospect_registrations" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.prospect_registrations') is not null then
    revoke references on table "public"."prospect_registrations" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.prospect_registrations') is not null then
    revoke trigger on table "public"."prospect_registrations" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.prospect_registrations') is not null then
    revoke truncate on table "public"."prospect_registrations" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.prospect_registrations') is not null then
    revoke insert on table "public"."prospect_registrations" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.prospect_registrations') is not null then
    revoke references on table "public"."prospect_registrations" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.prospect_registrations') is not null then
    revoke select on table "public"."prospect_registrations" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.prospect_registrations') is not null then
    revoke trigger on table "public"."prospect_registrations" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.prospect_registrations') is not null then
    revoke truncate on table "public"."prospect_registrations" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.prospect_registrations') is not null then
    revoke update on table "public"."prospect_registrations" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.retention_nudge_log') is not null then
    revoke references on table "public"."retention_nudge_log" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.retention_nudge_log') is not null then
    revoke trigger on table "public"."retention_nudge_log" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.retention_nudge_log') is not null then
    revoke truncate on table "public"."retention_nudge_log" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.retention_nudge_log') is not null then
    revoke references on table "public"."retention_nudge_log" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.retention_nudge_log') is not null then
    revoke trigger on table "public"."retention_nudge_log" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.retention_nudge_log') is not null then
    revoke truncate on table "public"."retention_nudge_log" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.retention_nudge_log') is not null then
    revoke references on table "public"."retention_nudge_log" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.retention_nudge_log') is not null then
    revoke trigger on table "public"."retention_nudge_log" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.retention_nudge_log') is not null then
    revoke truncate on table "public"."retention_nudge_log" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.security_notifications') is not null then
    revoke references on table "public"."security_notifications" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.security_notifications') is not null then
    revoke trigger on table "public"."security_notifications" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.security_notifications') is not null then
    revoke truncate on table "public"."security_notifications" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.security_notifications') is not null then
    revoke references on table "public"."security_notifications" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.security_notifications') is not null then
    revoke trigger on table "public"."security_notifications" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.security_notifications') is not null then
    revoke truncate on table "public"."security_notifications" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.security_notifications') is not null then
    revoke references on table "public"."security_notifications" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.security_notifications') is not null then
    revoke trigger on table "public"."security_notifications" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.security_notifications') is not null then
    revoke truncate on table "public"."security_notifications" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_taxonomy') is not null then
    revoke references on table "public"."seo_taxonomy" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_taxonomy') is not null then
    revoke trigger on table "public"."seo_taxonomy" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_taxonomy') is not null then
    revoke truncate on table "public"."seo_taxonomy" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_taxonomy') is not null then
    revoke references on table "public"."seo_taxonomy" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_taxonomy') is not null then
    revoke trigger on table "public"."seo_taxonomy" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_taxonomy') is not null then
    revoke truncate on table "public"."seo_taxonomy" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_taxonomy') is not null then
    revoke references on table "public"."seo_taxonomy" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_taxonomy') is not null then
    revoke trigger on table "public"."seo_taxonomy" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_taxonomy') is not null then
    revoke truncate on table "public"."seo_taxonomy" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_use_cases') is not null then
    revoke references on table "public"."seo_use_cases" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_use_cases') is not null then
    revoke trigger on table "public"."seo_use_cases" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_use_cases') is not null then
    revoke truncate on table "public"."seo_use_cases" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_use_cases') is not null then
    revoke references on table "public"."seo_use_cases" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_use_cases') is not null then
    revoke trigger on table "public"."seo_use_cases" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_use_cases') is not null then
    revoke truncate on table "public"."seo_use_cases" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_use_cases') is not null then
    revoke references on table "public"."seo_use_cases" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_use_cases') is not null then
    revoke trigger on table "public"."seo_use_cases" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.seo_use_cases') is not null then
    revoke truncate on table "public"."seo_use_cases" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.session_events') is not null then
    revoke references on table "public"."session_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.session_events') is not null then
    revoke trigger on table "public"."session_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.session_events') is not null then
    revoke truncate on table "public"."session_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.session_events') is not null then
    revoke references on table "public"."session_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.session_events') is not null then
    revoke trigger on table "public"."session_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.session_events') is not null then
    revoke truncate on table "public"."session_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.session_events') is not null then
    revoke references on table "public"."session_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.session_events') is not null then
    revoke trigger on table "public"."session_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.session_events') is not null then
    revoke truncate on table "public"."session_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.system_events') is not null then
    revoke references on table "public"."system_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.system_events') is not null then
    revoke trigger on table "public"."system_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.system_events') is not null then
    revoke truncate on table "public"."system_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.system_events') is not null then
    revoke references on table "public"."system_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.system_events') is not null then
    revoke trigger on table "public"."system_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.system_events') is not null then
    revoke truncate on table "public"."system_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.system_events') is not null then
    revoke references on table "public"."system_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.system_events') is not null then
    revoke trigger on table "public"."system_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.system_events') is not null then
    revoke truncate on table "public"."system_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.transits_cemac') is not null then
    revoke references on table "public"."transits_cemac" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.transits_cemac') is not null then
    revoke trigger on table "public"."transits_cemac" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.transits_cemac') is not null then
    revoke truncate on table "public"."transits_cemac" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.transits_cemac') is not null then
    revoke references on table "public"."transits_cemac" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.transits_cemac') is not null then
    revoke trigger on table "public"."transits_cemac" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.transits_cemac') is not null then
    revoke truncate on table "public"."transits_cemac" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.transits_cemac') is not null then
    revoke references on table "public"."transits_cemac" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.transits_cemac') is not null then
    revoke trigger on table "public"."transits_cemac" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.transits_cemac') is not null then
    revoke truncate on table "public"."transits_cemac" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.user_sessions') is not null then
    revoke references on table "public"."user_sessions" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.user_sessions') is not null then
    revoke trigger on table "public"."user_sessions" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.user_sessions') is not null then
    revoke truncate on table "public"."user_sessions" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.user_sessions') is not null then
    revoke references on table "public"."user_sessions" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.user_sessions') is not null then
    revoke trigger on table "public"."user_sessions" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.user_sessions') is not null then
    revoke truncate on table "public"."user_sessions" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.user_sessions') is not null then
    revoke references on table "public"."user_sessions" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.user_sessions') is not null then
    revoke trigger on table "public"."user_sessions" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.user_sessions') is not null then
    revoke truncate on table "public"."user_sessions" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    revoke references on table "public"."vehicle_costs" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    revoke trigger on table "public"."vehicle_costs" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    revoke truncate on table "public"."vehicle_costs" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    revoke delete on table "public"."vehicle_costs" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    revoke insert on table "public"."vehicle_costs" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    revoke references on table "public"."vehicle_costs" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    revoke select on table "public"."vehicle_costs" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    revoke trigger on table "public"."vehicle_costs" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    revoke truncate on table "public"."vehicle_costs" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    revoke update on table "public"."vehicle_costs" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    revoke delete on table "public"."vehicle_costs" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    revoke insert on table "public"."vehicle_costs" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    revoke references on table "public"."vehicle_costs" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    revoke select on table "public"."vehicle_costs" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    revoke trigger on table "public"."vehicle_costs" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    revoke truncate on table "public"."vehicle_costs" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.vehicle_costs') is not null then
    revoke update on table "public"."vehicle_costs" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_outbound_logs') is not null then
    revoke references on table "public"."whatsapp_outbound_logs" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_outbound_logs') is not null then
    revoke trigger on table "public"."whatsapp_outbound_logs" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_outbound_logs') is not null then
    revoke truncate on table "public"."whatsapp_outbound_logs" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_outbound_logs') is not null then
    revoke references on table "public"."whatsapp_outbound_logs" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_outbound_logs') is not null then
    revoke trigger on table "public"."whatsapp_outbound_logs" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_outbound_logs') is not null then
    revoke truncate on table "public"."whatsapp_outbound_logs" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_outbound_logs') is not null then
    revoke references on table "public"."whatsapp_outbound_logs" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_outbound_logs') is not null then
    revoke trigger on table "public"."whatsapp_outbound_logs" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_outbound_logs') is not null then
    revoke truncate on table "public"."whatsapp_outbound_logs" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_retry_queue') is not null then
    revoke references on table "public"."whatsapp_retry_queue" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_retry_queue') is not null then
    revoke trigger on table "public"."whatsapp_retry_queue" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_retry_queue') is not null then
    revoke truncate on table "public"."whatsapp_retry_queue" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_retry_queue') is not null then
    revoke references on table "public"."whatsapp_retry_queue" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_retry_queue') is not null then
    revoke trigger on table "public"."whatsapp_retry_queue" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_retry_queue') is not null then
    revoke truncate on table "public"."whatsapp_retry_queue" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_retry_queue') is not null then
    revoke references on table "public"."whatsapp_retry_queue" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_retry_queue') is not null then
    revoke trigger on table "public"."whatsapp_retry_queue" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_retry_queue') is not null then
    revoke truncate on table "public"."whatsapp_retry_queue" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_webhook_events') is not null then
    revoke references on table "public"."whatsapp_webhook_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_webhook_events') is not null then
    revoke trigger on table "public"."whatsapp_webhook_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_webhook_events') is not null then
    revoke truncate on table "public"."whatsapp_webhook_events" from "anon";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_webhook_events') is not null then
    revoke references on table "public"."whatsapp_webhook_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_webhook_events') is not null then
    revoke trigger on table "public"."whatsapp_webhook_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_webhook_events') is not null then
    revoke truncate on table "public"."whatsapp_webhook_events" from "authenticated";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_webhook_events') is not null then
    revoke references on table "public"."whatsapp_webhook_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_webhook_events') is not null then
    revoke trigger on table "public"."whatsapp_webhook_events" from "service_role";
  end if;
end $$;

do $$
begin
  if to_regclass('public.whatsapp_webhook_events') is not null then
    revoke truncate on table "public"."whatsapp_webhook_events" from "service_role";
  end if;
end $$;

alter table if exists "public"."abonnements" drop constraint if exists "abonnements_status_check";

alter table if exists "public"."abonnements_addons" drop constraint if exists "abonnements_addons_addon_id_fkey";

alter table if exists "public"."abonnements_addons" drop constraint if exists "abonnements_addons_subscription_id_fkey";

alter table if exists "public"."activation_progress" drop constraint if exists "activation_progress_org_id_fkey";

alter table if exists "public"."activation_progress" drop constraint if exists "activation_progress_user_id_fkey";

alter table if exists "public"."activation_progress" drop constraint if exists "activation_progress_user_id_key";

alter table if exists "public"."addons" drop constraint if exists "addons_code_key";

alter table if exists "public"."billing_events" drop constraint if exists "billing_events_fleet_id_fkey";

alter table if exists "public"."billing_events" drop constraint if exists "billing_events_payment_id_fkey";

alter table if exists "public"."billing_events" drop constraint if exists "billing_events_subscription_id_fkey";

alter table if exists "public"."blocages_discipline" drop constraint if exists "blocages_discipline_lifted_by_user_id_fkey";

alter table if exists "public"."blocages_discipline" drop constraint if exists "blocages_discipline_vehicle_id_fkey";

alter table if exists "public"."clerk_webhook_events" drop constraint if exists "clerk_webhook_events_status_check";

alter table if exists "public"."clerk_webhook_events" drop constraint if exists "clerk_webhook_events_svix_id_key";

alter table if exists "public"."coaching_sessions" drop constraint if exists "coaching_sessions_driver_user_id_fkey";

alter table if exists "public"."coaching_sessions" drop constraint if exists "coaching_sessions_fleet_id_fkey";

alter table if exists "public"."coaching_sessions" drop constraint if exists "coaching_sessions_shift_id_fkey";

alter table if exists "public"."controles_journaliers" drop constraint if exists "controles_journaliers_dvir_alert_id_fkey";

alter table if exists "public"."conversion_events" drop constraint if exists "conversion_events_org_id_fkey";

alter table if exists "public"."conversion_events" drop constraint if exists "conversion_events_user_id_fkey";

alter table if exists "public"."dashcam_alerts" drop constraint if exists "dashcam_alerts_confidence_check";

alter table if exists "public"."demo_requests" drop constraint if exists "demo_requests_status_check";

alter table if exists "public"."driver_score_snapshots" drop constraint if exists "driver_score_snapshots_closure_delay_score_check";

alter table if exists "public"."driver_score_snapshots" drop constraint if exists "driver_score_snapshots_driver_user_id_fkey";

alter table if exists "public"."driver_score_snapshots" drop constraint if exists "driver_score_snapshots_fleet_id_fkey";

alter table if exists "public"."driver_score_snapshots" drop constraint if exists "driver_score_snapshots_incidents_score_check";

alter table if exists "public"."driver_score_snapshots" drop constraint if exists "driver_score_snapshots_operational_stability_score_check";

alter table if exists "public"."driver_score_snapshots" drop constraint if exists "driver_score_snapshots_score_total_check";

alter table if exists "public"."driver_score_snapshots" drop constraint if exists "driver_score_snapshots_shift_discipline_score_check";

alter table if exists "public"."jetons_qr" drop constraint if exists "jetons_qr_fleet_id_fkey";

alter table if exists "public"."jetons_qr" drop constraint if exists "jetons_qr_revoked_by_fkey";

alter table if exists "public"."jetons_qr" drop constraint if exists "jetons_qr_status_check";

alter table if exists "public"."jetons_qr" drop constraint if exists "jetons_qr_subscription_id_fkey";

alter table if exists "public"."journal_peages" drop constraint if exists "journal_peages_amount_xof_check";

alter table if exists "public"."journal_peages" drop constraint if exists "journal_peages_driver_user_id_fkey";

alter table if exists "public"."journal_peages" drop constraint if exists "journal_peages_fleet_id_fkey";

alter table if exists "public"."journal_peages" drop constraint if exists "journal_peages_odometer_km_check";

alter table if exists "public"."journal_peages" drop constraint if exists "journal_peages_vehicle_id_fkey";

alter table if exists "public"."journal_scans_qr" drop constraint if exists "journal_scans_qr_qr_token_id_fkey";

alter table if exists "public"."journal_scans_qr" drop constraint if exists "journal_scans_qr_scanned_by_user_id_fkey";

alter table if exists "public"."journal_scans_qr" drop constraint if exists "journal_scans_qr_vehicle_id_fkey";

alter table if exists "public"."notification_queue" drop constraint if exists "notification_queue_fleet_id_fkey";

alter table if exists "public"."notification_queue" drop constraint if exists "notification_queue_status_check";

alter table if exists "public"."onboarding_sequence_log" drop constraint if exists "onboarding_sequence_log_fleet_id_fkey";

alter table if exists "public"."onboarding_sequence_log" drop constraint if exists "onboarding_sequence_log_step_day_check";

alter table if exists "public"."onboarding_sequence_log" drop constraint if exists "onboarding_sequence_log_user_fleet_step_unique";

alter table if exists "public"."onboarding_sequence_log" drop constraint if exists "onboarding_sequence_log_user_id_fkey";

alter table if exists "public"."otp_rate_limits" drop constraint if exists "otp_rate_limits_action_check";

alter table if exists "public"."paiements" drop constraint if exists "paiements_refunded_by_fkey";

alter table if exists "public"."payment_attempts" drop constraint if exists "payment_attempts_payment_id_fkey";

alter table if exists "public"."payment_attempts" drop constraint if exists "payment_attempts_status_check";

alter table if exists "public"."payment_transactions" drop constraint if exists "payment_transactions_amount_xaf_check";

alter table if exists "public"."payment_transactions" drop constraint if exists "payment_transactions_fleet_id_fkey";

alter table if exists "public"."payment_transactions" drop constraint if exists "payment_transactions_provider_check";

alter table if exists "public"."payment_transactions" drop constraint if exists "payment_transactions_reference_key";

alter table if exists "public"."payment_transactions" drop constraint if exists "payment_transactions_status_check";

alter table if exists "public"."pilot_contacts" drop constraint if exists "pilot_contacts_fleet_id_fkey";

alter table if exists "public"."pilot_contacts" drop constraint if exists "pilot_contacts_pilot_site_id_fkey";

alter table if exists "public"."pilot_events" drop constraint if exists "pilot_events_fleet_id_fkey";

alter table if exists "public"."pilot_events" drop constraint if exists "pilot_events_pilot_site_id_fkey";

alter table if exists "public"."pilot_events" drop constraint if exists "pilot_events_realise_par_fkey";

alter table if exists "public"."pilot_events" drop constraint if exists "pilot_events_type_evenement_check";

alter table if exists "public"."pilot_sites" drop constraint if exists "pilot_sites_fleet_id_fkey";

alter table if exists "public"."pilot_sites" drop constraint if exists "pilot_sites_gestionnaire_id_fkey";

alter table if exists "public"."pilot_sites" drop constraint if exists "pilot_sites_mrr_estime_eur_check";

alter table if exists "public"."pilot_sites" drop constraint if exists "pilot_sites_nb_vehicules_estime_check";

alter table if exists "public"."pilot_sites" drop constraint if exists "pilot_sites_plan_souscrit_check";

alter table if exists "public"."pilotes_terrain_cemac" drop constraint if exists "pilotes_terrain_cemac_assigned_sales_user_id_fkey";

alter table if exists "public"."pilotes_terrain_cemac" drop constraint if exists "pilotes_terrain_cemac_country_code_check";

alter table if exists "public"."pilotes_terrain_cemac" drop constraint if exists "pilotes_terrain_cemac_fleet_id_fkey";

alter table if exists "public"."pilotes_terrain_cemac" drop constraint if exists "pilotes_terrain_cemac_status_check";

alter table if exists "public"."pilotes_terrain_cemac" drop constraint if exists "pilotes_terrain_cemac_vehicle_count_estimated_check";

alter table if exists "public"."profils" drop constraint if exists "profils_contract_type_check";

alter table if exists "public"."profils" drop constraint if exists "profils_employment_status_check";

alter table if exists "public"."prospect_registrations" drop constraint if exists "prospect_registrations_fleet_id_fkey";

alter table if exists "public"."prospect_registrations" drop constraint if exists "prospect_registrations_invited_by_fkey";

alter table if exists "public"."prospect_registrations" drop constraint if exists "prospect_registrations_status_check";

alter table if exists "public"."prospect_registrations" drop constraint if exists "prospect_registrations_user_id_fkey";

alter table if exists "public"."retention_nudge_log" drop constraint if exists "retention_nudge_log_org_id_fkey";

alter table if exists "public"."retention_nudge_log" drop constraint if exists "retention_nudge_log_user_id_fkey";

alter table if exists "public"."security_notifications" drop constraint if exists "security_notifications_session_id_fkey";

alter table if exists "public"."security_notifications" drop constraint if exists "security_notifications_type_check";

alter table if exists "public"."security_notifications" drop constraint if exists "security_notifications_user_id_fkey";

alter table if exists "public"."seo_taxonomy" drop constraint if exists "seo_taxonomy_kind_check";

alter table if exists "public"."seo_use_cases" drop constraint if exists "seo_use_cases_cas_usage_fkey";

alter table if exists "public"."seo_use_cases" drop constraint if exists "seo_use_cases_cible_fkey";

alter table if exists "public"."seo_use_cases" drop constraint if exists "seo_use_cases_outil_fkey";

alter table if exists "public"."seo_use_cases" drop constraint if exists "seo_use_cases_published_at_when_live";

alter table if exists "public"."seo_use_cases" drop constraint if exists "seo_use_cases_slug_format";

alter table if exists "public"."seo_use_cases" drop constraint if exists "seo_use_cases_slug_key";

alter table if exists "public"."seo_use_cases" drop constraint if exists "seo_use_cases_status_check";

alter table if exists "public"."session_events" drop constraint if exists "session_events_event_type_check";

alter table if exists "public"."session_events" drop constraint if exists "session_events_session_id_fkey";

alter table if exists "public"."session_events" drop constraint if exists "session_events_user_id_fkey";

alter table if exists "public"."system_events" drop constraint if exists "system_events_actor_user_id_fkey";

alter table if exists "public"."system_events" drop constraint if exists "system_events_fleet_id_fkey";

alter table if exists "public"."transits_cemac" drop constraint if exists "transits_cemac_created_by_fkey";

alter table if exists "public"."transits_cemac" drop constraint if exists "transits_cemac_driver_id_fkey";

alter table if exists "public"."transits_cemac" drop constraint if exists "transits_cemac_fleet_id_fkey";

alter table if exists "public"."transits_cemac" drop constraint if exists "transits_cemac_status_check";

alter table if exists "public"."transits_cemac" drop constraint if exists "transits_cemac_vehicle_id_fkey";

alter table if exists "public"."user_sessions" drop constraint if exists "user_sessions_device_type_check";

alter table if exists "public"."user_sessions" drop constraint if exists "user_sessions_revoked_by_fkey";

alter table if exists "public"."user_sessions" drop constraint if exists "user_sessions_user_id_fkey";

alter table if exists "public"."vehicle_costs" drop constraint if exists "vehicle_costs_creneau_id_fkey";

alter table if exists "public"."vehicle_costs" drop constraint if exists "vehicle_costs_devise_check";

alter table if exists "public"."vehicle_costs" drop constraint if exists "vehicle_costs_fleet_id_fkey";

alter table if exists "public"."vehicle_costs" drop constraint if exists "vehicle_costs_montant_check";

alter table if exists "public"."vehicle_costs" drop constraint if exists "vehicle_costs_saisi_par_fkey";

alter table if exists "public"."vehicle_costs" drop constraint if exists "vehicle_costs_type_cout_check";

alter table if exists "public"."vehicle_costs" drop constraint if exists "vehicle_costs_vehicle_id_fkey";

alter table if exists "public"."whatsapp_outbound_logs" drop constraint if exists "whatsapp_outbound_logs_alert_id_fkey";

alter table if exists "public"."whatsapp_outbound_logs" drop constraint if exists "whatsapp_outbound_logs_created_by_user_id_fkey";

alter table if exists "public"."whatsapp_outbound_logs" drop constraint if exists "whatsapp_outbound_logs_fleet_id_fkey";

alter table if exists "public"."whatsapp_outbound_logs" drop constraint if exists "whatsapp_outbound_logs_recipient_user_id_fkey";

alter table if exists "public"."whatsapp_outbound_logs" drop constraint if exists "whatsapp_outbound_logs_status_check";

alter table if exists "public"."whatsapp_retry_queue" drop constraint if exists "whatsapp_retry_queue_fleet_id_fkey";

alter table if exists "public"."whatsapp_retry_queue" drop constraint if exists "whatsapp_retry_queue_status_check";

alter table if exists "public"."affectations_vehicules" drop constraint if exists "affectations_vehicules_driver_user_id_fkey";

alter table if exists "public"."demo_profiles" drop constraint if exists "demo_profiles_account_type_check";

alter table if exists "public"."flotte_adhesions" drop constraint if exists "flotte_adhesions_user_id_fkey";

alter table if exists "public"."onboarding_progress" drop constraint if exists "onboarding_progress_user_id_fkey";

alter table if exists "public"."travaux_maintenance" drop constraint if exists "travaux_maintenance_created_from_incident_id_fkey";

drop function if exists "public"."accepter_invitation"(p_code text);

drop function if exists "public"."add_member_by_email"(p_fleet_id uuid, p_email text, p_role public.role_type);

drop function if exists "public"."admin_reset_demo_fleet"(p_fleet_id uuid);

drop function if exists "public"."audit_cloture_validation"();

drop function if exists "public"."audit_flotte_adhesion_changes"();

drop function if exists "public"."audit_flotte_invitation_insert"();

drop function if exists "public"."audit_flotte_settings"();

drop function if exists "public"."audit_organisation_settings"();

drop function if exists "public"."audit_travaux_maintenance_changes"();

drop function if exists "public"."audit_vehicule_changes"();

drop function if exists "public"."auto_complete_activation_steps"();

drop function if exists "public"."billing_cancel_subscription"(p_subscription_id uuid, p_cancelled_by uuid);

drop function if exists "public"."billing_enter_grace_period"(p_subscription_id uuid, p_grace_days integer);

drop function if exists "public"."billing_run_daily_lifecycle"();

drop function if exists "public"."billing_start_trial"(p_fleet_id uuid, p_trial_days integer);

drop function if exists "public"."billing_suspend_subscription"(p_subscription_id uuid);

drop function if exists "public"."calculer_score_conducteur"(p_driver_user_id uuid, p_fleet_id uuid);

drop function if exists "public"."calculer_score_conducteur_v2"(p_driver_user_id uuid, p_fleet_id uuid, p_model_version text);

drop function if exists "public"."can_manage_fleet"(p_flotte_id uuid);

drop function if exists "public"."check_esamba_2024"();

drop function if exists "public"."complete_activation_step"(p_user_id uuid, p_step text);

drop function if exists "public"."create_esamba_fleet"(p_org_id uuid, p_name text, p_collection_policy text);

drop function if exists "public"."create_esamba_invitation"(p_fleet_id uuid, p_code text);

drop function if exists "public"."create_esamba_vehicle"(p_fleet_id uuid, p_registration text, p_brand text, p_model text, p_year integer, p_current_km integer);

drop view if exists "public"."dashboard_alerts";

drop function if exists "public"."demo_check_allowed"(p_action text);

drop function if exists "public"."demo_log_action"(p_action text, p_resource text, p_resource_id uuid, p_status text, p_metadata jsonb);

drop function if exists "public"."demo_revoke_session"(p_user_id uuid, p_reason text);

drop function if exists "public"."demo_user_fleet_id"();

drop function if exists "public"."fleet_activation_metrics"(p_fleet_id uuid);

drop function if exists "public"."get_current_user_permissions"(p_org_id uuid);

drop function if exists "public"."get_current_user_role"(p_org_id uuid);

drop function if exists "public"."get_dvir_checklist_config"();

drop function if exists "public"."get_dvir_list"(p_fleet_id uuid, p_vehicle_id uuid, p_inspected_by uuid, p_status text, p_date_from date, p_date_to date, p_limit integer, p_offset integer);

drop function if exists "public"."get_inactive_drivers_with_manager"();

drop function if exists "public"."get_inactive_members_for_nudge"(min_days integer, max_days integer);

drop function if exists "public"."get_kpi_summary"(p_org_id uuid);

drop function if exists "public"."help_current_user_is_admin"();

drop function if exists "public"."init_activation_progress"(p_user_id uuid, p_org_id uuid);

drop function if exists "public"."is_app_super_admin"();

drop function if exists "public"."is_demo_user"();

drop function if exists "public"."is_prospect_active"();

drop function if exists "public"."list_fleet_invitations"(p_fleet_id uuid);

drop function if exists "public"."mark_notifications_read"(p_ids uuid[]);

drop function if exists "public"."nettoyer_base_donnees"(p_dry_run boolean);

drop function if exists "public"."notify_upcoming_expirations"(p_hours_before integer);

drop function if exists "public"."otp_can_send"(p_phone text);

drop function if exists "public"."otp_record_attempt"(p_phone text, p_action text, p_meta jsonb);

drop function if exists "public"."peut_gerer_pilotes_terrain"(p_fleet_id uuid);

drop function if exists "public"."prospect_create_account"(p_user_id uuid, p_email text, p_company_name text, p_invited_by uuid, p_fleet_id uuid, p_trial_days integer);

drop function if exists "public"."prospect_expire_accounts"();

drop function if exists "public"."prospect_get_demo_fleet_id"();

drop function if exists "public"."prospect_get_status"();

drop function if exists "public"."prospect_reset_demo_fleet"(p_fleet_id uuid);

drop function if exists "public"."prospect_set_updated_at"();

drop function if exists "public"."prospect_suspend_expired"();

drop function if exists "public"."qr_generate_fleet_lot"(p_fleet_id uuid, p_vehicle_ids uuid[], p_subscription_id uuid, p_created_by uuid, p_expires_hours integer);

drop function if exists "public"."qr_generate_vehicle"(p_vehicle_id uuid, p_subscription_id uuid, p_created_by uuid, p_expires_hours integer, p_max_uses integer);

drop function if exists "public"."qr_scan_activation"(p_code text, p_scanner_id uuid);

drop function if exists "public"."rbac_has_fleet_access"(p_fleet_id uuid);

drop function if exists "public"."rbac_is_fleet_manager_or_above"(p_fleet_id uuid);

drop function if exists "public"."rbac_is_fleet_organizer"(p_fleet_id uuid);

drop function if exists "public"."rbac_is_mechanic_on_fleet"(p_fleet_id uuid);

drop function if exists "public"."rbac_role_on_fleet"(p_fleet_id uuid);

drop function if exists "public"."rbac_user_fleet_ids"();

drop function if exists "public"."rechercher_vehicules_flotte"(p_fleet_id uuid, p_query text, p_status text[], p_maint text[], p_alert text[], p_sort_by text, p_limit integer, p_offset integer);

drop function if exists "public"."revoke_all_other_sessions"();

drop function if exists "public"."revoke_session"(p_session_id uuid);

drop function if exists "public"."search_fleet"(search_query text, max_per_type integer, fleet_id_filter uuid);

drop function if exists "public"."seo_use_cases_validate_taxonomy"();

drop function if exists "public"."set_demo_account_expiry"(p_user_id uuid, p_created_at timestamp with time zone);

drop function if exists "public"."set_updated_at"();

drop function if exists "public"."subscription_vehicle_capacity_model"(p_plan_code text, p_plan_max integer, p_subscription_max integer);

drop function if exists "public"."track_session"(p_user_id uuid, p_fingerprint text, p_device_name text, p_device_type text, p_browser text, p_os text, p_ip text, p_city text, p_region text, p_country_code text, p_country_name text, p_supabase_session_id text);

drop function if exists "public"."trg_controles_dvir_unsafe_alert"();

drop function if exists "public"."trg_enforce_same_active_subscription_plan"();

drop function if exists "public"."trg_set_updated_at"();

drop function if exists "public"."trust_session"(p_session_id uuid);

drop function if exists "public"."update_fleet_member_role"(p_adhesion_id uuid, p_role public.role_type);

drop function if exists "public"."user_can_read_retention_org"(p_org_id uuid);

drop view if exists "public"."v_access_codes";

drop view if exists "public"."v_activation_status";

drop view if exists "public"."v_activite_conducteur_quotidienne";

drop view if exists "public"."v_billing_lifecycle_status";

drop view if exists "public"."v_couts_flotte";

drop view if exists "public"."v_demo_accounts_status";

drop view if exists "public"."v_dvir_compliance";

drop view if exists "public"."v_dvir_defaut_frequency";

drop view if exists "public"."v_prospect_dashboard";

drop view if exists "public"."v_quick_wins_pending";

drop view if exists "public"."v_rbac_user_roles";

drop view if exists "public"."v_user_universe";

drop function if exists "public"."valider_code_invitation"(p_code text);

drop view if exists "public"."vehicles";

drop view if exists "public"."vehicles_search_view";

drop view if exists "public"."vue_couts_par_vehicule";

drop view if exists "public"."vue_pipeline_cemac";

drop view if exists "public"."v_access_matrix";

drop view if exists "public"."v_activation_funnel";

drop view if exists "public"."v_creneaux_actifs_validations";

drop view if exists "public"."v_geofences_with_stats";

drop view if exists "public"."v_kpis_flotte";

drop view if exists "public"."v_retention_cohorts";

drop view if exists "public"."v_retention_kpis";

drop view if exists "public"."vehicle_failure_features_v1";

drop view if exists "public"."alerts";

drop view if exists "public"."v_activite_conducteur";

alter table if exists "public"."abonnements_addons" drop constraint if exists "abonnements_addons_pkey";

alter table if exists "public"."activation_progress" drop constraint if exists "activation_progress_pkey";

alter table if exists "public"."addons" drop constraint if exists "addons_pkey";

alter table if exists "public"."billing_events" drop constraint if exists "billing_events_pkey";

alter table if exists "public"."blocages_discipline" drop constraint if exists "blocages_discipline_pkey";

alter table if exists "public"."clerk_webhook_events" drop constraint if exists "clerk_webhook_events_pkey";

alter table if exists "public"."coaching_sessions" drop constraint if exists "coaching_sessions_pkey";

alter table if exists "public"."conversion_events" drop constraint if exists "conversion_events_pkey";

alter table if exists "public"."driver_score_snapshots" drop constraint if exists "driver_score_snapshots_pkey";

alter table if exists "public"."journal_peages" drop constraint if exists "journal_peages_pkey";

alter table if exists "public"."journal_scans_qr" drop constraint if exists "journal_scans_qr_pkey";

alter table if exists "public"."notification_queue" drop constraint if exists "notification_queue_pkey";

alter table if exists "public"."onboarding_sequence_log" drop constraint if exists "onboarding_sequence_log_pkey";

alter table if exists "public"."otp_rate_limits" drop constraint if exists "otp_rate_limits_pkey";

alter table if exists "public"."payment_attempts" drop constraint if exists "payment_attempts_pkey";

alter table if exists "public"."payment_transactions" drop constraint if exists "payment_transactions_pkey";

alter table if exists "public"."pilot_contacts" drop constraint if exists "pilot_contacts_pkey";

alter table if exists "public"."pilot_events" drop constraint if exists "pilot_events_pkey";

alter table if exists "public"."pilot_sites" drop constraint if exists "pilot_sites_pkey";

alter table if exists "public"."pilotes_terrain_cemac" drop constraint if exists "pilotes_terrain_cemac_pkey";

alter table if exists "public"."prospect_registrations" drop constraint if exists "prospect_registrations_pkey";

alter table if exists "public"."retention_nudge_log" drop constraint if exists "retention_nudge_log_pkey";

alter table if exists "public"."security_notifications" drop constraint if exists "security_notifications_pkey";

alter table if exists "public"."seo_taxonomy" drop constraint if exists "seo_taxonomy_pkey";

alter table if exists "public"."seo_use_cases" drop constraint if exists "seo_use_cases_pkey";

alter table if exists "public"."session_events" drop constraint if exists "session_events_pkey";

alter table if exists "public"."system_events" drop constraint if exists "system_events_pkey";

alter table if exists "public"."transits_cemac" drop constraint if exists "transits_cemac_pkey";

alter table if exists "public"."user_sessions" drop constraint if exists "user_sessions_pkey";

alter table if exists "public"."vehicle_costs" drop constraint if exists "vehicle_costs_pkey";

alter table if exists "public"."whatsapp_outbound_logs" drop constraint if exists "whatsapp_outbound_logs_pkey";

alter table if exists "public"."whatsapp_retry_queue" drop constraint if exists "whatsapp_retry_queue_pkey";

alter table if exists "public"."whatsapp_webhook_events" drop constraint if exists "whatsapp_webhook_events_pkey";

drop index if exists "public"."abonnements_addons_pkey";

drop index if exists "public"."activation_progress_pkey";

drop index if exists "public"."activation_progress_user_id_key";

drop index if exists "public"."addons_code_key";

drop index if exists "public"."addons_pkey";

drop index if exists "public"."billing_events_fleet_idx";

drop index if exists "public"."billing_events_payment_idx";

drop index if exists "public"."billing_events_pkey";

drop index if exists "public"."blocages_discipline_pkey";

drop index if exists "public"."clerk_webhook_events_pkey";

drop index if exists "public"."clerk_webhook_events_svix_id_key";

drop index if exists "public"."coaching_sessions_pkey";

drop index if exists "public"."conversion_events_pkey";

drop index if exists "public"."demo_profiles_active_idx";

drop index if exists "public"."driver_score_snapshots_pkey";

drop index if exists "public"."idx_activation_org";

drop index if exists "public"."idx_activation_steps";

drop index if exists "public"."idx_activation_user";

drop index if exists "public"."idx_admin_profiles_internal_role";

drop index if exists "public"."idx_affectations_vehicules_driver_user_id";

drop index if exists "public"."idx_affectations_vehicules_fleet_id";

drop index if exists "public"."idx_affectations_vehicules_is_active";

drop index if exists "public"."idx_affectations_vehicules_vehicle_id";

drop index if exists "public"."idx_alertes_automatiques_active_vehicle";

drop index if exists "public"."idx_alertes_automatiques_alert_type";

drop index if exists "public"."idx_alertes_automatiques_assignee_user_id";

drop index if exists "public"."idx_alertes_automatiques_created_at";

drop index if exists "public"."idx_alertes_automatiques_driver_user_id";

drop index if exists "public"."idx_alertes_automatiques_fleet_id";

drop index if exists "public"."idx_alertes_automatiques_message_trgm";

drop index if exists "public"."idx_alertes_automatiques_resolved";

drop index if exists "public"."idx_blocages_discipline_vehicle";

drop index if exists "public"."idx_clerk_webhook_events_svix_id";

drop index if exists "public"."idx_clerk_webhook_events_type_status";

drop index if exists "public"."idx_clotures_creneaux_shift_id";

drop index if exists "public"."idx_clotures_creneaux_status";

drop index if exists "public"."idx_clotures_creneaux_validated_by";

drop index if exists "public"."idx_coaching_sessions_driver";

drop index if exists "public"."idx_coaching_sessions_fleet";

drop index if exists "public"."idx_coaching_sessions_pending";

drop index if exists "public"."idx_controles_status";

drop index if exists "public"."idx_controles_vehicle_date";

drop index if exists "public"."idx_conv_type";

drop index if exists "public"."idx_conv_user";

drop index if exists "public"."idx_creneaux_conducteurs_assignment";

drop index if exists "public"."idx_creneaux_conducteurs_started_at";

drop index if exists "public"."idx_creneaux_conducteurs_status";

drop index if exists "public"."idx_demo_expiration_log_user";

drop index if exists "public"."idx_demo_onboarding_logs_user";

drop index if exists "public"."idx_demo_profiles_user_active";

drop index if exists "public"."idx_driver_score_snapshots_calculated_at";

drop index if exists "public"."idx_driver_score_snapshots_fleet_driver_created";

drop index if exists "public"."idx_flotte_adhesions_role";

drop index if exists "public"."idx_flottes_org_id";

drop index if exists "public"."idx_incidents_driver_user_id";

drop index if exists "public"."idx_incidents_fleet_driver_created";

drop index if exists "public"."idx_incidents_severity";

drop index if exists "public"."idx_journal_peages_fleet_occurred_at";

drop index if exists "public"."idx_journal_peages_idempotency_key";

drop index if exists "public"."idx_journal_peages_vehicle_occurred_at";

drop index if exists "public"."idx_journal_scans_qr_token";

drop index if exists "public"."idx_journal_scans_qr_user";

drop index if exists "public"."idx_onboarding_sequence_log_sent";

drop index if exists "public"."idx_otp_rate_limits_phone_action";

drop index if exists "public"."idx_payment_transactions_created_at";

drop index if exists "public"."idx_payment_transactions_fleet_id";

drop index if exists "public"."idx_payment_transactions_status";

drop index if exists "public"."idx_pilot_contacts_site";

drop index if exists "public"."idx_pilot_events_date";

drop index if exists "public"."idx_pilot_events_site";

drop index if exists "public"."idx_pilot_sites_fleet_id";

drop index if exists "public"."idx_pilot_sites_pays";

drop index if exists "public"."idx_pilot_sites_statut";

drop index if exists "public"."idx_pilotes_terrain_cemac_assigned_sales";

drop index if exists "public"."idx_pilotes_terrain_cemac_country";

drop index if exists "public"."idx_pilotes_terrain_cemac_fleet";

drop index if exists "public"."idx_pilotes_terrain_cemac_status";

drop index if exists "public"."idx_profils_full_name_trgm";

drop index if exists "public"."idx_profils_phone_trgm";

drop index if exists "public"."idx_prospect_status";

drop index if exists "public"."idx_prospect_user";

drop index if exists "public"."idx_retention_nudge_log_user_org_sent";

drop index if exists "public"."idx_scores_conducteurs_driver_user_id";

drop index if exists "public"."idx_scores_conducteurs_fleet_id";

drop index if exists "public"."idx_scores_conducteurs_score_level";

drop index if exists "public"."idx_security_notifications_user";

drop index if exists "public"."idx_session_events_session";

drop index if exists "public"."idx_system_events_fleet_created";

drop index if exists "public"."idx_system_events_type_created";

drop index if exists "public"."idx_travaux_maintenance_notes_trgm";

drop index if exists "public"."idx_travaux_maintenance_pending";

drop index if exists "public"."idx_travaux_maintenance_priority";

drop index if exists "public"."idx_travaux_maintenance_status";

drop index if exists "public"."idx_travaux_maintenance_status_priority_trgm";

drop index if exists "public"."idx_user_sessions_fingerprint";

drop index if exists "public"."idx_user_sessions_user_id";

drop index if exists "public"."idx_vehicle_costs_date_depense";

drop index if exists "public"."idx_vehicle_costs_fleet_id";

drop index if exists "public"."idx_vehicle_costs_type_cout";

drop index if exists "public"."idx_vehicle_costs_vehicle_id";

drop index if exists "public"."idx_vehicle_documents_expires_at";

drop index if exists "public"."idx_vehicle_documents_fleet_id";

drop index if exists "public"."idx_vehicules_brand_model_trgm";

drop index if exists "public"."idx_vehicules_brand_trgm";

drop index if exists "public"."idx_vehicules_fleet_status";

drop index if exists "public"."idx_vehicules_registration_trgm";

drop index if exists "public"."idx_vehicules_search_trgm";

drop index if exists "public"."idx_whatsapp_outbound_logs_alert_id";

drop index if exists "public"."idx_whatsapp_outbound_logs_fleet_id_created_at";

drop index if exists "public"."idx_whatsapp_outbound_logs_provider_message_id";

drop index if exists "public"."idx_whatsapp_outbound_logs_recipient_user_id";

drop index if exists "public"."idx_whatsapp_outbound_logs_retry";

drop index if exists "public"."idx_whatsapp_webhook_events_received_at";

drop index if exists "public"."jetons_qr_code_idx";

drop index if exists "public"."jetons_qr_code_unique";

drop index if exists "public"."jetons_qr_fleet_idx";

drop index if exists "public"."jetons_qr_vehicle_idx";

drop index if exists "public"."journal_peages_pkey";

drop index if exists "public"."journal_scans_qr_pkey";

drop index if exists "public"."journal_scans_qr_status_idx";

drop index if exists "public"."notification_queue_pkey";

drop index if exists "public"."notification_queue_status_idx";

drop index if exists "public"."onboarding_progress_org_id_idx";

drop index if exists "public"."onboarding_sequence_log_pkey";

drop index if exists "public"."onboarding_sequence_log_user_fleet_step_unique";

drop index if exists "public"."otp_rate_limits_pkey";

drop index if exists "public"."payment_attempts_payment_idx";

drop index if exists "public"."payment_attempts_pkey";

drop index if exists "public"."payment_attempts_provider_ref_unique";

drop index if exists "public"."payment_transactions_pkey";

drop index if exists "public"."payment_transactions_reference_key";

drop index if exists "public"."pilot_contacts_pkey";

drop index if exists "public"."pilot_events_pkey";

drop index if exists "public"."pilot_sites_pkey";

drop index if exists "public"."pilotes_terrain_cemac_pkey";

drop index if exists "public"."prospect_registrations_pkey";

drop index if exists "public"."retention_nudge_log_pkey";

drop index if exists "public"."security_notifications_pkey";

drop index if exists "public"."seo_taxonomy_kind_slug_idx";

drop index if exists "public"."seo_taxonomy_pkey";

drop index if exists "public"."seo_use_cases_pkey";

drop index if exists "public"."seo_use_cases_slug_key";

drop index if exists "public"."seo_use_cases_status_published_idx";

drop index if exists "public"."session_events_pkey";

drop index if exists "public"."system_events_pkey";

drop index if exists "public"."transits_cemac_departure_date_idx";

drop index if exists "public"."transits_cemac_fleet_id_idx";

drop index if exists "public"."transits_cemac_pkey";

drop index if exists "public"."transits_cemac_status_idx";

drop index if exists "public"."transits_cemac_vehicle_id_idx";

drop index if exists "public"."user_sessions_pkey";

drop index if exists "public"."vehicle_costs_pkey";

drop index if exists "public"."whatsapp_outbound_logs_pkey";

drop index if exists "public"."whatsapp_retry_queue_pkey";

drop index if exists "public"."whatsapp_webhook_events_pkey";

drop index if exists "public"."wrq_fleet_idx";

drop index if exists "public"."wrq_status_scheduled_idx";

drop index if exists "public"."demo_requests_status_created_idx";

drop index if exists "public"."idx_driver_licenses_expires_at";

drop table if exists "public"."abonnements_addons";

drop table if exists "public"."activation_progress";

drop table if exists "public"."addons";

drop table if exists "public"."billing_events";

drop table if exists "public"."blocages_discipline";

drop table if exists "public"."clerk_webhook_events";

drop table if exists "public"."coaching_sessions";

drop table if exists "public"."conversion_events";

drop table if exists "public"."driver_score_snapshots";

drop table if exists "public"."journal_peages";

drop table if exists "public"."journal_scans_qr";

drop table if exists "public"."notification_queue";

drop table if exists "public"."onboarding_sequence_log";

drop table if exists "public"."otp_rate_limits";

drop table if exists "public"."payment_attempts";

drop table if exists "public"."payment_transactions";

drop table if exists "public"."pilot_contacts";

drop table if exists "public"."pilot_events";

drop table if exists "public"."pilot_sites";

drop table if exists "public"."pilotes_terrain_cemac";

drop table if exists "public"."prospect_registrations";

drop table if exists "public"."retention_nudge_log";

drop table if exists "public"."security_notifications";

drop table if exists "public"."seo_taxonomy";

drop table if exists "public"."seo_use_cases";

drop table if exists "public"."session_events";

drop table if exists "public"."system_events";

drop table if exists "public"."transits_cemac";

drop table if exists "public"."user_sessions";

drop table if exists "public"."vehicle_costs";

drop table if exists "public"."whatsapp_outbound_logs";

drop table if exists "public"."whatsapp_retry_queue";

drop table if exists "public"."whatsapp_webhook_events";

alter type "public"."alert_type" rename to "alert_type__old_version_to_be_dropped";

create type "public"."alert_type" as enum ('missing_closure', 'recurring_gap', 'risky_driver', 'vehicle_blocked', 'maintenance_due', 'document_expired', 'failure_risk', 'geofence_exit', 'dvir_unsafe', 'faq_answer', 'geofence_enter', 'speeding');

alter table "public"."alertes_automatiques" alter column alert_type type "public"."alert_type" using alert_type::text::"public"."alert_type";

drop type "public"."alert_type__old_version_to_be_dropped";

alter table "public"."controles_journaliers" drop column "dvir_alert_created";

alter table "public"."controles_journaliers" drop column "dvir_alert_id";

alter table "public"."controles_journaliers" drop column "photo_urls";

alter table "public"."controles_journaliers" drop column "updated_at";

alter table "public"."demo_audit_logs" drop column "universe";

alter table "public"."demo_profiles" drop column "universe";

alter table "public"."demo_profiles" alter column "account_type" set default 'prospect'::text;

alter table "public"."demo_profiles" alter column "demo_role" set default 'driver'::text;

alter table "public"."demo_profiles" alter column "fleet_id" drop default;

alter table "public"."demo_requests" drop column "fleet_size";

alter table "public"."demo_requests" drop column "notes";

alter table "public"."demo_requests" alter column "email" set not null;

alter table "public"."demo_requests" alter column "phone" drop not null;

alter table "public"."demo_requests" alter column "status" set default 'pending'::public.demo_request_status;

alter table "public"."demo_requests" alter column "status" set data type public.demo_request_status using "status"::public.demo_request_status;

alter table "public"."droits_vehicules" drop column "ends_at";

alter table "public"."droits_vehicules" drop column "is_premium";

alter table "public"."droits_vehicules" drop column "starts_at";

alter table "public"."droits_vehicules" drop column "status";

alter table "public"."flotte_adhesions" drop column "universe";

alter table "public"."flottes" alter column "org_id" set not null;

alter table "public"."jetons_qr" drop column "action";

alter table "public"."jetons_qr" drop column "activated_at";

alter table "public"."jetons_qr" drop column "code";

alter table "public"."jetons_qr" drop column "fleet_id";

alter table "public"."jetons_qr" drop column "license_ids";

alter table "public"."jetons_qr" drop column "max_uses";

alter table "public"."jetons_qr" drop column "revoked_at";

alter table "public"."jetons_qr" drop column "revoked_by";

alter table "public"."jetons_qr" drop column "status";

alter table "public"."jetons_qr" drop column "subscription_id";

alter table "public"."jetons_qr" drop column "type";

alter table "public"."jetons_qr" drop column "used_count";

alter table "public"."jetons_qr" drop column "vehicle_ids";

alter table "public"."onboarding_progress" alter column "created_at" set not null;

alter table "public"."onboarding_progress" alter column "updated_at" set not null;

alter table "public"."paiements" drop column "refund_reason";

alter table "public"."paiements" drop column "refunded_at";

alter table "public"."paiements" drop column "refunded_by";

alter table "public"."plans" alter column "enables_ai" set default false;

alter table "public"."plans" alter column "enables_anomaly_insights" set default false;

alter table "public"."plans" alter column "enables_driver_scoring" set default false;

alter table "public"."plans" alter column "enables_finance" set default false;

alter table "public"."plans" alter column "enables_reports" set default false;

alter table "public"."profils" drop column "contract_type";

alter table "public"."profils" drop column "emergency_contact_name";

alter table "public"."profils" drop column "emergency_contact_phone";

alter table "public"."profils" drop column "employee_code";

alter table "public"."profils" drop column "employment_status";

alter table "public"."profils" drop column "hire_date";

alter table "public"."profils" drop column "rh_notes";

drop type "public"."coaching_lang";

drop type "public"."coaching_status";

drop type "public"."pays_cemac";

drop type "public"."statut_pilote";

CREATE INDEX idx_creneaux_conducteurs_assignment_id ON public.creneaux_conducteurs USING btree (assignment_id);

CREATE INDEX demo_requests_status_created_idx ON public.demo_requests USING btree (status, created_at);

CREATE INDEX idx_driver_licenses_expires_at ON public.driver_licenses USING btree (expires_at) WHERE (expires_at IS NOT NULL);

alter table "public"."alertes_automatiques" add constraint "alertes_automatiques_severity_check" CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))) not valid;

alter table "public"."alertes_automatiques" validate constraint "alertes_automatiques_severity_check";

alter table "public"."flottes" add constraint "flottes_org_id_fkey" FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE not valid;

alter table "public"."flottes" validate constraint "flottes_org_id_fkey";

alter table "public"."profils" add constraint "profils_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profils" validate constraint "profils_user_id_fkey";

alter table "public"."affectations_vehicules" add constraint "affectations_vehicules_driver_user_id_fkey" FOREIGN KEY (driver_user_id) REFERENCES public.profils(user_id) ON DELETE CASCADE NOT VALID not valid;

alter table "public"."affectations_vehicules" validate constraint "affectations_vehicules_driver_user_id_fkey";

alter table "public"."demo_profiles" add constraint "demo_profiles_account_type_check" CHECK ((account_type = ANY (ARRAY['prospect'::text, 'investor'::text, 'internal'::text, 'dev'::text]))) not valid;

alter table "public"."demo_profiles" validate constraint "demo_profiles_account_type_check";

alter table "public"."flotte_adhesions" add constraint "flotte_adhesions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."flotte_adhesions" validate constraint "flotte_adhesions_user_id_fkey";

alter table "public"."onboarding_progress" add constraint "onboarding_progress_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."onboarding_progress" validate constraint "onboarding_progress_user_id_fkey";

alter table "public"."travaux_maintenance" add constraint "travaux_maintenance_created_from_incident_id_fkey" FOREIGN KEY (created_from_incident_id) REFERENCES public.incidents(id) not valid;

alter table "public"."travaux_maintenance" validate constraint "travaux_maintenance_created_from_incident_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.can_manage_fleet(p_fleet_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(p_fleet_id, 'manager'::public.role_type)
    OR public.has_role(p_fleet_id, 'organizer'::public.role_type);
$function$
;

CREATE OR REPLACE FUNCTION public.admin_upsert_faq_article(p_id uuid DEFAULT NULL::uuid, p_slug text DEFAULT NULL::text, p_title text DEFAULT NULL::text, p_content text DEFAULT NULL::text, p_locale text DEFAULT 'fr'::text, p_sort_order integer DEFAULT 0, p_is_published boolean DEFAULT true)
 RETURNS public.help_articles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_row public.help_articles;
  v_slug text := nullif(trim(coalesce(p_slug, '')), '');
  v_title text := nullif(trim(coalesce(p_title, '')), '');
  v_content text := nullif(trim(coalesce(p_content, '')), '');
  v_locale text := coalesce(nullif(trim(p_locale), ''), 'fr');
begin
  if not (
    public.is_platform_admin()
    or public.is_help_center_admin()
    or exists (
      select 1
      from public.flotte_adhesions fa
      where fa.user_id = auth.uid()
        and fa.role = 'organizer'
    )
  ) then
    raise exception 'admin_required';
  end if;

  if v_slug is null or v_title is null or v_content is null then
    raise exception 'faq_article_required_fields';
  end if;

  if p_id is null then
    insert into public.help_articles (
      slug,
      title,
      category,
      role,
      locale,
      keywords,
      content,
      route_context,
      plan_min,
      module_keys,
      error_codes,
      sort_order,
      is_published
    )
    values (
      v_slug,
      v_title,
      'faq',
      array[]::text[],
      v_locale,
      array[]::text[],
      v_content,
      array['/faq']::text[],
      null,
      array[]::text[],
      array[]::text[],
      coalesce(p_sort_order, 0),
      coalesce(p_is_published, true)
    )
    returning * into v_row;
  else
    update public.help_articles
    set
      slug = v_slug,
      title = v_title,
      category = 'faq',
      role = array[]::text[],
      locale = v_locale,
      keywords = array[]::text[],
      content = v_content,
      route_context = array['/faq']::text[],
      plan_min = null,
      module_keys = array[]::text[],
      error_codes = array[]::text[],
      sort_order = coalesce(p_sort_order, 0),
      is_published = coalesce(p_is_published, true)
    where id = p_id
      and category = 'faq'
    returning * into v_row;

    if v_row.id is null then
      raise exception 'faq_article_not_found';
    end if;
  end if;

  return v_row;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.assign_vehicle_to_subscription(p_vehicle_id uuid, p_subscription_id uuid, p_actor_id uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_vehicle record;
  v_sub record;
  v_capacity jsonb;
  v_limit int;
  v_used int;
begin
  select id, fleet_id, registration
  into v_vehicle
  from public.vehicules
  where id = p_vehicle_id
  for update;

  if v_vehicle.id is null then
    raise exception 'vehicule_introuvable';
  end if;

  select a.id, a.fleet_id, a.status, p.code as plan_code, p.max_vehicles, p.max_vehicles_per_subscription
  into v_sub
  from public.abonnements a
  join public.plans p on p.id = a.plan_id
  where a.id = p_subscription_id
  for update;

  if v_sub.id is null then
    raise exception 'abonnement_introuvable';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_sub.fleet_id::text, 2026081012));

  if v_sub.fleet_id is distinct from v_vehicle.fleet_id then
    raise exception 'abonnement_flotte_incompatible';
  end if;

  if not public.is_vehicle_subscription_status_active(v_sub.status) then
    raise exception 'abonnement_inactif';
  end if;

  v_capacity := public.subscription_plan_capacity(
    v_sub.plan_code,
    v_sub.max_vehicles,
    v_sub.max_vehicles_per_subscription
  );
  v_limit := (v_capacity->>'vehicles_per_subscription')::int;

  if exists (
    select 1
    from public.droits_vehicules
    where vehicle_id = p_vehicle_id
      and active = true
      and subscription_id <> p_subscription_id
  ) then
    raise exception 'vehicule_deja_associe_abonnement';
  end if;

  select count(*)::int
  into v_used
  from public.droits_vehicules
  where subscription_id = p_subscription_id
    and active = true;

  if v_used >= v_limit then
    raise exception 'limite_vehicules_abonnement_atteinte';
  end if;

  if (v_capacity->>'allows_multiple_vehicles_per_subscription')::boolean = false and v_used >= 1 then
    raise exception 'abonnement_standard_deja_utilise';
  end if;

  insert into public.droits_vehicules(vehicle_id, subscription_id, active, associated_at, ended_at)
  values (p_vehicle_id, p_subscription_id, true, now(), null)
  on conflict (vehicle_id, subscription_id) do update
    set active = true,
        associated_at = now(),
        ended_at = null;

  if to_regclass('public.billing_events') is not null then
    insert into public.billing_events(fleet_id, subscription_id, event_type, payload)
    values (
      v_sub.fleet_id,
      p_subscription_id,
      'subscription.vehicle_assigned',
      jsonb_build_object('vehicle_id', p_vehicle_id, 'actor_id', p_actor_id)
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'vehicle_id', p_vehicle_id,
    'subscription_id', p_subscription_id
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_vehicle_with_subscription(p_fleet_id uuid, p_subscription_id uuid, p_registration text, p_brand text DEFAULT NULL::text, p_model text DEFAULT NULL::text, p_year integer DEFAULT NULL::integer, p_current_km integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_check jsonb;
  v_target record;
  v_vehicle public.vehicules%rowtype;
  v_current_subscription_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'non_authentifie'; END IF;
  IF p_fleet_id IS NULL THEN RAISE EXCEPTION 'fleet_id_required'; END IF;
  IF p_subscription_id IS NULL THEN RAISE EXCEPTION 'subscription_id_required'; END IF;
  IF nullif(trim(coalesce(p_registration, '')), '') IS NULL THEN RAISE EXCEPTION 'registration_required'; END IF;

  v_check := public.rbac_check_permission('vehicle.create', p_fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'permission_refusee_vehicle_create';
  END IF;

  SELECT a.id, a.fleet_id, a.status, a.starts_at, a.ends_at
    INTO v_target
    FROM public.abonnements a
   WHERE a.id = p_subscription_id
   FOR UPDATE;

  IF v_target.id IS NULL THEN RAISE EXCEPTION 'abonnement_introuvable'; END IF;
  IF v_target.fleet_id IS DISTINCT FROM p_fleet_id THEN RAISE EXCEPTION 'abonnement_flotte_incompatible'; END IF;

  IF v_target.status IN ('inactive', 'pending_payment') THEN
    PERFORM public.activate_fleet_subscription(p_subscription_id);
    SELECT a.id, a.fleet_id, a.status, a.starts_at, a.ends_at
      INTO v_target
      FROM public.abonnements a
     WHERE a.id = p_subscription_id;
  END IF;

  IF NOT public.is_vehicle_subscription_status_active(v_target.status) THEN
    RAISE EXCEPTION 'abonnement_inactif';
  END IF;
  IF COALESCE(v_target.starts_at, '-infinity'::timestamptz) > now() THEN
    RAISE EXCEPTION 'abonnement_pas_encore_actif';
  END IF;
  IF COALESCE(v_target.ends_at, 'infinity'::timestamptz) <= now() THEN
    RAISE EXCEPTION 'abonnement_expire';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_fleet_id::text, 2026081012));
  IF NOT public.can_create_vehicle(p_fleet_id) THEN
    RAISE EXCEPTION 'limite_vehicules_abonnement_atteinte';
  END IF;

  INSERT INTO public.vehicules (fleet_id, registration, brand, model, year, current_km, status)
  VALUES (
    p_fleet_id,
    upper(trim(p_registration)),
    nullif(trim(coalesce(p_brand, '')), ''),
    nullif(trim(coalesce(p_model, '')), ''),
    p_year,
    greatest(coalesce(p_current_km, 0), 0),
    'ok'
  ) RETURNING * INTO v_vehicle;

  SELECT subscription_id
    INTO v_current_subscription_id
    FROM public.droits_vehicules
   WHERE vehicle_id = v_vehicle.id
     AND active = true
   FOR UPDATE;

  IF v_current_subscription_id IS DISTINCT FROM p_subscription_id THEN
    UPDATE public.droits_vehicules
       SET active = false, ended_at = now()
     WHERE vehicle_id = v_vehicle.id
       AND active = true;

    PERFORM public.assign_vehicle_to_subscription(v_vehicle.id, p_subscription_id, auth.uid());
  END IF;

  RETURN to_jsonb(v_vehicle);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.driver_terrain_self_check(p_user_id uuid, p_fleet_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_phone text;
  v_has_shift boolean;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'permission_denied: caller must match p_user_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.user_id = p_user_id
      AND fa.fleet_id = p_fleet_id
      AND fa.is_active = true
      AND fa.role = 'driver'::public.role_type
  ) THEN
    RAISE EXCEPTION 'permission_denied: active driver membership required';
  END IF;

  SELECT phone
  INTO v_phone
  FROM public.profils
  WHERE user_id = p_user_id
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM public.affectations_vehicules av
    INNER JOIN public.creneaux_conducteurs cc ON cc.assignment_id = av.id
    WHERE av.driver_user_id = p_user_id
    LIMIT 1
  ) INTO v_has_shift;

  RETURN jsonb_build_object(
    'phone', v_phone,
    'has_ever_shift', v_has_shift
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fleet_feature_enabled(p_fleet_id uuid, p_feature text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    (
      auth.role() = 'service_role'
      or exists (
        select 1
        from public.flotte_adhesions fa
        where fa.fleet_id = p_fleet_id
          and fa.user_id = auth.uid()
          and fa.is_active = true
      )
    )
    and exists (
      select 1
      from public.abonnements a
      join public.plans p on p.id = a.plan_id
      where a.fleet_id = p_fleet_id
        and a.status in ('trial', 'active')
        and coalesce(a.ends_at, '9999-12-31 23:59:59+00'::timestamptz) > now()
        and case lower(trim(p_feature))
          when 'finance' then coalesce(p.enables_finance, false)
          when 'reports' then coalesce(p.enables_reports, false)
          when 'driver_scoring' then coalesce(p.enables_driver_scoring, false)
          when 'ai' then coalesce(p.enables_ai, false) or coalesce(p.enables_anomaly_insights, false)
          when 'anomaly_insights' then coalesce(p.enables_anomaly_insights, false)
          when 'geofencing' then coalesce(p.enables_geofencing, false)
          when 'scheduled_reports' then coalesce(p.enables_scheduled_reports, false)
          when 'offline_driver' then coalesce(p.enables_offline_driver, false)
          else false
        end
    );
$function$
;

CREATE OR REPLACE FUNCTION public.get_auth_flow_session_snapshot(p_preferred_fleet_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_user_created timestamptz;
  v_last_sign_in timestamptz;
  v_active_fleet uuid;
  v_role public.role_type;
  v_org_id uuid;
  v_onboarding boolean;
  v_lapsed boolean := false;
  v_has_memberships boolean;
  v_latest_status text;
  v_latest_starts timestamptz;
  v_latest_ends timestamptz;
  v_latest_plan text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifie';
  END IF;

  SELECT u.created_at, u.last_sign_in_at
  INTO v_user_created, v_last_sign_in
  FROM auth.users u
  WHERE u.id = v_uid;

  SELECT EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.user_id = v_uid
      AND fa.is_active = true
  )
  INTO v_has_memberships;

  IF NOT v_has_memberships THEN
    RETURN jsonb_build_object(
      'has_memberships', false,
      'user_created_at', v_user_created,
      'last_sign_in_at', v_last_sign_in,
      'onboarding_completed', true,
      'lapsed_paid', false,
      'role', null,
      'active_fleet_id', null,
      'org_id', null
    );
  END IF;

  SELECT d.fleet_id, d.role
  INTO v_active_fleet, v_role
  FROM (
    SELECT DISTINCT ON (fa.fleet_id)
      fa.fleet_id,
      fa.role,
      fa.created_at
    FROM public.flotte_adhesions fa
    WHERE fa.user_id = v_uid
      AND fa.is_active = true
    ORDER BY fa.fleet_id, fa.created_at DESC
  ) d
  WHERE p_preferred_fleet_id IS NOT NULL
    AND d.fleet_id = p_preferred_fleet_id;

  IF v_active_fleet IS NULL THEN
    SELECT d.fleet_id, d.role
    INTO v_active_fleet, v_role
    FROM (
      SELECT DISTINCT ON (fa.fleet_id)
        fa.fleet_id,
        fa.role,
        fa.created_at
      FROM public.flotte_adhesions fa
      WHERE fa.user_id = v_uid
        AND fa.is_active = true
      ORDER BY fa.fleet_id, fa.created_at DESC
    ) d
    ORDER BY d.created_at DESC
    LIMIT 1;
  END IF;

  SELECT f.org_id
  INTO v_org_id
  FROM public.flottes f
  WHERE f.id = v_active_fleet;

  SELECT op.completed
  INTO v_onboarding
  FROM public.onboarding_progress op
  WHERE op.org_id = v_org_id
  ORDER BY op.updated_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    v_onboarding := false;
  END IF;

  IF to_regclass('public.abonnements') IS NOT NULL AND to_regclass('public.plans') IS NOT NULL THEN
    SELECT a.status, a.starts_at, a.ends_at, p.code
    INTO v_latest_status, v_latest_starts, v_latest_ends, v_latest_plan
    FROM public.abonnements a
    INNER JOIN public.plans p ON p.id = a.plan_id
    WHERE a.fleet_id = v_active_fleet
    ORDER BY a.ends_at DESC
    LIMIT 1;

    IF FOUND THEN
      IF COALESCE(v_latest_plan, 'free') = 'free' THEN
        v_lapsed := false;
      ELSIF v_latest_status IS DISTINCT FROM 'active' THEN
        v_lapsed := true;
      ELSIF v_latest_ends < now() THEN
        v_lapsed := true;
      ELSIF v_latest_starts > now() THEN
        v_lapsed := true;
      ELSE
        v_lapsed := false;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'has_memberships', true,
    'user_created_at', v_user_created,
    'last_sign_in_at', v_last_sign_in,
    'onboarding_completed', v_onboarding,
    'lapsed_paid', v_lapsed,
    'role', v_role::text,
    'active_fleet_id', v_active_fleet,
    'org_id', v_org_id
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_invitation_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fleet_id uuid;
  v_invitation_code text;
  v_invitation public.flotte_invitations%ROWTYPE;
BEGIN
  v_fleet_id := (new.raw_user_meta_data->>'invitation_fleet_id')::uuid;
  v_invitation_code := new.raw_user_meta_data->>'invitation_code';

  IF v_fleet_id IS NULL THEN
    RETURN new;
  END IF;

  IF v_invitation_code IS NOT NULL THEN
    SELECT *
    INTO v_invitation
    FROM public.flotte_invitations
    WHERE code = v_invitation_code
      AND fleet_id = v_fleet_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'invitation_introuvable';
    END IF;

    IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at <= now() THEN
      RAISE EXCEPTION 'invitation_expiree';
    END IF;

    IF v_invitation.max_uses IS NOT NULL AND v_invitation.current_uses >= v_invitation.max_uses THEN
      RAISE EXCEPTION 'invitation_limite_atteinte';
    END IF;
  END IF;

  INSERT INTO public.flotte_adhesions (fleet_id, user_id, role, is_active)
  VALUES (v_fleet_id, new.id, 'driver', true)
  ON CONFLICT (fleet_id, user_id)
  DO UPDATE SET
    role = 'driver',
    is_active = true;

  IF v_invitation_code IS NOT NULL THEN
    UPDATE public.flotte_invitations
    SET current_uses = current_uses + 1
    WHERE id = v_invitation.id;
  END IF;

  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_full_name text;
begin
  -- Essayer d'obtenir le full_name depuis les métadonnées
  v_full_name := new.raw_user_meta_data->>'full_name';

  -- Si full_name n'est pas disponible, utiliser la partie avant @ de l'email
  if v_full_name is null or v_full_name = '' then
    v_full_name := split_part(new.email, '@', 1);
  end if;

  -- Créer le profil avec le full_name déterminé
  insert into public.profils (user_id, full_name)
  values (new.id, v_full_name)
  on conflict (user_id) do update
  set full_name = coalesce(profils.full_name, excluded.full_name);

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.liste_migrations_appliquees()
 RETURNS SETOF text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'supabase_migrations'
AS $function$
  select version from supabase_migrations.schema_migrations order by version;
$function$
;

create or replace view "public"."v_access_matrix" as  SELECT user_id,
    fleet_id,
    role,
    is_active,
    (role = ANY (ARRAY['manager'::public.role_type, 'organizer'::public.role_type])) AS can_manage_fleet
   FROM public.flotte_adhesions fa;


create or replace view "public"."v_activation_funnel" as  WITH roles AS (
         SELECT unnest(ARRAY['driver'::text, 'organizer'::text, 'manager'::text, 'mechanic'::text]) AS role
        ), orgs AS (
         SELECT DISTINCT flottes.org_id
           FROM public.flottes
        ), inscrits AS (
         SELECT f.org_id,
            fa.user_id,
            (fa.role)::text AS role
           FROM (public.flotte_adhesions fa
             JOIN public.flottes f ON ((f.id = fa.fleet_id)))
          WHERE (fa.is_active = true)
        ), ouvert AS (
         SELECT DISTINCT f.org_id,
            a.driver_user_id AS user_id
           FROM ((public.creneaux_conducteurs c
             JOIN public.affectations_vehicules a ON ((a.id = c.assignment_id)))
             JOIN public.flottes f ON ((f.id = a.fleet_id)))
        ), ferme AS (
         SELECT DISTINCT f.org_id,
            a.driver_user_id AS user_id
           FROM (((public.clotures_creneaux cl
             JOIN public.creneaux_conducteurs c ON ((c.id = cl.shift_id)))
             JOIN public.affectations_vehicules a ON ((a.id = c.assignment_id)))
             JOIN public.flottes f ON ((f.id = a.fleet_id)))
        ), valide AS (
         SELECT DISTINCT f.org_id,
            a.driver_user_id AS user_id
           FROM (((public.clotures_creneaux cl
             JOIN public.creneaux_conducteurs c ON ((c.id = cl.shift_id)))
             JOIN public.affectations_vehicules a ON ((a.id = c.assignment_id)))
             JOIN public.flottes f ON ((f.id = a.fleet_id)))
          WHERE (cl.status = 'validated'::public.closure_status)
        )
 SELECT o.org_id,
    r.role,
    ( SELECT count(*) AS count
           FROM inscrits i
          WHERE ((i.org_id = o.org_id) AND (i.role = r.role))) AS inscribed,
    ( SELECT count(*) AS count
           FROM inscrits i
          WHERE ((i.org_id = o.org_id) AND (i.role = r.role) AND (EXISTS ( SELECT 1
                   FROM ouvert x
                  WHERE ((x.org_id = i.org_id) AND (x.user_id = i.user_id)))))) AS opened_shift,
    ( SELECT count(*) AS count
           FROM inscrits i
          WHERE ((i.org_id = o.org_id) AND (i.role = r.role) AND (EXISTS ( SELECT 1
                   FROM ferme x
                  WHERE ((x.org_id = i.org_id) AND (x.user_id = i.user_id)))))) AS closed_shift,
    ( SELECT count(*) AS count
           FROM inscrits i
          WHERE ((i.org_id = o.org_id) AND (i.role = r.role) AND (EXISTS ( SELECT 1
                   FROM valide x
                  WHERE ((x.org_id = i.org_id) AND (x.user_id = i.user_id)))))) AS validated_shift
   FROM (orgs o
     CROSS JOIN roles r);


create or replace view "public"."v_creneaux_actifs_validations" as  SELECT c.id AS creneau_id,
    av.fleet_id,
    v.registration,
    v.brand,
    v.model,
    c.status AS statut_creneau,
    c.started_at,
    c.km_start,
    COALESCE(c.km_end, v.current_km, c.km_start) AS current_km,
    COALESCE(dvir_pre.dvir_pre_count, 0) AS dvir_pre_count,
    dvir_pre.dvir_pre_statut,
    COALESCE(dvir_post.dvir_post_count, 0) AS dvir_post_count,
    dvir_post.dvir_post_statut,
    COALESCE(fuel.carburant_saisies, 0) AS carburant_saisies,
    COALESCE(fuel.carburant_litres_total, (0)::numeric) AS carburant_litres_total,
    COALESCE(fuel.carburant_xof_total, 0) AS carburant_xof_total,
    cl.id AS cloture_id,
    cl.status AS cloture_statut,
    cl.revenue_declared AS cloture_revenue_declared,
    cl.expected_revenue AS cloture_expected_revenue,
    cl.revenue_gap AS cloture_revenue_gap,
    cl.collection_mode AS cloture_collection_mode,
    cl.proof_type AS preuve_type,
    cl.proof_value AS preuve_valeur,
        CASE
            WHEN ((cl.proof_value IS NULL) OR (btrim(cl.proof_value) = ''::text)) THEN 'inconnu'::text
            WHEN (cl.proof_value ~~ 'data:%'::text) THEN 'base64'::text
            WHEN (cl.proof_type = ANY (ARRAY['momo_ref'::text, 'reference'::text, 'ref'::text])) THEN 'reference'::text
            WHEN (cl.proof_type = ANY (ARRAY['photo'::text, 'doc'::text, 'storage'::text])) THEN 'storage'::text
            ELSE 'reference'::text
        END AS preuve_mode_rendu
   FROM ((((((public.creneaux_conducteurs c
     JOIN public.affectations_vehicules av ON ((av.id = c.assignment_id)))
     JOIN public.vehicules v ON ((v.id = av.vehicle_id)))
     LEFT JOIN public.clotures_creneaux cl ON ((cl.shift_id = c.id)))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS dvir_pre_count,
            (array_agg(cj.overall_status ORDER BY cj.inspected_at DESC))[1] AS dvir_pre_statut
           FROM public.controles_journaliers cj
          WHERE ((cj.fleet_id = av.fleet_id) AND (cj.vehicle_id = av.vehicle_id) AND (cj.inspected_by = av.driver_user_id) AND (cj.inspection_type = 'pre_trip'::text) AND (cj.inspected_at >= date_trunc('day'::text, c.started_at)) AND (cj.inspected_at < (date_trunc('day'::text, c.started_at) + '1 day'::interval)))) dvir_pre ON (true))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS dvir_post_count,
            (array_agg(cj.overall_status ORDER BY cj.inspected_at DESC))[1] AS dvir_post_statut
           FROM public.controles_journaliers cj
          WHERE ((cj.fleet_id = av.fleet_id) AND (cj.vehicle_id = av.vehicle_id) AND (cj.inspected_by = av.driver_user_id) AND (cj.inspection_type = 'post_trip'::text) AND (cj.inspected_at >= date_trunc('day'::text, c.started_at)) AND (cj.inspected_at < (date_trunc('day'::text, c.started_at) + '1 day'::interval)))) dvir_post ON (true))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS carburant_saisies,
            COALESCE(sum(j.liters), (0)::numeric) AS carburant_litres_total,
            (COALESCE(sum(j.amount_xof), (0)::bigint))::integer AS carburant_xof_total
           FROM public.journal_carburant j
          WHERE ((j.fleet_id = av.fleet_id) AND (j.vehicle_id = av.vehicle_id) AND (j.driver_user_id = av.driver_user_id) AND (j.purchased_at >= c.started_at) AND (j.purchased_at <= COALESCE(c.ended_at, now())))) fuel ON (true))
  WHERE (((c.status = 'open'::text) OR (cl.status = ANY (ARRAY['pending'::public.closure_status, 'rejected'::public.closure_status]))) AND ((COALESCE(auth.role(), ''::text) = 'service_role'::text) OR (EXISTS ( SELECT 1
           FROM public.flotte_adhesions fa
          WHERE ((fa.fleet_id = av.fleet_id) AND (fa.user_id = auth.uid()) AND (fa.is_active = true) AND (((fa.role)::text = ANY (ARRAY['organizer'::text, 'manager'::text, 'mechanic'::text])) OR (av.driver_user_id = auth.uid())))))));


create or replace view "public"."v_geofences_with_stats" as  SELECT g.id,
    g.fleet_id,
    g.name,
    g.geofence_type,
    g.center_lat,
    g.center_lng,
    g.radius_m,
    g.polygon_geojson,
    g.alert_on_enter,
    g.alert_on_exit,
    g.description,
    g.is_active,
    g.created_at,
    g.updated_at,
    COALESCE(ev.event_count, (0)::bigint) AS event_count_7d,
    ev.last_event_at
   FROM (public.geofences g
     LEFT JOIN LATERAL ( SELECT count(*) AS event_count,
            max(e.occurred_at) AS last_event_at
           FROM public.geofence_events e
          WHERE ((e.geofence_id = g.id) AND (e.occurred_at >= (now() - '7 days'::interval)))) ev ON (true));


create or replace view "public"."v_kpis_flotte" as  SELECT f.id AS fleet_id,
    COALESCE(shift_stats.creneaux_ouverts, 0) AS creneaux_ouverts,
    COALESCE(shift_stats.creneaux_fermes, 0) AS creneaux_fermes,
    COALESCE(closure_stats.revenus_valides_xaf, 0) AS revenus_valides_xaf,
    COALESCE(closure_stats.revenus_en_attente_xaf, 0) AS revenus_en_attente_xaf,
    COALESCE(closure_stats.revenus_rejetes_xaf, 0) AS revenus_rejetes_xaf,
    COALESCE(closure_stats.ecart_total_xaf, 0) AS ecart_total_xaf,
    COALESCE(closure_stats.clotures_pending, 0) AS clotures_pending,
    COALESCE(closure_stats.clotures_rejetees, 0) AS clotures_rejetees,
    COALESCE(closure_stats.clotures_sans_preuve, 0) AS clotures_sans_preuve,
    COALESCE(vehicle_stats.vehicules_actifs, 0) AS vehicules_actifs
   FROM (((public.flottes f
     LEFT JOIN LATERAL ( SELECT (count(*) FILTER (WHERE (c.status = 'open'::text)))::integer AS creneaux_ouverts,
            (count(*) FILTER (WHERE (c.status = 'closed'::text)))::integer AS creneaux_fermes
           FROM (public.creneaux_conducteurs c
             JOIN public.affectations_vehicules av ON ((av.id = c.assignment_id)))
          WHERE (av.fleet_id = f.id)) shift_stats ON (true))
     LEFT JOIN LATERAL ( SELECT (COALESCE(sum(cl.revenue_declared) FILTER (WHERE (cl.status = 'validated'::public.closure_status)), (0)::bigint))::integer AS revenus_valides_xaf,
            (COALESCE(sum(cl.revenue_declared) FILTER (WHERE (cl.status = 'pending'::public.closure_status)), (0)::bigint))::integer AS revenus_en_attente_xaf,
            (COALESCE(sum(cl.revenue_declared) FILTER (WHERE (cl.status = 'rejected'::public.closure_status)), (0)::bigint))::integer AS revenus_rejetes_xaf,
            (COALESCE(sum(cl.revenue_gap), (0)::bigint))::integer AS ecart_total_xaf,
            (count(*) FILTER (WHERE (cl.status = 'pending'::public.closure_status)))::integer AS clotures_pending,
            (count(*) FILTER (WHERE (cl.status = 'rejected'::public.closure_status)))::integer AS clotures_rejetees,
            (count(*) FILTER (WHERE ((cl.proof_value IS NULL) OR (btrim(cl.proof_value) = ''::text))))::integer AS clotures_sans_preuve
           FROM ((public.clotures_creneaux cl
             JOIN public.creneaux_conducteurs c ON ((c.id = cl.shift_id)))
             JOIN public.affectations_vehicules av ON ((av.id = c.assignment_id)))
          WHERE (av.fleet_id = f.id)) closure_stats ON (true))
     LEFT JOIN LATERAL ( SELECT (count(*) FILTER (WHERE (v.status = 'ok'::public.vehicle_status)))::integer AS vehicules_actifs
           FROM public.vehicules v
          WHERE (v.fleet_id = f.id)) vehicle_stats ON (true))
  WHERE ((COALESCE(auth.role(), ''::text) = 'service_role'::text) OR (EXISTS ( SELECT 1
           FROM public.flotte_adhesions fa
          WHERE ((fa.fleet_id = f.id) AND (fa.user_id = auth.uid()) AND (fa.is_active = true) AND ((fa.role)::text = ANY (ARRAY['organizer'::text, 'manager'::text, 'mechanic'::text]))))));


create or replace view "public"."v_retention_cohorts" as  WITH membres_org AS (
         SELECT f.org_id,
            fa.user_id,
            min(fa.created_at) AS first_join_at
           FROM (public.flotte_adhesions fa
             JOIN public.flottes f ON ((f.id = fa.fleet_id)))
          WHERE (fa.is_active = true)
          GROUP BY f.org_id, fa.user_id
        ), activite AS (
         SELECT mo.org_id,
            mo.user_id,
            c.started_at AS ts
           FROM ((membres_org mo
             JOIN public.affectations_vehicules a ON (((a.driver_user_id = mo.user_id) AND (a.fleet_id IN ( SELECT f.id
                   FROM public.flottes f
                  WHERE (f.org_id = mo.org_id))))))
             JOIN public.creneaux_conducteurs c ON ((c.assignment_id = a.id)))
          WHERE (c.started_at IS NOT NULL)
        UNION ALL
         SELECT mo.org_id,
            mo.user_id,
            cl_1.created_at AS ts
           FROM (((membres_org mo
             JOIN public.affectations_vehicules a ON (((a.driver_user_id = mo.user_id) AND (a.fleet_id IN ( SELECT f.id
                   FROM public.flottes f
                  WHERE (f.org_id = mo.org_id))))))
             JOIN public.creneaux_conducteurs c ON ((c.assignment_id = a.id)))
             JOIN public.clotures_creneaux cl_1 ON ((cl_1.shift_id = c.id)))
          WHERE (cl_1.created_at IS NOT NULL)
        ), cohorte AS (
         SELECT membres_org.org_id,
            membres_org.user_id,
            membres_org.first_join_at,
            (date_trunc('week'::text, (membres_org.first_join_at AT TIME ZONE 'UTC'::text)))::date AS cohort_week
           FROM membres_org
        ), cohorte_agg AS (
         SELECT c.org_id,
            c.cohort_week,
            count(*) AS cohort_size,
            count(*) FILTER (WHERE (EXISTS ( SELECT 1
                   FROM activite act
                  WHERE ((act.org_id = c.org_id) AND (act.user_id = c.user_id) AND (act.ts >= (c.first_join_at + '7 days'::interval)))))) AS retained_d7,
            count(*) FILTER (WHERE (EXISTS ( SELECT 1
                   FROM activite act
                  WHERE ((act.org_id = c.org_id) AND (act.user_id = c.user_id) AND (act.ts >= (c.first_join_at + '30 days'::interval)))))) AS retained_d30
           FROM cohorte c
          GROUP BY c.org_id, c.cohort_week
        ), fleets_per_cohort AS (
         SELECT c.org_id,
            c.cohort_week,
            count(DISTINCT fa.fleet_id) AS fleets_in_cohort
           FROM ((cohorte c
             JOIN public.flotte_adhesions fa ON (((fa.user_id = c.user_id) AND (fa.is_active = true))))
             JOIN public.flottes f ON (((f.id = fa.fleet_id) AND (f.org_id = c.org_id))))
          GROUP BY c.org_id, c.cohort_week
        ), clos_agg AS (
         SELECT ch.org_id,
            ch.cohort_week,
            count(*) FILTER (WHERE (cl_1.created_at <= (ch.first_join_at + '7 days'::interval))) AS total_closures_d7,
            count(*) FILTER (WHERE (cl_1.created_at <= (ch.first_join_at + '30 days'::interval))) AS total_closures_d30
           FROM ((((cohorte ch
             JOIN public.affectations_vehicules av ON ((av.driver_user_id = ch.user_id)))
             JOIN public.flottes fl ON (((fl.id = av.fleet_id) AND (fl.org_id = ch.org_id))))
             JOIN public.creneaux_conducteurs cr ON ((cr.assignment_id = av.id)))
             JOIN public.clotures_creneaux cl_1 ON ((cl_1.shift_id = cr.id)))
          GROUP BY ch.org_id, ch.cohort_week
        )
 SELECT ca.org_id,
    ca.cohort_week,
    ca.cohort_size,
    ca.retained_d7,
    ca.retained_d30,
    to_char(round(((100.0 * (ca.retained_d7)::numeric) / (NULLIF(ca.cohort_size, 0))::numeric), 2), 'FM999999990.00'::text) AS pct_d7,
    to_char(round(((100.0 * (ca.retained_d30)::numeric) / (NULLIF(ca.cohort_size, 0))::numeric), 2), 'FM999999990.00'::text) AS pct_d30,
    to_char(COALESCE(cl.total_closures_d7, (0)::bigint), 'FM999999990'::text) AS total_closures_d7,
    to_char(COALESCE(cl.total_closures_d30, (0)::bigint), 'FM999999990'::text) AS total_closures_d30,
    COALESCE(fc.fleets_in_cohort, (0)::bigint) AS fleets_in_cohort
   FROM ((cohorte_agg ca
     LEFT JOIN fleets_per_cohort fc ON (((fc.org_id = ca.org_id) AND (fc.cohort_week = ca.cohort_week))))
     LEFT JOIN clos_agg cl ON (((cl.org_id = ca.org_id) AND (cl.cohort_week = ca.cohort_week))));


create or replace view "public"."v_retention_kpis" as  WITH membres_org AS (
         SELECT f.org_id,
            fa.user_id,
            min(fa.created_at) AS first_join_at
           FROM (public.flotte_adhesions fa
             JOIN public.flottes f ON ((f.id = fa.fleet_id)))
          WHERE (fa.is_active = true)
          GROUP BY f.org_id, fa.user_id
        ), activite AS (
         SELECT mo.org_id,
            mo.user_id,
            c.started_at AS ts
           FROM ((membres_org mo
             JOIN public.affectations_vehicules a ON (((a.driver_user_id = mo.user_id) AND (a.fleet_id IN ( SELECT f.id
                   FROM public.flottes f
                  WHERE (f.org_id = mo.org_id))))))
             JOIN public.creneaux_conducteurs c ON ((c.assignment_id = a.id)))
          WHERE (c.started_at IS NOT NULL)
        UNION ALL
         SELECT mo.org_id,
            mo.user_id,
            cl.created_at AS ts
           FROM (((membres_org mo
             JOIN public.affectations_vehicules a ON (((a.driver_user_id = mo.user_id) AND (a.fleet_id IN ( SELECT f.id
                   FROM public.flottes f
                  WHERE (f.org_id = mo.org_id))))))
             JOIN public.creneaux_conducteurs c ON ((c.assignment_id = a.id)))
             JOIN public.clotures_creneaux cl ON ((cl.shift_id = c.id)))
          WHERE (cl.created_at IS NOT NULL)
        ), premiere_activite AS (
         SELECT activite.org_id,
            activite.user_id,
            min(activite.ts) AS first_activity_at
           FROM activite
          GROUP BY activite.org_id, activite.user_id
        ), eligible AS (
         SELECT mo.org_id,
            mo.user_id,
            mo.first_join_at,
            (mo.first_join_at <= (now() - '7 days'::interval)) AS ok_d7,
            (mo.first_join_at <= (now() - '30 days'::interval)) AS ok_d30
           FROM membres_org mo
        ), ret_d7 AS (
         SELECT e.org_id,
            e.user_id
           FROM eligible e
          WHERE (e.ok_d7 AND (EXISTS ( SELECT 1
                   FROM activite act
                  WHERE ((act.org_id = e.org_id) AND (act.user_id = e.user_id) AND (act.ts >= (e.first_join_at + '7 days'::interval))))))
        ), ret_d30 AS (
         SELECT e.org_id,
            e.user_id
           FROM eligible e
          WHERE (e.ok_d30 AND (EXISTS ( SELECT 1
                   FROM activite act
                  WHERE ((act.org_id = e.org_id) AND (act.user_id = e.user_id) AND (act.ts >= (e.first_join_at + '30 days'::interval))))))
        ), rolling AS (
         SELECT DISTINCT activite.org_id,
            activite.user_id
           FROM activite
          WHERE (activite.ts >= (now() - '7 days'::interval))
        ), rolling30 AS (
         SELECT DISTINCT activite.org_id,
            activite.user_id
           FROM activite
          WHERE (activite.ts >= (now() - '30 days'::interval))
        ), nouveaux AS (
         SELECT membres_org.org_id,
            count(*) AS n
           FROM membres_org
          WHERE (membres_org.first_join_at >= (now() - '7 days'::interval))
          GROUP BY membres_org.org_id
        ), jamais AS (
         SELECT mo.org_id,
            mo.user_id
           FROM (membres_org mo
             LEFT JOIN premiere_activite p ON (((p.org_id = mo.org_id) AND (p.user_id = mo.user_id))))
          WHERE (p.first_activity_at IS NULL)
        )
 SELECT o.id AS org_id,
    ( SELECT count(*) AS count
           FROM membres_org m
          WHERE (m.org_id = o.id)) AS total_members,
    COALESCE(n.n, (0)::bigint) AS new_d7,
    ( SELECT count(*) AS count
           FROM ret_d7 r
          WHERE (r.org_id = o.id)) AS retained_ever_d7,
    ( SELECT count(*) AS count
           FROM ret_d30 r
          WHERE (r.org_id = o.id)) AS retained_ever_d30,
    ( SELECT count(*) AS count
           FROM rolling r
          WHERE (r.org_id = o.id)) AS active_rolling_7d,
    ( SELECT count(*) AS count
           FROM rolling30 r
          WHERE (r.org_id = o.id)) AS active_rolling_30d,
    ( SELECT count(*) AS count
           FROM jamais j
          WHERE (j.org_id = o.id)) AS never_activated,
    ( SELECT count(*) AS count
           FROM eligible e
          WHERE ((e.org_id = o.id) AND e.ok_d7)) AS eligible_d7,
    ( SELECT count(*) AS count
           FROM eligible e
          WHERE ((e.org_id = o.id) AND e.ok_d30)) AS eligible_d30
   FROM (public.organisations o
     LEFT JOIN nouveaux n ON ((n.org_id = o.id)));


create or replace view "public"."vehicle_failure_features_v1" as  WITH incidents_30d AS (
         SELECT i_1.vehicle_id,
            (count(*))::integer AS incident_count_30d,
            (count(*) FILTER (WHERE (i_1.severity = ANY (ARRAY['high'::text, 'critical'::text]))))::integer AS critical_incident_count_30d
           FROM public.incidents i_1
          WHERE (i_1.created_at >= (now() - '30 days'::interval))
          GROUP BY i_1.vehicle_id
        ), maintenance_30d AS (
         SELECT tm.vehicle_id,
            (count(*))::integer AS maintenance_jobs_30d
           FROM public.travaux_maintenance tm
          WHERE (tm.created_at >= (now() - '30 days'::interval))
          GROUP BY tm.vehicle_id
        ), maintenance_open AS (
         SELECT tm.vehicle_id,
            (count(*) FILTER (WHERE (tm.status = ANY (ARRAY['queued'::text, 'in_progress'::text]))))::integer AS open_maintenance_jobs
           FROM public.travaux_maintenance tm
          GROUP BY tm.vehicle_id
        ), fuel_base AS (
         SELECT jc.vehicle_id,
            jc.purchased_at,
            jc.amount_xof,
            jc.liters,
                CASE
                    WHEN (jc.liters > (0)::numeric) THEN ((jc.amount_xof)::numeric / (jc.liters)::numeric)
                    ELSE NULL::numeric
                END AS price_per_liter
           FROM public.journal_carburant jc
          WHERE (jc.purchased_at >= (now() - '30 days'::interval))
        ), fuel_metrics AS (
         SELECT fb.vehicle_id,
            (count(*))::integer AS fuel_entries_30d,
            avg(fb.price_per_liter) AS avg_price_per_liter_30d,
            (count(*) FILTER (WHERE (fb.price_per_liter > ( SELECT (avg(fb2.price_per_liter) * 1.20)
                   FROM fuel_base fb2
                  WHERE (fb2.vehicle_id = fb.vehicle_id)))))::integer AS fuel_anomaly_events_30d
           FROM fuel_base fb
          GROUP BY fb.vehicle_id
        )
 SELECT v.fleet_id,
    v.id AS vehicle_id,
    v.status AS vehicle_status,
    COALESCE(i.incident_count_30d, 0) AS incident_count_30d,
    COALESCE(i.critical_incident_count_30d, 0) AS critical_incident_count_30d,
    COALESCE(m.maintenance_jobs_30d, 0) AS maintenance_jobs_30d,
    COALESCE(mo.open_maintenance_jobs, 0) AS open_maintenance_jobs,
    COALESCE(f.fuel_entries_30d, 0) AS fuel_entries_30d,
    COALESCE(f.fuel_anomaly_events_30d, 0) AS fuel_anomaly_events_30d,
    (COALESCE(f.avg_price_per_liter_30d, (0)::numeric))::numeric(10,2) AS avg_price_per_liter_30d
   FROM ((((public.vehicules v
     LEFT JOIN incidents_30d i ON ((i.vehicle_id = v.id)))
     LEFT JOIN maintenance_30d m ON ((m.vehicle_id = v.id)))
     LEFT JOIN maintenance_open mo ON ((mo.vehicle_id = v.id)))
     LEFT JOIN fuel_metrics f ON ((f.vehicle_id = v.id)));


grant select on table "public"."abonnements" to "anon";

grant select on table "public"."abonnements" to "authenticated";

grant delete on table "public"."admin_audit_logs" to "anon";

grant insert on table "public"."admin_audit_logs" to "anon";

grant select on table "public"."admin_audit_logs" to "anon";

grant update on table "public"."admin_audit_logs" to "anon";

grant delete on table "public"."admin_audit_logs" to "authenticated";

grant insert on table "public"."admin_audit_logs" to "authenticated";

grant update on table "public"."admin_audit_logs" to "authenticated";

grant delete on table "public"."admin_audit_logs" to "service_role";

grant insert on table "public"."admin_audit_logs" to "service_role";

grant select on table "public"."admin_audit_logs" to "service_role";

grant update on table "public"."admin_audit_logs" to "service_role";

grant delete on table "public"."admin_profiles" to "authenticated";

grant insert on table "public"."admin_profiles" to "authenticated";

grant select on table "public"."admin_profiles" to "authenticated";

grant update on table "public"."admin_profiles" to "authenticated";

grant delete on table "public"."admin_profiles" to "service_role";

grant delete on table "public"."affectations_vehicules" to "anon";

grant insert on table "public"."affectations_vehicules" to "anon";

grant select on table "public"."affectations_vehicules" to "anon";

grant update on table "public"."affectations_vehicules" to "anon";

grant delete on table "public"."affectations_vehicules" to "authenticated";

grant insert on table "public"."affectations_vehicules" to "authenticated";

grant select on table "public"."affectations_vehicules" to "authenticated";

grant update on table "public"."affectations_vehicules" to "authenticated";

grant delete on table "public"."affectations_vehicules" to "service_role";

grant insert on table "public"."affectations_vehicules" to "service_role";

grant select on table "public"."affectations_vehicules" to "service_role";

grant update on table "public"."affectations_vehicules" to "service_role";

grant delete on table "public"."alert_comments" to "anon";

grant insert on table "public"."alert_comments" to "anon";

grant select on table "public"."alert_comments" to "anon";

grant update on table "public"."alert_comments" to "anon";

grant delete on table "public"."alert_comments" to "authenticated";

grant update on table "public"."alert_comments" to "authenticated";

grant delete on table "public"."alert_comments" to "service_role";

grant insert on table "public"."alert_comments" to "service_role";

grant select on table "public"."alert_comments" to "service_role";

grant update on table "public"."alert_comments" to "service_role";

grant delete on table "public"."alertes_automatiques" to "anon";

grant insert on table "public"."alertes_automatiques" to "anon";

grant select on table "public"."alertes_automatiques" to "anon";

grant update on table "public"."alertes_automatiques" to "anon";

grant delete on table "public"."audit_logs" to "anon";

grant insert on table "public"."audit_logs" to "anon";

grant select on table "public"."audit_logs" to "anon";

grant update on table "public"."audit_logs" to "anon";

grant delete on table "public"."audit_logs" to "authenticated";

grant insert on table "public"."audit_logs" to "authenticated";

grant update on table "public"."audit_logs" to "authenticated";

grant delete on table "public"."audit_logs" to "service_role";

grant insert on table "public"."audit_logs" to "service_role";

grant select on table "public"."audit_logs" to "service_role";

grant update on table "public"."audit_logs" to "service_role";

grant delete on table "public"."clotures_creneaux" to "anon";

grant insert on table "public"."clotures_creneaux" to "anon";

grant select on table "public"."clotures_creneaux" to "anon";

grant update on table "public"."clotures_creneaux" to "anon";

grant delete on table "public"."clotures_creneaux" to "authenticated";

grant insert on table "public"."clotures_creneaux" to "authenticated";

grant select on table "public"."clotures_creneaux" to "authenticated";

grant update on table "public"."clotures_creneaux" to "authenticated";

grant delete on table "public"."clotures_creneaux" to "service_role";

grant insert on table "public"."clotures_creneaux" to "service_role";

grant select on table "public"."clotures_creneaux" to "service_role";

grant update on table "public"."clotures_creneaux" to "service_role";

grant delete on table "public"."controles_journaliers" to "anon";

grant insert on table "public"."controles_journaliers" to "anon";

grant select on table "public"."controles_journaliers" to "anon";

grant update on table "public"."controles_journaliers" to "anon";

grant delete on table "public"."creneaux_conducteurs" to "anon";

grant insert on table "public"."creneaux_conducteurs" to "anon";

grant select on table "public"."creneaux_conducteurs" to "anon";

grant update on table "public"."creneaux_conducteurs" to "anon";

grant delete on table "public"."creneaux_conducteurs" to "authenticated";

grant insert on table "public"."creneaux_conducteurs" to "authenticated";

grant select on table "public"."creneaux_conducteurs" to "authenticated";

grant update on table "public"."creneaux_conducteurs" to "authenticated";

grant delete on table "public"."creneaux_conducteurs" to "service_role";

grant insert on table "public"."creneaux_conducteurs" to "service_role";

grant select on table "public"."creneaux_conducteurs" to "service_role";

grant update on table "public"."creneaux_conducteurs" to "service_role";

grant delete on table "public"."dashcam_alerts" to "anon";

grant insert on table "public"."dashcam_alerts" to "anon";

grant select on table "public"."dashcam_alerts" to "anon";

grant update on table "public"."dashcam_alerts" to "anon";

grant delete on table "public"."dashcam_alerts" to "authenticated";

grant insert on table "public"."dashcam_alerts" to "authenticated";

grant delete on table "public"."dashcam_alerts" to "service_role";

grant delete on table "public"."dashcams" to "anon";

grant insert on table "public"."dashcams" to "anon";

grant select on table "public"."dashcams" to "anon";

grant update on table "public"."dashcams" to "anon";

grant delete on table "public"."dashcams" to "authenticated";

grant delete on table "public"."dashcams" to "service_role";

grant delete on table "public"."demo_access_policies" to "anon";

grant insert on table "public"."demo_access_policies" to "anon";

grant select on table "public"."demo_access_policies" to "anon";

grant update on table "public"."demo_access_policies" to "anon";

grant delete on table "public"."demo_access_policies" to "authenticated";

grant insert on table "public"."demo_access_policies" to "authenticated";

grant select on table "public"."demo_access_policies" to "authenticated";

grant update on table "public"."demo_access_policies" to "authenticated";

grant delete on table "public"."demo_access_policies" to "service_role";

grant insert on table "public"."demo_access_policies" to "service_role";

grant update on table "public"."demo_access_policies" to "service_role";

grant delete on table "public"."demo_audit_logs" to "anon";

grant insert on table "public"."demo_audit_logs" to "anon";

grant select on table "public"."demo_audit_logs" to "anon";

grant update on table "public"."demo_audit_logs" to "anon";

grant delete on table "public"."demo_audit_logs" to "authenticated";

grant select on table "public"."demo_audit_logs" to "authenticated";

grant update on table "public"."demo_audit_logs" to "authenticated";

grant delete on table "public"."demo_audit_logs" to "service_role";

grant update on table "public"."demo_audit_logs" to "service_role";

grant delete on table "public"."demo_expiration_log" to "anon";

grant insert on table "public"."demo_expiration_log" to "anon";

grant select on table "public"."demo_expiration_log" to "anon";

grant update on table "public"."demo_expiration_log" to "anon";

grant delete on table "public"."demo_expiration_log" to "authenticated";

grant insert on table "public"."demo_expiration_log" to "authenticated";

grant select on table "public"."demo_expiration_log" to "authenticated";

grant update on table "public"."demo_expiration_log" to "authenticated";

grant delete on table "public"."demo_expiration_log" to "service_role";

grant insert on table "public"."demo_expiration_log" to "service_role";

grant select on table "public"."demo_expiration_log" to "service_role";

grant update on table "public"."demo_expiration_log" to "service_role";

grant delete on table "public"."demo_magic_links" to "anon";

grant insert on table "public"."demo_magic_links" to "anon";

grant select on table "public"."demo_magic_links" to "anon";

grant update on table "public"."demo_magic_links" to "anon";

grant delete on table "public"."demo_magic_links" to "authenticated";

grant insert on table "public"."demo_magic_links" to "authenticated";

grant select on table "public"."demo_magic_links" to "authenticated";

grant update on table "public"."demo_magic_links" to "authenticated";

grant delete on table "public"."demo_magic_links" to "service_role";

grant insert on table "public"."demo_magic_links" to "service_role";

grant select on table "public"."demo_magic_links" to "service_role";

grant update on table "public"."demo_magic_links" to "service_role";

grant delete on table "public"."demo_onboarding_logs" to "anon";

grant insert on table "public"."demo_onboarding_logs" to "anon";

grant select on table "public"."demo_onboarding_logs" to "anon";

grant update on table "public"."demo_onboarding_logs" to "anon";

grant delete on table "public"."demo_onboarding_logs" to "authenticated";

grant select on table "public"."demo_onboarding_logs" to "authenticated";

grant update on table "public"."demo_onboarding_logs" to "authenticated";

grant delete on table "public"."demo_onboarding_logs" to "service_role";

grant insert on table "public"."demo_onboarding_logs" to "service_role";

grant select on table "public"."demo_onboarding_logs" to "service_role";

grant update on table "public"."demo_onboarding_logs" to "service_role";

grant delete on table "public"."demo_profiles" to "anon";

grant insert on table "public"."demo_profiles" to "anon";

grant select on table "public"."demo_profiles" to "anon";

grant update on table "public"."demo_profiles" to "anon";

grant delete on table "public"."demo_profiles" to "authenticated";

grant insert on table "public"."demo_profiles" to "authenticated";

grant update on table "public"."demo_profiles" to "authenticated";

grant delete on table "public"."demo_profiles" to "service_role";

grant delete on table "public"."demo_request_duplicate_archive" to "service_role";

grant insert on table "public"."demo_request_duplicate_archive" to "service_role";

grant select on table "public"."demo_request_duplicate_archive" to "service_role";

grant update on table "public"."demo_request_duplicate_archive" to "service_role";

grant delete on table "public"."demo_request_settings" to "anon";

grant insert on table "public"."demo_request_settings" to "anon";

grant select on table "public"."demo_request_settings" to "anon";

grant update on table "public"."demo_request_settings" to "anon";

grant delete on table "public"."demo_request_settings" to "authenticated";

grant insert on table "public"."demo_request_settings" to "authenticated";

grant select on table "public"."demo_request_settings" to "authenticated";

grant update on table "public"."demo_request_settings" to "authenticated";

grant delete on table "public"."demo_request_settings" to "service_role";

grant insert on table "public"."demo_request_settings" to "service_role";

grant select on table "public"."demo_request_settings" to "service_role";

grant update on table "public"."demo_request_settings" to "service_role";

grant delete on table "public"."demo_requests" to "anon";

grant select on table "public"."demo_requests" to "anon";

grant update on table "public"."demo_requests" to "anon";

grant delete on table "public"."demo_requests" to "authenticated";

grant select on table "public"."demo_requests" to "authenticated";

grant update on table "public"."demo_requests" to "authenticated";

grant delete on table "public"."demo_requests" to "service_role";

grant insert on table "public"."demo_requests" to "service_role";

grant select on table "public"."demo_requests" to "service_role";

grant update on table "public"."demo_requests" to "service_role";

grant delete on table "public"."demo_sessions" to "anon";

grant insert on table "public"."demo_sessions" to "anon";

grant select on table "public"."demo_sessions" to "anon";

grant update on table "public"."demo_sessions" to "anon";

grant delete on table "public"."demo_sessions" to "authenticated";

grant delete on table "public"."demo_sessions" to "service_role";

grant delete on table "public"."driver_licenses" to "anon";

grant insert on table "public"."driver_licenses" to "anon";

grant select on table "public"."driver_licenses" to "anon";

grant update on table "public"."driver_licenses" to "anon";

grant delete on table "public"."driver_licenses" to "service_role";

grant insert on table "public"."driver_licenses" to "service_role";

grant select on table "public"."driver_licenses" to "service_role";

grant update on table "public"."driver_licenses" to "service_role";

grant select on table "public"."droits_vehicules" to "anon";

grant select on table "public"."droits_vehicules" to "authenticated";

grant delete on table "public"."failure_predictions" to "anon";

grant insert on table "public"."failure_predictions" to "anon";

grant select on table "public"."failure_predictions" to "anon";

grant update on table "public"."failure_predictions" to "anon";

grant delete on table "public"."failure_predictions" to "authenticated";

grant insert on table "public"."failure_predictions" to "authenticated";

grant select on table "public"."failure_predictions" to "authenticated";

grant update on table "public"."failure_predictions" to "authenticated";

grant delete on table "public"."failure_predictions" to "service_role";

grant insert on table "public"."failure_predictions" to "service_role";

grant select on table "public"."failure_predictions" to "service_role";

grant update on table "public"."failure_predictions" to "service_role";

grant delete on table "public"."faq_questions" to "anon";

grant insert on table "public"."faq_questions" to "anon";

grant select on table "public"."faq_questions" to "anon";

grant update on table "public"."faq_questions" to "anon";

grant delete on table "public"."faq_questions" to "authenticated";

grant insert on table "public"."faq_questions" to "authenticated";

grant select on table "public"."faq_questions" to "authenticated";

grant update on table "public"."faq_questions" to "authenticated";

grant delete on table "public"."faq_questions" to "service_role";

grant insert on table "public"."faq_questions" to "service_role";

grant select on table "public"."faq_questions" to "service_role";

grant update on table "public"."faq_questions" to "service_role";

grant delete on table "public"."feedback" to "anon";

grant insert on table "public"."feedback" to "anon";

grant select on table "public"."feedback" to "anon";

grant update on table "public"."feedback" to "anon";

grant delete on table "public"."feedback" to "authenticated";

grant insert on table "public"."feedback" to "authenticated";

grant select on table "public"."feedback" to "authenticated";

grant update on table "public"."feedback" to "authenticated";

grant delete on table "public"."feedback" to "service_role";

grant insert on table "public"."feedback" to "service_role";

grant select on table "public"."feedback" to "service_role";

grant update on table "public"."feedback" to "service_role";

grant delete on table "public"."fleet_role_change_requests" to "authenticated";

grant update on table "public"."fleet_role_change_requests" to "authenticated";

grant delete on table "public"."fleet_role_change_requests" to "service_role";

grant insert on table "public"."fleet_role_change_requests" to "service_role";

grant select on table "public"."fleet_role_change_requests" to "service_role";

grant update on table "public"."fleet_role_change_requests" to "service_role";

grant delete on table "public"."flotte_adhesions" to "anon";

grant insert on table "public"."flotte_adhesions" to "anon";

grant select on table "public"."flotte_adhesions" to "anon";

grant update on table "public"."flotte_adhesions" to "anon";

grant delete on table "public"."flotte_adhesions" to "authenticated";

grant insert on table "public"."flotte_adhesions" to "authenticated";

grant update on table "public"."flotte_adhesions" to "authenticated";

grant delete on table "public"."flotte_invitations" to "anon";

grant insert on table "public"."flotte_invitations" to "anon";

grant select on table "public"."flotte_invitations" to "anon";

grant update on table "public"."flotte_invitations" to "anon";

grant delete on table "public"."flotte_invitations" to "authenticated";

grant insert on table "public"."flotte_invitations" to "authenticated";

grant select on table "public"."flotte_invitations" to "authenticated";

grant update on table "public"."flotte_invitations" to "authenticated";

grant delete on table "public"."flotte_invitations" to "service_role";

grant insert on table "public"."flotte_invitations" to "service_role";

grant select on table "public"."flotte_invitations" to "service_role";

grant update on table "public"."flotte_invitations" to "service_role";

grant delete on table "public"."flottes" to "anon";

grant insert on table "public"."flottes" to "anon";

grant select on table "public"."flottes" to "anon";

grant update on table "public"."flottes" to "anon";

grant delete on table "public"."flottes" to "authenticated";

grant insert on table "public"."flottes" to "authenticated";

grant update on table "public"."flottes" to "authenticated";

grant delete on table "public"."funnel_events" to "anon";

grant insert on table "public"."funnel_events" to "anon";

grant select on table "public"."funnel_events" to "anon";

grant update on table "public"."funnel_events" to "anon";

grant delete on table "public"."funnel_events" to "authenticated";

grant insert on table "public"."funnel_events" to "authenticated";

grant select on table "public"."funnel_events" to "authenticated";

grant update on table "public"."funnel_events" to "authenticated";

grant delete on table "public"."funnel_events" to "service_role";

grant insert on table "public"."funnel_events" to "service_role";

grant select on table "public"."funnel_events" to "service_role";

grant update on table "public"."funnel_events" to "service_role";

grant delete on table "public"."geofence_events" to "anon";

grant insert on table "public"."geofence_events" to "anon";

grant select on table "public"."geofence_events" to "anon";

grant update on table "public"."geofence_events" to "anon";

grant delete on table "public"."geofence_events" to "authenticated";

grant insert on table "public"."geofence_events" to "authenticated";

grant update on table "public"."geofence_events" to "authenticated";

grant delete on table "public"."geofence_events" to "service_role";

grant insert on table "public"."geofence_events" to "service_role";

grant select on table "public"."geofence_events" to "service_role";

grant update on table "public"."geofence_events" to "service_role";

grant delete on table "public"."geofence_vehicle_states" to "anon";

grant insert on table "public"."geofence_vehicle_states" to "anon";

grant select on table "public"."geofence_vehicle_states" to "anon";

grant update on table "public"."geofence_vehicle_states" to "anon";

grant delete on table "public"."geofence_vehicle_states" to "authenticated";

grant insert on table "public"."geofence_vehicle_states" to "authenticated";

grant update on table "public"."geofence_vehicle_states" to "authenticated";

grant delete on table "public"."geofence_vehicle_states" to "service_role";

grant insert on table "public"."geofence_vehicle_states" to "service_role";

grant select on table "public"."geofence_vehicle_states" to "service_role";

grant update on table "public"."geofence_vehicle_states" to "service_role";

grant delete on table "public"."geofences" to "anon";

grant insert on table "public"."geofences" to "anon";

grant select on table "public"."geofences" to "anon";

grant update on table "public"."geofences" to "anon";

grant delete on table "public"."geofences" to "service_role";

grant insert on table "public"."geofences" to "service_role";

grant select on table "public"."geofences" to "service_role";

grant update on table "public"."geofences" to "service_role";

grant delete on table "public"."gps_devices" to "anon";

grant insert on table "public"."gps_devices" to "anon";

grant select on table "public"."gps_devices" to "anon";

grant update on table "public"."gps_devices" to "anon";

grant update on table "public"."gps_gateway_nonces" to "service_role";

grant delete on table "public"."gps_ingest_logs" to "anon";

grant insert on table "public"."gps_ingest_logs" to "anon";

grant select on table "public"."gps_ingest_logs" to "anon";

grant update on table "public"."gps_ingest_logs" to "anon";

grant delete on table "public"."gps_ingest_logs" to "authenticated";

grant insert on table "public"."gps_ingest_logs" to "authenticated";

grant update on table "public"."gps_ingest_logs" to "authenticated";

grant delete on table "public"."help_article_views" to "anon";

grant select on table "public"."help_article_views" to "anon";

grant update on table "public"."help_article_views" to "anon";

grant delete on table "public"."help_article_views" to "authenticated";

grant update on table "public"."help_article_views" to "authenticated";

grant delete on table "public"."help_article_views" to "service_role";

grant insert on table "public"."help_article_views" to "service_role";

grant select on table "public"."help_article_views" to "service_role";

grant update on table "public"."help_article_views" to "service_role";

grant delete on table "public"."help_articles" to "anon";

grant insert on table "public"."help_articles" to "anon";

grant update on table "public"."help_articles" to "anon";

grant delete on table "public"."help_articles" to "service_role";

grant insert on table "public"."help_articles" to "service_role";

grant select on table "public"."help_articles" to "service_role";

grant update on table "public"."help_articles" to "service_role";

grant delete on table "public"."help_search_events" to "anon";

grant select on table "public"."help_search_events" to "anon";

grant update on table "public"."help_search_events" to "anon";

grant delete on table "public"."help_search_events" to "authenticated";

grant update on table "public"."help_search_events" to "authenticated";

grant delete on table "public"."help_search_events" to "service_role";

grant insert on table "public"."help_search_events" to "service_role";

grant select on table "public"."help_search_events" to "service_role";

grant update on table "public"."help_search_events" to "service_role";

grant delete on table "public"."incidents" to "anon";

grant insert on table "public"."incidents" to "anon";

grant select on table "public"."incidents" to "anon";

grant update on table "public"."incidents" to "anon";

grant delete on table "public"."incidents" to "authenticated";

grant insert on table "public"."incidents" to "authenticated";

grant select on table "public"."incidents" to "authenticated";

grant update on table "public"."incidents" to "authenticated";

grant delete on table "public"."incidents" to "service_role";

grant insert on table "public"."incidents" to "service_role";

grant select on table "public"."incidents" to "service_role";

grant update on table "public"."incidents" to "service_role";

grant delete on table "public"."jetons_qr" to "anon";

grant insert on table "public"."jetons_qr" to "anon";

grant select on table "public"."jetons_qr" to "anon";

grant update on table "public"."jetons_qr" to "anon";

grant delete on table "public"."jetons_qr" to "authenticated";

grant insert on table "public"."jetons_qr" to "authenticated";

grant select on table "public"."jetons_qr" to "authenticated";

grant update on table "public"."jetons_qr" to "authenticated";

grant delete on table "public"."journal_carburant" to "anon";

grant insert on table "public"."journal_carburant" to "anon";

grant select on table "public"."journal_carburant" to "anon";

grant update on table "public"."journal_carburant" to "anon";

grant delete on table "public"."journal_carburant" to "authenticated";

grant insert on table "public"."journal_carburant" to "authenticated";

grant select on table "public"."journal_carburant" to "authenticated";

grant update on table "public"."journal_carburant" to "authenticated";

grant delete on table "public"."journal_carburant" to "service_role";

grant insert on table "public"."journal_carburant" to "service_role";

grant select on table "public"."journal_carburant" to "service_role";

grant update on table "public"."journal_carburant" to "service_role";

grant delete on table "public"."listes_verification_maintenance" to "anon";

grant insert on table "public"."listes_verification_maintenance" to "anon";

grant select on table "public"."listes_verification_maintenance" to "anon";

grant update on table "public"."listes_verification_maintenance" to "anon";

grant delete on table "public"."listes_verification_maintenance" to "authenticated";

grant insert on table "public"."listes_verification_maintenance" to "authenticated";

grant select on table "public"."listes_verification_maintenance" to "authenticated";

grant update on table "public"."listes_verification_maintenance" to "authenticated";

grant delete on table "public"."listes_verification_maintenance" to "service_role";

grant insert on table "public"."listes_verification_maintenance" to "service_role";

grant select on table "public"."listes_verification_maintenance" to "service_role";

grant update on table "public"."listes_verification_maintenance" to "service_role";

grant delete on table "public"."notification_tokens" to "anon";

grant insert on table "public"."notification_tokens" to "anon";

grant select on table "public"."notification_tokens" to "anon";

grant update on table "public"."notification_tokens" to "anon";

grant delete on table "public"."notification_tokens" to "authenticated";

grant delete on table "public"."onboarding_progress" to "anon";

grant insert on table "public"."onboarding_progress" to "anon";

grant select on table "public"."onboarding_progress" to "anon";

grant update on table "public"."onboarding_progress" to "anon";

grant delete on table "public"."onboarding_progress" to "authenticated";

grant insert on table "public"."onboarding_progress" to "authenticated";

grant select on table "public"."onboarding_progress" to "authenticated";

grant update on table "public"."onboarding_progress" to "authenticated";

grant delete on table "public"."onboarding_progress" to "service_role";

grant insert on table "public"."onboarding_progress" to "service_role";

grant select on table "public"."onboarding_progress" to "service_role";

grant update on table "public"."onboarding_progress" to "service_role";

grant delete on table "public"."organisations" to "anon";

grant insert on table "public"."organisations" to "anon";

grant select on table "public"."organisations" to "anon";

grant update on table "public"."organisations" to "anon";

grant delete on table "public"."organisations" to "authenticated";

grant insert on table "public"."organisations" to "authenticated";

grant select on table "public"."organisations" to "authenticated";

grant update on table "public"."organisations" to "authenticated";

grant select on table "public"."paiements" to "anon";

grant select on table "public"."paiements" to "authenticated";

grant delete on table "public"."planning_creneaux" to "service_role";

grant insert on table "public"."planning_creneaux" to "service_role";

grant select on table "public"."planning_creneaux" to "service_role";

grant update on table "public"."planning_creneaux" to "service_role";

grant delete on table "public"."plans" to "anon";

grant insert on table "public"."plans" to "anon";

grant select on table "public"."plans" to "anon";

grant update on table "public"."plans" to "anon";

grant delete on table "public"."plans" to "authenticated";

grant insert on table "public"."plans" to "authenticated";

grant select on table "public"."plans" to "authenticated";

grant update on table "public"."plans" to "authenticated";

grant delete on table "public"."preuves_maintenance" to "anon";

grant insert on table "public"."preuves_maintenance" to "anon";

grant select on table "public"."preuves_maintenance" to "anon";

grant update on table "public"."preuves_maintenance" to "anon";

grant delete on table "public"."preuves_maintenance" to "authenticated";

grant insert on table "public"."preuves_maintenance" to "authenticated";

grant select on table "public"."preuves_maintenance" to "authenticated";

grant update on table "public"."preuves_maintenance" to "authenticated";

grant delete on table "public"."preuves_maintenance" to "service_role";

grant insert on table "public"."preuves_maintenance" to "service_role";

grant select on table "public"."preuves_maintenance" to "service_role";

grant update on table "public"."preuves_maintenance" to "service_role";

grant delete on table "public"."profils" to "anon";

grant insert on table "public"."profils" to "anon";

grant select on table "public"."profils" to "anon";

grant update on table "public"."profils" to "anon";

grant delete on table "public"."profils" to "authenticated";

grant insert on table "public"."profils" to "authenticated";

grant select on table "public"."profils" to "authenticated";

grant update on table "public"."profils" to "authenticated";

grant delete on table "public"."scheduled_report_runs" to "anon";

grant insert on table "public"."scheduled_report_runs" to "anon";

grant select on table "public"."scheduled_report_runs" to "anon";

grant update on table "public"."scheduled_report_runs" to "anon";

grant delete on table "public"."scheduled_report_runs" to "authenticated";

grant insert on table "public"."scheduled_report_runs" to "authenticated";

grant select on table "public"."scheduled_report_runs" to "authenticated";

grant update on table "public"."scheduled_report_runs" to "authenticated";

grant delete on table "public"."scheduled_report_runs" to "service_role";

grant insert on table "public"."scheduled_report_runs" to "service_role";

grant select on table "public"."scheduled_report_runs" to "service_role";

grant update on table "public"."scheduled_report_runs" to "service_role";

grant delete on table "public"."scheduled_reports" to "anon";

grant insert on table "public"."scheduled_reports" to "anon";

grant select on table "public"."scheduled_reports" to "anon";

grant update on table "public"."scheduled_reports" to "anon";

grant delete on table "public"."scheduled_reports" to "authenticated";

grant insert on table "public"."scheduled_reports" to "authenticated";

grant select on table "public"."scheduled_reports" to "authenticated";

grant update on table "public"."scheduled_reports" to "authenticated";

grant delete on table "public"."scheduled_reports" to "service_role";

grant insert on table "public"."scheduled_reports" to "service_role";

grant select on table "public"."scheduled_reports" to "service_role";

grant update on table "public"."scheduled_reports" to "service_role";

grant delete on table "public"."scores_conducteurs" to "anon";

grant insert on table "public"."scores_conducteurs" to "anon";

grant select on table "public"."scores_conducteurs" to "anon";

grant update on table "public"."scores_conducteurs" to "anon";

grant delete on table "public"."scores_conducteurs" to "authenticated";

grant insert on table "public"."scores_conducteurs" to "authenticated";

grant select on table "public"."scores_conducteurs" to "authenticated";

grant update on table "public"."scores_conducteurs" to "authenticated";

grant delete on table "public"."scores_conducteurs" to "service_role";

grant insert on table "public"."scores_conducteurs" to "service_role";

grant select on table "public"."scores_conducteurs" to "service_role";

grant update on table "public"."scores_conducteurs" to "service_role";

grant delete on table "public"."support_callbacks" to "anon";

grant insert on table "public"."support_callbacks" to "anon";

grant select on table "public"."support_callbacks" to "anon";

grant update on table "public"."support_callbacks" to "anon";

grant delete on table "public"."support_callbacks" to "authenticated";

grant update on table "public"."support_callbacks" to "authenticated";

grant delete on table "public"."support_callbacks" to "service_role";

grant insert on table "public"."support_callbacks" to "service_role";

grant select on table "public"."support_callbacks" to "service_role";

grant update on table "public"."support_callbacks" to "service_role";

grant delete on table "public"."support_tickets" to "anon";

grant insert on table "public"."support_tickets" to "anon";

grant select on table "public"."support_tickets" to "anon";

grant update on table "public"."support_tickets" to "anon";

grant delete on table "public"."support_tickets" to "authenticated";

grant update on table "public"."support_tickets" to "authenticated";

grant delete on table "public"."support_tickets" to "service_role";

grant insert on table "public"."support_tickets" to "service_role";

grant select on table "public"."support_tickets" to "service_role";

grant update on table "public"."support_tickets" to "service_role";

grant delete on table "public"."travaux_maintenance" to "anon";

grant insert on table "public"."travaux_maintenance" to "anon";

grant select on table "public"."travaux_maintenance" to "anon";

grant update on table "public"."travaux_maintenance" to "anon";

grant delete on table "public"."travaux_maintenance" to "authenticated";

grant insert on table "public"."travaux_maintenance" to "authenticated";

grant select on table "public"."travaux_maintenance" to "authenticated";

grant update on table "public"."travaux_maintenance" to "authenticated";

grant delete on table "public"."travaux_maintenance" to "service_role";

grant insert on table "public"."travaux_maintenance" to "service_role";

grant select on table "public"."travaux_maintenance" to "service_role";

grant update on table "public"."travaux_maintenance" to "service_role";

grant delete on table "public"."tutorial_categories" to "anon";

grant insert on table "public"."tutorial_categories" to "anon";

grant select on table "public"."tutorial_categories" to "anon";

grant update on table "public"."tutorial_categories" to "anon";

grant delete on table "public"."tutorial_categories" to "authenticated";

grant insert on table "public"."tutorial_categories" to "authenticated";

grant update on table "public"."tutorial_categories" to "authenticated";

grant delete on table "public"."tutorial_categories" to "service_role";

grant insert on table "public"."tutorial_categories" to "service_role";

grant select on table "public"."tutorial_categories" to "service_role";

grant update on table "public"."tutorial_categories" to "service_role";

grant delete on table "public"."tutorial_favorites" to "anon";

grant insert on table "public"."tutorial_favorites" to "anon";

grant select on table "public"."tutorial_favorites" to "anon";

grant update on table "public"."tutorial_favorites" to "anon";

grant update on table "public"."tutorial_favorites" to "authenticated";

grant delete on table "public"."tutorial_favorites" to "service_role";

grant insert on table "public"."tutorial_favorites" to "service_role";

grant select on table "public"."tutorial_favorites" to "service_role";

grant update on table "public"."tutorial_favorites" to "service_role";

grant delete on table "public"."tutorial_progress" to "anon";

grant insert on table "public"."tutorial_progress" to "anon";

grant select on table "public"."tutorial_progress" to "anon";

grant update on table "public"."tutorial_progress" to "anon";

grant delete on table "public"."tutorial_progress" to "authenticated";

grant delete on table "public"."tutorial_progress" to "service_role";

grant insert on table "public"."tutorial_progress" to "service_role";

grant select on table "public"."tutorial_progress" to "service_role";

grant update on table "public"."tutorial_progress" to "service_role";

grant delete on table "public"."tutorial_views" to "anon";

grant insert on table "public"."tutorial_views" to "anon";

grant select on table "public"."tutorial_views" to "anon";

grant update on table "public"."tutorial_views" to "anon";

grant delete on table "public"."tutorial_views" to "authenticated";

grant update on table "public"."tutorial_views" to "authenticated";

grant delete on table "public"."tutorial_views" to "service_role";

grant insert on table "public"."tutorial_views" to "service_role";

grant select on table "public"."tutorial_views" to "service_role";

grant update on table "public"."tutorial_views" to "service_role";

grant delete on table "public"."tutorials" to "anon";

grant insert on table "public"."tutorials" to "anon";

grant select on table "public"."tutorials" to "anon";

grant update on table "public"."tutorials" to "anon";

grant delete on table "public"."tutorials" to "authenticated";

grant insert on table "public"."tutorials" to "authenticated";

grant update on table "public"."tutorials" to "authenticated";

grant delete on table "public"."tutorials" to "service_role";

grant insert on table "public"."tutorials" to "service_role";

grant select on table "public"."tutorials" to "service_role";

grant update on table "public"."tutorials" to "service_role";

grant delete on table "public"."vehicle_documents" to "anon";

grant insert on table "public"."vehicle_documents" to "anon";

grant select on table "public"."vehicle_documents" to "anon";

grant update on table "public"."vehicle_documents" to "anon";

grant delete on table "public"."vehicle_documents" to "service_role";

grant insert on table "public"."vehicle_documents" to "service_role";

grant select on table "public"."vehicle_documents" to "service_role";

grant update on table "public"."vehicle_documents" to "service_role";

grant delete on table "public"."vehicle_positions" to "anon";

grant insert on table "public"."vehicle_positions" to "anon";

grant select on table "public"."vehicle_positions" to "anon";

grant update on table "public"."vehicle_positions" to "anon";

grant delete on table "public"."vehicle_positions" to "authenticated";

grant insert on table "public"."vehicle_positions" to "authenticated";

grant update on table "public"."vehicle_positions" to "authenticated";

grant delete on table "public"."vehicle_positions_latest" to "anon";

grant insert on table "public"."vehicle_positions_latest" to "anon";

grant select on table "public"."vehicle_positions_latest" to "anon";

grant update on table "public"."vehicle_positions_latest" to "anon";

grant delete on table "public"."vehicle_positions_latest" to "authenticated";

grant insert on table "public"."vehicle_positions_latest" to "authenticated";

grant update on table "public"."vehicle_positions_latest" to "authenticated";

grant delete on table "public"."vehicle_registration_duplicate_archive" to "service_role";

grant update on table "public"."vehicle_registration_duplicate_archive" to "service_role";

grant delete on table "public"."vehicle_registration_registry" to "service_role";

grant update on table "public"."vehicle_registration_registry" to "service_role";

grant delete on table "public"."vehicle_speed_states" to "anon";

grant insert on table "public"."vehicle_speed_states" to "anon";

grant select on table "public"."vehicle_speed_states" to "anon";

grant update on table "public"."vehicle_speed_states" to "anon";

grant delete on table "public"."vehicle_speed_states" to "authenticated";

grant insert on table "public"."vehicle_speed_states" to "authenticated";

grant update on table "public"."vehicle_speed_states" to "authenticated";

grant delete on table "public"."vehicules" to "anon";

grant insert on table "public"."vehicules" to "anon";

grant select on table "public"."vehicules" to "anon";

grant update on table "public"."vehicules" to "anon";

grant delete on table "public"."vehicules" to "authenticated";

grant insert on table "public"."vehicules" to "authenticated";

grant select on table "public"."vehicules" to "authenticated";

grant update on table "public"."vehicules" to "authenticated";


  create policy "flottes_select_active_members_runtime"
  on "public"."flottes"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.flotte_adhesions fa
  WHERE ((fa.fleet_id = flottes.id) AND (fa.user_id = auth.uid()) AND (fa.is_active = true)))));



  create policy "organisations_select_active_members_runtime"
  on "public"."organisations"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.flottes f
     JOIN public.flotte_adhesions fa ON ((fa.fleet_id = f.id)))
  WHERE ((f.org_id = organisations.id) AND (fa.user_id = auth.uid()) AND (fa.is_active = true)))));



  create policy "memberships_select_self_or_manager_org"
  on "public"."flotte_adhesions"
  as permissive
  for select
  to authenticated
using (((user_id = auth.uid()) OR public.has_role(fleet_id, 'manager'::public.role_type) OR public.has_role(fleet_id, 'organizer'::public.role_type)));



  create policy "invitations_ecriture_manager_org"
  on "public"."flotte_invitations"
  as permissive
  for insert
  to public
with check ((public.has_role(fleet_id, 'manager'::public.role_type) OR public.has_role(fleet_id, 'organizer'::public.role_type)));



  create policy "invitations_modification_manager_org"
  on "public"."flotte_invitations"
  as permissive
  for update
  to public
using ((public.has_role(fleet_id, 'manager'::public.role_type) OR public.has_role(fleet_id, 'organizer'::public.role_type)));



  create policy "help_articles_admin_select"
  on "public"."help_articles"
  as permissive
  for select
  to authenticated
using ((public.is_platform_admin() OR public.is_help_center_admin() OR (EXISTS ( SELECT 1
   FROM public.flotte_adhesions fa
  WHERE ((fa.user_id = auth.uid()) AND (fa.role = 'organizer'::public.role_type))))));



  create policy "help_search_events_insert"
  on "public"."help_search_events"
  as permissive
  for insert
  to public
with check (true);



  create policy "journal_carburant_insert_driver"
  on "public"."journal_carburant"
  as permissive
  for insert
  to authenticated
with check (((auth.uid() = driver_user_id) AND (EXISTS ( SELECT 1
   FROM public.flotte_adhesions fa
  WHERE ((fa.fleet_id = journal_carburant.fleet_id) AND (fa.user_id = auth.uid()) AND (fa.is_active = true))))));



  create policy "journal_carburant_select_member"
  on "public"."journal_carburant"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.flotte_adhesions fa
  WHERE ((fa.fleet_id = journal_carburant.fleet_id) AND (fa.user_id = auth.uid()) AND (fa.is_active = true)))));



  create policy "journal_carburant_update_owner"
  on "public"."journal_carburant"
  as permissive
  for update
  to authenticated
using ((auth.uid() = driver_user_id))
with check ((auth.uid() = driver_user_id));



  create policy "orgs_delete_manager_org"
  on "public"."organisations"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.flottes f
     JOIN public.flotte_adhesions fa ON ((fa.fleet_id = f.id)))
  WHERE ((f.org_id = organisations.id) AND (fa.user_id = auth.uid()) AND (fa.is_active = true) AND (fa.role = ANY (ARRAY['manager'::public.role_type, 'organizer'::public.role_type]))))));



  create policy "orgs_select_member"
  on "public"."organisations"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.flottes f
     JOIN public.flotte_adhesions fa ON ((fa.fleet_id = f.id)))
  WHERE ((f.org_id = organisations.id) AND (fa.user_id = auth.uid()) AND (fa.is_active = true)))));



  create policy "orgs_update_member"
  on "public"."organisations"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.flottes f
     JOIN public.flotte_adhesions fa ON ((fa.fleet_id = f.id)))
  WHERE ((f.org_id = organisations.id) AND (fa.user_id = auth.uid()) AND (fa.is_active = true) AND (fa.role = ANY (ARRAY['manager'::public.role_type, 'organizer'::public.role_type]))))))
with check (true);



  create policy "tutorial_favorites_delete_own"
  on "public"."tutorial_favorites"
  as permissive
  for delete
  to authenticated
using ((auth.uid() = user_id));



  create policy "tutorial_favorites_insert_own"
  on "public"."tutorial_favorites"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "tutorial_favorites_select_own"
  on "public"."tutorial_favorites"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "tutorial_progress_insert_own"
  on "public"."tutorial_progress"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "tutorial_progress_select_own"
  on "public"."tutorial_progress"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "tutorial_progress_update_own"
  on "public"."tutorial_progress"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id));



  create policy "tutorial_views_insert_own"
  on "public"."tutorial_views"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "tutorial_views_select_own"
  on "public"."tutorial_views"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));


do $$
begin
  if to_regclass('auth.users') is not null then
    drop trigger if exists "on_auth_user_invitation_signup" on "auth"."users";
  end if;
end $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_invitation_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_invitation_signup();

drop policy if exists "avatars_delete_own" on "storage"."objects";

drop policy if exists "avatars_insert_own" on "storage"."objects";

drop policy if exists "avatars_select_own" on "storage"."objects";

drop policy if exists "avatars_update_own" on "storage"."objects";

drop policy if exists "dvir_photos_fleet_insert" on "storage"."objects";

drop policy if exists "dvir_photos_fleet_select" on "storage"."objects";

drop policy if exists "dvir_photos_owner_delete" on "storage"."objects";

drop policy if exists "fleet_assets_fleet_delete" on "storage"."objects";

drop policy if exists "fleet_assets_fleet_insert" on "storage"."objects";

drop policy if exists "fleet_assets_fleet_select" on "storage"."objects";

drop policy if exists "incident_evidence_authenticated_insert" on "storage"."objects";

drop policy if exists "incident_evidence_delete_fleet" on "storage"."objects";

drop policy if exists "incident_evidence_insert_fleet" on "storage"."objects";

drop policy if exists "incident_evidence_owner_delete" on "storage"."objects";

drop policy if exists "incident_evidence_owner_update" on "storage"."objects";

drop policy if exists "incident_evidence_public_read" on "storage"."objects";

drop policy if exists "incident_evidence_select_fleet" on "storage"."objects";

drop policy if exists "tutorials_insert_service" on "storage"."objects";

drop policy if exists "tutorials_select_authenticated" on "storage"."objects";


  create policy "Lecture publique tutoriels"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'tutorials'::text));
