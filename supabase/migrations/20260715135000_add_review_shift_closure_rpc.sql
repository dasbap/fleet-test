-- Validation/rejet serveur des clotures de creneaux.
-- Evite l'UPDATE direct depuis le client sur clotures_creneaux, fragile sous RLS.

CREATE OR REPLACE FUNCTION public.closure_shift_can_manage(p_shift_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.creneaux_conducteurs cc
    INNER JOIN public.affectations_vehicules av ON av.id = cc.assignment_id
    INNER JOIN public.flotte_adhesions fa ON fa.fleet_id = av.fleet_id
    WHERE cc.id = p_shift_id
      AND fa.user_id = (SELECT auth.uid())
      AND fa.is_active = true
      AND fa.role::text IN ('organizer', 'manager')
  );
$$;

REVOKE ALL ON FUNCTION public.closure_shift_can_manage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.closure_shift_can_manage(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_shift_closure_for_actor(
  p_closure_id uuid,
  p_status public.closure_status,
  p_validated_by uuid,
  p_validated_at timestamp with time zone DEFAULT NULL
)
RETURNS SETOF public.clotures_creneaux
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor_user_id uuid := auth.uid();
  v_shift_id uuid;
  v_closure public.clotures_creneaux;
BEGIN
  IF p_closure_id IS NULL THEN
    RAISE EXCEPTION 'Identifiant cloture requis.'
      USING ERRCODE = '22023';
  END IF;

  IF p_status NOT IN ('validated'::public.closure_status, 'rejected'::public.closure_status) THEN
    RAISE EXCEPTION 'Statut cloture invalide.'
      USING ERRCODE = '22023';
  END IF;

  IF v_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise.'
      USING ERRCODE = '42501';
  END IF;

  IF p_validated_by IS NULL OR p_validated_by <> v_actor_user_id THEN
    RAISE EXCEPTION 'Validateur invalide.'
      USING ERRCODE = '42501';
  END IF;

  SELECT cc.shift_id
  INTO v_shift_id
  FROM public.clotures_creneaux cc
  WHERE cc.id = p_closure_id;

  IF v_shift_id IS NULL THEN
    RAISE EXCEPTION 'Cloture introuvable ou acces refuse.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.closure_shift_can_manage(v_shift_id) THEN
    RAISE EXCEPTION 'Cloture introuvable ou acces refuse.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.clotures_creneaux AS cc
  SET status = p_status,
      validated_by = v_actor_user_id,
      validated_at = COALESCE(p_validated_at, now())
  WHERE cc.id = p_closure_id
  RETURNING cc.* INTO v_closure;

  RETURN NEXT v_closure;
END;
$$;

REVOKE ALL ON FUNCTION public.review_shift_closure_for_actor(
  uuid,
  public.closure_status,
  uuid,
  timestamp with time zone
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.review_shift_closure_for_actor(
  uuid,
  public.closure_status,
  uuid,
  timestamp with time zone
) TO authenticated;

NOTIFY pgrst, 'reload schema';
