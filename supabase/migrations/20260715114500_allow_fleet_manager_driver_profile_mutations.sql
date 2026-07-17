-- Permet aux organisateurs/gestionnaires d'une flotte de creer et modifier
-- le profil minimal des conducteurs rattaches a leur flotte.

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
    FROM public.flotte_adhesions manager_membership
    JOIN public.flotte_adhesions target_membership
      ON target_membership.fleet_id = manager_membership.fleet_id
    WHERE manager_membership.user_id = (SELECT auth.uid())
      AND manager_membership.is_active = true
      AND manager_membership.role::text IN ('organizer', 'manager')
      AND target_membership.user_id = p_user_id
      AND target_membership.is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_fleet_manager_of_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_fleet_manager_of_user(uuid) TO authenticated;

ALTER TABLE public.profils ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profils_select_fleet ON public.profils;
CREATE POLICY profils_select_fleet ON public.profils
  FOR SELECT TO authenticated
  USING (public.is_fleet_manager_of_user(user_id));

DROP POLICY IF EXISTS profils_insert_fleet_manager ON public.profils;
CREATE POLICY profils_insert_fleet_manager ON public.profils
  FOR INSERT TO authenticated
  WITH CHECK (public.is_fleet_manager_of_user(user_id));

DROP POLICY IF EXISTS profils_update_fleet_manager ON public.profils;
CREATE POLICY profils_update_fleet_manager ON public.profils
  FOR UPDATE TO authenticated
  USING (public.is_fleet_manager_of_user(user_id))
  WITH CHECK (public.is_fleet_manager_of_user(user_id));

NOTIFY pgrst, 'reload schema';
