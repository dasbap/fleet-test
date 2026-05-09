# Script pour vérifier et corriger les types enum dans Supabase
# Ce script affiche les instructions pour exécuter le script SQL

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CORRECTION DES TYPES ENUM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Join-Path $PSScriptRoot "..\supabase\fix-enums-idempotent.sql"
$verifyPath = Join-Path $PSScriptRoot "..\supabase\verify-and-fix-enums.sql"

if (Test-Path $scriptPath) {
    Write-Host "✓ Script de correction trouvé: $scriptPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "INSTRUCTIONS:" -ForegroundColor Yellow
    Write-Host "1. Ouvrez le Supabase Dashboard" -ForegroundColor White
    Write-Host "2. Allez dans SQL Editor" -ForegroundColor White
    Write-Host "3. Copiez le contenu du fichier: $scriptPath" -ForegroundColor White
    Write-Host "4. Collez et exécutez le script" -ForegroundColor White
    Write-Host ""
    Write-Host "OU exécutez directement via psql/supabase CLI" -ForegroundColor Yellow
    Write-Host ""
    
    # Afficher un aperçu du script
    Write-Host "Aperçu du script (premières lignes):" -ForegroundColor Cyan
    Write-Host "-----------------------------------" -ForegroundColor Gray
    Get-Content $scriptPath -Head 20 | Write-Host
    Write-Host "..." -ForegroundColor Gray
    Write-Host ""
    
    # Demander si l'utilisateur veut voir le contenu complet
    $response = Read-Host "Voulez-vous afficher le contenu complet du script? (o/N)"
    if ($response -eq "o" -or $response -eq "O") {
        Write-Host ""
        Write-Host "Contenu complet du script:" -ForegroundColor Cyan
        Write-Host "=========================" -ForegroundColor Gray
        Get-Content $scriptPath | Write-Host
    }
} else {
    Write-Host "✗ Script de correction introuvable: $scriptPath" -ForegroundColor Red
}

Write-Host ""
Write-Host "Script de vérification disponible: $verifyPath" -ForegroundColor Cyan
Write-Host ""
