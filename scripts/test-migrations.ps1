# =====================================================
# Script de test des migrations
# Smart Fleet Africa - E-Samba
# =====================================================
# Ce script aide à tester les fonctions RPC après l'application des migrations
# =====================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST DES MIGRATIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que les fichiers de migration existent
$migration1 = "supabase/migrations/20250205000000_fix_schema_metier.sql"
$migration2 = "supabase/migrations/20250205000001_add_scores_and_alerts.sql"
$verifyScript = "supabase/verify-migrations-complete.sql"

if (-not (Test-Path $migration1)) {
    Write-Host "❌ Fichier de migration 1 introuvable: $migration1" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $migration2)) {
    Write-Host "❌ Fichier de migration 2 introuvable: $migration2" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $verifyScript)) {
    Write-Host "❌ Script de vérification introuvable: $verifyScript" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Tous les fichiers de migration sont présents" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "INSTRUCTIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Connectez-vous au Supabase Dashboard:" -ForegroundColor Yellow
Write-Host "   https://app.supabase.com" -ForegroundColor White
Write-Host ""
Write-Host "2. Ouvrez le SQL Editor" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Appliquez les migrations dans l'ordre:" -ForegroundColor Yellow
Write-Host "   a) Ouvrez: $migration1" -ForegroundColor White
Write-Host "   b) Copiez tout le contenu" -ForegroundColor White
Write-Host "   c) Collez dans Supabase SQL Editor" -ForegroundColor White
Write-Host "   d) Exécutez (Run ou Ctrl+Enter)" -ForegroundColor White
Write-Host ""
Write-Host "   Répétez pour: $migration2" -ForegroundColor White
Write-Host ""
Write-Host "4. Vérifiez les migrations:" -ForegroundColor Yellow
Write-Host "   a) Ouvrez: $verifyScript" -ForegroundColor White
Write-Host "   b) Exécutez dans Supabase SQL Editor" -ForegroundColor White
Write-Host ""
Write-Host "5. Testez les fonctions RPC:" -ForegroundColor Yellow
Write-Host "   Consultez GUIDE-APPLICATION-MIGRATIONS.md pour les requêtes de test" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$response = Read-Host "Voulez-vous ouvrir les fichiers de migration maintenant? (O/N)"

if ($response -eq "O" -or $response -eq "o") {
    Write-Host ""
    Write-Host "Ouverture des fichiers..." -ForegroundColor Green
    
    if (Test-Path $migration1) {
        Start-Process notepad.exe $migration1
    }
    
    Start-Sleep -Seconds 1
    
    if (Test-Path $migration2) {
        Start-Process notepad.exe $migration2
    }
    
    Start-Sleep -Seconds 1
    
    if (Test-Path $verifyScript) {
        Start-Process notepad.exe $verifyScript
    }
    
    Write-Host ""
    Write-Host "✅ Fichiers ouverts" -ForegroundColor Green
    Write-Host ""
    Write-Host "N'oubliez pas d'appliquer les migrations dans Supabase Dashboard!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Pour plus d'informations, consultez:" -ForegroundColor Cyan
Write-Host "  - GUIDE-APPLICATION-MIGRATIONS.md" -ForegroundColor White
Write-Host "  - VERIFICATION-SCHEMA-METIER.md" -ForegroundColor White
Write-Host ""
