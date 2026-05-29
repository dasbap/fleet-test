-- ============================================================
-- SECURITY ADVISOR FIX — 2026-05-29
-- 1. Vues SECURITY DEFINER → security_invoker = true  (3 ERRORs)
-- 2. search_path mutable → SET search_path = public   (9 WARNs)
-- 3. Fonctions admin/billing accessibles à anon → REVOKE  (WARNs)
-- ============================================================


-- ============================================================
-- PARTIE 1 : Corriger les vues SECURITY DEFINER (3 ERRORs)
-- → Recréer avec security_invoker = true (respecte le RLS du caller)
-- ============================================================

DROP VIEW IF EXISTS public.v_retention_kpis;
DROP VIEW IF EXISTS public.v_daily_active_users;
DROP VIEW IF EXISTS public.v_activation_funnel;

CREATE VIEW public.v_activation_funnel
  WITH (security_invoker = true)
AS
SELECT
  f.org_id,
  f.id                                                             AS fleet_id,
  f.name                                                           AS fleet_name,
  count(DISTINCT fa.user_id) FILTER (
    WHERE fa.role = 'driver'::public.role_type AND fa.is_active = true
  )                                                                AS total_drivers,
  0                                                                AS active_drivers_j1,
  0                                                                AS active_drivers_j7,
  0                                                                AS closures_7d,
  0                                                                AS closures_30d,
  (0)::numeric                                                     AS activation_j7_rate
FROM public.flottes f
LEFT JOIN public.flotte_adhesions fa ON fa.fleet_id = f.id
GROUP BY f.org_id, f.id, f.name;

CREATE VIEW public.v_daily_active_users
  WITH (security_invoker = true)
AS
SELECT
  org_id,
  id            AS fleet_id,
  name          AS fleet_name,
  CURRENT_DATE  AS activity_date,
  0             AS daily_active_drivers,
  0             AS daily_closures
FROM public.flottes f;

CREATE VIEW public.v_retention_kpis
  WITH (security_invoker = true)
AS
SELECT
  org_id,
  fleet_id,
  fleet_name,
  total_drivers,
  active_drivers_j1,
  active_drivers_j7,
  closures_7d,
  closures_30d,
  activation_j7_rate,
  (0)::numeric(10,2) AS avg_daily_active_drivers_7d,
  'critical'::text   AS retention_status,
  now()              AS computed_at
FROM public.v_activation_funnel af;

-- Accès en lecture aux rôles authentifiés (inchangé)
GRANT SELECT ON public.v_activation_funnel   TO authenticated;
GRANT SELECT ON public.v_daily_active_users  TO authenticated;
GRANT SELECT ON public.v_retention_kpis      TO authenticated;


-- ============================================================
-- PARTIE 2 : Fixer le search_path mutable sur 9 fonctions SECURITY DEFINER
-- → Évite l'injection via search_path
-- ============================================================

ALTER FUNCTION public.activate_with_code(p_code text)
  SET search_path = public;

ALTER FUNCTION public.attach_auth_user(
  p_user_id uuid, p_role public.user_role, p_universe public.access_universe,
  p_full_name text, p_fleet_id uuid
)
  SET search_path = public;

ALTER FUNCTION public.current_user_is_active()
  SET search_path = public;

ALTER FUNCTION public.current_user_role()
  SET search_path = public;

ALTER FUNCTION public.generate_access_code(
  p_role public.user_role, p_universe public.access_universe,
  p_target_email text, p_fleet_id uuid, p_duration_days integer
)
  SET search_path = public;

ALTER FUNCTION public.get_auth_context(p_user_id uuid)
  SET search_path = public;

ALTER FUNCTION public.init_activation_progress(p_user_id uuid, p_org_id uuid)
  SET search_path = public;

ALTER FUNCTION public.is_admin_or_dev()
  SET search_path = public;

ALTER FUNCTION public.suspend_account(p_target uuid)
  SET search_path = public;


-- ============================================================
-- PARTIE 3 : Révoquer EXECUTE sur anon pour les fonctions sensibles
-- → Fonctions admin/billing/destructives ne doivent pas être appelables sans auth
-- ============================================================

-- Admin & outils de diagnostic
REVOKE EXECUTE ON FUNCTION public.admin_list_demo_sessions(boolean)          FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_reset_demo_fleet(uuid)               FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_database_stats()                       FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.liste_migrations_appliquees()              FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()                          FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_constraint_violations()              FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_logical_inconsistencies()            FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_orphaned_data()                      FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verifier_sante_systeme(uuid)               FROM anon, PUBLIC;

-- Facturation
REVOKE EXECUTE ON FUNCTION public.billing_cancel_subscription(uuid, uuid)    FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.billing_enter_grace_period(uuid, integer)  FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.billing_run_daily_lifecycle()              FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.billing_start_trial(uuid, integer)         FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.billing_suspend_subscription(uuid)         FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refund_payment(uuid, text)                 FROM anon, PUBLIC;

-- Données & seed (fonctions destructives)
REVOKE EXECUTE ON FUNCTION public.seed_esamba_2024(text)                     FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recreate_esamba_2024()                     FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_esamba_2024()                        FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_esamba_2024(uuid)                    FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verifier_esamba_2024()                     FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.nettoyer_base_donnees(boolean)             FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_orphaned_data(boolean)             FROM anon, PUBLIC;

-- Comptes & sessions (gestion admin)
REVOKE EXECUTE ON FUNCTION public.suspend_account(uuid)                      FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.deactivate_demo_account(uuid, uuid, text)  FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reactivate_demo_account(uuid, uuid, integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_demo_account_expiry(uuid, timestamptz) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_demo_accounts_by_type()             FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_temporary_accounts()                FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prospect_expire_accounts()                 FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prospect_suspend_expired()                 FROM anon, PUBLIC;

-- Ré-accorder uniquement à service_role (cron, backend)
GRANT EXECUTE ON FUNCTION public.billing_run_daily_lifecycle()               TO service_role;
GRANT EXECUTE ON FUNCTION public.billing_cancel_subscription(uuid, uuid)     TO service_role;
GRANT EXECUTE ON FUNCTION public.billing_enter_grace_period(uuid, integer)   TO service_role;
GRANT EXECUTE ON FUNCTION public.billing_start_trial(uuid, integer)          TO service_role;
GRANT EXECUTE ON FUNCTION public.billing_suspend_subscription(uuid)          TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_payment(uuid, text)                  TO service_role;
GRANT EXECUTE ON FUNCTION public.nettoyer_base_donnees(boolean)              TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_data(boolean)              TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_demo_accounts_by_type()              TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_temporary_accounts()                 TO service_role;
GRANT EXECUTE ON FUNCTION public.prospect_expire_accounts()                  TO service_role;
GRANT EXECUTE ON FUNCTION public.prospect_suspend_expired()                  TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_demo_fleet(uuid)                TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_demo_sessions(boolean)           TO service_role;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable()                           TO service_role;
GRANT EXECUTE ON FUNCTION public.seed_esamba_2024(text)                      TO service_role;
GRANT EXECUTE ON FUNCTION public.recreate_esamba_2024()                      TO service_role;
GRANT EXECUTE ON FUNCTION public.get_database_stats()                        TO service_role;
GRANT EXECUTE ON FUNCTION public.liste_migrations_appliquees()               TO service_role;
