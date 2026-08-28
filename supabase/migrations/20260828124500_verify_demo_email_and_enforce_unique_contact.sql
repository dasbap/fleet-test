alter table public.demo_requests
  add column if not exists verified_user_id uuid references auth.users(id) on delete set null;

update public.demo_requests
set email = lower(trim(email))
where email is not null;

create table if not exists public.demo_request_duplicate_archive (
  archive_id uuid primary key default gen_random_uuid(),
  original_id uuid not null,
  email text,
  payload jsonb not null,
  archived_at timestamptz not null default now()
);

alter table public.demo_request_duplicate_archive enable row level security;
revoke all on public.demo_request_duplicate_archive from anon, authenticated;

with ranked as (
  select d.*,
         row_number() over (partition by lower(d.email) order by d.created_at asc, d.id asc) as rn
  from public.demo_requests d
  where d.email is not null
)
insert into public.demo_request_duplicate_archive (original_id, email, payload)
select r.id, r.email, to_jsonb(r) - 'rn'
from ranked r
where r.rn > 1;

with ranked as (
  select id,
         row_number() over (partition by lower(email) order by created_at asc, id asc) as rn
  from public.demo_requests
  where email is not null
)
delete from public.demo_requests d
using ranked r
where d.id = r.id
  and r.rn > 1;

create unique index if not exists demo_requests_email_unique_idx
  on public.demo_requests (lower(email));

create unique index if not exists demo_requests_verified_user_unique_idx
  on public.demo_requests (verified_user_id)
  where verified_user_id is not null;

alter table public.demo_requests enable row level security;

revoke insert on public.demo_requests from anon;
grant insert on public.demo_requests to authenticated;

drop policy if exists demo_requests_insert_public on public.demo_requests;
drop policy if exists demo_requests_public_insert on public.demo_requests;
drop policy if exists demo_requests_insert_anon on public.demo_requests;
drop policy if exists demo_requests_insert_verified_email on public.demo_requests;

create policy demo_requests_insert_verified_email
  on public.demo_requests
  for insert
  to authenticated
  with check (
    verified_user_id = auth.uid()
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create or replace function public.demo_verified_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = auth, public
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
    and u.email_confirmed_at is not null
  limit 1;
$$;

revoke all on function public.demo_verified_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.demo_verified_user_id_by_email(text) to service_role;
