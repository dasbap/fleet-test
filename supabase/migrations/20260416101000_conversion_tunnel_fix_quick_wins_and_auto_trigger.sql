-- Fix dédié du tunnel de conversion:
-- - ajoute la vue v_quick_wins_pending
-- - ajoute le trigger trg_auto_complete_steps pour auto-compléter les étapes observables

create or replace function auto_complete_activation_steps()
returns trigger
language plpgsql
as $$
declare
  v_step_first_vehicle boolean;
  v_step_first_creneau boolean;
  v_step_first_alert boolean;
  v_step_invite_member boolean;
  v_completed_steps int;
begin
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

  new.step_first_vehicle := new.step_first_vehicle or v_step_first_vehicle;
  new.step_first_creneau := new.step_first_creneau or v_step_first_creneau;
  new.step_first_alert := new.step_first_alert or v_step_first_alert;
  new.step_invite_member := new.step_invite_member or v_step_invite_member;

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

drop trigger if exists trg_auto_complete_steps on activation_progress;
create trigger trg_auto_complete_steps
  before insert or update on activation_progress
  for each row
  execute function auto_complete_activation_steps();

create or replace view v_quick_wins_pending as
select
  ap.user_id,
  ap.org_id,
  pending.step_key,
  pending.step_label
from activation_progress ap
cross join lateral (
  values
    ('first_vehicle'::text, 'Ajouter votre premier véhicule'::text, ap.step_first_vehicle),
    ('first_creneau'::text, 'Ouvrir votre premier créneau'::text, ap.step_first_creneau),
    ('first_alert'::text, 'Résoudre votre première alerte'::text, ap.step_first_alert),
    ('invite_member'::text, 'Inviter un membre de l''équipe'::text, ap.step_invite_member),
    ('first_report'::text, 'Consulter votre premier rapport'::text, ap.step_first_report)
) as pending(step_key, step_label, is_done)
where pending.is_done = false;

grant select on v_quick_wins_pending to authenticated;

