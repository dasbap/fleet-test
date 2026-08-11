-- Repair active subscriptions that accidentally inherited the plan catalog max
-- instead of the previously granted same-plan slot count.

with ranked_repairs as (
  select
    a.id,
    previous.vehicle_slots as previous_vehicle_slots,
    row_number() over (
      partition by a.id
      order by previous.ends_at desc nulls last, previous.starts_at desc nulls last, previous.id desc
    ) as repair_rank
  from public.abonnements a
  join public.plans p on p.id = a.plan_id
  join public.abonnements previous on previous.fleet_id = a.fleet_id
    and previous.plan_id = a.plan_id
    and previous.id <> a.id
    and previous.ends_at <= a.starts_at + interval '1 minute'
    and previous.vehicle_slots is not null
    and previous.vehicle_slots <> p.max_vehicles
  where a.status in ('active', 'trial')
    and p.max_vehicles is not null
    and a.vehicle_slots = p.max_vehicles
    and coalesce(a.ends_at, '9999-12-31 23:59:59+00'::timestamptz) > now()
)
update public.abonnements a
set vehicle_slots = ranked.previous_vehicle_slots
from ranked_repairs ranked
where ranked.id = a.id
  and ranked.repair_rank = 1;

notify pgrst, 'reload schema';
