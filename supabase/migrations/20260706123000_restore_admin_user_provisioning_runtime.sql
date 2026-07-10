-- Runtime support for platform admins and admin-only user provisioning.

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  notes text
);

alter table public.admin_profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_profiles'
      and policyname = 'admin_profiles_no_client_select'
  ) then
    create policy admin_profiles_no_client_select
      on public.admin_profiles
      for select
      to authenticated
      using (false);
  end if;
end $$;

grant select, insert, update on public.admin_profiles to service_role;
revoke all on public.admin_profiles from anon;

create or replace function public.is_platform_admin()
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
  );
end;
$$;

grant execute on function public.is_platform_admin() to authenticated;
revoke execute on function public.is_platform_admin() from anon;

notify pgrst, 'reload schema';
