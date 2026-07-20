-- =====================================================
-- Suppression physique — adhésions inactives Aloys & Jerome Modo
-- Flotte E-Samba / Smart Fleet Africa
-- =====================================================
-- À exécuter dans Supabase SQL Editor (service role ou compte organizer).
-- 1. Exécuter le DRY-RUN
-- 2. Décommenter APPLY et ré-exécuter
-- 3. Vérifier avec verify-team-adhesions.sql (section A)
-- =====================================================

-- DRY-RUN : lignes concernées
SELECT
  fa.id AS adhesion_id,
  f.name AS flotte,
  p.full_name,
  fa.user_id,
  fa.role,
  fa.created_at
FROM public.flotte_adhesions fa
JOIN public.flottes f ON f.id = fa.fleet_id
LEFT JOIN public.profils p ON p.user_id = fa.user_id
WHERE fa.is_active = false
  AND (
    trim(coalesce(p.full_name, '')) ILIKE 'Aloys'
    OR trim(coalesce(p.full_name, '')) ILIKE 'Jerome Modo'
    OR trim(coalesce(p.full_name, '')) ILIKE 'Jérôme Modo'
  );

-- APPLY (décommenter après validation) :
/*
UPDATE public.affectations_vehicules av
SET is_active = false, ends_at = now()
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
