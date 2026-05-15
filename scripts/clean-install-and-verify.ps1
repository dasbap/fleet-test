# Réparation Windows : libère node_modules, réinstalle, build + tests webhook Clerk.
# Exécuter dans PowerShell (fermer npm run dev / autres IDE sur ce dossier avant).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
Write-Host "==> Racine: $root"

Write-Host "==> Arrêt des processus node.exe (verrous esbuild/rollup)..."
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$nm = Join-Path $root "node_modules"
if (Test-Path $nm) {
  Write-Host "==> Suppression node_modules (rimraf)..."
  npx --yes rimraf@5 "$nm"
}

Write-Host "==> npm install..."
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install a échoué ($LASTEXITCODE)" }

Write-Host "==> npm run build..."
npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build a échoué ($LASTEXITCODE)" }

Write-Host "==> npm run test:clerk-webhook..."
npm run test:clerk-webhook
if ($LASTEXITCODE -ne 0) { throw "test:clerk-webhook a échoué ($LASTEXITCODE)" }

Write-Host "==> verify:clerk-webhook-prod..."
npm run verify:clerk-webhook-prod
if ($LASTEXITCODE -ne 0) { throw "verify:clerk-webhook-prod a échoué ($LASTEXITCODE)" }

Write-Host ""
Write-Host "Tout est vert : install, build, tests webhook Clerk, vérif prod."
