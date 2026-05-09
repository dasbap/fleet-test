-- Recherche unifiée multi-entités pour la flotte
-- Remplacement progressif de la recherche existante avec compatibilité RPC.

create extension if not exists pg_trgm;

-- Index trigram: véhicules
-- Garde : ignoré si la table n'existe pas encore (ex. rejoue depuis un baseline squashé).
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'vehicules'
  ) then
    create index if not exists idx_vehicules_registration_trgm
      on public.vehicules using gin (registration gin_trgm_ops);

    create index if not exists idx_vehicules_brand_model_trgm
      on public.vehicules using gin ((coalesce(brand, '') || ' ' || coalesce(model, '')) gin_trgm_ops);
  end if;
end;
$$;

-- Index trigram: profils (conducteurs / membres flotte)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profils'
  ) then
    create index if not exists idx_profils_full_name_trgm
      on public.profils using gin (coalesce(full_name, '') gin_trgm_ops);

    create index if not exists idx_profils_phone_trgm
      on public.profils using gin (coalesce(phone, '') gin_trgm_ops);
  end if;
end;
$$;

-- Index trigram: alertes
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'alertes_automatiques'
  ) then
    create index if not exists idx_alertes_automatiques_message_trgm
      on public.alertes_automatiques using gin (message gin_trgm_ops);
  end if;
end;
$$;

-- Index trigram: maintenance
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'travaux_maintenance'
  ) then
    create index if not exists idx_travaux_maintenance_notes_trgm
      on public.travaux_maintenance using gin (coalesce(notes, '') gin_trgm_ops);

    create index if not exists idx_travaux_maintenance_status_priority_trgm
      on public.travaux_maintenance using gin ((coalesce(status, '') || ' ' || coalesce(priority, '')) gin_trgm_ops);
  end if;
end;
$$;

create or replace function public.search_fleet(
  search_query text,
  max_per_type int default 5,
  fleet_id_filter uuid default null
)
returns table (
  id uuid,
  result_type text,
  title text,
  subtitle text,
  badge text,
  badge_variant text,
  href text,
  score int
)
language sql
stable
security invoker
as $$
  with params as (
    select
      left(trim(coalesce(search_query, '')), 80) as q,
      greatest(1, least(coalesce(max_per_type, 5), 50)) as per_type
  ),
  target_fleet as (
    select
      case
        when fleet_id_filter is not null then fleet_id_filter
        else (
          select fa.fleet_id
          from public.flotte_adhesions fa
          where fa.user_id = auth.uid()
            and fa.is_active = true
          order by fa.created_at asc
          limit 1
        )
      end as fleet_id
  ),
  vehicle_results as (
    select
      v.id,
      'vehicle'::text as result_type,
      v.registration::text as title,
      trim(coalesce(v.brand, '') || ' ' || coalesce(v.model, '')) || ' · ' || coalesce(v.current_km::text, '0') || ' km' as subtitle,
      case
        when v.status = 'ok' then 'Actif'
        when exists (
          select 1
          from public.travaux_maintenance tm
          where tm.vehicle_id = v.id
            and tm.status in ('queued', 'in_progress', 'blocked')
        ) then 'Entretien'
        else 'Inactif'
      end as badge,
      case
        when v.status = 'ok' then 'success'
        when exists (
          select 1
          from public.travaux_maintenance tm
          where tm.vehicle_id = v.id
            and tm.status in ('queued', 'in_progress', 'blocked')
        ) then 'warning'
        else 'default'
      end as badge_variant,
      '/dashboard/vehicles/' || v.id::text as href,
      case
        when lower(v.registration) like lower((select q from params)) || '%' then 10
        when v.registration ilike '%' || (select q from params) || '%' then 8
        when similarity(coalesce(v.registration, ''), (select q from params)) >= 0.1 then 6
        else 4
      end as score
    from public.vehicules v
    join target_fleet tf on tf.fleet_id = v.fleet_id
    where (select q from params) <> ''
      and (
        v.registration ilike '%' || (select q from params) || '%'
        or coalesce(v.brand, '') ilike '%' || (select q from params) || '%'
        or coalesce(v.model, '') ilike '%' || (select q from params) || '%'
        or similarity(coalesce(v.registration, ''), (select q from params)) >= 0.1
      )
    order by score desc, v.registration asc
    limit (select per_type from params)
  ),
  driver_results as (
    select
      p.user_id as id,
      'driver'::text as result_type,
      coalesce(p.full_name, 'Sans nom')::text as title,
      coalesce(p.phone, 'Pas de téléphone')::text as subtitle,
      fa.role::text as badge,
      null::text as badge_variant,
      '/dashboard/drivers'::text as href,
      case
        when lower(coalesce(p.full_name, '')) like lower((select q from params)) || '%' then 10
        when coalesce(p.full_name, '') ilike '%' || (select q from params) || '%' then 8
        when similarity(coalesce(p.full_name, ''), (select q from params)) >= 0.1 then 6
        when coalesce(p.phone, '') ilike '%' || (select q from params) || '%' then 5
        else 4
      end as score
    from public.flotte_adhesions fa
    join target_fleet tf on tf.fleet_id = fa.fleet_id
    join public.profils p on p.user_id = fa.user_id
    where fa.is_active = true
      and (select q from params) <> ''
      and (
        coalesce(p.full_name, '') ilike '%' || (select q from params) || '%'
        or coalesce(p.phone, '') ilike '%' || (select q from params) || '%'
        or similarity(coalesce(p.full_name, ''), (select q from params)) >= 0.1
      )
    order by score desc, title asc
    limit (select per_type from params)
  ),
  alert_results as (
    select
      aa.id,
      'alert'::text as result_type,
      aa.message::text as title,
      'Créée ' || to_char(aa.created_at, 'DD/MM/YYYY') as subtitle,
      case aa.severity
        when 'critical' then 'Critique'
        when 'high' then 'Élevée'
        when 'medium' then 'Moyenne'
        else 'Faible'
      end as badge,
      aa.severity::text as badge_variant,
      '/dashboard/alerts/' || aa.id::text as href,
      case
        when aa.severity = 'critical' then 10
        when aa.severity = 'high' then 8
        when aa.severity = 'medium' then 6
        else 4
      end as score
    from public.alertes_automatiques aa
    join target_fleet tf on tf.fleet_id = aa.fleet_id
    where (select q from params) <> ''
      and aa.resolved = false
      and (
        aa.message ilike '%' || (select q from params) || '%'
        or coalesce(aa.severity, '') ilike '%' || (select q from params) || '%'
        or similarity(coalesce(aa.message, ''), (select q from params)) >= 0.1
      )
    order by score desc, aa.created_at desc
    limit (select per_type from params)
  ),
  maintenance_results as (
    select
      tm.id,
      'maintenance'::text as result_type,
      'Entretien ' || tm.status as title,
      coalesce(to_char(tm.planned_at, 'DD/MM/YYYY'), 'Sans date') ||
        case when tm.notes is not null and tm.notes <> ''
          then ' · ' || left(tm.notes, 60)
          else ''
        end as subtitle,
      case when tm.closed_at is not null then 'Terminé' else 'Planifié' end as badge,
      case when tm.closed_at is not null then 'success' else 'info' end as badge_variant,
      '/dashboard/maintenance?job=' || tm.id::text as href,
      case
        when tm.closed_at is null then 7
        else 3
      end as score
    from public.travaux_maintenance tm
    join target_fleet tf on tf.fleet_id = tm.fleet_id
    where (select q from params) <> ''
      and (
        coalesce(tm.notes, '') ilike '%' || (select q from params) || '%'
        or coalesce(tm.status, '') ilike '%' || (select q from params) || '%'
        or coalesce(tm.priority, '') ilike '%' || (select q from params) || '%'
        or similarity(coalesce(tm.notes, ''), (select q from params)) >= 0.1
      )
    order by score desc, tm.planned_at desc nulls last, tm.created_at desc
    limit (select per_type from params)
  )
  select *
  from vehicle_results
  union all
  select * from driver_results
  union all
  select * from alert_results
  union all
  select * from maintenance_results;
$$;

grant execute on function public.search_fleet(text, int, uuid) to authenticated;

-- Compatibilité: conserver l'ancienne RPC côté client le temps de la transition.
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
language sql
stable
security invoker
as $$
  with base as (
    select
      v.id,
      v.fleet_id,
      v.registration as plate,
      v.brand,
      v.model,
      drv.full_name as driver_name,
      v.current_km as km,
      case
        when exists (
          select 1
          from public.travaux_maintenance tm
          where tm.vehicle_id = v.id
            and tm.status in ('queued', 'in_progress', 'blocked')
        ) then 'maintenance'
        when v.status = 'ok' then 'active'
        else 'idle'
      end as status,
      (
        select tm.status
        from public.travaux_maintenance tm
        where tm.vehicle_id = v.id
          and tm.status in ('queued', 'in_progress', 'blocked')
        order by
          case tm.status
            when 'in_progress' then 1
            when 'blocked' then 2
            else 3
          end,
          tm.created_at asc
        limit 1
      ) as pending_maint_type,
      (
        select aa.severity
        from public.alertes_automatiques aa
        where aa.vehicle_id = v.id
          and aa.resolved = false
        order by
          case aa.severity
            when 'critical' then 1
            when 'high' then 2
            when 'medium' then 3
            else 4
          end,
          aa.created_at desc
        limit 1
      ) as alert_severity,
      case (
        select aa.severity
        from public.alertes_automatiques aa
        where aa.vehicle_id = v.id
          and aa.resolved = false
        order by
          case aa.severity
            when 'critical' then 1
            when 'high' then 2
            when 'medium' then 3
            else 4
          end,
          aa.created_at desc
        limit 1
      )
        when 'critical' then 1
        when 'high' then 2
        when 'medium' then 3
        else 4
      end as alert_rank,
      (
        coalesce(v.registration, '') || ' ' ||
        coalesce(v.brand, '') || ' ' ||
        coalesce(v.model, '') || ' ' ||
        coalesce(drv.full_name, '')
      ) as search_text,
      greatest(
        similarity(coalesce(v.registration, ''), left(trim(coalesce(p_query, '')), 80)),
        similarity(coalesce(v.brand, ''), left(trim(coalesce(p_query, '')), 80)),
        similarity(coalesce(v.model, ''), left(trim(coalesce(p_query, '')), 80)),
        similarity(coalesce(drv.full_name, ''), left(trim(coalesce(p_query, '')), 80))
      ) as similarity
    from public.vehicules v
    left join lateral (
      select a.driver_user_id
      from public.affectations_vehicules a
      where a.vehicle_id = v.id
        and a.is_active = true
      order by a.starts_at desc
      limit 1
    ) active_assignment on true
    left join public.profils drv on drv.user_id = active_assignment.driver_user_id
    where v.fleet_id = p_fleet_id
      and (
        left(trim(coalesce(p_query, '')), 80) = ''
        or (
          coalesce(v.registration, '') ilike '%' || left(trim(coalesce(p_query, '')), 80) || '%'
          or coalesce(v.brand, '') ilike '%' || left(trim(coalesce(p_query, '')), 80) || '%'
          or coalesce(v.model, '') ilike '%' || left(trim(coalesce(p_query, '')), 80) || '%'
          or coalesce(drv.full_name, '') ilike '%' || left(trim(coalesce(p_query, '')), 80) || '%'
          or similarity(coalesce(v.registration, ''), left(trim(coalesce(p_query, '')), 80)) >= 0.1
        )
      )
      and (
        coalesce(array_length(p_status, 1), 0) = 0
        or (
          case
            when exists (
              select 1
              from public.travaux_maintenance tm
              where tm.vehicle_id = v.id
                and tm.status in ('queued', 'in_progress', 'blocked')
            ) then 'maintenance'
            when v.status = 'ok' then 'active'
            else 'idle'
          end
        ) = any(p_status)
      )
  ),
  filtered as (
    select *
    from base
    where (
      coalesce(array_length(p_maint, 1), 0) = 0
      or pending_maint_type = any(p_maint)
    )
    and (
      coalesce(array_length(p_alert, 1), 0) = 0
      or alert_severity = any(p_alert)
    )
  ),
  ranked as (
    select
      filtered.*,
      count(*) over () as total_count
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
    ranked.similarity,
    ranked.total_count
  from ranked
  order by
    case when p_sort_by = 'km' then ranked.km end desc nulls last,
    case when p_sort_by = 'alert' then ranked.alert_rank end asc nulls last,
    case when p_sort_by = 'similarity' then ranked.similarity end desc nulls last,
    case when p_sort_by = 'plate' then ranked.plate end asc nulls last,
    ranked.similarity desc,
    ranked.plate asc
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.rechercher_vehicules_flotte(uuid, text, text[], text[], text[], text, int, int)
to authenticated;
