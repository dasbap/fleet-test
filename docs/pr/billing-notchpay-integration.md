# PR — Intégration billing Notch Pay E-Samba

**Branche :** `main` (commits `b747f9a` → `d893816`)
**Auteur :** Vanessa / E-Samba team
**Date :** 2026-05-16
**Labels :** `billing` `backend` `security` `migration`

---

## Summary

Implémentation complète du module facturation SaaS E-Samba avec paiement Notch Pay (Mobile Money XAF). Ce PR couvre l'intégralité du flux billing : page Tarifs avec calcul dynamique, checkout Notch Pay, webhook d'activation abonnement, dashboard billing, lifecycle automatique (cron quotidien), guards d'accès plan, et audit sécurité complet.

**Périmètre fonctionnel :**
- Plans Free / Starter (15 000 FCFA/vhcl) / Pro (21 000 FCFA/vhcl) / Organizer (devis)
- Durées 1/3/6/12 mois avec remises -5/-10/-15 %
- Add-ons : Pulse+ (3 500 FCFA/vhcl), QR Premium (2 500 FCFA/vhcl)
- Lifecycle abonnements : active → grace_period (7j) → suspended → expired
- Guards d'accès plan côté DB (RPC `SECURITY DEFINER`) et frontend

---

## Changes

### Frontend

| Fichier | Description |
|---------|-------------|
| `src/features/billing/screens/BillingPage.tsx` | Dashboard billing complet : plan actuel, statut, jauge véhicules, prochaine échéance, grace period, historique paiements, reçus téléchargeables (.txt), add-ons actifs |
| `src/hooks/usePaymentHistory.ts` | `usePaymentHistory()` + `useBillingEvents()` — données Supabase uniquement, retry intelligent (pas de retry sur 403 RLS) |

### Server BFF

| Fichier | Description |
|---------|-------------|
| `src/server/http/app.ts` | **[SECURITY]** Fix CORS : origines non whitelistées → `null` (était wildcard) |
| `src/server/http/routes/billingNotchPay.ts` | Route `POST /billing/notch/initiate` + rate limit appliqué |
| `src/server/http/middleware/rateLimitMiddleware.ts` | Rate limiting in-process : fenêtre glissante par IP, headers `X-RateLimit-*` |

### Edge Functions Supabase

| Fichier | Description |
|---------|-------------|
| `supabase/functions/billing-lifecycle-cron/index.ts` | Cron quotidien 02h00 UTC : transitions lifecycle, enqueue relances WhatsApp + email. Auth via `body.secret` (headers strippés par gateway Cloudflare) |
| `supabase/functions/notch-pay-webhook/index.ts` | **[SECURITY]** Ajout `sanitizeWebhookPayload()` : PII (phone/email/name/address) retirés des `raw_payload` avant stockage |

### Tests

| Fichier | Description |
|---------|-------------|
| `src/test/integration/billing.integration.test.ts` | 10 tests d'intégration Supabase live (skip par défaut, activés via `RUN_SUPABASE_INTEGRATION=1`) |
| `src/test/helpers/billing-test-helpers.ts` | Factories : `seedTenant`, `seedTrialSubscription`, `seedActivePaidSubscription`, `seedExpiredSubscription`, `seedQrToken`, `cleanupTenant` |
| `src/test/billing-security.test.ts` | Tests sécurité : CORS, HMAC webhook, mock auth guard, rate limit, injection statut |

---

## Database migrations

Les migrations suivantes doivent être appliquées **dans cet ordre** avant déploiement :

### `20260516000001` — subscription_lifecycle_engine

Appliquée ✅ (via MCP Supabase le 2026-05-16)

```
- Feature flags plans : max_vehicles, enables_finance, enables_ai, enables_reports...
- Colonnes abonnements : cancelled_at, cancelled_by
- RPCs (SECURITY DEFINER, service_role) :
    billing_start_trial(fleet_id, trial_days)
    billing_enter_grace_period(subscription_id, grace_days)
    billing_suspend_subscription(subscription_id)
    billing_cancel_subscription(subscription_id, cancelled_by)
    billing_run_daily_lifecycle() → jsonb {transitioned_to_grace, suspended, expired, timestamp}
```

### `20260516000003` — plan_guards_rpc

Incluse dans le PR de la phase précédente.

```
- can_create_vehicle(fleet_id) → boolean  (STABLE, SECURITY DEFINER)
- get_plan_access(fleet_id) → jsonb       (matrice complète des droits)
- GRANT EXECUTE TO authenticated
```

### `20260516000004` — billing_cron_schedule

Appliquée ✅

```
- Table notification_queue (RLS activé, service_role uniquement)
- Index partiel wrq_status_scheduled_idx sur whatsapp_retry_queue
- Vue v_billing_lifecycle_status (monitoring admin)
- pg_cron job billing-lifecycle-daily : 0 2 * * * UTC
  → POST billing-lifecycle-cron avec body.secret
```

> ⚠️ Le fichier migration contient `CRON_SECRET_PLACEHOLDER`. La valeur réelle est
> gérée via `supabase secrets set` et le Dashboard SQL Editor — ne jamais committer
> le secret réel dans le dépôt.

**Pour appliquer manuellement si non encore fait :**
```bash
supabase db push --project-ref zqxjvmejoktwlcqshnwi
# ou via le Dashboard Supabase → SQL Editor pour la migration 00004
```

---

## Environment variables

### Supabase Secrets (Edge Functions — `supabase secrets set`)

| Variable | Description | Requis |
|----------|-------------|--------|
| `CRON_SECRET` | Jeton d'auth pour `billing-lifecycle-cron` (64 hex chars). **Rotaté le 2026-05-16.** | ✅ |
| `NOTCH_PAY_WEBHOOK_SECRET` | Clé HMAC-SHA256 pour valider les webhooks Notch Pay (`x-notch-signature`) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injectée par Supabase dans les Edge Functions | Auto |
| `SUPABASE_URL` | Auto-injectée par Supabase dans les Edge Functions | Auto |

### BFF Node / Vercel (variables serveur, jamais `VITE_`)

| Variable | Description | Requis |
|----------|-------------|--------|
| `NOTCH_PAY_API_KEY` | Clé API Notch Pay pour l'initiation de paiement (appels sortants) | ✅ |
| `NOTCH_PAY_WEBHOOK_SECRET` | Même valeur que le secret Supabase ci-dessus | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service_role Supabase (webhook payment côté BFF) | ✅ |
| `APP_URL` | URL publique (`https://www.e-samba.com`) — utilisée pour les callbacks Notch Pay | ✅ |

### Frontend Vite (`VITE_` — exposées dans le bundle)

Aucune clé sensible billing n'est exposée en `VITE_`. Le checkout passe obligatoirement par le BFF.

---

## Test plan

### Tests unitaires (CI automatique)
```bash
npx vitest run src/test/plan-guards.test.ts        # 79 tests guards d'accès plan
npx vitest run src/test/billing-security.test.ts   # CORS, HMAC, rate-limit, injection
npx vitest run src/test/billing-webhook.test.ts    # normalisation statuts webhook
```

### Tests d'intégration Supabase (CI avec secrets)
```bash
RUN_SUPABASE_INTEGRATION=1 \
VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL }} \
SUPABASE_SERVICE_ROLE_KEY=${{ secrets.SUPABASE_SERVICE_ROLE_KEY }} \
npx vitest run src/test/integration/billing.integration.test.ts
```

Couverture des 10 cas :

| # | Scénario | Assertion clé |
|---|----------|---------------|
| 1 | Création trial | `billing_start_trial` retourne UUID, statut = `trial`, idempotent |
| 2 | Limite Free 3 véhicules | `can_create_vehicle = false`, `ai_enabled = false` |
| 3 | Paiement → abonnement actif | statut = `active`, `ends_at` futur, event journalisé |
| 4 | Webhook idempotent | doublon → erreur `23505` UNIQUE violation |
| 5 | QR valide | `is_active = true`, `expires_at` futur |
| 6 | QR expiré | `expires_at` passé → isValid = false |
| 7 | Expiré → grace_period | `billing_run_daily_lifecycle`, event `grace_period_started` |
| 8 | grace_period → suspended | `transitioned_to_suspended > 0`, event journalisé |
| 9 | Pro → Pulse accessible | `ai_enabled = true`, `reports_enabled = true` |
| 10 | Free → Pulse bloqué | `ai_enabled = false`, `reports_enabled = false` |

### Test Edge Function cron (manuel)
```bash
# Nouveau secret (actuel)
curl -s -X POST https://zqxjvmejoktwlcqshnwi.supabase.co/functions/v1/billing-lifecycle-cron \
  -H "Content-Type: application/json" \
  -d '{"secret":"<CRON_SECRET>"}' | jq

# Résultat attendu : {"ok":true,"runId":"...","transitionedToGrace":0,...}
```

### Vérification sécurité
```bash
# Ancien secret doit retourner 401
curl -s -X POST .../billing-lifecycle-cron -d '{"secret":"ancien_secret"}' # → Unauthorized

# Origine inconnue CORS
curl -s -H "Origin: https://attacker.com" https://api.e-samba.com/billing/notch/initiate
# → pas d'en-tête Access-Control-Allow-Origin dans la réponse

# Rate limit
for i in {1..7}; do curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST https://api.e-samba.com/billing/notch/initiate \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"planCode":"starter","vehicleCount":1}'; done
# → 201 201 201 201 201 429 429
```

---

## Rollback plan

### Rollback applicatif (Vercel + Edge Functions)

Le déploiement Vercel est sans état côté serveur (SPA). En cas de régression :

1. **Revert du déploiement Vercel** : Dashboard Vercel → Deployments → Promote previous deployment
2. **Rollback Edge Function** : le code précédent n'est pas perdu — redéployer la version antérieure via `supabase functions deploy`

### Rollback Base de données

Les migrations SQL sont **non-destructives** (ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE FUNCTION). Elles peuvent être laissées en place sans impact si le code frontend est reverted.

Si une suppression est nécessaire (cas exceptionnel) :

```sql
-- Supprimer les RPCs lifecycle (dans cet ordre)
DROP FUNCTION IF EXISTS public.billing_run_daily_lifecycle();
DROP FUNCTION IF EXISTS public.billing_suspend_subscription(uuid);
DROP FUNCTION IF EXISTS public.billing_enter_grace_period(uuid, integer);
DROP FUNCTION IF EXISTS public.billing_start_trial(uuid, integer);
DROP FUNCTION IF EXISTS public.billing_cancel_subscription(uuid, uuid);

-- Supprimer les colonnes ajoutées sur plans
ALTER TABLE public.plans
  DROP COLUMN IF EXISTS max_vehicles,
  DROP COLUMN IF EXISTS enables_finance,
  DROP COLUMN IF EXISTS enables_ai,
  DROP COLUMN IF EXISTS enables_reports,
  DROP COLUMN IF EXISTS enables_driver_scoring,
  DROP COLUMN IF EXISTS enables_anomaly_insights,
  DROP COLUMN IF EXISTS enables_geofencing,
  DROP COLUMN IF EXISTS enables_scheduled_reports,
  DROP COLUMN IF EXISTS enables_offline_driver;

-- Supprimer les colonnes abonnements
ALTER TABLE public.abonnements
  DROP COLUMN IF EXISTS cancelled_at,
  DROP COLUMN IF EXISTS cancelled_by;

-- Supprimer la table notification_queue (si vide)
DROP TABLE IF EXISTS public.notification_queue;

-- Désactiver le cron
SELECT cron.unschedule('billing-lifecycle-daily');
```

### Rollback CRON_SECRET

```bash
# Régénérer et redéployer un nouveau secret
python3 -c "import secrets; print(secrets.token_hex(32))"
npx supabase secrets set CRON_SECRET=<nouveau_secret> --project-ref zqxjvmejoktwlcqshnwi
# Mettre à jour le job pg_cron via le Dashboard SQL Editor
```

### Risques connus

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Webhook Notch Pay reçu avant activation migration | Faible | Moyen | La fonction `notch-pay-webhook` est déjà déployée et attend le paiement ; la migration doit précéder le premier paiement réel |
| Double webhook concurrent (race condition) | Faible | Faible | Contrainte UNIQUE `provider_reference` sur `payment_attempts` garantit l'idempotence |
| pg_cron désactivé sur l'instance | Faible | Faible | L'extension est activée et le job `billing-lifecycle-daily` est enregistré (jobid=6) ; vérifiable via `SELECT * FROM cron.job` |
| Rate limit trop bas sur initiation paiement | Moyen | Faible | 5 req/min/IP peut bloquer des tests manuels intensifs ; ajustable via `maxRequests` dans `rateLimitMiddleware.ts` |
| Secret en mémoire pg_cron visible via `cron.job` | Faible | Critique | `SELECT * FROM cron.job` expose le body SQL avec le secret. Restreindre l'accès à cette table aux `superuser` uniquement |

> **Action requise post-merge :** vérifier que `cron.job` n'est pas accessible aux rôles `authenticated` ou `anon` via RLS/grants.
