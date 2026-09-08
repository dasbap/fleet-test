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
      updated_at = now()
  where id = true
  returning * into v_row;

  if v_row.id is null then
    insert into public.demo_request_settings (
      id,
      auto_decision_enabled,
      auto_decision,
      updated_by,
      updated_at
    )
    values (
      true,
      p_enabled,
      p_decision,
      auth.uid(),
      now()
    )
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

revoke all on function public.admin_update_demo_request_auto_mode(boolean, public.demo_request_auto_decision) from public;
grant execute on function public.admin_update_demo_request_auto_mode(boolean, public.demo_request_auto_decision) to authenticated, service_role;

notify pgrst, 'reload schema';
