-- Restore push notification token storage for mobile runtime.
-- Idempotent: safe to re-run on prod/staging.

create table if not exists public.notification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('web', 'ios', 'android')),
  device_info jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create unique index if not exists notification_tokens_token_key
  on public.notification_tokens (token);

create index if not exists notification_tokens_user_id_idx
  on public.notification_tokens (user_id);

create or replace function public.set_notification_tokens_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_notification_tokens_set_updated_at
  on public.notification_tokens;

create trigger trg_notification_tokens_set_updated_at
  before update on public.notification_tokens
  for each row
  execute procedure public.set_notification_tokens_updated_at();

alter table public.notification_tokens enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_tokens'
      and policyname = 'notification_tokens_select_own'
  ) then
    create policy notification_tokens_select_own
      on public.notification_tokens
      for select
      using (auth.uid() = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_tokens'
      and policyname = 'notification_tokens_insert_own'
  ) then
    create policy notification_tokens_insert_own
      on public.notification_tokens
      for insert
      with check (auth.uid() = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_tokens'
      and policyname = 'notification_tokens_update_own'
  ) then
    create policy notification_tokens_update_own
      on public.notification_tokens
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end;
$$;

grant select, insert, update on public.notification_tokens to authenticated;
grant all on public.notification_tokens to service_role;

notify pgrst, 'reload schema';
