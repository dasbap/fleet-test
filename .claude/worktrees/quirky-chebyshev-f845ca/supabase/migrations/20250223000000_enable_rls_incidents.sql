-- Correction sécurité : activer le RLS sur public.incidents
-- Les politiques (incidents_insertion_conducteur, incidents_lecture_conducteur, incidents_lecture_flotte)
-- existent déjà ; sans RLS activé elles n'ont aucun effet.
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
