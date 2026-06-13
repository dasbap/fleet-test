#!/usr/bin/env bash
# Installation du dépôt EXISTANT smart-fleet-africa (Vite + Capacitor déjà en place)
# Usage : bash scripts/vite-setup.sh
# Windows : npm run setup:vite  (PowerShell)
#
# Nouveau projet from scratch (dossier esamba-app/) :
#   bash scripts/vite-greenfield-setup.sh  (hors de ce dépôt)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> E-Samba — setup Vite + Capacitor"
echo "    Racine : $ROOT"

# Node 22 requis (Capacitor CLI 8)
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "ERREUR : Node 22+ requis (actuel : $(node -v 2>/dev/null || echo inconnu))"
  echo "  fnm install && fnm use   ou   nvm install 22 && nvm use 22"
  exit 1
fi

echo "==> Node $(node -v) OK"

# Dépendances
if [ ! -d node_modules ]; then
  echo "==> npm install..."
  npm install
else
  echo "==> node_modules présent — skip npm install (supprimez-le pour forcer)"
fi

# Environnement local
if [ ! -f .env.local ]; then
  echo "==> Création .env.local depuis .env.example..."
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -ExecutionPolicy Bypass -File scripts/init-env.ps1 || cp .env.example .env.local
  else
    cp .env.example .env.local
  fi
  echo "    Éditez .env.local : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY"
else
  echo "==> .env.local existe déjà"
fi

# Prisma generate (postinstall le fait aussi)
echo "==> prisma generate..."
npx prisma generate --schema packages/db/prisma/schema.prisma

# Vérification Supabase (non bloquant si .env incomplet)
echo "==> check:supabase..."
npm run check:supabase || echo "    (avertissement — complétez .env.local puis relancez)"

# Android SDK hint
if [ -f android/local.properties ]; then
  echo "==> android/local.properties OK"
else
  echo "==> Android : copiez android/local.properties.example → android/local.properties"
fi

# google-services.json (FCM)
if [ -f android/app/google-services.json ]; then
  echo "==> google-services.json présent"
else
  echo "==> FCM : npm run install:google-services (GOOGLE_SERVICES_JSON_PATH dans .env.local)"
fi

echo ""
echo "==> Setup terminé"
echo ""
echo "  Web dev     : npm run dev          → http://localhost:8080"
echo "  Qualité     : npm run quality"
echo "  Mobile sync : npm run mobile:prepare"
echo "  Android     : npm run cap:open:android"
echo "  Live reload : npm run cap:cli -- run android --livereload --external"
echo ""
echo "  Docs : docs/audit/AUDIT-ESAMBA-12juin2026.md"
echo "         docs/bootstrap/capacitor-mobile-setup.md"
