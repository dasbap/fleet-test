# Sécurité Supabase – Smart Fleet Africa

## Protection « Mots de passe divulgués » (Auth)

Le rapport de sécurité Supabase peut signaler : **Leaked Password Protection Disabled**.

**Action à effectuer manuellement** (non gérée par les migrations SQL) :

1. Ouvrir le [tableau de bord Supabase](https://supabase.com/dashboard) et sélectionner le projet.
2. Menu gauche : **Authentication** → **Providers** → onglet **Email**.
3. Dans la section des options de sécurité, activer **Leaked Password Protection** (ou « Enable breach detection » / « Block compromised passwords » selon la version de l’interface).
4. Cliquer sur **Save** pour enregistrer.

Cela empêche l’utilisation de mots de passe connus comme compromis (fuites de données externes). À activer sur **tous les environnements** (staging, production).

## Migrations de sécurité (RLS et fonctions)

Les migrations suivantes corrigent les alertes de sécurité liées à la RLS et au `search_path` des fonctions :

- `20250223100000_enable_rls_all_tables.sql` — Activation de la RLS sur toutes les tables concernées.
- `20250223110000_fix_rls_policies_restrictive.sql` — Politiques restrictives (organisations, flottes, flotte_adhesions, preuves_maintenance).
- `20250223120000_fix_functions_search_path.sql` — `SET search_path = public` sur les fonctions RPC et triggers concernés.

Après déploiement, vérifier dans le rapport de sécurité Supabase que les alertes correspondantes ont disparu.

## Appliquer les migrations

**Option A – CLI (projet lié)**  
1. Se connecter : `npx supabase login`  
2. Lier le projet (si besoin) : `npx supabase link --project-ref <REF>`  
3. Pousser les migrations : `npx supabase db push`  

**Option B – SQL Editor**  
Dans le tableau de bord Supabase → **SQL Editor** :  
- Ouvrir le fichier **`supabase/run-securite-rls-and-functions.sql`**  
- Sélectionner **tout le contenu** (Ctrl+A), **copier**, puis **coller** dans l’éditeur SQL et cliquer **Run**.  
- Important : coller le **contenu** du fichier, pas le nom du fichier (sinon erreur « trailing junk after numeric literal »).

## Vérifications (connexion, RLS, scripts)

Commandes à lancer à la racine du projet :

| Commande | Rôle |
|----------|------|
| `npm run verify:connection` | Test de connexion à l’API Supabase (lit `.env.local`, requête sur `organisations`) |
| `npm run check:supabase` | Vérifie la présence de `.env.local`, URL et clé anon, et que `client.ts` utilise les variables |
| `npm run check:backend` | Vérifie les définitions RPC dans les SQL, tables du schéma, hooks et dépendances |

**RLS** : Les politiques sont définies dans `run-securite-rls-and-functions.sql` et dans les migrations `20250223100000_enable_rls_all_tables.sql`, `20250223110000_fix_rls_policies_restrictive.sql`. Tables avec RLS activé (run-securite) : `organisations`, `flottes`, `flotte_adhesions`, `preuves_maintenance`, `plans`, plus `incidents`, `creneaux_conducteurs`, `clotures_creneaux`, `jetons_qr`, `listes_verification_maintenance`. Les autres tables (ex. `vehicules`, `affectations_vehicules`) ont leurs politiques dans la migration `20241202000000_migrate_to_french.sql`.

**Scripts utiles** : `scripts/verify-rls-incidents.js` (RLS sur `incidents`, utilise `DATABASE_URL` ou Postgres local) ; `scripts/run-cleanup-db.js` (nettoyage via RPC ou DB directe, lit `.env.local`).
