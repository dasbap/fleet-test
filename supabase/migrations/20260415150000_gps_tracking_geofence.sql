BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_type') THEN
    ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'geofence_exit';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gps_tracker_protocol') THEN
    CREATE TYPE public.gps_tracker_protocol AS ENUM ('tk103', 'concox');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'geofence_type') THEN
    CREATE TYPE public.geofence_type AS ENUM ('circle', 'polygon');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'geofence_event_type') THEN
    CREATE TYPE public.geofence_event_type AS ENUM ('enter', 'exit');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.gps_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  imei text NOT NULL,
  protocol public.gps_tracker_protocol NOT NULL,
  label text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gps_devices_imei_unique UNIQUE (imei)
);

CREATE TABLE IF NOT EXISTS public.vehicle_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  tracker_imei text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  speed_kmh double precision NULL,
  heading double precision NULL,
  altitude_m double precision NULL,
  tracker_time timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  raw_payload text NULL
);

CREATE TABLE IF NOT EXISTS public.vehicle_positions_latest (
  vehicle_id uuid PRIMARY KEY REFERENCES public.vehicules(id) ON DELETE CASCADE,
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  tracker_imei text NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  speed_kmh double precision NULL,
  heading double precision NULL,
  altitude_m double precision NULL,
  tracker_time timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.geofences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  name text NOT NULL,
  geofence_type public.geofence_type NOT NULL DEFAULT 'circle',
  center_lat double precision NULL,
  center_lng double precision NULL,
  radius_m integer NULL,
  polygon_geojson jsonb NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.geofence_vehicle_states (
  geofence_id uuid NOT NULL REFERENCES public.geofences(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  is_inside boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (geofence_id, vehicle_id)
);

CREATE TABLE IF NOT EXISTS public.geofence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  geofence_id uuid NOT NULL REFERENCES public.geofences(id) ON DELETE CASCADE,
  event_type public.geofence_event_type NOT NULL,
  occurred_at timestamptz NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  tracker_imei text NULL,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gps_ingest_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NULL REFERENCES public.flottes(id) ON DELETE SET NULL,
  imei text NULL,
  status text NOT NULL,
  reason text NULL,
  payload jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gps_devices_fleet_id ON public.gps_devices(fleet_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_positions_vehicle_time ON public.vehicle_positions(vehicle_id, tracker_time DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_positions_fleet_time ON public.vehicle_positions(fleet_id, tracker_time DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_positions_latest_fleet ON public.vehicle_positions_latest(fleet_id);
CREATE INDEX IF NOT EXISTS idx_geofences_fleet_active ON public.geofences(fleet_id, is_active);
CREATE INDEX IF NOT EXISTS idx_geofence_events_fleet_occurred ON public.geofence_events(fleet_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_ingest_logs_created ON public.gps_ingest_logs(created_at DESC);

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

DROP TRIGGER IF EXISTS trg_geofences_updated_at ON public.geofences;
CREATE TRIGGER trg_geofences_updated_at
BEFORE UPDATE ON public.geofences
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_tracking();

DROP TRIGGER IF EXISTS trg_vehicle_positions_latest_updated_at ON public.vehicle_positions_latest;
CREATE TRIGGER trg_vehicle_positions_latest_updated_at
BEFORE UPDATE ON public.vehicle_positions_latest
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_tracking();

CREATE OR REPLACE FUNCTION public.raise_geofence_exit_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message text;
BEGIN
  IF NEW.event_type <> 'exit' THEN
    RETURN NEW;
  END IF;

  SELECT 'Sortie de zone: ' || g.name || ' (' || v.registration || ')'
  INTO v_message
  FROM public.geofences g
  JOIN public.vehicules v ON v.id = NEW.vehicle_id
  WHERE g.id = NEW.geofence_id;

  IF v_message IS NULL THEN
    v_message := 'Sortie de zone détectée';
  END IF;

  INSERT INTO public.alertes_automatiques (
    fleet_id,
    alert_type,
    vehicle_id,
    severity,
    message,
    resolved,
    created_at
  )
  VALUES (
    NEW.fleet_id,
    'geofence_exit',
    NEW.vehicle_id,
    'high',
    v_message,
    false,
    now()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_geofence_exit_alert ON public.geofence_events;
CREATE TRIGGER trg_geofence_exit_alert
AFTER INSERT ON public.geofence_events
FOR EACH ROW
EXECUTE FUNCTION public.raise_geofence_exit_alert();

ALTER TABLE public.gps_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_positions_latest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_vehicle_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_ingest_logs ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY gps_devices_write_policy
ON public.gps_devices
FOR ALL
USING (public.has_role(fleet_id, 'organizer'::public.role_type) OR public.has_role(fleet_id, 'manager'::public.role_type))
WITH CHECK (public.has_role(fleet_id, 'organizer'::public.role_type) OR public.has_role(fleet_id, 'manager'::public.role_type));

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

CREATE POLICY geofences_select_policy
ON public.geofences
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = geofences.fleet_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
  )
);

CREATE POLICY geofences_write_policy
ON public.geofences
FOR ALL
USING (public.has_role(fleet_id, 'organizer'::public.role_type) OR public.has_role(fleet_id, 'manager'::public.role_type))
WITH CHECK (public.has_role(fleet_id, 'organizer'::public.role_type) OR public.has_role(fleet_id, 'manager'::public.role_type));

CREATE POLICY geofence_states_select_policy
ON public.geofence_vehicle_states
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = geofence_vehicle_states.fleet_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
  )
);

CREATE POLICY geofence_events_select_policy
ON public.geofence_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = geofence_events.fleet_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
  )
);

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

COMMIT;
