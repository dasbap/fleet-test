# EXAMEN DES PROBLÈMES BACKEND

## 🔴 Problèmes critiques à examiner

### 1. Divergence `useDriverShifts.ts` vs schéma SQL

- **Fichier concerné** : `src/hooks/useDriverShifts.ts`
- **Constat** : Le hook référence des colonnes inexistantes dans la BDD (ex : `driver_id`, `vehicle_id`, `fleet_id`, `start_time`, `end_time`, `start_km`, `end_km`, `plate_number` pour vehicles).
- **Attendu schéma** :
  - `assignment_id` (jointure table `driver_vehicle_assignments`)
  - `km_start`, `km_end`
  - `started_at`, `ended_at`
  - `status` (`open` | `closed`)
  - `registration` (pour véhicules)
- **À examiner** :
  - Refactorer le hook pour respecter le nommage et les relations du schéma existant, sous peine d’échec systématique des opérations shifts.

### 2. Interface TypeScript non synchro : `ShiftClosureForm.tsx`

- **Fichier concerné** : `src/components/driver/ShiftClosureForm.tsx`
- **Constat** : Utilisation correcte de la RPC `close_shift` mais désalignement des types côté TS.
- **À examiner** :
  - Adapter les interfaces TypeScript pour qu’elles correspondent à la structure renvoyée par la fonction SQL.

## 🟡 Problèmes moyens à examiner

### 3. Fonctions RPC manquantes

- `accept_invitation` (utilisée dans `src/hooks/useAcceptInvitation.ts`)
- `check_system_health` (utilisée dans `src/hooks/useSystemHealth.ts`)
- `repair_orphan_membership` (utilisée dans `src/hooks/useSystemHealth.ts`)
- **À examiner** : Créer ces RPC pour activer pleinement les workflows correspondants.

### 4. Table `avatars` absente

- **Impact** : L’upload d’avatar via `src/components/profile/ProfileEditForm.tsx` pourrait échouer.
- **À examiner** : Créer la table ou basculer sur Supabase Storage natif.

### 5. Bucket Storage `maintenance-evidence` non garanti

- **Impact** : Upload de fichiers de maintenance possible uniquement si le bucket existe/configuré.
- **À examiner** : Vérifier dans Supabase Dashboard, créer/configurer si absent.

## ✅ Points positifs (constatés lors de l’examen)

- Configuration Supabase OK
- Variables d’environnement bien sécurisées
- Tables principales présentes
- RPC `assign_vehicle` et `close_shift` opérationnelles
- Usage cohérent de React Query
- Gestion des erreurs existante

## EXAMEN - Actions à prioriser

1. **Corriger `useDriverShifts.ts`** : Noms de colonnes + jointures conformes au schéma
2. **Créer ou compléter les fonctions RPC manquantes** (`accept_invitation`, `check_system_health`, `repair_orphan_membership`)
3. **Vérifier création/configuration du bucket** `maintenance-evidence` dans Storage

## Commandes d’audit à exécuter

```bash
# Examen complet backend
powershell -ExecutionPolicy Bypass -File scripts/check-backend.ps1

# Vérification Supabase
npm run check:supabase
```

