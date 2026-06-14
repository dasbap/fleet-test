-- Marquer les flottes de l'organisation DEMO comme is_demo=true.
-- Requis par demo_isolation_flottes (RESTRICTIVE) : les comptes is_demo_user()
-- ne peuvent lire que les lignes is_demo=true.

UPDATE public.flottes f
SET is_demo = true
FROM public.organisations o
WHERE f.org_id = o.id
  AND o.name = 'Organisation DEMO E-Samba'
  AND COALESCE(f.is_demo, false) = false;

COMMENT ON COLUMN public.flottes.is_demo IS
  'Flotte sandbox démo — visible uniquement aux comptes démo (demo_isolation_flottes).';
