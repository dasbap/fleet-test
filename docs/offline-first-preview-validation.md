# Preview locale — validation offline-first E-Samba

Document de validation avant déploiement terrain (phase preview du plan offline-first).

## 1. Spike compression Android (Capacitor)

- Service : [`src/services/image-compression.service.ts`](../src/services/image-compression.service.ts)
- Stockage médias : [`src/services/offline-media-storage.service.ts`](../src/services/offline-media-storage.service.ts)
- Critère : photo < 500 Ko après compression JPEG 1280px / qualité 0.7

## 2. Maquettes Expo (wireframes textuels)

| Écran | Route Expo | UX |
|-------|------------|-----|
| Connexion | `/(auth)/login` | Email + mot de passe, gros bouton vert |
| Hub terrain | `/(terrain)` | 4 actions : Ouvrir / Clôturer / Incident / DVIR |
| Sync | `/(terrain)/sync-status` | Badge pending/failed + bouton Synchroniser |

## 3. Draft SQL idempotency

Migration : [`supabase/migrations/20260626120000_offline_client_idempotency.sql`](../supabase/migrations/20260626120000_offline_client_idempotency.sql)

## 4. Matrice conflits

Voir [`packages/domain-sync/src/conflicts.ts`](../packages/domain-sync/src/conflicts.ts)

## 5. Scénario manuel 24h offline (Go/No-Go)

1. Mode avion ON
2. Ouvrir créneau (KM début)
3. Déclarer incident avec photo
4. Créer DVIR avec photo
5. Clôturer journée avec preuve photo
6. Mode avion OFF (2G simulé)
7. Vérifier sync 100 % + journal local `synced`

**Gate** : `offline_sync_success_rate` ≥ 98 % sur 5 actions.

## 6. Checklist produit

- [ ] Spike compression validé sur Android mid-range
- [ ] Maquettes Expo approuvées
- [ ] Migration SQL revue DBA
- [ ] Scénario 24h exécuté sans perte de données
