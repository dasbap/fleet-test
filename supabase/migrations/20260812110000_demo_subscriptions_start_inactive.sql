-- Demo accounts receive a one-month, ten-vehicle subscription that starts inactive.
-- It becomes active only when a vehicle is attached or when the organizer activates it manually.

create or replace function public.prospect_create_account(
  p_user_id uuid,
  p_email text,
  p_company_name text default null,
  p_invited_by uuid default null,
  p_fleet_id uuid default null,
  p_trial_days int default 31,
  p_account_type text default 'prospect',
  p_permanent_access boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg_id uuid;
  v_trial_end timestamptz;
  v_account_type text;
begin
  v_account_type := coalesce(nullif(p_account_type, ''), 'prospect');

  if v_account_type not in ('prospect', 'investor', 'internal', 'dev') then
    return jsonb_build_object('ok', false, 'error', 'invalid_account_type');
  end if;

  if p_trial_days < 1 or p_trial_days > 90 then
    return jsonb_build_object('ok', false, 'error', 'trial_days_must_be_1_to_90');
  end if;

  if p_fleet_id is not null then
    return jsonb_build_object(
      'ok', false,
      'error', 'demo_fleet_assignment_not_allowed_at_creation'
    );
  end if;

  v_trial_end := case
    when p_permanent_access then null
    when p_trial_days = 31 then now() + interval '1 month'
    else now() + (p_trial_days || ' days')::interval
  end;

  insert into public.demo_profiles (
    user_id,
    email,
    demo_role,
    fleet_id,
    is_active,
    expires_at,
    account_type,
    created_by,
    deactivated_at,
    deactivated_by,
    notified_at
  )
  values (
    p_user_id,
    p_email,
    'organizer',
    null,
    true,
    v_trial_end,
    v_account_type,
    p_invited_by,
    null,
    null,
    null
  )
  on conflict (user_id) do update
    set email = excluded.email,
        demo_role = excluded.demo_role,
        fleet_id = null,
        is_active = true,
        expires_at = excluded.expires_at,
        account_type = excluded.account_type,
        created_by = coalesce(public.demo_profiles.created_by, excluded.created_by),
        deactivated_at = null,
        deactivated_by = null,
        notified_at = null;

  if to_regclass('public.prospect_registrations') is not null then
    insert into public.prospect_registrations (
      user_id,
      fleet_id,
      email,
      company_name,
      invited_by,
      trial_end,
      status
    )
    values (
      p_user_id,
      null,
      p_email,
      p_company_name,
      p_invited_by,
      v_trial_end,
      'active'
    )
    returning id into v_reg_id;
  end if;

  if to_regprocedure('public.demo_log_action(uuid,uuid,text,jsonb)') is not null then
    perform public.demo_log_action(
      p_user_id,
      null,
      'prospect_created',
      jsonb_build_object(
        'fleet_id', null,
        'email', p_email,
        'company', p_company_name,
        'account_type', v_account_type,
        'demo_role', 'organizer',
        'default_plan_code', 'starter',
        'default_vehicle_slots', 10,
        'default_subscription_status', 'inactive',
        'trial_end', v_trial_end,
        'permanent_access', p_permanent_access,
        'invited_by', p_invited_by
      )
    );
  end if;

  perform public.admin_log_action(
    p_invited_by,
    'demo_account_accepted_created',
    'demo_profile',
    p_user_id,
    p_email,
    jsonb_build_object(
      'account_type', v_account_type,
      'demo_role', 'organizer',
      'default_plan_code', 'starter',
      'default_vehicle_slots', 10,
      'default_subscription_status', 'inactive',
      'trial_end', v_trial_end,
      'permanent_access', p_permanent_access
    )
  );

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'fleet_id', null,
    'reg_id', v_reg_id,
    'trial_end', v_trial_end,
    'account_type', v_account_type,
    'demo_role', 'organizer',
    'default_plan_code', 'starter',
    'default_vehicle_slots', 10,
    'default_subscription_status', 'inactive',
    'permanent_access', p_permanent_access
  );
end;
$$;

grant execute on function public.prospect_create_account(uuid, text, text, uuid, uuid, int, text, boolean) to service_role;

create or replace function public.demo_organizer_plan_after_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_demo record;
  v_plan record;
  v_subscription_id uuid;
  v_ends_at timestamptz;
begin
  if new.is_active is distinct from true then
    return new;
  end if;

  if new.role::text <> 'organizer' then
    return new;
  end if;

  select dp.user_id, dp.created_by, dp.expires_at, dp.account_type
  into v_demo
  from public.demo_profiles dp
  where dp.user_id = new.user_id
    and dp.is_active = true
    and dp.demo_role = 'organizer'
  limit 1;

  if not found then
    return new;
  end if;

  update public.demo_profiles
     set fleet_id = coalesce(fleet_id, new.fleet_id)
   where user_id = new.user_id;

  select id, code
  into v_plan
  from public.plans
  where code = 'starter'
    and coalesce(is_active, true) = true
  limit 1;

  if v_plan.id is null then
    raise exception 'plan_not_found:starter';
  end if;

  v_ends_at := coalesce(v_demo.expires_at, now() + interval '1 month');

  select id
  into v_subscription_id
  from public.abonnements
  where fleet_id = new.fleet_id
    and plan_id = v_plan.id
    and status in ('inactive', 'active', 'trial')
    and coalesce(ends_at, '9999-12-31 23:59:59+00'::timestamptz) > now()
  order by starts_at desc nulls last, id desc
  limit 1;

  if v_subscription_id is null then
    insert into public.abonnements (
      fleet_id,
      plan_id,
      payment_id,
      starts_at,
      ends_at,
      status,
      vehicle_slots,
      trial_ends_at
    )
    values (
      new.fleet_id,
      v_plan.id,
      null,
      now(),
      v_ends_at,
      'inactive',
      10,
      v_ends_at
    )
    returning id into v_subscription_id;
  else
    update public.abonnements
       set vehicle_slots = 10,
           ends_at = greatest(coalesce(ends_at, v_ends_at), v_ends_at),
           trial_ends_at = coalesce(trial_ends_at, v_ends_at)
     where id = v_subscription_id;
  end if;

  if to_regclass('public.billing_events') is not null then
    insert into public.billing_events(fleet_id, subscription_id, event_type, payload)
    values (
      new.fleet_id,
      v_subscription_id,
      'subscription.demo_created_inactive',
      jsonb_build_object(
        'actor_id', v_demo.created_by,
        'user_id', new.user_id,
        'plan_code', 'starter',
        'vehicle_slots', 10,
        'status', 'inactive',
        'account_type', v_demo.account_type
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists demo_organizer_plan_after_membership on public.flotte_adhesions;
create trigger demo_organizer_plan_after_membership
  after insert or update on public.flotte_adhesions
  for each row execute function public.demo_organizer_plan_after_membership();

create or replace function public.activate_fleet_subscription(p_subscription_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
  v_check jsonb;
begin
  if auth.uid() is null then
    raise exception 'non_authentifie';
  end if;

  select id, fleet_id, status, ends_at
  into v_sub
  from public.abonnements
  where id = p_subscription_id
  for update;

  if v_sub.id is null then
    raise exception 'abonnement_introuvable';
  end if;

  v_check := public.rbac_check_permission('billing.manage', v_sub.fleet_id);
  if coalesce((v_check->>'allowed')::boolean, false) is false then
    raise exception 'permission_refusee_abonnement';
  end if;

  if coalesce(v_sub.ends_at, '9999-12-31 23:59:59+00'::timestamptz) <= now() then
    raise exception 'abonnement_expire';
  end if;

  if v_sub.status in ('active', 'trial') then
    return jsonb_build_object('ok', true, 'subscription_id', p_subscription_id, 'status', v_sub.status);
  end if;

  if v_sub.status <> 'inactive' then
    raise exception 'abonnement_activation_statut_invalide';
  end if;

  update public.abonnements
     set status = 'active'
   where id = p_subscription_id;

  if to_regclass('public.billing_events') is not null then
    insert into public.billing_events(fleet_id, subscription_id, event_type, payload)
    values (
      v_sub.fleet_id,
      p_subscription_id,
      'subscription.activated_manually',
      jsonb_build_object('actor_id', auth.uid(), 'previous_status', v_sub.status)
    );
  end if;

  return jsonb_build_object('ok', true, 'subscription_id', p_subscription_id, 'status', 'active');
end;
$$;

revoke execute on function public.activate_fleet_subscription(uuid) from public;
revoke execute on function public.activate_fleet_subscription(uuid) from anon;
grant execute on function public.activate_fleet_subscription(uuid) to authenticated;

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
