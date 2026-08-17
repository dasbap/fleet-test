-- GPS speeding alerts with per-device speed limits and duplicate suppression.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'alert_type'
  ) THEN
    ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'speeding';
  END IF;
END;
$$;

ALTER TABLE IF EXISTS public.gps_devices
  ADD COLUMN IF NOT EXISTS speed_limit_kmh integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS speed_alert_tolerance_kmh integer NOT NULL DEFAULT 5;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gps_devices_speed_limit_kmh_check'
      AND conrelid = 'public.gps_devices'::regclass
  ) THEN
    ALTER TABLE public.gps_devices
      ADD CONSTRAINT gps_devices_speed_limit_kmh_check
      CHECK (speed_limit_kmh BETWEEN 10 AND 180) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gps_devices_speed_alert_tolerance_kmh_check'
      AND conrelid = 'public.gps_devices'::regclass
  ) THEN
    ALTER TABLE public.gps_devices
      ADD CONSTRAINT gps_devices_speed_alert_tolerance_kmh_check
      CHECK (speed_alert_tolerance_kmh BETWEEN 0 AND 40) NOT VALID;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gps_devices_speed_limit_kmh_check'
      AND conrelid = 'public.gps_devices'::regclass
      AND NOT convalidated
  ) THEN
    ALTER TABLE public.gps_devices VALIDATE CONSTRAINT gps_devices_speed_limit_kmh_check;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gps_devices_speed_alert_tolerance_kmh_check'
      AND conrelid = 'public.gps_devices'::regclass
      AND NOT convalidated
  ) THEN
    ALTER TABLE public.gps_devices VALIDATE CONSTRAINT gps_devices_speed_alert_tolerance_kmh_check;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.vehicle_speed_states (
  vehicle_id uuid PRIMARY KEY REFERENCES public.vehicules(id) ON DELETE CASCADE,
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  tracker_imei text NULL,
  is_speeding boolean NOT NULL DEFAULT false,
  speed_kmh double precision NULL,
  speed_limit_kmh integer NOT NULL,
  threshold_kmh integer NOT NULL,
  tracker_time timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_speed_states_fleet
  ON public.vehicle_speed_states(fleet_id);

ALTER TABLE public.vehicle_speed_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vehicle_speed_states_select_policy ON public.vehicle_speed_states;
CREATE POLICY vehicle_speed_states_select_policy
ON public.vehicle_speed_states
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = vehicle_speed_states.fleet_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
  )
);

GRANT SELECT ON public.vehicle_speed_states TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_speed_states TO service_role;

NOTIFY pgrst, 'reload schema';
