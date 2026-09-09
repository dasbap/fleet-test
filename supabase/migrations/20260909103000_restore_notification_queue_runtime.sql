create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid references public.flottes(id) on delete cascade,
  to_email text not null,
  template_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped', 'abandoned')),
  retry_count integer not null default 0,
  sent_at timestamptz,
  error_msg text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_queue_status_idx
  on public.notification_queue (status, created_at);

create index if not exists notification_queue_demo_request_idx
  on public.notification_queue ((metadata->>'request_id'), status)
  where template_id in ('demo_request_accepted', 'demo_request_refused');

alter table public.notification_queue enable row level security;

revoke all on table public.notification_queue from public, anon, authenticated;
grant all on table public.notification_queue to service_role;
