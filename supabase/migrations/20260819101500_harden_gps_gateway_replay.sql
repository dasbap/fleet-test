begin;

create table if not exists public.gps_gateway_nonces (
  gateway_id text not null,
  nonce text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (gateway_id, nonce),
  constraint gps_gateway_nonces_gateway_id_length check (char_length(gateway_id) between 1 and 128),
  constraint gps_gateway_nonces_nonce_format check (nonce ~ '^[0-9a-f]{32}$')
);

alter table public.gps_gateway_nonces enable row level security;

revoke all on table public.gps_gateway_nonces from public, anon, authenticated;
grant select, insert, delete on table public.gps_gateway_nonces to service_role;

create index if not exists idx_gps_gateway_nonces_expires_at
  on public.gps_gateway_nonces(expires_at);

create or replace function public.gps_claim_gateway_nonce(
  p_gateway_id text,
  p_nonce text,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;

  if p_gateway_id is null or char_length(p_gateway_id) < 1 or char_length(p_gateway_id) > 128 then
    return false;
  end if;

  if p_nonce is null or p_nonce !~ '^[0-9a-f]{32}$' then
    return false;
  end if;

  if p_expires_at is null or p_expires_at <= now() or p_expires_at > now() + interval '5 minutes' then
    return false;
  end if;

  delete from public.gps_gateway_nonces
  where expires_at <= now();

  insert into public.gps_gateway_nonces (gateway_id, nonce, expires_at)
  values (p_gateway_id, p_nonce, p_expires_at)
  on conflict (gateway_id, nonce) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted = 1;
end;
$$;

revoke all on function public.gps_claim_gateway_nonce(text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.gps_claim_gateway_nonce(text, text, timestamptz)
  to service_role;

notify pgrst, 'reload schema';

commit;
