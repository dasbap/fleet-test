begin;

create table if not exists public.vehicle_gps_trackers (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null unique references public.vehicules(id) on delete cascade,
  fleet_id uuid not null references public.flottes(id) on delete cascade,
  device_identifier text not null unique,
  provider text,
  status text not null default 'active' check (status in ('active', 'inactive', 'maintenance')),
  installed_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_gps_trackers_device_identifier_format
    check (device_identifier ~ '^[A-Z0-9:_-]{6,64}$'),
  constraint vehicle_gps_trackers_provider_length
    check (provider is null or char_length(provider) <= 80)
);

create index if not exists vehicle_gps_trackers_fleet_id_idx
  on public.vehicle_gps_trackers(fleet_id);

alter table public.vehicle_gps_trackers enable row level security;
revoke all on table public.vehicle_gps_trackers from public, anon, authenticated;
grant select, insert, update, delete on table public.vehicle_gps_trackers to service_role;

create or replace function public.get_vehicle_gps_tracker(p_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fleet_id uuid;
  v_tracker public.vehicle_gps_trackers%rowtype;
begin
  if auth.uid() is null then
    raise exception 'non_authentifie';
  end if;

  select v.fleet_id into v_fleet_id
  from public.vehicules v
  where v.id = p_vehicle_id;

  if v_fleet_id is null then
    raise exception 'vehicle_not_found';
  end if;

  if not public.is_platform_super_admin()
     and not exists (
       select 1
       from public.flotte_adhesions fa
       where fa.fleet_id = v_fleet_id
         and fa.user_id = auth.uid()
         and fa.is_active = true
     ) then
    raise exception 'gps_tracker_access_denied';
  end if;

  select * into v_tracker
  from public.vehicle_gps_trackers t
  where t.vehicle_id = p_vehicle_id;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_tracker.id,
    'vehicle_id', v_tracker.vehicle_id,
    'fleet_id', v_tracker.fleet_id,
    'device_identifier', v_tracker.device_identifier,
    'provider', v_tracker.provider,
    'status', v_tracker.status,
    'installed_at', v_tracker.installed_at,
    'updated_at', v_tracker.updated_at
  );
end;
$$;

create or replace function public.upsert_vehicle_gps_tracker(
  p_vehicle_id uuid,
  p_device_identifier text,
  p_provider text default null,
  p_status text default 'active'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fleet_id uuid;
  v_device_identifier text;
  v_provider text;
  v_tracker public.vehicle_gps_trackers%rowtype;
begin
  if auth.uid() is null then
    raise exception 'non_authentifie';
  end if;

  select v.fleet_id into v_fleet_id
  from public.vehicules v
  where v.id = p_vehicle_id;

  if v_fleet_id is null then
    raise exception 'vehicle_not_found';
  end if;

  if not public.is_platform_super_admin()
     and not exists (
       select 1
       from public.flotte_adhesions fa
       where fa.fleet_id = v_fleet_id
         and fa.user_id = auth.uid()
         and fa.is_active = true
         and fa.role::text = 'organizer'
     ) then
    raise exception 'gps_tracker_organizer_required';
  end if;

  v_device_identifier := upper(regexp_replace(trim(coalesce(p_device_identifier, '')), '[[:space:]]+', '', 'g'));
  v_provider := nullif(trim(coalesce(p_provider, '')), '');

  if v_device_identifier !~ '^[A-Z0-9:_-]{6,64}$' then
    raise exception 'gps_tracker_identifier_invalid';
  end if;

  if p_status not in ('active', 'inactive', 'maintenance') then
    raise exception 'gps_tracker_status_invalid';
  end if;

  if v_provider is not null and char_length(v_provider) > 80 then
    raise exception 'gps_tracker_provider_too_long';
  end if;

  if exists (
    select 1
    from public.vehicle_gps_trackers t
    where t.device_identifier = v_device_identifier
      and t.vehicle_id <> p_vehicle_id
  ) then
    raise exception 'gps_tracker_already_assigned';
  end if;

  insert into public.vehicle_gps_trackers (
    vehicle_id,
    fleet_id,
    device_identifier,
    provider,
    status,
    installed_at,
    created_by,
    updated_by,
    updated_at
  ) values (
    p_vehicle_id,
    v_fleet_id,
    v_device_identifier,
    v_provider,
    p_status,
    now(),
    auth.uid(),
    auth.uid(),
    now()
  )
  on conflict (vehicle_id) do update
  set fleet_id = excluded.fleet_id,
      device_identifier = excluded.device_identifier,
      provider = excluded.provider,
      status = excluded.status,
      updated_by = auth.uid(),
      updated_at = now()
  returning * into v_tracker;

  return jsonb_build_object(
    'ok', true,
    'id', v_tracker.id,
    'vehicle_id', v_tracker.vehicle_id,
    'fleet_id', v_tracker.fleet_id,
    'device_identifier', v_tracker.device_identifier,
    'provider', v_tracker.provider,
    'status', v_tracker.status,
    'installed_at', v_tracker.installed_at,
    'updated_at', v_tracker.updated_at
  );
end;
$$;

create or replace function public.remove_vehicle_gps_tracker(p_vehicle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fleet_id uuid;
  v_identifier text;
begin
  if auth.uid() is null then
    raise exception 'non_authentifie';
  end if;

  select v.fleet_id into v_fleet_id
  from public.vehicules v
  where v.id = p_vehicle_id;

  if v_fleet_id is null then
    raise exception 'vehicle_not_found';
  end if;

  if not public.is_platform_super_admin()
     and not exists (
       select 1
       from public.flotte_adhesions fa
       where fa.fleet_id = v_fleet_id
         and fa.user_id = auth.uid()
         and fa.is_active = true
         and fa.role::text = 'organizer'
     ) then
    raise exception 'gps_tracker_organizer_required';
  end if;

  delete from public.vehicle_gps_trackers t
  where t.vehicle_id = p_vehicle_id
  returning t.device_identifier into v_identifier;

  if v_identifier is null then
    return jsonb_build_object('ok', true, 'removed', false);
  end if;

  return jsonb_build_object(
    'ok', true,
    'removed', true,
    'device_identifier', v_identifier
  );
end;
$$;

revoke all on function public.get_vehicle_gps_tracker(uuid) from public, anon;
revoke all on function public.upsert_vehicle_gps_tracker(uuid, text, text, text) from public, anon;
revoke all on function public.remove_vehicle_gps_tracker(uuid) from public, anon;

grant execute on function public.get_vehicle_gps_tracker(uuid) to authenticated;
grant execute on function public.upsert_vehicle_gps_tracker(uuid, text, text, text) to authenticated;
grant execute on function public.remove_vehicle_gps_tracker(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
