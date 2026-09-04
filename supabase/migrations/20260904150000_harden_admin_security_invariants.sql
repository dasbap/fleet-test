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
       join public.flottes f on f.id = old.fleet_id
       where dp.user_id = old.user_id
         and f.is_demo = true
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

create or replace function public.enforce_demo_profile_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if new.deactivated_at is not null
       and (
         tg_op = 'INSERT'
         or old.deactivated_at is distinct from new.deactivated_at
         or old.deactivated_by is distinct from new.deactivated_by
       ) then
      new.deactivated_by := auth.uid();
    elsif new.deactivated_at is null then
      new.deactivated_by := null;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_demo_profile_actor() from public, anon, authenticated;

drop trigger if exists trg_enforce_demo_profile_actor on public.demo_profiles;
create trigger trg_enforce_demo_profile_actor
before insert or update of deactivated_at, deactivated_by on public.demo_profiles
for each row execute function public.enforce_demo_profile_actor();

create or replace function public.enforce_demo_expiration_log_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.performed_by := auth.uid();
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_demo_expiration_log_actor() from public, anon, authenticated;

do $$
begin
  if to_regclass('public.demo_expiration_log') is not null then
    drop trigger if exists trg_enforce_demo_expiration_log_actor on public.demo_expiration_log;
    create trigger trg_enforce_demo_expiration_log_actor
    before insert or update of performed_by on public.demo_expiration_log
    for each row execute function public.enforce_demo_expiration_log_actor();
  end if;
end;
$$;

revoke execute on function public.deactivate_demo_account(uuid, uuid, text) from public, anon;
revoke execute on function public.reactivate_demo_account(uuid, uuid, integer) from public, anon;
revoke execute on function public.update_demo_account_expiration(uuid, uuid, timestamptz) from public, anon;
revoke execute on function public.delete_demo_account(uuid, uuid, text) from public, anon;
revoke execute on function public.admin_list_demo_sessions(boolean) from public, anon;

revoke execute on function public.admin_list_fleets_for_vehicle_creation() from public, anon;
revoke execute on function public.admin_create_vehicle(uuid, text, text, text, integer, integer) from public, anon;
revoke execute on function public.get_fleet_vehicle_country_code(uuid) from public, anon;
revoke execute on function public.admin_release_vehicle_registration(text) from public, anon;
revoke execute on function public.admin_list_fleet_vehicles(uuid) from public, anon;
revoke execute on function public.admin_list_registration_locks(uuid) from public, anon;
revoke execute on function public.admin_delete_vehicle(uuid) from public, anon;

revoke execute on function public.is_platform_super_admin() from public, anon;

grant execute on function public.deactivate_demo_account(uuid, uuid, text) to authenticated;
grant execute on function public.reactivate_demo_account(uuid, uuid, integer) to authenticated;
grant execute on function public.update_demo_account_expiration(uuid, uuid, timestamptz) to authenticated;
grant execute on function public.delete_demo_account(uuid, uuid, text) to authenticated;
grant execute on function public.admin_list_demo_sessions(boolean) to authenticated;
grant execute on function public.admin_list_fleets_for_vehicle_creation() to authenticated;
grant execute on function public.admin_create_vehicle(uuid, text, text, text, integer, integer) to authenticated;
grant execute on function public.get_fleet_vehicle_country_code(uuid) to authenticated;
grant execute on function public.admin_release_vehicle_registration(text) to authenticated;
grant execute on function public.admin_list_fleet_vehicles(uuid) to authenticated;
grant execute on function public.admin_list_registration_locks(uuid) to authenticated;
grant execute on function public.admin_delete_vehicle(uuid) to authenticated;
grant execute on function public.is_platform_super_admin() to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
