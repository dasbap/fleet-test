-- =====================================================
-- EXAMINER : CRÉATION D'UNE INVITATION POUR LA FLOTTE
-- Copiez-collez cette requête dans Supabase SQL Editor
-- =====================================================

-- Cette requête crée une invitation unique pour la première flotte liée à l'utilisateur connecté,
-- uniquement si aucune invitation active récente (non expirée) n'existe déjà pour cette flotte.

WITH first_fleet AS (
  SELECT fm.fleet_id
  FROM fleet_memberships fm
  WHERE fm.user_id = auth.uid()
    AND fm.role IN ('manager', 'organizer')
    AND fm.is_active = true
  LIMIT 1
), existing_invitation AS (
  SELECT 1
  FROM fleet_invitations fi
  JOIN first_fleet ff ON fi.fleet_id = ff.fleet_id
  WHERE fi.expires_at > NOW()
  LIMIT 1
)
INSERT INTO fleet_invitations (
  fleet_id,
  code,
  expires_at,
  max_uses,
  created_by
)
SELECT
  ff.fleet_id,
  'INV-' || UPPER(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  NOW() + INTERVAL '30 days',
  10,
  auth.uid()
FROM first_fleet ff
WHERE NOT EXISTS (SELECT 1 FROM existing_invitation)
RETURNING 
  code AS "CODE_INVITATION",
  expires_at AS "EXPIRE_LE",
  max_uses AS "MAX_UTILISATIONS",
  current_uses AS "UTILISATIONS_ACTUELLES";
