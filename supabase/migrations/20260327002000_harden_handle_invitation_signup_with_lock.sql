BEGIN;

-- Renforce le trigger de signup invitation avec verrouillage explicite
-- pour eviter les courses concurrentes sur current_uses.
CREATE OR REPLACE FUNCTION public.handle_invitation_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fleet_id uuid;
  v_invitation_code text;
  v_invitation public.flotte_invitations%ROWTYPE;
BEGIN
  v_fleet_id := (new.raw_user_meta_data->>'invitation_fleet_id')::uuid;
  v_invitation_code := new.raw_user_meta_data->>'invitation_code';

  IF v_fleet_id IS NULL THEN
    RETURN new;
  END IF;

  IF v_invitation_code IS NOT NULL THEN
    SELECT *
    INTO v_invitation
    FROM public.flotte_invitations
    WHERE code = v_invitation_code
      AND fleet_id = v_fleet_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'invitation_introuvable';
    END IF;

    IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at <= now() THEN
      RAISE EXCEPTION 'invitation_expiree';
    END IF;

    IF v_invitation.max_uses IS NOT NULL AND v_invitation.current_uses >= v_invitation.max_uses THEN
      RAISE EXCEPTION 'invitation_limite_atteinte';
    END IF;
  END IF;

  INSERT INTO public.flotte_adhesions (fleet_id, user_id, role, is_active)
  VALUES (v_fleet_id, new.id, 'driver', true)
  ON CONFLICT (fleet_id, user_id)
  DO UPDATE SET
    role = 'driver',
    is_active = true;

  IF v_invitation_code IS NOT NULL THEN
    UPDATE public.flotte_invitations
    SET current_uses = current_uses + 1
    WHERE id = v_invitation.id;
  END IF;

  RETURN new;
END;
$$;

COMMIT;

