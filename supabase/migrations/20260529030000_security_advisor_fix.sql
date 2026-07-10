-- ============================================================
-- SECURITY ADVISOR FIX - 2026-05-29
-- 1. Vues SECURITY DEFINER -> security_invoker = true
-- 2. search_path mutable -> SET search_path = public
-- 3. Fonctions sensibles non accessibles a anon/PUBLIC
-- ============================================================


-- ============================================================
-- PARTIE 1 : Corriger les vues SECURITY DEFINER
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

GRANT SELECT ON public.v_activation_funnel   TO authenticated;
GRANT SELECT ON public.v_daily_active_users  TO authenticated;
GRANT SELECT ON public.v_retention_kpis      TO authenticated;


-- ============================================================
-- PARTIE 2 : Fixer le search_path mutable sur fonctions SECURITY DEFINER
-- ============================================================

DO $$
DECLARE
  function_name text;
  function_ref regprocedure;
BEGIN
  FOREACH function_name IN ARRAY ARRAY[
    'activate_with_code',
    'attach_auth_user',
    'current_user_is_active',
    'current_user_role',
    'generate_access_code',
    'get_auth_context',
    'init_activation_progress',
    'is_admin_or_dev',
    'suspend_account'
  ] LOOP
    FOR function_ref IN
      SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = function_name
    LOOP
      EXECUTE format('ALTER FUNCTION %s SET search_path = public', function_ref);
    END LOOP;
  END LOOP;
END $$;


-- ============================================================
-- PARTIE 3 : Revoquer EXECUTE sur anon/PUBLIC pour fonctions sensibles
-- ============================================================

DO $$
DECLARE
  function_signature text;
  function_ref regprocedure;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.admin_list_demo_sessions(boolean)',
    'public.admin_reset_demo_fleet(uuid)',
    'public.get_database_stats()',
    'public.liste_migrations_appliquees()',
    'public.rls_auto_enable()',
    'public.check_constraint_violations()',
    'public.check_logical_inconsistencies()',
    'public.check_orphaned_data()',
    'public.verifier_sante_systeme(uuid)',
    'public.billing_cancel_subscription(uuid, uuid)',
    'public.billing_enter_grace_period(uuid, integer)',
    'public.billing_run_daily_lifecycle()',
    'public.billing_start_trial(uuid, integer)',
    'public.billing_suspend_subscription(uuid)',
    'public.refund_payment(uuid, text)',
    'public.seed_esamba_2024(text)',
    'public.recreate_esamba_2024()',
    'public.check_esamba_2024()',
    'public.check_esamba_2024(uuid)',
    'public.verifier_esamba_2024()',
    'public.nettoyer_base_donnees(boolean)',
    'public.cleanup_orphaned_data(boolean)',
    'public.suspend_account(uuid)',
    'public.deactivate_demo_account(uuid, uuid, text)',
    'public.reactivate_demo_account(uuid, uuid, integer)',
    'public.set_demo_account_expiry(uuid, timestamptz)',
    'public.expire_demo_accounts_by_type()',
    'public.expire_temporary_accounts()',
    'public.prospect_expire_accounts()',
    'public.prospect_suspend_expired()'
  ] LOOP
    function_ref := to_regprocedure(function_signature);
    IF function_ref IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, PUBLIC', function_ref);
    ELSE
      RAISE NOTICE 'Fonction absente, revoke ignore: %', function_signature;
    END IF;
  END LOOP;

  -- Re-accorder uniquement a service_role (cron, backend).
  FOREACH function_signature IN ARRAY ARRAY[
    'public.billing_run_daily_lifecycle()',
    'public.billing_cancel_subscription(uuid, uuid)',
    'public.billing_enter_grace_period(uuid, integer)',
    'public.billing_start_trial(uuid, integer)',
    'public.billing_suspend_subscription(uuid)',
    'public.refund_payment(uuid, text)',
    'public.nettoyer_base_donnees(boolean)',
    'public.cleanup_orphaned_data(boolean)',
    'public.expire_demo_accounts_by_type()',
    'public.expire_temporary_accounts()',
    'public.prospect_expire_accounts()',
    'public.prospect_suspend_expired()',
    'public.admin_reset_demo_fleet(uuid)',
    'public.admin_list_demo_sessions(boolean)',
    'public.rls_auto_enable()',
    'public.seed_esamba_2024(text)',
    'public.recreate_esamba_2024()',
    'public.get_database_stats()',
    'public.liste_migrations_appliquees()'
  ] LOOP
    function_ref := to_regprocedure(function_signature);
    IF function_ref IS NOT NULL THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', function_ref);
    ELSE
      RAISE NOTICE 'Fonction absente, grant ignore: %', function_signature;
    END IF;
  END LOOP;
END $$;
