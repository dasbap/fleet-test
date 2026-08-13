-- Expose plan vehicle ceilings to the super-admin subscription grant UI.
-- The insert trigger still enforces the database contract; this lets the UI
-- prevent invalid grants such as Starter with 26 vehicles before calling RPC.

create or replace function public.admin_list_subscription_grant_options()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
set row_security = off
as $$
declare
  v_fleets jsonb;
  v_plans jsonb;
begin
  if auth.uid() is null then
    raise exception 'non_authentifie';
  end if;

  if not public.is_platform_super_admin() then
    raise exception 'permission_refusee_super_admin_abonnement';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id,
    'name', f.name,
    'org_id', f.org_id
  ) order by f.name asc nulls last, f.id asc), '[]'::jsonb)
  into v_fleets
  from public.flottes f;

  select coalesce(jsonb_agg(jsonb_build_object(
    'code', p.code,
    'name', p.name,
    'max_vehicles', p.max_vehicles
  ) order by case p.code when 'starter' then 1 when 'pro' then 2 when 'enterprise' then 3 else 10 end, p.code), '[]'::jsonb)
  into v_plans
  from public.plans p
  where coalesce(p.is_active, true) = true;

  return jsonb_build_object(
    'fleets', v_fleets,
    'plans', v_plans
  );
end;
$$;

revoke execute on function public.admin_list_subscription_grant_options() from public;
revoke execute on function public.admin_list_subscription_grant_options() from anon;
grant execute on function public.admin_list_subscription_grant_options() to authenticated;

notify pgrst, 'reload schema';
