-- Fix Supabase Security Advisor 0010: SECURITY DEFINER views.
-- These client-visible views must run with the querying user's privileges so
-- underlying table grants and RLS policies are applied by Postgres/Supabase.

ALTER VIEW IF EXISTS public.v_kpis_flotte SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_creneaux_actifs_validations SET (security_invoker = true);
ALTER VIEW IF EXISTS public.vehicle_failure_features_v1 SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_access_matrix SET (security_invoker = true);
ALTER VIEW IF EXISTS public.v_geofences_with_stats SET (security_invoker = true);

NOTIFY pgrst, 'reload schema';