-- Restore geofencing runtime objects expected by /dashboard/geofencing.
-- Some baseline environments missed the historical GPS/geofence migration, so
-- the app receives PostgREST 404 errors for public.geofences.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'alert_type'
  ) THEN
    ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'geofence_enter';
    ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'geofence_exit';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'geofence_type'
  ) THEN
    CREATE TYPE public.geofence_type AS ENUM ('circle', 'polygon');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'geofence_event_type'
  ) THEN
    CREATE TYPE public.geofence_event_type AS ENUM ('enter', 'exit');
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.geofences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  name text NOT NULL,
  geofence_type public.geofence_type NOT NULL DEFAULT 'circle',
  center_lat double precision,
  center_lng double precision,
  radius_m integer,
  polygon_geojson jsonb,
  alert_on_enter boolean NOT NULL DEFAULT true,
  alert_on_exit boolean NOT NULL DEFAULT true,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.geofences
  ADD COLUMN IF NOT EXISTS alert_on_enter boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_on_exit boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS description text;

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
  tracker_imei text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geofences_fleet_active
  ON public.geofences(fleet_id, is_active);

CREATE INDEX IF NOT EXISTS idx_geofence_events_fleet_occurred
  ON public.geofence_events(fleet_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_geofence_events_geofence_occurred
  ON public.geofence_events(geofence_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at_tracking()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_geofences_updated_at ON public.geofences;
CREATE TRIGGER trg_geofences_updated_at
BEFORE UPDATE ON public.geofences
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_tracking();

CREATE OR REPLACE VIEW public.v_geofences_with_stats AS
SELECT
  g.*,
  COALESCE(ev.event_count, 0) AS event_count_7d,
  ev.last_event_at
FROM public.geofences g
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS event_count,
    MAX(e.occurred_at) AS last_event_at
  FROM public.geofence_events e
  WHERE e.geofence_id = g.id
    AND e.occurred_at >= now() - INTERVAL '7 days'
) ev ON true;

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
  WHERE g.id = NEW.geofence_id
    AND COALESCE(g.alert_on_exit, true);

  IF v_message IS NULL THEN
    RETURN NEW;
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

ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_vehicle_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS geofences_select_policy ON public.geofences;
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

DROP POLICY IF EXISTS geofences_write_policy ON public.geofences;
CREATE POLICY geofences_write_policy
ON public.geofences
FOR ALL
USING (public.has_role(fleet_id, 'organizer'::public.role_type) OR public.has_role(fleet_id, 'manager'::public.role_type))
WITH CHECK (public.has_role(fleet_id, 'organizer'::public.role_type) OR public.has_role(fleet_id, 'manager'::public.role_type));

DROP POLICY IF EXISTS geofence_states_select_policy ON public.geofence_vehicle_states;
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

DROP POLICY IF EXISTS geofence_events_select_policy ON public.geofence_events;
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

GRANT USAGE ON TYPE public.geofence_type TO authenticated;
GRANT USAGE ON TYPE public.geofence_event_type TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.geofences TO authenticated;
GRANT SELECT ON public.geofence_vehicle_states TO authenticated;
GRANT SELECT ON public.geofence_events TO authenticated;
GRANT SELECT ON public.v_geofences_with_stats TO authenticated;

NOTIFY pgrst, 'reload schema';
