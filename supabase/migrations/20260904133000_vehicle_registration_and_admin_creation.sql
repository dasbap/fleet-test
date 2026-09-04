
begin;

create or replace function public.normalize_vehicle_registration(p_registration text)
returns text
language sql
immutable
strict
as $$
  select upper(regexp_replace(trim(p_registration), '[^A-Za-z0-9]', '', 'g'));
$$;

create unique index if not exists vehicules_registration_global_unique_idx
on public.vehicules (public.normalize_vehicle_registration(registration));

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

  return new;
end;
$$;

drop trigger if exists trg_validate_vehicle_registration on public.vehicules;
create trigger trg_validate_vehicle_registration
before insert or update of registration, fleet_id on public.vehicules
for each row execute function public.validate_vehicle_registration();

create or replace function public.trg_enforce_fleet_vehicle_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slots int;
  v_used int;
begin
  if current_setting('app.admin_vehicle_bypass', true) = 'on'
     and public.is_platform_admin() then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.fleet_id::text, 2026081012));

  select coalesce(sum((public.subscription_plan_capacity(p.code, p.max_vehicles, p.max_vehicles_per_subscription)->>'vehicles_per_subscription')::int), 0)
  into v_slots
  from public.abonnements a
  join public.plans p on p.id = a.plan_id
  where a.fleet_id = new.fleet_id
    and public.is_vehicle_subscription_status_active(a.status);

  select count(*)::int
  into v_used
  from public.droits_vehicules dv
  join public.abonnements a on a.id = dv.subscription_id
  where a.fleet_id = new.fleet_id
    and dv.active = true
    and public.is_vehicle_subscription_status_active(a.status);

  if v_slots <= 0 or v_used + 1 > v_slots then
    raise exception 'limite_vehicules_abonnements_atteinte'
      using hint = 'Vous avez atteint la limite de vehicules autorisee par vos abonnements.';
  end if;

  return new;
end;
$$;

create or replace function public.trg_auto_assign_vehicle_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription_id uuid;
begin
  if current_setting('app.admin_vehicle_bypass', true) = 'on'
     and public.is_platform_admin() then
    return new;
  end if;

  v_subscription_id := public.find_available_subscription_for_vehicle(new.fleet_id);

  if v_subscription_id is null then
    raise exception 'limite_vehicules_abonnements_atteinte'
      using hint = 'Vous avez atteint la limite de vehicules autorisee par vos abonnements.';
  end if;

  perform public.assign_vehicle_to_subscription(new.id, v_subscription_id, auth.uid());
  return new;
end;
$$;

create or replace function public.admin_list_fleets_for_vehicle_creation()
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
    'id', f.id,
    'name', f.name,
    'org_name', o.name,
    'country_code', upper(coalesce(o.country_code, 'CM')),
    'vehicle_count', (select count(*) from public.vehicules v where v.fleet_id = f.id)
  ) order by o.name nulls last, f.name), '[]'::jsonb)
  into v_result
  from public.flottes f
  left join public.organisations o on o.id = f.org_id;

  return v_result;
end;
$$;

create or replace function public.admin_create_vehicle(
  p_fleet_id uuid,
  p_registration text,
  p_brand text default null,
  p_model text default null,
  p_year integer default null,
  p_current_km integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vehicle public.vehicules%rowtype;
  v_subscription_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied: platform admin required';
  end if;

  if p_fleet_id is null then
    raise exception 'fleet_id_required';
  end if;

  if not exists (select 1 from public.flottes where id = p_fleet_id) then
    raise exception 'fleet_not_found';
  end if;

  perform set_config('app.admin_vehicle_bypass', 'on', true);

  insert into public.vehicules (
    fleet_id, registration, brand, model, year, current_km, status
  )
  values (
    p_fleet_id,
    p_registration,
    nullif(trim(coalesce(p_brand, '')), ''),
    nullif(trim(coalesce(p_model, '')), ''),
    p_year,
    greatest(coalesce(p_current_km, 0), 0),
    'ok'
  )
  returning * into v_vehicle;

  v_subscription_id := public.find_available_subscription_for_vehicle(p_fleet_id);
  if v_subscription_id is not null then
    perform public.assign_vehicle_to_subscription(
      v_vehicle.id,
      v_subscription_id,
      auth.uid()
    );
  end if;

  return to_jsonb(v_vehicle);
exception
  when unique_violation then
    raise exception 'vehicle_registration_already_used';
end;
$$;

grant execute on function public.admin_list_fleets_for_vehicle_creation() to authenticated;
grant execute on function public.admin_create_vehicle(uuid, text, text, text, integer, integer) to authenticated;
revoke execute on function public.admin_list_fleets_for_vehicle_creation() from anon;
revoke execute on function public.admin_create_vehicle(uuid, text, text, text, integer, integer) from anon;

notify pgrst, 'reload schema';

commit;
