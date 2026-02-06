# Guide des tests E2E manuels – Création de flotte

Ce document décrit les scénarios de test manuels à exécuter pour valider le flux complet de création de flotte et l’affichage sur toutes les pages concernées.

## Prérequis

- **Environnement** : `.env` configuré avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
- **Application** : `npm run dev` (serveur sur http://localhost:8080 par défaut).
- **Utilisateur** : compte Supabase Auth connecté (créer un compte ou utiliser un utilisateur de test).

---

## Scénario 1 : Création simple

**Objectif** : Créer une première flotte et vérifier toast, redirection et affichage sur Dashboard, Settings et Teams.

### Étapes

1. Se connecter à l’application avec un utilisateur test.
2. Aller sur **http://localhost:8080/dashboard/create-fleet**.
3. Remplir le formulaire :
   - **Nom de l’organisation** : ex. `Test Organisation`
   - **Code pays** : `CM`
   - **Nom de la flotte** : ex. `Flotte Principale`
   - **Politique de collecte** : Mixte (Espèces + Mobile Money)
4. Cliquer sur **Créer la flotte**.

### Vérifications

| # | Où | Critère | OK / KO |
|---|----|---------|---------|
| 1.1 | Toast | Un toast « Flotte créée avec succès » (ou équivalent) s’affiche. | |
| 1.2 | Navigation | Redirection automatique vers **/dashboard**. | |
| 1.3 | Console (F12) | Pas d’erreur ; logs du type `[CreateFleet] onSuccess`, `refreshMemberships() terminé`. | |
| 1.4 | **Dashboard** | La page Dashboard s’affiche sans redirection vers create-fleet ; blocs (stats, FleetOverview, etc.) visibles. | |
| 1.5 | **Dashboard** | Le nom ou les données de la flotte créée apparaissent (FleetOverview / stats cohérentes). | |
| 1.6 | **Settings** | Aller sur **/dashboard/settings** : la section liée à la flotte (membres, paramètres flotte) est visible et non vide. | |
| 1.7 | **Teams** | Aller sur **/dashboard/teams** : la liste des membres affiche au moins l’utilisateur courant (organizer). | |

**Résultat scénario 1** : __________ (OK / KO)

---

## Scénario 2 : Idempotence (création répétée)

**Objectif** : Recréer une flotte avec le **même** nom d’organisation et le **même** nom de flotte que le scénario 1. Vérifier qu’il n’y a pas d’erreur de contrainte unique et que le membership reste cohérent.

### Étapes

1. Rester connecté avec le même utilisateur.
2. Aller sur **http://localhost:8080/dashboard/create-fleet**.
3. Saisir **exactement** les mêmes valeurs que dans le scénario 1 :
   - Même nom d’organisation.
   - Même nom de flotte.
   - Même politique (ex. Mixte).
4. Cliquer sur **Créer la flotte**.

### Vérifications

| # | Où | Critère | OK / KO |
|---|----|---------|---------|
| 2.1 | Comportement | Soit succès (réutilisation de la flotte existante), soit message d’erreur explicite ; **aucun** crash ni erreur 500. | |
| 2.2 | Toast / UI | Un feedback utilisateur clair (succès ou erreur compréhensible). | |
| 2.3 | **Dashboard / Teams** | Après l’action, la flotte est toujours visible ; pas de perte de membership (l’utilisateur reste organizer). | |

**Résultat scénario 2** : __________ (OK / KO)

---

## Scénario 3 : Multi-flottes

**Objectif** : Créer une **deuxième** flotte (organisation et/ou nom de flotte différents) et vérifier que les deux flottes sont gérées correctement (memberships, listes, rôle).

### Étapes

1. Rester connecté avec le même utilisateur.
2. Aller sur **http://localhost:8080/dashboard/create-fleet**.
3. Remplir avec des valeurs **différentes** du scénario 1 :
   - **Nom de l’organisation** : ex. `Deuxième Organisation`
   - **Nom de la flotte** : ex. `Flotte Secondaire`
   - Politique au choix.
4. Cliquer sur **Créer la flotte**.

### Vérifications

| # | Où | Critère | OK / KO |
|---|----|---------|---------|
| 3.1 | Toast / Redirection | Succès et redirection vers **/dashboard**. | |
| 3.2 | **Dashboard** | Les données affichées correspondent à une flotte (celle courante : dernière créée ou première selon la règle métier). Pas d’écran vide ni d’erreur. | |
| 3.3 | **Settings / Profil** | Si l’app affiche les flottes de l’utilisateur (ex. liste des flottes, sélecteur), les **deux** flottes apparaissent. | |
| 3.4 | **Teams** | Sur **/dashboard/teams**, la flotte courante affiche au moins l’utilisateur comme membre ; pas d’incohérence (ex. liste vide alors qu’on a un rôle). | |
| 3.5 | Changement de flotte | Si un sélecteur de flotte existe : changer de flotte et vérifier que Dashboard / Teams / Settings se mettent à jour en conséquence. | |

**Résultat scénario 3** : __________ (OK / KO)

---

## Pages concernées – Synthèse

| Page | Route | Ce qu’il faut vérifier |
|------|--------|-------------------------|
| **Dashboard** | `/dashboard` | Pas de redirection vers create-fleet ; stats et FleetOverview cohérents avec la flotte courante. |
| **Settings** | `/dashboard/settings` | Section flotte/membres visible ; pas de blocage si `userFleetId` est défini. |
| **Teams** | `/dashboard/teams` | Liste des membres de la flotte courante ; organizer visible après création. |
| **Create Fleet** | `/dashboard/create-fleet` | Formulaire soumission → succès ou erreur claire ; pas d’erreur non gérée. |

---

## En cas d’échec

- **Console navigateur (F12)** : noter les erreurs JavaScript et les logs `[CreateFleet]`.
- **Réseau (onglet Network)** : vérifier les appels vers Supabase (RPC `creer_flotte_esamba`, `creer_ou_mettre_a_jour_adhesion_flotte`) et le code HTTP / corps de réponse.
- **Supabase** : Dashboard → Logs (Postgres / API) pour les erreurs SQL ou RPC autour de l’heure du test.
- **Base de données** : exécuter les requêtes de vérification ci-dessous (avec un compte ayant les droits nécessaires).

### Requêtes SQL de vérification (Supabase SQL Editor)

Après un test de création, pour un `user_id` donné (ex. `auth.uid()`) :

```sql
-- Dernières flottes et adhésions pour l'utilisateur courant
SELECT f.id AS fleet_id, f.name AS fleet_name, fa.role, fa.is_active, fa.id AS adhesion_id
FROM flotte_adhesions fa
JOIN flottes f ON f.id = fa.fleet_id
WHERE fa.user_id = auth.uid()
ORDER BY fa.created_at DESC;
```

---

## Tests d’intégration (optionnel)

Les tests dans `tests/integration/fleet-creation.test.ts` appellent les mêmes RPC que l’UI (`creer_flotte_esamba`, `creer_ou_mettre_a_jour_adhesion_flotte`). Ils nécessitent des variables d’environnement Supabase et un utilisateur authentifié (session). Pour les exécuter en local :

```bash
npm run test:integration
```

En l’absence de session (ex. CI sans auth), les tests qui dépendent de `supabase.auth.getUser()` peuvent échouer ; les tests manuels décrits ci-dessus restent la référence pour valider le flux complet.

## Non-régression

Après toute modification des RPC (`creer_flotte_esamba`, `creer_ou_mettre_a_jour_adhesion_flotte`), des politiques RLS sur `flotte_adhesions` ou du flux dans `CreateFleet.tsx`, rejouer au minimum le **scénario 1** pour valider qu’une création simple fonctionne toujours.
