-- Runtime cleanup for objects that were duplicated by historical migrations.
-- Historical files stay unchanged; this migration only normalizes the final DB
-- state after all prior migrations have been applied.

DO $$
BEGIN
  -- The search migration created these older trigram index names first, then
  -- recreated equivalent indexes with canonical table-scoped names later.
  IF to_regclass('public.idx_alertes_automatiques_message_trgm') IS NOT NULL THEN
    DROP INDEX IF EXISTS public.idx_alertes_message_trgm;
  END IF;

  IF to_regclass('public.idx_travaux_maintenance_notes_trgm') IS NOT NULL THEN
    DROP INDEX IF EXISTS public.idx_travaux_notes_trgm;
  END IF;
END;
$$;

-- Legacy policy names already superseded by later RLS alignment migrations.
-- These drops are intentionally idempotent and do not touch the current
-- canonical restrictive/permissive policy pairs.
DROP POLICY IF EXISTS incidents_select_own ON public.incidents;
DROP POLICY IF EXISTS incidents_select_manager ON public.incidents;
DROP POLICY IF EXISTS incidents_insert_driver ON public.incidents;

DROP POLICY IF EXISTS demo_isolation_travaux ON public.travaux_maintenance;
DROP POLICY IF EXISTS jobs_read_mgr_org_mech ON public.travaux_maintenance;

DROP POLICY IF EXISTS adhesions_select_own_clerk ON public.flotte_adhesions;
DROP POLICY IF EXISTS flottes_select_own_clerk ON public.flottes;
DROP POLICY IF EXISTS profils_select_own_clerk ON public.profils;

DROP FUNCTION IF EXISTS public.search_users(text, int);

NOTIFY pgrst, 'reload schema';
