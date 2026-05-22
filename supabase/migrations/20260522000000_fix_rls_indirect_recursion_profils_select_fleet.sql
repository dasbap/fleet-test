-- Correction : récursion RLS indirecte sur flotte_adhesions
--
-- Chaîne de récursion :
--   SELECT flotte_adhesions
--     → adhesions_select_own_clerk → SELECT profils
--       → profils_select_fleet (subquery inline sur flotte_adhesions)
--         → SELECT flotte_adhesions  ← BOUCLE INFINIE
--
-- Correction : remplacer le subquery inline de profils_select_fleet
-- par une fonction SECURITY DEFINER avec SET row_security = off.

CREATE OR REPLACE FUNCTION public.is_fleet_manager_of_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa1
    JOIN public.flotte_adhesions fa2 ON fa2.fleet_id = fa1.fleet_id
    WHERE fa1.user_id = auth.uid()
      AND fa1.is_active = true
      AND fa1.role::text IN ('organizer', 'manager')
      AND fa2.user_id = p_user_id
      AND fa2.is_active = true
  );
$$;

DROP POLICY IF EXISTS profils_select_fleet ON public.profils;

CREATE POLICY profils_select_fleet ON public.profils
  FOR SELECT
  USING (is_fleet_manager_of_user(user_id));
