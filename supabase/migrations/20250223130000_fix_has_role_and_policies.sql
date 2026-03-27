BEGIN;

-- Versionnement: has_role_v2 devient l'implémentation canonique.
CREATE OR REPLACE FUNCTION public.has_role_v2(
  p_flotte_id uuid,
  p_role      role_type
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.flotte_adhesions
    WHERE fleet_id = p_flotte_id
      AND user_id  = auth.uid()
      AND role     = p_role
      AND is_active = true
  );
$$;

-- Compatibilité: has_role délègue vers has_role_v2 pour éviter
-- de casser les policies existantes pendant la migration progressive.
CREATE OR REPLACE FUNCTION public.has_role(
  p_flotte_id uuid,
  p_role      role_type
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role_v2(p_flotte_id, p_role);
$$;

-- Optionnel : restreindre la lecture des invitations.
-- Décommente si tu veux empêcher la lecture publique par anon.
-- DROP POLICY IF EXISTS invitations_lecture_publique ON flotte_invitations;
-- CREATE POLICY invitations_lecture_auth ON flotte_invitations
--   FOR SELECT TO authenticated
--   USING (true);

COMMIT;

