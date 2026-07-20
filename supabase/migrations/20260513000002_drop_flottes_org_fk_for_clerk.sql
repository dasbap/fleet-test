-- Migration : suppression du FK flottes.org_id → organisations
-- Raison : avec Clerk, org_id est un UUID libre (profil ou org Clerk),
-- pas nécessairement lié à la table organisations (Supabase Auth legacy).
ALTER TABLE public.flottes DROP CONSTRAINT IF EXISTS flottes_org_id_fkey;
ALTER TABLE public.flottes ALTER COLUMN org_id DROP NOT NULL;
