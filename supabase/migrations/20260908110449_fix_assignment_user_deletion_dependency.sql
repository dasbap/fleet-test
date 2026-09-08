BEGIN;

ALTER TABLE public.creneaux_conducteurs ALTER COLUMN assignment_id DROP NOT NULL;
ALTER TABLE public.creneaux_conducteurs DROP CONSTRAINT IF EXISTS creneaux_conducteurs_assignment_id_fkey;
ALTER TABLE public.creneaux_conducteurs ADD CONSTRAINT creneaux_conducteurs_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.affectations_vehicules(id) ON DELETE SET NULL;

COMMIT;
