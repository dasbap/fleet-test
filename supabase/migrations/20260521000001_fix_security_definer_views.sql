-- Corrige les vues SECURITY DEFINER signalées par le linter Supabase.
-- SECURITY DEFINER = la vue tourne avec les droits du créateur (postgres/service_role)
-- → bypass total de la RLS → n'importe quel authenticated accède à toutes les lignes.
-- Fix : security_invoker = true → la vue hérite des droits du requêteur + RLS appliquée.
-- PG15+ requis pour ALTER VIEW SET (security_invoker). On est sur PG17 ✓

ALTER VIEW IF EXISTS public.alerts                      SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vehicles                    SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_activation_status         SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_billing_lifecycle_status  SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_dashcam_alerts_24h        SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_demo_accounts_status      SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_dvir_compliance           SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_dvir_defaut_frequency     SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_fleet_risk_summary        SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_org_fleet_summary         SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_prospect_dashboard        SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_quick_wins_pending        SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_rbac_user_roles           SET (security_invoker = true); -- nom exact en DB
ALTER VIEW IF EXISTS public.v_retention_kpis            SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vehicle_failure_features_v1 SET (security_invoker = true);
