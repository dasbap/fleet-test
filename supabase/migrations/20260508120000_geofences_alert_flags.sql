BEGIN;

-- Idempotent : skip si le module geofences n'est pas déployé sur cette base.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'geofences'
  ) THEN
    RAISE NOTICE 'geofences absent — migration 20260508120000 ignorée';
    RETURN;
  END IF;

  ALTER TABLE public.geofences
    ADD COLUMN IF NOT EXISTS alert_on_enter boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS alert_on_exit  boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS description    text;
END $$;

-- Vue utilitaire (uniquement si geofences + geofence_events existent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'geofences'
  ) AND EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'geofence_events'
  ) THEN
    EXECUTE $v$
      CREATE OR REPLACE VIEW public.v_geofences_with_stats AS
      SELECT
        g.*,
        COALESCE(ev.event_count, 0) AS event_count_7d,
        ev.last_event_at
      FROM public.geofences g
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)            AS event_count,
          MAX(e.occurred_at)  AS last_event_at
        FROM public.geofence_events e
        WHERE e.geofence_id = g.id
          AND e.occurred_at >= now() - INTERVAL '7 days'
      ) ev ON true
    $v$;
  END IF;
END $$;

COMMIT;
