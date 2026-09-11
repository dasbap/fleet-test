create or replace function public.trg_auto_assign_vehicle_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription_id uuid;
begin
  if current_setting('app.skip_vehicle_auto_assign', true) = 'on' then
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
begin
  if auth.uid() is null then raise exception 'non_authentifie'; end if;
  if p_fleet_id is null then raise exception 'fleet_id_required'; end if;
  if p_subscription_id is null then raise exception 'subscription_id_required'; end if;
  if nullif(trim(coalesce(p_registration, '')), '') is null then raise exception 'registration_required'; end if;

  v_check := public.rbac_check_permission('vehicle.create', p_fleet_id);
  if not coalesce((v_check->>'allowed')::boolean, false) then
    raise exception 'permission_refusee_vehicle_create';
  end if;

  select a.id, a.fleet_id, a.status, a.starts_at, a.ends_at
    into v_target
    from public.abonnements a
   where a.id = p_subscription_id
   for update;

  if v_target.id is null then raise exception 'abonnement_introuvable'; end if;
  if v_target.fleet_id is distinct from p_fleet_id then raise exception 'abonnement_flotte_incompatible'; end if;

  if v_target.status in ('inactive', 'pending_payment') then
    perform public.activate_fleet_subscription(p_subscription_id);
    select a.id, a.fleet_id, a.status, a.starts_at, a.ends_at
      into v_target
      from public.abonnements a
     where a.id = p_subscription_id;
  end if;

  if not public.is_vehicle_subscription_status_active(v_target.status) then
    raise exception 'abonnement_inactif';
  end if;
  if coalesce(v_target.starts_at, '-infinity'::timestamptz) > now() then
    raise exception 'abonnement_pas_encore_actif';
  end if;
  if coalesce(v_target.ends_at, 'infinity'::timestamptz) <= now() then
    raise exception 'abonnement_expire';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_fleet_id::text, 2026081012));
  if not public.can_create_vehicle(p_fleet_id) then
    raise exception 'limite_vehicules_abonnement_atteinte';
  end if;

  if public.get_subscription_available_slots(p_subscription_id) <= 0 then
    raise exception 'limite_vehicules_abonnement_atteinte';
  end if;

  perform set_config('app.skip_vehicle_auto_assign', 'on', true);

  insert into public.vehicules (fleet_id, registration, brand, model, year, current_km, status)
  values (
    p_fleet_id,
    upper(trim(p_registration)),
    nullif(trim(coalesce(p_brand, '')), ''),
    nullif(trim(coalesce(p_model, '')), ''),
    p_year,
    greatest(coalesce(p_current_km, 0), 0),
    'ok'
  ) returning * into v_vehicle;

  perform set_config('app.skip_vehicle_auto_assign', 'off', true);
  perform public.assign_vehicle_to_subscription(v_vehicle.id, p_subscription_id, auth.uid());

  return to_jsonb(v_vehicle);
end;
$$;