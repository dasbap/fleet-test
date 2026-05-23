-- Bootstrap : créer audit_logs avant les migrations qui ALTER TABLE audit_logs.
-- Idempotent pour environnements où la table existe déjà (prod manuelle).

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email  text,
  action       text NOT NULL,
  target_id    uuid,
  target_email text,
  fleet_id     uuid REFERENCES public.flottes(id) ON DELETE SET NULL,
  metadata     jsonb NOT NULL DEFAULT '{}',
  ip_address   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_fleet_created_idx
  ON public.audit_logs (fleet_id, created_at DESC)
  WHERE fleet_id IS NOT NULL;

COMMENT ON TABLE public.audit_logs IS
  'Journal d''audit multi-tenant (actions sensibles par flotte).';
