-- Santé activation terrain : téléphone renseigné et au moins un créneau ouvert (par conducteur).

BEGIN;

CREATE OR REPLACE FUNCTION public.fleet_driver_activation_health(p_fleet_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int := 0;
  v_with_phone int := 0;
  v_never_shifted int := 0;
  v_rows jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT (
    public.has_role(p_fleet_id, 'organizer'::public.role_type)
    OR public.has_role(p_fleet_id, 'manager'::public.role_type)
    OR public.has_role(p_fleet_id, 'mechanic'::public.role_type)
    OR public.has_role(p_fleet_id, 'driver'::public.role_type)
  ) THEN
    RAISE EXCEPTION 'Accès refusé pour cette flotte';
  END IF;

  WITH drivers AS (
    SELECT
      fa.user_id,
      p.phone AS phone,
      EXISTS (
        SELECT 1
        FROM public.creneaux_conducteurs c
        INNER JOIN public.affectations_vehicules a ON a.id = c.assignment_id
        WHERE a.fleet_id = p_fleet_id
          AND a.driver_user_id = fa.user_id
      ) AS has_ever_shift
    FROM public.flotte_adhesions fa
    INNER JOIN public.profils p ON p.user_id = fa.user_id
    WHERE fa.fleet_id = p_fleet_id
      AND fa.role = 'driver'::public.role_type
      AND fa.is_active = true
  ),
  agg AS (
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE btrim(coalesce(phone, '')) <> '')::int AS with_phone,
      COUNT(*) FILTER (WHERE NOT has_ever_shift)::int AS never_shifted,
      jsonb_agg(
        jsonb_build_object(
          'user_id', user_id,
          'has_phone', btrim(coalesce(phone, '')) <> '',
          'has_ever_shift', has_ever_shift
        )
        ORDER BY user_id
      ) AS flags
    FROM drivers
  )
  SELECT total, with_phone, never_shifted, coalesce(flags, '[]'::jsonb)
  INTO v_total, v_with_phone, v_never_shifted, v_rows
  FROM agg;

  RETURN jsonb_build_object(
    'total_drivers', coalesce(v_total, 0),
    'with_phone_count', coalesce(v_with_phone, 0),
    'never_shifted_count', coalesce(v_never_shifted, 0),
    'pct_with_phone', CASE
      WHEN coalesce(v_total, 0) = 0 THEN 0::numeric
      ELSE round(100.0 * coalesce(v_with_phone, 0)::numeric / v_total::numeric, 1)
    END,
    'drivers', coalesce(v_rows, '[]'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.fleet_driver_activation_health(uuid) IS
  'Résumé activation terrain par flotte : téléphone profil et présence d’au moins un créneau conducteur.';

REVOKE ALL ON FUNCTION public.fleet_driver_activation_health(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fleet_driver_activation_health(uuid) TO authenticated;

COMMIT;
