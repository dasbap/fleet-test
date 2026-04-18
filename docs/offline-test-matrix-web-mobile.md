# Matrice de tests — Offline core Web + Mobile

## Objectif
Valider la fiabilité de la couche offline commune (`offline-core`) avant extension métier.

## Périmètre
- Noyau partagé: `packages/offline-core`
- Web adapter: `src/lib/offline/adapters/webOfflineQueue.adapter.ts`
- Mobile adapter: `apps/mobile/offline/adapters/mmkvQueue.adapter.ts`
- Hook mobile: `apps/mobile/hooks/useOfflineStore.ts`

## Tests unitaires (obligatoires)
- Queue FIFO: ordre d’exécution conservé.
- Retry policy: backoff + passage en `failed` après `maxAttempts`.
- Statistiques queue: `pending`, `syncing`, `failed`, `oldestPendingAgeMs`.
- Cache véhicule LRU: upsert, borne max, filtre récence.

## Tests d’intégration Web (obligatoires)
- `OfflineQueueService` continue de fonctionner via `offline-core`.
- `runOfflineSyncOnce` traite bien `incident:create`, `shift:start`, `shift:close`, `fuel:create`.
- Régression zéro sur invalidation cache côté bridge de sync.

## Tests d’intégration Mobile (avant mise en production mobile)
- Persist QueryClient au redémarrage (MMKV).
- `NetInfo` online -> flush automatique FIFO.
- Retour app foreground -> flush si online.
- `is2G` correctement calculé sur réseau cellulaire instable.

## Tests réseau dégradé (2G/3G)
- Latence haute + pertes intermittentes: pas de corruption queue.
- Retry progressif et arrêt propre après seuil.
- Vérifier baisse des appels réseau avec `staleTime=5min`.

## Métriques de monitoring
- Taille de queue (gauge).
- Âge max d’un job pending (ms).
- Taux de succès des flush (%).
- Nombre moyen de retries/job.
- Durée moyenne de flush (ms).
