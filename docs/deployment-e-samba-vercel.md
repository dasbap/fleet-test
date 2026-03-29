# Déploiement www.e-samba.com (Vercel) et prévisualisations

Ce document applique la procédure de mise en ligne : domaine de production, variables de build, auth Supabase et accès aux déploiements de prévisualisation.

Références dans le dépôt : [`vercel.json`](../vercel.json) (redirect apex → `www`, rewrites SPA), [`index.html`](../index.html) et [`src/lib/seo.ts`](../src/lib/seo.ts) (URL canonique, `VITE_APP_URL`).

---

## 1. Prévisualisation Vercel : erreur 401 Unauthorized

**Symptôme** : une URL du type `https://<projet>-git-<branche>-<hash>.vercel.app` renvoie **401** avant même le chargement de l’app.

**Cause** : **Deployment Protection** (ou *Vercel Authentication*) restreint l’accès aux déploiements non production.

**À faire (dashboard Vercel)** :

1. Ouvrir le **projet** → **Settings** (Paramètres du projet).
2. Section **Deployment Protection** (nom exact peut varier : *Protect Deployments*, *SSO*, etc.).
3. Choisir selon la politique de l’équipe :
   - **Prévisualisations publiques** : désactiver la protection pour les *Preview* / *Branch deployments*, **ou**
   - Conserver la protection et utiliser un **Protection Bypass** (mot de passe, en-tête, ou compte Vercel autorisé) pour les tests.

**Note** : aucun changement dans le dépôt Git ne supprime un 401 imposé par Vercel.

---

## 2. Production : variables d’environnement Vercel

Les variables **`VITE_*`** sont injectées **au moment du build** (`npm run build`). Après modification, lancer un **nouveau déploiement** (redeploy).

**Obligatoires** :

| Variable | Exemple / rôle |
|----------|------------------|
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clé **anon** (Settings → API dans Supabase) |

**Recommandé pour SEO et canoniques** (aligné sur [`src/lib/seo.ts`](../src/lib/seo.ts) et le plugin de prérendu) :

| Variable | Valeur |
|----------|--------|
| `VITE_APP_URL` | `https://www.e-samba.com` |

**Optionnel** : `VITE_SENTRY_DSN`, etc. (voir [`.env.example`](../.env.example)).

**Chemin Vercel** : **Settings** → **Environment Variables** → affecter au moins à **Production** ; pour les previews, dupliquer les mêmes clés si les builds de branche doivent parler au même projet Supabase.

---

## 3. Supabase : URL d’authentification

Sans cette étape, la page peut s’afficher mais la **connexion**, les **liens magiques** et les **redirections OAuth** échouent.

**Dashboard Supabase** → **Authentication** → **URL Configuration** :

- **Site URL** : `https://www.e-samba.com`
- **Redirect URLs** : inclure au minimum  
  `https://www.e-samba.com/**`  
  et pour le développement local :  
  `http://localhost:8080/**`  
  (ajouter d’autres origines si besoin : tunnel, preview Vercel, etc.)

---

## 4. Domaines Vercel et DNS (registrar)

**Dans Vercel** : **Settings** → **Domains** :

- Ajouter **`e-samba.com`** et **`www.e-samba.com`** au projet qui déploie cette application.
- Définir **`www.e-samba.com`** comme domaine principal si vous voulez le même comportement que [`vercel.json`](../vercel.json) (redirect 301 de l’apex vers `www`).

**Chez le registrar (DNS)** : appliquer exactement les enregistrements indiqués par Vercel après ajout des domaines (souvent **CNAME** `www` → `cname.vercel-dns.com` ; pour l’apex, **A** ou **ALIAS** selon l’assistant Vercel).

Attendre la propagation DNS et le certificat SSL (géré par Vercel).

**Boucles de redirection** : si le navigateur signale *too many redirects*, vérifier qu’aucune règle au registrar ne renvoie `www` → apex alors que Vercel renvoie déjà apex → `www`. Une seule source doit décider du canon (ici : apex → `www`).

---

## 5. Vérification rapide

1. `https://www.e-samba.com/` charge le shell HTML (titre E-Samba).
2. Pas d’erreur de démarrage liée à `VITE_SUPABASE_*` (voir [`src/integrations/supabase/client.ts`](../src/integrations/supabase/client.ts)).
3. Connexion test depuis la page Auth.
4. Prévisualisation : plus de 401 une fois la protection ajustée (section 1).
5. Diagnostic console (manuel ou script `npm run diagnostic:e-samba`) : voir [`diagnostic-console-e-samba.md`](diagnostic-console-e-samba.md).
