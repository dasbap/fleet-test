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
END
$$;
