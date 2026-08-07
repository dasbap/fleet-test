-- Restore GPS tracking runtime objects expected by /dashboard/tracking.
-- Some baseline environments missed the historical GPS/geofence migration, so
-- the app receives PostgREST 404 errors for public.vehicle_positions_latest.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'gps_tracker_protocol'
  ) THEN
    CREATE TYPE public.gps_tracker_protocol AS ENUM ('tk103', 'concox');
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.gps_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  imei text NOT NULL,
  protocol public.gps_tracker_protocol NOT NULL,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gps_devices_imei_unique UNIQUE (imei)
);

ALTER TABLE public.gps_devices
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.vehicle_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  tracker_imei text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  speed_kmh double precision,
  heading double precision,
  altitude_m double precision,
  tracker_time timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  raw_payload text
);

CREATE TABLE IF NOT EXISTS public.vehicle_positions_latest (
  vehicle_id uuid PRIMARY KEY REFERENCES public.vehicules(id) ON DELETE CASCADE,
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  tracker_imei text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  speed_kmh double precision,
  heading double precision,
  altitude_m double precision,
  tracker_time timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_positions_latest
  ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS tracker_imei text,
  ADD COLUMN IF NOT EXISTS speed_kmh double precision,
  ADD COLUMN IF NOT EXISTS heading double precision,
  ADD COLUMN IF NOT EXISTS altitude_m double precision,
  ADD COLUMN IF NOT EXISTS received_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.gps_ingest_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid REFERENCES public.flottes(id) ON DELETE SET NULL,
  imei text,
  status text NOT NULL,
  reason text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gps_devices_fleet_id
  ON public.gps_devices(fleet_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_positions_vehicle_time
  ON public.vehicle_positions(vehicle_id, tracker_time DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_positions_fleet_time
  ON public.vehicle_positions(fleet_id, tracker_time DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_positions_latest_fleet
  ON public.vehicle_positions_latest(fleet_id);

CREATE INDEX IF NOT EXISTS idx_gps_ingest_logs_created
  ON public.gps_ingest_logs(created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at_tracking()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gps_devices_updated_at ON public.gps_devices;
CREATE TRIGGER trg_gps_devices_updated_at
BEFORE UPDATE ON public.gps_devices
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_tracking();

DROP TRIGGER IF EXISTS trg_vehicle_positions_latest_updated_at ON public.vehicle_positions_latest;
CREATE TRIGGER trg_vehicle_positions_latest_updated_at
BEFORE UPDATE ON public.vehicle_positions_latest
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_tracking();

ALTER TABLE public.gps_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_positions_latest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_ingest_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gps_devices_select_policy ON public.gps_devices;
CREATE POLICY gps_devices_select_policy
ON public.gps_devices
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = gps_devices.fleet_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
  )
);

DROP POLICY IF EXISTS gps_devices_write_policy ON public.gps_devices;
CREATE POLICY gps_devices_write_policy
ON public.gps_devices
FOR ALL
USING (public.has_role(fleet_id, 'organizer'::public.role_type) OR public.has_role(fleet_id, 'manager'::public.role_type))
WITH CHECK (public.has_role(fleet_id, 'organizer'::public.role_type) OR public.has_role(fleet_id, 'manager'::public.role_type));

DROP POLICY IF EXISTS vehicle_positions_select_policy ON public.vehicle_positions;
CREATE POLICY vehicle_positions_select_policy
ON public.vehicle_positions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = vehicle_positions.fleet_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
  )
);

DROP POLICY IF EXISTS vehicle_positions_latest_select_policy ON public.vehicle_positions_latest;
CREATE POLICY vehicle_positions_latest_select_policy
ON public.vehicle_positions_latest
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = vehicle_positions_latest.fleet_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
  )
);

DROP POLICY IF EXISTS gps_ingest_logs_select_policy ON public.gps_ingest_logs;
CREATE POLICY gps_ingest_logs_select_policy
ON public.gps_ingest_logs
FOR SELECT
USING (
  fleet_id IS NULL
  OR EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = gps_ingest_logs.fleet_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
  )
);

GRANT USAGE ON TYPE public.gps_tracker_protocol TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gps_devices TO authenticated;
GRANT SELECT ON public.vehicle_positions TO authenticated;
GRANT SELECT ON public.vehicle_positions_latest TO authenticated;
GRANT SELECT ON public.gps_ingest_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gps_devices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_positions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_positions_latest TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gps_ingest_logs TO service_role;

NOTIFY pgrst, 'reload schema';
