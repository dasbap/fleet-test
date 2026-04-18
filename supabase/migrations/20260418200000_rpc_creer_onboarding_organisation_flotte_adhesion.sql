-- Onboarding : création atomique organisation + flotte + adhésion organizer.
-- Évite les échecs silencieux / messages vagues liés aux enchaînements client (RLS, timing).

BEGIN;

CREATE OR REPLACE FUNCTION public.creer_onboarding_organisation_flotte_et_adhesion(
  p_org_name text,
  p_country_code text,
  p_fleet_name text,
  p_collection_policy text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_fleet_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'non_authentifie';
  END IF;

  IF p_org_name IS NULL OR length(trim(p_org_name)) = 0 THEN
    RAISE EXCEPTION 'nom_organisation_requis';
  END IF;

  IF p_fleet_name IS NULL OR length(trim(p_fleet_name)) = 0 THEN
    RAISE EXCEPTION 'nom_flotte_requis';
  END IF;

  INSERT INTO public.organisations (name, country_code)
  VALUES (trim(p_org_name), upper(trim(p_country_code)))
  RETURNING id INTO v_org_id;

  v_fleet_id := public.creer_flotte_esamba(
    v_org_id,
    trim(p_fleet_name),
    trim(p_collection_policy)
  );

  PERFORM public.creer_ou_mettre_a_jour_adhesion_flotte(
    v_fleet_id,
    v_user_id,
    'organizer'::public.role_type,
    true
  );

  RETURN jsonb_build_object('org_id', v_org_id, 'fleet_id', v_fleet_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.creer_onboarding_organisation_flotte_et_adhesion(text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.creer_onboarding_organisation_flotte_et_adhesion(text, text, text, text) IS
'Onboarding atomique : organisation + flotte + adhésion organizer (SECURITY DEFINER).';

COMMIT;
