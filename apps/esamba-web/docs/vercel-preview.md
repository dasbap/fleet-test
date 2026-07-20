# Preview Vercel — E-Samba Web (Next.js)

Déploiement de test **sans impact** sur [www.e-samba.com](https://www.e-samba.com) (SPA Vite actuelle).

## Projet Vercel

| Paramètre | Valeur |
|-----------|--------|
| Projet | `atipik/esamba-web` |
| URL de test | [https://esamba-web.vercel.app](https://esamba-web.vercel.app) |
| Git | `github.com/atipikrh/smart-fleet-africa` (connecté) |
| Root Directory | **`apps/esamba-web`** (à confirmer dans le Dashboard) |
| Framework | Next.js |
| Région | `cdg1` |

> **www.e-samba.com** reste sur le projet `e-samba-web` (SPA Vite). Ce projet Next est isolé.

## Déploiement preview (CLI)

```bash
npm run esamba-web:deploy:preview
```

Variables locales injectées au build via `--build-env` (voir `scripts/deploy-esamba-web-preview.mjs`).

## Variables d'environnement

```bash
npm run esamba-web:sync-vercel-env
```

Synchronise **Production** + **Development** depuis `apps/esamba-web/.env.local`.

| Variable | Preview (Git) | Production |
|----------|---------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Dashboard* | Oui |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dashboard* | Oui |
| `NEXT_PUBLIC_APP_URL` | Non | `https://www.e-samba.com` |
| `NOTCH_PAY_API_KEY` | Optionnel | Optionnel |

\*Après `vercel git connect`, le CLI peut exiger le Dashboard pour **Preview → toutes les branches** :  
Vercel → `esamba-web` → **Settings** → **Environment Variables** → cocher **Preview** sur chaque variable.

## Supabase Auth

Déjà poussé via `supabase config push` :

- `https://*.vercel.app/**`
- `https://esamba-web.vercel.app/**`

Callback : `/auth/callback`

## Deployment Protection

État vérifié le 12/06/2026 :

| Protection | Statut |
|------------|--------|
| SSO (`--sso`) | Désactivé (`null`) |
| Git fork protection | Activé |
| Password | Non détecté via CLI |

Commande : `npx vercel project protection esamba-web --format json`

Les URLs testées répondent **200** (pas de 401) :

- `https://esamba-web.vercel.app/api/health`
- `https://esamba-lmqgndakl-atipik.vercel.app/api/health`

## Configuration Git monorepo (obligatoire)

Dans Vercel → **esamba-web** → **Settings** → **General** :

- **Root Directory** : `apps/esamba-web`

Sans cela, les déploiements Git depuis la racine du dépôt échoueront.

## Checklist tests live — 12/06/2026

| Test | Statut | Notes |
|------|--------|-------|
| `GET /api/health` | OK | `200`, `service: esamba-web` |
| `/` landing | OK | `200` |
| `/inscription` | OK | `200` |
| `/connexion` | OK | `200` |
| Inscription + email | Manuel | Tester avec une vraie boîte mail |
| Magic link | Manuel | Vérifier redirect Supabase |
| Onboarding 3 étapes | Manuel | Après inscription |
| `/dashboard` KPIs | Redirect | `307` → connexion si non auth (attendu) |
| `/dashboard/vehicules` | Redirect | `307` si non auth |
| `/dashboard/rapports` | Redirect | `307` si non auth |
| Upload document | Manuel | Connecté + bucket `incident-evidence` |
| Abonnement NotchPay | Manuel | Clé configurée en Production |

## Bascule production (ultérieure)

1. Parité fonctionnelle validée sur preview
2. `NEXT_PUBLIC_APP_URL=https://www.e-samba.com` en Production
3. Ne pas remplacer `www.e-samba.com` sans plan de migration SPA → Next
4. `npx vercel --prod` depuis `apps/esamba-web` uniquement si domaine dédié
