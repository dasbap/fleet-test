DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL
     OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE
      'Storage schema absent - tutorials bucket setup skipped.';
    RETURN;
  END IF;

  INSERT INTO storage.buckets (
    id,
    name,
    public
  )
  VALUES (
    'tutorials',
    'tutorials',
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    public = EXCLUDED.public;

  DROP POLICY IF EXISTS "Lecture publique tutoriels"
  ON storage.objects;

  CREATE POLICY "Lecture publique tutoriels"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'tutorials'
  );
END;
$$;