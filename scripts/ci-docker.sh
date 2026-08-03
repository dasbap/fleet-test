#!/usr/bin/env bash
# Suite CI dans Docker (Linux). Sous Windows, monter un volume anonyme sur /app/node_modules :
#   docker run --rm -v "$PWD:/app" -v /app/node_modules -w /app node:22-bookworm bash /app/scripts/ci-docker.sh
set -euo pipefail

export VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-https://placeholder.supabase.co}"
export VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:-placeholder_key}"
export DATABASE_URL="${DATABASE_URL:-postgresql://u:p@127.0.0.1:5432/postgres}"
export DIRECT_URL="${DIRECT_URL:-postgresql://u:p@127.0.0.1:5432/postgres}"

echo "==> npm install (lockfile + workspaces ; sans postinstall Playwright)"
npm config set fetch-retries 5
npm install --no-audit --no-fund --ignore-scripts
echo "==> prisma generate"
npx prisma generate --schema packages/db/prisma/schema.prisma

echo "==> lint"
npm run lint

echo "==> tsc"
npx tsc --noEmit

echo "==> test"
npm test

echo "==> build"
npm run build

echo "=== TOUS LES CHECKS OK ==="
