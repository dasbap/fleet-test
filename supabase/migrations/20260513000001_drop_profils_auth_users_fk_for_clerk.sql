-- Migration : suppression du FK profils.user_id → auth.users
-- Raison : migration vers Clerk — les user_id sont désormais des UUID générés
-- par le webhook Clerk, indépendants de auth.users (Supabase Auth désactivé).
ALTER TABLE public.profils DROP CONSTRAINT IF EXISTS profils_user_id_fkey;
