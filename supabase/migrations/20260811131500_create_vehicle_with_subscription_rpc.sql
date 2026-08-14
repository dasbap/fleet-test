-- Create a vehicle and bind it to the subscription chosen by the user.
-- This keeps vehicle creation and subscription assignment in one transaction.

create or replace function public.create_vehicle_with_subscription(
  p_fleet_id uuid,
  p_subscription_id uuid,
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
  v_check jsonb;
  v_target record;
  v_vehicle public.vehicules%rowtype;
  v_current_subscription_id uuid;
begin
  if auth.uid() is null then
    raise exception 'non_authentifie';
  end if;

  if p_fleet_id is null then
    raise exception 'fleet_id_required';
  end if;

  if p_subscription_id is null then
    raise exception 'subscription_id_required';
  end if;

  if nullif(trim(coalesce(p_registration, '')), '') is null then
    raise exception 'registration_required';
  end if;

  v_check := public.rbac_check_permission('vehicle.create', p_fleet_id);
  if coalesce((v_check->>'allowed')::boolean, false) is false then
    raise exception 'permission_refusee_vehicle_create';
  end if;

  select a.id, a.fleet_id, a.status
  into v_target
  from public.abonnements a
  where a.id = p_subscription_id
  for update;

  if v_target.id is null then
    raise exception 'abonnement_introuvable';
  end if;

  if v_target.fleet_id is distinct from p_fleet_id then
    raise exception 'abonnement_flotte_incompatible';
  end if;

  if v_target.status = 'inactive' then
    update public.abonnements
       set status = 'active'
     where id = p_subscription_id;

    v_target.status := 'active';
  end if;

  if not public.is_vehicle_subscription_status_active(v_target.status) then
    raise exception 'abonnement_inactif';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_fleet_id::text, 2026081012));

  insert into public.vehicules (
    fleet_id,
    registration,
    brand,
    model,
    year,
    current_km,
    status
  )
  values (
    p_fleet_id,
    upper(trim(p_registration)),
    nullif(trim(coalesce(p_brand, '')), ''),
    nullif(trim(coalesce(p_model, '')), ''),
    p_year,
    greatest(coalesce(p_current_km, 0), 0),
    'ok'
  )
  returning * into v_vehicle;

  select subscription_id
  into v_current_subscription_id
  from public.droits_vehicules
  where vehicle_id = v_vehicle.id
    and active = true
  for update;

  if v_current_subscription_id is distinct from p_subscription_id then
    update public.droits_vehicules
    set active = false,
        ended_at = now()
    where vehicle_id = v_vehicle.id
      and active = true;

    perform public.assign_vehicle_to_subscription(v_vehicle.id, p_subscription_id, auth.uid());
  end if;

  return to_jsonb(v_vehicle);
end;
$$;

revoke execute on function public.create_vehicle_with_subscription(
  uuid,
  uuid,
  text,
  text,
  text,
  integer,
  integer
) from public;
revoke execute on function public.create_vehicle_with_subscription(
  uuid,
  uuid,
  text,
  text,
  text,
  integer,
  integer
) from anon;
grant execute on function public.create_vehicle_with_subscription(
  uuid,
  uuid,
  text,
  text,
  text,
  integer,
  integer
) to authenticated;

notify pgrst, 'reload schema';
