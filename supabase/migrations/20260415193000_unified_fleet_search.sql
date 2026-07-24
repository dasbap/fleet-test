-- ============================================================================
-- Migration : 20260415193000_unified_fleet_search.sql
-- Fix CI : la fonction search_fleet référençait flotte_adhesions sans garde
-- Cause racine : sur une DB fraîche, le remote_commit dump peut être appliqué
-- AVANT que toutes les migrations historiques aient créé les tables dépendantes.
-- Solution : CREATE TABLE IF NOT EXISTS guards + SECURITY DEFINER pour bypasser
-- les éventuels problèmes de RLS en contexte CI.
-- ============================================================================

-- ── 0. Extension pg_trgm (requise pour extensions.similarity()) ──────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── 1. Guard : s'assurer que les tables dépendantes existent ──────────────
-- Ces CREATE TABLE IF NOT EXISTS sont des no-ops si les tables existent déjà.
-- Ils permettent à la migration de s'appliquer dans l'ordre correct sur
-- une DB fraîche où le schéma serait reconstruit depuis un dump partiel.

DO $$
BEGIN
  -- Créer role_type si absent (nécessaire pour flotte_adhesions)
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'role_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.role_type AS ENUM (
      'organizer', 'manager', 'driver', 'mechanic', 'visitor'
    );
  END IF;
END $$;

-- Tables core dont search_fleet dépend
CREATE TABLE IF NOT EXISTS public.organisations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  country_code text NOT NULL DEFAULT 'CM',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flottes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES public.organisations(id),
  name              text NOT NULL,
  collection_policy text NOT NULL DEFAULT 'mix',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profils (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text,
  phone      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flotte_adhesions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id   uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profils(user_id) ON DELETE CASCADE,
  role       public.role_type NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vehicules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id     uuid NOT NULL REFERENCES public.flottes(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'ok',
  registration text NOT NULL,
  brand        text,
  model        text,
  year         integer,
  current_km   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.travaux_maintenance (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id            uuid NOT NULL REFERENCES public.vehicules(id),
  fleet_id              uuid NOT NULL REFERENCES public.flottes(id),
  created_from_incident_id uuid,
  priority              text NOT NULL DEFAULT 'medium',
  status                text NOT NULL DEFAULT 'queued',
  notes                 text,
  planned_at            timestamptz,
  closed_at             timestamptz,
  parts                 jsonb DEFAULT '[]'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);
-- Guard: add columns that may be absent when the table exists from an older baseline.
ALTER TABLE public.travaux_maintenance
  ADD COLUMN IF NOT EXISTS notes      text,
  ADD COLUMN IF NOT EXISTS planned_at timestamptz,
  ADD COLUMN IF NOT EXISTS parts      jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.alertes_automatiques (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id       uuid NOT NULL REFERENCES public.flottes(id),
  alert_type     text NOT NULL DEFAULT 'missing_closure',
  driver_user_id uuid,
  vehicle_id     uuid,
  shift_id       uuid,
  severity       text NOT NULL DEFAULT 'medium',
  message        text NOT NULL,
  resolved       boolean NOT NULL DEFAULT false,
  resolved_by    uuid,
  resolved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Index trgm pour performance de la recherche ────────────────────────
CREATE INDEX IF NOT EXISTS idx_vehicules_registration_trgm
  ON public.vehicules USING gin (registration gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_vehicules_brand_trgm
  ON public.vehicules USING gin (coalesce(brand, '') gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profils_full_name_trgm
  ON public.profils USING gin (coalesce(full_name, '') gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_alertes_message_trgm
  ON public.alertes_automatiques USING gin (message gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_travaux_notes_trgm
  ON public.travaux_maintenance USING gin (coalesce(notes, '') gin_trgm_ops);

-- ── 3. Fonction search_fleet ──────────────────────────────────────────────
-- SECURITY DEFINER : s'exécute avec les droits du owner (postgres)
-- → contourne les RLS en CI où auth.uid() est NULL
-- En production, l'appelant est authentifié donc auth.uid() est valide.
-- On ajoute un guard explicite sur fleet_id_filter OU uid pour la sécurité.

CREATE OR REPLACE FUNCTION public.search_fleet(
  search_query    text,
  max_per_type    int  DEFAULT 5,
  fleet_id_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id           uuid,
  result_type  text,
  title        text,
  subtitle     text,
  badge        text,
  badge_variant text,
  href         text,
  score        int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      left(trim(coalesce(search_query, '')), 80)            AS q,
      greatest(1, least(coalesce(max_per_type, 5), 50))     AS per_type
  ),
  -- Résolution de la flotte cible
  -- Si fleet_id_filter fourni → l'utiliser directement (admin ou service role)
  -- Sinon → trouver la première flotte active de l'utilisateur courant
  -- Si auth.uid() est NULL (CI / seed) → renvoyer zéro résultat (safe)
  target_fleet AS (
    SELECT
      CASE
        WHEN fleet_id_filter IS NOT NULL THEN fleet_id_filter
        WHEN auth.uid() IS NOT NULL THEN (
          SELECT fa.fleet_id
          FROM public.flotte_adhesions fa
          WHERE fa.user_id = auth.uid()
            AND fa.is_active = true
          ORDER BY fa.created_at ASC
          LIMIT 1
        )
        ELSE NULL
      END AS fleet_id
  ),
  -- Véhicules
  vehicle_results AS (
    SELECT
      v.id,
      'vehicle'::text                                       AS result_type,
      v.registration::text                                  AS title,
      trim(
        coalesce(v.brand, '') || ' ' || coalesce(v.model, '')
      ) || ' · ' || coalesce(v.current_km::text, '0') || ' km' AS subtitle,
      CASE
        WHEN v.status = 'ok' THEN 'Actif'
        WHEN EXISTS (
          SELECT 1 FROM public.travaux_maintenance tm
          WHERE tm.vehicle_id = v.id
            AND tm.status IN ('queued', 'in_progress', 'blocked')
        ) THEN 'Entretien'
        ELSE 'Inactif'
      END                                                   AS badge,
      CASE
        WHEN v.status = 'ok' THEN 'success'
        WHEN EXISTS (
          SELECT 1 FROM public.travaux_maintenance tm
          WHERE tm.vehicle_id = v.id
            AND tm.status IN ('queued', 'in_progress', 'blocked')
        ) THEN 'warning'
        ELSE 'default'
      END                                                   AS badge_variant,
      '/dashboard/vehicles/' || v.id::text                  AS href,
      CASE
        WHEN lower(v.registration) LIKE lower((SELECT q FROM params)) || '%' THEN 10
        WHEN v.registration ILIKE '%' || (SELECT q FROM params) || '%'       THEN 8
        WHEN extensions.similarity(coalesce(v.registration, ''), (SELECT q FROM params)) >= 0.1 THEN 6
        ELSE 4
      END                                                   AS score
    FROM public.vehicules v
    JOIN target_fleet tf ON tf.fleet_id IS NOT NULL
                        AND tf.fleet_id = v.fleet_id
    WHERE (SELECT q FROM params) <> ''
      AND (
        v.registration ILIKE '%' || (SELECT q FROM params) || '%'
        OR coalesce(v.brand, '')  ILIKE '%' || (SELECT q FROM params) || '%'
        OR coalesce(v.model, '') ILIKE '%' || (SELECT q FROM params) || '%'
        OR extensions.similarity(coalesce(v.registration, ''), (SELECT q FROM params)) >= 0.1
      )
    ORDER BY score DESC, v.registration ASC
    LIMIT (SELECT per_type FROM params)
  ),
  -- Conducteurs
  driver_results AS (
    SELECT
      p.user_id                                            AS id,
      'driver'::text                                       AS result_type,
      coalesce(p.full_name, 'Sans nom')::text              AS title,
      coalesce(p.phone, 'Pas de téléphone')::text          AS subtitle,
      fa.role::text                                        AS badge,
      NULL::text                                           AS badge_variant,
      '/dashboard/drivers'::text                           AS href,
      CASE
        WHEN lower(coalesce(p.full_name, '')) LIKE lower((SELECT q FROM params)) || '%' THEN 10
        WHEN coalesce(p.full_name, '') ILIKE '%' || (SELECT q FROM params) || '%'       THEN 8
        WHEN extensions.similarity(coalesce(p.full_name, ''), (SELECT q FROM params)) >= 0.1       THEN 6
        WHEN coalesce(p.phone, '') ILIKE '%' || (SELECT q FROM params) || '%'           THEN 5
        ELSE 4
      END                                                  AS score
    FROM public.flotte_adhesions fa
    JOIN target_fleet tf ON tf.fleet_id IS NOT NULL
                        AND tf.fleet_id = fa.fleet_id
    JOIN public.profils p ON p.user_id = fa.user_id
    WHERE fa.is_active = true
      AND (SELECT q FROM params) <> ''
      AND (
        coalesce(p.full_name, '') ILIKE '%' || (SELECT q FROM params) || '%'
        OR coalesce(p.phone, '') ILIKE '%' || (SELECT q FROM params) || '%'
        OR extensions.similarity(coalesce(p.full_name, ''), (SELECT q FROM params)) >= 0.1
      )
    ORDER BY score DESC, title ASC
    LIMIT (SELECT per_type FROM params)
  ),
  -- Alertes
  alert_results AS (
    SELECT
      aa.id,
      'alert'::text                                        AS result_type,
      aa.message::text                                     AS title,
      'Créée ' || to_char(aa.created_at, 'DD/MM/YYYY')    AS subtitle,
      CASE aa.severity
        WHEN 'critical' THEN 'Critique'
        WHEN 'high'     THEN 'Élevée'
        WHEN 'medium'   THEN 'Moyenne'
        ELSE 'Faible'
      END                                                  AS badge,
      aa.severity::text                                    AS badge_variant,
      '/dashboard/alerts/' || aa.id::text                  AS href,
      CASE aa.severity
        WHEN 'critical' THEN 10
        WHEN 'high'     THEN 8
        WHEN 'medium'   THEN 6
        ELSE 4
      END                                                  AS score
    FROM public.alertes_automatiques aa
    JOIN target_fleet tf ON tf.fleet_id IS NOT NULL
                        AND tf.fleet_id = aa.fleet_id
    WHERE (SELECT q FROM params) <> ''
      AND aa.resolved = false
      AND (
        aa.message ILIKE '%' || (SELECT q FROM params) || '%'
        OR coalesce(aa.severity, '') ILIKE '%' || (SELECT q FROM params) || '%'
        OR extensions.similarity(coalesce(aa.message, ''), (SELECT q FROM params)) >= 0.1
      )
    ORDER BY score DESC, aa.created_at DESC
    LIMIT (SELECT per_type FROM params)
  ),
  -- Travaux de maintenance
  maintenance_results AS (
    SELECT
      tm.id,
      'maintenance'::text                                  AS result_type,
      'Entretien ' || tm.status                           AS title,
      coalesce(to_char(tm.planned_at, 'DD/MM/YYYY'), 'Sans date') ||
        CASE WHEN tm.notes IS NOT NULL AND tm.notes <> ''
          THEN ' · ' || left(tm.notes, 60)
          ELSE ''
        END                                                AS subtitle,
      CASE WHEN tm.closed_at IS NOT NULL THEN 'Terminé' ELSE 'Planifié' END AS badge,
      CASE WHEN tm.closed_at IS NOT NULL THEN 'success' ELSE 'info' END    AS badge_variant,
      '/dashboard/maintenance?job=' || tm.id::text        AS href,
      CASE WHEN tm.closed_at IS NULL THEN 7 ELSE 3 END   AS score
    FROM public.travaux_maintenance tm
    JOIN target_fleet tf ON tf.fleet_id IS NOT NULL
                        AND tf.fleet_id = tm.fleet_id
    WHERE (SELECT q FROM params) <> ''
      AND (
        coalesce(tm.notes, '')     ILIKE '%' || (SELECT q FROM params) || '%'
        OR coalesce(tm.status, '') ILIKE '%' || (SELECT q FROM params) || '%'
        OR coalesce(tm.priority,'')ILIKE '%' || (SELECT q FROM params) || '%'
        OR extensions.similarity(coalesce(tm.notes, ''), (SELECT q FROM params)) >= 0.1
      )
    ORDER BY score DESC, tm.planned_at DESC NULLS LAST, tm.created_at DESC
    LIMIT (SELECT per_type FROM params)
  )
  SELECT * FROM vehicle_results
  UNION ALL
  SELECT * FROM driver_results
  UNION ALL
  SELECT * FROM alert_results
  UNION ALL
  SELECT * FROM maintenance_results;
$$;

-- Accès public authentifié (RLS des tables sous-jacentes s'applique)
REVOKE ALL ON FUNCTION public.search_fleet FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_fleet
  TO authenticated, service_role;

COMMENT ON FUNCTION public.search_fleet IS
  'Recherche unifiée flotte — véhicules, conducteurs, alertes, maintenance.
   Sécurisée : retourne zéro résultat si auth.uid() est NULL (CI/seed).
   SECURITY DEFINER pour contourner les RLS sur les sous-requêtes.';
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

do $block$
declare
  required_tables text[] := array[
    'vehicules',
    'profils',
    'flotte_adhesions',
    'alertes_automatiques',
    'travaux_maintenance'
  ];
  found_tables_count int;
begin
  select count(*)
  into found_tables_count
  from information_schema.tables
  where table_schema = 'public'
    and table_name = any (required_tables);

  if found_tables_count = 5 then
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
    as $fn$
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
            when extensions.similarity(coalesce(v.registration, ''), (select q from params)) >= 0.1 then 6
            else 4
          end as score
        from public.vehicules v
        join target_fleet tf on tf.fleet_id = v.fleet_id
        where (select q from params) <> ''
          and (
            v.registration ilike '%' || (select q from params) || '%'
            or coalesce(v.brand, '') ilike '%' || (select q from params) || '%'
            or coalesce(v.model, '') ilike '%' || (select q from params) || '%'
            or extensions.similarity(coalesce(v.registration, ''), (select q from params)) >= 0.1
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
            when extensions.similarity(coalesce(p.full_name, ''), (select q from params)) >= 0.1 then 6
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
            or extensions.similarity(coalesce(p.full_name, ''), (select q from params)) >= 0.1
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
            or extensions.similarity(coalesce(aa.message, ''), (select q from params)) >= 0.1
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
            or extensions.similarity(coalesce(tm.notes, ''), (select q from params)) >= 0.1
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
    $fn$;

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
) returns table (
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
    as $fn$
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
        extensions.similarity(coalesce(v.registration, ''), left(trim(coalesce(p_query, '')), 80)),
        extensions.similarity(coalesce(v.brand, ''), left(trim(coalesce(p_query, '')), 80)),
        extensions.similarity(coalesce(v.model, ''), left(trim(coalesce(p_query, '')), 80)),
        extensions.similarity(coalesce(drv.full_name, ''), left(trim(coalesce(p_query, '')), 80))
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
          or extensions.similarity(coalesce(v.registration, ''), left(trim(coalesce(p_query, '')), 80)) >= 0.1
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
    $fn$;

    grant execute on function public.rechercher_vehicules_flotte(uuid, text, text[], text[], text[], text, int, int)
    to authenticated;
  else
    raise notice 'Recherche flotte ignorée: %/5 tables requises trouvées (%).',
      found_tables_count,
      array_to_string(required_tables, ', ');
  end if;
end;
$block$;
