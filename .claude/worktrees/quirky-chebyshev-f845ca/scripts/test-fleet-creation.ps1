# =====================================================
# Script de Test - Création de Flotte et Membres
# Smart Fleet Africa
# =====================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST DE CRÉATION DE FLOTTE ET MEMBRES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que l'application est lancée
Write-Host "Vérification des prérequis..." -ForegroundColor Yellow
Write-Host ""

# Vérifier que le serveur de développement est lancé
$devServerRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 2 -ErrorAction Stop
    $devServerRunning = $true
    Write-Host "✅ Serveur de développement actif sur http://localhost:8080" -ForegroundColor Green
} catch {
    Write-Host "❌ Serveur de développement non accessible" -ForegroundColor Red
    Write-Host "   Lancez l'application avec: npm run dev" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "INSTRUCTIONS DE TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($devServerRunning) {
    Write-Host "✅ L'application est prête pour les tests !" -ForegroundColor Green
    Write-Host ""
    Write-Host "ÉTAPE 1 : Test de Création de Flotte" -ForegroundColor Yellow
    Write-Host "  1. Ouvrez votre navigateur" -ForegroundColor White
    Write-Host "  2. Appuyez sur F12 pour ouvrir la console" -ForegroundColor White
    Write-Host "  3. Allez sur: http://localhost:8080/dashboard/create-fleet" -ForegroundColor White
    Write-Host "  4. Remplissez le formulaire:" -ForegroundColor White
    Write-Host "     - Nom de l'organisation: Test Organisation" -ForegroundColor Gray
    Write-Host "     - Code pays: CM" -ForegroundColor Gray
    Write-Host "     - Nom de la flotte: Flotte Test" -ForegroundColor Gray
    Write-Host "     - Politique de collecte: Mixte" -ForegroundColor Gray
    Write-Host "  5. Cliquez sur 'Créer la flotte'" -ForegroundColor White
    Write-Host "  6. Vérifiez dans la console:" -ForegroundColor White
    Write-Host "     - Recherchez: 'Memberships rafraîchis avec succès'" -ForegroundColor Gray
    Write-Host "     - Vérifiez qu'il n'y a pas d'erreurs" -ForegroundColor Gray
    Write-Host ""
    Write-Host "ÉTAPE 2 : Test d'Ajout de Membre" -ForegroundColor Yellow
    Write-Host "  1. Allez sur: http://localhost:8080/dashboard/teams" -ForegroundColor White
    Write-Host "  2. Cliquez sur 'Ajouter un membre'" -ForegroundColor White
    Write-Host "  3. Entrez un email d'utilisateur existant" -ForegroundColor White
    Write-Host "  4. Sélectionnez un rôle (ex: Chauffeur)" -ForegroundColor White
    Write-Host "  5. Cliquez sur 'Ajouter le membre'" -ForegroundColor White
    Write-Host "  6. Vérifiez dans la console:" -ForegroundColor White
    Write-Host "     - Recherchez: 'Tentative d'ajout de membre'" -ForegroundColor Gray
    Write-Host "     - Recherchez: 'Résultat de add_member_by_email'" -ForegroundColor Gray
    Write-Host "     - Recherchez: 'Membre ajouté avec succès'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "VÉRIFICATIONS SUPABASE" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Pour vérifier dans Supabase SQL Editor:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Vérifier que les fonctions RPC existent:" -ForegroundColor White
    Write-Host @"
SELECT proname FROM pg_proc 
WHERE proname IN ('create_esamba_fleet', 'upsert_fleet_membership', 'add_member_by_email');
"@ -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Vérifier les flottes créées:" -ForegroundColor White
    Write-Host @"
SELECT id, name, org_id, collection_policy, created_at
FROM fleets
ORDER BY created_at DESC;
"@ -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Vérifier les membres d'une flotte:" -ForegroundColor White
    Write-Host @"
SELECT 
  fm.id,
  fm.role,
  fm.is_active,
  f.name as fleet_name,
  u.email,
  p.full_name
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
LEFT JOIN auth.users u ON u.id = fm.user_id
LEFT JOIN profiles p ON p.user_id = fm.user_id
WHERE f.name = 'Flotte Test'
ORDER BY fm.created_at DESC;
"@ -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "❌ L'application n'est pas lancée" -ForegroundColor Red
    Write-Host ""
    Write-Host "Pour lancer l'application:" -ForegroundColor Yellow
    Write-Host "  1. Ouvrez un terminal" -ForegroundColor White
    Write-Host "  2. Naviguez vers le répertoire du projet" -ForegroundColor White
    Write-Host "  3. Exécutez: npm run dev" -ForegroundColor White
    Write-Host "  4. Attendez que le serveur démarre" -ForegroundColor White
    Write-Host "  5. Relancez ce script" -ForegroundColor White
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GUIDE COMPLET" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour un guide détaillé, consultez:" -ForegroundColor Yellow
Write-Host "  GUIDE-TEST-CREATION-FLOTTE-MEMBRES.md" -ForegroundColor White
Write-Host ""
