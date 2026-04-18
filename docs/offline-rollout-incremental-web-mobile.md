# Rollout incrémental — Offline Web + Mobile

## Phase 1 — Stabilisation Web (immédiat)
- Brancher `OfflineQueueService` sur `offline-core` (déjà fait).
- Exécuter tests unitaires ciblés + orchestrateur sync.
- Déployer uniquement web après validation QA.

## Phase 2 — Activation Mobile technique
- Intégrer `apps/mobile/hooks/useOfflineStore.ts` dans l’app RN.
- Brancher un exécuteur métier basé sur services (pas d’appel direct UI -> Supabase).
- Vérifier persistance MMKV et reprise sync.

## Phase 3 — Durcissement production
- Activer dashboards de métriques offline.
- Définir seuils d’alerte (queue trop grande, échecs répétés).
- Lancer test campagne 2G/3G sur devices cibles.

## Garde-fous anti-régression
- Feature flag mobile pour activer le nouveau flux par cohorte.
- Conserver fallback web actuel pendant la montée en charge.
- Vérifier strictement les types de jobs supportés avant extension.

## Risques et mitigation
- Divergence schéma jobs web/mobile -> versionner `schemaVersion`.
- Duplications à la reconnexion -> idempotency key obligatoire.
- Saturation queue hors couverture longue -> limite `maxQueueSize` + message utilisateur.
