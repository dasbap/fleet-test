# =====================================================
# EXECUTION DE LA FONCTION RPC verifier_esamba_2024
# Smart Fleet Africa
# =====================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "EXECUTION DE verifier_esamba_2024 RPC" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$sqlFile = "supabase/rpc-check-esamba-2024.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "ERREUR: Fichier $sqlFile introuvable" -ForegroundColor Red
    exit 1
}

Write-Host "OK: Fichier SQL trouve: $sqlFile" -ForegroundColor Green
Write-Host ""

# Afficher le contenu du fichier
Write-Host "CONTENU DU FICHIER SQL:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Gray
Get-Content $sqlFile
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

Write-Host "3. Copiez le contenu du fichier SQL" -ForegroundColor White
Write-Host "   Le contenu est affiche ci-dessus" -ForegroundColor Gray
Write-Host ""

Write-Host "4. Collez dans l'editeur SQL" -ForegroundColor White
Write-Host "   Cliquez dans la zone de texte" -ForegroundColor Gray
Write-Host ""

Write-Host "5. Executez le script" -ForegroundColor White
Write-Host "   Cliquez sur 'Run' (ou Ctrl+Enter)" -ForegroundColor Gray
Write-Host ""

Write-Host "6. Verifiez le resultat" -ForegroundColor White
Write-Host "   Vous devriez voir: 'Success. No rows returned'" -ForegroundColor Gray
Write-Host ""

Write-Host "7. Testez la fonction RPC" -ForegroundColor White
Write-Host "   Executez: SELECT * FROM verifier_esamba_2024();" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ALTERNATIVE: Utiliser Supabase CLI" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verifier si Supabase CLI est installe
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue

if ($supabaseCli) {
    Write-Host "OK: Supabase CLI detecte" -ForegroundColor Green
    Write-Host ""
    Write-Host "Vous pouvez executer directement:" -ForegroundColor White
    Write-Host "  supabase db execute --file $sqlFile" -ForegroundColor Cyan
    Write-Host ""
    
    $execute = Read-Host "Voulez-vous executer maintenant avec Supabase CLI? (o/N)"
    if ($execute -eq "o" -or $execute -eq "O") {
        Write-Host ""
        Write-Host "Execution avec Supabase CLI..." -ForegroundColor Yellow
        supabase db execute --file $sqlFile
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "OK: Fonction RPC creee avec succes!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Testez avec: SELECT * FROM verifier_esamba_2024();" -ForegroundColor Cyan
        } else {
            Write-Host ""
            Write-Host "ERREUR: Erreur lors de l'execution" -ForegroundColor Red
            Write-Host "Executez manuellement dans Supabase Dashboard" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "INFO: Supabase CLI non installe" -ForegroundColor Gray
    Write-Host "   Utilisez les instructions manuelles ci-dessus" -ForegroundColor Gray
    Write-Host ""
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FICHIER SQL: $sqlFile" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
