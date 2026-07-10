-- Restore the team members RPC expected by /teams and the roles hub.
-- Some baseline/prod environments can have RBAC tables and policies but miss
-- this PostgREST RPC from the 20260523 team migrations.

DROP FUNCTION IF EXISTS public.get_fleet_members(uuid);

CREATE OR REPLACE FUNCTION public.get_fleet_members(p_fleet_id uuid)
RETURNS TABLE (
  id          uuid,
  user_id     uuid,
  fleet_id    uuid,
  role        public.role_type,
  is_active   boolean,
  created_at  timestamptz,
  full_name   text,
  phone       text
)
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

  v_check := public.rbac_check_permission('member.view', p_fleet_id);
  IF NOT COALESCE((v_check->>'allowed')::boolean, false) THEN
    RAISE EXCEPTION 'Permission refusee : member.view requis.';
  END IF;

  RETURN QUERY
  SELECT
    fa.id,
    fa.user_id,
    fa.fleet_id,
    fa.role,
    fa.is_active,
    fa.created_at,
    p.full_name,
    p.phone
  FROM public.flotte_adhesions fa
  LEFT JOIN public.profils p ON p.user_id = fa.user_id
  WHERE fa.fleet_id = p_fleet_id
  ORDER BY fa.created_at ASC;
END;
$$;

COMMENT ON FUNCTION public.get_fleet_members(uuid) IS
  'Lists fleet members with profile fields after member.view RBAC check.';

GRANT EXECUTE ON FUNCTION public.get_fleet_members(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_fleet_members(uuid) FROM anon;

NOTIFY pgrst, 'reload schema';
