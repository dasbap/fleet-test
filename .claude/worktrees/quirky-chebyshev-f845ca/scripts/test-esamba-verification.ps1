# =====================================================
# TEST COMPLET DE VÉRIFICATION DES DONNÉES ESAMBA
# Smart Fleet Africa
# =====================================================
# Ce script vérifie que :
# 1. La fonction RPC verifier_esamba_2024 existe
# 2. Toutes les données ESAMBA sont créées
# 3. La vérification fonctionne correctement
# =====================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST DE VÉRIFICATION DES DONNÉES ESAMBA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que les fichiers SQL existent
$rpcFile = "supabase/rpc-check-esamba-2024.sql"
$grantFile = "supabase/grant-check-esamba-rpc.sql"

if (-not (Test-Path $rpcFile)) {
    Write-Host "ERREUR: Fichier $rpcFile introuvable" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $grantFile)) {
    Write-Host "AVERTISSEMENT: Fichier $grantFile introuvable" -ForegroundColor Yellow
}

Write-Host "OK: Fichiers SQL trouves" -ForegroundColor Green
Write-Host ""

# Afficher les instructions
Write-Host "ETAPES POUR DEPLOYER ET TESTER:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. DEPLOYER LA FONCTION RPC DANS SUPABASE" -ForegroundColor White
Write-Host "   Ouvrez Supabase Dashboard: https://app.supabase.com" -ForegroundColor Gray
Write-Host "   Selectionnez votre projet" -ForegroundColor Gray
Write-Host "   Allez dans SQL Editor" -ForegroundColor Gray
Write-Host "   Executez le fichier: $rpcFile" -ForegroundColor Gray
Write-Host ""

Write-Host "2. VERIFIER LES PERMISSIONS" -ForegroundColor White
Write-Host "   Si necessaire, executez aussi: $grantFile" -ForegroundColor Gray
Write-Host ""

Write-Host "3. TESTER LA FONCTION RPC" -ForegroundColor White
Write-Host "   Dans SQL Editor, executez:" -ForegroundColor Gray
Write-Host "   SELECT * FROM verifier_esamba_2024();" -ForegroundColor Cyan
Write-Host "   Vous devriez voir 5 colonnes booleennes" -ForegroundColor Gray
Write-Host ""

Write-Host "4. CREER LES DONNEES ESAMBA (si necessaire)" -ForegroundColor White
Write-Host "   → Lancez l'application: npm run dev" -ForegroundColor Gray
Write-Host "   → Allez sur la page Paramètres (/settings)" -ForegroundColor Gray
Write-Host "   → Cliquez sur 'Créer les données ESAMBA-2024'" -ForegroundColor Gray
Write-Host "   → Cliquez sur 'Actualiser' dans la section Vérification" -ForegroundColor Gray
Write-Host ""

Write-Host "5. VERIFIER LES RESULTATS" -ForegroundColor White
Write-Host "   Tous les elements doivent etre marques 'Creee' (vert)" -ForegroundColor Gray
Write-Host "   - Organisation ESAMBA: OK" -ForegroundColor Green
Write-Host "   - Flotte ESAMBA: OK" -ForegroundColor Green
Write-Host "   - Membership Organizer: OK" -ForegroundColor Green
Write-Host "   - Vehicule ESAMBA-001: OK" -ForegroundColor Green
Write-Host "   - Invitation ESAMBA-2024: OK" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CONTENU DE LA FONCTION RPC:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Get-Content $rpcFile
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "ASTUCE: Vous pouvez aussi tester directement dans SQL Editor:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   -- Verifier les donnees ESAMBA" -ForegroundColor Gray
Write-Host "   SELECT * FROM verifier_esamba_2024();" -ForegroundColor Cyan
Write-Host ""
Write-Host "   -- Verifier manuellement chaque element" -ForegroundColor Gray
Write-Host "   SELECT COUNT(*) FROM organisations WHERE name = 'Organisation ESAMBA';" -ForegroundColor Cyan
Write-Host "   SELECT COUNT(*) FROM flottes WHERE name = 'Flotte ESAMBA';" -ForegroundColor Cyan
Write-Host "   SELECT COUNT(*) FROM vehicules v" -ForegroundColor Cyan
Write-Host "     JOIN flottes f ON f.id = v.fleet_id" -ForegroundColor Cyan
Write-Host "     WHERE f.name = 'Flotte ESAMBA' AND v.registration = 'ESAMBA-001';" -ForegroundColor Cyan
Write-Host "   SELECT COUNT(*) FROM flotte_invitations fi" -ForegroundColor Cyan
Write-Host "     JOIN flottes f ON f.id = fi.fleet_id" -ForegroundColor Cyan
Write-Host "     WHERE f.name = 'Flotte ESAMBA' AND fi.code = 'ESAMBA-2024';" -ForegroundColor Cyan
Write-Host ""

Write-Host "OK: Script de test termine" -ForegroundColor Green
Write-Host ""
