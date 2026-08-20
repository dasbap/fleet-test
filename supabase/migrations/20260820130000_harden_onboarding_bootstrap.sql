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

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 2026082013));

  IF EXISTS (
    SELECT 1
      FROM public.flotte_adhesions fa
     WHERE fa.user_id = v_user_id
       AND fa.is_active = true
  ) THEN
    RAISE EXCEPTION 'onboarding_deja_affilie';
  END IF;

  IF nullif(trim(coalesce(p_org_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'nom_organisation_requis';
  END IF;
  IF nullif(trim(coalesce(p_fleet_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'nom_flotte_requis';
  END IF;
  IF length(trim(p_org_name)) > 200 OR length(trim(p_fleet_name)) > 200 THEN
    RAISE EXCEPTION 'nom_trop_long';
  END IF;

  INSERT INTO public.organisations (name, country_code)
  VALUES (trim(p_org_name), upper(trim(p_country_code)))
  RETURNING id INTO v_org_id;

  INSERT INTO public.flottes (org_id, name, collection_policy)
  VALUES (v_org_id, trim(p_fleet_name), trim(p_collection_policy))
  RETURNING id INTO v_fleet_id;

  INSERT INTO public.flotte_adhesions (fleet_id, user_id, role, is_active)
  VALUES (v_fleet_id, v_user_id, 'organizer'::public.role_type, true);

  RETURN jsonb_build_object('org_id', v_org_id, 'fleet_id', v_fleet_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.creer_onboarding_organisation_flotte_et_adhesion(text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creer_onboarding_organisation_flotte_et_adhesion(text, text, text, text)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
