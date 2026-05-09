# Vérification connexion Supabase (erreur « Database error querying schema »)

Suivre ces étapes dans l’ordre si la connexion à l’app échoue avec une erreur base de données.

## Diagnostic côté app (avant de vérifier Supabase)

1. **Ouvrir les outils dev** : F12 → onglet **Réseau** (Network).
2. **Reproduire l’erreur** : rafraîchir la page ou refaire l’action qui échoue.
3. **Repérer la requête en échec** : cliquer sur la requête en rouge (failed) et noter :
   - **URL** (ex. `https://XXXX.supabase.co/rest/v1/organisations` ou `/rest/v1/rpc/nom_rpc`) ;
   - **Corps de la requête** (Payload) si présent — cela indique la **table** ou l’**RPC** appelée.
   - **En mode dev** : l'app affiche aussi dans la **console** (F12 → Console) un message `[Smart Fleet] Requête Supabase en échec` avec l'URL concernée.
4. **Vérifier les migrations** : une table ou une politique RLS manquante peut provoquer exactement ce message. Suivre le § 3 ci‑dessous pour s’assurer que toutes les migrations sont appliquées sur le projet.

## 1. Projet Supabase actif (pas en pause)

1. Aller sur [app.supabase.com](https://app.supabase.com) et se connecter.
2. Dans la liste des projets, ouvrir le projet utilisé par l’app (URL dans `.env.local` : `https://XXXX.supabase.co` → l’identifiant est **XXXX**).
3. **Vérifier que le projet n’est pas en pause** :
   - Si vous voyez **Project is paused** / **Projet en pause** : cliquer sur **Restore project** (ou **Réactiver**) et attendre la fin du redémarrage (quelques minutes).
   - Sinon, le projet est actif ; passer à l’étape 2.

## 2. Variables d’environnement (`.env.local`)

- Le fichier `.env.local` doit exister à la racine du projet (à côté de `package.json`).
- Il doit contenir au minimum :
  - `VITE_SUPABASE_URL=https://XXXX.supabase.co` (remplacer par l’URL réelle du projet).
  - `VITE_SUPABASE_ANON_KEY=eyJ...` (clé anon du même projet).
- Où trouver les valeurs : Dashboard Supabase → **Project Settings** → **API** (Project URL et anon public key).
- Redémarrer le serveur de dev (`npm run dev`) après toute modification de `.env.local`.

## 3. Migrations appliquées (toutes, dans l’ordre)

### 3.1 Vérifier dans le Dashboard

1. Dans le Dashboard Supabase : menu de gauche → **Database** → **Migrations** (ou **SQL Editor** selon l’interface).
2. Consulter la liste des migrations déjà appliquées (elles s’affichent par date / nom).
3. **Option : liste via SQL** — dans **SQL Editor**, exécuter le script `supabase/list-applied-migrations.sql` : il affiche les noms des migrations enregistrées. Comparer avec la liste ci‑dessous (ordre identique attendu).
4. Si une migration manque : l’appliquer en copiant le contenu du fichier correspondant dans `supabase/migrations/` puis en l’exécutant dans le SQL Editor (une par une, dans l’ordre de la liste).

### 3.2 Liste attendue (ordre d’application)

Liste des migrations du projet (ordre d’application) :

| Fichier |
|--------|
| 20241201000000_add_search_users_rpc.sql |
| 20241202000000_migrate_to_french.sql |
| 20250205000000_fix_schema_metier.sql |
| 20250205000001_add_scores_and_alerts.sql |
| 20250206000000_fix_rpc_table_names.sql |
| 20250206000001_rename_rpc_functions_to_french.sql |
| 20250206000002_vehicle_active_status_rule.sql |
| 20250206000003_invitations_rls_and_accepter_invitation.sql |
| 20250206000004_fix_flotte_adhesions_rls_recursion.sql |
| 20250206000005_flotte_adhesions_fk_to_profils.sql |
| 20250206000006_add_verifier_sante_systeme_and_reparer_adhesion_orpheline.sql |
| 20250206000007_restrict_flotte_adhesions_update_delete_rls.sql |
| 20250206000008_add_maintenance_notes_planned_parts.sql |
| 20250223000000_enable_rls_incidents.sql |
| 20250223100000_enable_rls_all_tables.sql |
| 20250223110000_fix_rls_policies_restrictive.sql |
| 20250223120000_fix_functions_search_path.sql |
| 20260224000000_extend_abonnements_qr_addons.sql |
| 20260226000000_jetons_qr_vehicle_id_nullable.sql |
| 20260226100000_liste_migrations_appliquees_rpc.sql |

## Vérification rapide (en local)

Depuis la racine du projet :

1. **URL et clé** : `npm run check:supabase` — vérifie que `.env.local` contient `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (valeurs réelles, pas les placeholders).
2. **Connexion au projet** : `npm run verify:connection` — appelle l’API Supabase (table `organisations`) ; si c’est OK, l’URL et la clé correspondent à un projet actif et joignable.
3. **Vérification complète (connexion + migrations)** : `npm run verify:supabase` — enchaîne les étapes ci-dessus et compare les migrations appliquées à la liste attendue. Optionnel : définir `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local` (Dashboard → Project Settings → API) pour comparer les migrations via RPC sans CLI ; sinon le script tente la CLI Supabase ou indique d’exécuter manuellement `supabase/list-applied-migrations.sql` et de comparer avec la liste § 3.2.
4. **Migrations (si Supabase CLI installée)** : `supabase link` puis `supabase migration list` pour comparer migrations locales et appliquées sur le projet.

## 4. Tester à nouveau

- Lancer `npm run dev` puis ouvrir la page de connexion.
- Se connecter avec un compte existant (ex. démo : `demo.organizer@esamba.test` / `Demo2025!` si le script démo a été exécuté).

Si l’erreur persiste : vérifier dans la console du navigateur (F12) le message d’erreur exact et la requête qui échoue (URL, statut).
