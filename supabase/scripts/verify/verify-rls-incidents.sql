-- Vérification RLS sur public.incidents (après migration 20250223000000_enable_rls_incidents)
-- relrowsecurity doit être true.
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'incidents'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
