-- Réinitialise le mot de passe des comptes démo E-Samba (@esamba.test).
-- Même logique que create-demo-organization-complete.sql (pgcrypto, bcrypt).
-- À exécuter uniquement en staging / démo — pas en production avec des secrets réels.
--
-- Nécessite l’extension pgcrypto (généralement disponible sur Supabase).

UPDATE auth.users
SET
  encrypted_password = crypt('Demo2025!', gen_salt('bf')),
  updated_at = now()
WHERE email IN (
  'demo.organizer@esamba.test',
  'demo.manager1@esamba.test',
  'demo.manager2@esamba.test',
  'demo.driver1@esamba.test',
  'demo.driver2@esamba.test',
  'demo.mechanic1@esamba.test'
);
