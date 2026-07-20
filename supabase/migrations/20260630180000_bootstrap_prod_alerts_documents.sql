-- Production bootstrap for the runtime tables currently used by the app.
-- Scope: operational alerts, alert comments, and vehicle documents.
-- No demo/admin bypass: access is only based on active fleet roles.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'alert_type'
  ) then
    create type public.alert_type as enum (
      'missing_closure',
      'recurring_gap',
      'risky_driver',
      'vehicle_blocked',
      'maintenance_due',
      'document_expired',
      'failure_risk',
      'geofence_exit'
    );
  end if;
end;
$$;

alter type public.alert_type add value if not exists 'maintenance_due';
alter type public.alert_type add value if not exists 'document_expired';
alter type public.alert_type add value if not exists 'failure_risk';
alter type public.alert_type add value if not exists 'geofence_exit';

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'incident_workflow_status'
  ) then
    create type public.incident_workflow_status as enum ('NOUVEAU', 'EN_COURS', 'RESOLU');
  end if;
end;
$$;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.alertes_automatiques (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references public.flottes(id) on delete cascade,
  alert_type public.alert_type not null,
  driver_user_id uuid references auth.users(id) on delete set null,
  vehicle_id uuid references public.vehicules(id) on delete set null,
  shift_id uuid references public.creneaux_conducteurs(id) on delete set null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  message text not null,
  resolved boolean not null default false,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  status public.incident_workflow_status not null default 'NOUVEAU',
  assignee_user_id uuid references auth.users(id) on delete set null,
  assigned_at timestamptz,
  status_updated_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.alertes_automatiques
  add column if not exists status public.incident_workflow_status not null default 'NOUVEAU',
  add column if not exists assignee_user_id uuid,
  add column if not exists assigned_at timestamptz,
  add column if not exists status_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'alertes_automatiques_assignee_user_id_fkey'
  ) then
    alter table public.alertes_automatiques
      add constraint alertes_automatiques_assignee_user_id_fkey
      foreign key (assignee_user_id) references auth.users(id) on delete set null;
  end if;
end;
$$;

create table if not exists public.alert_comments (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.alertes_automatiques(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  fleet_id uuid not null references public.flottes(id) on delete cascade,
  vehicle_id uuid not null references public.vehicules(id) on delete cascade,
  doc_type text not null,
  doc_number text,
  issued_at date,
  expires_at date,
  issuer text,
  file_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_vehicle_documents_updated_at on public.vehicle_documents;
create trigger trg_vehicle_documents_updated_at
  before update on public.vehicle_documents
  for each row execute function public.update_updated_at_column();

create index if not exists idx_alertes_automatiques_fleet_resolved_created
  on public.alertes_automatiques(fleet_id, resolved, created_at desc);
create index if not exists idx_alertes_automatiques_vehicle_id
  on public.alertes_automatiques(vehicle_id);
create index if not exists idx_alertes_automatiques_status
  on public.alertes_automatiques(status);
create index if not exists idx_alert_comments_alert_id_created_at
  on public.alert_comments(alert_id, created_at desc);
create index if not exists idx_vehicle_documents_fleet_expires
  on public.vehicle_documents(fleet_id, expires_at)
  where expires_at is not null;
create index if not exists idx_vehicle_documents_vehicle_id
  on public.vehicle_documents(vehicle_id);

alter table public.alertes_automatiques enable row level security;
alter table public.alert_comments enable row level security;
alter table public.vehicle_documents enable row level security;

drop policy if exists alertes_automatiques_select_fleet_roles on public.alertes_automatiques;
create policy alertes_automatiques_select_fleet_roles on public.alertes_automatiques
for select to authenticated
using (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  or public.has_role(fleet_id, 'manager'::public.role_type)
  or public.has_role(fleet_id, 'mechanic'::public.role_type)
  or driver_user_id = auth.uid()
  or exists (
    select 1
    from public.affectations_vehicules a
    where a.vehicle_id = alertes_automatiques.vehicle_id
      and a.driver_user_id = auth.uid()
      and a.is_active = true
  )
);

drop policy if exists alertes_automatiques_insert_staff on public.alertes_automatiques;
create policy alertes_automatiques_insert_staff on public.alertes_automatiques
for insert to authenticated
with check (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  or public.has_role(fleet_id, 'manager'::public.role_type)
  or public.has_role(fleet_id, 'mechanic'::public.role_type)
);

drop policy if exists alertes_automatiques_update_staff on public.alertes_automatiques;
create policy alertes_automatiques_update_staff on public.alertes_automatiques
for update to authenticated
using (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  or public.has_role(fleet_id, 'manager'::public.role_type)
  or public.has_role(fleet_id, 'mechanic'::public.role_type)
)
with check (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  or public.has_role(fleet_id, 'manager'::public.role_type)
  or public.has_role(fleet_id, 'mechanic'::public.role_type)
);

drop policy if exists alertes_automatiques_delete_manager_org on public.alertes_automatiques;
create policy alertes_automatiques_delete_manager_org on public.alertes_automatiques
for delete to authenticated
using (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  or public.has_role(fleet_id, 'manager'::public.role_type)
);

drop policy if exists alert_comments_select_fleet_member on public.alert_comments;
create policy alert_comments_select_fleet_member on public.alert_comments
for select to authenticated
using (
  exists (
    select 1
    from public.alertes_automatiques a
    where a.id = alert_comments.alert_id
      and (
        public.has_role(a.fleet_id, 'organizer'::public.role_type)
        or public.has_role(a.fleet_id, 'manager'::public.role_type)
        or public.has_role(a.fleet_id, 'mechanic'::public.role_type)
        or a.driver_user_id = auth.uid()
        or exists (
          select 1
          from public.affectations_vehicules av
          where av.vehicle_id = a.vehicle_id
            and av.driver_user_id = auth.uid()
            and av.is_active = true
        )
      )
  )
);

drop policy if exists alert_comments_insert_fleet_member on public.alert_comments;
create policy alert_comments_insert_fleet_member on public.alert_comments
for insert to authenticated
with check (
  author_user_id = auth.uid()
  and exists (
    select 1
    from public.alertes_automatiques a
    where a.id = alert_comments.alert_id
      and (
        public.has_role(a.fleet_id, 'organizer'::public.role_type)
        or public.has_role(a.fleet_id, 'manager'::public.role_type)
        or public.has_role(a.fleet_id, 'mechanic'::public.role_type)
        or a.driver_user_id = auth.uid()
      )
  )
);

drop policy if exists vehicle_documents_select_fleet_roles on public.vehicle_documents;
create policy vehicle_documents_select_fleet_roles on public.vehicle_documents
for select to authenticated
using (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  or public.has_role(fleet_id, 'manager'::public.role_type)
  or public.has_role(fleet_id, 'mechanic'::public.role_type)
  or exists (
    select 1
    from public.affectations_vehicules a
    where a.vehicle_id = vehicle_documents.vehicle_id
      and a.driver_user_id = auth.uid()
      and a.is_active = true
  )
);

drop policy if exists vehicle_documents_insert_staff on public.vehicle_documents;
create policy vehicle_documents_insert_staff on public.vehicle_documents
for insert to authenticated
with check (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  or public.has_role(fleet_id, 'manager'::public.role_type)
  or public.has_role(fleet_id, 'mechanic'::public.role_type)
);

drop policy if exists vehicle_documents_update_staff on public.vehicle_documents;
create policy vehicle_documents_update_staff on public.vehicle_documents
for update to authenticated
using (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  or public.has_role(fleet_id, 'manager'::public.role_type)
  or public.has_role(fleet_id, 'mechanic'::public.role_type)
)
with check (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  or public.has_role(fleet_id, 'manager'::public.role_type)
  or public.has_role(fleet_id, 'mechanic'::public.role_type)
);

drop policy if exists vehicle_documents_delete_manager_org on public.vehicle_documents;
create policy vehicle_documents_delete_manager_org on public.vehicle_documents
for delete to authenticated
using (
  public.has_role(fleet_id, 'organizer'::public.role_type)
  or public.has_role(fleet_id, 'manager'::public.role_type)
);

create or replace function public.generer_alertes_automatiques(p_fleet_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alert_count int := 0;
  v_shift record;
  v_vehicle record;
begin
  if not (
    public.has_role(p_fleet_id, 'organizer'::public.role_type)
    or public.has_role(p_fleet_id, 'manager'::public.role_type)
    or public.has_role(p_fleet_id, 'mechanic'::public.role_type)
  ) then
    raise exception 'access_denied';
  end if;

  for v_shift in
    select c.id as shift_id, a.driver_user_id, a.vehicle_id
    from public.creneaux_conducteurs c
    join public.affectations_vehicules a on a.id = c.assignment_id
    left join public.clotures_creneaux cl on cl.shift_id = c.id
    where a.fleet_id = p_fleet_id
      and c.status = 'closed'
      and c.ended_at < now() - interval '24 hours'
      and cl.id is null
      and not exists (
        select 1
        from public.alertes_automatiques aa
        where aa.shift_id = c.id
          and aa.alert_type = 'missing_closure'
          and aa.resolved = false
      )
  loop
    insert into public.alertes_automatiques (
      fleet_id, alert_type, driver_user_id, vehicle_id, shift_id, severity, message
    )
    values (
      p_fleet_id,
      'missing_closure',
      v_shift.driver_user_id,
      v_shift.vehicle_id,
      v_shift.shift_id,
      'high',
      'Cloture manquante pour un creneau ferme depuis plus de 24h'
    );
    v_alert_count := v_alert_count + 1;
  end loop;

  for v_vehicle in
    select v.id as vehicle_id
    from public.vehicules v
    where v.fleet_id = p_fleet_id
      and v.status = 'blocked'
      and v.created_at < now() - interval '7 days'
      and not exists (
        select 1
        from public.alertes_automatiques aa
        where aa.vehicle_id = v.id
          and aa.alert_type = 'vehicle_blocked'
          and aa.resolved = false
          and aa.created_at >= now() - interval '7 days'
      )
  loop
    insert into public.alertes_automatiques (
      fleet_id, alert_type, vehicle_id, severity, message
    )
    values (
      p_fleet_id,
      'vehicle_blocked',
      v_vehicle.vehicle_id,
      'medium',
      'Vehicule bloque depuis plus de 7 jours'
    );
    v_alert_count := v_alert_count + 1;
  end loop;

  return v_alert_count;
end;
$$;

grant usage on type public.alert_type to authenticated;
grant usage on type public.incident_workflow_status to authenticated;
grant select, insert, update, delete on public.alertes_automatiques to authenticated;
grant select, insert on public.alert_comments to authenticated;
grant select, insert, update, delete on public.vehicle_documents to authenticated;
grant execute on function public.generer_alertes_automatiques(uuid) to authenticated;

notify pgrst, 'reload schema';
