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

  IF to_regclass('public.clotures_creneaux') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: table public.clotures_creneaux';
  END IF;

  IF to_regprocedure('public.affecter_vehicule(uuid,uuid,uuid,timestamp with time zone)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.affecter_vehicule(uuid,uuid,uuid,timestamptz)';
  END IF;

  IF to_regprocedure('public.fermer_creneau(uuid,integer,integer,text,text,text)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.fermer_creneau(uuid,int,int,text,text,text)';
  END IF;

  IF to_regprocedure('public.rechercher_utilisateurs(text,integer)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.rechercher_utilisateurs(text,int)';
  END IF;

  IF to_regproc('public.get_inactive_members_for_nudge(integer,integer)') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: RPC public.get_inactive_members_for_nudge(integer,integer)';
  END IF;

  IF to_regclass('public.onboarding_sequence_log') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: table public.onboarding_sequence_log';
  END IF;

  IF to_regclass('public.system_events') IS NULL THEN
    RAISE EXCEPTION 'Objet manquant: table public.system_events';
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
END
$$;
