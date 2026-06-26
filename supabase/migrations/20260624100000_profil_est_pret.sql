-- RPC lecture : le profil DB existe pour l'utilisateur connecté (anti race-condition post-inscription)
CREATE OR REPLACE FUNCTION public.profil_est_pret()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profils
    WHERE user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.profil_est_pret() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.profil_est_pret() FROM anon;
GRANT EXECUTE ON FUNCTION public.profil_est_pret() TO authenticated;

COMMENT ON FUNCTION public.profil_est_pret() IS
  'Indique si la ligne profils existe pour auth.uid() — utilisé côté client pour attendre le trigger handle_new_user.';
