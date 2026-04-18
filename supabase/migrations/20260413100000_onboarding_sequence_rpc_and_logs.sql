-- Séquence onboarding chauffeurs inactifs : journaux, événements système, RPC cible (service_role).

-- ── system_events (Edge Function + futur dashboard ; pas d’accès client par défaut)
CREATE TABLE IF NOT EXISTS public.system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  fleet_id uuid REFERENCES public.flottes (id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_events_fleet_created
  ON public.system_events (fleet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_events_type_created
  ON public.system_events (event_type, created_at DESC);

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.system_events IS
  'Événements système (Edge Functions, cron). Accès effectif : service_role ; pas de politique RLS pour le JWT.';

-- ── onboarding_sequence_log (idempotence par étape / flotte / utilisateur)
CREATE TABLE IF NOT EXISTS public.onboarding_sequence_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  fleet_id uuid NOT NULL REFERENCES public.flottes (id) ON DELETE CASCADE,
  step_day smallint NOT NULL,
  channel text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  CONSTRAINT onboarding_sequence_log_step_day_check CHECK (step_day >= 1 AND step_day <= 366),
  CONSTRAINT onboarding_sequence_log_user_fleet_step_unique UNIQUE (user_id, fleet_id, step_day)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_sequence_log_sent
  ON public.onboarding_sequence_log (sent_at DESC);

ALTER TABLE public.onboarding_sequence_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.onboarding_sequence_log IS
  'Journal des étapes séquence onboarding envoyées (anti-doublon). Service role uniquement côté accès effectif.';

-- ── RPC : chauffeurs inactifs (aucun créneau), jours 1/3/7/14, hors étapes déjà journalisées
CREATE OR REPLACE FUNCTION public.get_inactive_drivers_with_manager()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  phone text,
  push_tokens text[],
  fleet_id uuid,
  fleet_name text,
  org_name text,
  manager_name text,
  manager_phone text,
  days_since_join integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      fa.user_id,
      fa.fleet_id,
      fa.created_at AS joined_at,
      GREATEST(
        0,
        FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - fa.created_at)) / 86400.0)::integer
      ) AS days_since_join
    FROM public.flotte_adhesions fa
    WHERE fa.is_active = true
      AND fa.role = 'driver'::public.role_type
      AND NOT EXISTS (
        SELECT 1
        FROM public.creneaux_conducteurs cc
        INNER JOIN public.affectations_vehicules av ON av.id = cc.assignment_id
        WHERE av.driver_user_id = fa.user_id
      )
  ),
  eligible AS (
    SELECT b.*
    FROM base b
    WHERE b.days_since_join IN (1, 3, 7, 14)
      AND NOT EXISTS (
        SELECT 1
        FROM public.onboarding_sequence_log osl
        WHERE osl.user_id = b.user_id
          AND osl.fleet_id = b.fleet_id
          AND osl.step_day = b.days_since_join
      )
  )
  SELECT
    e.user_id,
    p.full_name,
    p.phone,
    COALESCE(tok.push_tokens, ARRAY[]::text[]) AS push_tokens,
    e.fleet_id,
    f.name AS fleet_name,
    o.name AS org_name,
    mgr.full_name AS manager_name,
    mgr.phone AS manager_phone,
    e.days_since_join
  FROM eligible e
  INNER JOIN public.flottes f ON f.id = e.fleet_id
  INNER JOIN public.organisations o ON o.id = f.org_id
  LEFT JOIN public.profils p ON p.user_id = e.user_id
  LEFT JOIN LATERAL (
    SELECT array_agg(nt.token ORDER BY nt.updated_at DESC NULLS LAST, nt.created_at DESC) AS push_tokens
    FROM public.notification_tokens nt
    WHERE nt.user_id = e.user_id
  ) tok ON true
  LEFT JOIN LATERAL (
    SELECT mp.full_name, mp.phone
    FROM public.flotte_adhesions fa_m
    INNER JOIN public.profils mp ON mp.user_id = fa_m.user_id
    WHERE fa_m.fleet_id = e.fleet_id
      AND fa_m.is_active = true
      AND fa_m.role = ANY (ARRAY['organizer'::public.role_type, 'manager'::public.role_type])
    ORDER BY
      CASE fa_m.role
        WHEN 'organizer'::public.role_type THEN 0
        WHEN 'manager'::public.role_type THEN 1
        ELSE 2
      END,
      fa_m.created_at ASC
    LIMIT 1
  ) mgr ON true;
$$;

COMMENT ON FUNCTION public.get_inactive_drivers_with_manager() IS
  'Conducteurs sans aucun créneau, adhésion à jours 1/3/7/14 (UTC, floor), étape pas encore journalisée. '
  'Manager = premier organizer actif de la flotte, sinon premier manager, sinon plus ancienne adhésion parmi ces rôles. '
  'Réservé au service_role (Edge Function).';

REVOKE ALL ON FUNCTION public.get_inactive_drivers_with_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_inactive_drivers_with_manager() TO service_role;
