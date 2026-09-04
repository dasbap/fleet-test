
begin;

create or replace function public.prevent_last_active_organizer_loss()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_removes_organizer boolean;
  v_demo_lifecycle_bypass boolean := false;
begin
  if old.role is distinct from 'organizer'::public.role_type or old.is_active is distinct from true then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  v_removes_organizer := tg_op = 'DELETE';
  if tg_op = 'UPDATE' then
    v_removes_organizer :=
      new.fleet_id is distinct from old.fleet_id
      or new.role is distinct from 'organizer'::public.role_type
      or new.is_active is distinct from true;
  end if;

  if not v_removes_organizer then
    return new;
  end if;

  if current_setting('app.demo_lifecycle_bypass', true) = 'on'
     and public.is_platform_admin()
     and exists (
       select 1
       from public.demo_profiles dp
       join public.flottes f on f.id = old.fleet_id
       where dp.user_id = old.user_id
         and f.is_demo = true
     ) then
    v_demo_lifecycle_bypass := true;
  end if;

  if v_demo_lifecycle_bypass then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' and not exists (
    select 1 from public.flottes f where f.id = old.fleet_id
  ) then
    return old;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(old.fleet_id::text, 0));

  if not exists (
    select 1
    from public.flotte_adhesions fa
    where fa.fleet_id = old.fleet_id
      and fa.id is distinct from old.id
      and fa.role = 'organizer'::public.role_type
      and fa.is_active = true
  ) then
    raise exception 'last_active_organizer_required';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.deactivate_demo_account(
  p_user_id uuid,
  p_deactivated_by uuid,
  p_reason text default 'desactivation manuelle'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied: platform admin required';
  end if;

  select user_id, coalesce(email, '') as email, account_type
  into v_rec
  from public.demo_profiles
  where user_id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'compte_introuvable');
  end if;

  update public.demo_profiles
  set is_active = false,
      deactivated_at = now(),
      deactivated_by = p_deactivated_by
  where user_id = p_user_id;

  update public.demo_magic_links
  set is_active = false
  where user_id = p_user_id
    and is_active = true;

  perform set_config('app.demo_lifecycle_bypass', 'on', true);

  delete from public.flotte_adhesions
  where user_id = p_user_id;

  if to_regclass('public.demo_expiration_log') is not null then
    insert into public.demo_expiration_log (
      user_id, email, account_type, action, reason, performed_by
    )
    values (
      v_rec.user_id, v_rec.email, v_rec.account_type,
      'manually_deactivated', p_reason, p_deactivated_by
    );
  end if;

  return jsonb_build_object('ok', true, 'user_id', p_user_id);
end;
$$;

create or replace function public.reactivate_demo_account(
  p_user_id uuid,
  p_reactivated_by uuid,
  p_extend_hours integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
  v_duration integer;
  v_requested_expires timestamptz;
  v_max_expires timestamptz;
  v_role public.role_type;
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied: platform admin required';
  end if;

  select user_id, coalesce(email, '') as email, account_type, created_at, fleet_id, demo_role
  into v_rec
  from public.demo_profiles
  where user_id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'compte_introuvable');
  end if;

  v_max_expires := v_rec.created_at + interval '1 month';

  if p_extend_hours is not null then
    if p_extend_hours < 1 then
      return jsonb_build_object('ok', false, 'error', 'invalid_extension');
    end if;
    v_requested_expires := now() + make_interval(hours => p_extend_hours);
  else
    v_duration := public.get_demo_account_type_duration(v_rec.account_type);
    v_requested_expires := now() + make_interval(hours => v_duration);
  end if;

  if v_requested_expires > v_max_expires then
    return jsonb_build_object(
      'ok', false,
      'error', 'max_demo_extension_exceeded',
      'max_expires_at', v_max_expires
    );
  end if;

  update public.demo_profiles
  set is_active = true,
      expires_at = v_requested_expires,
      notified_at = null,
      deactivated_at = null,
      deactivated_by = null
  where user_id = p_user_id;

  if v_rec.fleet_id is not null
     and exists (select 1 from public.flottes f where f.id = v_rec.fleet_id) then
    begin
      v_role := coalesce(nullif(v_rec.demo_role, ''), 'organizer')::public.role_type;
    exception when invalid_text_representation then
      v_role := 'organizer'::public.role_type;
    end;

    insert into public.flotte_adhesions (fleet_id, user_id, role, is_active)
    values (v_rec.fleet_id, p_user_id, v_role, true)
    on conflict (fleet_id, user_id)
    do update set role = excluded.role, is_active = true;
  end if;

  if to_regclass('public.demo_expiration_log') is not null then
    insert into public.demo_expiration_log (
      user_id, email, account_type, action, reason, performed_by
    )
    values (
      v_rec.user_id, v_rec.email, v_rec.account_type,
      'reactivated',
      'reactivated by platform admin; capped at one month from creation',
      p_reactivated_by
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'expires_at', v_requested_expires
  );
end;
$$;

create or replace function public.update_demo_account_expiration(
  p_user_id uuid,
  p_updated_by uuid,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rec record;
  v_max_expires_at timestamptz;
  v_role public.role_type;
  v_becomes_active boolean;
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied: platform admin required';
  end if;

  select user_id, coalesce(email, '') as email, account_type, created_at, fleet_id, demo_role
  into v_rec
  from public.demo_profiles
  where user_id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'compte_introuvable');
  end if;

  if p_expires_at is null and not public.is_platform_super_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden_super_admin_required');
  end if;

  v_max_expires_at := v_rec.created_at + interval '1 month';
  if p_expires_at is not null and p_expires_at > v_max_expires_at then
    return jsonb_build_object(
      'ok', false,
      'error', 'max_demo_extension_exceeded',
      'max_expires_at', v_max_expires_at
    );
  end if;

  v_becomes_active := p_expires_at is null or p_expires_at > now();

  update public.demo_profiles
  set expires_at = p_expires_at,
      is_active = v_becomes_active,
      notified_at = null,
      deactivated_at = case when v_becomes_active then null else now() end,
      deactivated_by = case when v_becomes_active then null else p_updated_by end
  where user_id = p_user_id;

  update public.demo_magic_links
  set expires_at = least(expires_at, p_expires_at)
  where user_id = p_user_id
    and p_expires_at is not null
    and expires_at > p_expires_at;

  if v_becomes_active and v_rec.fleet_id is not null
     and exists (select 1 from public.flottes f where f.id = v_rec.fleet_id) then
    begin
      v_role := coalesce(nullif(v_rec.demo_role, ''), 'organizer')::public.role_type;
    exception when invalid_text_representation then
      v_role := 'organizer'::public.role_type;
    end;

    insert into public.flotte_adhesions (fleet_id, user_id, role, is_active)
    values (v_rec.fleet_id, p_user_id, v_role, true)
    on conflict (fleet_id, user_id)
    do update set role = excluded.role, is_active = true;
  elsif not v_becomes_active then
    perform set_config('app.demo_lifecycle_bypass', 'on', true);
    delete from public.flotte_adhesions where user_id = p_user_id;
  end if;

  if to_regclass('public.demo_expiration_log') is not null then
    insert into public.demo_expiration_log (
      user_id, email, account_type, action, reason, performed_by
    )
    values (
      v_rec.user_id, v_rec.email, v_rec.account_type,
      case when v_becomes_active then 'reactivated' else 'manually_deactivated' end,
      'expiration updated by platform admin',
      p_updated_by
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'expires_at', p_expires_at,
    'max_expires_at', v_max_expires_at
  );
end;
$$;

create or replace function public.delete_demo_account(
  p_user_id uuid,
  p_deleted_by uuid,
  p_reason text default 'suppression manuelle'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_rec record;
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied: platform admin required';
  end if;

  select user_id, coalesce(email, '') as email, account_type
  into v_rec
  from public.demo_profiles
  where user_id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'compte_introuvable');
  end if;

  update public.demo_profiles
  set is_active = false,
      deactivated_at = now(),
      deactivated_by = p_deleted_by
  where user_id = p_user_id;

  perform set_config('app.demo_lifecycle_bypass', 'on', true);

  delete from public.flotte_adhesions
  where user_id = p_user_id;

  if to_regclass('public.demo_magic_links') is not null then
    delete from public.demo_magic_links where user_id = p_user_id;
  end if;

  if to_regclass('public.demo_onboarding_logs') is not null then
    delete from public.demo_onboarding_logs where user_id = p_user_id;
  end if;

  if to_regclass('public.demo_expiration_log') is not null then
    delete from public.demo_expiration_log where user_id = p_user_id;
  end if;

  if to_regclass('public.demo_audit_logs') is not null then
    delete from public.demo_audit_logs where user_id = p_user_id;
  end if;

  delete from public.demo_profiles where user_id = p_user_id;
  delete from auth.users where id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'deleted_by', p_deleted_by,
    'reason', p_reason
  );
end;
$$;

create or replace function public.admin_list_demo_sessions(p_active_only boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Access denied: platform admin required';
  end if;

  select jsonb_agg(row_to_json(s) order by s.created_at desc)
  into v_result
  from (
    select
      dp.user_id,
      coalesce(nullif(dp.email, ''), u.email, ml.email, 'email indisponible') as email,
      dp.account_type,
      dp.demo_role,
      (dp.is_active and (dp.expires_at is null or dp.expires_at > now())) as is_active,
      dp.expires_at,
      dp.created_at,
      dp.deactivated_at,
      dp.last_login,
      dp.last_activity_at,
      dp.notes,
      dp.fleet_id,
      fl.name as fleet_name,
      ml.token as magic_link_token,
      ml.label as magic_link_label,
      coalesce(ml.used_count, 0) as used_count,
      ml.last_used_at,
      ml.expires_at as link_expires_at,
      (
        select count(*)::int
        from public.demo_onboarding_logs ol
        where ol.user_id = dp.user_id
      ) as onboarding_steps
    from public.demo_profiles dp
    left join auth.users u on u.id = dp.user_id
    left join public.flottes fl on fl.id = dp.fleet_id
    left join lateral (
      select token, email, label, used_count, last_used_at, expires_at, is_active, created_at
      from public.demo_magic_links dml
      where dml.user_id = dp.user_id
        and dml.is_active = true
        and dml.expires_at > now()
      order by dml.created_at desc
      limit 1
    ) ml on true
    where (
      not p_active_only
      or (dp.is_active = true and (dp.expires_at is null or dp.expires_at > now()))
    )
      and (public.is_platform_super_admin() or dp.expires_at is not null)
  ) s;

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

grant execute on function public.deactivate_demo_account(uuid, uuid, text) to authenticated;
grant execute on function public.reactivate_demo_account(uuid, uuid, integer) to authenticated;
grant execute on function public.update_demo_account_expiration(uuid, uuid, timestamptz) to authenticated;
grant execute on function public.delete_demo_account(uuid, uuid, text) to authenticated;
grant execute on function public.admin_list_demo_sessions(boolean) to authenticated;

revoke execute on function public.deactivate_demo_account(uuid, uuid, text) from anon;
revoke execute on function public.reactivate_demo_account(uuid, uuid, integer) from anon;
revoke execute on function public.update_demo_account_expiration(uuid, uuid, timestamptz) from anon;
revoke execute on function public.delete_demo_account(uuid, uuid, text) from anon;
revoke execute on function public.admin_list_demo_sessions(boolean) from anon;

notify pgrst, 'reload schema';

commit;
