-- Test staging: validation automatique des 5 steps du tunnel de conversion.
-- Le script est non destructif: il s'exécute dans une transaction puis ROLLBACK.
--
-- Exécution recommandée (SQL Editor Supabase):
-- 1) Coller ce script
-- 2) Lancer l'exécution complète
-- 3) Vérifier les NOTICE "OK"

begin;

do $$
declare
  v_user_id uuid;
  v_org_id uuid;
  v_fleet_id uuid;
  v_vehicle_id uuid;
  v_assignment_id uuid;
  v_before jsonb;
  v_after jsonb;
  v_test_code text := 'TEST-CONV-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  v_registration text := 'TEST-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
begin
  -- 0) Prendre un utilisateur existant (staging) avec adhésion active.
  select fa.user_id, fa.fleet_id, f.org_id
  into v_user_id, v_fleet_id, v_org_id
  from flotte_adhesions fa
  inner join flottes f on f.id = fa.fleet_id
  where fa.is_active = true
  order by fa.created_at asc
  limit 1;

  if v_user_id is null then
    raise exception 'Aucun utilisateur avec adhésion active trouvé dans flotte_adhesions (staging).';
  end if;

  -- 1) Initialiser / réinitialiser l'état d'activation.
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

  select to_jsonb(ap.*) into v_before
  from activation_progress ap
  where ap.user_id = v_user_id;

  raise notice 'Etat initial: %', v_before;

  -- 2) Scenario first_vehicle.
  insert into vehicules(fleet_id, registration, brand, model, current_km, status)
  values (v_fleet_id, v_registration, 'TestBrand', 'TestModel', 0, 'ok')
  returning id into v_vehicle_id;

  update activation_progress
  set last_activity_at = now()
  where user_id = v_user_id;

  if not (select step_first_vehicle from activation_progress where user_id = v_user_id) then
    raise exception 'Echec scenario first_vehicle';
  end if;
  raise notice 'OK first_vehicle';

  -- 3) Scenario first_creneau.
  insert into affectations_vehicules(fleet_id, vehicle_id, driver_user_id, created_by, is_active)
  values (v_fleet_id, v_vehicle_id, v_user_id, v_user_id, true)
  returning id into v_assignment_id;

  insert into creneaux_conducteurs(assignment_id, km_start, status)
  values (v_assignment_id, 0, 'open');

  update activation_progress
  set last_activity_at = now()
  where user_id = v_user_id;

  if not (select step_first_creneau from activation_progress where user_id = v_user_id) then
    raise exception 'Echec scenario first_creneau';
  end if;
  raise notice 'OK first_creneau';

  -- 4) Scenario first_alert.
  insert into alertes_automatiques(fleet_id, alert_type, driver_user_id, vehicle_id, severity, message, resolved, resolved_by, resolved_at)
  values (v_fleet_id, 'risky_driver', v_user_id, v_vehicle_id, 'medium', 'Alerte test conversion', true, v_user_id, now());

  update activation_progress
  set last_activity_at = now()
  where user_id = v_user_id;

  if not (select step_first_alert from activation_progress where user_id = v_user_id) then
    raise exception 'Echec scenario first_alert';
  end if;
  raise notice 'OK first_alert';

  -- 5) Scenario invite_member.
  insert into flotte_invitations(fleet_id, code, created_by, max_uses)
  values (v_fleet_id, v_test_code, v_user_id, 1);

  update activation_progress
  set last_activity_at = now()
  where user_id = v_user_id;

  if not (select step_invite_member from activation_progress where user_id = v_user_id) then
    raise exception 'Echec scenario invite_member';
  end if;
  raise notice 'OK invite_member';

  -- 6) Scenario first_report via événement analytics.
  insert into conversion_events(user_id, org_id, event_type, step_name, metadata)
  values (v_user_id, v_org_id, 'report_viewed', 'first_report', '{"source":"staging_test_script"}'::jsonb);

  update activation_progress
  set last_activity_at = now()
  where user_id = v_user_id;

  if not (select step_first_report from activation_progress where user_id = v_user_id) then
    raise exception 'Echec scenario first_report';
  end if;
  raise notice 'OK first_report';

  -- 7) Vérification finale.
  select to_jsonb(ap.*) into v_after
  from activation_progress ap
  where ap.user_id = v_user_id;

  if (v_after->>'completed_steps')::int <> 5 then
    raise exception 'completed_steps attendu=5, obtenu=%', v_after->>'completed_steps';
  end if;

  if (v_after->>'completed_at') is null then
    raise exception 'completed_at ne doit pas être NULL quand les 5 steps sont complétés';
  end if;

  raise notice 'OK final: 5/5 steps complétés';
  raise notice 'Etat final: %', v_after;
end $$;

rollback;
