-- Add a single global super admin. Only this account may create platform admins.

alter table public.admin_profiles
  add column if not exists internal_role text not null default 'admin';

alter table public.admin_profiles
  drop constraint if exists admin_profiles_internal_role_check;

alter table public.admin_profiles
  add constraint admin_profiles_internal_role_check
  check (internal_role in ('super_admin', 'admin', 'dev', 'commercial'));

create unique index if not exists ux_admin_profiles_single_active_super_admin
  on public.admin_profiles ((true))
  where is_active = true and internal_role = 'super_admin';

create or replace function public.is_platform_super_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  if to_regclass('public.demo_profiles') is not null then
    if exists (
      select 1
      from public.demo_profiles dp
      where dp.user_id = auth.uid()
        and coalesce(dp.is_active, true) = true
    ) then
      return false;
    end if;
  end if;

  return exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.is_active = true
      and ap.internal_role = 'super_admin'
  );
end;
$$;

comment on function public.is_platform_super_admin() is
  'Returns true only for the single active platform super admin.';

grant execute on function public.is_platform_super_admin() to authenticated;
revoke execute on function public.is_platform_super_admin() from anon;

notify pgrst, 'reload schema';
