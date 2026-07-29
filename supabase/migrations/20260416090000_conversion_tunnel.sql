-- ─────────────────────────────────────────────────────────────────────────────
-- supabase/migrations/20260416090000_conversion_tunnel.sql
-- E-Samba — Tunnel de conversion & activation
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists activation_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  org_id          uuid references organisations(id) on delete cascade,

  -- Étapes de la checklist (true = complété)
  step_first_vehicle    boolean not null default false,  -- 1er véhicule ajouté
  step_first_creneau    boolean not null default false,  -- 1er créneau ouvert
  step_first_alert      boolean not null default false,  -- 1ère alerte résolue
  step_invite_member    boolean not null default false,  -- 1 membre invité
  step_first_report     boolean not null default false,  -- 1er rapport consulté

  -- Métadonnées de progression
  completed_steps       int not null default 0,          -- 0-5
  completed_at          timestamptz,                      -- null = pas encore terminé
  first_value_at        timestamptz,                      -- horodatage du 1er "aha moment"
  last_activity_at      timestamptz default now(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  unique(user_id)
);

create index if not exists idx_activation_user    on activation_progress(user_id);
create index if not exists idx_activation_org     on activation_progress(org_id);
create index if not exists idx_activation_steps   on activation_progress(completed_steps);

alter table activation_progress enable row level security;

drop policy if exists "Lecture propre ligne" on activation_progress;
drop policy if exists "Mise à jour propre ligne" on activation_progress;
drop policy if exists "Insertion propre ligne" on activation_progress;

create policy "Lecture propre ligne"
  on activation_progress for select
  using (auth.uid() = user_id);

create policy "Mise à jour propre ligne"
  on activation_progress for update
  using (auth.uid() = user_id);

create policy "Insertion propre ligne"
  on activation_progress for insert
  with check (auth.uid() = user_id);

create table if not exists conversion_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  org_id     uuid references organisations(id) on delete cascade,
  event_type text not null,
  step_name  text,
  metadata   jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_conv_user on conversion_events(user_id, created_at desc);
create index if not exists idx_conv_type on conversion_events(event_type);

alter table conversion_events enable row level security;
drop policy if exists "Insert propre" on conversion_events;
drop policy if exists "Select propre" on conversion_events;

create policy "Insert propre" on conversion_events for insert with check (auth.uid() = user_id);
create policy "Select propre" on conversion_events for select using (auth.uid() = user_id);

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_activation_updated_at on activation_progress;
create trigger trg_activation_updated_at
  before update on activation_progress
  for each row execute function touch_updated_at();

create or replace function init_activation_progress(
  p_user_id uuid,
  p_org_id  uuid default null
)
returns void language plpgsql security definer as $$
begin
  insert into activation_progress(user_id, org_id)
  values (p_user_id, p_org_id)
  on conflict (user_id) do nothing;
end; $$;

create or replace function complete_activation_step(
  p_user_id  uuid,
  p_step     text
)
returns jsonb language plpgsql security definer as $$
declare
  v_row    activation_progress%rowtype;
begin
  perform init_activation_progress(p_user_id);

  execute format(
    'update activation_progress
     set step_%I = true,
         last_activity_at = now(),
         first_value_at = coalesce(first_value_at, case when step_%I = false then now() end)
     where user_id = $1',
    p_step, p_step
  ) using p_user_id;

  update activation_progress
  set completed_steps = (
    (step_first_vehicle::int) +
    (step_first_creneau::int) +
    (step_first_alert::int) +
    (step_invite_member::int) +
    (step_first_report::int)
  ),
  completed_at = case
    when (
      step_first_vehicle and step_first_creneau and step_first_alert
      and step_invite_member and step_first_report
    ) then coalesce(completed_at, now())
    else null
  end
  where user_id = p_user_id
  returning * into v_row;

  insert into conversion_events(user_id, org_id, event_type, step_name)
  values (p_user_id, v_row.org_id, 'step_completed', p_step);

  return jsonb_build_object(
    'completed_steps', v_row.completed_steps,
    'all_done',        v_row.completed_at is not null,
    'first_value_at',  v_row.first_value_at
  );
end; $$;

grant execute on function complete_activation_step(uuid, text) to authenticated;
grant execute on function init_activation_progress(uuid, uuid)  to authenticated;

create or replace view v_activation_status as
select
  ap.*,
  extract(day from now() - ap.created_at)::int          as days_since_signup,
  p.full_name,
  null::text                                           as avatar_url,
  null::text                                           as role,
  case when ap.first_value_at is not null
       and extract(day from ap.first_value_at - ap.created_at) = 0
  then true else false end                              as j1_quick_win,
  case
    when ap.completed_steps = 0 and extract(day from now() - ap.created_at) >= 3  then 'high'
    when ap.completed_steps <= 1 and extract(day from now() - ap.created_at) >= 7  then 'high'
    when ap.completed_steps <= 2 and extract(day from now() - ap.created_at) >= 14 then 'medium'
    else 'low'
  end                                                   as churn_risk
from activation_progress ap
left join profils p on p.user_id = ap.user_id;

grant select on v_activation_status to authenticated;
