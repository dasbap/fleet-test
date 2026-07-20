-- =====================================================
-- Vérifications post-migration des objets critiques
-- =====================================================

DO $$
BEGIN
  IF to_regclass('public.vehicules') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: table public.vehicules';
  END IF;

  IF to_regclass('public.affectations_vehicules') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: table public.affectations_vehicules';
  END IF;

  IF to_regclass('public.creneaux_conducteurs') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: table public.creneaux_conducteurs';
  END IF;

  IF to_regclass('public.planning_creneaux') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: table public.planning_creneaux';
  END IF;

  IF to_regclass('public.clotures_creneaux') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: table public.clotures_creneaux';
  END IF;

  IF to_regprocedure('public.affecter_vehicule(uuid,uuid,uuid,timestamp with time zone)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.affecter_vehicule(uuid,uuid,uuid,timestamptz)';
  END IF;

  IF to_regprocedure('public.fermer_creneau(uuid,integer,integer,text,text,text,text)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.fermer_creneau(uuid,int,int,text,text,text,text)';
  END IF;

  IF to_regprocedure('public.closure_shift_can_read(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: helper RLS public.closure_shift_can_read(uuid)';
  END IF;

  IF to_regprocedure('public.closure_shift_can_manage(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: helper RLS public.closure_shift_can_manage(uuid)';
  END IF;

  IF to_regprocedure('public.fleet_can_read(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: helper RLS public.fleet_can_read(uuid)';
  END IF;

  IF to_regprocedure('public.vehicle_can_read(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: helper RLS public.vehicle_can_read(uuid,uuid)';
  END IF;

  IF to_regprocedure('public.incident_can_read(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: helper RLS public.incident_can_read(uuid,uuid)';
  END IF;

  IF to_regprocedure('public.assignment_can_read_by_id(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: helper RLS public.assignment_can_read_by_id(uuid)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'clotures_creneaux'
      AND indexname = 'idx_clotures_creneaux_pending_shift_created'
  ) THEN
    RAISE EXCEPTION 'Index manquant: public.idx_clotures_creneaux_pending_shift_created';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'vehicules'
      AND indexname = 'idx_vehicules_fleet_created'
  ) THEN
    RAISE EXCEPTION 'Index manquant: public.idx_vehicules_fleet_created';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'incidents'
      AND indexname = 'idx_incidents_vehicle_created'
  ) THEN
    RAISE EXCEPTION 'Index manquant: public.idx_incidents_vehicle_created';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'creneaux_conducteurs'
      AND indexname = 'idx_creneaux_conducteurs_assignment'
  ) THEN
    RAISE EXCEPTION 'Index manquant: public.idx_creneaux_conducteurs_assignment';
  END IF;

  IF to_regprocedure('public.rechercher_utilisateurs(text,integer)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.rechercher_utilisateurs(text,int)';
  END IF;

  -- to_regprocedure (et non to_regproc) : to_regproc n'accepte pas de signature d'arguments.
  IF to_regprocedure('public.get_inactive_members_for_nudge(integer,integer)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.get_inactive_members_for_nudge(integer,integer)';
  END IF;

  IF to_regclass('public.onboarding_sequence_log') IS NULL THEN
    IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM supabase_migrations.schema_migrations
         WHERE version = '20260413100000'
       ) THEN
      RAISE EXCEPTION
        'Régression: table public.onboarding_sequence_log manquante après migration 20260413100000';
    ELSE
      RAISE EXCEPTION
        'Objet manquant: table public.onboarding_sequence_log (exécuter supabase db push ou appliquer 20260531210000_ensure_onboarding_sequence_log)';
    END IF;
  END IF;

  IF to_regclass('public.system_events') IS NULL THEN
    IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM supabase_migrations.schema_migrations
         WHERE version = '20260413100000'
       ) THEN
      RAISE EXCEPTION
        'Régression: table public.system_events manquante après migration 20260413100000';
    ELSE
      RAISE EXCEPTION
        'Objet manquant: table public.system_events (exécuter supabase db push ou appliquer 20260531210000_ensure_onboarding_sequence_log)';
    END IF;
  END IF;

  IF to_regclass('public.journal_carburant') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: table public.journal_carburant';
  END IF;

  IF to_regclass('public.driver_licenses') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: table public.driver_licenses';
  END IF;

  IF to_regclass('public.driver_score_snapshots') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: table public.driver_score_snapshots';
  END IF;

  IF to_regprocedure('public.calculer_score_conducteur_v2(uuid,uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.calculer_score_conducteur_v2(uuid,uuid,text)';
  END IF;

  IF to_regprocedure('public.fleet_activation_metrics(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.fleet_activation_metrics(uuid)';
  END IF;

  IF to_regprocedure('public.fleet_driver_activation_health(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.fleet_driver_activation_health(uuid)';
  END IF;

  IF to_regprocedure('public.get_fleet_billing_context(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.get_fleet_billing_context(uuid)';
  END IF;

  IF to_regprocedure('public.get_fleet_billing_context_internal(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: public.get_fleet_billing_context_internal(uuid)';
  END IF;

  IF to_regprocedure('public.get_auth_flow_session_snapshot(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.get_auth_flow_session_snapshot(uuid)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    INNER JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_inactive_drivers_with_manager'
      AND p.pronargs = 0
  ) THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.get_inactive_drivers_with_manager()';
  END IF;

  IF to_regprocedure('public.enregistrer_carburant_offline(uuid,uuid,uuid,numeric,integer,integer,timestamp with time zone,text,text,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.enregistrer_carburant_offline(...)';
  END IF;

  -- Dashboard (vues compat + RPC KPI + plan guards)
  IF to_regclass('public.vehicles') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: vue public.vehicles (compat dashboard)';
  END IF;

  IF to_regclass('public.alerts') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: vue public.alerts (compat dashboard)';
  END IF;

  IF to_regclass('public.dashboard_alerts') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: vue public.dashboard_alerts';
  END IF;

  IF to_regprocedure('public.get_kpi_summary(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.get_kpi_summary(uuid)';
  END IF;

  IF to_regprocedure('public.can_create_vehicle(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.can_create_vehicle(uuid)';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.can_create_vehicle(uuid)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'Grant manquant: authenticated EXECUTE public.can_create_vehicle(uuid)';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.can_create_vehicle(uuid)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'Grant manquant: service_role EXECUTE public.can_create_vehicle(uuid)';
  END IF;

  IF to_regprocedure('public.get_plan_access(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.get_plan_access(uuid)';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.get_plan_access(uuid)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'Grant manquant: authenticated EXECUTE public.get_plan_access(uuid)';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.get_plan_access(uuid)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'Grant manquant: service_role EXECUTE public.get_plan_access(uuid)';
  END IF;

  IF to_regprocedure('public.upsert_fleet_membership(uuid,uuid,public.role_type,boolean)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.upsert_fleet_membership(uuid,uuid,role_type,boolean)';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.upsert_fleet_membership(uuid,uuid,public.role_type,boolean)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'Grant manquant: authenticated EXECUTE public.upsert_fleet_membership(uuid,uuid,role_type,boolean)';
  END IF;

  IF has_function_privilege('anon', 'public.upsert_fleet_membership(uuid,uuid,public.role_type,boolean)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'Grant trop large: anon EXECUTE public.upsert_fleet_membership(uuid,uuid,role_type,boolean)';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.flotte_adhesions', 'SELECT') THEN
    RAISE EXCEPTION 'Grant manquant: authenticated SELECT public.flotte_adhesions';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'alert_type'
      AND e.enumlabel = 'dvir_unsafe'
  ) THEN
    RAISE EXCEPTION 'Valeur enum manquante: public.alert_type.dvir_unsafe';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'flotte_adhesions'
      AND i.indisunique
      AND (
        SELECT array_agg(a.attname ORDER BY k.ord)
        FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
        WHERE k.attnum > 0
      ) = ARRAY['fleet_id', 'user_id']::name[]
  ) THEN
    RAISE EXCEPTION 'Contrainte unique manquante: public.flotte_adhesions(fleet_id,user_id)';
  END IF;
END
$$;
