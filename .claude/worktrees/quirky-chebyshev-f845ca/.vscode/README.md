# Débogage VS Code (Vite)

## Démarrer le débogage dans Chrome

1. Ouvrir l’onglet **Exécuter et déboguer** (`Ctrl+Shift+D`).
2. Choisir la configuration **« Déboguer l'application React (Vite) »**, puis **F5** (ou le bouton vert Démarrer).

La tâche **Démarrer le serveur de développement** (`npm run dev`, port **8080** selon `vite.config.ts`) est exécutée automatiquement avant l’ouverture de Chrome.

## Port 8080 déjà utilisé

- Soit arrêter l’autre instance de `npm run dev` (autre terminal ou processus).
- Soit utiliser la configuration **« Déboguer (serveur déjà lancé sur :8080) »** après avoir lancé vous-même `npm run dev` sur le port attendu.

## Attacher à un Chrome existant

Démarrer Chrome avec le débogage distant, par exemple :

`chrome.exe --remote-debugging-port=9222`

Puis lancer la configuration **« Attacher à Chrome »**.
