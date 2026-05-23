# Déploiement automatisé du hub marketing (Vercel CLI requis + vercel login).
# Usage : powershell -ExecutionPolicy Bypass -File scripts/deploy-marketing-vercel.ps1

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")

$marketing = Join-Path $root "apps/marketing"
$spa = $root

Write-Host ">> Projet marketing (esamba-marketing)..."
Push-Location $marketing
if (-not (Test-Path ".vercel/project.json")) {
  vercel link -p esamba-marketing -y
}
vercel env add PUBLIC_SITE_URL production --value "https://marketing.e-samba.com" --yes 2>$null
vercel env add PUBLIC_APP_URL production --value "https://www.e-samba.com" --yes 2>$null
vercel deploy --prod --yes
vercel domains add marketing.e-samba.com 2>$null
vercel alias set esamba-marketing.vercel.app marketing.e-samba.com 2>$null
Pop-Location

Write-Host ">> SPA (smart-fleet-africa) — VITE_MARKETING_URL..."
Push-Location $spa
if (-not (Test-Path ".vercel/project.json")) {
  vercel link -p smart-fleet-africa -y
}
vercel env add VITE_MARKETING_URL production --value "https://marketing.e-samba.com" --yes 2>$null
vercel deploy --prod --yes
Pop-Location

Write-Host "OK — https://marketing.e-samba.com/guides"
