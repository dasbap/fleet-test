# Synchronisation Edge Functions — dépôt ↔ prod

Projet prod : `zqxjvmejoktwlcqshnwi` (E-SAMBA Planificateur).

## Inventaire (2026-06-11)

| Fonction dépôt | Slug prod | Statut |
|----------------|-----------|--------|
| `otp-send` | `otp-send` | Déployée (audit 2026-06-11) |
| `billing-lifecycle-cron` | `billing-lifecycle-cron` | OK |
| `notch-pay-webhook` | `notch-pay-webhook` | OK |
| `demo-magic-link` | `demo-magic-link` | OK |
| `expire-demo-accounts` | `expire-demo-accounts` | OK |
| `gps-ingest` | `gps-ingest` | OK |
| `generate-voice-coaching` | `generate-voice-coaching` | OK |
| `dashcam-ai-webhook` | `dashcam-ai-webhook` | OK |
| `refresh-analytics` | `refresh-analytics` | OK |
| `process-notification-queue` | `process-notification-queue` | OK |
| `onboarding-sequence` | `onboarding-sequence` | OK |
| `generate-scheduled-report` | `generate-scheduled-report` | OK |
| `whatsapp-webhook` | `whatsapp-bot` | Alias prod (ne pas dupliquer) |
| `support-notify` | `support-notify` | Déployée (audit 2026-06-11) |
| `session-tracker` | `session-tracker` | OK (2026-06-11) |
| `revoke-session` | `revoke-session` | OK |
| `send-notification` | `send-notification` | OK |
| `process-whatsapp-retries` | `process-whatsapp-retries` | OK |
| `send-whatsapp` | `send-whatsapp` | OK |
| `retention-nudge` | `retention-nudge` | OK |
| `create-prospect-account` | `create-prospect-account` | OK |
| `expire-prospect-accounts` | `expire-prospect-accounts` | OK |

Fonctions prod sans équivalent direct dans le dépôt : `suspend-expired-subscriptions`, `initiate-payment`, `process-payment-webhook`, `run-predictive-maintenance`, `api-gateway` (legacy ou déployées hors dépôt).

## Déploiement

```bash
# Aperçu
node scripts/deploy-missing-edge-functions.mjs --dry-run

# Déploiement (nécessite supabase link ou SUPABASE_ACCESS_TOKEN)
node scripts/deploy-missing-edge-functions.mjs
```

JWT : le script applique `--no-verify-jwt` pour webhooks, crons et `otp-send` ; les fonctions client (`session-tracker`, `revoke-session`, `send-notification`) gardent la vérification JWT.

## Secrets requis (Dashboard → Edge Functions → Secrets)

| Secret | Fonctions |
|--------|-----------|
| `CRON_SECRET` | `retention-nudge`, `billing-lifecycle-cron`, `onboarding-sequence`, crons pg |
| `FCM_SERVER_KEY` | `send-notification`, `retention-nudge`, `onboarding-sequence` |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | `support-notify`, `process-notification-queue` |
| Variables WhatsApp | `send-whatsapp`, `process-whatsapp-retries`, `whatsapp-bot` |
| `ORANGE_SMS_TOKEN` | `onboarding-sequence` |

Injection depuis `.env.local` : `npm run secrets:supabase-edge` — détail [`docs/supabase-pro-validation.md`](supabase-pro-validation.md).

## Vérification post-déploiement

```bash
# Via MCP ou Dashboard → Edge Functions : statut ACTIVE
# Test OTP (pré-auth) :
curl -X POST "https://zqxjvmejoktwlcqshnwi.supabase.co/functions/v1/otp-send" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+237600000000"}'
# Réponse attendue : invalid_phone ou rate_limited (pas 404)
```
