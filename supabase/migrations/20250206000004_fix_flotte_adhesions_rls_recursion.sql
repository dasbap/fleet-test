-- Correction : récursion infinie sur flotte_adhesions.
--
-- Les anciennes politiques effectuaient directement une lecture sur
-- flotte_adhesions depuis une politique de cette même table.
--
-- has_role() est SECURITY DEFINER et lit flotte_adhesions sans
-- redéclencher les politiques RLS de l'utilisateur appelant.

DROP POLICY IF EXISTS memberships_read_self
ON public.flotte_adhesions;

DROP POLICY IF EXISTS memberships_read_manager_org
ON public.flotte_adhesions;

DROP POLICY IF EXISTS memberships_select_self_or_manager_org
ON public.flotte_adhesions;

CREATE POLICY memberships_select_self_or_manager_org
ON public.flotte_adhesions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(fleet_id, 'manager'::role_type)
  OR public.has_role(fleet_id, 'organizer'::role_type)
);