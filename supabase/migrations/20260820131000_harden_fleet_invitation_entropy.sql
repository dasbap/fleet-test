BEGIN;

CREATE OR REPLACE FUNCTION public.creer_invitation_esamba(p_fleet_id uuid, p_code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check jsonb;
  v_code text;
  v_attempt integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  v_check := public.rbac_check_permission('member.invite', p_fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'Permission refusee : member.invite requis.';
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > 5 THEN
      RAISE EXCEPTION 'generation_code_invitation_echouee';
    END IF;

    v_code := 'ESAMBA-' || upper(encode(gen_random_bytes(12), 'hex'));

    INSERT INTO public.flotte_invitations(fleet_id, code, current_uses, created_by)
    VALUES (p_fleet_id, v_code, 0, auth.uid())
    ON CONFLICT (code) DO NOTHING;

    IF FOUND THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.creer_invitation_esamba(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creer_invitation_esamba(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
