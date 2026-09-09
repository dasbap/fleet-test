create table if not exists public.email_delivery_settings (
  id boolean primary key default true check (id),
  provider text not null default 'resend',
  plan_name text not null default 'free',
  provider_daily_limit integer not null default 100 check (provider_daily_limit > 0),
  provider_monthly_limit integer not null default 3000 check (provider_monthly_limit > 0),
  safety_daily_limit integer not null default 95 check (safety_daily_limit > 0),
  safety_monthly_limit integer not null default 2900 check (safety_monthly_limit > 0),
  requests_per_second integer not null default 10 check (requests_per_second > 0),
  updated_at timestamptz not null default now(),
  check (safety_daily_limit <= provider_daily_limit),
  check (safety_monthly_limit <= provider_monthly_limit)
);

insert into public.email_delivery_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.email_send_reservations (
  queue_id uuid primary key references public.notification_queue(id) on delete cascade,
  reserved_at timestamptz not null default now()
);

create index if not exists email_send_reservations_reserved_at_idx
  on public.email_send_reservations (reserved_at);

alter table public.email_delivery_settings enable row level security;
alter table public.email_send_reservations enable row level security;

revoke all on public.email_delivery_settings from anon, authenticated;
revoke all on public.email_send_reservations from anon, authenticated;

grant select on public.email_delivery_settings to service_role;
grant select, insert, delete on public.email_send_reservations to service_role;

create or replace function public.reserve_notification_email_send(p_queue_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.email_delivery_settings;
  v_day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_month_start timestamptz := date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
  v_today integer;
  v_month integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  perform pg_advisory_xact_lock(hashtext('email_delivery_budget'));

  if exists (select 1 from public.email_send_reservations where queue_id = p_queue_id) then
    return jsonb_build_object('ok', true, 'already_reserved', true);
  end if;

  if not exists (
    select 1 from public.notification_queue
    where id = p_queue_id and status = 'pending'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'queue_item_not_pending');
  end if;

  select * into v_settings
  from public.email_delivery_settings
  where id = true;

  select count(*)::integer into v_today
  from public.email_send_reservations
  where reserved_at >= v_day_start;

  select count(*)::integer into v_month
  from public.email_send_reservations
  where reserved_at >= v_month_start;

  if v_today >= v_settings.safety_daily_limit then
    return jsonb_build_object(
      'ok', false,
      'reason', 'daily_limit_reached',
      'used', v_today,
      'limit', v_settings.safety_daily_limit
    );
  end if;

  if v_month >= v_settings.safety_monthly_limit then
    return jsonb_build_object(
      'ok', false,
      'reason', 'monthly_limit_reached',
      'used', v_month,
      'limit', v_settings.safety_monthly_limit
    );
  end if;

  insert into public.email_send_reservations (queue_id)
  values (p_queue_id)
  on conflict (queue_id) do nothing;

  return jsonb_build_object(
    'ok', true,
    'daily_used', v_today + 1,
    'daily_limit', v_settings.safety_daily_limit,
    'monthly_used', v_month + 1,
    'monthly_limit', v_settings.safety_monthly_limit
  );
end;
$$;

grant execute on function public.reserve_notification_email_send(uuid) to service_role;

create or replace function public.admin_get_email_delivery_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.email_delivery_settings;
  v_day_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_month_start timestamptz := date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
  v_today integer;
  v_month integer;
  v_pending integer;
  v_abandoned integer;
  v_oldest timestamptz;
begin
  if not public.support_current_user_is_admin() then
    raise exception 'forbidden';
  end if;

  select * into v_settings
  from public.email_delivery_settings
  where id = true;

  select count(*)::integer into v_today
  from public.email_send_reservations
  where reserved_at >= v_day_start;

  select count(*)::integer into v_month
  from public.email_send_reservations
  where reserved_at >= v_month_start;

  select count(*)::integer, min(created_at)
  into v_pending, v_oldest
  from public.notification_queue
  where status = 'pending';

  select count(*)::integer into v_abandoned
  from public.notification_queue
  where status = 'abandoned';

  return jsonb_build_object(
    'provider', v_settings.provider,
    'plan_name', v_settings.plan_name,
    'provider_daily_limit', v_settings.provider_daily_limit,
    'provider_monthly_limit', v_settings.provider_monthly_limit,
    'safety_daily_limit', v_settings.safety_daily_limit,
    'safety_monthly_limit', v_settings.safety_monthly_limit,
    'requests_per_second', v_settings.requests_per_second,
    'daily_used', v_today,
    'daily_remaining', greatest(v_settings.safety_daily_limit - v_today, 0),
    'monthly_used', v_month,
    'monthly_remaining', greatest(v_settings.safety_monthly_limit - v_month, 0),
    'pending', v_pending,
    'abandoned', v_abandoned,
    'oldest_pending_at', v_oldest,
    'day_resets_at', v_day_start + interval '1 day',
    'month_resets_at', v_month_start + interval '1 month'
  );
end;
$$;

grant execute on function public.admin_get_email_delivery_stats() to authenticated, service_role;
