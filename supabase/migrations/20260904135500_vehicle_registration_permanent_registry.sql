
begin;

create table if not exists public.vehicle_registration_registry (
  normalized_registration text primary key,
  first_vehicle_id uuid not null,
  first_fleet_id uuid not null,
  first_used_at timestamptz not null default now()
);

revoke all on table public.vehicle_registration_registry from public, anon, authenticated;
grant select, insert on table public.vehicle_registration_registry to service_role;

insert into public.vehicle_registration_registry (
  normalized_registration,
  first_vehicle_id,
  first_fleet_id,
  first_used_at
)
select
  public.normalize_vehicle_registration(v.registration),
  v.id,
  v.fleet_id,
  v.created_at
from public.vehicules v
on conflict (normalized_registration) do nothing;

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

  insert into public.vehicle_registration_registry (
    normalized_registration,
    first_vehicle_id,
    first_fleet_id
  )
  values (
    v_compact,
    new.id,
    new.fleet_id
  )
  on conflict (normalized_registration) do nothing;

  select first_vehicle_id
    into v_registered_vehicle_id
  from public.vehicle_registration_registry
  where normalized_registration = v_compact;

  if v_registered_vehicle_id is distinct from new.id then
    raise exception 'vehicle_registration_already_used';
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';

commit;
