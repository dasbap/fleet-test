-- Lecture des flottes pour tout membre actif (conducteur, mécanicien, etc.)
-- afin de résoudre org_id / contexte tenant côté client sans élargir INSERT/UPDATE/DELETE.
-- Idempotent: DROP + CREATE

DROP POLICY IF EXISTS flottes_select_active_member ON public.flottes;

CREATE POLICY flottes_select_active_member ON public.flottes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.flotte_adhesions fa
      WHERE fa.fleet_id = flottes.id
        AND fa.user_id = auth.uid()
        AND fa.is_active = true
    )
  );

COMMENT ON POLICY flottes_select_active_member ON public.flottes IS
  'Permet à tout membre actif de la flotte de lire la ligne flotte (résolution org), en complément des politiques manager/organizer.';
