BEGIN;

REVOKE EXECUTE ON FUNCTION public.admin_auto_process_demo_requests()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_auto_process_demo_requests()
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
