-- Vérification des adhésions équipe (membres actifs, retirés, doublons, affectations)
-- Tables runtime : flotte_adhesions, flottes, profils, affectations_vehicules
-- Exécuter dans Supabase SQL Editor (lecture seule)

-- =============================================================================
-- 1. Détail par flotte (aligné sur les captures d'écran)
-- =============================================================================
SELECT
  f.name AS flotte,
  p.full_name,
  fa.role,
  fa.is_active,
  p.phone,
  fa.created_at
FROM public.flotte_adhesions fa
JOIN public.flottes f ON f.id = fa.fleet_id
LEFT JOIN public.profils p ON p.user_id = fa.user_id
WHERE f.name ILIKE '%principale%'
   OR f.name ILIKE '%E-SAMBA%'
   OR p.full_name ILIKE '%Sébastien%'
ORDER BY f.name, fa.created_at;

-- =============================================================================
-- 2. Résumé Flotte E-SAMBA
-- =============================================================================
SELECT
  'RÉSUMÉ E-SAMBA' AS section,
  COUNT(*) AS total_membres,
  COUNT(*) FILTER (WHERE fa.role = 'organizer') AS organisateurs,
  COUNT(*) FILTER (WHERE fa.role = 'manager') AS gestionnaires,
  COUNT(*) FILTER (WHERE fa.role = 'driver') AS chauffeurs,
  COUNT(*) FILTER (WHERE fa.role = 'mechanic') AS mecaniciens,
  COUNT(*) FILTER (WHERE fa.is_active = true) AS membres_actifs,
  COUNT(*) FILTER (WHERE fa.is_active = false) AS membres_inactifs
FROM public.flotte_adhesions fa
JOIN public.flottes f ON f.id = fa.fleet_id
WHERE f.name ILIKE '%E-SAMBA%';

-- =============================================================================
-- A. Membres retirés (inactifs) — soft delete attendu
-- =============================================================================
SELECT
  f.name AS flotte,
  p.full_name,
  fa.role,
  fa.is_active,
  fa.created_at
FROM public.flotte_adhesions fa
JOIN public.flottes f ON f.id = fa.fleet_id
LEFT JOIN public.profils p ON p.user_id = fa.user_id
WHERE fa.is_active = false
ORDER BY f.name, fa.created_at DESC;

-- =============================================================================
-- B. Doublons modèle cible (fleet_id, user_id) — doit être vide
-- =============================================================================
SELECT
  fleet_id,
  user_id,
  COUNT(*) AS nb_lignes,
  array_agg(fa.role ORDER BY fa.created_at) AS roles,
  array_agg(fa.id ORDER BY fa.created_at) AS adhesion_ids,
  array_agg(fa.is_active ORDER BY fa.created_at) AS actifs
FROM public.flotte_adhesions fa
GROUP BY fleet_id, user_id
HAVING COUNT(*) > 1;

-- =============================================================================
-- C. Conducteurs inactifs avec affectation encore active (à corriger)
-- =============================================================================
SELECT
  f.name AS flotte,
  p.full_name,
  fa.user_id,
  av.id AS assignment_id,
  av.vehicle_id,
  av.is_active AS affectation_active
FROM public.flotte_adhesions fa
JOIN public.flottes f ON f.id = fa.fleet_id
JOIN public.affectations_vehicules av
  ON av.driver_user_id = fa.user_id
 AND av.fleet_id = fa.fleet_id
 AND av.is_active = true
LEFT JOIN public.profils p ON p.user_id = fa.user_id
WHERE fa.role = 'driver'
  AND fa.is_active = false
ORDER BY f.name, p.full_name;

-- =============================================================================
-- D. Santé globale par flotte (profils sans adhésion active)
-- Remplacer l'UUID par l'identifiant de la flotte à auditer
-- =============================================================================
-- SELECT public.verifier_sante_systeme('<fleet_id>'::uuid);

-- =============================================================================
-- E. Orphelins FK sur flotte_adhesions (sans flotte ou sans user auth)
-- =============================================================================
SELECT
  'ORPHELINS' AS section,
  fa.id,
  fa.fleet_id,
  fa.user_id,
  fa.role,
  fa.is_active
FROM public.flotte_adhesions fa
LEFT JOIN public.flottes f ON f.id = fa.fleet_id
LEFT JOIN auth.users u ON u.id = fa.user_id
WHERE f.id IS NULL OR u.id IS NULL;
