-- Bucket destiné aux photos et pièces justificatives des incidents.
--
-- Les tables storage.buckets et storage.objects sont gérées par Supabase
-- Storage. Elles peuvent être absentes dans certains tests de migrations
-- exécutés uniquement contre PostgreSQL.
--
-- Cette migration reste donc idempotente et n'échoue pas lorsque le service
-- Storage n'a pas encore initialisé son schéma.

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL THEN
    RAISE NOTICE
      'storage.buckets absent : création du bucket incident-evidence ignorée';

    RETURN;
  END IF;

  INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
  )
  VALUES (
    'incident-evidence',
    'incident-evidence',
    true,
    10485760,
    ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif'
    ]::text[]
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
END;
$$;

DO $$
BEGIN
  IF to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE
      'storage.objects absent : politiques du bucket incident-evidence ignorées';

    RETURN;
  END IF;

  DROP POLICY IF EXISTS incident_evidence_public_read
  ON storage.objects;

  DROP POLICY IF EXISTS incident_evidence_authenticated_insert
  ON storage.objects;

  DROP POLICY IF EXISTS incident_evidence_owner_update
  ON storage.objects;

  DROP POLICY IF EXISTS incident_evidence_owner_delete
  ON storage.objects;

  CREATE POLICY incident_evidence_public_read
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'incident-evidence'
  );

  CREATE POLICY incident_evidence_authenticated_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'incident-evidence'
    AND owner_id = auth.uid()::text
  );

  CREATE POLICY incident_evidence_owner_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'incident-evidence'
    AND owner_id = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'incident-evidence'
    AND owner_id = auth.uid()::text
  );

  CREATE POLICY incident_evidence_owner_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'incident-evidence'
    AND owner_id = auth.uid()::text
  );
END;
$$;