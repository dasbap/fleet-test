DO $$
BEGIN
  RAISE EXCEPTION 'Ce script ne réinitialise plus de secrets. Utilisez scripts/reset-demo-passwords.mjs avec DEMO_PASSWORD fourni par un environnement non versionné.';
END $$;
