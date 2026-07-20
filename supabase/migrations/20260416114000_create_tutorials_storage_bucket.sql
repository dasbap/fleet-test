DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'Storage schema absent - tutorials bucket setup skipped.';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (id, name, public)
  VALUES ('tutorials', 'tutorials', true)
  ON CONFLICT (id) DO NOTHING;

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
