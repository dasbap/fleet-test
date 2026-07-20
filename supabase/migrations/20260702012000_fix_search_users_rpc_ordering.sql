-- Fix rechercher_utilisateurs RPC used by the invitation/member search UI.
-- Previous definitions used SELECT DISTINCT with ORDER BY expressions that were
-- not present in the select list, which raises PostgreSQL error 42P10.

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
DECLARE
  v_terme text := btrim(coalesce(p_terme_recherche, ''));
  v_limite int := least(greatest(coalesce(p_limite, 20), 1), 100);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Permission refusee: Utilisateur doit etre authentifie.';
  END IF;

  IF length(v_terme) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH correspondances AS (
    SELECT
      u.id AS user_id,
      u.email::text AS email,
      p.full_name::text AS full_name,
      p.phone::text AS phone,
      u.created_at,
      CASE WHEN lower(u.email) = lower(v_terme) THEN 1 ELSE 2 END AS ordre_pertinence,
      row_number() OVER (
        PARTITION BY u.id
        ORDER BY p.created_at DESC NULLS LAST
      ) AS ligne_profil
    FROM auth.users u
    LEFT JOIN public.profils p ON p.user_id = u.id
    WHERE lower(u.email) LIKE lower('%' || v_terme || '%')
      OR (
        p.full_name IS NOT NULL
        AND lower(p.full_name) LIKE lower('%' || v_terme || '%')
      )
  )
  SELECT
    correspondances.user_id,
    correspondances.email,
    correspondances.full_name,
    correspondances.phone,
    correspondances.created_at
  FROM correspondances
  WHERE correspondances.ligne_profil = 1
  ORDER BY correspondances.ordre_pertinence, correspondances.created_at DESC
  LIMIT v_limite;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rechercher_utilisateurs(text, int) TO authenticated;

COMMENT ON FUNCTION public.rechercher_utilisateurs(text, int) IS
'Recherche des utilisateurs par email ou nom complet pour l''onglet invitations. Limite par defaut: 20 resultats, maximum: 100.';
