# QA manuelle — PWA hors ligne (web)

Checklist pour valider le comportement offline après un build de production (`npm run build` puis `npm run preview`, ou déploiement).

---

## Fiche de campagne (à remplir à chaque tour)

| Champ | Valeur |
|--------|--------|
| Date | |
| Testeur | |
| Build / commit / tag | |
| Environnement | ex. `localhost:4173` (preview), staging, production |
| Notes générales | |

### Navigateurs cibles

Cocher après passage sur **au moins** les scénarios 1 à 3 pour ce navigateur.

| Navigateur | Version | Scénarios 1–3 OK | Commentaire |
|------------|---------|:------------------:|-------------|
| Google Chrome | | [ ] | Référence DevTools (SW, caches) |
| Microsoft Edge | | [ ] | Aligné Chromium |
| Mozilla Firefox | | [ ] | Vérifier SW + stockage |
| Safari (macOS / iOS) | | [ ] | Si audience mobile web |

_Légende : remplacer `[ ]` par `[x]` quand la colonne est validée pour ce navigateur._

### Captures d’écran (optionnel mais utile pour l’historique)

Déposer les fichiers sous `docs/qa-screenshots/YYYY-MM-DD/` (dossier versionné via `.gitkeep`) ou lier depuis l’outil de ticket. Ne pas committer de captures lourdes sans besoin : préférer liens externes ou tickets.

| # | Sujet | Fichier ou lien |
|---|--------|-----------------|
| A | SW actif (Application → Service Workers) | |
| B | Shell OK après F5 offline | |
| C | Comportement navigation offline (fallback ou shell) | |
| D | Fiche véhicule hors ligne | |

---

## Prérequis

- [ ] Build **preview ou prod** (pas seulement `npm run dev` si le SW n’y est pas actif comme en prod).
- [ ] Session **connectée** et navigation **en ligne** au moins une fois avant les tests offline.
- [ ] DevTools ouvert (**F12**) — onglets **Network** et **Application**.

---

## 1. Démarrage du shell hors ligne

- [ ] **1.1** Charger l’app en ligne, attendre chargement complet → page OK.
- [ ] **1.2** **Application → Service Workers** : un SW est actif (**activated** / contrôle de la page).
- [ ] **1.3** **Network → Offline** (ou palette de commandes : « offline »).
- [ ] **1.4** Recharger (**F5**) → shell + assets depuis le cache, pas d’écran blanc bloquant.

**Capture associée** : A + B (recommandé).

**Si échec** : confirmer preview/prod et pas uniquement un dev server sans SW comparable à la prod.

---

## 2. Fallback `offline.html`

- [ ] **2.1** Rester **offline**.
- [ ] **2.2** Tenter une navigation vers une **route peu ou pas visitée** dans la session (ou URL sans entrée en cache).
- [ ] **2.3** Comportement **documenté** : page « Connexion indisponible » (`offline.html`) **ou** shell SPA selon Workbox — **pas** d’erreur technique brute côté utilisateur.

**Capture associée** : C.

**Note** : avec une SPA, le SW peut servir `index.html` pour les routes ; le scénario exact peut varier. L’important est la **cohérence produit** et l’absence de fuite d’erreur brute.

---

## 3. Fiche véhicule déjà consultée hors ligne

- [ ] **3.1** **En ligne** : liste véhicules puis **fiche détail** (ou page équivalente) → données affichées.
- [ ] **3.2** Attendre fin de chargement (plus de spinner bloquant).
- [ ] **3.3** Passer **offline**.
- [ ] **3.4** Revenir sur la **même fiche** → dernière version connue ou dégradé acceptable, **sans stack trace** en UI.

**Capture associée** : D.

---

## Débogage rapide

- [ ] **Application → Cache storage** : caches Workbox attendus (`pages`, `supabase-vehicles-list`, `supabase-vehicle-detail`, etc.).
- [ ] **Console** : messages PWA / SW (prêt hors ligne, mise à jour disponible) si applicable.

---

## Référence technique

- Config : `vite.config.ts` (plugin `VitePWA`, `navigateFallback`, `runtimeCaching`).
- Fallback statique : `public/offline.html`.
- Enregistrement SW : `src/pwa.ts`, import dans `src/main.tsx`.
