# Guide de configuration Cursor - Smart Fleet Africa

## ✅ Vérifications automatiques effectuées

Toutes les vérifications automatiques ont été effectuées avec succès :

- ✅ Node.js installé (v24.13.0)
- ✅ npm installé (11.6.2)
- ✅ Dépendances installées (node_modules)
- ✅ Tous les fichiers de configuration créés

## 📋 Actions requises (interface Cursor)

Certaines actions nécessitent l'interface de Cursor et ne peuvent pas être automatisées :

### 1. Installer les extensions recommandées

**Option A - Notification automatique :**
- Cursor devrait afficher une notification pour installer les extensions recommandées
- Cliquez sur "Installer" dans la notification

**Option B - Manuellement :**
1. Appuyez sur `Ctrl+Shift+X` pour ouvrir le panneau des extensions
2. Recherchez et installez chaque extension de la liste :
   - ESLint (`dbaeumer.vscode-eslint`)
   - Prettier (`esbenp.prettier-vscode`)
   - Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)
   - TypeScript (`ms-vscode.vscode-typescript-next`)
   - ES7+ React/Redux/React-Native snippets (`dsznajder.es7-react-js-snippets`)
   - GitLens (`eamodio.gitlens`)
   - Error Lens (`usernamehw.errorlens`)
   - Path Intellisense (`christian-kohler.path-intellisense`)
   - Auto Rename Tag (`formulahendry.auto-rename-tag`)
   - Material Icon Theme (`pkief.material-icon-theme`)

### 2. Recharger Cursor

1. Appuyez sur `Ctrl+Shift+P` pour ouvrir la palette de commandes
2. Tapez "Reload Window" ou "Recharger la fenêtre"
3. Sélectionnez "Developer: Reload Window"

### 3. Utiliser les tâches automatisées

1. Appuyez sur `Ctrl+Shift+P`
2. Tapez "Tasks: Run Task"
3. Sélectionnez une tâche :
   - **Démarrer le serveur de développement** : Lance `npm run dev`
   - **Construire le projet** : Lance `npm run build`
   - **Lancer les tests** : Lance `npm run test`
   - **Linter le code** : Lance `npm run lint`
   - **Vérifier les types TypeScript** : Vérifie les types sans compiler

### 4. Déboguer l'application

1. Assurez-vous que le serveur de développement est lancé (`npm run dev`)
2. Appuyez sur `F5` ou allez dans le panneau "Run and Debug"
3. Sélectionnez "Déboguer l'application React"
4. Chrome s'ouvrira avec les outils de débogage connectés

## 🛠️ Scripts disponibles

Vous pouvez exécuter ces scripts depuis le terminal :

```powershell
# Vérifier la configuration complète
npm run setup

# Vérifier les extensions installées
npm run check:extensions
```

Ou directement :

```powershell
# Script de configuration
powershell -ExecutionPolicy Bypass -File scripts/setup-cursor.ps1

# Vérification des extensions
powershell -ExecutionPolicy Bypass -File scripts/check-extensions.ps1
```

## 📁 Fichiers de configuration créés

- `.vscode/settings.json` - Paramètres de l'éditeur
- `.vscode/extensions.json` - Extensions recommandées
- `.vscode/launch.json` - Configuration de débogage
- `.vscode/tasks.json` - Tâches automatisées
- `.cursorrules` - Règles pour l'assistant IA
- `.editorconfig` - Configuration de l'éditeur
- `.prettierrc` - Configuration Prettier
- `.prettierignore` - Fichiers ignorés par Prettier

## 🎯 Fonctionnalités activées

- ✅ Formatage automatique à la sauvegarde
- ✅ Correction ESLint automatique
- ✅ IntelliSense TypeScript amélioré
- ✅ Support Tailwind CSS avec autocomplétion
- ✅ Débogage Chrome intégré
- ✅ Tâches automatisées pour le développement

## 📝 Notes importantes

- Les paramètres sont maintenant partagés avec l'équipe via Git
- Les extensions recommandées seront proposées automatiquement aux nouveaux développeurs
- Le formatage est automatique selon les règles du projet
- Les règles `.cursorrules` guident l'assistant IA pour respecter les conventions du projet
