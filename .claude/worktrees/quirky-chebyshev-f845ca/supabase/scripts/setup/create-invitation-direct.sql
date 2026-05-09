-- =====================================================
-- CRÉER UNE INVITATION DIRECTEMENT DANS SUPABASE
-- Smart Fleet Africa
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- =====================================================

-- Étape 1 : Vérifier votre Fleet ID
-- Remplacez 'VOTRE_FLEET_ID' par votre Fleet ID réel
-- Vous pouvez le trouver avec cette requête :

SELECT 
  f.id as fleet_id,
  f.name as fleet_name,
  fm.role,
  fm.is_active
FROM fleets f
JOIN fleet_memberships fm ON fm.fleet_id = f.id
WHERE fm.user_id = auth.uid()
  AND fm.is_active = true
  AND fm.role IN ('manager', 'organizer')
ORDER BY f.created_at DESC
LIMIT 1;

-- =====================================================
-- Étape 2 : Créer l'invitation
-- =====================================================
-- Remplacez 'VOTRE_FLEET_ID' par l'ID obtenu ci-dessus
-- OU utilisez la version automatique ci-dessous

-- VERSION AUTOMATIQUE (utilise votre première flotte)
INSERT INTO fleet_invitations (
  fleet_id,
  code,
  expires_at,
  max_uses,
  created_by
)
SELECT 
  fm.fleet_id,
  'INV-' || UPPER(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  NOW() + INTERVAL '30 days',  -- Expire dans 30 jours
  10,                            -- Maximum 10 utilisations
  auth.uid()
FROM fleet_memberships fm
WHERE fm.user_id = auth.uid()
  AND fm.role IN ('manager', 'organizer')
  AND fm.is_active = true
LIMIT 1
RETURNING 
  id,
  code,
  expires_at,
  max_uses,
  current_uses,
  created_at;

-- =====================================================
-- VERSION SIMPLE (sans expiration, usage illimité)
-- =====================================================

-- INSERT INTO fleet_invitations (
--   fleet_id,
--   code,
--   expires_at,
--   max_uses,
--   created_by
-- )
-- SELECT 
--   fm.fleet_id,
--   'INV-' || UPPER(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
--   NULL,  -- Pas d'expiration
--   NULL,  -- Usage illimité
--   auth.uid()
-- FROM fleet_memberships fm
-- WHERE fm.user_id = auth.uid()
--   AND fm.role IN ('manager', 'organizer')
--   AND fm.is_active = true
-- LIMIT 1
-- RETURNING *;

-- =====================================================
-- VERSION AVEC CODE PERSONNALISÉ
-- =====================================================

-- INSERT INTO fleet_invitations (
--   fleet_id,
--   code,
--   expires_at,
--   max_uses,
--   created_by
-- )
-- SELECT 
--   fm.fleet_id,
--   'MON-CODE-123',  -- Votre code personnalisé
--   NOW() + INTERVAL '7 days',  -- Expire dans 7 jours
--   5,                         -- Maximum 5 utilisations
--   auth.uid()
-- FROM fleet_memberships fm
-- WHERE fm.user_id = auth.uid()
--   AND fm.role IN ('manager', 'organizer')
--   AND fm.is_active = true
-- LIMIT 1
-- RETURNING *;

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Après avoir créé l'invitation, vérifiez qu'elle existe :

SELECT 
  fi.code,
  fi.current_uses,
  fi.max_uses,
  fi.expires_at,
  CASE 
    WHEN fi.max_uses IS NOT NULL AND fi.current_uses >= fi.max_uses THEN 'Limite atteinte'
    WHEN fi.expires_at IS NOT NULL AND fi.expires_at < NOW() THEN 'Expirée'
    ELSE 'Active'
  END as status,
  f.name as fleet_name,
  fi.created_at
FROM fleet_invitations fi
JOIN fleets f ON f.id = fi.fleet_id
WHERE fi.created_by = auth.uid()
ORDER BY fi.created_at DESC
LIMIT 5;
