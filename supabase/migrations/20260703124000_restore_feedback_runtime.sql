-- Restore runtime feedback table for NPS/user feedback submissions.
-- No platform/admin bypass: inserts are scoped to the authenticated user and active fleet membership.

CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  rating smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  nps_trigger text NULL,
  entity_id uuid NULL,
  entity_type text NULL
);

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS nps_trigger text NULL,
  ADD COLUMN IF NOT EXISTS entity_id uuid NULL,
  ADD COLUMN IF NOT EXISTS entity_type text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'feedback_rating_check'
      AND conrelid = 'public.feedback'::regclass
  ) THEN
    ALTER TABLE public.feedback
      ADD CONSTRAINT feedback_rating_check CHECK (rating BETWEEN 1 AND 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'feedback_nps_trigger_check'
      AND conrelid = 'public.feedback'::regclass
  ) THEN
    ALTER TABLE public.feedback
      ADD CONSTRAINT feedback_nps_trigger_check
      CHECK (
        nps_trigger IS NULL
        OR nps_trigger IN ('alert_resolved', 'maintenance_closed', 'first_month', 'manual')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'feedback_entity_type_check'
      AND conrelid = 'public.feedback'::regclass
  ) THEN
    ALTER TABLE public.feedback
      ADD CONSTRAINT feedback_entity_type_check
      CHECK (
        entity_type IS NULL
        OR entity_type IN ('vehicle', 'maintenance', 'alert')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_feedback_fleet_id ON public.feedback(fleet_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_nps_trigger ON public.feedback(nps_trigger)
  WHERE nps_trigger IS NOT NULL;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_select_own ON public.feedback;
DROP POLICY IF EXISTS feedback_insert_own ON public.feedback;
DROP POLICY IF EXISTS feedback_select_manager_admin ON public.feedback;

CREATE POLICY feedback_select_own
ON public.feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY feedback_insert_own
ON public.feedback
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = feedback.fleet_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
  )
);

CREATE POLICY feedback_select_manager_admin
ON public.feedback
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.flotte_adhesions fa
    WHERE fa.fleet_id = feedback.fleet_id
      AND fa.user_id = auth.uid()
      AND fa.is_active = true
      AND fa.role IN ('manager', 'organizer')
  )
);

COMMENT ON TABLE public.feedback IS
  'Runtime user/NPS feedback submitted from the application.';
COMMENT ON COLUMN public.feedback.nps_trigger IS
  'Origine du sondage : alert_resolved, maintenance_closed, first_month, manual.';

NOTIFY pgrst, 'reload schema';
