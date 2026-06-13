# Installation automatique - Flotte E-Samba (Vite + Capacitor)
# Usage : powershell -ExecutionPolicy Bypass -File scripts/vite-setup.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "==> E-Samba - setup Vite + Capacitor"
Write-Host "    Racine : $Root"

$nodeVersion = node -v
if ($nodeVersion -notmatch '^v22\.') {
    throw "Node 22+ requis (actuel : $nodeVersion). Utilisez fnm ou nvm."
}

Write-Host "==> Node $nodeVersion OK"

if (-not (Test-Path node_modules)) {
    Write-Host "==> npm install..."
    npm install
} else {
    Write-Host "==> node_modules present - skip npm install"
}

if (-not (Test-Path .env.local)) {
    Write-Host "==> Creation .env.local..."
    & "$Root\scripts\init-env.ps1"
    Write-Host "    Editez .env.local : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY"
} else {
    Write-Host "==> .env.local existe deja"
}

Write-Host "==> prisma generate..."
npx prisma generate --schema packages/db/prisma/schema.prisma

Write-Host "==> check:supabase..."
npm run check:supabase
if ($LASTEXITCODE -ne 0) {
    Write-Host "    (avertissement - completez .env.local puis relancez)"
}

if (Test-Path android/local.properties) {
    Write-Host "==> android/local.properties OK"
} else {
    Write-Host "==> Android : copiez android/local.properties.example vers android/local.properties"
}

if (Test-Path android/app/google-services.json) {
    Write-Host "==> google-services.json present"
} else {
    Write-Host "==> FCM : npm run install:google-services"
}

Write-Host ""
Write-Host "==> Setup termine"
Write-Host "  Web dev     : npm run dev          -> http://localhost:8080"
Write-Host "  Mobile sync : npm run mobile:prepare"
Write-Host "  Docs        : docs/audit/AUDIT-ESAMBA-12juin2026.md"
