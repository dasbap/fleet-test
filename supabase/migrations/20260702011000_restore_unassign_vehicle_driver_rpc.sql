-- Restore an RPC to end an active vehicle-driver assignment.
-- Drivers can see their own assignment, but cannot voluntarily detach from it.
-- Organizer and manager roles can release the vehicle while preserving history.

CREATE OR REPLACE FUNCTION public.delier_vehicule_chauffeur(
  p_assignment_id uuid
)
RETURNS public.affectations_vehicules
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment public.affectations_vehicules%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  SELECT *
  INTO v_assignment
  FROM public.affectations_vehicules
  WHERE id = p_assignment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'affectation_introuvable';
  END IF;

  IF v_assignment.is_active IS FALSE THEN
    RAISE EXCEPTION 'affectation_deja_terminee';
  END IF;

  IF NOT (
    public.has_role(v_assignment.fleet_id, 'organizer'::public.role_type)
    OR public.has_role(v_assignment.fleet_id, 'manager'::public.role_type)
    OR public.is_platform_admin()
  ) THEN
    RAISE EXCEPTION 'droits_insuffisants_affectation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.creneaux_conducteurs c
    WHERE c.assignment_id = p_assignment_id
      AND c.status = 'open'
  ) THEN
    RAISE EXCEPTION 'creneau_ouvert_bloque_desaffectation';
  END IF;

  UPDATE public.affectations_vehicules
  SET
    is_active = false,
    ends_at = now()
  WHERE id = p_assignment_id
  RETURNING * INTO v_assignment;

  RETURN v_assignment;
END;
$$;

COMMENT ON FUNCTION public.delier_vehicule_chauffeur(uuid) IS
  'Ends an active vehicle-driver assignment. Organizer/manager only; blocks open driver shifts.';

GRANT EXECUTE ON FUNCTION public.delier_vehicule_chauffeur(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.delier_vehicule_chauffeur(uuid) FROM anon;

NOTIFY pgrst, 'reload schema';
