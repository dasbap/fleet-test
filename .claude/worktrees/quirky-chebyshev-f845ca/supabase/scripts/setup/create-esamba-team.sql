-- =====================================================
-- CRÉATION D'UNE ÉQUIPE POUR LA FLOTTE ESAMBA
-- Smart Fleet Africa
-- =====================================================
-- Ce script ajoute des membres de test à la Flotte ESAMBA
-- =====================================================
-- NOTE: Remplacez les user_id par les IDs réels des utilisateurs
-- =====================================================

-- Étape 1 : Récupérer l'ID de la Flotte ESAMBA
DO $$
DECLARE
  v_fleet_id uuid;
  v_user_id uuid;
BEGIN
  -- Récupérer l'ID de la flotte
  SELECT id INTO v_fleet_id
  FROM fleets
  WHERE name = 'Flotte ESAMBA'
  LIMIT 1;

  IF v_fleet_id IS NULL THEN
    RAISE NOTICE '❌ Flotte ESAMBA non trouvée. Créez d''abord la flotte.';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Flotte ESAMBA trouvée : %', v_fleet_id;

  -- Étape 2 : Vérifier les membres existants
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MEMBRES ACTUELS DE LA FLOTTE ESAMBA';
  RAISE NOTICE '========================================';

  FOR v_user_id IN 
    SELECT fm.user_id
    FROM fleet_memberships fm
    WHERE fm.fleet_id = v_fleet_id
      AND fm.is_active = true
  LOOP
    RAISE NOTICE 'Membre : %', v_user_id;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Pour ajouter des membres :';
  RAISE NOTICE '1. Utilisez l''interface Teams dans l''application';
  RAISE NOTICE '2. Ou utilisez la fonction RPC add_member_by_email';
  RAISE NOTICE '========================================';

END $$;

-- =====================================================
-- EXEMPLE : Ajouter un membre manuellement
-- =====================================================
-- Remplacez USER_ID_ICI par l'ID réel de l'utilisateur
-- Pour obtenir l'ID d'un utilisateur :
-- SELECT id, email FROM auth.users WHERE email = 'email@example.com';
--
-- INSERT INTO fleet_memberships (fleet_id, user_id, role, is_active)
-- SELECT 
--   f.id,
--   'USER_ID_ICI'::uuid,
--   'driver'::role_type,
--   true
-- FROM fleets f
-- WHERE f.name = 'Flotte ESAMBA'
-- ON CONFLICT (fleet_id, user_id, role)
-- DO UPDATE SET is_active = true;
--
-- =====================================================

-- =====================================================
-- VÉRIFICATION : Voir tous les membres de la Flotte ESAMBA
-- =====================================================

SELECT 
  'MEMBRES DE LA FLOTTE ESAMBA' as section,
  fm.id as membership_id,
  fm.role,
  fm.is_active,
  p.full_name,
  p.phone,
  u.email,
  fm.created_at as date_ajout
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
