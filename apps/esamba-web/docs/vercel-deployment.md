# Déploiement E-Samba Web (Next.js) sur Vercel

Application : `apps/esamba-web` (Next.js 16, App Router).

> **Preview (recommandé en premier)** : voir [vercel-preview.md](./vercel-preview.md) — `npm run esamba-web:deploy:preview` depuis la racine du dépôt.

## 1. Créer le projet Vercel

1. Importer le dépôt GitHub `smart-fleet-africa`.
2. **Root Directory** : `apps/esamba-web`
3. **Framework Preset** : Next.js (détection automatique)
4. **Build Command** : `npm run build`
5. **Install Command** : `npm install` (depuis la racine du sous-dossier)

## 2. Variables d'environnement

Configurer dans **Settings → Environment Variables** (Production + Preview) :

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Oui | URL projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Oui | Clé anon Supabase |
| `NEXT_PUBLIC_APP_URL` | Oui | URL canonique (`https://www.e-samba.com` ou preview) |
| `NOTCH_PAY_API_KEY` | Paiement | Clé API NotchPay |
| `FAPSHI_API_USER` | Paiement | Utilisateur API Fapshi (live) |
| `FAPSHI_API_KEY` | Paiement | Clé API Fapshi |

Après toute modification : **Redeploy**.

## 3. Supabase Auth

**Authentication → URL Configuration** :

- **Site URL** : `https://www.e-samba.com` (ou URL preview pour tests)
- **Redirect URLs** :
  - `https://www.e-samba.com/**`
  - `http://localhost:3000/**`
  - `https://*.vercel.app/**` (previews)

Callback app : `/auth/callback`

## 4. Domaines

- Ajouter `www.e-samba.com` comme domaine principal.
- Rediriger l'apex `e-samba.com` → `www` (DNS + Vercel).

## 5. Vérification locale avant déploiement

```bash
cd apps/esamba-web
cp .env.example .env.local
# Renseigner les variables
npm run build
npm run start
```

## 6. Déploiement CLI (optionnel)

```bash
cd apps/esamba-web
npx vercel link
npx vercel --prod
```

## 7. Checklist post-déploiement

- [ ] `/` landing + liens inscription/connexion
- [ ] Connexion email + magic link
- [ ] Onboarding 3 étapes
- [ ] Dashboard KPIs
- [ ] Upload document (Storage `incident-evidence`)
- [ ] Paiement abonnement (NotchPay / Fapshi)
- [ ] Pas de 401 sur les previews (Deployment Protection)
