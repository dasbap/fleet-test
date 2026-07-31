-- RPC : cibles pour relance rétention « activation » (fenêtre Jmin–Jmax, ex. J2–J6).
-- Réservé au service role (Edge Function) : pas d’exposition au client JWT.

DROP FUNCTION IF EXISTS public.get_inactive_members_for_nudge(integer, integer);

CREATE OR REPLACE FUNCTION public.get_inactive_members_for_nudge(
  min_days integer,
  max_days integer
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  fleet_id uuid,
  role public.role_type,
  joined_at timestamptz,
  days_since_join integer,
  push_tokens text[]
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    e.user_id,
    p.full_name,
    e.fleet_id,
    e.role,
    e.joined_at,
    GREATEST(
      0,
      FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - e.joined_at)) / 86400.0)::integer
    ) AS days_since_join,
    COALESCE(tok.push_tokens, ARRAY[]::text[]) AS push_tokens
  FROM (
    SELECT
      fa.user_id,
      fa.fleet_id,
      fa.role,
      fa.created_at AS joined_at
    FROM public.flotte_adhesions fa
    WHERE fa.is_active = true
      AND min_days >= 1
      AND max_days >= min_days
      AND fa.created_at <= CURRENT_TIMESTAMP - (min_days::text || ' days')::interval
      AND fa.created_at >= CURRENT_TIMESTAMP - (max_days::text || ' days')::interval
      AND (
        fa.role <> 'driver'::public.role_type
        OR NOT EXISTS (
          SELECT 1
          FROM public.creneaux_conducteurs cc
          INNER JOIN public.affectations_vehicules av ON av.id = cc.assignment_id
          WHERE av.driver_user_id = fa.user_id
        )
      )
  ) e
  LEFT JOIN public.profils p ON p.user_id = e.user_id
  LEFT JOIN LATERAL (
    SELECT array_agg(nt.token ORDER BY nt.updated_at DESC NULLS LAST, nt.created_at DESC) AS push_tokens
    FROM public.notification_tokens nt
    WHERE nt.user_id = e.user_id
  ) tok ON true;
$$;

COMMENT ON FUNCTION public.get_inactive_members_for_nudge(integer, integer) IS
  'Membres actifs dont l''adhésion est dans [now-max_days, now-min_days] (ex. min=2, max=6). '
  'Conducteurs : aucun créneau (creneaux_conducteurs via affectations_vehicules). Autres rôles : même fenêtre sans filtre créneau. '
  'Jetons FCM agrégés depuis notification_tokens. Appel service_role uniquement.';

REVOKE ALL ON FUNCTION public.get_inactive_members_for_nudge(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_inactive_members_for_nudge(integer, integer) TO service_role;
