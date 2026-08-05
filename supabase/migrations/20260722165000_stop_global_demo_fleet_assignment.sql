-- Stop assigning demo users to shared global demo fleets.
-- Demo users remain unattached until a demo organizer creates a real fleet.

do $$
begin
  if to_regclass('public.demo_profiles') is not null then
    alter table public.demo_profiles
      alter column fleet_id drop not null;
  end if;

  if to_regclass('public.demo_magic_links') is not null then
    alter table public.demo_magic_links
      alter column fleet_id drop not null;
  end if;

  if to_regclass('public.prospect_registrations') is not null then
    alter table public.prospect_registrations
      alter column fleet_id drop not null;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.demo_profiles') is not null then
    update public.demo_profiles dp
       set fleet_id = null
     where dp.fleet_id in (
       select f.id
         from public.flottes f
        where f.name in (
          'Flotte DEMO Starter',
          'Flotte DEMO Pro',
          'Flotte DEMO Entreprise',
          'Flotte DEMO Organisateur'
        )
     );
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.demo_magic_links') is not null then
    update public.demo_magic_links dml
       set fleet_id = null
     where dml.fleet_id in (
       select f.id
         from public.flottes f
        where f.name in (
          'Flotte DEMO Starter',
          'Flotte DEMO Pro',
          'Flotte DEMO Entreprise',
          'Flotte DEMO Organisateur'
        )
     );
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.prospect_registrations') is not null then
    update public.prospect_registrations pr
       set fleet_id = null
     where pr.fleet_id in (
       select f.id
         from public.flottes f
        where f.name in (
          'Flotte DEMO Starter',
          'Flotte DEMO Pro',
          'Flotte DEMO Entreprise',
          'Flotte DEMO Organisateur'
        )
     );
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.flotte_adhesions') is not null
     and to_regclass('public.demo_profiles') is not null then
    delete from public.flotte_adhesions fa
     where fa.fleet_id in (
       select f.id
         from public.flottes f
        where f.name in (
          'Flotte DEMO Starter',
          'Flotte DEMO Pro',
          'Flotte DEMO Entreprise',
          'Flotte DEMO Organisateur'
        )
     )
       and exists (
         select 1
           from public.demo_profiles dp
          where dp.user_id = fa.user_id
       );
  end if;
end;
$$;

-- Do not physically delete the legacy demo fleets.
-- They may still be referenced by audit_logs and other historical records.

do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'flottes'
       and column_name = 'archived_at'
  ) then
    update public.flottes
       set archived_at = now()
     where name in (
       'Flotte DEMO Starter',
       'Flotte DEMO Pro',
       'Flotte DEMO Entreprise',
       'Flotte DEMO Organisateur'
     )
       and archived_at is null;
  end if;
end;
$$;

create or replace function public.prospect_create_account(
  p_user_id uuid,
  p_email text,
  p_company_name text default null,
  p_invited_by uuid default null,
  p_fleet_id uuid default null,
  p_trial_days int default 7,
  p_account_type text default 'prospect',
  p_permanent_access boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg_id uuid;
  v_trial_end timestamptz;
  v_account_type text;
begin
  v_account_type := coalesce(nullif(p_account_type, ''), 'prospect');

  if v_account_type not in ('prospect', 'investor', 'internal', 'dev') then
    return jsonb_build_object(
      'ok', false,
      'error', 'invalid_account_type'
    );
  end if;

  if p_trial_days < 1 or p_trial_days > 90 then
    return jsonb_build_object(
      'ok', false,
      'error', 'trial_days_must_be_1_to_90'
    );
  end if;

  if p_fleet_id is not null then
    return jsonb_build_object(
      'ok', false,
      'error', 'demo_fleet_assignment_not_allowed_at_creation'
    );
  end if;

  v_trial_end := case
    when p_permanent_access then null
    else now() + make_interval(days => p_trial_days)
  end;

  insert into public.demo_profiles (
    user_id,
    email,
    demo_role,
    fleet_id,
    is_active,
    expires_at,
    account_type,
    created_by,
    deactivated_at,
    deactivated_by,
    notified_at
  )
  values (
    p_user_id,
    p_email,
    'driver',
    null,
    true,
    v_trial_end,
    v_account_type,
    p_invited_by,
    null,
    null,
    null
  )
  on conflict (user_id) do update
    set email = excluded.email,
        demo_role = excluded.demo_role,
        fleet_id = null,
        is_active = true,
        expires_at = excluded.expires_at,
        account_type = excluded.account_type,
        created_by = coalesce(
          public.demo_profiles.created_by,
          excluded.created_by
        ),
        deactivated_at = null,
        deactivated_by = null,
        notified_at = null;

  if to_regclass('public.prospect_registrations') is not null then
    insert into public.prospect_registrations (
      user_id,
      fleet_id,
      email,
      company_name,
      invited_by,
      trial_end,
      status
    )
    values (
      p_user_id,
      null,
      p_email,
      p_company_name,
      p_invited_by,
      v_trial_end,
      'active'
    )
    returning id into v_reg_id;
  end if;

  if to_regprocedure(
    'public.demo_log_action(uuid,uuid,text,jsonb)'
  ) is not null then
    perform public.demo_log_action(
      p_user_id,
      null,
      'prospect_created',
      jsonb_build_object(
        'fleet_id', null,
        'email', p_email,
        'company', p_company_name,
        'account_type', v_account_type,
        'trial_end', v_trial_end,
        'permanent_access', p_permanent_access,
        'invited_by', p_invited_by
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'fleet_id', null,
    'reg_id', v_reg_id,
    'trial_end', v_trial_end,
    'account_type', v_account_type,
    'permanent_access', p_permanent_access
  );
end;
$$;

grant execute on function public.prospect_create_account(
  uuid,
  text,
  text,
  uuid,
  uuid,
  int,
  text,
  boolean
) to service_role;

notify pgrst, 'reload schema';