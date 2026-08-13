# Paiements et facturation

Ce document decrit le modele facturation et le BFF paiement du depot web.

## Architecture runtime

| Couche | Role |
| --- | --- |
| Front Vercel `www.e-samba.com` | React/Vite ; appels same-origin vers `/api/*` |
| BFF Vercel Functions | Hono sous `/api/*`, secrets PSP, webhooks signes, orchestration post-paiement |
| Supabase | PostgreSQL, Auth, RLS, donnees metier |

Les appels frontend utilisent des chemins relatifs, par exemple :

```ts
fetch("/api/billing/notch/initiate", ...)
```

## Routes BFF

| Methode | Chemin public | Handler Hono |
| --- | --- | --- |
| `GET` | `/api/health` | `/health` |
| `GET` | `/api/billing/subscriptions` | `/billing/subscriptions` |
| `POST` | `/api/billing/checkout` | `/billing/checkout` |
| `POST` | `/api/billing/mobile-money/initiate` | `/billing/mobile-money/initiate` |
| `POST` | `/api/billing/notch/initiate` | `/billing/notch/initiate` |
| `POST` | `/api/webhooks/payment` | `/webhooks/payment` |

Les routes Vercel historiques deja presentes sous `/api/admin/*`, `/api/demo/*`,
`/api/auth/*`, `/api/billing/context` et `/api/crons/*` restent des functions
dediees. Le catch-all `/api/[...path]` prend seulement les routes non captees par
ces fichiers plus specifiques.

## Webhook paiement

URL publique attendue cote PSP :

```text
https://www.e-samba.com/api/webhooks/payment
```

Le handler lit le body brut avant parsing pour verifier la signature :

- `generic` : `x-payments-webhook-secret` avec `PAYMENT_WEBHOOK_SECRET` ou `PAYMENTS_WEBHOOK_SECRET`.
- `notch` : signature HMAC dans `x-notch-signature` avec `NOTCH_PAY_WEBHOOK_SECRET` ou `NOTCH_WEBHOOK_SECRET`.
- `cinetpay` : `x-cinetpay-signature` avec `CINETPAY_WEBHOOK_SECRET`.

## Variables serveur

Ces variables restent cote Vercel Function et ne doivent jamais etre prefixees `VITE_` :

| Variable | Role |
| --- | --- |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Routes JWT avec RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhooks et actions serveur privilegiees |
| `PAYMENT_PROVIDER` | `manual`, `cinetpay` ou `notch` |
| `NOTCH_PAY_API_KEY` / `NOTCH_API_KEY` | Appels sortants Notch Pay |
| `NOTCH_PAY_WEBHOOK_SECRET` / `NOTCH_WEBHOOK_SECRET` | Verification webhook Notch Pay |
| `PAYMENT_WEBHOOK_SECRET` / `PAYMENTS_WEBHOOK_SECRET` | Webhook generique |
| `CINETPAY_WEBHOOK_SECRET` | Verification CinetPay |
| `APP_URL` | Origine publique du front, defaut `https://www.e-samba.com` |
| `BACKEND_URL` | Optionnel ; defaut `https://www.e-samba.com/api` |
| `BFF_PORT` | Port du serveur Node local, defaut `8787` |

`VITE_API_BASE_URL` et `VITE_DEV_BFF_PROXY` ne sont plus necessaires.

## Developpement local

`npm run dev` lance le BFF Node local et Vite. Vite proxifie toujours `/api/*`
vers `127.0.0.1:8787` pour les routes Hono facturation/webhooks/health, sans
variable `VITE_DEV_BFF_PROXY`.
