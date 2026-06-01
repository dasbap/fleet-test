-- Migration: configuration pg_cron + tables relances billing
-- Prérequis : extension pg_cron activée dans Supabase (Dashboard → Extensions)

-- ─── Extension pg_cron ────────────────────────────────────────────────────
-- Activée via le Dashboard Supabase → ne pas créer ici (nécessite superuser).
-- On vérifie juste qu'elle est disponible avant d'enregistrer le job.

-- ─── Table notification_queue ─────────────────────────────────────────────
-- Relances email pending (consommées par send-notification Edge Function).
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id    uuid        REFERENCES public.flottes(id) ON DELETE CASCADE,
  to_email    text        NOT NULL,
  template_id text        NOT NULL,
  metadata    jsonb       NOT NULL DEFAULT '{}',
  status      text        NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  retry_count int         NOT NULL DEFAULT 0,
  sent_at     timestamptz,
  error_msg   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_queue IS
  'File d''attente pour les notifications email (billing grace, suspension, relance paiement…).';

CREATE INDEX IF NOT EXISTS notification_queue_status_idx
  ON public.notification_queue (status, created_at);

-- RLS : service role uniquement (Edge Function)
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
-- Pas de policy utilisateur — accès exclusif via service_role (SECURITY DEFINER ou Edge Function)

-- ─── Index billing_events global run ─────────────────────────────────────
-- L'event sentinel fleet_id = 00000000-... ne doit pas être bloqué par FK
-- → on utilise une FK nullable ou on insère par fleet existante dans le cron.
-- Pour l'event summary, le cron utilise une fleet_id réelle ou skip l'insert.

-- ─── pg_cron : job quotidien 02h00 UTC ───────────────────────────────────
-- Appelle l'Edge Function billing-lifecycle-cron via http extension.
-- Nécessite : pg_cron + http extension activées dans Supabase.
-- Remplacer YOUR_PROJECT_REF et CRON_SECRET_VALUE par les vraies valeurs.

DO $$
BEGIN
  -- Vérifie que pg_cron est disponible
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) AND EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'http'
  ) THEN
    -- Supprime le job existant si présent (idempotent)
    IF EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'billing-lifecycle-daily'
    ) THEN
      PERFORM cron.unschedule('billing-lifecycle-daily');
    END IF;

    -- Enregistre le cron quotidien à 02:00 UTC
    -- Auth via body.secret (les headers custom sont strippés par le gateway Cloudflare/Supabase).
    -- ⚠️  SÉCURITÉ : remplacer CRON_SECRET_PLACEHOLDER par la vraie valeur AVANT d'exécuter
    --               cette migration. Ne jamais committer le secret réel dans le dépôt.
    --               Commande pour récupérer la valeur : `supabase secrets list --project-ref <ref>`
    --               En production, exécuter directement depuis le Dashboard Supabase SQL Editor.
    PERFORM cron.schedule(
      'billing-lifecycle-daily',          -- nom unique
      '0 2 * * *',                        -- tous les jours à 02h00 UTC
      $cron$
        SELECT extensions.http_post(
          url     := 'https://zqxjvmejoktwlcqshnwi.supabase.co/functions/v1/billing-lifecycle-cron',
          headers := '{"Content-Type": "application/json"}'::jsonb,
          body    := '{"secret": "CRON_SECRET_PLACEHOLDER"}'::jsonb
        );
      $cron$
    );

    RAISE NOTICE 'pg_cron job billing-lifecycle-daily enregistré (02:00 UTC).';
  ELSE
    RAISE NOTICE 'pg_cron ou http non disponible — configurer manuellement dans le Dashboard Supabase.';
  END IF;
END $$;

-- ─── Alternative : appel SQL direct via billing_run_daily_lifecycle ────────
-- Si l'Edge Function n'est pas accessible depuis pg_cron (pas d'extension http),
-- on peut scheduler le RPC SQL directement :
--
-- SELECT cron.schedule(
--   'billing-lifecycle-sql-daily',
--   '0 2 * * *',
--   $$ SELECT public.billing_run_daily_lifecycle(); $$
-- );
--
-- Cette approche ne déclenche pas les relances WhatsApp/email mais assure
-- les transitions de statut abonnement.

-- ─── Index whatsapp_retry_queue si la table existe ────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'whatsapp_retry_queue'
  ) THEN
    -- Index partiel sur les pending pour le worker
    CREATE INDEX IF NOT EXISTS wrq_status_scheduled_idx
      ON public.whatsapp_retry_queue (status, scheduled_at)
      WHERE status = 'pending';
  END IF;
END $$;

-- ─── Vue monitoring lifecycle ─────────────────────────────────────────────
-- Permet au dashboard admin de voir l'état des transitions récentes.
CREATE OR REPLACE VIEW public.v_billing_lifecycle_status AS
SELECT
  a.fleet_id,
  a.status AS subscription_status,
  a.ends_at,
  a.grace_until,
  p.code AS plan_code,
  p.name AS plan_name,
  CASE
    WHEN a.status = 'active'      AND a.ends_at < now()                   THEN 'should_enter_grace'
    WHEN a.status = 'grace_period' AND a.grace_until < now()              THEN 'should_suspend'
    WHEN a.status IN ('expired', 'cancelled', 'suspended')                THEN 'terminal'
    ELSE 'ok'
  END AS lifecycle_health,
  COALESCE(a.cancelled_at, a.grace_until, a.ends_at) AS last_transition
FROM public.abonnements a
JOIN public.plans p ON p.id = a.plan_id
WHERE a.status NOT IN ('cancelled')
ORDER BY a.ends_at ASC;

COMMENT ON VIEW public.v_billing_lifecycle_status IS
  'Vue monitoring : état de santé des abonnements pour le run lifecycle quotidien.';
