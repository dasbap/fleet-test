-- Table de stockage des jetons de push notifications (FCM / APNs)
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

-- Un jeton ne doit apparaître qu'une seule fois (un device logique)
create unique index if not exists notification_tokens_token_key
  on public.notification_tokens (token);

-- Index pour les recherches par utilisateur
create index if not exists notification_tokens_user_id_idx
  on public.notification_tokens (user_id);

-- Met à jour automatiquement updated_at
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

-- Activer RLS
alter table public.notification_tokens
  enable row level security;

-- Politique : chaque utilisateur ne voit que ses propres devices
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

-- Politique : insertion uniquement pour soi-même
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

-- Politique : mise à jour uniquement de ses propres jetons
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

