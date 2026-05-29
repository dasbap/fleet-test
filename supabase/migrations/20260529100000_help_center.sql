-- Centre d'aide intelligent : articles, analytics et support MVP

-- ── Types ─────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_status') THEN
    CREATE TYPE public.support_ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_callback_status') THEN
    CREATE TYPE public.support_callback_status AS ENUM ('pending', 'scheduled', 'completed', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'help_view_source') THEN
    CREATE TYPE public.help_view_source AS ENUM ('bubble', 'page', 'search', 'error', 'contextual');
  END IF;
END $$;

-- ── Articles ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.help_articles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL,
  title         text NOT NULL,
  category      text NOT NULL,
  role          text[] NOT NULL DEFAULT '{}',
  locale        text NOT NULL DEFAULT 'fr' CHECK (locale IN ('fr', 'en', 'ln')),
  keywords      text[] NOT NULL DEFAULT '{}',
  content       text NOT NULL,
  route_context text[] NOT NULL DEFAULT '{}',
  plan_min      text,
  module_keys   text[] NOT NULL DEFAULT '{}',
  error_codes   text[] NOT NULL DEFAULT '{}',
  sort_order    int NOT NULL DEFAULT 0,
  is_published  boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, locale)
);

CREATE INDEX IF NOT EXISTS help_articles_category_idx ON public.help_articles (category, locale, is_published);
CREATE INDEX IF NOT EXISTS help_articles_keywords_gin ON public.help_articles USING gin (keywords);
CREATE INDEX IF NOT EXISTS help_articles_route_context_gin ON public.help_articles USING gin (route_context);
CREATE INDEX IF NOT EXISTS help_articles_error_codes_gin ON public.help_articles USING gin (error_codes);
CREATE INDEX IF NOT EXISTS help_articles_published_idx ON public.help_articles (is_published) WHERE is_published = true;

-- ── Analytics ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.help_article_views (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.help_articles (id) ON DELETE CASCADE,
  user_id    uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  fleet_id   uuid REFERENCES public.flottes (id) ON DELETE SET NULL,
  source     public.help_view_source NOT NULL DEFAULT 'page',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_article_views_article_created_idx
  ON public.help_article_views (article_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.help_search_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query          text NOT NULL,
  results_count  int NOT NULL DEFAULT 0 CHECK (results_count >= 0),
  had_results    boolean NOT NULL DEFAULT false,
  user_id        uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  fleet_id       uuid REFERENCES public.flottes (id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_search_events_created_idx
  ON public.help_search_events (created_at DESC);

CREATE INDEX IF NOT EXISTS help_search_events_no_results_idx
  ON public.help_search_events (created_at DESC) WHERE had_results = false;

-- ── Support MVP ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  fleet_id   uuid REFERENCES public.flottes (id) ON DELETE SET NULL,
  subject    text NOT NULL,
  body       text NOT NULL,
  status     public.support_ticket_status NOT NULL DEFAULT 'open',
  priority   text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON public.support_tickets (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.support_callbacks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  fleet_id        uuid REFERENCES public.flottes (id) ON DELETE SET NULL,
  phone           text NOT NULL,
  preferred_time  text NOT NULL,
  status          public.support_callback_status NOT NULL DEFAULT 'pending',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Trigger updated_at ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_help_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS help_articles_updated_at ON public.help_articles;
CREATE TRIGGER help_articles_updated_at
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW EXECUTE FUNCTION public.set_help_updated_at();

DROP TRIGGER IF EXISTS support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_help_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_article_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_search_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_callbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS help_articles_public_read ON public.help_articles;
CREATE POLICY help_articles_public_read ON public.help_articles
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS help_article_views_insert ON public.help_article_views;
CREATE POLICY help_article_views_insert ON public.help_article_views
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR user_id IS NULL);

DROP POLICY IF EXISTS help_article_views_read_own ON public.help_article_views;
CREATE POLICY help_article_views_read_own ON public.help_article_views
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.admin_profiles ap
      WHERE ap.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS help_search_events_insert ON public.help_search_events;
CREATE POLICY help_search_events_insert ON public.help_search_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS help_search_events_read_admin ON public.help_search_events;
CREATE POLICY help_search_events_read_admin ON public.help_search_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_profiles ap WHERE ap.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.user_id = auth.uid() AND fa.role = 'organizer'
    )
  );

DROP POLICY IF EXISTS support_tickets_insert ON public.support_tickets;
CREATE POLICY support_tickets_insert ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS support_tickets_read_own ON public.support_tickets;
CREATE POLICY support_tickets_read_own ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS support_callbacks_insert ON public.support_callbacks;
CREATE POLICY support_callbacks_insert ON public.support_callbacks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS support_callbacks_read_own ON public.support_callbacks;
CREATE POLICY support_callbacks_read_own ON public.support_callbacks
  FOR SELECT USING (auth.uid() = user_id);

-- ── RPC analytics (organizer) ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_help_analytics_summary(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.flotte_adhesions fa
    WHERE fa.user_id = auth.uid() AND fa.role = 'organizer'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.admin_profiles ap WHERE ap.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  SELECT jsonb_build_object(
    'top_articles', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT ha.slug, ha.title, ha.category, COUNT(v.id)::int AS views
        FROM public.help_article_views v
        JOIN public.help_articles ha ON ha.id = v.article_id
        WHERE v.created_at >= now() - (p_days || ' days')::interval
        GROUP BY ha.slug, ha.title, ha.category
        ORDER BY views DESC
        LIMIT 10
      ) t
    ),
    'searches_no_results', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT query, COUNT(*)::int AS count
        FROM public.help_search_events
        WHERE had_results = false
          AND created_at >= now() - (p_days || ' days')::interval
        GROUP BY query
        ORDER BY count DESC
        LIMIT 10
      ) t
    ),
    'total_views', (
      SELECT COUNT(*)::int FROM public.help_article_views
      WHERE created_at >= now() - (p_days || ' days')::interval
    ),
    'total_searches', (
      SELECT COUNT(*)::int FROM public.help_search_events
      WHERE created_at >= now() - (p_days || ' days')::interval
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_help_analytics_summary(int) TO authenticated;

-- Écriture articles : organisateurs et admins plateforme (backoffice v2)
DROP POLICY IF EXISTS help_articles_admin_write ON public.help_articles;
CREATE POLICY help_articles_admin_write ON public.help_articles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_profiles ap WHERE ap.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.flotte_adhesions fa
      WHERE fa.user_id = auth.uid() AND fa.role = 'organizer'
    )
  );

-- ── Seed articles FR (idempotent) ─────────────────────────────────────────────

INSERT INTO public.help_articles (slug, title, category, role, locale, keywords, content, route_context, plan_min, module_keys, error_codes, sort_order)
VALUES
  ('create-organization', 'Créer une organisation', 'quickstart', '{}', 'fr', ARRAY['organisation','compte','démarrage'], 'Après connexion, suivez l''assistant d''onboarding pour créer votre organisation.', ARRAY['/onboarding','/start'], NULL, '{}', '{}', 1),
  ('create-fleet', 'Créer une flotte', 'quickstart', ARRAY['organizer'], 'fr', ARRAY['flotte','créer'], 'Menu → Paramètres → Flottes → « Nouvelle flotte ».', ARRAY['/dashboard/create-fleet'], NULL, '{}', '{}', 2),
  ('add-vehicle', 'Ajouter un véhicule', 'quickstart', ARRAY['organizer','manager'], 'fr', ARRAY['véhicule','ajouter','immatriculation'], 'Dashboard → Véhicules → « + Véhicule ». Renseignez l''immatriculation et le kilométrage.', ARRAY['/dashboard/vehicles'], NULL, '{}', ARRAY['billing/vehicle_limit'], 3),
  ('add-driver', 'Ajouter un chauffeur', 'quickstart', ARRAY['organizer','manager'], 'fr', ARRAY['chauffeur','inviter'], 'Dashboard → Invitations → « Inviter un chauffeur ».', ARRAY['/dashboard/invitations','/dashboard/drivers'], NULL, '{}', '{}', 4),
  ('first-assignment', 'Première affectation', 'quickstart', ARRAY['organizer','manager'], 'fr', ARRAY['affectation','assigner'], 'Fiche véhicule → « Conducteur assigné » → « Modifier ».', ARRAY['/dashboard/vehicles'], NULL, '{}', '{}', 5),
  ('first-closure', 'Première clôture de créneau', 'quickstart', ARRAY['driver','manager'], 'fr', ARRAY['clôture','créneau'], 'Dashboard → Clôture → saisissez KM fin et recettes.', ARRAY['/dashboard/closure'], NULL, '{}', '{}', 6),
  ('declare-km-start', 'Déclarer le KM de début', 'driver', ARRAY['driver'], 'fr', ARRAY['kilométrage','début','km'], 'Ouvrez un créneau et saisissez le kilométrage au compteur.', ARRAY['/dashboard/closure','/dashboard/my-vehicle'], NULL, '{}', '{}', 10),
  ('declare-km-end', 'Déclarer le KM de fin', 'driver', ARRAY['driver'], 'fr', ARRAY['kilométrage','fin','km'], 'Clôture → saisissez le kilométrage final.', ARRAY['/dashboard/closure'], NULL, '{}', '{}', 11),
  ('declare-incident', 'Déclarer un incident', 'driver', ARRAY['driver'], 'fr', ARRAY['incident','panne','accident'], 'Dashboard → Signaler → décrivez le problème.', ARRAY['/dashboard/incidents'], NULL, '{}', '{}', 12),
  ('send-receipt', 'Envoyer une recette', 'driver', ARRAY['driver'], 'fr', ARRAY['recette','encaissement'], 'Lors de la clôture, saisissez le montant des recettes en XAF.', ARRAY['/dashboard/closure'], NULL, '{}', '{}', 13),
  ('send-reversement-proof', 'Envoyer une preuve de reversement', 'driver', ARRAY['driver'], 'fr', ARRAY['reversement','preuve'], 'Uploadez la capture Mobile Money dans la clôture.', ARRAY['/dashboard/closure','/dashboard/collections'], NULL, '{}', '{}', 14),
  ('understand-score', 'Comprendre son score conducteur', 'driver', ARRAY['driver'], 'fr', ARRAY['score','performance'], 'Votre score reflète conformité DVIR, ponctualité et absence d''incidents.', '{}', NULL, '{}', '{}', 15),
  ('understand-bonus', 'Comprendre les primes', 'driver', ARRAY['driver'], 'fr', ARRAY['prime','bonus'], 'Les primes sont définies par votre gestionnaire selon votre score.', '{}', NULL, '{}', '{}', 16),
  ('shift-closure', 'Clôturer un créneau', 'driver', ARRAY['driver'], 'fr', ARRAY['clôture','créneau'], 'Dashboard → Clôture → KM fin, recettes, observations.', ARRAY['/dashboard/closure'], NULL, '{}', '{}', 17),
  ('assign-driver', 'Affecter un chauffeur', 'manager', ARRAY['manager','organizer'], 'fr', ARRAY['affecter','chauffeur'], 'Fiche véhicule → « Conducteur assigné » → « Modifier ».', ARRAY['/dashboard/drivers','/dashboard/vehicles'], NULL, '{}', '{}', 20),
  ('validate-closure', 'Valider une clôture', 'manager', ARRAY['manager','organizer'], 'fr', ARRAY['valider','clôture'], 'Encaissements → clôtures en attente → validez.', ARRAY['/dashboard/closure','/dashboard/collections'], NULL, '{}', '{}', 21),
  ('view-discrepancies', 'Voir les écarts', 'manager', ARRAY['manager','organizer'], 'fr', ARRAY['écarts','anomalie'], 'Encaissements → onglet « Écarts ».', ARRAY['/dashboard/collections'], NULL, '{}', '{}', 22),
  ('track-receipts', 'Suivre les recettes', 'manager', ARRAY['manager','organizer'], 'fr', ARRAY['recettes','encaissement'], 'Dashboard → Encaissements.', ARRAY['/dashboard/collections'], NULL, ARRAY['financeEnabled'], '{}', 23),
  ('manage-alerts', 'Gérer les alertes', 'manager', ARRAY['manager','organizer'], 'fr', ARRAY['alertes'], 'Dashboard → Alertes. Traitez les rouges en priorité.', ARRAY['/dashboard/alerts'], NULL, '{}', '{}', 24),
  ('manage-documents', 'Gérer les documents véhicule', 'manager', ARRAY['manager','organizer'], 'fr', ARRAY['documents','assurance'], 'Fiche véhicule → onglet Documents.', ARRAY['/dashboard/vehicles'], NULL, '{}', '{}', 25),
  ('manage-multi-fleet', 'Gérer plusieurs flottes', 'organizer', ARRAY['organizer'], 'fr', ARRAY['multi-flotte'], 'Plan Enterprise requis. Paramètres → Flottes.', '{}', 'enterprise', '{}', '{}', 30),
  ('subscription-overview', 'Comprendre mon abonnement', 'billing', ARRAY['organizer','manager'], 'fr', ARRAY['abonnement','plan'], 'Dashboard → Abonnement.', ARRAY['/dashboard/billing'], NULL, '{}', '{}', 31),
  ('manage-permissions', 'Gérer les permissions et rôles', 'organizer', ARRAY['organizer','manager'], 'fr', ARRAY['permissions','rôles'], 'Dashboard → Rôles.', ARRAY['/dashboard/roles'], NULL, '{}', '{}', 32),
  ('generate-reports', 'Générer des rapports', 'organizer', ARRAY['organizer','manager'], 'fr', ARRAY['rapports','export'], 'Dashboard → Rapports → Générer.', ARRAY['/dashboard/reports'], 'starter', ARRAY['reportsEnabled'], '{}', 33),
  ('qr-licenses', 'QR codes et licences véhicules', 'qr', ARRAY['organizer','manager'], 'fr', ARRAY['qr','licence'], 'Fiche véhicule → « Générer QR ». Plan Pro pour QR premium.', ARRAY['/dashboard/vehicles','/dashboard/billing'], 'pro', '{}', '{}', 34),
  ('create-intervention', 'Créer une intervention', 'mechanic', ARRAY['mechanic','manager','organizer'], 'fr', ARRAY['intervention','maintenance'], 'Maintenance → « Nouvel ordre ».', ARRAY['/dashboard/maintenance'], NULL, '{}', '{}', 40),
  ('close-intervention', 'Fermer une intervention', 'mechanic', ARRAY['mechanic'], 'fr', ARRAY['clôturer','intervention'], 'Ordre de travail → « Clôturer ».', ARRAY['/dashboard/maintenance'], NULL, '{}', '{}', 41),
  ('preventive-maintenance', 'Maintenance préventive', 'mechanic', ARRAY['mechanic','manager'], 'fr', ARRAY['préventif'], 'Fiche véhicule → « Activer rappels ».', ARRAY['/dashboard/maintenance'], NULL, '{}', '{}', 42),
  ('vehicle-history', 'Historique véhicule', 'mechanic', ARRAY['mechanic','manager','organizer'], 'fr', ARRAY['historique'], 'Fiche véhicule → Historique.', ARRAY['/dashboard/history','/dashboard/vehicles'], NULL, '{}', '{}', 43),
  ('dvir-guide', 'Contrôles DVIR', 'mechanic', ARRAY['mechanic','driver','manager'], 'fr', ARRAY['dvir','inspection'], 'Dashboard → Inspections.', ARRAY['/dashboard/inspections'], NULL, '{}', '{}', 44),
  ('payment-methods', 'Modes de paiement acceptés', 'billing', ARRAY['organizer','manager'], 'fr', ARRAY['paiement','mobile money'], 'Mobile Money et cartes via Notch Pay.', ARRAY['/dashboard/billing','/pricing'], NULL, '{}', '{}', 50),
  ('payment-retry', 'Réessayer un paiement échoué', 'billing', ARRAY['organizer','manager'], 'fr', ARRAY['paiement','échec'], 'Abonnement → Renouveler.', ARRAY['/dashboard/billing'], NULL, '{}', ARRAY['billing/payment_failed'], 51),
  ('license-activation', 'Activer une licence véhicule', 'billing', ARRAY['organizer','manager'], 'fr', ARRAY['licence','limite'], 'Passez au plan supérieur ou désactivez un véhicule.', ARRAY['/dashboard/billing','/dashboard/vehicles'], NULL, '{}', ARRAY['billing/vehicle_limit'], 52),
  ('renew-subscription', 'Renouveler mon abonnement', 'billing', ARRAY['organizer','manager'], 'fr', ARRAY['renouvellement'], 'Abonnement → Renouveler.', ARRAY['/dashboard/billing','/upgrade'], NULL, '{}', '{}', 53),
  ('login-guide', 'Se connecter à E-Samba', 'security', '{}', 'fr', ARRAY['connexion','login'], 'e-samba.com/auth — email, OTP ou lien magique.', '{}', NULL, '{}', ARRAY['auth/login_failed'], 60),
  ('otp-guide', 'Code OTP SMS', 'security', '{}', 'fr', ARRAY['otp','sms'], 'Code sous 60s. Option WhatsApp si SMS indisponible.', '{}', NULL, '{}', '{}', 61),
  ('reset-password', 'Réinitialiser mon mot de passe', 'security', '{}', 'fr', ARRAY['mot de passe','reset'], 'Connexion → Mot de passe oublié.', '{}', NULL, '{}', '{}', 62),
  ('magic-link', 'Connexion par lien magique', 'security', '{}', 'fr', ARRAY['lien magique'], 'Email → lien valide 15 minutes.', '{}', NULL, '{}', '{}', 63),
  ('access-management', 'Gérer les accès', 'security', ARRAY['organizer','manager'], 'fr', ARRAY['accès','sécurité'], 'Paramètres → Sécurité.', ARRAY['/dashboard/settings'], NULL, '{}', '{}', 64),
  ('demo-accounts', 'Comptes démo', 'security', '{}', 'fr', ARRAY['démo'], 'Comptes démo expirent après 7 jours.', '{}', NULL, '{}', '{}', 65),
  ('scan-qr', 'Scanner un QR véhicule', 'qr', '{}', 'fr', ARRAY['qr','scanner'], 'Dashboard → Scan.', ARRAY['/dashboard/scan','/terrain/scan'], NULL, '{}', ARRAY['qr/invalid_or_expired'], 70),
  ('qr-troubleshoot', 'Le QR code ne fonctionne pas', 'qr', '{}', 'fr', ARRAY['qr','problème'], 'Régénérez le QR depuis la fiche véhicule.', '{}', NULL, '{}', ARRAY['qr/invalid_or_expired'], 71),
  ('vehicle-blocked', 'Pourquoi mon véhicule est bloqué ?', 'fleet', '{}', 'fr', ARRAY['bloqué','véhicule'], 'Document expiré, limite plan ou blocage manuel.', ARRAY['/dashboard/vehicles'], NULL, '{}', ARRAY['vehicle/blocked'], 72),
  ('dashboard-kpis', 'Comment lire les KPIs du tableau de bord ?', 'general', '{}', 'fr', ARRAY['kpi','dashboard'], 'Cliquez sur une métrique pour le détail.', ARRAY['/dashboard'], NULL, '{}', '{}', 80),
  ('offline-mode', 'Fonctions disponibles hors-ligne', 'general', '{}', 'fr', ARRAY['offline','hors-ligne'], 'Clôtures, incidents, fiches récentes — sync auto.', '{}', NULL, '{}', '{}', 81)
ON CONFLICT (slug, locale) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  role = EXCLUDED.role,
  keywords = EXCLUDED.keywords,
  content = EXCLUDED.content,
  route_context = EXCLUDED.route_context,
  plan_min = EXCLUDED.plan_min,
  module_keys = EXCLUDED.module_keys,
  error_codes = EXCLUDED.error_codes,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Seed EN
INSERT INTO public.help_articles (slug, title, category, role, locale, keywords, content, route_context, sort_order)
VALUES
  ('add-vehicle', 'Add a vehicle', 'quickstart', ARRAY['organizer','manager'], 'en', ARRAY['vehicle','add'], 'Dashboard → Vehicles → "+ Vehicle".', ARRAY['/dashboard/vehicles'], 3),
  ('scan-qr', 'Scan a vehicle QR code', 'qr', '{}', 'en', ARRAY['qr','scan'], 'Dashboard → Scan.', ARRAY['/dashboard/scan'], 70),
  ('login-guide', 'Sign in to E-Samba', 'security', '{}', 'en', ARRAY['login'], 'Go to e-samba.com/auth.', '{}', 60),
  ('subscription-overview', 'Understand my subscription', 'billing', ARRAY['organizer','manager'], 'en', ARRAY['subscription'], 'Dashboard → Billing.', ARRAY['/dashboard/billing'], 31),
  ('shift-closure', 'Close a shift', 'driver', ARRAY['driver'], 'en', ARRAY['closure'], 'Dashboard → Closure.', ARRAY['/dashboard/closure'], 17)
ON CONFLICT (slug, locale) DO UPDATE SET
  title = EXCLUDED.title, content = EXCLUDED.content, updated_at = now();

-- Seed LN
INSERT INTO public.help_articles (slug, title, category, role, locale, keywords, content, sort_order)
VALUES
  ('scan-qr', 'Koscanner QR ya motuka', 'qr', '{}', 'ln', ARRAY['qr','scan'], 'Dashboard → Scan mpo na koscanner QR.', 70),
  ('declare-incident', 'Koyebisa likama', 'driver', ARRAY['driver'], 'ln', ARRAY['likama'], 'Dashboard → Signaler.', 12)
ON CONFLICT (slug, locale) DO UPDATE SET
  title = EXCLUDED.title, content = EXCLUDED.content, updated_at = now();
