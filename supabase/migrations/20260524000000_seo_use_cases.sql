-- Pages marketing programmatiques /use-case/{outil}-{cible}-{cas-usage}
-- CMS : édition via migrations / Supabase Studio (service role), lecture publique si published.

CREATE TABLE IF NOT EXISTS public.seo_taxonomy (
  slug text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('outil', 'cible', 'cas_usage')),
  label_fr text NOT NULL,
  description_fr text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS seo_taxonomy_kind_slug_idx
  ON public.seo_taxonomy (kind, slug);

CREATE TABLE IF NOT EXISTS public.seo_use_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  outil text NOT NULL REFERENCES public.seo_taxonomy (slug) ON DELETE RESTRICT,
  cible text NOT NULL REFERENCES public.seo_taxonomy (slug) ON DELETE RESTRICT,
  cas_usage text NOT NULL REFERENCES public.seo_taxonomy (slug) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  title text NOT NULL,
  meta_description text NOT NULL,
  h1 text NOT NULL,
  intro text NOT NULL,
  body_md text NOT NULL DEFAULT '',
  intention text NOT NULL DEFAULT '',
  kw_principal text NOT NULL DEFAULT '',
  secteur text NOT NULL DEFAULT 'transport et logistique',
  entites jsonb NOT NULL DEFAULT '[]'::jsonb,
  paa jsonb NOT NULL DEFAULT '[]'::jsonb,
  structure_serp jsonb NOT NULL DEFAULT '[]'::jsonb,
  cta_label text NOT NULL DEFAULT 'Demander une démo',
  cta_href text NOT NULL DEFAULT '/pricing',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seo_use_cases_slug_format CHECK (
    slug = outil || '-' || cible || '-' || cas_usage
  ),
  CONSTRAINT seo_use_cases_published_at_when_live CHECK (
    status <> 'published' OR published_at IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS seo_use_cases_status_published_idx
  ON public.seo_use_cases (status, published_at DESC);

-- Vérifie que chaque dimension référence la bonne kind dans seo_taxonomy
CREATE OR REPLACE FUNCTION public.seo_use_cases_validate_taxonomy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.seo_taxonomy t
    WHERE t.slug = NEW.outil AND t.kind = 'outil'
  ) THEN
    RAISE EXCEPTION 'outil invalide: %', NEW.outil;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.seo_taxonomy t
    WHERE t.slug = NEW.cible AND t.kind = 'cible'
  ) THEN
    RAISE EXCEPTION 'cible invalide: %', NEW.cible;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.seo_taxonomy t
    WHERE t.slug = NEW.cas_usage AND t.kind = 'cas_usage'
  ) THEN
    RAISE EXCEPTION 'cas_usage invalide: %', NEW.cas_usage;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seo_use_cases_validate_taxonomy ON public.seo_use_cases;
CREATE TRIGGER trg_seo_use_cases_validate_taxonomy
  BEFORE INSERT OR UPDATE ON public.seo_use_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.seo_use_cases_validate_taxonomy();

ALTER TABLE public.seo_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_use_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seo_taxonomy_public_read ON public.seo_taxonomy;
CREATE POLICY seo_taxonomy_public_read ON public.seo_taxonomy
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS seo_use_cases_public_read ON public.seo_use_cases;
CREATE POLICY seo_use_cases_public_read ON public.seo_use_cases
  FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    AND published_at IS NOT NULL
    AND published_at <= now()
  );

-- Taxonomie E-Samba
INSERT INTO public.seo_taxonomy (slug, kind, label_fr, description_fr) VALUES
  ('esamba', 'outil', 'E-Samba', 'Plateforme de gestion de flotte'),
  ('cursor', 'outil', 'Cursor', 'IDE assisté par IA pour extensions et scripts'),
  ('n8n', 'outil', 'n8n', 'Automatisation de workflows opérationnels'),
  ('mobile', 'outil', 'Application mobile', 'Flux terrain conducteur et scan QR'),
  ('api', 'outil', 'API E-Samba', 'Intégrations et synchronisation données'),
  ('transporteur-pme', 'cible', 'Transporteur PME', 'Petites et moyennes flottes régionales'),
  ('logistique-cemac', 'cible', 'Logistique CEMAC', 'Opérateurs multi-pays zone CEMAC'),
  ('saas-b2b', 'cible', 'SaaS B2B', 'Éditeurs et intégrateurs B2B'),
  ('startup', 'cible', 'Startup', 'Jeunes entreprises en croissance'),
  ('growth', 'cible', 'Growth', 'Équipes acquisition et expansion'),
  ('maintenance-predictive', 'cas_usage', 'Maintenance prédictive', 'Anticiper pannes et planifier atelier'),
  ('dvir-inspections', 'cas_usage', 'Inspections DVIR', 'Contrôles journaliers pré/post-trajet'),
  ('transit-cemac', 'cas_usage', 'Transit CEMAC', 'Passages frontières et documents'),
  ('alertes-flotte', 'cas_usage', 'Alertes flotte', 'Notifications critiques et suivi'),
  ('rapports-pdf', 'cas_usage', 'Rapports PDF', 'Reporting décisionnel exportable')
ON CONFLICT (slug) DO NOTHING;

-- Pages exemple publiées
INSERT INTO public.seo_use_cases (
  slug, outil, cible, cas_usage, status, published_at,
  title, meta_description, h1, intro, body_md,
  intention, kw_principal, secteur, entites, paa, structure_serp,
  cta_label, cta_href
) VALUES
(
  'esamba-transporteur-pme-maintenance-predictive',
  'esamba', 'transporteur-pme', 'maintenance-predictive',
  'published', now() - interval '1 day',
  'Maintenance prédictive pour transporteurs PME | E-Samba',
  'Réduisez les immobilisations avec la maintenance prédictive E-Samba : alertes kilométriques, historique atelier et priorisation des véhicules à risque.',
  'Maintenance prédictive pour les transporteurs PME en Afrique Centrale',
  'Les PME transport ne disposent pas toujours d''un atelier structuré. E-Samba centralise les signaux véhicule pour planifier les interventions avant la panne.',
  E'## Pourquoi la maintenance prédictive change la donne\n\nUne immobilisation non planifiée coûte plus cher qu''un entretien anticipé. E-Samba agrège le kilométrage, les anomalies DVIR et les travaux en cours pour proposer une file de priorité atelier.\n\n## Ce que vous obtenez\n\n- Alertes seuils km et délais réglementaires\n- Historique maintenance par immatriculation\n- Tableau de bord des véhicules à risque élevé\n\n## Prochaine étape\n\nDemandez une démo pour calibrer les seuils sur votre parc réel.',
  'informationnelle et transactionnelle légère',
  'maintenance prédictive flotte PME Afrique',
  'transport routier et logistique',
  '["maintenance préventive", "gestion de flotte", "immobilisation véhicule", "atelier mécanique"]'::jsonb,
  '["Comment réduire les pannes de flotte ?", "Quels indicateurs suivre pour la maintenance ?", "E-Samba est-il adapté aux PME ?"]'::jsonb,
  '["H1 problème", "H2 bénéfices", "H2 fonctionnalités", "H2 CTA"]'::jsonb,
  'Voir les tarifs',
  '/pricing'
),
(
  'mobile-logistique-cemac-dvir-inspections',
  'mobile', 'logistique-cemac', 'dvir-inspections',
  'published', now() - interval '2 days',
  'DVIR mobile pour logistique CEMAC | E-Samba',
  'Contrôles journaliers DVIR sur mobile : photos, signature conducteur et traçabilité pour les opérateurs CEMAC.',
  'Inspections DVIR terrain pour la logistique CEMAC',
  'Les équipes logistiques multi-pays ont besoin d''un contrôle standardisé avant départ. L''app mobile E-Samba guide le conducteur et archive chaque rapport.',
  E'## Conformité et rapidité\n\nLe module DVIR mobile structure le contrôle pré et post-trajet avec horodatage et lien véhicule.\n\n## Avantages opérationnels\n\n- Moins de paperasse aux dépôts\n- Photos et anomalies centralisées\n- Synchronisation dès retour réseau\n\n## Déploiement\n\nFormez vos conducteurs en une session ; les modèles s''adaptent à votre flotte.',
  'informationnelle',
  'DVIR mobile logistique CEMAC',
  'logistique internationale CEMAC',
  '["DVIR", "contrôle journalier", "application conducteur", "conformité transport"]'::jsonb,
  '["Qu''est-ce qu''un DVIR ?", "Le DVIR fonctionne-t-il hors ligne ?", "Comment lier un rapport à un véhicule ?"]'::jsonb,
  '["H1 définition", "H2 processus", "H2 bénéfices", "FAQ courte"]'::jsonb,
  'Essayer E-Samba',
  '/auth?mode=signup'
),
(
  'n8n-saas-b2b-alertes-flotte',
  'n8n', 'saas-b2b', 'alertes-flotte',
  'published', now() - interval '3 days',
  'Automatiser les alertes flotte avec n8n et E-Samba',
  'Connectez E-Samba à n8n pour router les alertes critiques vers Slack, email ou webhooks métier.',
  'Alertes flotte automatisées via n8n pour intégrateurs B2B',
  'Les éditeurs SaaS et intégrateurs peuvent orchestrer les événements E-Samba sans développer un connecteur dédié.',
  E'## Cas d''usage\n\nDéclenchez un workflow n8n lorsqu''une alerte critique est créée : incident, maintenance dépassée ou anomalie carburant.\n\n## Architecture recommandée\n\n1. Webhook ou polling API E-Samba\n2. Filtrage gravité dans n8n\n3. Notification multi-canal\n\n## Bonnes pratiques\n\nLimitez les alertes routées pour éviter la fatigue opérationnelle.',
  'informationnelle technique',
  'automatisation alertes flotte n8n',
  'SaaS B2B et intégration',
  '["n8n", "webhook", "alertes temps réel", "API flotte"]'::jsonb,
  '["Comment connecter n8n à E-Samba ?", "Quels événements sont disponibles ?", "Faut-il un plan Pro ?"]'::jsonb,
  '["H1 use case", "H2 étapes", "H2 bonnes pratiques"]'::jsonb,
  'Documentation API',
  '/documentation'
)
ON CONFLICT (slug) DO NOTHING;
