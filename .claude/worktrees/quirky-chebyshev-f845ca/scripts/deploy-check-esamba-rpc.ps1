# =====================================================
# DEPLOIEMENT AUTOMATIQUE DE LA FONCTION RPC check_esamba_2024
# Smart Fleet Africa
# =====================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DEPLOIEMENT DE check_esamba_2024 RPC" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$rpcFile = "supabase/rpc-check-esamba-2024.sql"

# Verifier que le fichier existe
if (-not (Test-Path $rpcFile)) {
    Write-Host "ERREUR: Fichier $rpcFile introuvable" -ForegroundColor Red
    exit 1
}

Write-Host "OK: Fichier SQL trouve: $rpcFile" -ForegroundColor Green
Write-Host ""

# Afficher le contenu du fichier
Write-Host "CONTENU DU FICHIER SQL A DEPLOYER:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Gray
Get-Content $rpcFile
Write-Host "========================================" -ForegroundColor Gray
Write-Host ""

# Verifier si Supabase CLI est installe
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue

if ($supabaseCli) {
    Write-Host "OK: Supabase CLI detecte" -ForegroundColor Green
    Write-Host ""
    
    # Verifier si on est dans un projet Supabase
    if (Test-Path ".supabase") {
        Write-Host "OK: Projet Supabase detecte" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "DEPLOIEMENT AVEC SUPABASE CLI..." -ForegroundColor Yellow
        Write-Host ""
        
        # Essayer de deployer
        $deploy = Read-Host "Voulez-vous deployer maintenant? (o/N)"
        if ($deploy -eq "o" -or $deploy -eq "O") {
            Write-Host ""
            Write-Host "Execution du script SQL..." -ForegroundColor Yellow
            
            # Utiliser psql ou supabase db execute selon la configuration
            $result = supabase db execute --file $rpcFile 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "SUCCESS: Fonction RPC deployee avec succes!" -ForegroundColor Green
                Write-Host ""
                
                # Tester la fonction
                Write-Host "TEST DE LA FONCTION RPC..." -ForegroundColor Yellow
                Write-Host ""
                Write-Host "Executez dans Supabase SQL Editor:" -ForegroundColor White
                Write-Host "  SELECT * FROM check_esamba_2024();" -ForegroundColor Cyan
                Write-Host ""
            } else {
                Write-Host ""
                Write-Host "ERREUR: Echec du deploiement" -ForegroundColor Red
                Write-Host "Details: $result" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "DEPLOIEMENT MANUEL REQUIS" -ForegroundColor Yellow
            }
        } else {
            Write-Host ""
            Write-Host "DEPLOIEMENT MANUEL REQUIS" -ForegroundColor Yellow
        }
    } else {
        Write-Host "INFO: Projet Supabase non detecte localement" -ForegroundColor Gray
        Write-Host "DEPLOIEMENT MANUEL REQUIS" -ForegroundColor Yellow
    }
} else {
    Write-Host "INFO: Supabase CLI non installe" -ForegroundColor Gray
    Write-Host "DEPLOIEMENT MANUEL REQUIS" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "INSTRUCTIONS POUR DEPLOIEMENT MANUEL" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Ouvrez Supabase Dashboard" -ForegroundColor White
Write-Host "   https://app.supabase.com" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Selectionnez votre projet" -ForegroundColor White
Write-Host ""
Write-Host "3. Allez dans SQL Editor" -ForegroundColor White
Write-Host "   Menu de gauche -> SQL Editor" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Copiez le contenu du fichier SQL ci-dessus" -ForegroundColor White
Write-Host "   (Le contenu est affiche plus haut)" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Collez dans l'editeur SQL" -ForegroundColor White
Write-Host ""
Write-Host "6. Cliquez sur 'Run' (ou Ctrl+Enter)" -ForegroundColor White
Write-Host ""
Write-Host "7. Verifiez le resultat" -ForegroundColor White
Write-Host "   Vous devriez voir: 'Success. No rows returned'" -ForegroundColor Gray
Write-Host ""
Write-Host "8. Testez la fonction RPC" -ForegroundColor White
Write-Host "   Executez: SELECT * FROM check_esamba_2024();" -ForegroundColor Cyan
Write-Host "   Vous devriez voir 5 colonnes booleennes" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
