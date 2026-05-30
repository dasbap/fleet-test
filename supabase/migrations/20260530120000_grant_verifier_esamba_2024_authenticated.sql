-- Rétablit l'exécution de verifier_esamba_2024 pour les utilisateurs connectés.
-- Lecture seule (EXISTS) ; membership_organizer utilise auth.uid().
-- Retirée par erreur dans 20260529050000_secadvisor_batch3 (regroupée avec les RPC admin).

REVOKE EXECUTE ON FUNCTION public.verifier_esamba_2024() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verifier_esamba_2024() FROM anon;

GRANT EXECUTE ON FUNCTION public.verifier_esamba_2024() TO authenticated;

COMMENT ON FUNCTION public.verifier_esamba_2024() IS
  'Vérifie l''existence des données ESAMBA-2024 (lecture seule). Exécutable par authenticated pour la page Paramètres ; seed via service_role.';
