-- =====================================================
-- VÉRIFICATION DES PROFILS UTILISATEURS
-- Smart Fleet Africa
-- =====================================================
-- Ce script permet de vérifier l'état des profils utilisateurs (champ full_name).
-- 1. Vérifie le nombre total de profils et la complétude du champ full_name
-- 2. Affiche les membres de la Flotte Test et leur nom complet
-- 3. Statistiques de complétude par flotte
-- =====================================================

-- ÉTAPE 1 : Vérification globale des profils
SELECT 
  'VÉRIFICATION DES PROFILS' as section,
  COUNT(*) as total_profils,
  COUNT(*) FILTER (WHERE full_name IS NOT NULL) as profils_avec_nom,
  COUNT(*) FILTER (WHERE full_name IS NULL) as profils_sans_nom,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE full_name IS NOT NULL) / NULLIF(COUNT(*), 0),
    2
  ) as pourcentage_complet
FROM public.profiles;

-- ÉTAPE 2 : Détails des membres de la Flotte Test
SELECT 
  'MEMBRES DE LA FLOTTE TEST (VÉRIFICATION)' as section,
  fm.id as membership_id,
  fm.role,
  fm.is_active,
  f.name as fleet_name,
  u.email,
  p.full_name,
  fm.created_at
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
LEFT JOIN auth.users u ON u.id = fm.user_id
LEFT JOIN profiles p ON p.user_id = fm.user_id
WHERE f.name = 'Flotte Test'
ORDER BY fm.created_at DESC;

-- ÉTAPE 3 : Statistiques de profils par flotte
SELECT 
  'STATISTIQUES PAR FLOTTE' as section,
  f.name as fleet_name,
  COUNT(DISTINCT fm.user_id) as nombre_membres,
  COUNT(DISTINCT fm.user_id) FILTER (WHERE p.full_name IS NOT NULL) as membres_avec_nom,
  COUNT(DISTINCT fm.user_id) FILTER (WHERE p.full_name IS NULL) as membres_sans_nom
FROM fleets f
LEFT JOIN fleet_memberships fm ON fm.fleet_id = f.id AND fm.is_active = true
LEFT JOIN profiles p ON p.user_id = fm.user_id
GROUP BY f.id, f.name
ORDER BY f.name;
