# Notes de sécurité - Smart Fleet Africa

## 🔒 Clés Supabase

### Clés configurées

✅ **Clé ANON (publique)** : Configurée dans `.env.local`
- ✅ Sûre à exposer côté client
- ✅ Utilisée dans `src/integrations/supabase/client.ts`
- ✅ Protégée par les politiques RLS (Row Level Security)

⚠️ **Clé SERVICE_ROLE (privée)** : **NE JAMAIS EXPOSER**
- ❌ **NE JAMAIS** mettre dans `.env.local` ou tout fichier côté client
- ❌ **NE JAMAIS** commiter dans Git
- ✅ Utiliser uniquement dans des environnements serveur sécurisés
- ✅ Utiliser uniquement pour des opérations administratives backend

### Stockage sécurisé de la clé service_role

Si vous devez utiliser la clé service_role (par exemple pour des fonctions serveur) :

1. **Ne JAMAIS** l'ajouter dans un fichier `.env` côté client
2. Utiliser des variables d'environnement serveur uniquement
3. Utiliser des services comme :
   - Vercel Environment Variables (pour les fonctions serverless)
   - AWS Secrets Manager
   - Azure Key Vault
   - Variables d'environnement système (serveur dédié)

## 📁 Fichiers sensibles

Les fichiers suivants sont dans `.gitignore` et ne seront **JAMAIS** commités :

- `.env`
- `.env.local`
- `.env.*.local`
- `.env.local.bak`
- `.env.*.bak`

## ✅ Vérification de sécurité

Exécutez régulièrement :

```bash
npm run check:supabase
```

Ce script vérifie :
- ✅ Présence du fichier `.env.local`
- ✅ Configuration correcte des variables
- ✅ Utilisation des variables d'environnement dans le code (pas de hardcoding)

## 🛡️ Bonnes pratiques

1. **Ne jamais hardcoder les clés** dans le code source
2. **Toujours utiliser** `import.meta.env.VITE_SUPABASE_*`
3. **Vérifier** que `.env.local` est dans `.gitignore`
4. **Régénérer** les clés si elles sont compromises
5. **Utiliser** les politiques RLS pour la sécurité des données

## 🔄 Régénération des clés

Si une clé est compromise :

1. Allez dans Supabase Dashboard → Settings → API
2. Régénérez la clé compromise (JWT secret → invalide aussi `service_role` / `anon`)
3. Mettez à jour `.env.local` avec la nouvelle clé
4. Synchronisez GitHub Actions : `npm run secrets:sync-github`
5. Redéployez l'application

### Purge d'un fichier sensible de l'historique Git

Si un backup (ex. `.env.local.bak`) a été commité :

```bash
python -m git_filter_repo --path .env.local.bak --invert-paths --force
git remote add origin https://github.com/<org>/<repo>.git   # si supprimé par filter-repo
git push --force origin main
npm run verify:no-env-backup-in-history
npm run secrets:sync-github   # après rotation des clés dans Supabase
```

## RPC `SECURITY DEFINER` intentionnelles

Le Security Advisor signale `authenticated_security_definer_function_executable` sur les RPC métier (`get_fleet_members`, `fermer_creneau`, `rbac_check_permission`, etc.). **C’est attendu** : ce sont les endpoints PostgREST du SaaS, exécutables uniquement par `authenticated` après la migration `20260612120000_security_advisor_batch4.sql`.

| Rôle | Accès EXECUTE |
|------|----------------|
| `PUBLIC` | Révoqué par défaut sur toutes les fonctions `public` |
| `anon` | Allowlist explicite (codes d’accès, OTP, parcours démo/prospect, `track_funnel_event`) |
| `authenticated` | RPC métier appelées depuis l’app (`src/repositories/`, hooks) |
| `service_role` | Triggers, cron, audit, admin billing (jamais via clé anon) |

Chaque RPC métier doit valider `auth.uid()` et l’adhésion flotte (RBAC existant). Ne pas passer en masse en `SECURITY INVOKER` sans audit RLS — risque de régression d’isolation multi-tenant.

## Storage privé + URLs signées

Depuis `20260612130000_storage_buckets_private.sql`, les buckets `avatars`, `incident-evidence`, `maintenance-evidence`, `tutorials` sont **privés**. Le frontend résout les URLs via `src/lib/storage/signedUrl.ts` (`createSignedUrl`, cache 1 h). Les chemins objet sont persistés en base ; les anciennes URLs `/object/public/` restent supportées à la lecture.

## Audit RLS `travaux_maintenance` (2026-06-14)

Table canonique : **`travaux_maintenance`** (pas `maintenance_records`).

### État prod avant migration `20260614120000`

| Policy | Type | Cmd | Statut |
|--------|------|-----|--------|
| `rbac_travaux_read` | RESTRICTIVE | SELECT | OK (`has_role`) |
| `rbac_travaux_write` | RESTRICTIVE | INSERT | OK (`has_role`) |
| `travaux_insertion_mgr_org_mec` | PERMISSIVE | INSERT | OK |
| `rbac_travaux_update` | RESTRICTIVE | UPDATE | Drift (`rbac_is_mechanic_on_fleet`) |
| `rbac_travaux_delete` | RESTRICTIVE | DELETE | Drift (`rbac_is_fleet_manager_or_above`) |
| `demo_isolation_maintenance` | RESTRICTIVE | ALL | OK |
| `demo_isolation_travaux` | RESTRICTIVE | ALL | **Doublon legacy — supprimé** |
| `travaux_lecture_mgr_org_mec` | PERMISSIVE | SELECT | Legacy — recréée alignée `has_role` |
| `superadmin_all_travaux_maintenance` | PERMISSIVE | ALL | Prod seule — **codifiée en migration** |

### État prod après migration `20260614120000` (appliquée via SQL Editor / CLI)

10 politiques actives :

| Policy | Type | Cmd |
|--------|------|-----|
| `demo_isolation_maintenance` | RESTRICTIVE | ALL |
| `superadmin_all_travaux_maintenance` | PERMISSIVE | ALL |
| `rbac_travaux_read` | RESTRICTIVE | SELECT |
| `travaux_lecture_mgr_org_mec` | PERMISSIVE | SELECT |
| `rbac_travaux_write` | RESTRICTIVE | INSERT |
| `travaux_insertion_mgr_org_mec` | PERMISSIVE | INSERT |
| `rbac_travaux_update` | RESTRICTIVE | UPDATE |
| `travaux_modification_mgr_org_mec` | PERMISSIVE | UPDATE |
| `rbac_travaux_delete` | RESTRICTIVE | DELETE |
| `travaux_suppression_mgr_org` | PERMISSIVE | DELETE |

`demo_isolation_travaux` supprimée. UPDATE/DELETE alignés sur `has_role`.

> **Note** : si `supabase db push` signale un drift d’historique (`20260612…` remote-only), appliquer les migrations manquantes via `supabase db query --linked -f …` ou `supabase migration repair` avant le prochain push.

Script : `supabase/tests/09_travaux_maintenance_rls_functional.sql`

- Manager : SELECT, INSERT, UPDATE, DELETE — OK
- Mécanicien : SELECT, INSERT, UPDATE — OK ; DELETE — 0 ligne (attendu)

### Vérification

```bash
npx supabase db query --linked -f supabase/tests/09_travaux_maintenance_rls_functional.sql
node scripts/audit-travaux-maintenance-rls.mjs   # si SUPABASE_DB_URL configuré
```

## RLS documents, incidents, trajets (2026-06-14)

| Table E-Samba | Équivalent générique | RLS prod |
|---------------|---------------------|----------|
| `vehicle_documents` + `driver_licenses` | `documents` | activé (10 policies chacune) |
| `incidents` | `incidents` | activé (11 policies) |
| `creneaux_conducteurs` | `trips` | activé (9 policies) |

Migrations :
- [`20260614130000_vehicle_documents_driver_licenses.sql`](../supabase/migrations/20260614130000_vehicle_documents_driver_licenses.sql)
- [`20260614140000_incidents_rls_align.sql`](../supabase/migrations/20260614140000_incidents_rls_align.sql)
- [`20260614150000_creneaux_conducteurs_rls_align.sql`](../supabase/migrations/20260614150000_creneaux_conducteurs_rls_align.sql)

Appliquées en prod via `npx supabase db query --linked -f …`.

## 📚 Ressources

- [Documentation Supabase Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Best Practices for API Keys](https://supabase.com/docs/guides/api/api-keys)
- [`supabase/SECURITE.md`](../supabase/SECURITE.md) — Auth Dashboard (MFA, leaked passwords)
