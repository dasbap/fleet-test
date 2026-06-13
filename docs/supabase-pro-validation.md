# Validation Supabase Pro — E-SAMBA

Synthèse opérationnelle post-audit (juin 2026). Le plan organisation est **déjà Pro** ; ce document trace les actions pour exploiter pleinement le tier.

## Décision

| Critère | État |
|---------|------|
| Organisation `viwjsaoiigwrwttmbpwl` | Plan **pro** |
| Projet prod `zqxjvmejoktwlcqshnwi` | `ACTIVE_HEALTHY`, PostgreSQL 17.6 |
| Migration de tier | **Non requise** |

Vérification automatisée : `npm run verify:supabase-pro`

---

## 1. Gouvernance org

- [x] Plan Pro confirmé (MCP / Dashboard Billing)
- [x] Projet parasite `wdvpekljddxfdxpbyfgz` (`supabase --version`) — **supprimé** (vérifié via Management API, 2026-06-11)

---

## 2. Secrets Edge Functions

Dashboard → [Edge Functions → Secrets](https://supabase.com/dashboard/project/zqxjvmejoktwlcqshnwi/settings/functions)  
ou CLI (après `supabase login`) :

```bash
npx supabase secrets set CRON_SECRET="<secret>" --project-ref zqxjvmejoktwlcqshnwi
npx supabase secrets set FCM_SERVER_KEY="<clé>" --project-ref zqxjvmejoktwlcqshnwi
npx supabase secrets set RESEND_API_KEY="<clé>" --project-ref zqxjvmejoktwlcqshnwi
npx supabase secrets set RESEND_FROM_EMAIL="billing@e-samba.com" --project-ref zqxjvmejoktwlcqshnwi
npx supabase secrets set WHATSAPP_ACCESS_TOKEN="<token>" --project-ref zqxjvmejoktwlcqshnwi
npx supabase secrets set WHATSAPP_PHONE_NUMBER_ID="<id>" --project-ref zqxjvmejoktwlcqshnwi
npx supabase secrets set WHATSAPP_APP_SECRET="<secret>" --project-ref zqxjvmejoktwlcqshnwi
npx supabase secrets set WHATSAPP_VERIFY_TOKEN="<token>" --project-ref zqxjvmejoktwlcqshnwi
npx supabase secrets set ORANGE_SMS_TOKEN="<bearer>" --project-ref zqxjvmejoktwlcqshnwi
```

| Secret | Fonctions |
|--------|-----------|
| `CRON_SECRET` | `billing-lifecycle-cron`, `retention-nudge`, `onboarding-sequence`, `process-whatsapp-retries`, crons pg |
| `FCM_SERVER_KEY` | `send-notification`, `retention-nudge`, `onboarding-sequence`, `generate-voice-coaching` |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | `support-notify`, `process-notification-queue` |
| WhatsApp (`WHATSAPP_*`) | `send-whatsapp`, `process-whatsapp-retries`, `whatsapp-bot` |
| `ORANGE_SMS_TOKEN` | `onboarding-sequence` (SMS CM) |

Scripts (sans commit des secrets) :

```bash
# Orchestration complète (token Credential Manager / supabase login) :
npm run apply:supabase-pro

# Poussée ciblée depuis .env.local uniquement :
npm run secrets:supabase-edge
```

**État secrets EF** : `CRON_SECRET`, `FCM_SERVER_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` présents ; manquent `WHATSAPP_*`, `ORANGE_SMS_TOKEN`.

Référence : [`docs/supabase-edge-functions-sync.md`](supabase-edge-functions-sync.md)

### Push FCM (Capacitor, pas React Native)

- Stack : **Capacitor** + table `notification_tokens` — voir [`docs/push-notifications-capacitor.md`](push-notifications-capacitor.md)
- Android : `android/app/google-services.json` (projet Firebase `taxis-flotte`, package `com.esamba.flotte`)
- Secret serveur : `FCM_SERVER_KEY` (clé legacy `AAAA…`, **pas** `apiKey` Web ni compte de service JSON)
- Vérification : `npm run verify:fcm` puis `npm run verify:fcm -- --probe-send` après injection

---

## 3. Auth téléphone (OTP mobile)

### Configuration Dashboard

1. [Authentication → Providers → Phone](https://supabase.com/dashboard/project/zqxjvmejoktwlcqshnwi/auth/providers)
2. Activer **Phone** et configurer le provider SMS (Twilio, MessageBird, ou provider CEMAC)
3. Vérifier les **Redirect URLs** : `https://www.e-samba.com/**`, `capacitor://localhost`

### Test `otp-send` (couche anti-spam)

```bash
npm run verify:supabase-pro
# ou manuellement :
node scripts/verify-supabase-pro-readiness.mjs --otp-only
```

| Réponse | Signification |
|---------|---------------|
| `404` | Fonction non déployée |
| `400` `invalid_phone` | Fonction OK, validation métier |
| `502` `provider_error` | Fonction OK, **provider Phone Auth non configuré** |
| `200` `ok: true` | OTP envoyé — provider opérationnel |

Composant client : [`src/components/auth/PhoneAuthForm.tsx`](../src/components/auth/PhoneAuthForm.tsx)  
Edge Function : [`supabase/functions/otp-send/`](../supabase/functions/otp-send/)

**État au 2026-06-11** : `otp-send` ACTIVE (v2) ; sonde prod → `provider_error` (provider SMS à activer).

---

## 4. Sentry (Vercel production)

| Variable | Rôle |
|----------|------|
| `VITE_SENTRY_DSN` | Capture erreurs JS — [`src/instrument.ts`](../src/instrument.ts) |
| `VITE_APP_VERSION` | Regroupement par release (déjà sur Vercel) |

**État au 2026-06-11** : `VITE_SENTRY_DSN` **absent** de l’environnement Vercel Production.

Ajout (une fois le DSN Sentry créé) :

```bash
npx vercel env add VITE_SENTRY_DSN production
# Coller le DSN, puis redéployer :
npm run deploy:prebuilt
```

Test post-déploiement : déclencher une erreur volontaire (console dev) et vérifier l’issue dans Sentry.

Vérification : `node scripts/verify-supabase-pro-readiness.mjs --vercel-sentry`

---

## 5. Alertes Supabase (Reports)

Dashboard → [Reports](https://supabase.com/dashboard/project/zqxjvmejoktwlcqshnwi/reports)  
Settings → [Integrations](https://supabase.com/dashboard/project/zqxjvmejoktwlcqshnwi/settings/integrations)

| Alerte | Seuil | Canal |
|--------|-------|-------|
| Disk usage | > **85 %** (alerte précoce à 70 %) | Email équipe ops |
| Connexions DB | > **80 %** du quota plan | Email |
| Edge Functions 5xx | `billing-lifecycle-cron`, `otp-send` | Webhook ou email |
| Database unhealthy | immédiat | Email + escalade P0 |

Baseline enregistrée (2026-06-11) : DB **29 MB**, **6** connexions actives.

Détail : [`docs/supabase-monitoring-runbook.md`](supabase-monitoring-runbook.md)

---

## 6. Capacité Pro — seuils de surveillance

| Ressource | Quota Pro (typique) | Alerte |
|-----------|---------------------|--------|
| PostgreSQL | 8 Go | 70 % |
| Bandwidth | 100 Go/mois | pics mobile + reporting |
| Storage | 100 Go | photos DVIR / maintenance |
| Edge invocations | quota Pro | crons billing + notifications |

Revoir compute add-on (Micro → Small) avant **> 500 flottes** ou **> 5k MAU**.

---

## Critères de succès

- [x] Plan org = Pro confirmé
- [x] Backups + PITR documentés ([`supabase-backups-checklist.md`](supabase-backups-checklist.md))
- [x] Projet inactif supprimé
- [x] Secrets EF critiques renseignés (`CRON_SECRET`, `FCM_SERVER_KEY`, Resend) — `npm run verify:fcm`
- [ ] Push device validé (token dans `notification_tokens` + `npm run verify:fcm -- --probe-send`)
- [ ] WhatsApp / Orange SMS à compléter
- [ ] Provider Phone Auth activé (`otp-send` → 200)
- [ ] `VITE_SENTRY_DSN` sur Vercel prod
- [ ] Alertes Reports configurées
- [x] Advisors **0 ERROR** ; `npm run lint && npm test` verts
