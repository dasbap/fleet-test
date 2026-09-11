create table if not exists public.demo_rate_limits (
  key text not null,
  window_hour timestamptz not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (key, window_hour)
);

create index if not exists idx_demo_rate_limits_window
  on public.demo_rate_limits (window_hour);

alter table public.demo_rate_limits enable row level security;

drop policy if exists demo_rate_limits_no_public on public.demo_rate_limits;
create policy demo_rate_limits_no_public
  on public.demo_rate_limits
  as restrictive
  for all
  to authenticated
  using (false);

create or replace function public.demo_check_rate_limit(
  p_key text,
  p_max_count integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := date_trunc('hour', now());
  v_count integer;
begin
  delete from public.demo_rate_limits
  where window_hour < now() - interval '2 hours';

  insert into public.demo_rate_limits (key, window_hour, count, updated_at)
  values (p_key, v_window, 1, now())
  on conflict (key, window_hour) do update
    set count = public.demo_rate_limits.count + 1,
        updated_at = now()
  returning count into v_count;

  if v_count > p_max_count then
    update public.demo_rate_limits
    set count = count - 1
    where key = p_key and window_hour = v_window;

    return jsonb_build_object(
      'ok', false,
      'error', 'rate_limit_exceeded',
      'count', v_count - 1,
      'max', p_max_count,
      'reset_at', v_window + interval '1 hour'
    );
  end if;

  return jsonb_build_object('ok', true, 'count', v_count, 'max', p_max_count);
end;
$$;

revoke all on table public.demo_rate_limits from public, anon, authenticated;
grant all on table public.demo_rate_limits to service_role;

revoke execute on function public.demo_check_rate_limit(text, integer) from public, anon, authenticated;
grant execute on function public.demo_check_rate_limit(text, integer) to service_role;
