-- Aligne le schéma repo avec la prod et le code TypeScript (colonne steps_data).
-- Idempotent : ne renomme que si l'ancienne colonne data existe encore.

DO $$
BEGIN
  IF to_regclass('public.onboarding_progress') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'onboarding_progress'
      AND column_name = 'data'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'onboarding_progress'
      AND column_name = 'steps_data'
  ) THEN
    ALTER TABLE public.onboarding_progress
      RENAME COLUMN data TO steps_data;
  END IF;
END
$$;
