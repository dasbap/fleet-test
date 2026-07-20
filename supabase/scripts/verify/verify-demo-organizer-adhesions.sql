-- Vérification rapide : compte démo organizer + adhésions actives
-- À exécuter dans le SQL Editor du projet Supabase utilisé par l’application.

SELECT u.id, u.email
FROM auth.users u
WHERE u.email = 'demo.organizer@esamba.test';

SELECT fa.id, fa.fleet_id, fa.role, fa.is_active, f.name AS fleet_name
FROM public.flotte_adhesions fa
LEFT JOIN public.flottes f ON f.id = fa.fleet_id
WHERE fa.user_id = (SELECT id FROM auth.users WHERE email = 'demo.organizer@esamba.test')
  AND fa.is_active = true;
