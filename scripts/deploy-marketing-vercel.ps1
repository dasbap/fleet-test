# Déploiement automatisé du hub marketing + SPA (Vercel CLI + vercel login).
# Usage : powershell -ExecutionPolicy Bypass -File scripts/deploy-marketing-vercel.ps1

$ErrorActionPreference = "Continue"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")

$marketingProjectId = "prj_LkwpisIC6ISuxdDDxoIKa8NOu4An"
$marketingOrgId = "team_xcfiNTxKb1iiEGATx6edNZPh"

Write-Host ">> Projet marketing (esamba-marketing)..."
Push-Location $root
$env:VERCEL_ORG_ID = $marketingOrgId
$env:VERCEL_PROJECT_ID = $marketingProjectId
vercel deploy --prod --yes
Remove-Item Env:VERCEL_PROJECT_ID -ErrorAction SilentlyContinue
Remove-Item Env:VERCEL_ORG_ID -ErrorAction SilentlyContinue
Pop-Location

Write-Host ">> SPA (smart-fleet-africa)..."
Push-Location $root
if (-not (Test-Path ".vercel/project.json")) {
  vercel link -p smart-fleet-africa -y
}
vercel deploy --prod --yes
Pop-Location

Write-Host "OK — https://marketing.e-samba.com/guides"
