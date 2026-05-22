-- Correction : ambiguïté has_role(uuid, unknown) dans creer_ou_mettre_a_jour_adhesion_flotte.
--
-- Les deux surcharges has_role(uuid, role_type) et has_role(uuid, text[]) entrent
-- en conflit quand les littéraux 'manager' / 'organizer' ne sont pas castés.
-- PostgreSQL ne peut pas choisir → "function is not unique".
--
-- Fix : caster explicitement en public.role_type dans les appels has_role().

CREATE OR REPLACE FUNCTION public.creer_ou_mettre_a_jour_adhesion_flotte(
  p_fleet_id  uuid,
  p_user_id   uuid,
  p_role      public.role_type,
  p_is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership_id uuid;
  v_is_manager boolean;
  v_is_organizer boolean;
  v_fleet_has_active_members boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Permission refusée : utilisateur non authentifié.';
  END IF;

  -- Cast explicite → lève l'ambiguïté entre has_role(uuid, role_type) et has_role(uuid, text[])
  SELECT
    public.has_role(p_fleet_id, 'manager'::public.role_type),
    public.has_role(p_fleet_id, 'organizer'::public.role_type)
  INTO v_is_manager, v_is_organizer;

  SELECT EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = p_fleet_id
      AND fa.is_active = true
  ) INTO v_fleet_has_active_members;

  -- Cas bootstrap autorisé: première adhésion active de la flotte par l'utilisateur courant.
  IF NOT (v_is_manager OR v_is_organizer) THEN
    IF NOT (
      p_user_id = auth.uid()
      AND p_role = 'organizer'
      AND p_is_active = true
      AND NOT v_fleet_has_active_members
    ) THEN
      RAISE EXCEPTION 'Permission refusée : rôle manager/organizer requis pour modifier les adhésions.';
    END IF;
  END IF;

  INSERT INTO public.flotte_adhesions (fleet_id, user_id, role, is_active)
  VALUES (p_fleet_id, p_user_id, p_role, p_is_active)
  ON CONFLICT (fleet_id, user_id, role)
  DO UPDATE SET
    is_active = EXCLUDED.is_active,
    created_at = CASE
      WHEN public.flotte_adhesions.is_active = false AND EXCLUDED.is_active = true
      THEN now()
      ELSE public.flotte_adhesions.created_at
    END
  RETURNING id INTO v_membership_id;

  RETURN v_membership_id;
END;
$$;
