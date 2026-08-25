BEGIN;

REVOKE EXECUTE ON FUNCTION public.access_code_generate(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.access_code_generate(text)
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
