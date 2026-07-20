# Smart Fleet Africa Mobile (Expo)

Sous-projet mobile Expo pour les tutoriels vidéo terrain.

> **Contexte projet** : l’app store production reste **Capacitor** (`com.esamba.flotte`, dashboard complet). Ce dossier est un prototype natif ciblé. Voir [`docs/mobile-capacitor-vs-react-native.md`](../../docs/mobile-capacitor-vs-react-native.md).

## Démarrage

1. Installer les dépendances : `npm install`
2. Lancer Expo : `npm run start`

## Scripts

- `npm run start` : démarre Expo Router
- `npm run android` : build + run Android
- `npm run ios` : build + run iOS
- `npm run test` : exécute les tests unitaires Vitest

## Variables d'environnement

- `EXPO_PUBLIC_SUPABASE_URL` : URL du projet Supabase

## Fonctionnalités tutoriels

- Catalogue vidéo terrain (10 tutoriels)
- Lecture inline + plein écran paysage
- Chapitres (seek rapide)
- Téléchargement hors ligne (`expo-file-system`)
- Complétion persistée (`react-native-mmkv`)
- Lecture automatique du tutoriel suivant
