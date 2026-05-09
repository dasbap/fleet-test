create table if not exists public.funnel_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  step smallint null check (step between 1 and 4),
  status text null,
  context jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.funnel_events enable row level security;

drop policy if exists "funnel events owner read" on public.funnel_events;
create policy "funnel events owner read"
  on public.funnel_events
  for select
  using (auth.uid() = user_id);

drop policy if exists "funnel events owner insert" on public.funnel_events;
create policy "funnel events owner insert"
  on public.funnel_events
  for insert
  with check (auth.uid() = user_id);

create index if not exists idx_funnel_events_org_time on public.funnel_events(org_id, occurred_at desc);
create index if not exists idx_funnel_events_org_type on public.funnel_events(org_id, event_type, step);

create or replace function public.track_funnel_event(
  p_org_id uuid,
  p_event_type text,
  p_step smallint default null,
  p_status text default null,
  p_context jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Utilisateur non authentifié';
  end if;

  insert into public.funnel_events (org_id, user_id, event_type, step, status, context, occurred_at)
  values (p_org_id, v_user_id, p_event_type, p_step, p_status, coalesce(p_context, '{}'::jsonb), p_occurred_at);
end;
$$;

create or replace function public.get_funnel_metrics(
  p_org_id uuid,
  p_days integer default 30
)
returns jsonb
language sql
security definer
set search_path = public
as $$
with scoped as (
  select *
  from public.funnel_events
  where org_id = p_org_id
    and occurred_at >= now() - make_interval(days => greatest(1, p_days))
),
step_stats as (
  select
    step,
    count(distinct user_id) filter (where event_type = 'onboarding_step_view') as views,
    count(distinct user_id) filter (
      where event_type in ('onboarding_step_completed', 'onboarding_completed')
    ) as completions
  from scoped
  where step between 1 and 4
  group by step
),
attempt_stats as (
  select
    count(*) filter (where event_type = 'one_click_attempt') as attempts,
    count(*) filter (where event_type = 'one_click_success') as successes
  from scoped
),
first_step_view as (
  select user_id, min(occurred_at) as first_view_at
  from scoped
  where event_type = 'onboarding_step_view' and step = 1
  group by user_id
),
first_success as (
  select user_id, min(occurred_at) as first_success_at
  from scoped
  where event_type = 'one_click_success'
  group by user_id
),
ttv as (
  select avg(extract(epoch from (s.first_success_at - v.first_view_at))) as avg_seconds
  from first_step_view v
  join first_success s using (user_id)
  where s.first_success_at >= v.first_view_at
)
select jsonb_build_object(
  'windowDays', greatest(1, p_days),
  'onboardingStep1DropRate', coalesce(round(((
    (select views from step_stats where step = 1) - (select completions from step_stats where step = 1)
  ) * 100.0) / nullif((select views from step_stats where step = 1), 0), 1), 0),
  'onboardingStep2DropRate', coalesce(round(((
    (select views from step_stats where step = 2) - (select completions from step_stats where step = 2)
  ) * 100.0) / nullif((select views from step_stats where step = 2), 0), 1), 0),
  'onboardingStep3DropRate', coalesce(round(((
    (select views from step_stats where step = 3) - (select completions from step_stats where step = 3)
  ) * 100.0) / nullif((select views from step_stats where step = 3), 0), 1), 0),
  'onboardingStep4DropRate', coalesce(round(((
    (select views from step_stats where step = 4) - (select completions from step_stats where step = 4)
  ) * 100.0) / nullif((select views from step_stats where step = 4), 0), 1), 0),
  'oneClickAttemptCount', coalesce((select attempts from attempt_stats), 0),
  'oneClickSuccessCount', coalesce((select successes from attempt_stats), 0),
  'oneClickSuccessRate', coalesce(round(((select successes from attempt_stats) * 100.0) / nullif((select attempts from attempt_stats), 0), 1), 0),
  'avgTimeToValueSeconds', coalesce(round((select avg_seconds from ttv), 0), 0)
);
$$;

