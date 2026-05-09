-- =====================================================
-- Sécurité : activer RLS sur toutes les tables concernées
-- Corrige "Policy Exists RLS Disabled" et "RLS Disabled in Public"
-- =====================================================

DO $$
DECLARE
  tables text[] := ARRAY[
    'preuves_maintenance',
    'incidents',
    'listes_verification_maintenance',
    'plans',
    'creneaux_conducteurs',
    'clotures_creneaux',
    'jetons_qr',
    'organisations',
    'flottes'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END;
$$;
