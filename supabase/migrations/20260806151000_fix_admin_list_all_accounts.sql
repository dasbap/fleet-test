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
  v_is_admin boolean := false;
  v_is_super_admin boolean := false;
BEGIN
  SELECT COALESCE(public.is_platform_admin(), false)
  INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden_not_platform_admin'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(public.is_platform_super_admin(), false)
  INTO v_is_super_admin;

  RETURN QUERY
  WITH ranked_access AS (
    SELECT
      access.user_id,
      access.fleet_id,
      access.role::text AS access_role,
      access.is_active AS access_is_active,
      row_number() OVER (
        PARTITION BY access.user_id
        ORDER BY
          access.is_active DESC,
          CASE access.role::text
            WHEN 'organizer' THEN 1
            WHEN 'manager' THEN 2
            WHEN 'mechanic' THEN 3
            WHEN 'driver' THEN 4
            ELSE 5
          END,
          access.fleet_id
      ) AS access_rank
    FROM public.v_access_matrix access
  ),
  selected_access AS (
    SELECT
      ranked.user_id,
      ranked.fleet_id,
      ranked.access_role,
      ranked.access_is_active
    FROM ranked_access ranked
    WHERE ranked.access_rank = 1
  ),
  latest_subscription AS (
    SELECT
      subscription.fleet_id,
      max(subscription.ends_at) AS expires_at
    FROM public.abonnements subscription
    WHERE subscription.ends_at IS NOT NULL
    GROUP BY subscription.fleet_id
  ),
  admin_accounts AS (
    SELECT
      profile.user_id,
      profile.internal_role::text AS internal_role,
      profile.is_active AS admin_is_active
    FROM public.admin_profiles profile
  ),
  accounts AS (
    SELECT
      auth_user.id AS account_user_id,
      COALESCE(auth_user.email, '')::text AS account_email,

      NULLIF(
        btrim(
          COALESCE(
            auth_user.raw_user_meta_data ->> 'full_name',
            auth_user.raw_user_meta_data ->> 'name',
            ''
          )
        ),
        ''
      )::text AS account_full_name,

      COALESCE(
        NULLIF(
          auth_user.raw_user_meta_data ->> 'account_type',
          ''
        ),
        NULLIF(demo_profile.account_type, ''),
        CASE
          WHEN COALESCE(
            auth_user.raw_user_meta_data
              ->> 'created_by_fleet_member_account',
            'false'
          ) = 'true'
            THEN 'fleet_member'
          WHEN admin_account.user_id IS NOT NULL
            THEN 'admin'
          ELSE 'user'
        END
      )::text AS account_type_value,

      COALESCE(
        selected.access_role,
        demo_profile.demo_role::text,
        admin_account.internal_role
      )::text AS account_role,

      COALESCE(
        demo_profile.fleet_id,
        selected.fleet_id
      ) AS account_fleet_id,

      COALESCE(
        selected.access_is_active,
        demo_profile.is_active,
        admin_account.admin_is_active,
        true
      ) AS account_is_active,

      auth_user.created_at AS account_created_at,

      demo_profile.expires_at AS demo_expires_at,

      CASE
        WHEN COALESCE(
          auth_user.raw_app_meta_data
            ->> 'must_set_password',
          'false'
        ) = 'true'
          THEN true
        ELSE false
      END AS account_must_set_password,

      (
        admin_account.user_id IS NOT NULL
        AND COALESCE(
          admin_account.admin_is_active,
          false
        )
      ) AS account_is_platform_admin,

      (
        admin_account.internal_role = 'super_admin'
        AND COALESCE(
          admin_account.admin_is_active,
          false
        )
      ) AS account_is_super_admin

    FROM auth.users auth_user

    LEFT JOIN public.demo_profiles demo_profile
      ON demo_profile.user_id = auth_user.id

    LEFT JOIN selected_access selected
      ON selected.user_id = auth_user.id

    LEFT JOIN admin_accounts admin_account
      ON admin_account.user_id = auth_user.id
  ),
  accounts_with_expiration AS (
    SELECT
      account.account_user_id,
      account.account_email,
      account.account_full_name,
      account.account_type_value,
      account.account_role,
      account.account_fleet_id,
      account.account_is_active,
      account.account_created_at,

      COALESCE(
        account.demo_expires_at,
        subscription.expires_at
      ) AS account_expires_at,

      CASE
        WHEN account.demo_expires_at IS NOT NULL
          THEN 'demo'
        WHEN subscription.expires_at IS NOT NULL
          THEN 'subscription'
        ELSE NULL
      END::text AS account_expiration_source,

      account.account_must_set_password,
      account.account_is_platform_admin,
      account.account_is_super_admin

    FROM accounts account

    LEFT JOIN latest_subscription subscription
      ON subscription.fleet_id =
        account.account_fleet_id
  )
  SELECT
    account.account_user_id AS user_id,
    account.account_email AS email,
    account.account_full_name AS full_name,
    account.account_type_value AS account_type,
    account.account_role AS role,
    account.account_fleet_id AS fleet_id,

    NULL::text AS fleet_name,

    account.account_is_active AS is_active,
    account.account_created_at AS created_at,
    account.account_expires_at AS expires_at,
    account.account_expiration_source
      AS expiration_source,
    account.account_must_set_password
      AS must_set_password,
    account.account_is_platform_admin
      AS is_platform_admin,
    account.account_is_super_admin
      AS is_super_admin

  FROM accounts_with_expiration account

  WHERE
    v_is_super_admin
    OR account.account_expires_at IS NOT NULL

  ORDER BY
    account.account_expires_at ASC NULLS LAST,
    lower(account.account_email) ASC;
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
  'Liste les comptes accessibles aux administrateurs. Les comptes sans expiration sont visibles uniquement par les super admins.';

COMMIT;