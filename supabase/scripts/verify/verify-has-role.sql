-- =====================================================
-- Vérification de la fonction has_role
-- - Confirme que la fonction existe
-- - Vérifie qu'elle est SECURITY DEFINER
-- - Vérifie que le search_path est fixé à "public"
-- =====================================================

SELECT
  p.proname                              AS function_name,
  n.nspname                              AS schema_name,
  p.prosecdef                            AS is_security_definer,
  EXISTS (
    SELECT 1
    FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg
    WHERE cfg LIKE 'search_path=%public%'
  )                                      AS has_search_path_public
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'has_role';

