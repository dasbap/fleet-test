# =====================================================
# VÉRIFICATION DE L'ÉTAT DE LA MIGRATION VERS FRANÇAIS
# Smart Fleet Africa - E-samba
# =====================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VÉRIFICATION DE LA MIGRATION VERS FRANÇAIS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$sqlFile = "supabase/verify-migration-status.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "ERREUR: Fichier $sqlFile introuvable" -ForegroundColor Red
    Write-Host "Assurez-vous d'être dans le répertoire racine du projet" -ForegroundColor Yellow
    exit 1
}

Write-Host "OK: Fichier SQL trouvé: $sqlFile" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MODE 1: EXÉCUTION VIA SUPABASE DASHBOARD" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "INSTRUCTIONS POUR EXÉCUTER DANS SUPABASE:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Ouvrez Supabase Dashboard" -ForegroundColor White
Write-Host "   https://app.supabase.com" -ForegroundColor Gray
Write-Host "   Sélectionnez votre projet" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Allez dans SQL Editor" -ForegroundColor White
Write-Host "   Menu de gauche -> SQL Editor" -ForegroundColor Gray
Write-Host ""

Write-Host "3. Ouvrez le fichier SQL" -ForegroundColor White
Write-Host "   Chemin: $sqlFile" -ForegroundColor Gray
Write-Host "   Ou copiez le contenu ci-dessous" -ForegroundColor Gray
Write-Host ""

Write-Host "4. Collez dans l'éditeur SQL" -ForegroundColor White
Write-Host "   Cliquez sur 'New Query' ou utilisez l'éditeur existant" -ForegroundColor Gray
Write-Host ""

Write-Host "5. Exécutez le script" -ForegroundColor White
Write-Host "   Cliquez sur 'Run' (ou Ctrl+Enter / Cmd+Enter)" -ForegroundColor Gray
Write-Host ""

Write-Host "6. Analysez le rapport généré" -ForegroundColor White
Write-Host "   Le script génère un rapport structuré avec 7 sections" -ForegroundColor Gray
Write-Host "   Consultez supabase/VERIFY-MIGRATION-GUIDE.md pour l'interprétation" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MODE 2: EXÉCUTION VIA SUPABASE CLI" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Supabase CLI est installé
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue

if ($supabaseCli) {
    Write-Host "OK: Supabase CLI détecté" -ForegroundColor Green
    Write-Host ""
    Write-Host "Vous pouvez exécuter directement:" -ForegroundColor White
    Write-Host "  supabase db execute --file $sqlFile" -ForegroundColor Cyan
    Write-Host ""
    
    $execute = Read-Host "Voulez-vous exécuter maintenant avec Supabase CLI? (o/N)"
    if ($execute -eq "o" -or $execute -eq "O") {
        Write-Host ""
        Write-Host "Exécution avec Supabase CLI..." -ForegroundColor Yellow
        
        try {
            $output = supabase db execute --file $sqlFile 2>&1
            $exitCode = $LASTEXITCODE
            
            if ($exitCode -eq 0) {
                Write-Host ""
                Write-Host "✅ SUCCÈS: Script exécuté avec succès!" -ForegroundColor Green
                Write-Host ""
                Write-Host "Résultats:" -ForegroundColor Cyan
                Write-Host $output
                Write-Host ""
                Write-Host "Consultez le rapport ci-dessus pour analyser l'état de la migration" -ForegroundColor White
                Write-Host "Guide d'interprétation: supabase/VERIFY-MIGRATION-GUIDE.md" -ForegroundColor Gray
            } else {
                Write-Host ""
                Write-Host "❌ ERREUR: Erreur lors de l'exécution" -ForegroundColor Red
                Write-Host "Détails:" -ForegroundColor Yellow
                Write-Host $output
                Write-Host ""
                Write-Host "Exécutez manuellement dans Supabase Dashboard" -ForegroundColor Yellow
            }
        } catch {
            Write-Host ""
            Write-Host "❌ ERREUR: Exception lors de l'exécution" -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Exécutez manuellement dans Supabase Dashboard" -ForegroundColor Yellow
        }
    } else {
        Write-Host ""
        Write-Host "Exécution annulée. Utilisez les instructions du Mode 1 ci-dessus." -ForegroundColor Gray
    }
} else {
    Write-Host "INFO: Supabase CLI non installé" -ForegroundColor Gray
    Write-Host "   Utilisez les instructions du Mode 1 ci-dessus" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Pour installer Supabase CLI:" -ForegroundColor White
    Write-Host "   npm install -g supabase" -ForegroundColor Cyan
    Write-Host "   ou" -ForegroundColor Gray
    Write-Host "   winget install Supabase.CLI" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "INFORMATIONS" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Fichier SQL: $sqlFile" -ForegroundColor White
Write-Host "Guide d'interprétation: supabase/VERIFY-MIGRATION-GUIDE.md" -ForegroundColor White
Write-Host ""
Write-Host "Le script génère un rapport avec 7 sections:" -ForegroundColor Cyan
Write-Host "  1. Résumé exécutif (statistiques globales)" -ForegroundColor Gray
Write-Host "  2. Vérification des tables françaises" -ForegroundColor Gray
Write-Host "  3. Détection des doublons" -ForegroundColor Gray
Write-Host "  4. Vérification des fonctions RPC" -ForegroundColor Gray
Write-Host "  5. Vérification des index" -ForegroundColor Gray
Write-Host "  6. Vérification des politiques RLS" -ForegroundColor Gray
Write-Host "  7. Recommandations SQL automatiques" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
