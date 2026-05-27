-- Tutoriels vidéo : catalogue, progression, favoris et vues

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tutorial_provider') THEN
    CREATE TYPE public.tutorial_provider AS ENUM ('storage', 'youtube', 'vimeo');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tutorial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label_fr text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  category_id uuid NOT NULL REFERENCES public.tutorial_categories (id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  duration_sec int NOT NULL DEFAULT 0 CHECK (duration_sec >= 0),
  provider public.tutorial_provider NOT NULL DEFAULT 'storage',
  video_path text,
  external_url text,
  thumb_path text,
  sort_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  tags text[] NOT NULL DEFAULT '{}',
  chapters jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tutorials_category_id_idx ON public.tutorials (category_id);
CREATE INDEX IF NOT EXISTS tutorials_published_sort_idx
  ON public.tutorials (is_published, sort_order);

CREATE TABLE IF NOT EXISTS public.tutorial_progress (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  tutorial_id text NOT NULL REFERENCES public.tutorials (slug) ON DELETE CASCADE,
  fleet_id uuid REFERENCES public.flottes (id) ON DELETE SET NULL,
  position_sec int NOT NULL DEFAULT 0 CHECK (position_sec >= 0),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tutorial_id)
);

CREATE INDEX IF NOT EXISTS tutorial_progress_fleet_idx ON public.tutorial_progress (fleet_id);

CREATE TABLE IF NOT EXISTS public.tutorial_favorites (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  tutorial_id text NOT NULL REFERENCES public.tutorials (slug) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tutorial_id)
);

CREATE TABLE IF NOT EXISTS public.tutorial_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  tutorial_id text NOT NULL REFERENCES public.tutorials (slug) ON DELETE CASCADE,
  fleet_id uuid REFERENCES public.flottes (id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('online', 'offline')),
  watched_sec int NOT NULL DEFAULT 0 CHECK (watched_sec >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tutorial_views_user_created_idx
  ON public.tutorial_views (user_id, created_at DESC);

-- Seed catégories
INSERT INTO public.tutorial_categories (slug, label_fr, sort_order)
VALUES
  ('creneau', 'Créneaux & terrain', 1),
  ('incident', 'Incidents', 2),
  ('maintenance', 'Maintenance', 3),
  ('rapports', 'Rapports', 4),
  ('parametres', 'Paramètres', 5)
ON CONFLICT (slug) DO UPDATE SET
  label_fr = EXCLUDED.label_fr,
  sort_order = EXCLUDED.sort_order;

-- Seed tutoriels (métadonnées alignées apps/mobile)
INSERT INTO public.tutorials (
  slug, category_id, title, description, duration_sec, provider,
  video_path, thumb_path, sort_order, tags, chapters
)
SELECT
  v.slug,
  c.id,
  v.title,
  v.description,
  v.duration_sec,
  'storage'::public.tutorial_provider,
  v.video_path,
  v.thumb_path,
  v.sort_order,
  v.tags,
  v.chapters::jsonb
FROM (VALUES
  ('tuto-01', 'creneau', 'Ouvrir un créneau', 'Démarrer une mission en 4 étapes terrain.', 62, 'videos/tuto-01.mp4', 'thumbs/tuto-01.jpg', 1, ARRAY['créneau','départ']::text[], '[{"id":"c1","title":"Contexte","startSec":0},{"id":"c2","title":"Démonstration","startSec":15},{"id":"c3","title":"Récapitulatif","startSec":49}]'),
  ('tuto-02', 'creneau', 'Clôturer une mission', 'Fermer correctement un créneau en fin de mission.', 47, 'videos/tuto-02.mp4', 'thumbs/tuto-02.jpg', 2, ARRAY['retour','clôture']::text[], '[{"id":"c1","title":"Contexte","startSec":0},{"id":"c2","title":"Démonstration","startSec":11},{"id":"c3","title":"Récapitulatif","startSec":37}]'),
  ('tuto-03', 'creneau', 'Scanner un QR véhicule', 'Accéder à la fiche véhicule via scan QR.', 31, 'videos/tuto-03.mp4', 'thumbs/tuto-03.jpg', 3, ARRAY['QR','scan']::text[], '[{"id":"c1","title":"Contexte","startSec":0},{"id":"c2","title":"Démonstration","startSec":10},{"id":"c3","title":"Récapitulatif","startSec":24}]'),
  ('tuto-04', 'incident', 'Signaler un incident', 'Déclarer un incident avec photo et géolocalisation.', 53, 'videos/tuto-04.mp4', 'thumbs/tuto-04.jpg', 4, ARRAY['incident','panne']::text[], '[{"id":"c1","title":"Contexte","startSec":0},{"id":"c2","title":"Démonstration","startSec":13},{"id":"c3","title":"Récapitulatif","startSec":42}]'),
  ('tuto-05', 'creneau', 'Saisir un plein carburant', 'Enregistrer volume, montant et justificatif.', 41, 'videos/tuto-05.mp4', 'thumbs/tuto-05.jpg', 5, ARRAY['carburant']::text[], '[{"id":"c1","title":"Contexte","startSec":0},{"id":"c2","title":"Démonstration","startSec":10},{"id":"c3","title":"Récapitulatif","startSec":32}]'),
  ('tuto-06', 'maintenance', 'Consulter les alertes', 'Lire et prioriser les alertes maintenance.', 37, 'videos/tuto-06.mp4', 'thumbs/tuto-06.jpg', 6, ARRAY['alertes']::text[], '[{"id":"c1","title":"Contexte","startSec":0},{"id":"c2","title":"Démonstration","startSec":9},{"id":"c3","title":"Récapitulatif","startSec":29}]'),
  ('tuto-07', 'maintenance', 'Planifier un entretien', 'Programmer une intervention avec budget.', 58, 'videos/tuto-07.mp4', 'thumbs/tuto-07.jpg', 7, ARRAY['entretien']::text[], '[{"id":"c1","title":"Contexte","startSec":0},{"id":"c2","title":"Démonstration","startSec":14},{"id":"c3","title":"Récapitulatif","startSec":46}]'),
  ('tuto-08', 'rapports', 'Lire un rapport', 'Analyser les rapports de flotte et exporter.', 46, 'videos/tuto-08.mp4', 'thumbs/tuto-08.jpg', 8, ARRAY['rapport']::text[], '[{"id":"c1","title":"Contexte","startSec":0},{"id":"c2","title":"Démonstration","startSec":11},{"id":"c3","title":"Récapitulatif","startSec":36}]'),
  ('tuto-09', 'parametres', 'Inviter un collègue', 'Ajouter un membre dans l''organisation.', 33, 'videos/tuto-09.mp4', 'thumbs/tuto-09.jpg', 9, ARRAY['invitation']::text[], '[{"id":"c1","title":"Contexte","startSec":0},{"id":"c2","title":"Démonstration","startSec":8},{"id":"c3","title":"Récapitulatif","startSec":26}]'),
  ('tuto-10', 'parametres', 'Utiliser le mode offline', 'Travailler hors réseau puis synchroniser.', 64, 'videos/tuto-10.mp4', 'thumbs/tuto-10.jpg', 10, ARRAY['offline','sync']::text[], '[{"id":"c1","title":"Contexte","startSec":0},{"id":"c2","title":"Démonstration","startSec":16},{"id":"c3","title":"Récapitulatif","startSec":51}]')
) AS v(slug, cat_slug, title, description, duration_sec, video_path, thumb_path, sort_order, tags, chapters)
JOIN public.tutorial_categories c ON c.slug = v.cat_slug
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  duration_sec = EXCLUDED.duration_sec,
  video_path = EXCLUDED.video_path,
  thumb_path = EXCLUDED.thumb_path,
  sort_order = EXCLUDED.sort_order,
  tags = EXCLUDED.tags,
  chapters = EXCLUDED.chapters,
  is_published = true,
  updated_at = now();

-- RLS
ALTER TABLE public.tutorial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_views ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tutorial_categories_select_auth'
  ) THEN
    CREATE POLICY tutorial_categories_select_auth ON public.tutorial_categories
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tutorials_select_published'
  ) THEN
    CREATE POLICY tutorials_select_published ON public.tutorials
      FOR SELECT TO authenticated USING (is_published = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tutorial_progress_select_own'
  ) THEN
    CREATE POLICY tutorial_progress_select_own ON public.tutorial_progress
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tutorial_progress_insert_own'
  ) THEN
    CREATE POLICY tutorial_progress_insert_own ON public.tutorial_progress
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tutorial_progress_update_own'
  ) THEN
    CREATE POLICY tutorial_progress_update_own ON public.tutorial_progress
      FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tutorial_favorites_select_own'
  ) THEN
    CREATE POLICY tutorial_favorites_select_own ON public.tutorial_favorites
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tutorial_favorites_insert_own'
  ) THEN
    CREATE POLICY tutorial_favorites_insert_own ON public.tutorial_favorites
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tutorial_favorites_delete_own'
  ) THEN
    CREATE POLICY tutorial_favorites_delete_own ON public.tutorial_favorites
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tutorial_views_insert_own'
  ) THEN
    CREATE POLICY tutorial_views_insert_own ON public.tutorial_views
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tutorial_views_select_own'
  ) THEN
    CREATE POLICY tutorial_views_select_own ON public.tutorial_views
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT ON public.tutorial_categories TO authenticated;
GRANT SELECT ON public.tutorials TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tutorial_progress TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.tutorial_favorites TO authenticated;
GRANT SELECT, INSERT ON public.tutorial_views TO authenticated;
