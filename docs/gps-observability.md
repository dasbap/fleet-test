# Monitoring GPS low-cost

## Objectif

Assurer la fiabilité de l’ingestion TK103/Concox et réduire les faux positifs geofence.

## Métriques minimales

- `gps_ingest_messages_total`: nombre total de trames reçues.
- `gps_ingest_invalid_total`: trames rejetées (IMEI inconnu, payload invalide).
- `gps_ingest_lag_seconds`: retard entre `tracker_time` et `received_at`.
- `geofence_exit_events_total`: sorties de zones détectées.
- `fleet_position_fresh_ratio_5m`: part des véhicules avec position < 5 minutes.

## Requêtes SQL de contrôle

```sql
-- Messages acceptés/rejetés sur 24h
SELECT
  status,
  COUNT(*) AS total
FROM public.gps_ingest_logs
WHERE created_at >= now() - interval '24 hours'
GROUP BY status;

-- Latence moyenne d'ingestion (secondes) sur 1h
SELECT
  AVG(EXTRACT(EPOCH FROM (received_at - tracker_time))) AS avg_lag_seconds
FROM public.vehicle_positions
WHERE received_at >= now() - interval '1 hour';

-- Couverture live: véhicules avec position récente (<5 min)
WITH latest AS (
  SELECT fleet_id, vehicle_id, MAX(tracker_time) AS last_tracker_time
  FROM public.vehicle_positions
  GROUP BY fleet_id, vehicle_id
)
SELECT
  fleet_id,
  COUNT(*) FILTER (WHERE last_tracker_time >= now() - interval '5 minutes') AS fresh_vehicles,
  COUNT(*) AS total_vehicles
FROM latest
GROUP BY fleet_id;
```

## Seuils d’alerte recommandés (MVP)

- `gps_ingest_invalid_total / gps_ingest_messages_total > 5%` sur 15 min.
- `gps_ingest_lag_seconds > 180` secondes en moyenne sur 10 min.
- `fleet_position_fresh_ratio_5m < 70%` pendant 20 min.
- `geofence_exit_events_total` brutalement multiplié par 3 (possible drift GPS ou zone mal configurée).

## Journaux clés

- Table `gps_ingest_logs` pour traçabilité des rejets.
- Logs Edge Function `gps-ingest` (validation et erreurs d’écriture).
- Logs `gps-tcp-gateway` (trames non reconnues ou HTTP ingestion en échec).
