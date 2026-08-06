BEGIN;

DROP FUNCTION IF EXISTS public.admin_list_all_accounts();

CREATE OR REPLACE FUNCTION public.admin_list_all_accounts()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  account_type text,
  role text,
  fleet_id uuid,
  fleet_name text,
  is_active boolean,
  created_at timestamptz,
  expires_at timestamptz,
  expiration_source text,
  must_set_password boolean,
  is_platform_admin boolean,
  is_super_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_is_admin boolean;
  v_is_super_admin boolean;
BEGIN
  SELECT public.is_platform_admin()
  INTO v_is_admin;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'forbidden_not_platform_admin'
      USING ERRCODE = '42501';
  END IF;

  SELECT public.is_platform_super_admin()
  INTO v_is_super_admin;

  RETURN QUERY
  WITH ranked_memberships AS (
    SELECT
      fa.user_id,
      fa.fleet_id,
      fa.role::text AS membership_role,
      fa.is_active AS membership_active,
      row_number() OVER (
        PARTITION BY fa.user_id
        ORDER BY
          fa.is_active DESC,
          CASE fa.role::text
            WHEN 'organizer' THEN 1
            WHEN 'manager' THEN 2
            WHEN 'mechanic' THEN 3
            WHEN 'driver' THEN 4
            ELSE 5
          END,
          fa.fleet_id
      ) AS membership_rank
    FROM public.flotte_adhesions fa
  ),
  selected_memberships AS (
    SELECT
      rm.user_id,
      rm.fleet_id,
      rm.membership_role,
      rm.membership_active
    FROM ranked_memberships rm
    WHERE rm.membership_rank = 1
  ),
  admin_accounts AS (
    SELECT
      ap.user_id,
      ap.internal_role::text AS internal_role,
      ap.is_active AS admin_active
    FROM public.admin_profiles ap
  ),
  base_accounts AS (
    SELECT
      au.id AS user_id,
      COALESCE(au.email, '')::text AS email,
      NULLIF(
        btrim(
          COALESCE(
            au.raw_user_meta_data ->> 'full_name',
            au.raw_user_meta_data ->> 'name',
            ''
          )
        ),
        ''
      ) AS full_name,
      COALESCE(
        NULLIF(au.raw_user_meta_data ->> 'account_type', ''),
        NULLIF(dp.account_type, ''),
        CASE
          WHEN COALESCE(
            (au.raw_user_meta_data ->> 'created_by_fleet_member_account')::boolean,
            false
          ) THEN 'fleet_member'
          WHEN aa.user_id IS NOT NULL THEN 'admin'
          ELSE 'user'
        END
      )::text AS account_type,
      COALESCE(
        sm.membership_role,
        dp.demo_role::text,
        aa.internal_role
      )::text AS role,
      COALESCE(dp.fleet_id, sm.fleet_id) AS fleet_id,
      COALESCE(
        sm.membership_active,
        dp.is_active,
        aa.admin_active,
        true
      ) AS is_active,
      au.created_at,
      dp.expires_at AS demo_expires_at,
      COALESCE(
        (au.raw_app_meta_data ->> 'must_set_password')::boolean,
        false
      ) AS must_set_password,
      aa.user_id IS NOT NULL
        AND COALESCE(aa.admin_active, false) AS is_platform_admin,
      aa.internal_role = 'super_admin'
        AND COALESCE(aa.admin_active, false) AS is_super_admin
    FROM auth.users au
    LEFT JOIN public.demo_profiles dp
      ON dp.user_id = au.id
    LEFT JOIN selected_memberships sm
      ON sm.user_id = au.id
    LEFT JOIN admin_accounts aa
      ON aa.user_id = au.id
  ),
  accounts_with_expiration AS (
    SELECT
      ba.user_id,
      ba.email,
      ba.full_name,
      ba.account_type,
      ba.role,
      ba.fleet_id,
      f.name::text AS fleet_name,
      ba.is_active,
      ba.created_at,
      COALESCE(
        ba.demo_expires_at,
        subscription_expiration.expires_at
      ) AS expires_at,
      CASE
        WHEN ba.demo_expires_at IS NOT NULL THEN 'demo'
        WHEN subscription_expiration.expires_at IS NOT NULL THEN 'subscription'
        ELSE NULL
      END::text AS expiration_source,
      ba.must_set_password,
      ba.is_platform_admin,
      ba.is_super_admin
    FROM base_accounts ba
    LEFT JOIN public.flottes f
      ON f.id = ba.fleet_id
    LEFT JOIN LATERAL (
      SELECT
        max(
          GREATEST(
            a.ends_at,
            a.trial_ends_at,
            a.grace_until
          )
        ) AS expires_at
      FROM public.abonnements a
      WHERE a.fleet_id = ba.fleet_id
    ) subscription_expiration
      ON true
  )
  SELECT
    awe.user_id,
    awe.email,
    awe.full_name,
    awe.account_type,
    awe.role,
    awe.fleet_id,
    awe.fleet_name,
    awe.is_active,
    awe.created_at,
    awe.expires_at,
    awe.expiration_source,
    awe.must_set_password,
    awe.is_platform_admin,
    awe.is_super_admin
  FROM accounts_with_expiration awe
  WHERE
    COALESCE(v_is_super_admin, false)
    OR awe.expires_at IS NOT NULL
  ORDER BY
    awe.expires_at ASC NULLS LAST,
    lower(awe.email) ASC;
END;
$$;

REVOKE ALL
ON FUNCTION public.admin_list_all_accounts()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.admin_list_all_accounts()
FROM anon;

GRANT EXECUTE
ON FUNCTION public.admin_list_all_accounts()
TO authenticated;

COMMENT ON FUNCTION public.admin_list_all_accounts() IS
  'Liste tous les comptes pour les admins plateforme. Les comptes sans expiration sont réservés aux super admins.';

COMMIT;