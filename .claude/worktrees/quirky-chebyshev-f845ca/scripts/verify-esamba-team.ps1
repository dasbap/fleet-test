# =====================================================
# Script PowerShell pour vérifier l'équipe ESAMBA
# Smart Fleet Africa
# =====================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VÉRIFICATION DE L'ÉQUIPE ESAMBA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Requête SQL de vérification
$verificationQuery = @"
-- Vérification des membres de la Flotte ESAMBA
SELECT 
  'RÉSUMÉ' as section,
  COUNT(*) as total_membres,
  COUNT(*) FILTER (WHERE fm.role = 'organizer') as organisateurs,
  COUNT(*) FILTER (WHERE fm.role = 'manager') as managers,
  COUNT(*) FILTER (WHERE fm.role = 'driver') as chauffeurs,
  COUNT(*) FILTER (WHERE fm.role = 'mechanic') as mecaniciens,
  COUNT(*) FILTER (WHERE fm.is_active = true) as membres_actifs
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
WHERE f.name = 'Flotte ESAMBA';

-- Liste détaillée
SELECT 
  fm.role as role,
  CASE WHEN fm.is_active THEN 'Actif' ELSE 'Inactif' END as statut,
  COALESCE(p.full_name, 'Non renseigné') as nom,
  COALESCE(u.email, 'Email non disponible') as email,
  TO_CHAR(fm.created_at, 'DD/MM/YYYY') as date_ajout
FROM fleet_memberships fm
JOIN fleets f ON f.id = fm.fleet_id
LEFT JOIN profiles p ON p.user_id = fm.user_id
LEFT JOIN auth.users u ON u.id = fm.user_id
WHERE f.name = 'Flotte ESAMBA'
ORDER BY 
  CASE fm.role
    WHEN 'organizer' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'mechanic' THEN 3
    WHEN 'driver' THEN 4
  END,
  fm.created_at DESC;
"@

Write-Host "Requête de vérification générée." -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "INSTRUCTIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour vérifier l'équipe ESAMBA :" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1 : Via Supabase Dashboard" -ForegroundColor White
Write-Host "  1. Allez sur https://app.supabase.com" -ForegroundColor Gray
Write-Host "  2. Sélectionnez votre projet" -ForegroundColor Gray
Write-Host "  3. Allez dans SQL Editor" -ForegroundColor Gray
Write-Host "  4. Exécutez la requête ci-dessous" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2 : Via l'application" -ForegroundColor White
Write-Host "  1. Allez sur http://localhost:8080/dashboard/teams" -ForegroundColor Gray
Write-Host "  2. Vérifiez que les membres s'affichent correctement" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "REQUÊTE SQL DE VÉRIFICATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host $verificationQuery -ForegroundColor Gray
Write-Host ""
