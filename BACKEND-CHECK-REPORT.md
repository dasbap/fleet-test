# Rapport d’examen du backend - Smart Fleet Africa

## Résumé général

- ✅ **Configuration Supabase** : conforme et sécurisée
- ✅ **Dépendances principales** : installées et à jour
- ⚠️ **Fonctions RPC manquantes** : 3 fonctions nécessaires absentes du schéma
- ⚠️ **Incohérences schéma/implémentation** : plusieurs différences à corriger entre code et base

## 1. Examen configuration Supabase

- `.env.local` complet et bien renseigné
- Client Supabase côté frontend : variables d'environnement (pas de valeurs codées en dur)
- Validation des variables à l'initialisation
- RLS activée et configuration respectée

Détail :
- **Client** : `src/integrations/supabase/client.ts`
- **Variables** : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Stockage session** : localStorage
- **Refresh automatique de la session** : activé

## 2. Examen des Fonctions RPC

### Fonctions opérationnelles

- `assign_vehicle` : définie et utilisée (OK)
- `close_shift` : idem, opérationnelle

### Fonctions attendues mais manquantes

- `accept_invitation`
  - Utilisée dans `src/hooks/useAcceptInvitation.ts`
  - Absente sur la BDD : empêcher l’acceptation d’invitation côté frontend.
  - Action : créer la fonction RPC/adopter une alternative.

- `check_system_health`
  - Utilisée dans `src/hooks/useSystemHealth.ts` (fallback existant)
  - Absente du schéma : la vérification santé n’est que partielle par fallback.
  - Action : ajouter la RPC pour la vérification complète.

- `repair_orphan_membership`
  - Utilisée dans `src/hooks/useSystemHealth.ts`
  - Fonction absente : réparation des memberships orphelins impossible.
  - Action : créer la RPC dédiée.

### Fonctions prêtes mais pas encore intégrées

- `check_orphaned_data`, `cleanup_orphaned_data` – présentes dans `supabase/rpc-consistency.sql`

## 3. Examen des tables

- Toutes les tables métiers principales sont présentes et alignées avec le besoin.
- ✅ : `orgs`, `fleets`, `profiles`, `fleet_memberships`, `fleet_invitations`, `vehicles`, `driver_vehicle_assignments`, `driver_shifts`, `driver_shift_closures`, `incidents`, `maintenance_jobs`, `maintenance_evidence`, `maintenance_checklists`
- ⚠️ **avatars** : attendue pour l’upload dans `ProfileEditForm.tsx`, mais absente. Action : créer la table ou passer au stockage Supabase Storage natif.

### Vérification Storage

- Bucket `maintenance-evidence` appelé
- Penser à vérifier/créer le bucket côté Supabase Dashboard

## 4. Incohérences schéma / code

### Divergences identifiées

1. **Table `driver_shifts`**
   - Code utilise : `driver_id`, `vehicle_id`, `fleet_id`, `start_time`, `end_time`, `start_km`, `end_km`, `plate_number`
   - Schéma réel : `assignment_id`, `km_start`, `km_end`, `started_at`, `ended_at`
   - Impact : requêtes échouent (fields absents)
   - Action : harmoniser le code sur le schéma (urgente)

2. **Table `vehicles`**
   - Champ code : `plate_number`. Schéma réel : `registration`
   - Action : remplacer dans tout le code par `registration` pour cohérence.

3. **Table `driver_shift_closures`**
   - Code : `driver_id`, `vehicle_id`, `end_km`, `total_revenue`, `cash_amount`, `momo_amount`, `photo_url`
   - Schéma : `shift_id`, `revenue_declared`, `collection_mode`, `proof_type`, `proof_value`
   - Impact : la clôture échoue
   - Action : adapter le code aux champs du schéma

## 5. Revue des hooks backend

- 8 hooks principaux détectés
- Tous présents, mais `useDriverShifts.ts` présente des incohérences de schéma

## 6. Vérification des dépendances

- `@supabase/supabase-js` et `@tanstack/react-query` aux bonnes versions

## Recommandations d’actions suite à l’examen

### 🔴 Urgence
1. Aligner `useDriverShifts.ts` sur le schéma SQL réel.
2. Corriger le formulaire de clôture (`ShiftClosureForm.tsx`) pour matcher les champs de la table.
3. Créer la RPC `accept_invitation`.

### 🟡 Moyenne
4. Créer les autres RPC manquantes (`check_system_health`, `repair_orphan_membership`).
5. Vérifier/créer le bucket `maintenance-evidence`.
6. Créer la table `avatars` ou migrer vers le stockage natif d’images.

### 🟢 Faible
7. Documenter l’ensemble des fonctions RPC pour la maintenance future.
8. Ajouter des tests unitaires pour les hooks backend.

## Commandes d’examen rapide

```bash
npm run check:supabase
powershell -ExecutionPolicy Bypass -File scripts/check-backend.ps1
```

## Prochaines étapes

1. Corriger toutes les incohérences schéma/implémentation détectées
2. Créer et tester les fonctions RPC référencées mais absentes
3. Valider toutes les opérations backend avec des tests manuels et unitaires
4. Rédiger la documentation des API et RPC exposées
