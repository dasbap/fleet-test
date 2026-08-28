BEGIN;

ALTER FUNCTION public.get_demo_account_type_duration(text)
  SECURITY INVOKER;

NOTIFY pgrst, 'reload schema';

COMMIT;
