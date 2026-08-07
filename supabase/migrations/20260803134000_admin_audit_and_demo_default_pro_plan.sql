-- Admin panel audit trail + accepted demo accounts as organizers on Pro by default.

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  target_label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_idx
  on public.admin_audit_logs (created_at desc);

create index if not exists admin_audit_logs_admin_created_idx
  on public.admin_audit_logs (admin_user_id, created_at desc)
  where admin_user_id is not null;

create index if not exists admin_audit_logs_target_created_idx
  on public.admin_audit_logs (target_type, target_id, created_at desc)
  where target_id is not null;

alter table public.admin_audit_logs enable row level security;

drop policy if exists admin_audit_logs_select_platform_admin on public.admin_audit_logs;
create policy admin_audit_logs_select_platform_admin
  on public.admin_audit_logs
  for select
  to authenticated
  using (public.support_current_user_is_admin());

create or replace function public.admin_log_action(
  p_admin_user_id uuid,
  p_action text,
  p_target_type text,
  p_target_id uuid default null,
  p_target_label text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_id uuid;
begin
  if auth.uid() is not null and not public.support_current_user_is_admin() then
    raise exception 'forbidden';
  end if;

  insert into public.admin_audit_logs (
    admin_user_id,
    action,
    target_type,
    target_id,
    target_label,
    metadata
  )
  values (
    p_admin_user_id,
    p_action,
    coalesce(nullif(trim(p_target_type), ''), 'admin_panel'),
    p_target_id,
    nullif(trim(coalesce(p_target_label, '')), ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.admin_list_audit_logs(
  p_limit integer default 100,
  p_target_type text default null
)
returns setof public.admin_audit_logs
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.support_current_user_is_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select *
    from public.admin_audit_logs aal
   where p_target_type is null or aal.target_type = p_target_type
   order by aal.created_at desc
   limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

create or replace function public.admin_audit_table_change()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_row jsonb;
  v_old jsonb;
  v_target_id uuid;
  v_label text;
begin
  if auth.uid() is null or not public.support_current_user_is_admin() then
    return coalesce(new, old);
  end if;

  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_old := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_target_id := nullif(v_row->>'id', '')::uuid;
  v_label := coalesce(v_row->>'email', v_row->>'title', v_row->>'question', v_row->>'full_name');

  perform public.admin_log_action(
    auth.uid(),
    lower(tg_op) || '_' || tg_table_name,
    tg_table_name,
    v_target_id,
    v_label,
    jsonb_build_object(
      'table', tg_table_name,
      'operation', tg_op,
      'old_status', v_old->>'status',
      'new_status', v_row->>'status',
      'visible_before', v_old->>'visible',
      'visible_after', v_row->>'visible'
    )
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists admin_audit_demo_requests on public.demo_requests;
create trigger admin_audit_demo_requests
  after insert or update or delete on public.demo_requests
  for each row execute function public.admin_audit_table_change();

drop trigger if exists admin_audit_faq_questions on public.faq_questions;
create trigger admin_audit_faq_questions
  after insert or update or delete on public.faq_questions
  for each row execute function public.admin_audit_table_change();

drop trigger if exists admin_audit_demo_request_settings on public.demo_request_settings;
create trigger admin_audit_demo_request_settings
  after insert or update or delete on public.demo_request_settings
  for each row execute function public.admin_audit_table_change();

do $$
begin
  if to_regclass('public.help_articles') is not null then
    drop trigger if exists admin_audit_help_articles on public.help_articles;
    create trigger admin_audit_help_articles
      after insert or update or delete on public.help_articles
      for each row execute function public.admin_audit_table_change();
  end if;
end;
$$;

create or replace function public.admin_apply_fleet_plan_internal(
  p_fleet_id uuid,
  p_plan_code text,
  p_admin_user_id uuid default null,
  p_reason text default null,
  p_replace_existing boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_plan_id uuid;
  v_current record;
  v_subscription_id uuid;
  v_plan_code text := lower(trim(p_plan_code));
begin
  if p_fleet_id is null then
    raise exception 'fleet_id_required';
  end if;

  if v_plan_code = '' then
    raise exception 'plan_code_required';
  end if;

  select id into v_plan_id
    from public.plans
   where code = v_plan_code
     and coalesce(is_active, true) = true
   limit 1;

  if v_plan_id is null then
    raise exception 'plan_not_found:%', v_plan_code;
  end if;

  select a.id, p.code
    into v_current
    from public.abonnements a
    join public.plans p on p.id = a.plan_id
   where a.fleet_id = p_fleet_id
     and a.status in ('active', 'trial')
     and (a.ends_at is null or a.ends_at > now())
   order by a.starts_at desc nulls last, a.created_at desc nulls last
   limit 1;

  if v_current.id is not null and v_current.code = v_plan_code then
    return jsonb_build_object(
      'ok', true,
      'fleet_id', p_fleet_id,
      'plan_code', v_plan_code,
      'subscription_id', v_current.id,
      'unchanged', true
    );
  end if;

  if v_current.id is not null and not p_replace_existing then
    return jsonb_build_object(
      'ok', true,
      'fleet_id', p_fleet_id,
      'plan_code', v_current.code,
      'subscription_id', v_current.id,
      'unchanged', true,
      'kept_existing_plan', true
    );
  end if;

  update public.abonnements
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_by = p_admin_user_id,
         ends_at = least(coalesce(ends_at, now()), now())
   where fleet_id = p_fleet_id
     and status in ('active', 'trial')
     and (ends_at is null or ends_at > now());

  insert into public.abonnements (fleet_id, plan_id, payment_id, starts_at, ends_at, status)
  values (p_fleet_id, v_plan_id, null, now(), now() + interval '1 year', 'active')
  returning id into v_subscription_id;

  perform public.admin_log_action(
    p_admin_user_id,
    case when p_replace_existing then 'fleet_plan_changed' else 'fleet_plan_defaulted' end,
    'fleet',
    p_fleet_id,
    v_plan_code,
    jsonb_build_object('plan_code', v_plan_code, 'reason', p_reason, 'subscription_id', v_subscription_id)
  );

  return jsonb_build_object(
    'ok', true,
    'fleet_id', p_fleet_id,
    'plan_code', v_plan_code,
    'subscription_id', v_subscription_id
  );
end;
$$;

create or replace function public.admin_set_fleet_plan(
  p_fleet_id uuid,
  p_plan_code text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.support_current_user_is_admin() then
    raise exception 'forbidden';
  end if;

  return public.admin_apply_fleet_plan_internal(
    p_fleet_id,
    p_plan_code,
    auth.uid(),
    coalesce(nullif(trim(p_reason), ''), 'changement manuel depuis admin UI'),
    true
  );
end;
$$;

create or replace function public.demo_organizer_role_before_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
      from public.demo_profiles dp
     where dp.user_id = new.user_id
       and dp.is_active = true
       and dp.demo_role = 'organizer'
  ) then
    new.role := 'organizer'::public.role_type;
  end if;

  return new;
end;
$$;

drop trigger if exists demo_organizer_default_role_before_membership on public.flotte_adhesions;
create trigger demo_organizer_default_role_before_membership
  before insert or update on public.flotte_adhesions
  for each row execute function public.demo_organizer_role_before_membership();

create or replace function public.demo_organizer_plan_after_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created_by uuid;
begin
  select dp.created_by
    into v_created_by
    from public.demo_profiles dp
   where dp.user_id = new.user_id
     and dp.is_active = true
     and dp.demo_role = 'organizer'
   limit 1;

  if found then
    update public.demo_profiles
       set fleet_id = coalesce(fleet_id, new.fleet_id)
     where user_id = new.user_id;

    perform public.admin_apply_fleet_plan_internal(
      new.fleet_id,
      'pro',
      v_created_by,
      'default_plan_code',
      false
    );
  end if;

  return new;
end;
$$;

drop trigger if exists demo_organizer_plan_after_membership on public.flotte_adhesions;
create trigger demo_organizer_plan_after_membership
  after insert or update on public.flotte_adhesions
  for each row execute function public.demo_organizer_plan_after_membership();

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
    return jsonb_build_object('ok', false, 'error', 'invalid_account_type');
  end if;

  if p_trial_days < 1 or p_trial_days > 90 then
    return jsonb_build_object('ok', false, 'error', 'trial_days_must_be_1_to_90');
  end if;

  if p_fleet_id is not null then
    return jsonb_build_object(
      'ok', false,
      'error', 'demo_fleet_assignment_not_allowed_at_creation'
    );
  end if;

  v_trial_end := case
    when p_permanent_access then null
    else now() + (p_trial_days || ' days')::interval
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
    'organizer',
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
        created_by = coalesce(public.demo_profiles.created_by, excluded.created_by),
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

  if to_regprocedure('public.demo_log_action(uuid,uuid,text,jsonb)') is not null then
    perform public.demo_log_action(
      p_user_id,
      null,
      'prospect_created',
      jsonb_build_object(
        'fleet_id', null,
        'email', p_email,
        'company', p_company_name,
        'account_type', v_account_type,
        'demo_role', 'organizer',
        'default_plan_code', 'pro',
        'trial_end', v_trial_end,
        'permanent_access', p_permanent_access,
        'invited_by', p_invited_by
      )
    );
  end if;

  perform public.admin_log_action(
    p_invited_by,
    'demo_account_accepted_created',
    'demo_profile',
    p_user_id,
    p_email,
    jsonb_build_object(
      'account_type', v_account_type,
      'demo_role', 'organizer',
      'default_plan_code', 'pro',
      'trial_end', v_trial_end,
      'permanent_access', p_permanent_access
    )
  );

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'fleet_id', null,
    'reg_id', v_reg_id,
    'trial_end', v_trial_end,
    'account_type', v_account_type,
    'demo_role', 'organizer',
    'default_plan_code', 'pro',
    'permanent_access', p_permanent_access
  );
end;
$$;

grant select on public.admin_audit_logs to authenticated;
grant execute on function public.admin_log_action(uuid, text, text, uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.admin_list_audit_logs(integer, text) to authenticated, service_role;
grant execute on function public.admin_set_fleet_plan(uuid, text, text) to authenticated, service_role;
grant execute on function public.prospect_create_account(uuid, text, text, uuid, uuid, int, text, boolean) to service_role;

revoke execute on function public.admin_apply_fleet_plan_internal(uuid, text, uuid, text, boolean) from public;
revoke execute on function public.admin_apply_fleet_plan_internal(uuid, text, uuid, text, boolean) from anon;
revoke execute on function public.admin_apply_fleet_plan_internal(uuid, text, uuid, text, boolean) from authenticated;

notify pgrst, 'reload schema';
