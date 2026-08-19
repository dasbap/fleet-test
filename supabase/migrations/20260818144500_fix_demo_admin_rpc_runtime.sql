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
  v_target_id_text text;
  v_label text;
begin
  if auth.uid() is null or not public.support_current_user_is_admin() then
    return coalesce(new, old);
  end if;

  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_old := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_target_id_text := nullif(v_row->>'id', '');

  if v_target_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    v_target_id := v_target_id_text::uuid;
  else
    v_target_id := null;
  end if;

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
      'record_id', v_target_id_text,
      'old_status', v_old->>'status',
      'new_status', v_row->>'status',
      'visible_before', v_old->>'visible',
      'visible_after', v_row->>'visible'
    )
  );

  return coalesce(new, old);
end;
$$;

drop function if exists public.admin_list_demo_requests(boolean);

create function public.admin_list_demo_requests(p_include_processed boolean default false)
returns table (
  id uuid,
  full_name text,
  email text,
  company text,
  phone text,
  company_identifier text,
  country_code text,
  source text,
  message text,
  status public.demo_request_status,
  decision_reason text,
  decided_by uuid,
  decided_at timestamptz,
  provisioned_user_id uuid,
  invitation_url text,
  created_at timestamptz,
  auto_decision_enabled boolean,
  auto_decision public.demo_request_auto_decision
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.support_current_user_is_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select
    dr.id::text::uuid,
    dr.full_name::text,
    dr.email::text,
    dr.company::text,
    dr.phone::text,
    dr.company_identifier::text,
    dr.country_code::text,
    dr.source::text,
    dr.message::text,
    dr.status::text::public.demo_request_status,
    dr.decision_reason::text,
    dr.decided_by::text::uuid,
    dr.decided_at::timestamptz,
    dr.provisioned_user_id::text::uuid,
    dr.invitation_url::text,
    dr.created_at::timestamptz,
    s.auto_decision_enabled::boolean,
    s.auto_decision::text::public.demo_request_auto_decision
  from public.demo_requests dr
  cross join lateral (
    select settings.auto_decision_enabled, settings.auto_decision
    from public.demo_request_settings settings
    order by settings.updated_at desc nulls last
    limit 1
  ) s
  where p_include_processed or dr.status::text = 'pending'
  order by dr.created_at asc;
end;
$$;

grant execute on function public.admin_list_demo_requests(boolean) to authenticated, service_role;

create or replace function public.admin_update_demo_request_auto_mode(
  p_enabled boolean,
  p_decision public.demo_request_auto_decision
)
returns public.demo_request_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.demo_request_settings;
begin
  if not public.support_current_user_is_admin() then
    raise exception 'forbidden';
  end if;

  update public.demo_request_settings
  set auto_decision_enabled = p_enabled,
      auto_decision = p_decision,
      updated_by = auth.uid(),
      updated_at = now();

  if not found then
    insert into public.demo_request_settings (
      auto_decision_enabled,
      auto_decision,
      updated_by,
      updated_at
    )
    values (
      p_enabled,
      p_decision,
      auth.uid(),
      now()
    );
  end if;

  select *
  into v_row
  from public.demo_request_settings
  order by updated_at desc nulls last
  limit 1;

  return v_row;
end;
$$;

grant execute on function public.admin_update_demo_request_auto_mode(boolean, public.demo_request_auto_decision)
  to authenticated, service_role;

notify pgrst, 'reload schema';
