-- Enforce vehicle slot limits at the entitlement table boundary.
-- RPCs already validate capacity; this trigger also blocks direct droits_vehicules writes.

create or replace function public.trg_enforce_subscription_vehicle_slot_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
  v_vehicle record;
  v_capacity jsonb;
  v_limit integer;
  v_used integer;
begin
  if coalesce(new.active, false) is false then
    return new;
  end if;

  select id, fleet_id, registration
  into v_vehicle
  from public.vehicules
  where id = new.vehicle_id
  for update;

  if v_vehicle.id is null then
    raise exception 'vehicule_introuvable';
  end if;

  select
    a.id,
    a.fleet_id,
    a.status,
    a.vehicle_slots,
    p.code as plan_code,
    p.max_vehicles,
    p.max_vehicles_per_subscription
  into v_sub
  from public.abonnements a
  join public.plans p on p.id = a.plan_id
  where a.id = new.subscription_id
  for update;

  if v_sub.id is null then
    raise exception 'abonnement_introuvable';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_sub.fleet_id::text, 2026081012));

  if v_sub.fleet_id is distinct from v_vehicle.fleet_id then
    raise exception 'abonnement_flotte_incompatible';
  end if;

  if not public.is_vehicle_subscription_status_active(v_sub.status) then
    raise exception 'abonnement_inactif';
  end if;

  v_capacity := public.subscription_plan_capacity(
    v_sub.plan_code,
    v_sub.max_vehicles,
    coalesce(v_sub.vehicle_slots, v_sub.max_vehicles_per_subscription)
  );
  v_limit := (v_capacity->>'vehicles_per_subscription')::int;

  select count(*)::int
  into v_used
  from public.droits_vehicules
  where subscription_id = new.subscription_id
    and active = true
    and id is distinct from new.id;

  if v_used >= v_limit then
    raise exception 'limite_vehicules_abonnement_atteinte'
      using hint = 'Cet abonnement n''a plus d''emplacement vehicule disponible.';
  end if;

  if (v_capacity->>'allows_multiple_vehicles_per_subscription')::boolean = false and v_used >= 1 then
    raise exception 'abonnement_standard_deja_utilise';
  end if;

  return new;
end;
$$;

update public.droits_vehicules dv
set active = false,
    ended_at = now()
from public.abonnements a
where a.id = dv.subscription_id
  and dv.active = true
  and not public.is_vehicle_subscription_status_active(a.status);

with ranked_entitlements as (
  select
    dv.id,
    row_number() over (
      partition by dv.subscription_id
      order by dv.associated_at asc nulls last, dv.id asc
    ) as slot_rank,
    (public.subscription_plan_capacity(
      p.code,
      p.max_vehicles,
      coalesce(a.vehicle_slots, p.max_vehicles_per_subscription)
    )->>'vehicles_per_subscription')::int as slot_limit
  from public.droits_vehicules dv
  join public.abonnements a on a.id = dv.subscription_id
  join public.plans p on p.id = a.plan_id
  where dv.active = true
    and public.is_vehicle_subscription_status_active(a.status)
)
update public.droits_vehicules dv
set active = false,
    ended_at = now()
from ranked_entitlements ranked
where ranked.id = dv.id
  and ranked.slot_rank > ranked.slot_limit;

drop trigger if exists trg_droits_vehicules_subscription_slot_limit on public.droits_vehicules;
create trigger trg_droits_vehicules_subscription_slot_limit
before insert or update of subscription_id, vehicle_id, active on public.droits_vehicules
for each row
execute function public.trg_enforce_subscription_vehicle_slot_limit();

grant execute on function public.trg_enforce_subscription_vehicle_slot_limit() to service_role;

notify pgrst, 'reload schema';
