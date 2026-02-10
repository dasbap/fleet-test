# E-Samba — Smart Fleet Africa

Application web de gestion intelligente de flotte en Afrique Centrale. Suivi des véhicules, gestion des entretiens, alertes automatisées et supervision des opérations quotidiennes.

## Prérequis

- Node.js (LTS recommandé)
- npm

[Installation de Node.js avec nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

## Démarrage

```sh
# Cloner le dépôt
git clone <URL_DU_DEPOT>
cd smart-fleet-africa

# Installer les dépendances
npm i

# Lancer le serveur de développement
npm run dev
```

L’application est disponible sur `http://localhost:8080`.

## Technologies

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (backend / auth)

## Scripts disponibles

- `npm run dev` — serveur de développement
- `npm run build` — build de production
- `npm run preview` — prévisualisation du build
- `npm run lint` — lint ESLint
- `npm run test` — tests unitaires
- `npm run test:integration` — tests d’intégration

## Performance et CLS (Cumulative Layout Shift)

Le projet applique des mesures pour limiter le layout shift post-hydratation (polices, couleurs, images).

### Bonnes pratiques en place

- **Polices** : preconnect + chargement des feuilles Google Fonts dans `index.html` avec `display=swap` ; pas d’`@import` dans le CSS pour éviter un chargement tardif. `font-heading` (Tailwind) aligné sur les polices réellement chargées (Poppins).
- **Thème** : classe `dark` et styles critiques (couleur de fond, texte) injectés dès le premier paint dans `index.html` pour éviter un flash puis un shift.
- **Images** : `width`/`height` ou conteneur avec `aspect-ratio` sur les `<img>` et zones d’aperçu pour réserver l’espace avant chargement (HeroSection, EvidencePreviewCard, EvidenceGrid, ProofUpload).
- **Styles post-hydratation** : éviter d’appliquer des classes ou couleurs dans un `useEffect` sans réserver l’espace au premier rendu ; privilégier des classes appliquées dès le premier rendu.

### Mesure du CLS

- **Chrome DevTools** : onglet Performance, enregistrer un chargement, puis « Experience » → métrique Cumulative Layout Shift.
- **PageSpeed Insights** : [https://pagespeed.web.dev/](https://pagespeed.web.dev/) — rapport Core Web Vitals dont le CLS.
- **En production** : intégrer `web-vitals` (ou équivalent) pour remonter le CLS réel des utilisateurs.

## Évolution du thème

L’application utilise actuellement un **thème sombre forcé** (voir [ADR 0001 — Thème sombre forcé](docs/adr/0001-forced-theme-dark.md)). Pour un passage futur à un thème sélectionnable par l’utilisateur (light/dark/système), consulter la section « Notes techniques (si réactivation d’un switch thème) » de l’ADR et les commentaires dans `src/index.css`.
