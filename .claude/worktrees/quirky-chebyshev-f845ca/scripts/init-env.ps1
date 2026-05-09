# Script d'initialisation des variables d'environnement
# Ce script cree le fichier .env.local depuis .env.example

Write-Host "Initialisation des variables d'environnement..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path ".env.local") {
    Write-Host "ATTENTION: Le fichier .env.local existe deja" -ForegroundColor Yellow
    $response = Read-Host "Voulez-vous le remplacer? (o/N)"
    if ($response -ne "o" -and $response -ne "O") {
        Write-Host "Operation annulee" -ForegroundColor Yellow
        exit 0
    }
}

if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env.local" -Force
    Write-Host "Fichier .env.local cree depuis .env.example" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: Modifiez maintenant .env.local avec vos vraies valeurs Supabase:" -ForegroundColor Yellow
    Write-Host "  1. Ouvrez .env.local" -ForegroundColor White
    Write-Host "  2. Remplacez VITE_SUPABASE_URL par votre URL Supabase" -ForegroundColor White
    Write-Host "  3. Remplacez VITE_SUPABASE_ANON_KEY par votre clé anon" -ForegroundColor White
    Write-Host ""
    Write-Host "Vous pouvez trouver ces valeurs dans:" -ForegroundColor Cyan
    Write-Host "  https://app.supabase.com -> Votre projet -> Settings -> API" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "ERREUR: Fichier .env.example introuvable" -ForegroundColor Red
    exit 1
}
