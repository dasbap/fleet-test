-- Migration durcie : table de feedback utilisateur avec sécurité (RLS), index et FK
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id UUID NOT NULL,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  message TEXT NOT NULL,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT feedback_fleet_id_fkey
    FOREIGN KEY (fleet_id)
    REFERENCES public.flottes(id)
    ON DELETE CASCADE,
  CONSTRAINT feedback_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE
);

-- Index pour accélérer les requêtes par flotte, utilisateur et date.
CREATE INDEX IF NOT EXISTS idx_feedback_fleet_id ON public.feedback(fleet_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- Active la sécurité ligne par ligne.
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_select_own ON public.feedback;
DROP POLICY IF EXISTS feedback_insert_own ON public.feedback;
DROP POLICY IF EXISTS feedback_select_manager_admin ON public.feedback;

-- Lecture personnelle : chaque utilisateur authentifié lit ses feedbacks.
CREATE POLICY feedback_select_own
ON public.feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Insertion personnelle : l'utilisateur écrit uniquement pour lui-même
-- et uniquement sur une flotte où il a une adhésion active.
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

-- Lecture globale "admin-friendly" : manager/organizer peuvent lire
-- tous les feedbacks de leur flotte.
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
