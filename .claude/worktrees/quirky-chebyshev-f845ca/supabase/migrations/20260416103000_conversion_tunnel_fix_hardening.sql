-- Durcissement du tunnel de conversion:
-- - validation stricte de p_step
-- - synchronisation automatique de org_id
-- - auto-détection de first_report via événements de conversion

create or replace function auto_complete_activation_steps()
returns trigger
language plpgsql
as $$
declare
  v_step_first_vehicle boolean;
  v_step_first_creneau boolean;
  v_step_first_alert boolean;
  v_step_invite_member boolean;
  v_step_first_report boolean;
  v_completed_steps int;
begin
  if new.org_id is null then
    select fa.fleet_id
    into new.org_id
    from flotte_adhesions fa
    where fa.user_id = new.user_id
      and fa.is_active = true
    order by fa.created_at asc
    limit 1;
  end if;

  select exists (
    select 1
    from vehicules v
    inner join flotte_adhesions fa on fa.fleet_id = v.fleet_id
    where fa.user_id = new.user_id
      and fa.is_active = true
  ) into v_step_first_vehicle;

  select exists (
    select 1
    from creneaux_conducteurs cc
    inner join affectations_vehicules av on av.id = cc.assignment_id
    where av.driver_user_id = new.user_id
  ) into v_step_first_creneau;

  select exists (
    select 1
    from alertes_automatiques aa
    where aa.driver_user_id = new.user_id
      and aa.resolved = true
  ) into v_step_first_alert;

  select exists (
    select 1
    from flotte_invitations fi
    where fi.created_by = new.user_id
  ) into v_step_invite_member;

  select exists (
    select 1
    from conversion_events ce
    where ce.user_id = new.user_id
      and (
        ce.step_name = 'first_report'
        or (ce.event_type = 'report_viewed')
      )
  ) into v_step_first_report;

  new.step_first_vehicle := new.step_first_vehicle or v_step_first_vehicle;
  new.step_first_creneau := new.step_first_creneau or v_step_first_creneau;
  new.step_first_alert := new.step_first_alert or v_step_first_alert;
  new.step_invite_member := new.step_invite_member or v_step_invite_member;
  new.step_first_report := new.step_first_report or v_step_first_report;

  v_completed_steps := (new.step_first_vehicle::int)
    + (new.step_first_creneau::int)
    + (new.step_first_alert::int)
    + (new.step_invite_member::int)
    + (new.step_first_report::int);

  new.completed_steps := v_completed_steps;
  new.last_activity_at := now();

  if v_completed_steps > 0 then
    new.first_value_at := coalesce(new.first_value_at, now());
  end if;

  if v_completed_steps = 5 then
    new.completed_at := coalesce(new.completed_at, now());
  end if;

  return new;
end;
$$;

create or replace function complete_activation_step(
  p_user_id uuid,
  p_step text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row activation_progress%rowtype;
  v_org_id uuid;
begin
  if p_step not in ('first_vehicle', 'first_creneau', 'first_alert', 'invite_member', 'first_report') then
    raise exception 'Étape invalide: %', p_step using errcode = '22023';
  end if;

  select fa.fleet_id
  into v_org_id
  from flotte_adhesions fa
  where fa.user_id = p_user_id
    and fa.is_active = true
  order by fa.created_at asc
  limit 1;

  perform init_activation_progress(p_user_id, v_org_id);

  update activation_progress
  set org_id = coalesce(org_id, v_org_id)
  where user_id = p_user_id;

  execute format(
    'update activation_progress
     set step_%I = true,
         last_activity_at = now(),
         first_value_at = coalesce(first_value_at, case when step_%I = false then now() end)
     where user_id = $1',
    p_step, p_step
  ) using p_user_id;

  update activation_progress
  set completed_steps = (
    (step_first_vehicle::int) +
    (step_first_creneau::int) +
    (step_first_alert::int) +
    (step_invite_member::int) +
    (step_first_report::int)
  ),
  completed_at = case
    when (
      step_first_vehicle and step_first_creneau and step_first_alert
      and step_invite_member and step_first_report
    ) then coalesce(completed_at, now())
    else null
  end
  where user_id = p_user_id
  returning * into v_row;

  insert into conversion_events(user_id, org_id, event_type, step_name)
  values (p_user_id, v_row.org_id, 'step_completed', p_step);

  return jsonb_build_object(
    'completed_steps', v_row.completed_steps,
    'all_done', v_row.completed_at is not null,
    'first_value_at', v_row.first_value_at
  );
end;
$$;

grant execute on function complete_activation_step(uuid, text) to authenticated;

