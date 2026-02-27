# Vérification de la connexion avec la base de données

Ce document décrit comment vérifier la connexion à Supabase (API + structure) pour Smart Fleet Africa, en s’appuyant sur les scripts et fichiers existants.

## 1. Usage de .env.example et .env.local pour la connexion Supabase

### Fichiers concernés

- **Modèle** : [.env.example](../.env.example) à la racine du projet.
- **Fichier actif** : `.env.local` (créé à partir du modèle, non versionné).

### Variables requises pour la connexion

| Variable | Rôle | Où la trouver |
|----------|------|----------------|
| `VITE_SUPABASE_URL` | URL de l’API du projet Supabase (ex. `https://xxxx.supabase.co`) | Dashboard Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Clé publique (anon) pour les appels API côté client | Dashboard Supabase → Settings → API → anon public |

### Procédure

1. **Créer `.env.local`** (une fois) : `npm run init:env`  
   - Copie `.env.example` vers `.env.local`.  
   - Si `.env.local` existe déjà, le script demande confirmation avant d’écraser.

2. **Renseigner les valeurs** dans `.env.local` :  
   - Remplacer `https://votre-projet.supabase.co` par l’URL réelle du projet.  
   - Remplacer `votre_cle_anon_ici` par la clé anon (longue chaîne JWT).

3. **Ne pas commiter `.env.local`** : ce fichier doit rester local et contenir uniquement des secrets de votre environnement.

### Variables optionnelles (.env.example)

- `VITE_SENTRY_DSN` : Sentry (capture d’erreurs en production).
- `VITE_APP_URL` : URL publique du site (canonical, og:url). Défaut : `https://www.e-samba.com`.

---

## 2. Script check-supabase.ps1 — Ce qu’il vérifie et comment interpréter les résultats

**Commande** : `npm run check:supabase`  
**Fichier** : [scripts/check-supabase.ps1](../scripts/check-supabase.ps1)

### Contrôles effectués

| Contrôle | Critère | Message si échec |
|----------|---------|------------------|
| Présence de `.env.local` | Fichier existe à la racine | **ERREUR** : Fichier .env.local introuvable → exécuter `npm run init:env` |
| Variable `VITE_SUPABASE_URL` | Ligne présente et valeur non factice (pas `votre-projet`, pas `example`) | **ERREUR** si absent ; **ATTENTION** si valeur factice |
| Variable `VITE_SUPABASE_ANON_KEY` | Ligne présente, longueur > 50 caractères, pas `votre_cle` ni `example` | **ERREUR** si absent ; **ATTENTION** si trop courte ou factice |
| Client Supabase | `src/integrations/supabase/client.ts` existe et contient `import.meta.env.VITE_SUPABASE_URL` | **ERREUR** si fichier absent ; **ATTENTION** si variables d’environnement non utilisées |

### Interprétation des résultats

- **OK** (vert) : critère satisfait. Vous pouvez enchaîner avec `npm run verify:connection`.
- **ATTENTION** (jaune) : configuration incomplète ou valeur de démo (ex. clé/URL non remplacées). L’app peut échouer au runtime ; corriger `.env.local` puis relancer `npm run check:supabase`.
- **ERREUR** (rouge) : blocant. Créer ou compléter `.env.local` avec les vraies valeurs Supabase, puis relancer le script.

---

## 3. Script verify-connection.js — Connexion API et table organisations

**Commande** : `npm run verify:connection`  
**Fichier** : [scripts/verify-connection.js](../scripts/verify-connection.js)

### Fonctionnement

1. **Chargement de `.env.local`** : le script lit le fichier à la racine du projet et charge `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans `process.env`.
2. **Création du client Supabase** : `createClient(url, anonKey, { auth: { persistSession: false } })` — pas de persistance de session pour ce test.
3. **Requête de test** : `supabase.from('organisations').select('id').limit(1)` — une requête légère en lecture seule.

### Interprétation des résultats

- **Succès** :  
  - Sortie : `Connexion API : OK` puis `Organisations (échantillon): X ligne(s)`.  
  - Signification : l’API Supabase est joignable, l’URL et la clé anon sont valides. Le nombre de lignes peut être 0 (RLS ou table vide) ; l’important est l’absence d’erreur API.

- **Échec** :  
  - `ERREUR: VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY requis dans .env.local` → exécuter `npm run init:env` et remplir `.env.local`.  
  - `Connexion API : ERREUR` + message/code Supabase → vérifier URL, clé, ou politiques RLS sur la table `organisations` (ex. PGRST301, 404, etc.).  
  - Erreur réseau (ex. `fetch failed`, timeout) → vérifier pare-feu, VPN, accès à Internet.

Ce script ne modifie pas la base ; il valide uniquement la **connexion applicative** à Supabase.

---

## 4. Script check-backend.ps1 — Rôle et vérifications (tables, RPC, hooks)

**Commande** : `npm run check:backend`  
**Fichier** : [scripts/check-backend.ps1](../scripts/check-backend.ps1)

### Rôle

Vérifier la **cohérence du backend** : présence des variables d’environnement, du client Supabase, des définitions SQL (tables et fonctions RPC) attendues par l’app, et des hooks/dépendances côté code.

### Contrôles effectués

1. **Configuration** : `.env.local` présent avec `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` ; `src/integrations/supabase/client.ts` utilise bien les variables d’environnement (pas de valeurs en dur).

2. **Fonctions RPC** : le script cherche les définitions (`CREATE OR REPLACE FUNCTION ...`) dans :
   - `supabase/schema.sql`
   - `supabase/migrations/*.sql`
   - `supabase/rpc-*.sql`  
   Il compare avec la liste des RPC utilisées par l’app (ex. `creer_flotte_esamba`, `creer_vehicule_esamba`, `accepter_invitation`, etc.). Chaque RPC manquante est signalée en **ATTENTION**.

3. **Tables** : vérification que les tables attendues (ex. `organisations`, `flottes`, `vehicules`, `incidents`, `flotte_adhesions`, etc.) sont définies dans le schéma ou les migrations.

4. **Hooks** : présence des fichiers dans `src/hooks/` (ex. `useAuth.ts`, `useVehicles.ts`, `useMaintenance.ts`, etc.).

5. **Dépendances** : présence de `@supabase/supabase-js` et `@tanstack/react-query` dans `package.json`.

### Utilisation

Exécuter après `npm run check:supabase` et `npm run verify:connection`. Les **ERREUR** indiquent des éléments indispensables manquants (config ou client). Les **ATTENTION** sur les RPC/tables invitent à appliquer ou compléter les migrations dans Supabase.

---

## 5. Scripts SQL de vérification — Ordre d’exécution pour auditer la base

Les scripts listés ci-dessous sont à exécuter dans l’**éditeur SQL** du projet Supabase (Dashboard → SQL Editor). Ils sont en lecture ou à impact limité ; vérifier le contenu avant exécution.

### Ordre recommandé

| Ordre | Script | Objectif |
|-------|--------|----------|
| 1 | `verify-migration-status.sql` | État des migrations appliquées |
| 2 | `verify-migrations-complete.sql` | Complétude des migrations |
| 3 | `verify-database-backend-consistency.sql` | Cohérence globale schéma / backend |
| 4 | `verify-all-rpc-functions.sql` | Présence des fonctions RPC |
| 5 | `verify-esamba-setup.sql` | Configuration E-Samba de base |
| 6 | `verify-esamba-simple.sql` | Vérification simplifiée E-Samba |
| 7 | `verify-esamba-data.sql` / `verify-esamba-data-complete.sql` | Données E-Samba (organisations, flottes, etc.) |
| 8 | `verify-fleet-invitations-structure.sql` | Structure des invitations de flotte |
| 9 | `verify-rls-incidents.sql` | Politiques RLS sur la table `incidents` |
| 10 | `verify-creation-flotte-non-regression.sql` | Non-régression création de flotte |
| 11 | `verify-test-user.sql` / `verify-test-account.sql` | Comptes de test |
| 12 | `verify-demo-organization.sql` | Organisation de démo |
| 13 | `verify-and-fix-enums.sql` | Enums (peut proposer des corrections) |

### Recommandations

- Commencer par les scripts **verify-migration-** et **verify-database-backend-consistency** pour avoir une vue d’ensemble.
- Ensuite enchaîner avec les scripts **verify-esamba-*** et **verify-rls-*** selon les besoins (données métier, RLS).
- `verify-and-fix-enums.sql` peut modifier le schéma ; l’exécuter en connaissance de cause (idéalement en environnement de dev/staging d’abord).

Une fois ces étapes effectuées, la connexion et la structure de la base sont vérifiées de façon cohérente avec les scripts du projet.
