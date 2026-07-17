-- Reconstruit depuis le schéma remote (idempotent).
-- enum statut_pilote + pilot_sites / contacts / events + vue_pipeline_cemac
-- Ne pas ré-appliquer sur une base déjà à jour : déjà présent dans schema_migrations.

DO $$ BEGIN
  CREATE TYPE public.pays_cemac AS ENUM ('CM', 'CG', 'GA', 'TD', 'CF', 'GQ');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.statut_pilote AS ENUM (
    'prospect', 'qualification', 'negociation', 'actif', 'suspendu', 'converti', 'perdu'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.pilot_sites (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  fleet_id uuid NOT NULL,
  nom_entreprise text NOT NULL,
  secteur_activite text,
  pays public.pays_cemac NOT NULL,
  ville text NOT NULL,
  adresse text,
  nb_vehicules_estime integer,
  statut public.statut_pilote DEFAULT 'prospect'::public.statut_pilote NOT NULL,
  date_premier_contact date,
  date_debut_pilote date,
  date_fin_pilote date,
  date_conversion date,
  plan_souscrit text,
  mrr_estime_eur numeric(10,2),
  notes text,
  gestionnaire_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT pilot_sites_pkey PRIMARY KEY (id),
  CONSTRAINT pilot_sites_mrr_estime_eur_check CHECK (mrr_estime_eur >= 0),
  CONSTRAINT pilot_sites_nb_vehicules_estime_check CHECK (nb_vehicules_estime > 0),
  CONSTRAINT pilot_sites_plan_souscrit_check
    CHECK (plan_souscrit = ANY (ARRAY['starter','business','enterprise']::text[]))
);

COMMENT ON TABLE public.pilot_sites IS
  'CRM pilotes terrain CEMAC — sites prospects/clients avec cycle commercial complet.';

CREATE INDEX IF NOT EXISTS idx_pilot_sites_fleet_id ON public.pilot_sites (fleet_id);
CREATE INDEX IF NOT EXISTS idx_pilot_sites_pays ON public.pilot_sites (pays);
CREATE INDEX IF NOT EXISTS idx_pilot_sites_statut ON public.pilot_sites (fleet_id, statut);

DO $$ BEGIN
  ALTER TABLE public.pilot_sites
    ADD CONSTRAINT pilot_sites_fleet_id_fkey
    FOREIGN KEY (fleet_id) REFERENCES public.flottes(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.pilot_sites
    ADD CONSTRAINT pilot_sites_gestionnaire_id_fkey
    FOREIGN KEY (gestionnaire_id) REFERENCES public.profils(user_id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_pilot_sites_updated_at ON public.pilot_sites;
CREATE TRIGGER trg_pilot_sites_updated_at
  BEFORE UPDATE ON public.pilot_sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pilot_sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pilot_sites_select ON public.pilot_sites;
CREATE POLICY pilot_sites_select ON public.pilot_sites
  FOR SELECT TO authenticated
  USING (public.has_role(fleet_id, 'organizer'::public.role_type));

DROP POLICY IF EXISTS pilot_sites_insert ON public.pilot_sites;
CREATE POLICY pilot_sites_insert ON public.pilot_sites
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(fleet_id, 'organizer'::public.role_type));

DROP POLICY IF EXISTS pilot_sites_update ON public.pilot_sites;
CREATE POLICY pilot_sites_update ON public.pilot_sites
  FOR UPDATE TO authenticated
  USING (public.has_role(fleet_id, 'organizer'::public.role_type))
  WITH CHECK (public.has_role(fleet_id, 'organizer'::public.role_type));

DROP POLICY IF EXISTS pilot_sites_delete ON public.pilot_sites;
CREATE POLICY pilot_sites_delete ON public.pilot_sites
  FOR DELETE TO authenticated
  USING (public.has_role(fleet_id, 'organizer'::public.role_type));

CREATE TABLE IF NOT EXISTS public.pilot_contacts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  pilot_site_id uuid NOT NULL,
  fleet_id uuid NOT NULL,
  prenom text NOT NULL,
  nom text NOT NULL,
  poste text,
  email text,
  telephone text,
  whatsapp text,
  est_decideur boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT pilot_contacts_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_pilot_contacts_site ON public.pilot_contacts (pilot_site_id);

DO $$ BEGIN
  ALTER TABLE public.pilot_contacts
    ADD CONSTRAINT pilot_contacts_fleet_id_fkey
    FOREIGN KEY (fleet_id) REFERENCES public.flottes(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.pilot_contacts
    ADD CONSTRAINT pilot_contacts_pilot_site_id_fkey
    FOREIGN KEY (pilot_site_id) REFERENCES public.pilot_sites(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.pilot_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pilot_contacts_select ON public.pilot_contacts;
CREATE POLICY pilot_contacts_select ON public.pilot_contacts
  FOR SELECT TO authenticated
  USING (public.has_role(fleet_id, 'organizer'::public.role_type));

DROP POLICY IF EXISTS pilot_contacts_insert ON public.pilot_contacts;
CREATE POLICY pilot_contacts_insert ON public.pilot_contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(fleet_id, 'organizer'::public.role_type));

DROP POLICY IF EXISTS pilot_contacts_update ON public.pilot_contacts;
CREATE POLICY pilot_contacts_update ON public.pilot_contacts
  FOR UPDATE TO authenticated
  USING (public.has_role(fleet_id, 'organizer'::public.role_type))
  WITH CHECK (public.has_role(fleet_id, 'organizer'::public.role_type));

DROP POLICY IF EXISTS pilot_contacts_delete ON public.pilot_contacts;
CREATE POLICY pilot_contacts_delete ON public.pilot_contacts
  FOR DELETE TO authenticated
  USING (public.has_role(fleet_id, 'organizer'::public.role_type));

CREATE TABLE IF NOT EXISTS public.pilot_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  pilot_site_id uuid NOT NULL,
  fleet_id uuid NOT NULL,
  type_evenement text NOT NULL,
  date_evenement timestamptz DEFAULT now() NOT NULL,
  titre text NOT NULL,
  description text,
  prochaine_etape text,
  date_relance date,
  realise_par uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT pilot_events_pkey PRIMARY KEY (id),
  CONSTRAINT pilot_events_type_evenement_check CHECK (
    type_evenement = ANY (ARRAY[
      'appel','visite_terrain','demo','proposition_commerciale','onboarding','incident','note'
    ]::text[])
  )
);

CREATE INDEX IF NOT EXISTS idx_pilot_events_date ON public.pilot_events (date_evenement DESC);
CREATE INDEX IF NOT EXISTS idx_pilot_events_site ON public.pilot_events (pilot_site_id);

DO $$ BEGIN
  ALTER TABLE public.pilot_events
    ADD CONSTRAINT pilot_events_fleet_id_fkey
    FOREIGN KEY (fleet_id) REFERENCES public.flottes(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.pilot_events
    ADD CONSTRAINT pilot_events_pilot_site_id_fkey
    FOREIGN KEY (pilot_site_id) REFERENCES public.pilot_sites(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.pilot_events
    ADD CONSTRAINT pilot_events_realise_par_fkey
    FOREIGN KEY (realise_par) REFERENCES public.profils(user_id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.pilot_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pilot_events_select ON public.pilot_events;
CREATE POLICY pilot_events_select ON public.pilot_events
  FOR SELECT TO authenticated
  USING (public.has_role(fleet_id, 'organizer'::public.role_type));

DROP POLICY IF EXISTS pilot_events_insert ON public.pilot_events;
CREATE POLICY pilot_events_insert ON public.pilot_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(fleet_id, 'organizer'::public.role_type));

DROP POLICY IF EXISTS pilot_events_update ON public.pilot_events;
CREATE POLICY pilot_events_update ON public.pilot_events
  FOR UPDATE TO authenticated
  USING (public.has_role(fleet_id, 'organizer'::public.role_type))
  WITH CHECK (public.has_role(fleet_id, 'organizer'::public.role_type));

DROP POLICY IF EXISTS pilot_events_delete ON public.pilot_events;
CREATE POLICY pilot_events_delete ON public.pilot_events
  FOR DELETE TO authenticated
  USING (public.has_role(fleet_id, 'organizer'::public.role_type));

CREATE OR REPLACE VIEW public.vue_pipeline_cemac
WITH (security_invoker = true) AS
SELECT
  fleet_id,
  pays,
  statut,
  count(*) AS nb_sites,
  sum(nb_vehicules_estime) AS vehicules_potentiels,
  sum(mrr_estime_eur) AS mrr_potentiel_eur,
  count(*) FILTER (WHERE statut = 'converti'::public.statut_pilote) AS convertis
FROM public.pilot_sites ps
GROUP BY fleet_id, pays, statut;

GRANT ALL ON TABLE public.pilot_sites TO authenticated, service_role;
GRANT ALL ON TABLE public.pilot_contacts TO authenticated, service_role;
GRANT ALL ON TABLE public.pilot_events TO authenticated, service_role;
GRANT SELECT ON TABLE public.vue_pipeline_cemac TO authenticated;
