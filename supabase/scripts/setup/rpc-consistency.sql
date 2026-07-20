-- =====================================================
-- FONCTIONS RPC POUR VÉRIFICATION ET NETTOYAGE DE COHÉRENCE
-- Smart Fleet Africa
-- =====================================================
-- Exécutez ce fichier dans Supabase SQL Editor
-- =====================================================

-- Table d'audit pour logger les opérations de nettoyage
create table if not exists database_cleanup_audit (
  id uuid primary key default gen_random_uuid(),
  operation_type text not null,
  table_name text not null,
  record_id uuid,
  record_details jsonb,
  dry_run boolean not null default true,
  executed_by uuid references auth.users(id),
  executed_at timestamptz not null default now()
);

create index if not exists idx_cleanup_audit_executed_at on database_cleanup_audit(executed_at);
create index if not exists idx_cleanup_audit_table_name on database_cleanup_audit(table_name);

-- =====================================================
-- FONCTION: Vérification des données orphelines
-- =====================================================

create or replace function check_orphaned_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'fleets_without_org', (
      select count(*) from fleets f
      left join orgs o on f.org_id = o.id
      where o.id is null
    ),
    'vehicles_without_fleet', (
      select count(*) from vehicles v
      left join fleets f on v.fleet_id = f.id
      where f.id is null
    ),
    'memberships_without_fleet', (
      select count(*) from fleet_memberships fm
      left join fleets f on fm.fleet_id = f.id
      where f.id is null
    ),
    'memberships_without_user', (
      select count(*) from fleet_memberships fm
      left join auth.users u on fm.user_id = u.id
      where u.id is null
    ),
    'assignments_without_vehicle', (
      select jsonb_agg(jsonb_build_object(
        'id', dva.id,
        'fleet_id', dva.fleet_id,
        'driver_user_id', dva.driver_user_id
      ))
      from driver_vehicle_assignments dva
      left join vehicles v on dva.vehicle_id = v.id
      where v.id is null
    ),
    'assignments_without_driver', (
      select jsonb_agg(jsonb_build_object(
        'id', dva.id,
        'vehicle_id', dva.vehicle_id,
        'fleet_id', dva.fleet_id
      ))
      from driver_vehicle_assignments dva
      left join auth.users u on dva.driver_user_id = u.id
      where u.id is null
    ),
    'shifts_without_assignment', (
      select jsonb_agg(jsonb_build_object(
        'id', ds.id,
        'assignment_id', ds.assignment_id
      ))
      from driver_shifts ds
      left join driver_vehicle_assignments dva on ds.assignment_id = dva.id
      where dva.id is null
    ),
    'closures_without_shift', (
      select jsonb_agg(jsonb_build_object(
        'id', dsc.id,
        'shift_id', dsc.shift_id
      ))
      from driver_shift_closures dsc
      left join driver_shifts ds on dsc.shift_id = ds.id
      where ds.id is null
    ),
    'incidents_without_vehicle', (
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'vehicle_id', i.vehicle_id
      ))
      from incidents i
      left join vehicles v on i.vehicle_id = v.id
      where v.id is null
    ),
    'maintenance_jobs_without_vehicle', (
      select jsonb_agg(jsonb_build_object(
        'id', mj.id,
        'vehicle_id', mj.vehicle_id
      ))
      from maintenance_jobs mj
      left join vehicles v on mj.vehicle_id = v.id
      where v.id is null
    ),
    'maintenance_jobs_without_fleet', (
      select jsonb_agg(jsonb_build_object(
        'id', mj.id,
        'fleet_id', mj.fleet_id
      ))
      from maintenance_jobs mj
      left join fleets f on mj.fleet_id = f.id
      where f.id is null
    ),
    'maintenance_evidence_without_job', (
      select jsonb_agg(jsonb_build_object(
        'id', me.id,
        'job_id', me.job_id
      ))
      from maintenance_evidence me
      left join maintenance_jobs mj on me.job_id = mj.id
      where mj.id is null
    ),
    'subscriptions_without_fleet', (
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'fleet_id', s.fleet_id
      ))
      from subscriptions s
      left join fleets f on s.fleet_id = f.id
      where f.id is null
    ),
    'entitlements_without_vehicle', (
      select jsonb_agg(jsonb_build_object(
        'id', ve.id,
        'vehicle_id', ve.vehicle_id
      ))
      from vehicle_entitlements ve
      left join vehicles v on ve.vehicle_id = v.id
      where v.id is null
    )
  ) into result;
  
  return result;
end;
$$;

-- =====================================================
-- FONCTION: Vérification des incohérences logiques
-- =====================================================

create or replace function check_logical_inconsistencies()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'active_assignments_with_ends_at', (
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'ends_at', ends_at
      ))
      from driver_vehicle_assignments
      where is_active = true and ends_at is not null
    ),
    'closed_shifts_without_km_end', (
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'km_start', km_start
      ))
      from driver_shifts
      where status = 'closed' and km_end is null
    ),
    'closed_shifts_without_ended_at', (
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'started_at', started_at
      ))
      from driver_shifts
      where status = 'closed' and ended_at is null
    ),
    'open_shifts_with_ended_at', (
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'ended_at', ended_at
      ))
      from driver_shifts
      where status = 'open' and ended_at is not null
    ),
    'validated_closures_without_validator', (
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'shift_id', shift_id
      ))
      from driver_shift_closures
      where status = 'validated' and validated_by is null
    ),
    'validated_closures_without_validated_at', (
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'shift_id', shift_id
      ))
      from driver_shift_closures
      where status = 'validated' and validated_at is null
    ),
    'shifts_with_km_end_less_than_km_start', (
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'km_start', km_start,
        'km_end', km_end
      ))
      from driver_shifts
      where km_end is not null and km_end < km_start
    ),
    'vehicles_with_negative_km', (
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'registration', registration,
        'current_km', current_km
      ))
      from vehicles
      where current_km < 0
    ),
    'maintenance_jobs_closed_without_closed_at', (
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'status', status
      ))
      from maintenance_jobs
      where status in ('ready', 'blocked') and closed_at is null
    ),
    'expired_invitations_still_usable', (
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'code', code,
        'expires_at', expires_at,
        'current_uses', current_uses,
        'max_uses', max_uses
      ))
      from fleet_invitations
      where expires_at < now() 
        and max_uses is not null 
        and current_uses < max_uses
    )
  ) into result;
  
  return result;
end;
$$;

-- =====================================================
-- FONCTION: Vérification des violations de contraintes
-- =====================================================

create or replace function check_constraint_violations()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'duplicate_vehicle_registrations', (
      select jsonb_agg(jsonb_build_object(
        'fleet_id', fleet_id,
        'registration', registration,
        'count', count
      ))
      from (
        select fleet_id, registration, count(*) as count
        from vehicles
        group by fleet_id, registration
        having count(*) > 1
      ) duplicates
    ),
    'duplicate_invitation_codes', (
      select jsonb_agg(jsonb_build_object(
        'code', code,
        'count', count
      ))
      from (
        select code, count(*) as count
        from fleet_invitations
        group by code
        having count(*) > 1
      ) duplicates
    ),
    'duplicate_memberships', (
      select jsonb_agg(jsonb_build_object(
        'fleet_id', fleet_id,
        'user_id', user_id,
        'role', role,
        'count', count
      ))
      from (
        select fleet_id, user_id, role, count(*) as count
        from fleet_memberships
        group by fleet_id, user_id, role
        having count(*) > 1
      ) duplicates
    )
  ) into result;
  
  return result;
end;
$$;

-- =====================================================
-- FONCTION: Statistiques générales de la base de données
-- =====================================================

create or replace function get_database_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'orgs', (select count(*) from orgs),
    'fleets', (select count(*) from fleets),
    'profiles', (select count(*) from profiles),
    'fleet_memberships', (select count(*) from fleet_memberships),
    'fleet_invitations', (select count(*) from fleet_invitations),
    'vehicles', (select count(*) from vehicles),
    'driver_vehicle_assignments', (select count(*) from driver_vehicle_assignments),
    'active_assignments', (select count(*) from driver_vehicle_assignments where is_active = true),
    'driver_shifts', (select count(*) from driver_shifts),
    'open_shifts', (select count(*) from driver_shifts where status = 'open'),
    'closed_shifts', (select count(*) from driver_shifts where status = 'closed'),
    'driver_shift_closures', (select count(*) from driver_shift_closures),
    'pending_closures', (select count(*) from driver_shift_closures where status = 'pending'),
    'validated_closures', (select count(*) from driver_shift_closures where status = 'validated'),
    'incidents', (select count(*) from incidents),
    'maintenance_jobs', (select count(*) from maintenance_jobs),
    'queued_maintenance', (select count(*) from maintenance_jobs where status = 'queued'),
    'in_progress_maintenance', (select count(*) from maintenance_jobs where status = 'in_progress'),
    'maintenance_evidence', (select count(*) from maintenance_evidence),
    'maintenance_checklists', (select count(*) from maintenance_checklists),
    'plans', (select count(*) from plans),
    'payments', (select count(*) from payments),
    'subscriptions', (select count(*) from subscriptions),
    'vehicle_entitlements', (select count(*) from vehicle_entitlements),
    'qr_tokens', (select count(*) from qr_tokens),
    'expired_qr_tokens', (select count(*) from qr_tokens where expires_at < now())
  ) into result;
  
  return result;
end;
$$;

-- =====================================================
-- FONCTION: Nettoyage des données orphelines
-- =====================================================

create or replace function cleanup_orphaned_data(p_dry_run boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb := jsonb_build_object(
    'dry_run', p_dry_run,
    'deleted', jsonb_build_object(),
    'errors', jsonb_build_array()
  );
  v_deleted_count int;
  v_user_id uuid := auth.uid();
begin
  -- Nettoyer les closures sans shift
  if not p_dry_run then
    delete from driver_shift_closures dsc
    where not exists (
      select 1 from driver_shifts ds where ds.id = dsc.shift_id
    );
    get diagnostics v_deleted_count = row_count;
    
    if v_deleted_count > 0 then
      insert into database_cleanup_audit (operation_type, table_name, dry_run, executed_by)
      values ('cleanup', 'driver_shift_closures', false, v_user_id);
      v_result := jsonb_set(v_result, '{deleted,driver_shift_closures}', to_jsonb(v_deleted_count));
    end if;
  else
    select count(*) into v_deleted_count
    from driver_shift_closures dsc
    where not exists (
      select 1 from driver_shifts ds where ds.id = dsc.shift_id
    );
    v_result := jsonb_set(v_result, '{deleted,driver_shift_closures}', to_jsonb(v_deleted_count));
  end if;

  -- Nettoyer les shifts sans assignment
  if not p_dry_run then
    delete from driver_shifts ds
    where not exists (
      select 1 from driver_vehicle_assignments dva where dva.id = ds.assignment_id
    );
    get diagnostics v_deleted_count = row_count;
    
    if v_deleted_count > 0 then
      insert into database_cleanup_audit (operation_type, table_name, dry_run, executed_by)
      values ('cleanup', 'driver_shifts', false, v_user_id);
      v_result := jsonb_set(v_result, '{deleted,driver_shifts}', to_jsonb(v_deleted_count));
    end if;
  else
    select count(*) into v_deleted_count
    from driver_shifts ds
    where not exists (
      select 1 from driver_vehicle_assignments dva where dva.id = ds.assignment_id
    );
    v_result := jsonb_set(v_result, '{deleted,driver_shifts}', to_jsonb(v_deleted_count));
  end if;

  -- Nettoyer les assignments sans vehicle
  if not p_dry_run then
    delete from driver_vehicle_assignments dva
    where not exists (
      select 1 from vehicles v where v.id = dva.vehicle_id
    );
    get diagnostics v_deleted_count = row_count;
    
    if v_deleted_count > 0 then
      insert into database_cleanup_audit (operation_type, table_name, dry_run, executed_by)
      values ('cleanup', 'driver_vehicle_assignments', false, v_user_id);
      v_result := jsonb_set(v_result, '{deleted,driver_vehicle_assignments}', to_jsonb(v_deleted_count));
    end if;
  else
    select count(*) into v_deleted_count
    from driver_vehicle_assignments dva
    where not exists (
      select 1 from vehicles v where v.id = dva.vehicle_id
    );
    v_result := jsonb_set(v_result, '{deleted,driver_vehicle_assignments}', to_jsonb(v_deleted_count));
  end if;

  -- Nettoyer les maintenance_evidence sans job
  if not p_dry_run then
    delete from maintenance_evidence me
    where not exists (
      select 1 from maintenance_jobs mj where mj.id = me.job_id
    );
    get diagnostics v_deleted_count = row_count;
    
    if v_deleted_count > 0 then
      insert into database_cleanup_audit (operation_type, table_name, dry_run, executed_by)
      values ('cleanup', 'maintenance_evidence', false, v_user_id);
      v_result := jsonb_set(v_result, '{deleted,maintenance_evidence}', to_jsonb(v_deleted_count));
    end if;
  else
    select count(*) into v_deleted_count
    from maintenance_evidence me
    where not exists (
      select 1 from maintenance_jobs mj where mj.id = me.job_id
    );
    v_result := jsonb_set(v_result, '{deleted,maintenance_evidence}', to_jsonb(v_deleted_count));
  end if;

  -- Nettoyer les incidents sans vehicle
  if not p_dry_run then
    delete from incidents i
    where not exists (
      select 1 from vehicles v where v.id = i.vehicle_id
    );
    get diagnostics v_deleted_count = row_count;
    
    if v_deleted_count > 0 then
      insert into database_cleanup_audit (operation_type, table_name, dry_run, executed_by)
      values ('cleanup', 'incidents', false, v_user_id);
      v_result := jsonb_set(v_result, '{deleted,incidents}', to_jsonb(v_deleted_count));
    end if;
  else
    select count(*) into v_deleted_count
    from incidents i
    where not exists (
      select 1 from vehicles v where v.id = i.vehicle_id
    );
    v_result := jsonb_set(v_result, '{deleted,incidents}', to_jsonb(v_deleted_count));
  end if;

  -- Nettoyer les tokens QR expirés (plus de 30 jours)
  if not p_dry_run then
    delete from qr_tokens
    where expires_at < now() - interval '30 days';
    get diagnostics v_deleted_count = row_count;
    
    if v_deleted_count > 0 then
      insert into database_cleanup_audit (operation_type, table_name, dry_run, executed_by)
      values ('cleanup', 'qr_tokens', false, v_user_id);
      v_result := jsonb_set(v_result, '{deleted,qr_tokens}', to_jsonb(v_deleted_count));
    end if;
  else
    select count(*) into v_deleted_count
    from qr_tokens
    where expires_at < now() - interval '30 days';
    v_result := jsonb_set(v_result, '{deleted,qr_tokens}', to_jsonb(v_deleted_count));
  end if;

  return v_result;
end;
$$;

-- =====================================================
-- POLITIQUES RLS POUR LA TABLE D'AUDIT
-- =====================================================

alter table database_cleanup_audit enable row level security;

create policy audit_read_manager_org on database_cleanup_audit
for select using (
  exists (
    select 1 from fleet_memberships fm
    where (fm.role = 'manager' or fm.role = 'organizer')
      and fm.user_id = auth.uid()
      and fm.is_active = true
  )
);

create policy audit_insert_organizer on database_cleanup_audit
for insert with check (
  exists (
    select 1 from fleet_memberships fm
    where fm.role = 'organizer'
      and fm.user_id = auth.uid()
      and fm.is_active = true
  )
);

-- =====================================================
-- COMMENTAIRES
-- =====================================================

comment on function check_orphaned_data() is 'Vérifie et retourne toutes les données orphelines dans la base de données';
comment on function check_logical_inconsistencies() is 'Vérifie et retourne les incohérences logiques dans les données';
comment on function check_constraint_violations() is 'Détecte les violations de contraintes uniques';
comment on function get_database_stats() is 'Retourne les statistiques générales de la base de données';
comment on function cleanup_orphaned_data(boolean) is 'Nettoie les données orphelines. Mode dry_run=true pour simulation uniquement';
