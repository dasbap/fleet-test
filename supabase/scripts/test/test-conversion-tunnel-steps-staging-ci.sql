-- Test staging orienté CI: retourne un tableau PASS/FAIL sans lever d'exception.
-- Le script est non destructif: transaction + ROLLBACK.
--
-- Colonnes de sortie:
-- - test_name: nom du scénario
-- - status: PASS | FAIL
-- - details: précision utile pour diagnostic CI

begin;

create temp table if not exists tmp_ci_results (
  test_name text not null,
  status text not null,
  details text not null
) on commit drop;

do $$
declare
  v_user_id uuid;
  v_org_id uuid;
  v_fleet_id uuid;
  v_vehicle_id uuid;
  v_assignment_id uuid;
  v_test_code text := 'TEST-CI-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_registration text := 'TCI-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_completed_steps int := -1;
  v_completed_at timestamptz;
  v_has_auth_users boolean;
begin
  -- En local, il est fréquent de ne pas avoir de seed. On crée un minimum viable si nécessaire.
  select exists(select 1 from auth.users) into v_has_auth_users;

  if not v_has_auth_users then
    insert into public.organisations(name, country_code)
    values ('Org Test CI (local)', 'CM')
    returning id into v_org_id;

    insert into public.flottes(org_id, name, collection_policy)
    values (v_org_id, 'Flotte Test CI (local)', 'mix')
    returning id into v_fleet_id;

    insert into auth.users(id, email)
    values (gen_random_uuid(), 'ci-local@smartfleet.invalid')
    returning id into v_user_id;

    insert into public.profils(user_id, full_name, phone)
    values (v_user_id, 'CI Local', null);

    insert into public.flotte_adhesions(fleet_id, user_id, role, is_active)
    values (v_fleet_id, v_user_id, 'organizer'::public.role_type, true);
  else
    select fa.user_id, fa.fleet_id, f.org_id
    into v_user_id, v_fleet_id, v_org_id
    from flotte_adhesions fa
    inner join flottes f on f.id = fa.fleet_id
    where fa.is_active = true
    order by fa.created_at asc
    limit 1;
  end if;

  if v_user_id is null then
    insert into tmp_ci_results(test_name, status, details)
    values ('precheck_user_membership', 'FAIL', 'Aucun utilisateur avec adhésion active trouvé');
    return;
  end if;

  insert into tmp_ci_results(test_name, status, details)
  values ('precheck_user_membership', 'PASS', 'Utilisateur de test staging sélectionné');

  perform init_activation_progress(v_user_id, v_org_id);

  update activation_progress
  set org_id = v_org_id,
      step_first_vehicle = false,
      step_first_creneau = false,
      step_first_alert = false,
      step_invite_member = false,
      step_first_report = false,
      completed_steps = 0,
      completed_at = null,
      first_value_at = null
  where user_id = v_user_id;

  -- first_vehicle
  insert into vehicules(fleet_id, registration, brand, model, current_km, status)
  values (v_fleet_id, v_registration, 'TestBrand', 'TestModel', 0, 'ok')
  returning id into v_vehicle_id;

  update activation_progress set last_activity_at = now() where user_id = v_user_id;

  insert into tmp_ci_results(test_name, status, details)
  select
    'step_first_vehicle',
    case when step_first_vehicle then 'PASS' else 'FAIL' end,
    case when step_first_vehicle then 'Step auto-complétée' else 'Step non complétée après création véhicule' end
  from activation_progress
  where user_id = v_user_id;

  -- first_creneau
  insert into affectations_vehicules(fleet_id, vehicle_id, driver_user_id, created_by, is_active)
  values (v_fleet_id, v_vehicle_id, v_user_id, v_user_id, true)
  returning id into v_assignment_id;

  insert into creneaux_conducteurs(assignment_id, km_start, status)
  values (v_assignment_id, 0, 'open');

  update activation_progress set last_activity_at = now() where user_id = v_user_id;

  insert into tmp_ci_results(test_name, status, details)
  select
    'step_first_creneau',
    case when step_first_creneau then 'PASS' else 'FAIL' end,
    case when step_first_creneau then 'Step auto-complétée' else 'Step non complétée après création créneau' end
  from activation_progress
  where user_id = v_user_id;

  -- first_alert
  insert into alertes_automatiques(fleet_id, alert_type, driver_user_id, vehicle_id, severity, message, resolved, resolved_by, resolved_at)
  values (v_fleet_id, 'risky_driver', v_user_id, v_vehicle_id, 'medium', 'Alerte test CI conversion', true, v_user_id, now());

  update activation_progress set last_activity_at = now() where user_id = v_user_id;

  insert into tmp_ci_results(test_name, status, details)
  select
    'step_first_alert',
    case when step_first_alert then 'PASS' else 'FAIL' end,
    case when step_first_alert then 'Step auto-complétée' else 'Step non complétée après alerte résolue' end
  from activation_progress
  where user_id = v_user_id;

  -- invite_member
  insert into flotte_invitations(fleet_id, code, created_by, max_uses)
  values (v_fleet_id, v_test_code, v_user_id, 1);

  update activation_progress set last_activity_at = now() where user_id = v_user_id;

  insert into tmp_ci_results(test_name, status, details)
  select
    'step_invite_member',
    case when step_invite_member then 'PASS' else 'FAIL' end,
    case when step_invite_member then 'Step auto-complétée' else 'Step non complétée après création invitation' end
  from activation_progress
  where user_id = v_user_id;

  -- first_report
  insert into conversion_events(user_id, org_id, event_type, step_name, metadata)
  values (v_user_id, v_org_id, 'report_viewed', 'first_report', '{"source":"staging_ci_sql"}'::jsonb);

  update activation_progress set last_activity_at = now() where user_id = v_user_id;

  insert into tmp_ci_results(test_name, status, details)
  select
    'step_first_report',
    case when step_first_report then 'PASS' else 'FAIL' end,
    case when step_first_report then 'Step auto-complétée' else 'Step non complétée après événement report_viewed' end
  from activation_progress
  where user_id = v_user_id;

  -- vérification finale
  select completed_steps, completed_at
  into v_completed_steps, v_completed_at
  from activation_progress
  where user_id = v_user_id;

  insert into tmp_ci_results(test_name, status, details)
  values (
    'final_completed_steps',
    case when v_completed_steps = 5 then 'PASS' else 'FAIL' end,
    'completed_steps=' || coalesce(v_completed_steps::text, 'NULL')
  );

  insert into tmp_ci_results(test_name, status, details)
  values (
    'final_completed_at',
    case when v_completed_at is not null then 'PASS' else 'FAIL' end,
    'completed_at=' || coalesce(v_completed_at::text, 'NULL')
  );
end $$;

select
  test_name,
  status,
  details
from tmp_ci_results
order by
  case when status = 'FAIL' then 0 else 1 end,
  test_name;

select
  case when count(*) filter (where status = 'FAIL') = 0 then 'PASS' else 'FAIL' end as global_status,
  count(*) filter (where status = 'PASS') as pass_count,
  count(*) filter (where status = 'FAIL') as fail_count
from tmp_ci_results;

rollback;
