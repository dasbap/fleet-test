-- =====================================================
-- Vérification non-régression : création de flotte
-- Smart Fleet Africa
-- =====================================================
-- Ce script vérifie que l'environnement permet la création
-- de flotte : RPC françaises présentes, RLS flotte_adhesions OK.
-- À exécuter après déploiement ou migrations (SQL Editor Supabase).
-- Ne crée aucune donnée.
-- =====================================================

-- 1. Existence des RPC nécessaires à la création de flotte
-- =====================================================
SELECT
  'RPC création flotte' AS verification,
  routine_name AS fonction,
  CASE WHEN routine_name IS NOT NULL THEN 'OK' ELSE 'MANQUANT' END AS statut
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND routine_name IN (
    'creer_flotte_esamba',
    'creer_ou_mettre_a_jour_adhesion_flotte'
  )
ORDER BY routine_name;

-- Si une des deux fonctions manque, la requête ci-dessous le signale
SELECT
  'Contrôle complet RPC' AS verification,
  CASE
    WHEN COUNT(*) = 2 THEN 'OK – Les 2 RPC sont présentes'
    ELSE 'ERREUR – Appliquer migration 20250206000001_rename_rpc_functions_to_french.sql'
  END AS statut
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND routine_name IN (
    'creer_flotte_esamba',
    'creer_ou_mettre_a_jour_adhesion_flotte'
  );

-- 2. Politiques RLS sur flotte_adhesions (éviter récursion)
-- =====================================================
SELECT
  'Politiques RLS flotte_adhesions' AS verification,
  policyname AS politique,
  cmd AS commande,
  'OK' AS statut
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'flotte_adhesions'
ORDER BY policyname;

-- Vérifier qu'une politique SELECT existe (lecture par l'utilisateur ou manager/organizer)
SELECT
  'Politique SELECT flotte_adhesions' AS verification,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'flotte_adhesions'
        AND cmd = 'SELECT'
    ) THEN 'OK – Une politique SELECT existe'
    ELSE 'ERREUR – Appliquer migration 20250206000004_fix_flotte_adhesions_rls_recursion.sql'
  END AS statut;

-- 3. Résumé
-- =====================================================
-- Si les deux blocs ci-dessus affichent "OK", l'environnement est prêt.
-- Test fonctionnel recommandé : procédure manuelle dans VERIFICATION-CREATION-FLOTTE.md
-- (créer une flotte via l'UI puis vérifier la ligne dans flotte_adhesions).
