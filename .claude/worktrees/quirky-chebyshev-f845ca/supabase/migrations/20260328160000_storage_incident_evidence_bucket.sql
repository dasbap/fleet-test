-- Bucket public pour les photos de signalement d’incidents (URL publique dans incidents.evidence_path)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'incident-evidence',
  'incident-evidence',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lecture publique (bucket public — URLs getPublicUrl)
DROP POLICY IF EXISTS "incident_evidence_select_public" ON storage.objects;
CREATE POLICY "incident_evidence_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'incident-evidence');

-- Téléversement réservé aux utilisateurs connectés (chemins : {fleet_id}/{vehicle_id}/…)
DROP POLICY IF EXISTS "incident_evidence_insert_authenticated" ON storage.objects;
CREATE POLICY "incident_evidence_insert_authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'incident-evidence');
