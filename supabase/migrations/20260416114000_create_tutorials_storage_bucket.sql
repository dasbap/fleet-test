INSERT INTO storage.buckets (id, name, public)
VALUES ('tutorials', 'tutorials', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Lecture publique tutoriels'
  ) THEN
    CREATE POLICY "Lecture publique tutoriels"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'tutorials');
  END IF;
END $$;
