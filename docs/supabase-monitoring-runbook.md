# Runbook monitoring — Supabase + E-SAMBA

## 1. Monitoring Supabase (natif)

| Signal | Où | Action |
|--------|-----|--------|
| CPU / connexions / disque | Dashboard → Reports | Alerte si connexions > 80 % du plan |
| Security Advisor | Dashboard → Database → Linter ou MCP `get_advisors` | Traiter ERROR avant WARN |
| Logs 24 h | Dashboard → Logs ou MCP `get_logs` | `auth`, `api`, `edge-function`, `postgres` |
| Edge Functions | Dashboard → Edge Functions | Statut ACTIVE, erreurs 5xx |

### Alertes recommandées (Dashboard → Project Settings → Integrations)

Configuration cible E-SAMBA (à activer dans le [dashboard](https://supabase.com/dashboard/project/zqxjvmejoktwlcqshnwi/settings/integrations)) :

| Alerte | Seuil | Statut |
|--------|-------|--------|
| Database unhealthy | immédiat | [ ] À configurer |
| Disk usage | > **85 %** (surveillance à 70 %) | [ ] À configurer |
| Connexions DB | > 80 % quota plan | [ ] À configurer |
| Edge Functions 5xx | `billing-lifecycle-cron`, `otp-send` | [ ] À configurer |

**Baseline 2026-06-11** : DB **29 MB**, **6** connexions actives, projet `ACTIVE_HEALTHY`.

Vérification automatisée partielle : `npm run verify:supabase-pro`

## 2. Monitoring application (Vercel)

Variables **production** (`www.e-samba.com`) :

| Variable | Rôle |
|----------|------|
| `VITE_SENTRY_DSN` | Erreurs JS — [`src/instrument.ts`](../src/instrument.ts) |
| `VITE_POSTHOG_KEY` | Analytics produit (optionnel) |
| `VITE_APP_VERSION` | Regroupement releases Sentry |

Checklist activation Sentry :

1. Créer projet Sentry « smart-fleet-africa »
2. Ajouter `VITE_SENTRY_DSN` dans Vercel → Environment Variables → **Production** (`npx vercel env add VITE_SENTRY_DSN production`)
3. Redéployer `npm run deploy:prebuilt` ou push `main`
4. Déclencher une erreur test et vérifier l’issue dans Sentry

**État 2026-06-11** : `VITE_APP_VERSION` présent sur Vercel ; `VITE_SENTRY_DSN` **absent** — voir [`docs/supabase-pro-validation.md`](supabase-pro-validation.md) §4.

## 3. Vérifications automatisées (CI)

```bash
npm run lint && npm test
# Migrations : .github/workflows/verify-migration.yml
# Smoke local : npm run smoke:dev-local
```

## 4. Requêtes de santé SQL (MCP / SQL Editor)

```sql
-- Tables sans policy (intentionnel ou à corriger)
SELECT c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = c.relname
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
GROUP BY c.relname HAVING COUNT(p.policyname) = 0;

-- Buckets storage
SELECT id, public FROM storage.buckets ORDER BY id;
```

## 5. Escalade

| Gravité | Exemple | Réaction |
|---------|---------|----------|
| P0 | Auth down, fuite données | Rollback Vercel + restore backup |
| P1 | OTP / paiement KO | Logs `edge-function` + redeploy fonction |
| P2 | Advisor ERROR RLS | Migration corrective + `get_advisors` |

## 6. Checklist post-déploiement Security Advisor (batch4 + storage)

Après `npx supabase db push` (migrations `20260612120000`, `20260612130000`) :

1. [ ] Dashboard → **Database** → **Security Advisor** ou MCP `get_advisors` — comparer à la baseline
2. [ ] `function_search_path_mutable` = 0, `extension_in_public` = 0
3. [ ] `public_bucket_allows_listing` = 0 (`SELECT public FROM storage.buckets`)
4. [ ] Auth → Email → **Leaked Password Protection** activé
5. [ ] Auth → MFA → **TOTP** activé
6. [ ] `npm run lint && npm test`
7. [ ] Smoke manuel : upload avatar, preuve incident, lecture tutoriel (URLs signées)
8. [ ] RPC recherche flotte (`search_fleet`) après déplacement `pg_trgm`

Warnings **acceptés** : `authenticated_security_definer_*` sur RPC métier — voir [`docs/SECURITY-NOTES.md`](SECURITY-NOTES.md).

## 7. Rythme de revue

- **Hebdo** : logs auth anomalies, disk usage
- **Mensuel** : Security Advisor complet, sync Edge Functions ([`docs/supabase-edge-functions-sync.md`](supabase-edge-functions-sync.md))
- **Trimestriel** : test restore backup ([`docs/supabase-backups-checklist.md`](supabase-backups-checklist.md))
