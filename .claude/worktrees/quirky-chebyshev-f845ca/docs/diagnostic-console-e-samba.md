# Diagnostic console — e-samba.com

Ce document complète le déploiement ([`deployment-e-samba-vercel.md`](deployment-e-samba-vercel.md)) : vérifier les erreurs JavaScript côté navigateur et les recouper avec la configuration.

## 1. Automatique (CI ou machine locale)

Équivalent rapide à DevTools (Chromium headless) :

```bash
npm install
npx playwright install chromium
npm run diagnostic:e-samba
```

**Test local en mode verbose** (tous les messages console, idéal pour le débogage) :

```bash
npx playwright install chromium
npm run diagnostic:e-samba -- --verbose
```

Le `--` sépare les arguments npm des arguments du script (`--verbose` ou `-v`).

Par défaut, le script charge `https://e-samba.com/` et `https://www.e-samba.com/`, affiche les messages **console** de type `error`, les **pageerror** et les **requêtes réseau** échouées pertinentes. Code : [`scripts/diagnostic-e-samba-console.mjs`](../scripts/diagnostic-e-samba-console.mjs).

### Cibler d’autres URLs (prod, prévisualisation Vercel, etc.)

| Variable | Rôle |
|----------|------|
| `E_SAMBA_DIAGNOSTIC_URL` | Une seule URL (ex. `https://www.e-samba.com/`) |
| `E_SAMBA_DIAGNOSTIC_URLS` | Plusieurs URLs séparées par des **virgules** (prioritaire sur `E_SAMBA_DIAGNOSTIC_URL` si les deux sont définies) |

Exemples (PowerShell) :

```powershell
$env:E_SAMBA_DIAGNOSTIC_URL="https://www.e-samba.com/"; npm run diagnostic:e-samba
```

```powershell
$env:E_SAMBA_DIAGNOSTIC_URLS="https://www.e-samba.com/,https://e-samba.com/"; npm run diagnostic:e-samba
```

**Note** : une prévisualisation Vercel protégée (**401 Deployment Protection**) échouera à la navigation ; voir [`deployment-e-samba-vercel.md`](deployment-e-samba-vercel.md) §1.

### Mode verbose (tous les types de messages console)

Utile pour le débogage : liste aussi `log`, `warning`, etc. Le **code de sortie** reste basé uniquement sur les **erreurs** (console `error`, `pageerror`, requêtes filtrées en échec).

- Ligne de commande : `npm run diagnostic:e-samba -- --verbose` (ou `-v`)
- Environnement : `E_SAMBA_DIAGNOSTIC_VERBOSE=1` (ou `true` / `yes`)

### CI GitHub Actions

Workflow manuel : [`.github/workflows/diagnostic-e-samba-console.yml`](../.github/workflows/diagnostic-e-samba-console.yml) — onglet **Actions** → **Diagnostic console e-samba** → **Run workflow**. Par défaut il teste `https://www.e-samba.com/` ; vous pouvez ajuster la variable d’environnement du workflow si besoin.

- Code de sortie **0** : aucun problème évident détecté sur cette exécution.
- Code de sortie **1** : au moins une erreur ou un échec réseau listé — analyser la sortie.

## 2. Manuel (navigateur)

1. Ouvrir **Chrome** ou **Edge**.
2. Aller sur `https://e-samba.com` ou `https://www.e-samba.com` (le canon documenté est **www** ; l’apex peut rediriger vers `www` ou, selon le DNS, exposer une page différente — toujours valider le comportement sur **`www`** pour l’app).
3. **Clic droit → Inspecter** (ou **F12**).
4. Onglet **Console** — recharger la page (**Ctrl+R**).
5. Noter les lignes **rouges** : message exact, fichier ou chunk indiqué dans la stack.
6. Pour les problèmes **API** : onglet **Network**, filtrer `supabase` ou les statuts **4xx/5xx**.

## 3. Grille d’interprétation

| Symptôme | Piste |
|----------|--------|
| Erreur rouge JavaScript | Copier le **premier** message et la stack complète. |
| Module introuvable / `Failed to fetch dynamically imported module` | Souvent **chunks** obsolètes après déploiement (HTML en cache pointant vers d’anciens assets). Forcer un rechargement sans cache (**Ctrl+Shift+R**), vérifier un déploiement Vercel récent. |
| `window is not defined` | Rare dans le navigateur pour une SPA ; noter la stack. |
| `localStorage is not defined` | WebView / contexte sans storage. Le client Supabase utilise `localStorage` dans [`src/integrations/supabase/client.ts`](../src/integrations/supabase/client.ts). |
| Erreur **Capacitor** | Surtout pertinent pour l’**app native** ; sur le web, vérifier qu’aucun code natif n’est exécuté par erreur. |
| Erreur **fetch** / CORS / réseau | Vérifier **URL Supabase**, **auth**, **RLS** ; URLs autorisées côté Supabase (voir doc déploiement §3). |
| Message **VITE_SUPABASE_** / variable d’environnement | Les clés **`VITE_*`** sont injectées **au build** sur Vercel. Vérifier **Settings → Environment Variables → Production**, puis **redéployer** sans cache si besoin. Voir [`deployment-e-samba-vercel.md`](deployment-e-samba-vercel.md) §2. |

## 4. Contrôle des variables d’environnement (production)

Si la console indique une erreur au chargement du client Supabase :

1. Dashboard **Vercel** → projet → **Settings** → **Environment Variables**.
2. Confirmer pour **Production** : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (et idéalement `VITE_APP_URL` = `https://www.e-samba.com`).
3. Après toute modification : **Deployments** → **Redeploy** (les variables `VITE_*` ne s’appliquent qu’au **build**).

Référence : [`.env.example`](../.env.example).

## 5. Modèle de rapport à partager (issue / support)

Coller le bloc suivant, complété après reproduction :

```
URL testée :
Navigateur + version :
Heure (UTC si possible) :

--- Console (messages rouges, copier-coller) ---


--- Network (URL en échec + statut, si pertinent) ---


--- Résultat de : npm run diagnostic:e-samba (sortie complète) ---
   (si URLs personnalisées : indiquer E_SAMBA_DIAGNOSTIC_URL / E_SAMBA_DIAGNOSTIC_URLS)
```

---

**Référence rapide** : [`src/integrations/supabase/client.ts`](../src/integrations/supabase/client.ts) (validation `VITE_*` au chargement du module).
