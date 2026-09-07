create table if not exists public.demo_verification_email_queue (
  email text primary key,
  requested_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'sending', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  updated_at timestamptz not null default now()
);

create table if not exists public.demo_verification_email_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  reserved_at timestamptz not null default now(),
  sent_at timestamptz,
  status text not null default 'reserved' check (status in ('reserved', 'sent', 'failed')),
  error text
);

create index if not exists demo_verification_email_attempts_email_sent_idx
  on public.demo_verification_email_attempts (email, sent_at desc);

create index if not exists demo_verification_email_attempts_quota_idx
  on public.demo_verification_email_attempts (reserved_at, status);

create index if not exists demo_verification_email_queue_pending_idx
  on public.demo_verification_email_queue (available_at, requested_at)
  where status = 'pending';

alter table public.demo_verification_email_queue enable row level security;
alter table public.demo_verification_email_attempts enable row level security;

create or replace function public.demo_reserve_verification_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_last_sent timestamptz;
  v_used integer;
  v_reservation uuid;
  v_retry integer;
  v_tomorrow timestamptz := date_trunc('day', now()) + interval '1 day' + interval '5 minutes';
begin
  if v_email = '' or position('@' in v_email) = 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  perform pg_advisory_xact_lock(hashtext('demo_verification_email_quota'));

  update public.demo_verification_email_attempts
  set status = 'failed', error = coalesce(error, 'reservation_timeout')
  where status = 'reserved' and reserved_at < now() - interval '10 minutes';

  select max(sent_at) into v_last_sent
  from public.demo_verification_email_attempts
  where email = v_email and status = 'sent';

  if v_last_sent is not null and v_last_sent > now() - interval '3 minutes' then
    v_retry := greatest(1, ceil(extract(epoch from ((v_last_sent + interval '3 minutes') - now())))::integer);
    return jsonb_build_object('ok', true, 'action', 'cooldown', 'retry_after_seconds', v_retry);
  end if;

  select count(*) into v_used
  from public.demo_verification_email_attempts
  where status in ('reserved', 'sent')
    and reserved_at >= date_trunc('day', now())
    and reserved_at < date_trunc('day', now()) + interval '1 day';

  if v_used >= 300 then
    insert into public.demo_verification_email_queue(email, requested_at, available_at, status, updated_at)
    values (v_email, now(), v_tomorrow, 'pending', now())
    on conflict (email) do update
      set requested_at = excluded.requested_at,
          available_at = least(public.demo_verification_email_queue.available_at, excluded.available_at),
          status = 'pending',
          updated_at = now();

    return jsonb_build_object('ok', true, 'action', 'queued', 'available_at', v_tomorrow);
  end if;

  insert into public.demo_verification_email_attempts(email, status)
  values (v_email, 'reserved')
  returning id into v_reservation;

  return jsonb_build_object('ok', true, 'action', 'send', 'reservation_id', v_reservation);
end;
$$;

create or replace function public.demo_claim_verification_email_queue(p_limit integer default 100)
returns table(reservation_id uuid, email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
  v_remaining integer;
begin
  perform pg_advisory_xact_lock(hashtext('demo_verification_email_quota'));

  update public.demo_verification_email_attempts
  set status = 'failed', error = coalesce(error, 'reservation_timeout')
  where status = 'reserved' and reserved_at < now() - interval '10 minutes';

  update public.demo_verification_email_queue q
  set status = 'pending', updated_at = now()
  where q.status = 'sending'
    and q.updated_at < now() - interval '10 minutes';

  select count(*) into v_used
  from public.demo_verification_email_attempts
  where status in ('reserved', 'sent')
    and reserved_at >= date_trunc('day', now())
    and reserved_at < date_trunc('day', now()) + interval '1 day';

  v_remaining := greatest(0, least(coalesce(p_limit, 100), 300 - v_used));
  if v_remaining = 0 then
    return;
  end if;

  return query
  with candidates as (
    select q.email
    from public.demo_verification_email_queue q
    where q.status = 'pending' and q.available_at <= now()
    order by q.requested_at asc
    for update skip locked
    limit v_remaining
  ), marked as (
    update public.demo_verification_email_queue q
    set status = 'sending', attempts = q.attempts + 1, updated_at = now()
    from candidates c
    where q.email = c.email
    returning q.email
  ), reservations as (
    insert into public.demo_verification_email_attempts(email, status)
    select m.email, 'reserved' from marked m
    returning id, demo_verification_email_attempts.email
  )
  select r.id, r.email from reservations r;
end;
$$;

create or replace function public.demo_complete_verification_email(
  p_reservation_id uuid,
  p_success boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_attempts integer;
begin
  select email into v_email
  from public.demo_verification_email_attempts
  where id = p_reservation_id
  for update;

  if v_email is null then
    return;
  end if;

  if p_success then
    update public.demo_verification_email_attempts
    set status = 'sent', sent_at = now(), error = null
    where id = p_reservation_id;

    delete from public.demo_verification_email_queue where email = v_email;
    return;
  end if;

  update public.demo_verification_email_attempts
  set status = 'failed', error = left(coalesce(p_error, 'send_failed'), 500)
  where id = p_reservation_id;

  select coalesce(attempts, 0) into v_attempts
  from public.demo_verification_email_queue
  where email = v_email;

  insert into public.demo_verification_email_queue(email, requested_at, available_at, status, attempts, last_error, updated_at)
  values (
    v_email,
    now(),
    date_trunc('day', now()) + interval '1 day' + interval '5 minutes',
    case when coalesce(v_attempts, 0) >= 5 then 'failed' else 'pending' end,
    coalesce(v_attempts, 0),
    left(coalesce(p_error, 'send_failed'), 500),
    now()
  )
  on conflict (email) do update
    set available_at = excluded.available_at,
        status = case when public.demo_verification_email_queue.attempts >= 5 then 'failed' else 'pending' end,
        last_error = excluded.last_error,
        updated_at = now();
end;
$$;

revoke all on function public.demo_reserve_verification_email(text) from public, anon, authenticated;
revoke all on function public.demo_claim_verification_email_queue(integer) from public, anon, authenticated;
revoke all on function public.demo_complete_verification_email(uuid, boolean, text) from public, anon, authenticated;

grant execute on function public.demo_reserve_verification_email(text) to service_role;
grant execute on function public.demo_claim_verification_email_queue(integer) to service_role;
grant execute on function public.demo_complete_verification_email(uuid, boolean, text) to service_role;
