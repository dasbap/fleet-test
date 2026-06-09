# =====================================================
# Script PowerShell pour vérifier l'équipe ESAMBA
# Smart Fleet Africa
# =====================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VÉRIFICATION DE L'ÉQUIPE ESAMBA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Requête SQL de vérification (schéma runtime : flotte_adhesions, flottes, profils)
$verificationQuery = @"
-- Vérification des membres de la Flotte E-SAMBA
SELECT
  'RÉSUMÉ' AS section,
  COUNT(*) AS total_membres,
  COUNT(*) FILTER (WHERE fa.role = 'organizer') AS organisateurs,
  COUNT(*) FILTER (WHERE fa.role = 'manager') AS gestionnaires,
  COUNT(*) FILTER (WHERE fa.role = 'driver') AS chauffeurs,
  COUNT(*) FILTER (WHERE fa.role = 'mechanic') AS mecaniciens,
  COUNT(*) FILTER (WHERE fa.is_active = true) AS membres_actifs
FROM public.flotte_adhesions fa
JOIN public.flottes f ON f.id = fa.fleet_id
WHERE f.name ILIKE '%E-SAMBA%';

-- Liste détaillée
SELECT
  fa.role AS role,
  CASE WHEN fa.is_active THEN 'Actif' ELSE 'Inactif' END AS statut,
  COALESCE(p.full_name, 'Non renseigné') AS nom,
  COALESCE(u.email, 'Email non disponible') AS email,
  p.phone,
  TO_CHAR(fa.created_at, 'DD/MM/YYYY') AS date_ajout
FROM public.flotte_adhesions fa
JOIN public.flottes f ON f.id = fa.fleet_id
LEFT JOIN public.profils p ON p.user_id = fa.user_id
LEFT JOIN auth.users u ON u.id = fa.user_id
WHERE f.name ILIKE '%E-SAMBA%'
ORDER BY
  CASE fa.role
    WHEN 'organizer' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'mechanic' THEN 3
    WHEN 'driver' THEN 4
  END,
  fa.created_at DESC;

-- Doublons (un seul rôle par utilisateur et par flotte)
SELECT fleet_id, user_id, COUNT(*) AS nb_lignes
FROM public.flotte_adhesions
GROUP BY fleet_id, user_id
HAVING COUNT(*) > 1;
"@

Write-Host "Requête de vérification générée." -ForegroundColor Green
Write-Host ""
Write-Host "Fichiers SQL dédiés :" -ForegroundColor Green
Write-Host "  - supabase/scripts/verify/verify-team-adhesions.sql (vérification)" -ForegroundColor Gray
Write-Host "  - supabase/scripts/fix/cleanup-team-removed-members.sql (nettoyage doux)" -ForegroundColor Gray
Write-Host "  - supabase/scripts/fix/delete-inactive-adhesions-aloys-jerome.sql (suppression Aloys/Jerome)" -ForegroundColor Gray
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
Write-Host "  4. Exécutez la requête ci-dessous ou verify-team-adhesions.sql" -ForegroundColor Gray
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
