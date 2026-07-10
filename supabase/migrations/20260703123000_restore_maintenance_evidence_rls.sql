-- Restore table RLS for maintenance evidence metadata.
-- Storage upload writes the object first, then inserts this metadata row.

ALTER TABLE public.preuves_maintenance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS preuves_insertion_mec ON public.preuves_maintenance;
DROP POLICY IF EXISTS preuves_maintenance_select_fleet_role ON public.preuves_maintenance;
DROP POLICY IF EXISTS preuves_maintenance_insert_fleet_role ON public.preuves_maintenance;
DROP POLICY IF EXISTS preuves_maintenance_delete_fleet_role ON public.preuves_maintenance;

CREATE POLICY preuves_maintenance_select_fleet_role
ON public.preuves_maintenance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.travaux_maintenance tm
    WHERE tm.id = preuves_maintenance.job_id
      AND (
        public.has_role(tm.fleet_id, 'organizer'::public.role_type)
        OR public.has_role(tm.fleet_id, 'manager'::public.role_type)
        OR public.has_role(tm.fleet_id, 'mechanic'::public.role_type)
      )
  )
);

CREATE POLICY preuves_maintenance_insert_fleet_role
ON public.preuves_maintenance
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND kind IN ('before', 'after')
  AND EXISTS (
    SELECT 1
    FROM public.travaux_maintenance tm
    WHERE tm.id = preuves_maintenance.job_id
      AND (
        public.has_role(tm.fleet_id, 'organizer'::public.role_type)
        OR public.has_role(tm.fleet_id, 'manager'::public.role_type)
        OR public.has_role(tm.fleet_id, 'mechanic'::public.role_type)
      )
  )
);

CREATE POLICY preuves_maintenance_delete_fleet_role
ON public.preuves_maintenance
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.travaux_maintenance tm
    WHERE tm.id = preuves_maintenance.job_id
      AND (
        public.has_role(tm.fleet_id, 'organizer'::public.role_type)
        OR public.has_role(tm.fleet_id, 'manager'::public.role_type)
      )
  )
);

NOTIFY pgrst, 'reload schema';
