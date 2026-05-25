-- ─────────────────────────────────────────────────────────────────────────────
-- Migration : RPCs RBAC côté client
--
-- Fournit deux fonctions sécurisées appelables depuis le frontend :
--   1. get_current_user_role(p_org_id)        → rôle de l'utilisateur dans une org
--   2. get_current_user_permissions(p_org_id) → liste des permissions effectives
--
-- Sécurité :
--   - SECURITY DEFINER + search_path forcé → pas d'injection SQL
--   - Retourne NULL si l'utilisateur n'a pas de membership actif
--   - Le frontend ne voit jamais service_role
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. get_current_user_role ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_current_user_role(p_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- Vérifier d'abord si l'utilisateur est admin plateforme
  IF EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid() AND is_active = true
  ) THEN
    RETURN 'admin';
  END IF;

  -- Chercher le rôle dans flotte_adhesions via la flotte de l'organisation
  SELECT fa.role INTO v_role
  FROM public.flotte_adhesions fa
  JOIN public.flottes f ON f.id = fa.fleet_id
  WHERE fa.user_id   = auth.uid()
    AND f.org_id     = p_org_id
    AND fa.is_active = true
  ORDER BY
    -- Si plusieurs flottes dans l'org, prendre le rôle le plus élevé
    CASE fa.role
      WHEN 'organizer' THEN 1
      WHEN 'manager'   THEN 2
      WHEN 'mechanic'  THEN 3
      WHEN 'driver'    THEN 4
      ELSE 5
    END
  LIMIT 1;

  RETURN v_role; -- NULL si aucun membership actif
END;
$$;

COMMENT ON FUNCTION public.get_current_user_role(uuid) IS
  'Retourne le rôle effectif de l''utilisateur courant dans une organisation. '
  'Retourne ''admin'' si admin plateforme, NULL si aucun membership actif.';

-- ─── 2. get_current_user_permissions ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_current_user_permissions(p_org_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_permissions text[];
BEGIN
  v_role := public.get_current_user_role(p_org_id);

  IF v_role IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  -- Matrice de permissions par rôle (miroir de src/lib/rbac/permissions.ts)
  CASE v_role
    WHEN 'admin' THEN
      v_permissions := ARRAY[
        'fleet.view','fleet.create','fleet.update','fleet.delete',
        'vehicle.view','vehicle.create','vehicle.update','vehicle.delete','vehicle.assign_driver',
        'member.view','member.invite','member.remove','member.update_role',
        'maintenance.view','maintenance.create','maintenance.update','maintenance.delete',
        'assignment.view_own','assignment.view_all','assignment.manage',
        'report.view','report.export',
        'billing.view','billing.manage',
        'dvir.submit','dvir.view_all',
        'org.settings','org.manage',
        'admin.access','admin.manage_users','admin.manage_all_fleets'
      ];

    WHEN 'organizer' THEN
      v_permissions := ARRAY[
        'fleet.view','fleet.create','fleet.update','fleet.delete',
        'vehicle.view','vehicle.create','vehicle.update','vehicle.delete','vehicle.assign_driver',
        'member.view','member.invite','member.remove','member.update_role',
        'maintenance.view','maintenance.create','maintenance.update','maintenance.delete',
        'assignment.view_own','assignment.view_all','assignment.manage',
        'report.view','report.export',
        'billing.view','billing.manage',
        'dvir.submit','dvir.view_all',
        'org.settings','org.manage'
      ];

    WHEN 'manager' THEN
      v_permissions := ARRAY[
        'fleet.view','fleet.update',
        'vehicle.view','vehicle.create','vehicle.update','vehicle.assign_driver',
        'member.view','member.invite',
        'maintenance.view','maintenance.create','maintenance.update',
        'assignment.view_own','assignment.view_all','assignment.manage',
        'report.view',
        'dvir.submit','dvir.view_all',
        'org.settings'
      ];

    WHEN 'mechanic' THEN
      v_permissions := ARRAY[
        'fleet.view',
        'vehicle.view','vehicle.update',
        'member.view',
        'maintenance.view','maintenance.create','maintenance.update',
        'assignment.view_own',
        'report.view',
        'dvir.submit','dvir.view_all'
      ];

    WHEN 'driver' THEN
      v_permissions := ARRAY[
        'fleet.view',
        'vehicle.view',
        'member.view',
        'assignment.view_own',
        'report.view',
        'dvir.submit'
      ];

    ELSE
      v_permissions := ARRAY[]::text[];
  END CASE;

  RETURN v_permissions;
END;
$$;

COMMENT ON FUNCTION public.get_current_user_permissions(uuid) IS
  'Retourne la liste des permissions effectives de l''utilisateur courant dans une organisation. '
  'Miroir SQL de src/lib/rbac/permissions.ts — maintenir les deux en synchronisation.';

-- ─── Grants ──────────────────────────────────────────────────────────────────

-- Accessible aux utilisateurs authentifiés uniquement (pas au rôle anon)
REVOKE ALL ON FUNCTION public.get_current_user_role(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_current_user_permissions(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_current_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_permissions(uuid) TO authenticated;
