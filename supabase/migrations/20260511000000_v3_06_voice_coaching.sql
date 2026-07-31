-- V3 #20 — Coaching vocal conducteur
-- Table: coaching_sessions (liée à profils + flottes, sans conducteurs/trajets)

DO $$ BEGIN
  CREATE TYPE coaching_lang AS ENUM ('fr', 'en', 'ln');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE coaching_status AS ENUM ('pending', 'delivered', 'played', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.coaching_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id        uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  driver_user_id  uuid NOT NULL REFERENCES public.profils(user_id) ON DELETE CASCADE,
  shift_id        uuid REFERENCES public.creneaux_conducteurs(id) ON DELETE SET NULL,
  score           numeric(5,2) NOT NULL,
  score_delta     numeric(5,2),
  lang            public.coaching_lang NOT NULL DEFAULT 'fr',
  coaching_text   text NOT NULL,
  audio_url       text,
  tts_provider    text DEFAULT 'web-speech',
  status          public.coaching_status NOT NULL DEFAULT 'pending',
  push_sent_at    timestamptz,
  played_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coaching_sessions_driver
  ON public.coaching_sessions(driver_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_fleet
  ON public.coaching_sessions(fleet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_pending
  ON public.coaching_sessions(status) WHERE status = 'pending';

ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

-- Conducteur voit ses propres sessions
DROP POLICY IF EXISTS coaching_driver_select ON public.coaching_sessions;
CREATE POLICY coaching_driver_select ON public.coaching_sessions
  FOR SELECT USING (auth.uid() = driver_user_id);

-- Membres de flotte (organizer/manager) voient toutes les sessions
DROP POLICY IF EXISTS coaching_fleet_select ON public.coaching_sessions;
CREATE POLICY coaching_fleet_select ON public.coaching_sessions
  FOR SELECT USING (
    public.has_role(fleet_id, 'organizer'::public.role_type) OR public.has_role(fleet_id, 'manager'::public.role_type)
  );

-- Service role peut tout insérer (Edge Function)
DROP POLICY IF EXISTS coaching_service_insert ON public.coaching_sessions;
CREATE POLICY coaching_service_insert ON public.coaching_sessions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS coaching_service_update ON public.coaching_sessions;
CREATE POLICY coaching_service_update ON public.coaching_sessions
  FOR UPDATE USING (true);
