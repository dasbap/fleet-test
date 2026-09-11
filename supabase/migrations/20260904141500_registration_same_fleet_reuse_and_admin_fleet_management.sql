
begin;

alter table public.vehicle_registration_registry
  add column if not exists released_at timestamptz,
  add column if not exists released_by uuid;

create or replace function public.validate_vehicle_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_country text;
  v_compact text;
  v_min integer;
  v_max integer;
  v_registered_vehicle_id uuid;
  v_registered_fleet_id uuid;
  v_released_at timestamptz;
begin
  new.registration := upper(regexp_replace(trim(new.registration), '[[:space:]]+', ' ', 'g'));

  if new.registration = '' then
    raise exception 'vehicle_registration_required';
  end if;

  if new.registration !~ '^[A-Z0-9 -]+$' then
    raise exception 'vehicle_registration_invalid_characters';
  end if;

  v_compact := public.normalize_vehicle_registration(new.registration);

  select upper(coalesce(o.country_code, 'CM'))
    into v_country
  from public.flottes f
  left join public.organisations o on o.id = f.org_id
  where f.id = new.fleet_id;

  if v_country is null then
    raise exception 'fleet_country_not_found';
  end if;

  case v_country
    when 'CM' then v_min := 6; v_max := 9;
    when 'CF' then v_min := 5; v_max := 10;
    when 'TD' then v_min := 5; v_max := 10;
    when 'CG' then v_min := 5; v_max := 10;
    when 'GA' then v_min := 5; v_max := 10;
    when 'GQ' then v_min := 5; v_max := 10;
    else v_min := 4; v_max := 12;
  end case;

  if length(v_compact) < v_min or length(v_compact) > v_max then
    raise exception 'vehicle_registration_invalid_length:%:%:%',
      v_country, v_min, v_max;
  end if;

  select first_vehicle_id, first_fleet_id, released_at
    into v_registered_vehicle_id, v_registered_fleet_id, v_released_at
  from public.vehicle_registration_registry
  where normalized_registration = v_compact
  for update;

  if not found then
    insert into public.vehicle_registration_registry (
      normalized_registration,
      first_vehicle_id,
      first_fleet_id,
      first_used_at,
      released_at,
      released_by
    )
    values (
      v_compact,
      new.id,
      new.fleet_id,
      now(),
      null,
      null
    );
    return new;
  end if;

  if v_registered_vehicle_id = new.id then
    return new;
  end if;

  if exists (
    select 1
    from public.vehicules v
    where public.normalize_vehicle_registration(v.registration) = v_compact
      and v.id is distinct from new.id
  ) then
    raise exception 'vehicle_registration_already_used';
  end if;

  if v_released_at is not null or v_registered_fleet_id = new.fleet_id then
    update public.vehicle_registration_registry
    set first_vehicle_id = new.id,
        first_fleet_id = new.fleet_id,
        released_at = null,
        released_by = null
    where normalized_registration = v_compact;

    return new;
  end if;

  raise exception 'vehicle_registration_locked_to_other_fleet';
end;
$$;

create or replace function public.admin_release_vehicle_registration(
  p_registration text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized text;
  v_row public.vehicle_registration_registry%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied: platform admin required';
  end if;

  v_normalized := public.normalize_vehicle_registration(p_registration);

  if coalesce(v_normalized, '') = '' then
    return jsonb_build_object('ok', false, 'error', 'registration_required');
  end if;

  select *
    into v_row
  from public.vehicle_registration_registry
  where normalized_registration = v_normalized
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'registration_lock_not_found');
  end if;

  update public.vehicle_registration_registry
  set released_at = now(),
      released_by = auth.uid()
  where normalized_registration = v_normalized;

  return jsonb_build_object(
    'ok', true,
    'normalized_registration', v_normalized,
    'previous_fleet_id', v_row.first_fleet_id,
    'released_at', now()
  );
end;
$$;

create or replace function public.admin_list_fleet_vehicles(
  p_fleet_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied: platform admin required';
  end if;

  if not exists (select 1 from public.flottes where id = p_fleet_id) then
    raise exception 'fleet_not_found';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', v.id,
    'registration', v.registration,
    'brand', v.brand,
    'model', v.model,
    'year', v.year,
    'current_km', v.current_km,
    'status', v.status,
    'created_at', v.created_at,
    'registration_locked',
      coalesce(r.released_at is null, false),
    'registration_released_at', r.released_at
  ) order by v.created_at desc), '[]'::jsonb)
  into v_result
  from public.vehicules v
  left join public.vehicle_registration_registry r
    on r.normalized_registration = public.normalize_vehicle_registration(v.registration)
  where v.fleet_id = p_fleet_id;

  return v_result;
end;
$$;

create or replace function public.admin_list_registration_locks(
  p_fleet_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied: platform admin required';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'normalized_registration', r.normalized_registration,
    'fleet_id', r.first_fleet_id,
    'fleet_name', f.name,
    'locked', r.released_at is null,
    'first_used_at', r.first_used_at,
    'released_at', r.released_at,
    'active_vehicle_id', v.id,
    'active_registration', v.registration
  ) order by r.first_used_at desc), '[]'::jsonb)
  into v_result
  from public.vehicle_registration_registry r
  left join public.flottes f on f.id = r.first_fleet_id
  left join public.vehicules v
    on v.id = r.first_vehicle_id
   and public.normalize_vehicle_registration(v.registration) = r.normalized_registration
  where p_fleet_id is null or r.first_fleet_id = p_fleet_id;

  return v_result;
end;
$$;

create or replace function public.admin_delete_vehicle(
  p_vehicle_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vehicle public.vehicules%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied: platform admin required';
  end if;

  select *
    into v_vehicle
  from public.vehicules
  where id = p_vehicle_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'vehicle_not_found');
  end if;

  delete from public.vehicules where id = p_vehicle_id;

  return jsonb_build_object(
    'ok', true,
    'vehicle_id', p_vehicle_id,
    'fleet_id', v_vehicle.fleet_id,
    'registration', v_vehicle.registration,
    'registration_reserved_for_fleet', true
  );
end;
$$;

grant execute on function public.admin_release_vehicle_registration(text) to authenticated;
grant execute on function public.admin_list_fleet_vehicles(uuid) to authenticated;
grant execute on function public.admin_list_registration_locks(uuid) to authenticated;
grant execute on function public.admin_delete_vehicle(uuid) to authenticated;

revoke execute on function public.admin_release_vehicle_registration(text) from anon;
revoke execute on function public.admin_list_fleet_vehicles(uuid) from anon;
revoke execute on function public.admin_list_registration_locks(uuid) from anon;
revoke execute on function public.admin_delete_vehicle(uuid) from anon;

notify pgrst, 'reload schema';

commit;
