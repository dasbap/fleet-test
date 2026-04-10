-- Durcissement recherche véhicules : sécurité + RPC paginée + score de similarité.

-- Restreindre l'accès direct à la vue (usage via RPC uniquement).
revoke all on table public.vehicles_search_view from anon;
revoke all on table public.vehicles_search_view from authenticated;

create or replace function public.rechercher_vehicules_flotte(
  p_fleet_id uuid,
  p_query text default '',
  p_status text[] default '{}',
  p_maint text[] default '{}',
  p_alert text[] default '{}',
  p_sort_by text default 'plate',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  fleet_id uuid,
  plate text,
  brand text,
  model text,
  driver_name text,
  km int,
  status text,
  pending_maint_type text,
  alert_severity text,
  alert_rank int,
  search_text text,
  similarity double precision,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_query text := left(trim(coalesce(p_query, '')), 80);
  v_limit int := greatest(1, least(coalesce(p_limit, 20), 100));
  v_offset int := greatest(0, coalesce(p_offset, 0));
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié';
  end if;

  if not (
    has_role(p_fleet_id, 'organizer'::role_type)
    or has_role(p_fleet_id, 'manager'::role_type)
    or has_role(p_fleet_id, 'mechanic'::role_type)
    or has_role(p_fleet_id, 'driver'::role_type)
  ) then
    raise exception 'Accès refusé à la flotte';
  end if;

  return query
  with filtered as (
    select
      vsv.*,
      case
        when v_query = '' then 0::double precision
        else greatest(
          similarity(coalesce(vsv.search_text, ''), v_query),
          similarity(coalesce(vsv.plate, ''), v_query),
          similarity(coalesce(vsv.driver_name, ''), v_query)
        )
      end as sim
    from public.vehicles_search_view vsv
    where vsv.fleet_id = p_fleet_id
      and (
        v_query = ''
        or vsv.search_text ilike ('%' || v_query || '%')
        or similarity(coalesce(vsv.search_text, ''), v_query) >= 0.2
      )
      and (
        coalesce(array_length(p_status, 1), 0) = 0
        or vsv.status = any(p_status)
      )
      and (
        coalesce(array_length(p_maint, 1), 0) = 0
        or vsv.pending_maint_type = any(p_maint)
      )
      and (
        coalesce(array_length(p_alert, 1), 0) = 0
        or vsv.alert_severity = any(p_alert)
      )
  ),
  ranked as (
    select
      filtered.*,
      count(*) over () as total_rows
    from filtered
  )
  select
    ranked.id,
    ranked.fleet_id,
    ranked.plate,
    ranked.brand,
    ranked.model,
    ranked.driver_name,
    ranked.km,
    ranked.status,
    ranked.pending_maint_type,
    ranked.alert_severity,
    ranked.alert_rank,
    ranked.search_text,
    ranked.sim as similarity,
    ranked.total_rows as total_count
  from ranked
  order by
    case when p_sort_by = 'km' then ranked.km end desc nulls last,
    case when p_sort_by = 'alert' then ranked.alert_rank end asc nulls last,
    case when p_sort_by = 'similarity' then ranked.sim end desc nulls last,
    case when p_sort_by = 'plate' then ranked.plate end asc nulls last,
    ranked.sim desc,
    ranked.plate asc
  limit v_limit
  offset v_offset;
end;
$$;

grant execute on function public.rechercher_vehicules_flotte(uuid, text, text[], text[], text[], text, int, int)
to authenticated;
