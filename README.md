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
