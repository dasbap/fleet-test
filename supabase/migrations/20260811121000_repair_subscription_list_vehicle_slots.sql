-- Repair subscription list capacity display: expose granted vehicle_slots instead
-- of only the plan catalog capacity.

alter table public.abonnements
  add column if not exists vehicle_slots integer;

do $$
begin
  if to_regclass('public.billing_events') is not null then
    update public.abonnements a
    set vehicle_slots = greatest(1, (e.payload->>'vehicle_slots')::int)
    from public.billing_events e
    where e.subscription_id = a.id
      and a.vehicle_slots is null
      and e.event_type = 'subscription.admin_created'
      and e.payload ? 'vehicle_slots'
      and (e.payload->>'vehicle_slots') ~ '^[0-9]+$';
  end if;
end $$;

create or replace function public.list_fleet_subscriptions(p_fleet_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_check jsonb;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'non_authentifie';
  end if;

  v_check := public.rbac_check_permission('billing.view', p_fleet_id);
  if coalesce((v_check->>'allowed')::boolean, false) is false then
    raise exception 'permission_refusee_abonnement';
  end if;

  select coalesce(jsonb_agg(row_data order by row_data->>'starts_at' desc), '[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'id', a.id,
      'fleet_id', a.fleet_id,
      'fleet_name', f.name,
      'plan_id', p.id,
      'plan_code', p.code,
      'plan_name', p.name,
      'status', a.status,
      'starts_at', a.starts_at,
      'ends_at', a.ends_at,
      'cancelled_at', a.cancelled_at,
      'vehicle_slots', a.vehicle_slots,
      'vehicle_capacity',
        case
          when a.vehicle_slots is not null then a.vehicle_slots
          else (public.subscription_plan_capacity(
            p.code,
            p.max_vehicles,
            p.max_vehicles_per_subscription
          )->>'vehicles_per_subscription')::int
        end,
      'vehicle_count', count(dv.id)::int,
      'available_slots',
        greatest(
          0,
          case
            when a.vehicle_slots is not null then a.vehicle_slots
            else public.get_subscription_available_slots(a.id)
          end - count(dv.id)::int
        ),
      'vehicles', coalesce(jsonb_agg(
        jsonb_build_object(
          'id', v.id,
          'fleet_id', v.fleet_id,
          'registration', v.registration,
          'status', v.status,
          'fleet_name', f.name,
          'associated_at', dv.associated_at
        )
        order by dv.associated_at desc
      ) filter (where v.id is not null), '[]'::jsonb)
    ) as row_data
    from public.abonnements a
    join public.flottes f on f.id = a.fleet_id
    join public.plans p on p.id = a.plan_id
    left join public.droits_vehicules dv on dv.subscription_id = a.id and dv.active = true
    left join public.vehicules v on v.id = dv.vehicle_id
    where a.fleet_id = p_fleet_id
    group by
      a.id,
      f.name,
      p.id,
      p.code,
      p.name,
      p.max_vehicles,
      p.max_vehicles_per_subscription,
      a.vehicle_slots
  ) rows;

  return v_result;
end;
$$;

grant execute on function public.list_fleet_subscriptions(uuid) to authenticated;

notify pgrst, 'reload schema';
