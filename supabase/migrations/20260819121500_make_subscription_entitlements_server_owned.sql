BEGIN;

-- Subscriptions and per-vehicle entitlements are billing truth. Managers may
-- read their fleet state, but must not fabricate, mutate, or delete those rows
-- directly through PostgREST. Trusted SECURITY DEFINER RPCs/service-role
-- workflows remain the only writers.
DROP POLICY IF EXISTS abonnements_insert_manager_org ON public.abonnements;
DROP POLICY IF EXISTS abonnements_update_manager_org ON public.abonnements;
DROP POLICY IF EXISTS abonnements_delete_manager_org ON public.abonnements;

DROP POLICY IF EXISTS droits_vehicules_insert_manager_org ON public.droits_vehicules;
DROP POLICY IF EXISTS droits_vehicules_update_manager_org ON public.droits_vehicules;
DROP POLICY IF EXISTS droits_vehicules_delete_manager_org ON public.droits_vehicules;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.abonnements FROM authenticated, anon, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.droits_vehicules FROM authenticated, anon, PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.abonnements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.droits_vehicules TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
