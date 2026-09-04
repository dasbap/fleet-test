
begin;

create or replace function public.prevent_last_active_organizer_loss()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_removes_organizer boolean;
  v_demo_lifecycle_bypass boolean := false;
begin
  if old.role is distinct from 'organizer'::public.role_type or old.is_active is distinct from true then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  v_removes_organizer := tg_op = 'DELETE';
  if tg_op = 'UPDATE' then
    v_removes_organizer :=
      new.fleet_id is distinct from old.fleet_id
      or new.role is distinct from 'organizer'::public.role_type
      or new.is_active is distinct from true;
  end if;

  if not v_removes_organizer then
    return new;
  end if;

  if current_setting('app.demo_lifecycle_bypass', true) = 'on'
     and public.is_platform_admin()
     and exists (
       select 1
       from public.demo_profiles dp
       where dp.user_id = old.user_id
     ) then
    v_demo_lifecycle_bypass := true;
  end if;

  if v_demo_lifecycle_bypass then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' and not exists (
    select 1 from public.flottes f where f.id = old.fleet_id
  ) then
    return old;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(old.fleet_id::text, 0));

  if not exists (
    select 1
    from public.flotte_adhesions fa
    where fa.fleet_id = old.fleet_id
      and fa.id is distinct from old.id
      and fa.role = 'organizer'::public.role_type
      and fa.is_active = true
  ) then
    raise exception 'last_active_organizer_required';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.prevent_last_active_organizer_loss() from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
