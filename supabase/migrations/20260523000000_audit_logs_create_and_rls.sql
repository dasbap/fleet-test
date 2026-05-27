-- RLS audit_logs + RPC lecture fleet-scoped pour le hub rôles.

-- ── Helper d'écriture (triggers SECURITY DEFINER) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action     text,
  p_target_id  uuid DEFAULT NULL,
  p_fleet_id   uuid DEFAULT NULL,
  p_metadata   jsonb DEFAULT '{}'::jsonb,
  p_actor_id   uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    target_id,
    fleet_id,
    metadata,
    created_at
  )
  VALUES (
    COALESCE(p_actor_id, auth.uid()),
    p_action,
    p_target_id,
    p_fleet_id,
    COALESCE(p_metadata, '{}'::jsonb),
    now()
  );
END;
$$;

COMMENT ON FUNCTION public.write_audit_log(text, uuid, uuid, jsonb, uuid) IS
  'Insère une entrée audit_logs en contournant la RLS (triggers / RPC).';

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_auth ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_select_fleet_managers ON public.audit_logs;

-- Lecture : admin plateforme ou organizer/manager de la flotte concernée
CREATE POLICY audit_logs_select_fleet_managers ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      fleet_id IS NOT NULL
      AND (
        public.has_role(fleet_id, 'organizer'::public.role_type)
        OR public.has_role(fleet_id, 'manager'::public.role_type)
      )
    )
  );

-- Pas de policy INSERT pour authenticated : écriture via write_audit_log / triggers uniquement

-- ── RPC lecture historique flotte ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_fleet_audit_logs(
  p_fleet_id uuid,
  p_limit    int  DEFAULT 50,
  p_actions  text[] DEFAULT NULL
)
RETURNS SETOF public.audit_logs
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_check jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Permission refusée : utilisateur non authentifié.';
  END IF;

  IF p_fleet_id IS NULL THEN
    RAISE EXCEPTION 'fleet_id requis.';
  END IF;

  v_check := public.rbac_check_permission('member.view', p_fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'Permission refusée : member.view requis.';
  END IF;

  RETURN QUERY
  SELECT al.*
  FROM public.audit_logs al
  WHERE al.fleet_id = p_fleet_id
    AND (p_actions IS NULL OR al.action = ANY(p_actions))
  ORDER BY al.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
END;
$$;

COMMENT ON FUNCTION public.get_fleet_audit_logs(uuid, int, text[]) IS
  'Retourne les audit_logs d''une flotte (member.view requis).';

GRANT EXECUTE ON FUNCTION public.get_fleet_audit_logs(uuid, int, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.write_audit_log(text, uuid, uuid, jsonb, uuid) TO authenticated;
