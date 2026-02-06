# =====================================================
# Script de Test - Compte Test avec Membres
# Smart Fleet Africa
# =====================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST DU COMPTE TEST ET DE SES MEMBRES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que l'application est lancée
Write-Host "Vérification des prérequis..." -ForegroundColor Yellow
Write-Host ""

# Vérifier que le serveur de développement est lancé
$devServerRunning = $false
try {
    $null = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 2 -ErrorAction Stop
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
    
    Write-Host "ÉTAPE 1 : Vérification dans Supabase" -ForegroundColor Yellow
    Write-Host "  1. Ouvrez Supabase SQL Editor" -ForegroundColor White
    Write-Host "  2. Exécutez le script : supabase/verify-test-account.sql" -ForegroundColor White
    Write-Host "  3. Vérifiez que tous les éléments sont marqués ✅" -ForegroundColor White
    Write-Host ""
    
    Write-Host "ÉTAPE 2 : Test de Visualisation dans l'Interface" -ForegroundColor Yellow
    Write-Host "  1. Ouvrez votre navigateur" -ForegroundColor White
    Write-Host "  2. Connectez-vous à l'application" -ForegroundColor White
    Write-Host "  3. Allez sur: http://localhost:8080/dashboard/teams" -ForegroundColor White
    Write-Host "  4. Vérifiez que vous voyez :" -ForegroundColor White
    Write-Host "     - La flotte 'Flotte Test'" -ForegroundColor Gray
    Write-Host "     - Les membres avec leurs rôles (organizer, manager, driver, mechanic)" -ForegroundColor Gray
    Write-Host "     - L'utilisateur test@example.com avec le rôle driver" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "ÉTAPE 3 : Test d'Ajout de Membre" -ForegroundColor Yellow
    Write-Host "  1. Appuyez sur F12 pour ouvrir la console développeur" -ForegroundColor White
    Write-Host "  2. Restez sur la page Teams" -ForegroundColor White
    Write-Host "  3. Cliquez sur 'Ajouter un membre'" -ForegroundColor White
    Write-Host "  4. Entrez un email d'utilisateur existant" -ForegroundColor White
    Write-Host "  5. Sélectionnez un rôle (ex: Chauffeur)" -ForegroundColor White
    Write-Host "  6. Cliquez sur 'Ajouter le membre'" -ForegroundColor White
    Write-Host "  7. Vérifiez dans la console:" -ForegroundColor White
    Write-Host "     - Recherchez: 'Tentative d'ajout de membre'" -ForegroundColor Gray
    Write-Host "     - Recherchez: 'Résultat de add_member_by_email'" -ForegroundColor Gray
    Write-Host "     - Recherchez: 'Membre ajouté avec succès'" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "ÉTAPE 4 : Test de Modification de Rôle" -ForegroundColor Yellow
    Write-Host "  1. Sur la page Teams, trouvez un membre" -ForegroundColor White
    Write-Host "  2. Cliquez sur le menu '⋯' à côté du membre" -ForegroundColor White
    Write-Host "  3. Sélectionnez 'Définir comme...' et choisissez un nouveau rôle" -ForegroundColor White
    Write-Host "  4. Vérifiez que le rôle est mis à jour immédiatement" -ForegroundColor White
    Write-Host ""
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "VÉRIFICATIONS SUPABASE SQL" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Pour vérifier dans Supabase SQL Editor:" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "1. Vérifier l'organisation et la flotte:" -ForegroundColor White
    Write-Host @"
-- Vérifier l'organisation et la flotte
SELECT 
  o.name as organisation,
  f.name as flotte,
  f.collection_policy,
  COUNT(DISTINCT fm.id) FILTER (WHERE fm.is_active = true) as membres_actifs
FROM organisations o
JOIN flottes f ON f.org_id = o.id
LEFT JOIN flotte_adhesions fm ON fm.fleet_id = f.id
WHERE o.name = 'Test Organisation'
GROUP BY o.id, o.name, f.id, f.name, f.collection_policy;
"@ -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "2. Vérifier les membres avec leurs rôles:" -ForegroundColor White
    Write-Host @"
-- Vérifier les membres avec leurs rôles
SELECT 
  fm.role,
  u.email,
  COALESCE(p.full_name, 'Non défini') as nom_complet,
  fm.is_active,
  fm.created_at
FROM flotte_adhesions fm
JOIN flottes f ON f.id = fm.fleet_id
LEFT JOIN auth.users u ON u.id = fm.user_id
LEFT JOIN profils p ON p.user_id = fm.user_id
WHERE f.name = 'Flotte Test'
ORDER BY 
  CASE fm.role
    WHEN 'organizer' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'driver' THEN 3
    WHEN 'mechanic' THEN 4
  END,
  fm.created_at DESC;
"@ -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "3. Vérifier spécifiquement test@example.com:" -ForegroundColor White
    Write-Host @"
-- Vérifier spécifiquement test@example.com
SELECT 
  u.email,
  fm.role,
  fm.is_active,
  f.name as flotte,
  fm.created_at
FROM auth.users u
JOIN flotte_adhesions fm ON fm.user_id = u.id
JOIN flottes f ON f.id = fm.fleet_id
WHERE u.email = 'test@example.com'
  AND f.name = 'Flotte Test';
"@ -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "4. Compteurs par rôle:" -ForegroundColor White
    Write-Host @"
-- Compteurs par rôle
SELECT 
  fm.role,
  COUNT(*) as nombre_membres
FROM flotte_adhesions fm
JOIN flottes f ON f.id = fm.fleet_id
WHERE f.name = 'Flotte Test'
  AND fm.is_active = true
GROUP BY fm.role
ORDER BY 
  CASE fm.role
    WHEN 'organizer' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'driver' THEN 3
    WHEN 'mechanic' THEN 4
  END;
"@ -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "TESTS À EFFECTUER" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "☑️  Vérification SQL : Organisation et flotte créées" -ForegroundColor White
    Write-Host "☑️  Vérification SQL : Membres présents avec différents rôles" -ForegroundColor White
    Write-Host "☑️  Vérification SQL : test@example.com présent comme driver" -ForegroundColor White
    Write-Host "☑️  Test Interface : Flotte visible dans Teams" -ForegroundColor White
    Write-Host "☑️  Test Interface : Membres visibles avec leurs rôles" -ForegroundColor White
    Write-Host "☑️  Test Interface : Ajout d'un nouveau membre fonctionne" -ForegroundColor White
    Write-Host "☑️  Test Interface : Modification de rôle fonctionne" -ForegroundColor White
    Write-Host "☑️  Test Console : Logs d'ajout de membre visibles" -ForegroundColor White
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
Write-Host "  GUIDE-TEST-ACCOUNT.md" -ForegroundColor White
Write-Host ""
Write-Host "Pour créer le compte test, exécutez dans Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host "  supabase/create-test-account-complete.sql" -ForegroundColor White
Write-Host ""
Write-Host "Pour vérifier les données créées:" -ForegroundColor Yellow
Write-Host "  supabase/verify-test-account.sql" -ForegroundColor White
Write-Host ""
