-- =====================================================
-- RPC FUNCTION: rechercher_utilisateurs
-- Recherche des utilisateurs par email ou nom
-- Smart Fleet Africa
-- =====================================================
-- Cette fonction permet aux managers et organizers de rechercher
-- des utilisateurs pour les ajouter à une flotte
-- =====================================================

DROP FUNCTION IF EXISTS public.rechercher_utilisateurs(text, int);
DROP FUNCTION IF EXISTS public.search_users(text, int);

CREATE OR REPLACE FUNCTION public.rechercher_utilisateurs(
  p_terme_recherche text,
  p_limite int DEFAULT 20
)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  phone text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Permission refusee: Utilisateur doit etre authentifie.';
  END IF;

  -- Limiter le nombre de résultats
  IF p_limite > 100 THEN
    p_limite := 100;
  END IF;

  -- Rechercher les utilisateurs par email ou nom
  -- Recherche insensible à la casse avec LIKE
  RETURN QUERY
  SELECT DISTINCT
    u.id as user_id,
    u.email,
    p.full_name,
    p.phone,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.profils p ON p.user_id = u.id
  WHERE 
    -- Recherche par email (insensible à la casse)
    (LOWER(u.email) LIKE LOWER('%' || p_terme_recherche || '%'))
    OR
    -- Recherche par nom complet (insensible à la casse)
    (p.full_name IS NOT NULL AND LOWER(p.full_name) LIKE LOWER('%' || p_terme_recherche || '%'))
  ORDER BY 
    -- Prioriser les correspondances exactes d'email
    CASE WHEN LOWER(u.email) = LOWER(p_terme_recherche) THEN 1 ELSE 2 END,
    u.created_at DESC
  LIMIT p_limite;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.rechercher_utilisateurs(text, int) TO authenticated;

COMMENT ON FUNCTION public.rechercher_utilisateurs(text, int) IS 
'Recherche des utilisateurs par email ou nom complet. Retourne les informations de profil des utilisateurs correspondant au terme de recherche. Limite par défaut: 20 résultats, maximum: 100.';
