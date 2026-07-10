-- Restore fleet audit runtime objects expected by the roles hub.
-- No platform-admin bypass: access is scoped through active fleet roles.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email  text,
  action       text NOT NULL,
  target_id    uuid,
  target_email text,
  fleet_id     uuid REFERENCES public.flottes(id) ON DELETE SET NULL,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_fleet_created_idx
  ON public.audit_logs (fleet_id, created_at DESC)
  WHERE fleet_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS audit_logs_fleet_action_created_idx
  ON public.audit_logs (fleet_id, action, created_at DESC)
  WHERE fleet_id IS NOT NULL;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_auth ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_select_fleet_managers ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_select_fleet_roles ON public.audit_logs;

CREATE POLICY audit_logs_select_fleet_roles ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    fleet_id IS NOT NULL
    AND (
      public.has_role(fleet_id, 'organizer'::public.role_type)
      OR public.has_role(fleet_id, 'manager'::public.role_type)
    )
  );

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

DROP FUNCTION IF EXISTS public.get_fleet_audit_logs(uuid, int, text[]);
DROP FUNCTION IF EXISTS public.get_fleet_audit_logs(uuid, integer, text[]);

CREATE OR REPLACE FUNCTION public.get_fleet_audit_logs(
  p_fleet_id uuid,
  p_limit    integer DEFAULT 50,
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
    RAISE EXCEPTION 'Permission refusee : utilisateur non authentifie.';
  END IF;

  IF p_fleet_id IS NULL THEN
    RAISE EXCEPTION 'fleet_id requis.';
  END IF;

  v_check := public.rbac_check_permission('member.view', p_fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'Permission refusee : member.view requis.';
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

COMMENT ON TABLE public.audit_logs IS
  'Journal audit multi-tenant des actions sensibles par flotte.';

COMMENT ON FUNCTION public.write_audit_log(text, uuid, uuid, jsonb, uuid) IS
  'Insere une entree audit_logs via trigger/RPC avec contournement RLS controle.';

COMMENT ON FUNCTION public.get_fleet_audit_logs(uuid, integer, text[]) IS
  'Retourne les audit_logs d une flotte apres controle RBAC member.view.';

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.write_audit_log(text, uuid, uuid, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fleet_audit_logs(uuid, integer, text[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.write_audit_log(text, uuid, uuid, jsonb, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_fleet_audit_logs(uuid, integer, text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.write_audit_log(text, uuid, uuid, jsonb, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_fleet_audit_logs(uuid, integer, text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.write_audit_log(text, uuid, uuid, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fleet_audit_logs(uuid, integer, text[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
