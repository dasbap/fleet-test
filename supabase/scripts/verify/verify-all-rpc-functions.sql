-- =====================================================
-- Script d'exécution de toutes les vérifications RPC
-- Date: 2025-02-06
-- Description: Exécute la vérification des fonctions RPC (présence, noms, permissions, etc.)
-- =====================================================

-- Exécution des vérifications principales
DO $$
DECLARE
  v_function_name text;
  v_function_exists boolean;
  v_missing_functions text[] := ARRAY[]::text[];
  v_functions_to_check text[] := ARRAY[
    'creer_onboarding_organisation_flotte_et_adhesion',
    'creer_flotte_esamba',
    'creer_ou_mettre_a_jour_adhesion_flotte',
    'creer_vehicule_esamba',
    'creer_invitation_esamba',
    'verifier_esamba_2024',
    'ajouter_membre_par_email',
    'assurer_profil_utilisateur',
    'accepter_invitation',
    'verifier_sante_systeme',
    'reparer_adhesion_orpheline',
    'affecter_vehicule',
    'fermer_creneau',
    'calculer_recette_attendue',
    'calculer_score_conducteur',
    'fleet_activation_metrics',
    'get_fleet_billing_context',
    'generer_alertes_automatiques',
    'rechercher_utilisateurs',
    'verifier_statut_vehicule_actif'
  ];
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'EXÉCUTION DES VÉRIFICATIONS DES FONCTIONS RPC';
  RAISE NOTICE '========================================';

  FOREACH v_function_name IN ARRAY v_functions_to_check
  LOOP
    SELECT EXISTS(
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = v_function_name
    ) INTO v_function_exists;

    IF v_function_exists THEN
      RAISE NOTICE '✅ % existe', v_function_name;
    ELSE
      RAISE NOTICE '❌ % MANQUANTE', v_function_name;
      v_missing_functions := array_append(v_missing_functions, v_function_name);
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fonctions vérifiées : %', array_length(v_functions_to_check, 1);
  RAISE NOTICE 'Fonctions trouvées : %', array_length(v_functions_to_check, 1) - array_length(v_missing_functions, 1);
  RAISE NOTICE 'Fonctions manquantes : %', array_length(v_missing_functions, 1);

  IF array_length(v_missing_functions, 1) > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Liste des fonctions manquantes :';
    FOREACH v_function_name IN ARRAY v_missing_functions
    LOOP
      RAISE NOTICE '  - %', v_function_name;
    END LOOP;
  END IF;
END;
$$;

-- Exécution des vérifications de permissions
SELECT 
  'PERMISSIONS' as section,
  p.proname as fonction,
  CASE 
    WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN '✅ authenticated'
    ELSE '❌ authenticated manquant'
  END as permission_authenticated,
  CASE 
    WHEN has_function_privilege('anon', p.oid, 'EXECUTE') THEN '✅ anon'
    ELSE '⚠️ anon (optionnel)'
  END as permission_anon
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'creer_onboarding_organisation_flotte_et_adhesion',
    'creer_flotte_esamba',
    'creer_ou_mettre_a_jour_adhesion_flotte',
    'creer_vehicule_esamba',
    'creer_invitation_esamba',
    'verifier_esamba_2024',
    'ajouter_membre_par_email',
    'assurer_profil_utilisateur',
    'accepter_invitation',
    'verifier_sante_systeme',
    'reparer_adhesion_orpheline',
    'affecter_vehicule',
    'fermer_creneau',
    'calculer_recette_attendue',
    'calculer_score_conducteur',
    'fleet_activation_metrics',
    'get_fleet_billing_context',
    'generer_alertes_automatiques',
    'rechercher_utilisateurs',
    'verifier_statut_vehicule_actif'
  )
ORDER BY p.proname;

-- Exécution des vérifications des fonctions obsolètes
SELECT 
  'FONCTIONS OBSOLÈTES' as section,
  p.proname as fonction_obsolete,
  '⚠️ À supprimer' as statut
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'create_esamba_fleet',
    'upsert_fleet_membership',
    'create_esamba_vehicle',
    'create_esamba_invitation',
    'check_esamba_2024',
    'add_member_by_email',
    'ensure_user_profile'
  )
ORDER BY p.proname;

-- Exécution de la vérification de l'utilisation des bons noms de tables
SELECT 
  'VÉRIFICATION NOMS DE TABLES' as section,
  p.proname as fonction,
  CASE 
    WHEN p.prosrc LIKE '%organisations%' OR p.prosrc LIKE '%flottes%' OR p.prosrc LIKE '%vehicules%' 
         OR p.prosrc LIKE '%flotte_adhesions%' OR p.prosrc LIKE '%flotte_invitations%'
         OR p.prosrc LIKE '%affectations_vehicules%' OR p.prosrc LIKE '%profils%'
    THEN '✅ Utilise les noms français'
    WHEN p.prosrc LIKE '%orgs%' OR p.prosrc LIKE '%fleets%' OR p.prosrc LIKE '%vehicles%'
         OR p.prosrc LIKE '%fleet_memberships%' OR p.prosrc LIKE '%fleet_invitations%'
         OR p.prosrc LIKE '%driver_vehicle_assignments%' OR p.prosrc LIKE '%profiles%'
    THEN '❌ Utilise les anciens noms anglais'
    ELSE '⚠️ À vérifier manuellement'
  END as statut
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'creer_onboarding_organisation_flotte_et_adhesion',
    'creer_flotte_esamba',
    'creer_ou_mettre_a_jour_adhesion_flotte',
    'creer_vehicule_esamba',
    'creer_invitation_esamba',
    'verifier_esamba_2024',
    'ajouter_membre_par_email',
    'assurer_profil_utilisateur',
    'accepter_invitation',
    'verifier_sante_systeme',
    'reparer_adhesion_orpheline',
    'affecter_vehicule',
    'fermer_creneau',
    'calculer_recette_attendue',
    'calculer_score_conducteur',
    'fleet_activation_metrics',
    'get_fleet_billing_context',
    'generer_alertes_automatiques',
    'rechercher_utilisateurs',
    'verifier_statut_vehicule_actif'
  )
ORDER BY p.proname;
