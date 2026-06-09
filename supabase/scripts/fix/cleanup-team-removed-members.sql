-- =====================================================
-- NETTOYAGE DOUX — Membres retirés (équipes)
-- Smart Fleet Africa
-- =====================================================
-- Workflow :
--   1. Exécuter les sections DRY-RUN (rapport)
--   2. Valider les comptages
--   3. Décommenter et exécuter les sections APPLY une par une
--   4. Re-exécuter verify-team-adhesions.sql pour confirmer
--
-- Par défaut : conservation audit (soft delete).
-- Section 4 : suppression physique ciblée (ex. Aloys, Jerome Modo inactifs).
-- =====================================================

-- =============================================================================
-- SECTION 1 — DRY-RUN : affectations actives pour membres inactifs
-- =============================================================================
SELECT
  'AFFECTATIONS_ORPHELINES' AS section,
  COUNT(*) AS nb_a_cloturer
FROM public.affectations_vehicules av
JOIN public.flotte_adhesions fa
  ON fa.user_id = av.driver_user_id
 AND fa.fleet_id = av.fleet_id
WHERE av.is_active = true
  AND fa.is_active = false;

SELECT
  f.name AS flotte,
  p.full_name,
  av.id AS assignment_id,
  av.vehicle_id
FROM public.affectations_vehicules av
JOIN public.flotte_adhesions fa
  ON fa.user_id = av.driver_user_id
 AND fa.fleet_id = av.fleet_id
JOIN public.flottes f ON f.id = fa.fleet_id
LEFT JOIN public.profils p ON p.user_id = fa.user_id
WHERE av.is_active = true
  AND fa.is_active = false
ORDER BY f.name, p.full_name;

-- =============================================================================
-- SECTION 1 — APPLY : clôture affectations orphelines
-- Décommenter après validation du dry-run
-- =============================================================================
/*
UPDATE public.affectations_vehicules av
SET is_active = false,
    ends_at = now()
FROM public.flotte_adhesions fa
WHERE av.driver_user_id = fa.user_id
  AND av.fleet_id = fa.fleet_id
  AND av.is_active = true
  AND fa.is_active = false;
*/

-- =============================================================================
-- SECTION 2 — DRY-RUN : doublons (fleet_id, user_id)
-- =============================================================================
SELECT
  fleet_id,
  user_id,
  COUNT(*) AS nb_lignes,
  array_agg(id ORDER BY created_at DESC) AS adhesion_ids,
  array_agg(role ORDER BY created_at DESC) AS roles,
  array_agg(is_active ORDER BY created_at DESC) AS actifs,
  array_agg(created_at ORDER BY created_at DESC) AS dates
FROM public.flotte_adhesions
GROUP BY fleet_id, user_id
HAVING COUNT(*) > 1;

-- =============================================================================
-- SECTION 2 — APPLY : fusion doublons (garde la ligne la plus récente active)
-- Décommenter après revue manuelle du diagnostic ci-dessus
-- =============================================================================
/*
DO $$
DECLARE
  rec RECORD;
  v_keep_id uuid;
BEGIN
  FOR rec IN
    SELECT fleet_id, user_id
    FROM public.flotte_adhesions
    GROUP BY fleet_id, user_id
    HAVING COUNT(*) > 1
  LOOP
    -- Priorité : ligne active la plus récente, sinon la plus récente tout court
    SELECT fa.id INTO v_keep_id
    FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = rec.fleet_id
      AND fa.user_id = rec.user_id
    ORDER BY fa.is_active DESC, fa.created_at DESC
    LIMIT 1;

    -- Désactive les doublons (ne supprime pas — audit)
    UPDATE public.flotte_adhesions
    SET is_active = false
    WHERE fleet_id = rec.fleet_id
      AND user_id = rec.user_id
      AND id <> v_keep_id;
  END LOOP;
END $$;
*/

-- =============================================================================
-- SECTION 3 — Orphelins FK (flotte_adhesions sans flotte ou sans user auth)
-- Utilise la fonction existante nettoyer_base_donnees
-- =============================================================================
SELECT public.nettoyer_base_donnees(true) AS simulation_nettoyage;

-- Décommenter pour appliquer si le dry-run ci-dessus est acceptable :
-- SELECT public.nettoyer_base_donnees(false) AS nettoyage_applique;

-- =============================================================================
-- SECTION 4 — DRY-RUN : adhésions inactives Aloys / Jerome Modo (Flotte principale)
-- =============================================================================
SELECT
  'ADHESIONS_INACTIVES_CIBLEES' AS section,
  fa.id AS adhesion_id,
  f.name AS flotte,
  p.full_name,
  fa.user_id,
  fa.role,
  fa.is_active,
  fa.created_at
FROM public.flotte_adhesions fa
JOIN public.flottes f ON f.id = fa.fleet_id
LEFT JOIN public.profils p ON p.user_id = fa.user_id
WHERE fa.is_active = false
  AND (
    trim(coalesce(p.full_name, '')) ILIKE 'Aloys'
    OR trim(coalesce(p.full_name, '')) ILIKE 'Jerome Modo'
    OR trim(coalesce(p.full_name, '')) ILIKE 'Jérôme Modo'
  )
ORDER BY f.name, p.full_name;

-- Affectations encore actives pour ces conducteurs (à clôturer avant DELETE)
SELECT
  f.name AS flotte,
  p.full_name,
  av.id AS assignment_id,
  av.vehicle_id,
  av.is_active
FROM public.affectations_vehicules av
JOIN public.flotte_adhesions fa
  ON fa.user_id = av.driver_user_id
 AND fa.fleet_id = av.fleet_id
JOIN public.flottes f ON f.id = fa.fleet_id
LEFT JOIN public.profils p ON p.user_id = fa.user_id
WHERE fa.is_active = false
  AND av.is_active = true
  AND (
    trim(coalesce(p.full_name, '')) ILIKE 'Aloys'
    OR trim(coalesce(p.full_name, '')) ILIKE 'Jerome Modo'
    OR trim(coalesce(p.full_name, '')) ILIKE 'Jérôme Modo'
  );

-- =============================================================================
-- SECTION 4 — APPLY : supprimer les adhésions inactives Aloys / Jerome Modo
-- Ordre : 1) clôturer affectations  2) DELETE adhésions
-- Décommenter les deux blocs après validation du dry-run ci-dessus.
-- =============================================================================
/*
-- 4a. Clôturer les affectations actives restantes
UPDATE public.affectations_vehicules av
SET is_active = false,
    ends_at = now()
FROM public.flotte_adhesions fa
JOIN public.profils p ON p.user_id = fa.user_id
WHERE av.driver_user_id = fa.user_id
  AND av.fleet_id = fa.fleet_id
  AND av.is_active = true
  AND fa.is_active = false
  AND (
    trim(coalesce(p.full_name, '')) ILIKE 'Aloys'
    OR trim(coalesce(p.full_name, '')) ILIKE 'Jerome Modo'
    OR trim(coalesce(p.full_name, '')) ILIKE 'Jérôme Modo'
  );

-- 4b. Suppression physique des adhésions inactives (irréversible)
DELETE FROM public.flotte_adhesions fa
USING public.profils p
WHERE fa.user_id = p.user_id
  AND fa.is_active = false
  AND (
    trim(coalesce(p.full_name, '')) ILIKE 'Aloys'
    OR trim(coalesce(p.full_name, '')) ILIKE 'Jerome Modo'
    OR trim(coalesce(p.full_name, '')) ILIKE 'Jérôme Modo'
  );
*/
