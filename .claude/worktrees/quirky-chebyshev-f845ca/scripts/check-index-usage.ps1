# =====================================================
# ANALYSE DE L'UTILISATION DES INDEX
# Smart Fleet Africa
# =====================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ANALYSE DE L'UTILISATION DES INDEX" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$sqlFile = "supabase/check-index-usage.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "ERREUR: Fichier $sqlFile introuvable" -ForegroundColor Red
    exit 1
}

Write-Host "Fichier SQL trouve: $sqlFile" -ForegroundColor Green
Write-Host ""

Write-Host "CONTENU DE LA REQUETE SQL:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Gray
Get-Content $sqlFile | Select-Object -First 15
Write-Host "========================================" -ForegroundColor Gray
Write-Host ""

Write-Host "INSTRUCTIONS POUR EXECUTER DANS SUPABASE:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Ouvrez Supabase Dashboard" -ForegroundColor White
Write-Host "   https://app.supabase.com" -ForegroundColor Gray
Write-Host "   Selectionnez votre projet" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Allez dans SQL Editor" -ForegroundColor White
Write-Host "   Menu de gauche -> SQL Editor" -ForegroundColor Gray
Write-Host ""

Write-Host "3. Copiez la requete principale:" -ForegroundColor White
Write-Host "   (Les 10 premieres lignes du fichier SQL)" -ForegroundColor Gray
Write-Host ""

Write-Host "4. Collez et executez dans l'editeur SQL" -ForegroundColor White
Write-Host "   Cliquez sur 'Run' (ou Ctrl+Enter)" -ForegroundColor Gray
Write-Host ""

Write-Host "5. Analysez les resultats:" -ForegroundColor White
Write-Host "   - Index avec 0 utilisation: peut etre inutile" -ForegroundColor Gray
Write-Host "   - Index avec beaucoup d'utilisations: efficace" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FICHIER SQL: $sqlFile" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
