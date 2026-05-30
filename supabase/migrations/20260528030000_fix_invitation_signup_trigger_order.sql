-- Corrige l'ordre d'exécution des triggers sur auth.users.
-- PostgreSQL exécute les triggers AFTER INSERT dans l'ordre alphabétique du nom.
--
-- Problème : "auth_users_handle_invitation_signup" (a...) s'exécutait AVANT
-- "on_auth_user_created" (o...) qui crée la ligne profils.
-- Conséquence : FK violation sur flotte_adhesions.user_id → profils.user_id
-- → le trigger levait une exception → l'INSERT dans auth.users échouait
-- → l'utilisateur ne pouvait pas créer de compte.
--
-- Fix : renommer le trigger en "on_auth_user_invitation_signup" pour passer
-- alphabétiquement après "on_auth_user_created".
-- Ordre garanti : on_auth_user_created → on_auth_user_invitation_signup

DROP TRIGGER IF EXISTS auth_users_handle_invitation_signup ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_invitation_signup ON auth.users;

CREATE TRIGGER on_auth_user_invitation_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invitation_signup();
