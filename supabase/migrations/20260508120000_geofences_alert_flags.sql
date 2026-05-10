BEGIN;

-- Ajout colonnes alertes sur la table geofences existante
ALTER TABLE public.geofences
  ADD COLUMN IF NOT EXISTS alert_on_enter boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_on_exit  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS description    text;

-- Vue utilitaire : geofences avec compteur d'événements (7 jours)
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
) ev ON true;

COMMIT;
