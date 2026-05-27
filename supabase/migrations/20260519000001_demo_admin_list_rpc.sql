-- Migration : RPC list_demo_profiles() — lecture sécurisée pour DemoAccountsPanel
-- Contexte : DemoAccountsPanel appelait createSupabaseServiceClient() côté client (faille).
-- Fix : ce RPC SECURITY DEFINER permet au client anon de récupérer les profils démo
-- à condition que l'appelant soit un admin plateforme (is_platform_admin()).

-- ─── list_demo_profiles() ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION list_demo_profiles()
  RETURNS TABLE (
    user_id        uuid,
    email          text,
    account_type   text,
    is_active      boolean,
    expires_at     timestamptz,
    notified_at    timestamptz,
    deactivated_at timestamptz,
    created_at     timestamptz
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  -- Réservé aux admins plateforme
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Accès refusé : réservé aux admins plateforme';
  END IF;

  RETURN QUERY
    SELECT
      dp.user_id,
      dp.email,
      dp.account_type::text,
      dp.is_active,
      dp.expires_at,
      dp.notified_at,
      dp.deactivated_at,
      dp.created_at
    FROM demo_profiles dp
   ORDER BY dp.created_at DESC;
END;
$$;

COMMENT ON FUNCTION list_demo_profiles IS
  'Retourne tous les profils démo pour le panel admin. SECURITY DEFINER — vérifie is_platform_admin().';

-- Révocation des grants directs sur la table (le RPC est le seul vecteur autorisé)
-- Note : les politiques RLS existantes sur demo_profiles restent inchangées.

GRANT EXECUTE ON FUNCTION list_demo_profiles() TO authenticated;
REVOKE EXECUTE ON FUNCTION list_demo_profiles() FROM anon;
