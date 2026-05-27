-- ============================================================
-- 07_seed_internal_accounts.sql — E-Samba
-- Rattacher les comptes internes (admin, dev, commercial).
-- Remplacer les UUIDs par les vrais IDs de auth.users.
-- Idempotent : ON CONFLICT DO UPDATE.
-- NE PAS COMMITTER avec de vrais UUIDs — utiliser des variables.
-- ============================================================

-- ⚠️  AVANT D'EXÉCUTER :
-- 1. Récupérer les user_id depuis Supabase Auth Dashboard ou :
--    SELECT id, email FROM auth.users WHERE email IN ('admin@e-samba.com', ...);
-- 2. Remplacer les placeholders ci-dessous par les vrais UUIDs.
-- 3. Exécuter dans SQL Editor (pas via migration versionnée pour éviter de committer des IDs).

-- ── Exemple de rattachement compte admin ─────────────────────────────────────

/*
DO $$
DECLARE
  v_admin_id uuid := '<UUID_ADMIN>';     -- remplacer
  v_dev_id   uuid := '<UUID_DEV>';       -- remplacer
  v_com_id   uuid := '<UUID_COMMERCIAL>';-- remplacer
BEGIN

  -- Admin platform
  INSERT INTO public.profils (
    user_id, email, full_name, universe, status, role
  )
  VALUES (
    v_admin_id, 'admin@e-samba.com', 'Admin E-Samba',
    'internal', 'active', 'organizer'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    universe   = 'internal',
    status     = 'active',
    updated_at = now();

  -- Dev
  INSERT INTO public.profils (user_id, email, full_name, universe, status, role)
  VALUES (v_dev_id, 'dev@e-samba.com', 'Dev E-Samba', 'internal', 'active', 'organizer')
  ON CONFLICT (user_id) DO UPDATE SET universe = 'internal', status = 'active', updated_at = now();

  -- Commercial
  INSERT INTO public.profils (user_id, email, full_name, universe, status, role)
  VALUES (v_com_id, 'commercial@e-samba.com', 'Commercial E-Samba', 'internal', 'active', 'manager')
  ON CONFLICT (user_id) DO UPDATE SET universe = 'internal', status = 'active', updated_at = now();

END $$;
*/

-- ── Requête de vérification post-seed ────────────────────────────────────────

SELECT user_id, email, full_name, universe, status, role, expires_at
FROM public.profils
WHERE universe::text = 'internal'
ORDER BY created_at;
