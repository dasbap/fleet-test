create table public.onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  step integer not null default 1,
  completed boolean not null default false,
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.onboarding_progress enable row level security;

create policy "org members only"
  on public.onboarding_progress
  for all using (auth.uid() = user_id);

create index on public.onboarding_progress (org_id);
