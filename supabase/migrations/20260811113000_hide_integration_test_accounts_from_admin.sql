-- Hide transient integration-test auth users from the admin account inventory.
-- These users are technical fixtures and should not appear as customer/admin
-- accounts, even for super admins.

begin;

drop function if exists public.admin_list_all_accounts();

create or replace function public.admin_list_all_accounts()
returns table (
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
language plpgsql
security definer
stable
set search_path = public, auth, pg_temp
as $$
declare
  v_is_admin boolean := false;
  v_is_super_admin boolean := false;
begin
  select coalesce(public.is_platform_admin(), false)
  into v_is_admin;

  if not v_is_admin then
    raise exception 'forbidden_not_platform_admin'
      using errcode = '42501';
  end if;

  select coalesce(public.is_platform_super_admin(), false)
  into v_is_super_admin;

  return query
  with ranked_access as (
    select
      access.user_id,
      access.fleet_id,
      access.role::text as access_role,
      access.is_active as access_is_active,
      row_number() over (
        partition by access.user_id
        order by
          access.is_active desc,
          case access.role::text
            when 'organizer' then 1
            when 'manager' then 2
            when 'mechanic' then 3
            when 'driver' then 4
            else 5
          end,
          access.fleet_id
      ) as access_rank
    from public.v_access_matrix access
  ),
  selected_access as (
    select
      ranked.user_id,
      ranked.fleet_id,
      ranked.access_role,
      ranked.access_is_active
    from ranked_access ranked
    where ranked.access_rank = 1
  ),
  latest_subscription as (
    select
      subscription.fleet_id,
      max(subscription.ends_at) as expires_at
    from public.abonnements subscription
    where subscription.ends_at is not null
    group by subscription.fleet_id
  ),
  admin_accounts as (
    select
      profile.user_id,
      profile.internal_role::text as internal_role,
      profile.is_active as admin_is_active
    from public.admin_profiles profile
  ),
  accounts as (
    select
      auth_user.id as account_user_id,
      coalesce(auth_user.email, '')::text as account_email,

      nullif(
        btrim(
          coalesce(
            auth_user.raw_user_meta_data ->> 'full_name',
            auth_user.raw_user_meta_data ->> 'name',
            ''
          )
        ),
        ''
      )::text as account_full_name,

      coalesce(
        nullif(
          auth_user.raw_user_meta_data ->> 'account_type',
          ''
        ),
        nullif(demo_profile.account_type, ''),
        case
          when coalesce(
            auth_user.raw_user_meta_data
              ->> 'created_by_fleet_member_account',
            'false'
          ) = 'true'
            then 'fleet_member'
          when admin_account.user_id is not null
            then 'admin'
          else 'user'
        end
      )::text as account_type_value,

      coalesce(
        selected.access_role,
        demo_profile.demo_role::text,
        admin_account.internal_role
      )::text as account_role,

      coalesce(
        demo_profile.fleet_id,
        selected.fleet_id
      ) as account_fleet_id,

      coalesce(
        selected.access_is_active,
        demo_profile.is_active,
        admin_account.admin_is_active,
        true
      ) as account_is_active,

      auth_user.created_at as account_created_at,
      demo_profile.expires_at as demo_expires_at,

      case
        when coalesce(
          auth_user.raw_app_meta_data
            ->> 'must_set_password',
          'false'
        ) = 'true'
          then true
        else false
      end as account_must_set_password,

      (
        admin_account.user_id is not null
        and coalesce(
          admin_account.admin_is_active,
          false
        )
      ) as account_is_platform_admin,

      (
        admin_account.internal_role = 'super_admin'
        and coalesce(
          admin_account.admin_is_active,
          false
        )
      ) as account_is_super_admin

    from auth.users auth_user

    left join public.demo_profiles demo_profile
      on demo_profile.user_id = auth_user.id

    left join selected_access selected
      on selected.user_id = auth_user.id

    left join admin_accounts admin_account
      on admin_account.user_id = auth_user.id

    where not (
      lower(coalesce(auth_user.email, '')) like 'integration-%@esamba.test'
      or lower(coalesce(auth_user.email, '')) = 'integration.tests@esamba.test'
      or auth_user.raw_user_meta_data ? 'test_run_id'
    )
  ),
  accounts_with_expiration as (
    select
      account.account_user_id,
      account.account_email,
      account.account_full_name,
      account.account_type_value,
      account.account_role,
      account.account_fleet_id,
      account.account_is_active,
      account.account_created_at,

      coalesce(
        account.demo_expires_at,
        subscription.expires_at
      ) as account_expires_at,

      case
        when account.demo_expires_at is not null
          then 'demo'
        when subscription.expires_at is not null
          then 'subscription'
        else null
      end::text as account_expiration_source,

      account.account_must_set_password,
      account.account_is_platform_admin,
      account.account_is_super_admin

    from accounts account

    left join latest_subscription subscription
      on subscription.fleet_id =
        account.account_fleet_id
  )
  select
    account.account_user_id as user_id,
    account.account_email as email,
    account.account_full_name as full_name,
    account.account_type_value as account_type,
    account.account_role as role,
    account.account_fleet_id as fleet_id,

    null::text as fleet_name,

    account.account_is_active as is_active,
    account.account_created_at as created_at,
    account.account_expires_at as expires_at,
    account.account_expiration_source
      as expiration_source,
    account.account_must_set_password
      as must_set_password,
    account.account_is_platform_admin
      as is_platform_admin,
    account.account_is_super_admin
      as is_super_admin

  from accounts_with_expiration account

  where
    v_is_super_admin
    or account.account_expires_at is not null

  order by
    account.account_expires_at asc nulls last,
    lower(account.account_email) asc;
end;
$$;

revoke all
on function public.admin_list_all_accounts()
from public;

revoke all
on function public.admin_list_all_accounts()
from anon;

grant execute
on function public.admin_list_all_accounts()
to authenticated;

comment on function public.admin_list_all_accounts() is
  'Liste les comptes accessibles aux administrateurs en excluant les fixtures techniques des tests d integration.';

notify pgrst, 'reload schema';

commit;
