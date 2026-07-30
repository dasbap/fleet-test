-- Restriction RLS flotte_adhesions : UPDATE et DELETE.
--
-- Seuls les managers ou organizers de la flotte concernée peuvent
-- modifier ou supprimer une adhésion.
--
-- La migration est idempotente : elle supprime toutes les variantes
-- connues avant de recréer les politiques finales.

ALTER TABLE public.flotte_adhesions
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS memberships_update_authenticated
ON public.flotte_adhesions;

DROP POLICY IF EXISTS memberships_delete_authenticated
ON public.flotte_adhesions;

DROP POLICY IF EXISTS memberships_update_manager_org
ON public.flotte_adhesions;

DROP POLICY IF EXISTS memberships_delete_manager_org
ON public.flotte_adhesions;

CREATE POLICY memberships_update_manager_org
ON public.flotte_adhesions
FOR UPDATE
TO authenticated
USING (
  public.has_role(fleet_id, 'manager'::role_type)
  OR public.has_role(fleet_id, 'organizer'::role_type)
)
WITH CHECK (
  public.has_role(fleet_id, 'manager'::role_type)
  OR public.has_role(fleet_id, 'organizer'::role_type)
);

CREATE POLICY memberships_delete_manager_org
ON public.flotte_adhesions
FOR DELETE
TO authenticated
USING (
  public.has_role(fleet_id, 'manager'::role_type)
  OR public.has_role(fleet_id, 'organizer'::role_type)
);