-- Corrige la FK org_id de onboarding_progress vers public.organisations (nom canonique du schéma).
do $$
declare
  r record;
begin
  if to_regclass('public.onboarding_progress') is null then
    return;
  end if;

  for r in (
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'onboarding_progress'
      and c.contype = 'f'
      and exists (
        select 1
        from unnest(c.conkey) as key_att(attnum)
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = key_att.attnum
        where a.attname = 'org_id'
      )
  ) loop
    execute format('alter table public.onboarding_progress drop constraint %I', r.conname);
  end loop;
end $$;

do $$
begin
  if to_regclass('public.onboarding_progress') is not null then
    alter table public.onboarding_progress
      add constraint onboarding_progress_org_id_fkey
      foreign key (org_id) references public.organisations(id) on delete cascade;
  end if;
end $$;

-- Journal des relances rétention (anti-spam). Accès client refusé par défaut (RLS sans politique).
create table if not exists public.retention_nudge_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade,
  kind text not null default 'onboarding_incomplete',
  sent_at timestamptz not null default now()
);

create index if not exists idx_retention_nudge_log_user_org_sent
  on public.retention_nudge_log (user_id, org_id, sent_at desc);

alter table public.retention_nudge_log enable row level security;

-- Aucune politique : anon/authenticated n'ont pas accès ; le rôle service (Edge Function) bypass la RLS.

comment on table public.retention_nudge_log is
  'Traces des relances rétention envoyées (Edge Function service role uniquement côté accès effectif).';
