-- Les managers/organisateurs peuvent créer une intervention depuis un incident
-- (aligné permissions UI : incident_maintenance → organizer, manager, mechanic)
DROP POLICY IF EXISTS rbac_travaux_write ON public.travaux_maintenance;

CREATE POLICY rbac_travaux_write ON public.travaux_maintenance
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR rbac_is_mechanic_on_fleet(fleet_id)
    OR rbac_is_fleet_manager_or_above(fleet_id)
  );

COMMENT ON POLICY rbac_travaux_write ON public.travaux_maintenance IS
  'Création travaux : mécanicien, manager, organisateur ou admin plateforme.';

NOTIFY pgrst, 'reload schema';
