-- =====================================================
-- PRÉREQUIS : Profils manquants avant migration FK
-- Smart Fleet Africa - E-Samba
-- =====================================================
-- À exécuter dans Supabase SQL Editor AVANT d'appliquer
-- la migration 20260227091000_fix_profils_and_maintenance_relationships.sql
--
-- Insère dans profils tout user_id / driver_user_id présent
-- dans scores_conducteurs, affectations_vehicules, incidents,
-- flotte_adhesions et qui n'a pas encore de ligne dans profils.
-- =====================================================

INSERT INTO public.profils (user_id, full_name)
SELECT u.id, COALESCE(
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'name',
  split_part(u.email, '@', 1),
  'Utilisateur'
)
FROM auth.users u
WHERE u.id IN (
  SELECT driver_user_id FROM public.scores_conducteurs
  UNION
  SELECT driver_user_id FROM public.affectations_vehicules
  UNION
  SELECT driver_user_id FROM public.incidents
  UNION
  SELECT user_id FROM public.flotte_adhesions
)
AND u.id NOT IN (SELECT user_id FROM public.profils)
ON CONFLICT (user_id) DO NOTHING;
