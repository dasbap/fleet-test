SELECT
  schemaname,
  relname AS tablename,
  SUM(idx_scan)      AS total_idx_scan,
  SUM(idx_tup_read)  AS total_idx_tup_read,
  SUM(idx_tup_fetch) AS total_idx_tup_fetch
FROM pg_stat_user_indexes
WHERE relname IN ('fleet_memberships', 'fleets', 'fleet_invitations')
GROUP BY schemaname, relname
ORDER BY total_idx_scan DESC;

-- Vérification des index rarement ou jamais utilisés
-- Permet d'identifier les tables où les index ne sont pas exploités
-- Affiche les index avec moins de 10 utilisations (modifiable)
SELECT
  schemaname,
  relname AS tablename,
  indexrelname AS index_name,
  idx_scan AS nombre_utilisations
FROM pg_stat_user_indexes
WHERE relname IN ('fleet_memberships', 'fleets', 'fleet_invitations')
  AND idx_scan < 10
ORDER BY idx_scan ASC;