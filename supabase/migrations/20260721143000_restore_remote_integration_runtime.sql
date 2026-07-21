-- Restore runtime objects required by the remote Supabase integration workflow.

begin;

do $$
begin
  if exists (select 1 from pg_type where typname = 'alert_type')
     and not exists (
       select 1
       from pg_enum e
       join pg_type t on t.oid = e.enumtypid
       where t.typname = 'alert_type'
         and e.enumlabel = 'failure_risk'
     ) then
    alter type alert_type add value 'failure_risk';
  end if;
end $$;

create table if not exists public.failure_predictions (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references public.flottes(id) on delete cascade,
  vehicle_id uuid not null references public.vehicules(id) on delete cascade,
  risk_score int not null check (risk_score >= 0 and risk_score <= 100),
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  top_signals jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  model_version text not null default 'sql-rpc-v1',
  predicted_at timestamptz not null default now()
);

create index if not exists idx_failure_predictions_fleet_vehicle_predicted_at
  on public.failure_predictions(fleet_id, vehicle_id, predicted_at desc);

alter table public.failure_predictions enable row level security;

drop policy if exists "failure_predictions_select_member" on public.failure_predictions;
create policy "failure_predictions_select_member"
  on public.failure_predictions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.flotte_adhesions fa
      where fa.fleet_id = failure_predictions.fleet_id
        and fa.user_id = auth.uid()
        and fa.is_active = true
      )
  );

drop function if exists public.predict_failure_risk(uuid, uuid);
drop view if exists public.vehicle_failure_features_v1;

create or replace view public.vehicle_failure_features_v1 as
with incidents_30d as (
  select
    i.vehicle_id,
    count(*)::int as incident_count_30d,
    count(*) filter (where i.severity in ('high', 'critical'))::int as critical_incident_count_30d
  from public.incidents i
  where i.created_at >= now() - interval '30 days'
  group by i.vehicle_id
),
maintenance_30d as (
  select
    tm.vehicle_id,
    count(*)::int as maintenance_jobs_30d
  from public.travaux_maintenance tm
  where tm.created_at >= now() - interval '30 days'
  group by tm.vehicle_id
),
maintenance_open as (
  select
    tm.vehicle_id,
    count(*) filter (where tm.status in ('queued', 'in_progress'))::int as open_maintenance_jobs
  from public.travaux_maintenance tm
  group by tm.vehicle_id
),
fuel_base as (
  select
    jc.vehicle_id,
    jc.purchased_at,
    jc.amount_xof,
    jc.liters,
    case
      when jc.liters > 0 then jc.amount_xof::numeric / jc.liters::numeric
      else null
    end as price_per_liter
  from public.journal_carburant jc
  where jc.purchased_at >= now() - interval '30 days'
),
fuel_metrics as (
  select
    fb.vehicle_id,
    count(*)::int as fuel_entries_30d,
    avg(fb.price_per_liter) as avg_price_per_liter_30d,
    count(*) filter (
      where fb.price_per_liter > (
        select avg(fb2.price_per_liter) * 1.20
        from fuel_base fb2
        where fb2.vehicle_id = fb.vehicle_id
      )
    )::int as fuel_anomaly_events_30d
  from fuel_base fb
  group by fb.vehicle_id
)
select
  v.fleet_id,
  v.id as vehicle_id,
  v.status as vehicle_status,
  coalesce(i.incident_count_30d, 0) as incident_count_30d,
  coalesce(i.critical_incident_count_30d, 0) as critical_incident_count_30d,
  coalesce(m.maintenance_jobs_30d, 0) as maintenance_jobs_30d,
  coalesce(mo.open_maintenance_jobs, 0) as open_maintenance_jobs,
  coalesce(f.fuel_entries_30d, 0) as fuel_entries_30d,
  coalesce(f.fuel_anomaly_events_30d, 0) as fuel_anomaly_events_30d,
  coalesce(f.avg_price_per_liter_30d, 0)::numeric(10,2) as avg_price_per_liter_30d
from public.vehicules v
left join incidents_30d i on i.vehicle_id = v.id
left join maintenance_30d m on m.vehicle_id = v.id
left join maintenance_open mo on mo.vehicle_id = v.id
left join fuel_metrics f on f.vehicle_id = v.id;

create or replace function public.predict_failure_risk(
  p_fleet_id uuid,
  p_vehicle_id uuid default null
)
returns table (
  vehicle_id uuid,
  risk_score int,
  risk_level text,
  top_signals jsonb,
  recommended_actions jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_score int;
  v_level text;
  v_signals text[];
  v_actions text[];
begin
  if auth.uid() is null then
    raise exception 'authentification_requise'
      using errcode = 'P0001';
  end if;

  if p_fleet_id is null then
    raise exception 'fleet_id_requis'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.flotte_adhesions fa
    where fa.fleet_id = p_fleet_id
      and fa.user_id = auth.uid()
      and fa.is_active = true
  ) then
    raise exception 'acces_flotte_refuse'
      using errcode = 'P0001';
  end if;

  for v_row in
    select *
    from public.vehicle_failure_features_v1 vf
    where vf.fleet_id = p_fleet_id
      and (p_vehicle_id is null or vf.vehicle_id = p_vehicle_id)
  loop
    v_score := least(
      100,
      (v_row.critical_incident_count_30d * 20)
      + (v_row.incident_count_30d * 8)
      + (v_row.open_maintenance_jobs * 12)
      + (v_row.fuel_anomaly_events_30d * 10)
      + case when v_row.vehicle_status = 'blocked' then 25 else 0 end
    );

    v_signals := array[
      case when v_row.critical_incident_count_30d > 0 then format('%s incident(s) critique(s) sur 30 jours', v_row.critical_incident_count_30d) end,
      case when v_row.incident_count_30d >= 3 then format('%s incidents signales sur 30 jours', v_row.incident_count_30d) end,
      case when v_row.open_maintenance_jobs > 0 then format('%s entretien(s) non cloture(s)', v_row.open_maintenance_jobs) end,
      case when v_row.fuel_anomaly_events_30d > 0 then format('%s anomalie(s) carburant detectee(s)', v_row.fuel_anomaly_events_30d) end,
      case when v_row.vehicle_status = 'blocked' then 'Vehicule actuellement bloque' end
    ];

    v_actions := array[
      case when v_row.open_maintenance_jobs > 0 then 'Prioriser la cloture des entretiens en cours dans les 24h.' end,
      case when v_row.fuel_anomaly_events_30d > 0 then 'Controler le circuit carburant et verifier les tickets de ravitaillement.' end,
      case when v_row.critical_incident_count_30d > 0 then 'Planifier une inspection mecanique approfondie avant la prochaine rotation.' end,
      case when v_row.incident_count_30d = 0 and v_row.fuel_anomaly_events_30d = 0 then 'Maintenir le rythme de maintenance preventive actuel.' end
    ];

    if v_score >= 85 then
      v_level := 'critical';
    elsif v_score >= 70 then
      v_level := 'high';
    elsif v_score >= 40 then
      v_level := 'medium';
    else
      v_level := 'low';
    end if;

    insert into public.failure_predictions (
      fleet_id,
      vehicle_id,
      risk_score,
      risk_level,
      top_signals,
      recommended_actions
    )
    values (
      p_fleet_id,
      v_row.vehicle_id,
      v_score,
      v_level,
      to_jsonb(array_remove(v_signals, null)),
      to_jsonb(array_remove(v_actions, null))
    );

    vehicle_id := v_row.vehicle_id;
    risk_score := v_score;
    risk_level := v_level;
    top_signals := to_jsonb(array_remove(v_signals, null));
    recommended_actions := to_jsonb(array_remove(v_actions, null));
    return next;
  end loop;
end;
$$;

grant execute on function public.predict_failure_risk(uuid, uuid) to authenticated;

create or replace function public.trg_enforce_fleet_vehicle_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ctx jsonb;
  v_max int;
  v_cnt int;
begin
  select public.get_fleet_billing_context_internal(new.fleet_id) into v_ctx;

  v_max := coalesce((v_ctx->>'max_vehicles')::int, 999999);
  v_cnt := coalesce((v_ctx->>'vehicle_count')::int, 0);

  if v_max >= 999999 then
    return new;
  end if;

  if v_cnt + 1 > v_max then
    raise exception 'limite_vehicules_plan_atteinte'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_fleet_vehicle_limit on public.vehicules;
create trigger trg_enforce_fleet_vehicle_limit
  before insert on public.vehicules
  for each row
  execute function public.trg_enforce_fleet_vehicle_limit();

notify pgrst, 'reload schema';

commit;
