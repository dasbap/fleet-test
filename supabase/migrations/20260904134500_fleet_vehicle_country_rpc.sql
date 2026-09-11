
begin;

create or replace function public.get_fleet_vehicle_country_code(p_fleet_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_country text;
begin
  if auth.uid() is null then
    raise exception 'non_authentifie';
  end if;

  if not public.is_platform_admin()
     and not exists (
       select 1
       from public.flotte_adhesions fa
       where fa.fleet_id = p_fleet_id
         and fa.user_id = auth.uid()
         and fa.is_active = true
     ) then
    raise exception 'fleet_access_denied';
  end if;

  select upper(coalesce(o.country_code, 'CM'))
    into v_country
  from public.flottes f
  left join public.organisations o on o.id = f.org_id
  where f.id = p_fleet_id;

  if v_country is null then
    raise exception 'fleet_not_found';
  end if;

  return v_country;
end;
$$;

grant execute on function public.get_fleet_vehicle_country_code(uuid) to authenticated;
revoke execute on function public.get_fleet_vehicle_country_code(uuid) from anon;

notify pgrst, 'reload schema';

commit;
