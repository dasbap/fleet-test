-- Geofencing alerts: persist both enter and exit events as operational alerts.

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
END;
$$;

ALTER TABLE IF EXISTS public.geofences
  ADD COLUMN IF NOT EXISTS alert_on_enter boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_on_exit boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.raise_geofence_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message text;
  v_alert_type public.alert_type;
BEGIN
  IF NEW.event_type = 'enter' THEN
    v_alert_type := 'geofence_enter';

    SELECT 'Entree de zone: ' || g.name || ' (' || v.registration || ')'
    INTO v_message
    FROM public.geofences g
    JOIN public.vehicules v ON v.id = NEW.vehicle_id
    WHERE g.id = NEW.geofence_id
      AND COALESCE(g.alert_on_enter, true);
  ELSIF NEW.event_type = 'exit' THEN
    v_alert_type := 'geofence_exit';

    SELECT 'Sortie de zone: ' || g.name || ' (' || v.registration || ')'
    INTO v_message
    FROM public.geofences g
    JOIN public.vehicules v ON v.id = NEW.vehicle_id
    WHERE g.id = NEW.geofence_id
      AND COALESCE(g.alert_on_exit, true);
  ELSE
    RETURN NEW;
  END IF;

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
    v_alert_type,
    NEW.vehicle_id,
    CASE WHEN NEW.event_type = 'exit' THEN 'high' ELSE 'medium' END,
    v_message,
    false,
    now()
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.raise_geofence_exit_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.raise_geofence_alert();
END;
$$;

DROP TRIGGER IF EXISTS trg_geofence_exit_alert ON public.geofence_events;
CREATE TRIGGER trg_geofence_exit_alert
AFTER INSERT ON public.geofence_events
FOR EACH ROW
EXECUTE FUNCTION public.raise_geofence_alert();

NOTIFY pgrst, 'reload schema';
