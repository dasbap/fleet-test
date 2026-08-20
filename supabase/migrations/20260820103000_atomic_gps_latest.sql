BEGIN;

CREATE OR REPLACE FUNCTION public.gps_upsert_latest_position(
  p_fleet_id uuid,
  p_vehicle_id uuid,
  p_tracker_imei text,
  p_latitude double precision,
  p_longitude double precision,
  p_speed_kmh double precision,
  p_heading double precision,
  p_altitude_m double precision,
  p_tracker_time timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_written integer;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.vehicle_positions_latest (
    fleet_id,
    vehicle_id,
    tracker_imei,
    latitude,
    longitude,
    speed_kmh,
    heading,
    altitude_m,
    tracker_time,
    received_at
  ) VALUES (
    p_fleet_id,
    p_vehicle_id,
    p_tracker_imei,
    p_latitude,
    p_longitude,
    p_speed_kmh,
    p_heading,
    p_altitude_m,
    p_tracker_time,
    now()
  )
  ON CONFLICT (vehicle_id) DO UPDATE SET
    fleet_id = EXCLUDED.fleet_id,
    tracker_imei = EXCLUDED.tracker_imei,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    speed_kmh = EXCLUDED.speed_kmh,
    heading = EXCLUDED.heading,
    altitude_m = EXCLUDED.altitude_m,
    tracker_time = EXCLUDED.tracker_time,
    received_at = EXCLUDED.received_at
  WHERE EXCLUDED.tracker_time > public.vehicle_positions_latest.tracker_time;

  GET DIAGNOSTICS v_written = ROW_COUNT;
  RETURN v_written = 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.gps_upsert_latest_position(
  uuid, uuid, text, double precision, double precision, double precision,
  double precision, double precision, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gps_upsert_latest_position(
  uuid, uuid, text, double precision, double precision, double precision,
  double precision, double precision, timestamptz
) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
