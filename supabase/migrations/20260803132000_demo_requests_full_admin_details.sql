-- Expose all demo request form fields in the admin listing RPC.

drop function if exists public.admin_list_demo_requests(boolean);

create or replace function public.admin_list_demo_requests(p_include_processed boolean default false)
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
    dr.id,
    dr.full_name::text,
    dr.email::text,
    dr.company::text,
    dr.phone::text,
    dr.company_identifier::text,
    dr.country_code::text,
    dr.source::text,
    dr.message::text,
    dr.status,
    dr.decision_reason,
    dr.decided_by,
    dr.decided_at,
    dr.provisioned_user_id,
    dr.invitation_url,
    dr.created_at,
    s.auto_decision_enabled,
    s.auto_decision
  from public.demo_requests dr
  cross join public.demo_request_settings s
  where p_include_processed or dr.status = 'pending'
  order by dr.created_at asc;
end;
$$;

grant execute on function public.admin_list_demo_requests(boolean) to authenticated, service_role;

notify pgrst, 'reload schema';
