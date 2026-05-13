-- Migration : table de log des événements webhook Clerk
-- Sert à l'idempotence (évite le double-traitement sur replay Clerk via svix)
-- et à l'audit des synchronisations Clerk → Supabase.

CREATE TABLE IF NOT EXISTS public.clerk_webhook_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  svix_id      TEXT NOT NULL UNIQUE,           -- header svix-id (dédup)
  event_type   TEXT NOT NULL,                  -- user.created, user.updated, …
  payload      JSONB,                          -- données brutes de l'événement
  status       TEXT NOT NULL DEFAULT 'pending' -- pending | success | error
    CHECK (status IN ('pending', 'success', 'error')),
  error_message TEXT,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Index pour les lookups d'idempotence
CREATE INDEX IF NOT EXISTS idx_clerk_webhook_events_svix_id
  ON public.clerk_webhook_events (svix_id);

-- Index pour le monitoring (recherche par type/statut)
CREATE INDEX IF NOT EXISTS idx_clerk_webhook_events_type_status
  ON public.clerk_webhook_events (event_type, status);

-- RLS : table purement serveur — aucun accès client
ALTER TABLE public.clerk_webhook_events ENABLE ROW LEVEL SECURITY;

-- Aucune policy client : seul le service role peut lire/écrire
-- (la Edge Function clerk-webhook utilise SUPABASE_SERVICE_ROLE_KEY)

COMMENT ON TABLE public.clerk_webhook_events IS
  'Log des événements Clerk reçus via webhook. Utilisé pour l''idempotence (svix-id unique) et l''audit.';
