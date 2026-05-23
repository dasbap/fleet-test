-- Renforcement RLS : conducteur limité aux véhicules assignés pour incidents.

DROP POLICY IF EXISTS incidents_insertion_conducteur ON public.incidents;
CREATE POLICY incidents_insertion_conducteur ON public.incidents
  FOR INSERT TO authenticated
  WITH CHECK (
    driver_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.vehicules v
      JOIN public.affectations_vehicules av
        ON av.vehicle_id = v.id
       AND av.is_active = true
       AND av.driver_user_id = auth.uid()
      WHERE v.id = incidents.vehicle_id
    )
  );

-- Conducteur : lecture incidents sur ses véhicules assignés uniquement
DROP POLICY IF EXISTS incidents_lecture_conducteur ON public.incidents;
CREATE POLICY incidents_lecture_conducteur ON public.incidents
  FOR SELECT TO authenticated
  USING (
    driver_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.vehicules v
      JOIN public.affectations_vehicules av
        ON av.vehicle_id = v.id
       AND av.is_active = true
       AND av.driver_user_id = auth.uid()
      WHERE v.id = incidents.vehicle_id
    )
  );

COMMENT ON POLICY incidents_insertion_conducteur ON public.incidents IS
  'Conducteur : création incident uniquement sur véhicule assigné activement.';
