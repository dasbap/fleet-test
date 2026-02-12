# Checklist de validation pré-production — Thème sombre forcé

Référence : [ADR 0001 — Thème sombre forcé](adr/0001-forced-theme-dark.md).  
Contexte : Vite + React, thème forcé via `ThemeProvider` (`forcedTheme="dark"`), premier paint sombre dans `index.html`.

---

## A. Fonctionnel

- [ ] **Site toujours sombre sur toutes les routes** — Parcourir `/`, `/auth`, `/dashboard`, `/dashboard/vehicles`, `/dashboard/profile`, etc. ; confirmer fond et texte sombres partout.
- [ ] **Aucun état "clair" au chargement** — Cold start (nouvel onglet, URL directe) : pas de flash blanc ; aucun composant ne doit afficher de contenu light avant montage.
- [ ] **Pas de régression pages publiques / auth** — Tester Index, Auth, NotFound ; flux signup/login ; redirection si déjà connecté.

---

## B. Build et stabilité (Vite)

- [ ] **Build production sans warnings React** — Exécuter `npm run build && npm run preview`, ouvrir la console (F12), naviguer sur les pages clés ; aucune alerte.
- [ ] **Pas de flash clair→sombre (cold start)** — Nouvel onglet, URL directe (ex. `/dashboard/vehicles`) : pas de flash blanc.
- [ ] **Navigation privée (cache vide)** — Même vérification en fenêtre privée.
- [ ] **Safari** — Reproduire les mêmes parcours sur Safari (Desktop ou iOS) pour détecter un éventuel FOUC.

**Commande** : `npm run validate:production` (ou `npm run build && npm run preview`).

---

## C. Performance (Web Vitals)

- [ ] **CLS stable** — Lighthouse ou DevTools Performance : pas de saut de layout au chargement. Vérifier que `src/index.css` ne contient dans `.dark` que des variables de couleurs (pas de dimensions/padding/font-size).
- [ ] **FCP correct** — Pas de styles retardés ; critical CSS présent dans `index.html` pour `html.dark`.
- [ ] **Pas de long task thème** — Onglet Performance : aucun long task évident lié au montage du ThemeProvider.

---

## D. UX/UI

- [ ] **Contraste accessible (WCAG)** — Texte, boutons, liens sur fond sombre (tokens dans `index.css`) ; utiliser axe DevTools ou Lighthouse Accessibility.
- [ ] **Hover/focus visibles** — Boutons, liens, champs (Auth, DashboardHeader) : focus ring et états hover visibles.
- [ ] **Modals, dropdowns cohérents** — Dialog, Dropdown (menu utilisateur), Select, Popover : rendu sombre cohérent.

---

## E. Observabilité

- [ ] **Capture erreurs JS (Sentry ou équivalent)** — Vérifier absence d’erreurs liées au thème (ex. `useTheme` undefined, classe manquante). Filtrer/taguer les erreurs "theme" si besoin.
- [ ] **RUM (optionnel)** — Sur 24–48h post-déploiement : surveiller CLS/FCP (Vercel Analytics, Sentry Performance, ou web-vitals).

---

## F. Livraison / maintenance

- [ ] **ADR à jour** — [ADR 0001](adr/0001-forced-theme-dark.md) documente la décision et la checklist.
- [ ] **Documentation évolution thème** — README et ADR décrivent comment évoluer vers une bascule utilisateur si besoin.
- [ ] **Tests** — Checklist manuelle ci-dessus ; optionnel : snapshots sur composants clés (layout, header).

---

## Ordre recommandé

(Voir le flux recommandé dans la section « Ordre recommandé » ci-dessous.)

1. `npm run validate:production` — vérifier console et navigation.
2. Tests manuels : cold start, navigation privée, Safari ; toutes les routes ; modals/dropdowns ; accessibilité.
3. Lighthouse (Performance + Accessibility).
4. Après déploiement : vérifier Sentry (ou équivalent) et, si configuré, RUM sur 24–48h.
