-- Upsert securise du profil conducteur depuis l'application.
-- Le client evite ainsi un INSERT direct sur public.profils, fragile sous RLS.

CREATE OR REPLACE FUNCTION public.upsert_driver_profile_for_actor(
  p_driver_user_id uuid,
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  phone text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_actor_user_id uuid := auth.uid();
BEGIN
  IF p_driver_user_id IS NULL THEN
    RAISE EXCEPTION 'Identifiant conducteur requis.'
      USING ERRCODE = '22023';
  END IF;

  IF v_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise.'
      USING ERRCODE = '42501';
  END IF;

  IF p_driver_user_id <> v_actor_user_id
     AND NOT public.is_fleet_manager_of_user(p_driver_user_id) THEN
    RAISE EXCEPTION 'Acces refuse au profil conducteur.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO public.profils AS profile (
    user_id,
    full_name,
    phone
  )
  VALUES (
    p_driver_user_id,
    NULLIF(btrim(p_full_name), ''),
    NULLIF(btrim(p_phone), '')
  )
  ON CONFLICT ON CONSTRAINT profils_pkey DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, profile.full_name),
        phone = COALESCE(EXCLUDED.phone, profile.phone)
  RETURNING profile.user_id, profile.full_name, profile.phone, profile.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_driver_profile_for_actor(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_driver_profile_for_actor(uuid, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
