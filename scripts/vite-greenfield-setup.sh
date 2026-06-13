#!/usr/bin/env bash
# ============================================================
# E-SAMBA.COM — Setup complet Vite + Capacitor (greenfield)
# Crée un nouveau projet dans ./esamba-app/
#
# Usage (dossier parent vide, hors de smart-fleet-africa) :
#   bash scripts/vite-greenfield-setup.sh
#   cd esamba-app
#
# Windows : Git Bash ou WSL (pas PowerShell natif).
# Ce dépôt production utilise com.esamba.flotte et d'autres plugins :
# voir docs/bootstrap/capacitor-mobile-setup.md pour l'écart.
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PARENT_DIR="$(pwd)"

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "ERREUR : Node 20+ requis (Capacitor récent). Actuel : $(node -v 2>/dev/null || echo inconnu)"
  exit 1
fi

if [ -d esamba-app ]; then
  echo "ERREUR : le dossier esamba-app existe déjà. Supprimez-le ou changez de répertoire parent."
  exit 1
fi

echo "Création du projet Vite + React + TypeScript..."

# 1. Scaffolding Vite
npm create vite@latest esamba-app -- --template react-ts
cd esamba-app

# 2. Dépendances principales
npm install \
  @supabase/supabase-js \
  react-router-dom \
  @tanstack/react-query \
  zustand \
  react-hook-form \
  @hookform/resolvers \
  zod \
  recharts \
  date-fns \
  lucide-react \
  clsx \
  tailwind-merge \
  class-variance-authority \
  sonner \
  xlsx \
  html2pdf.js

# 3. shadcn/ui (composants Radix de base)
npm install \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-select \
  @radix-ui/react-tabs \
  @radix-ui/react-avatar \
  @radix-ui/react-separator \
  @radix-ui/react-slot \
  @radix-ui/react-toast \
  @radix-ui/react-label \
  @radix-ui/react-progress

# 4. Tailwind CSS v3 (compatible config shadcn / postcss classique)
npm install -D tailwindcss@3.4.17 postcss autoprefixer tailwindcss-animate
npx tailwindcss init -p

# 5. Capacitor Core
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios

# 6. Plugins Capacitor
npm install \
  @capacitor/app \
  @capacitor/haptics \
  @capacitor/keyboard \
  @capacitor/status-bar \
  @capacitor/filesystem \
  @capacitor/camera \
  @capacitor/share \
  @capacitor/browser

# 7. Firebase Push Notifications via Capacitor
npm install @capacitor-firebase/messaging firebase

# 8. Init Capacitor
npx cap init "E-Samba" "com.esamba.app" --web-dir=dist

# 9. Plateformes natives
npx cap add android
npx cap add ios

# 10. Fichiers de config (vite, capacitor, tailwind, css, supabase, .env)
ESAMBA_APP_ROOT="$(pwd)"
if [ -f "$REPO_ROOT/package.json" ]; then
  echo "Écriture des configs depuis $REPO_ROOT..."
  (cd "$REPO_ROOT" && npm run greenfield:write-configs -- "$ESAMBA_APP_ROOT")
fi

echo ""
echo "Setup terminé — dossier esamba-app/"
echo ""
echo "Prochaines étapes (dans esamba-app/) :"
echo "  1. Éditer .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)"
echo "  2. npm run dev                           → web (port 3000)"
echo "  3. npm run build                         → dist/"
echo "  4. npx cap sync                          → sync Android/iOS"
echo "  5. npx cap open android                  → Android Studio"
echo "  (raccourci : npm run android)"
echo ""
echo "Firebase Android (com.esamba.app) :"
echo "  1. console.firebase.google.com → projet E-Samba-Prod"
echo "  2. App Android com.esamba.app → google-services.json"
echo "  3. android/app/google-services.json puis npm run mobile:prepare"
echo "  Voir docs/bootstrap/firebase-android-setup.md"
echo ""
echo "Dépôt production (smart-fleet-africa) : npm run setup:vite + npm run mobile:prepare"
