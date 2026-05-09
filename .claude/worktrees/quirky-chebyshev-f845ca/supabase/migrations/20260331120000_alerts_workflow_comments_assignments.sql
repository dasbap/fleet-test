-- =====================================================
-- Migration : Workflow détaillé des alertes
-- Date : 2026-03-31
-- Objet :
--  - Ajouter un statut métier d’alerte (NOUVEAU / EN_COURS / RESOLU)
--  - Ajouter l’assignation d’un responsable
--  - Ajouter les commentaires liés à une alerte
--  - Activer le RLS et définir des politiques cohérentes
-- =====================================================

BEGIN;

-- =====================================================
-- 1) Enum de statut métier pour les alertes
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_workflow_status') THEN
    CREATE TYPE incident_workflow_status AS ENUM ('NOUVEAU', 'EN_COURS', 'RESOLU');
  END IF;
END $$;

-- =====================================================
-- 2) Évolution de la table alertes_automatiques
-- =====================================================

-- Statut métier (workflow)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'alertes_automatiques'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.alertes_automatiques
      ADD COLUMN status incident_workflow_status NOT NULL DEFAULT 'NOUVEAU';
  END IF;
END $$;

-- Assignation du responsable (membre de flotte)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'alertes_automatiques'
      AND column_name = 'assignee_user_id'
  ) THEN
    ALTER TABLE public.alertes_automatiques
      ADD COLUMN assignee_user_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'alertes_automatiques_assignee_user_id_fkey'
  ) THEN
    ALTER TABLE public.alertes_automatiques
      ADD CONSTRAINT alertes_automatiques_assignee_user_id_fkey
      FOREIGN KEY (assignee_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Dates d’assignation et de mise à jour statut (pour historique simple)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'alertes_automatiques'
      AND column_name = 'assigned_at'
  ) THEN
    ALTER TABLE public.alertes_automatiques
      ADD COLUMN assigned_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'alertes_automatiques'
      AND column_name = 'status_updated_at'
  ) THEN
    ALTER TABLE public.alertes_automatiques
      ADD COLUMN status_updated_at timestamptz;
  END IF;
END $$;

-- Index utiles
CREATE INDEX IF NOT EXISTS idx_alertes_automatiques_status
  ON public.alertes_automatiques(status);

CREATE INDEX IF NOT EXISTS idx_alertes_automatiques_assignee_user_id
  ON public.alertes_automatiques(assignee_user_id);

-- =====================================================
-- 3) Table de commentaires d’alerte
-- =====================================================

CREATE TABLE IF NOT EXISTS public.alert_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL,
  author_user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'alert_comments_alert_id_fkey'
  ) THEN
    ALTER TABLE public.alert_comments
      ADD CONSTRAINT alert_comments_alert_id_fkey
      FOREIGN KEY (alert_id) REFERENCES public.alertes_automatiques(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'alert_comments_author_user_id_fkey'
  ) THEN
    ALTER TABLE public.alert_comments
      ADD CONSTRAINT alert_comments_author_user_id_fkey
      FOREIGN KEY (author_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_alert_comments_alert_id_created_at
  ON public.alert_comments(alert_id, created_at DESC);

-- =====================================================
-- 4) Sécurité : RLS et politiques
-- =====================================================

-- Activer le RLS sur les commentaires
ALTER TABLE public.alert_comments ENABLE ROW LEVEL SECURITY;

-- Politiques basées sur l’appartenance à la flotte via la table alertes_automatiques.
-- On suppose que les politiques existantes sur alertes_automatiques restreignent déjà l’accès
-- aux membres de la flotte concernée.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'alert_comments'
      AND policyname = 'alert_comments_select'
  ) THEN
    CREATE POLICY alert_comments_select
    ON public.alert_comments
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.alertes_automatiques a
        JOIN public.flotte_adhesions fa ON fa.fleet_id = a.fleet_id
        WHERE a.id = alert_id
          AND fa.user_id = auth.uid()
          AND fa.is_active = true
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'alert_comments'
      AND policyname = 'alert_comments_insert'
  ) THEN
    CREATE POLICY alert_comments_insert
    ON public.alert_comments
    FOR INSERT
    WITH CHECK (
      author_user_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.alertes_automatiques a
        JOIN public.flotte_adhesions fa ON fa.fleet_id = a.fleet_id
        WHERE a.id = alert_id
          AND fa.user_id = auth.uid()
          AND fa.is_active = true
      )
    );
  END IF;
END $$;

COMMIT;

