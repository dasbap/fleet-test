-- Relation flotte_adhesions → profils pour les requêtes PostgREST
-- Actuellement flotte_adhesions.user_id → auth.users ; PostgREST ne propose pas
-- de relation vers profils. On fait pointer la FK vers profils pour permettre
-- les select imbriqués (profile:profils(...)) depuis flotte_adhesions.
-- Intégrité préservée : profils.user_id → auth.users.

-- 1. Créer les profils manquants pour tout user_id présent dans flotte_adhesions
INSERT INTO public.profils (user_id, full_name, created_at)
SELECT fa.user_id, 'Utilisateur', now()
FROM public.flotte_adhesions fa
WHERE NOT EXISTS (SELECT 1 FROM public.profils p WHERE p.user_id = fa.user_id)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Supprimer l’ancienne FK vers auth.users
ALTER TABLE public.flotte_adhesions
  DROP CONSTRAINT IF EXISTS flotte_adhesions_user_id_fkey;

-- 3. Ajouter la FK vers profils (même nom pour que le hint côté client reste valide)
ALTER TABLE public.flotte_adhesions
  ADD CONSTRAINT flotte_adhesions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profils(user_id) ON DELETE CASCADE;
