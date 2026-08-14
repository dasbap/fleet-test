-- Enforce fleet-level plan vehicle limits at the abonnements boundary.
-- This complements droits_vehicules slot enforcement for purchase/renewal paths.

create or replace function public.trg_enforce_fleet_subscription_total_vehicle_slots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan record;
  v_new_slots integer;
  v_existing_slots integer;
  v_total_slots integer;
begin
  if not public.is_vehicle_subscription_status_active(new.status) then
    return new;
  end if;

  if new.fleet_id is null or new.plan_id is null then
    return new;
  end if;

  select id, code, max_vehicles, max_vehicles_per_subscription
  into v_plan
  from public.plans
  where id = new.plan_id
  for update;

  if v_plan.id is null or v_plan.max_vehicles is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.fleet_id::text, 2026081113));

  v_new_slots := coalesce(new.vehicle_slots, v_plan.max_vehicles_per_subscription, v_plan.max_vehicles, 1);
  if v_new_slots > v_plan.max_vehicles then
    raise exception 'limite_vehicules_plan_flotte_atteinte'
      using hint = 'Le nombre de vehicules achetes depasse la limite du plan.';
  end if;

  select coalesce(sum(
    case
      when p.max_vehicles is null then coalesce(a.vehicle_slots, p.max_vehicles_per_subscription, 1)
      else least(coalesce(a.vehicle_slots, p.max_vehicles_per_subscription, p.max_vehicles, 1), p.max_vehicles)
    end
  ), 0)::int
  into v_existing_slots
  from public.abonnements a
  join public.plans p on p.id = a.plan_id
  where a.fleet_id = new.fleet_id
    and a.plan_id = new.plan_id
    and public.is_vehicle_subscription_status_active(a.status)
    and a.id is distinct from new.id;

  v_total_slots := v_existing_slots + v_new_slots;
  if v_total_slots > v_plan.max_vehicles then
    raise exception 'limite_vehicules_plan_flotte_atteinte'
      using hint = 'Les abonnements actifs de cette flotte depasseraient la limite vehicule du plan.';
  end if;

  return new;
end;
$$;

update public.abonnements a
set vehicle_slots = least(a.vehicle_slots, p.max_vehicles)
from public.plans p
where p.id = a.plan_id
  and p.max_vehicles is not null
  and a.vehicle_slots is not null
  and a.vehicle_slots > p.max_vehicles;

with ranked_subscriptions as (
  select
    a.id,
    sum(coalesce(a.vehicle_slots, p.max_vehicles_per_subscription, p.max_vehicles, 1)) over (
      partition by a.fleet_id, a.plan_id
      order by a.starts_at asc nulls last, a.id asc
    ) as cumulative_slots,
    p.max_vehicles
  from public.abonnements a
  join public.plans p on p.id = a.plan_id
  where p.max_vehicles is not null
    and public.is_vehicle_subscription_status_active(a.status)
)
update public.abonnements a
set status = 'cancelled',
    ends_at = least(a.ends_at, now())
from ranked_subscriptions ranked
where ranked.id = a.id
  and ranked.cumulative_slots > ranked.max_vehicles;

drop trigger if exists trg_abonnements_fleet_subscription_total_vehicle_slots on public.abonnements;
create trigger trg_abonnements_fleet_subscription_total_vehicle_slots
before insert or update of fleet_id, plan_id, status, vehicle_slots on public.abonnements
for each row
execute function public.trg_enforce_fleet_subscription_total_vehicle_slots();

grant execute on function public.trg_enforce_fleet_subscription_total_vehicle_slots() to service_role;

notify pgrst, 'reload schema';
