-- =====================================================
-- CORRECTION IDEMPOTENTE DES TYPES ENUM
-- Utilise ALTER TYPE ADD VALUE (sûr en production)
-- N'affecte pas les données existantes
-- Ajoute uniquement les valeurs manquantes
-- =====================================================

-- =====================================================
-- ÉTAPE 1: CRÉATION IDEMPOTENTE DES TYPES ENUM
-- =====================================================

-- Créer role_type si n'existe pas
do $$
begin
  if not exists (select 1 from pg_type where typname = 'role_type') then
    create type role_type as enum ('organizer','manager','driver','mechanic');
    raise notice '✓ Type role_type créé avec succès';
  else
    raise notice '✓ Type role_type existe déjà';
  end if;
exception
  when duplicate_object then
    raise notice '✓ Type role_type existe déjà (exception)';
end;
$$;

-- Créer vehicle_status si n'existe pas
do $$
begin
  if not exists (select 1 from pg_type where typname = 'vehicle_status') then
    create type vehicle_status as enum ('ok','blocked');
    raise notice '✓ Type vehicle_status créé avec succès';
  else
    raise notice '✓ Type vehicle_status existe déjà';
  end if;
exception
  when duplicate_object then
    raise notice '✓ Type vehicle_status existe déjà (exception)';
end;
$$;

-- Créer closure_status si n'existe pas
do $$
begin
  if not exists (select 1 from pg_type where typname = 'closure_status') then
    create type closure_status as enum ('pending','validated','rejected');
    raise notice '✓ Type closure_status créé avec succès';
  else
    raise notice '✓ Type closure_status existe déjà';
  end if;
exception
  when duplicate_object then
    raise notice '✓ Type closure_status existe déjà (exception)';
end;
$$;

-- =====================================================
-- ÉTAPE 2: AJOUT IDEMPOTENT DES VALEURS MANQUANTES
-- Utilise ALTER TYPE ADD VALUE (recommandé en production)
-- =====================================================

-- Pour role_type: ajouter les valeurs manquantes
do $$
declare
  v_expected_values text[] := array['organizer','manager','driver','mechanic'];
  v_existing_values text[];
  v_value text;
begin
  -- Récupérer les valeurs existantes
  select array_agg(enumlabel)
  into v_existing_values
  from pg_enum e
  join pg_type t on e.enumtypid = t.oid
  where t.typname = 'role_type';
  
  -- Ajouter chaque valeur manquante
  foreach v_value in array v_expected_values
  loop
    if not (v_value = any(coalesce(v_existing_values, array[]::text[]))) then
      -- Vérifier à nouveau avant d'ajouter (double vérification)
      if not exists (
        select 1
        from pg_enum e
        join pg_type t on e.enumtypid = t.oid
        where t.typname = 'role_type' and e.enumlabel = v_value
      ) then
        -- ALTER TYPE ADD VALUE - sûr en production
        -- Note: Cette commande ne peut pas être dans une transaction
        -- mais fonctionne dans un bloc DO
        begin
          execute format('ALTER TYPE role_type ADD VALUE IF NOT EXISTS %L', v_value);
          raise notice '✓ Valeur "%" ajoutée à role_type', v_value;
        exception
          when others then
            -- Si IF NOT EXISTS n'est pas supporté (PostgreSQL < 10)
            -- Vérifier une dernière fois avant d'ajouter
            if not exists (
              select 1
              from pg_enum e
              join pg_type t on e.enumtypid = t.oid
              where t.typname = 'role_type' and e.enumlabel = v_value
            ) then
              execute format('ALTER TYPE role_type ADD VALUE %L', v_value);
              raise notice '✓ Valeur "%" ajoutée à role_type (sans IF NOT EXISTS)', v_value;
            end if;
        end;
      end if;
    end if;
  end loop;
end;
$$;

-- Pour vehicle_status: ajouter les valeurs manquantes
do $$
declare
  v_expected_values text[] := array['ok','blocked'];
  v_existing_values text[];
  v_value text;
begin
  select array_agg(enumlabel)
  into v_existing_values
  from pg_enum e
  join pg_type t on e.enumtypid = t.oid
  where t.typname = 'vehicle_status';
  
  foreach v_value in array v_expected_values
  loop
    if not (v_value = any(coalesce(v_existing_values, array[]::text[]))) then
      if not exists (
        select 1
        from pg_enum e
        join pg_type t on e.enumtypid = t.oid
        where t.typname = 'vehicle_status' and e.enumlabel = v_value
      ) then
        begin
          execute format('ALTER TYPE vehicle_status ADD VALUE IF NOT EXISTS %L', v_value);
          raise notice '✓ Valeur "%" ajoutée à vehicle_status', v_value;
        exception
          when others then
            if not exists (
              select 1
              from pg_enum e
              join pg_type t on e.enumtypid = t.oid
              where t.typname = 'vehicle_status' and e.enumlabel = v_value
            ) then
              execute format('ALTER TYPE vehicle_status ADD VALUE %L', v_value);
              raise notice '✓ Valeur "%" ajoutée à vehicle_status (sans IF NOT EXISTS)', v_value;
            end if;
        end;
      end if;
    end if;
  end loop;
end;
$$;

-- Pour closure_status: ajouter les valeurs manquantes
do $$
declare
  v_expected_values text[] := array['pending','validated','rejected'];
  v_existing_values text[];
  v_value text;
begin
  select array_agg(enumlabel)
  into v_existing_values
  from pg_enum e
  join pg_type t on e.enumtypid = t.oid
  where t.typname = 'closure_status';
  
  foreach v_value in array v_expected_values
  loop
    if not (v_value = any(coalesce(v_existing_values, array[]::text[]))) then
      if not exists (
        select 1
        from pg_enum e
        join pg_type t on e.enumtypid = t.oid
        where t.typname = 'closure_status' and e.enumlabel = v_value
      ) then
        begin
          execute format('ALTER TYPE closure_status ADD VALUE IF NOT EXISTS %L', v_value);
          raise notice '✓ Valeur "%" ajoutée à closure_status', v_value;
        exception
          when others then
            if not exists (
              select 1
              from pg_enum e
              join pg_type t on e.enumtypid = t.oid
              where t.typname = 'closure_status' and e.enumlabel = v_value
            ) then
              execute format('ALTER TYPE closure_status ADD VALUE %L', v_value);
              raise notice '✓ Valeur "%" ajoutée à closure_status (sans IF NOT EXISTS)', v_value;
            end if;
        end;
      end if;
    end if;
  end loop;
end;
$$;

-- =====================================================
-- ÉTAPE 3: RAPPORT FINAL DE VÉRIFICATION
-- =====================================================

-- Afficher l'état final de tous les types enum
select 
  t.typname as "Type Enum",
  string_agg(e.enumlabel, ', ' order by e.enumsortorder) as "Valeurs",
  count(e.enumlabel) as "Nombre"
from pg_type t
join pg_enum e on e.enumtypid = t.oid
where t.typname in ('role_type', 'vehicle_status', 'closure_status')
group by t.typname
order by t.typname;

-- =====================================================
-- ÉTAPE 4: VÉRIFICATION DE COHÉRENCE
-- =====================================================

do $$
declare
  v_missing_types text[];
  v_all_ok boolean := true;
begin
  -- Vérifier que tous les types existent
  select array_agg(missing)
  into v_missing_types
  from (
    select 'role_type' as missing
    where not exists (select 1 from pg_type where typname = 'role_type')
    union all
    select 'vehicle_status'
    where not exists (select 1 from pg_type where typname = 'vehicle_status')
    union all
    select 'closure_status'
    where not exists (select 1 from pg_type where typname = 'closure_status')
  ) t;
  
  if v_missing_types is not null and array_length(v_missing_types, 1) > 0 then
    raise warning '⚠ Types manquants: %', array_to_string(v_missing_types, ', ');
    v_all_ok := false;
  end if;
  
  -- Vérifier les valeurs attendues
  -- role_type
  if not exists (
    select 1 from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'role_type' and e.enumlabel = 'organizer'
  ) then
    raise warning '⚠ Valeur "organizer" manquante dans role_type';
    v_all_ok := false;
  end if;
  
  if not exists (
    select 1 from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'role_type' and e.enumlabel = 'manager'
  ) then
    raise warning '⚠ Valeur "manager" manquante dans role_type';
    v_all_ok := false;
  end if;
  
  if not exists (
    select 1 from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'role_type' and e.enumlabel = 'driver'
  ) then
    raise warning '⚠ Valeur "driver" manquante dans role_type';
    v_all_ok := false;
  end if;
  
  if not exists (
    select 1 from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'role_type' and e.enumlabel = 'mechanic'
  ) then
    raise warning '⚠ Valeur "mechanic" manquante dans role_type';
    v_all_ok := false;
  end if;
  
  -- vehicle_status
  if not exists (
    select 1 from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'vehicle_status' and e.enumlabel = 'ok'
  ) then
    raise warning '⚠ Valeur "ok" manquante dans vehicle_status';
    v_all_ok := false;
  end if;
  
  if not exists (
    select 1 from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'vehicle_status' and e.enumlabel = 'blocked'
  ) then
    raise warning '⚠ Valeur "blocked" manquante dans vehicle_status';
    v_all_ok := false;
  end if;
  
  -- closure_status
  if not exists (
    select 1 from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'closure_status' and e.enumlabel = 'pending'
  ) then
    raise warning '⚠ Valeur "pending" manquante dans closure_status';
    v_all_ok := false;
  end if;
  
  if not exists (
    select 1 from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'closure_status' and e.enumlabel = 'validated'
  ) then
    raise warning '⚠ Valeur "validated" manquante dans closure_status';
    v_all_ok := false;
  end if;
  
  if not exists (
    select 1 from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'closure_status' and e.enumlabel = 'rejected'
  ) then
    raise warning '⚠ Valeur "rejected" manquante dans closure_status';
    v_all_ok := false;
  end if;
  
  if v_all_ok then
    raise notice '✅ Tous les types enum et leurs valeurs sont correctement configurés';
  end if;
end;
$$;
