# Installation de Supabase CLI sans droits administrateur
# Methode officielle Windows : Scoop. Sinon utilisation via npx (deja en devDependency).

$ErrorActionPreference = "Continue"

# 1. Tenter l'installation via Scoop (officiel Windows, pas d'admin)
$scoop = Get-Command scoop -ErrorAction SilentlyContinue
if ($scoop) {
    Write-Host "Installation de Supabase CLI via Scoop..." -ForegroundColor Cyan
    scoop bucket add supabase https://github.com/supabase/scoop-bucket.git 2>$null
    scoop install supabase
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Verification..." -ForegroundColor Cyan
        supabase --version
        Write-Host "Supabase CLI est installe (Scoop)." -ForegroundColor Green
        exit 0
    }
}

# 2. Sinon : s'assurer que la dependance projet est installee et utiliser npx
Write-Host "Scoop non disponible. Utilisation de Supabase via npx (dependance du projet)..." -ForegroundColor Cyan
if (-not (Test-Path "package.json")) {
    Set-Location $PSScriptRoot\..
}
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur npm install." -ForegroundColor Red
    exit 1
}
Write-Host ""
Write-Host "Verification (npx supabase)..." -ForegroundColor Cyan
npx supabase --version
Write-Host ""
Write-Host "Utilisez toujours : npx supabase <commande>" -ForegroundColor Yellow
Write-Host "Pour une commande 'supabase' globale sans npx, installez Scoop puis :" -ForegroundColor Yellow
Write-Host "  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git" -ForegroundColor White
Write-Host "  scoop install supabase" -ForegroundColor White
