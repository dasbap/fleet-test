-- Reduce Supabase advisor warnings without changing authenticated app RPC flows.
-- 0011: make function name resolution deterministic for mutable search_path
-- functions. 0028/0029: remove direct REST execution where it is not needed.

DO $$
DECLARE
  function_name text;
  function_ref regprocedure;
BEGIN
  FOREACH function_name IN ARRAY ARRAY[
    'set_updated_at_tracking',
    'set_support_updated_at',
    'is_vehicle_subscription_status_active',
    'set_notification_tokens_updated_at'
  ] LOOP
    FOR function_ref IN
      SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = function_name
    LOOP
      EXECUTE format('ALTER FUNCTION %s SET search_path = public', function_ref);
    END LOOP;
  END LOOP;
END $$;

-- Admin and internal RPCs keep authenticated execution for app flows.
DO $$
DECLARE
  function_name text;
  function_ref regprocedure;
BEGIN
  FOREACH function_name IN ARRAY ARRAY[
    'admin_answer_faq_question',
    'admin_audit_table_change',
    'admin_auto_process_demo_requests',
    'admin_create_fleet_subscription',
    'admin_delete_faq_question',
    'admin_finalize_demo_request',
    'admin_list_all_accounts',
    'admin_list_audit_logs',
    'admin_list_demo_requests',
    'admin_list_demo_sessions',
    'admin_list_faq_questions',
    'admin_list_subscription_grant_options',
    'admin_log_action',
    'admin_set_fleet_plan',
    'admin_update_demo_request_auto_mode',
    'admin_upsert_faq_article',
    'archive_unsubscribed_vehicles_after_one_year',
    'update_demo_account_expiration',
    'write_audit_log'
  ] LOOP
    FOR function_ref IN
      SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = function_name
    LOOP
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', function_ref);
    END LOOP;
  END LOOP;
END $$;

DO $$
DECLARE
  function_name text;
  function_ref regprocedure;
BEGIN
  FOREACH function_name IN ARRAY ARRAY[
    'trg_auto_assign_vehicle_subscription',
    'trg_enforce_fleet_subscription_total_vehicle_slots',
    'trg_enforce_same_active_subscription_plan',
    'trg_enforce_subscription_vehicle_slot_limit'
  ] LOOP
    FOR function_ref IN
      SELECT p.oid::regprocedure
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = function_name
    LOOP
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', function_ref);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', function_ref);
    END LOOP;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
