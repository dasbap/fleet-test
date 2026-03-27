# SÃ©curitÃ© Supabase â€“ Smart Fleet Africa

## Protection Â« Mots de passe divulguÃ©s Â» (Auth)

Le rapport de sÃ©curitÃ© Supabase peut signaler : **Leaked Password Protection Disabled**.

**Action Ã  effectuer manuellement** (non gÃ©rÃ©e par les migrations SQL) :

1. Ouvrir le [tableau de bord Supabase](https://supabase.com/dashboard) et sÃ©lectionner le projet.
2. Menu gauche : **Authentication** â†’ **Providers** â†’ onglet **Email**.
3. Dans la section des options de sÃ©curitÃ©, activer **Leaked Password Protection** (ou Â« Enable breach detection Â» / Â« Block compromised passwords Â» selon la version de lâ€™interface).
4. Cliquer sur **Save** pour enregistrer.

Cela empÃªche lâ€™utilisation de mots de passe connus comme compromis (fuites de donnÃ©es externes). Ã€ activer sur **tous les environnements** (staging, production).

## Migrations de sÃ©curitÃ© (RLS et fonctions)

Les migrations suivantes corrigent les alertes de sÃ©curitÃ© liÃ©es Ã  la RLS et au `search_path` des fonctions :

- `20250223100000_enable_rls_all_tables.sql` â€” Activation de la RLS sur toutes les tables concernÃ©es.
- `20250223110000_fix_rls_policies_restrictive.sql` â€” Politiques restrictives (organisations, flottes, flotte_adhesions, preuves_maintenance).
- `20250223120000_fix_functions_search_path.sql` â€” `SET search_path = public` sur les fonctions RPC et triggers concernÃ©s.

AprÃ¨s dÃ©ploiement, vÃ©rifier dans le rapport de sÃ©curitÃ© Supabase que les alertes correspondantes ont disparu.

## Appliquer les migrations

**Option A â€“ CLI (projet liÃ©)**  
1. Se connecter : `npx supabase login`  
2. Lier le projet (si besoin) : `npx supabase link --project-ref <REF>`  
3. Pousser les migrations : `npx supabase db push`  

**Option B â€“ éditeur SQL**  
Dans le tableau de bord Supabase â†’ **éditeur SQL** :  
- Ouvrir le fichier **`supabase/run-securite-rls-and-functions.sql`**  
- SÃ©lectionner **tout le contenu** (Ctrl+A), **copier**, puis **coller** dans lâ€™Ã©diteur SQL et cliquer **Exécuter**.  
- Important : coller le **contenu** du fichier, pas le nom du fichier (sinon erreur Â« trailing junk after numeric literal Â»).

## VÃ©rifications (connexion, RLS, scripts)

Commandes Ã  lancer Ã  la racine du projet :

| Commande | RÃ´le |
|----------|------|
| `npm run verify:connection` | Test de connexion Ã  lâ€™API Supabase (lit `.env.local`, requÃªte sur `organisations`) |
| `npm run check:supabase` | VÃ©rifie la prÃ©sence de `.env.local`, URL et clÃ© anon, et que `client.ts` utilise les variables |
| `npm run check:backend` | VÃ©rifie les dÃ©finitions RPC dans les SQL, tables du schÃ©ma, hooks et dÃ©pendances |

**RLS** : Les politiques sont dÃ©finies dans `run-securite-rls-and-functions.sql` et dans les migrations `20250223100000_enable_rls_all_tables.sql`, `20250223110000_fix_rls_policies_restrictive.sql`. Tables avec RLS activÃ© (run-securite) : `organisations`, `flottes`, `flotte_adhesions`, `preuves_maintenance`, `plans`, plus `incidents`, `creneaux_conducteurs`, `clotures_creneaux`, `jetons_qr`, `listes_verification_maintenance`. Les autres tables (ex. `vehicules`, `affectations_vehicules`) ont leurs politiques dans la migration `20241202000000_migrate_to_french.sql`.

**Scripts utiles** : `scripts/verify-rls-incidents.js` (RLS sur `incidents`, utilise `DATABASE_URL` ou Postgres local) ; `scripts/run-cleanup-db.js` (nettoyage via RPC ou DB directe, lit `.env.local`).

