# =====================================================
# TEST DE LA FONCTION RPC check_esamba_2024
# Smart Fleet Africa
# =====================================================
# Ce script teste la fonction RPC apres deploiement
# =====================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST DE check_esamba_2024 RPC" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "INSTRUCTIONS POUR TESTER:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Ouvrez Supabase Dashboard" -ForegroundColor White
Write-Host "   https://app.supabase.com" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Allez dans SQL Editor" -ForegroundColor White
Write-Host ""
Write-Host "3. Executez cette requete:" -ForegroundColor White
Write-Host ""
Write-Host "   SELECT * FROM check_esamba_2024();" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Verifiez les resultats:" -ForegroundColor White
Write-Host "   - organisation: true/false" -ForegroundColor Gray
Write-Host "   - flotte: true/false" -ForegroundColor Gray
Write-Host "   - membership_organizer: true/false" -ForegroundColor Gray
Write-Host "   - vehicule_esamba_001: true/false" -ForegroundColor Gray
Write-Host "   - invitation_esamba_2024: true/false" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Si toutes les valeurs sont 'true', les donnees ESAMBA sont presentes" -ForegroundColor Green
Write-Host ""
Write-Host "6. Si certaines valeurs sont 'false', créez les donnees manquantes:" -ForegroundColor Yellow
Write-Host "   - Lancez l'application: npm run dev" -ForegroundColor Gray
Write-Host "   - Allez sur /settings" -ForegroundColor Gray
Write-Host "   - Cliquez sur 'Créer les donnees ESAMBA-2024'" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "REQUETES DE VERIFICATION MANUELLE:" -ForegroundColor Yellow
Write-Host ""
Write-Host "-- Verifier l'organisation" -ForegroundColor Gray
Write-Host "SELECT COUNT(*) FROM orgs WHERE name = 'Organisation ESAMBA';" -ForegroundColor Cyan
Write-Host ""
Write-Host "-- Verifier la flotte" -ForegroundColor Gray
Write-Host "SELECT COUNT(*) FROM fleets WHERE name = 'Flotte ESAMBA';" -ForegroundColor Cyan
Write-Host ""
Write-Host "-- Verifier le membership" -ForegroundColor Gray
Write-Host "SELECT COUNT(*) FROM fleet_memberships fm" -ForegroundColor Cyan
Write-Host "JOIN fleets f ON f.id = fm.fleet_id" -ForegroundColor Cyan
Write-Host "WHERE f.name = 'Flotte ESAMBA' AND fm.role = 'organizer';" -ForegroundColor Cyan
Write-Host ""
Write-Host "-- Verifier le vehicule" -ForegroundColor Gray
Write-Host "SELECT COUNT(*) FROM vehicles v" -ForegroundColor Cyan
Write-Host "JOIN fleets f ON f.id = v.fleet_id" -ForegroundColor Cyan
Write-Host "WHERE f.name = 'Flotte ESAMBA' AND v.registration = 'ESAMBA-001';" -ForegroundColor Cyan
Write-Host ""
Write-Host "-- Verifier l'invitation" -ForegroundColor Gray
Write-Host "SELECT COUNT(*) FROM fleet_invitations fi" -ForegroundColor Cyan
Write-Host "JOIN fleets f ON f.id = fi.fleet_id" -ForegroundColor Cyan
Write-Host "WHERE f.name = 'Flotte ESAMBA' AND fi.code = 'ESAMBA-2024';" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
