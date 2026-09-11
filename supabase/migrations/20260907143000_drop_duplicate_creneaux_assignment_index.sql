CREATE INDEX IF NOT EXISTS idx_creneaux_conducteurs_assignment
  ON public.creneaux_conducteurs (assignment_id);

DROP INDEX IF EXISTS public.idx_creneaux_conducteurs_assignment_id;
