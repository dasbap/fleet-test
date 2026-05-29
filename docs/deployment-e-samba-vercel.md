# Déploiement www.e-samba.com (Vercel) et prévisualisations

Ce document applique la procédure de mise en ligne : domaine de production, variables de build, auth Supabase et accès aux déploiements de prévisualisation.

Références dans le dépôt : [`vercel.json`](../vercel.json) (redirect apex → `www`, rewrites SPA), [`index.html`](../index.html) et [`src/lib/seo.ts`](../src/lib/seo.ts) (URL canonique, `VITE_APP_URL`).

### Runtime Node.js (build Vercel et Capacitor)

Le dépôt impose **`engines.node` ≥ 22** ([`package.json`](../package.json)), aligné sur **@capacitor/cli** 8.x. Vercel utilise en général la version indiquée par `package.json` ou [`.node-version`](../.node-version) ; vérifier après déploiement les logs d’installation (`node -v` attendu : **v22.x**). Cela supprime l’avertissement npm **EBADENGINE** sur les builds.

### Build WebView Capacitor (iOS / Android)

Le déploiement **Vercel** sert l’app web ; le **shell natif** charge le même bundle via WebView après un build dédié :

```bash
npm run build:capacitor
npx cap sync
```

Raccourci : `npm run mobile:prepare` (build + `cap sync`). Le mode Vite `capacitor` applique `base: "./"` pour des chemins relatifs corrects dans la WebView ([`vite.config.ts`](../vite.config.ts)). Un workflow GitHub vérifie que `npm run build:capacitor` réussit sur les PR vers `main`. La structure des dossiers `src/` pour Flotte E-Samba est décrite dans [structure-flotte-e-samba.md](./structure-flotte-e-samba.md).

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

## 5. Erreur `404 DEPLOYMENT_NOT_FOUND` (Vercel)

**Symptôme** : page Vercel avec le texte *Deployment not found*, code `DEPLOYMENT_NOT_FOUND`, identifiant du type `cdg1::…`.

**Ce n’est pas** une 404 de l’application React : Vercel ne trouve **aucun déploiement** pour l’URL demandée (preview supprimée, lien expiré, ou déploiement jamais terminé).

**À faire** :

1. **Production** : ouvrir uniquement **`https://www.e-samba.com`** (ou le domaine indiqué dans Vercel → Domains), pas un ancien lien `*.vercel.app` copié depuis un commentaire PR ou un e-mail.
2. **Dashboard Vercel** → projet `smart-fleet-africa` → **Deployments** : vérifier que le dernier déploiement **Production** est **Ready** (vert). Si **Error** ou **Canceled**, ouvrir les logs de build, corriger, puis **Redeploy**.
3. **Branche de production** : **Settings** → **Git** → *Production Branch* doit correspondre à la branche que vous poussez (souvent `main`). Un push sur une autre branche ne met à jour que les **Preview**.
4. **Redéploiement prebuilt** (recommandé si `vercel build` échoue avec `spawn cmd.exe ENOENT` sous Windows) :
   ```bash
   npm run build
   npm run vercel:package-prebuilt
   npx vercel deploy --prebuilt --prod
   ```
   Raccourci : `npm run deploy:prebuilt`

   Sous **PowerShell / CMD Windows**, `npx vercel build --prod` peut fonctionner ; sinon utiliser le script ci-dessus (équivalent Build Output API v3 à partir de `dist/`).

   **Limite** : ce flux prebuilt statique ne recompile pas les fonctions `api/` ; pour un changement webhook/API, préférer `npx vercel deploy --prod` (build distant) ou `vercel build` réussi en local.
5. **Preview** : chaque URL `…-git-…-….vercel.app` est liée à **un** déploiement ; après suppression ou expiration, elle affiche `DEPLOYMENT_NOT_FOUND` → utiliser le lien **Visit** du déploiement le plus récent dans le dashboard, ou merger sur la branche de prod.

**Vérification locale** : `npm run build` puis `npx vite preview` → `http://localhost:4173/ressources/seo-ia`.

---

## 6. Vérification rapide

1. `https://www.e-samba.com/` charge le shell HTML (titre E-Samba).
2. Pas d’erreur de démarrage liée à `VITE_SUPABASE_*` (voir [`src/integrations/supabase/client.ts`](../src/integrations/supabase/client.ts)).
3. Connexion test depuis la page Auth.
4. Prévisualisation : plus de 401 une fois la protection ajustée (section 1).
5. Diagnostic console (manuel ou script `npm run diagnostic:e-samba`) : voir [`diagnostic-console-e-samba.md`](diagnostic-console-e-samba.md).

---

## 7. Archive technique — webhook Clerk retiré

Depuis l’option C-1, le webhook Clerk a été retiré du runtime applicatif et Supabase Auth est la seule source de vérité.

- Les anciennes références webhook Clerk restent uniquement comme historique de migration.
- Ne pas réactiver de flux Clerk en production.
- Toute intégration auth côté web doit rester alignée sur Supabase Auth et RLS.

---

## 8. Rollout production combiné (web + stores)

Pour une procédure incluant déploiement progressif sur les stores, surveillance 24 h et montée en charge : [`rollout-production-web-mobile.md`](./rollout-production-web-mobile.md).
