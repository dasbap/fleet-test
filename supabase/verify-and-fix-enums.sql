-- =====================================================
-- VÉRIFICATION ET CORRECTION DES TYPES ENUM
-- Script idempotent pour vérifier et créer/corriger les types enum
-- =====================================================

-- =====================================================
-- ÉTAPE 1: VÉRIFICATION DES TYPES ENUM EXISTANTS
-- =====================================================

-- Afficher les types enum existants et leurs valeurs
do $$
declare
  v_role_type_exists boolean;
  v_vehicle_status_exists boolean;
  v_closure_status_exists boolean;
  v_role_values text[];
  v_vehicle_values text[];
  v_closure_values text[];
begin
  -- Vérifier role_type
  select exists (
    select 1 from pg_type where typname = 'role_type'
  ) into v_role_type_exists;
  
  if v_role_type_exists then
    select array_agg(enumlabel order by enumsortorder)
    into v_role_values
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'role_type';
    
    raise notice 'role_type existe avec les valeurs: %', array_to_string(v_role_values, ', ');
  else
    raise notice 'role_type n''existe pas';
  end if;
  
  -- Vérifier vehicle_status
  select exists (
    select 1 from pg_type where typname = 'vehicle_status'
  ) into v_vehicle_status_exists;
  
  if v_vehicle_status_exists then
    select array_agg(enumlabel order by enumsortorder)
    into v_vehicle_values
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'vehicle_status';
    
    raise notice 'vehicle_status existe avec les valeurs: %', array_to_string(v_vehicle_values, ', ');
  else
    raise notice 'vehicle_status n''existe pas';
  end if;
  
  -- Vérifier closure_status
  select exists (
    select 1 from pg_type where typname = 'closure_status'
  ) into v_closure_status_exists;
  
  if v_closure_status_exists then
    select array_agg(enumlabel order by enumsortorder)
    into v_closure_values
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'closure_status';
    
    raise notice 'closure_status existe avec les valeurs: %', array_to_string(v_closure_values, ', ');
  else
    raise notice 'closure_status n''existe pas';
  end if;
end;
$$;

-- =====================================================
-- ÉTAPE 2: CRÉATION IDEMPOTENTE DES TYPES ENUM
-- =====================================================

-- Créer role_type si n'existe pas
do $$
begin
  if not exists (select 1 from pg_type where typname = 'role_type') then
    create type role_type as enum ('organizer','manager','driver','mechanic');
    raise notice 'Type role_type créé';
  else
    raise notice 'Type role_type existe déjà';
  end if;
exception
  when duplicate_object then
    raise notice 'Type role_type existe déjà (exception)';
end;
$$;

-- Créer vehicle_status si n'existe pas
do $$
begin
  if not exists (select 1 from pg_type where typname = 'vehicle_status') then
    create type vehicle_status as enum ('ok','blocked');
    raise notice 'Type vehicle_status créé';
  else
    raise notice 'Type vehicle_status existe déjà';
  end if;
exception
  when duplicate_object then
    raise notice 'Type vehicle_status existe déjà (exception)';
end;
$$;

-- Créer closure_status si n'existe pas
do $$
begin
  if not exists (select 1 from pg_type where typname = 'closure_status') then
    create type closure_status as enum ('pending','validated','rejected');
    raise notice 'Type closure_status créé';
  else
    raise notice 'Type closure_status existe déjà';
  end if;
exception
  when duplicate_object then
    raise notice 'Type closure_status existe déjà (exception)';
end;
$$;

-- =====================================================
-- ÉTAPE 3: VÉRIFICATION DES VALEURS MANQUANTES
-- =====================================================

-- Vérifier et ajouter les valeurs manquantes pour role_type
do $$
declare
  v_expected_values text[] := array['organizer','manager','driver','mechanic'];
  v_existing_values text[];
  v_missing_value text;
begin
  -- Récupérer les valeurs existantes
  select array_agg(enumlabel)
  into v_existing_values
  from pg_enum e
  join pg_type t on e.enumtypid = t.oid
  where t.typname = 'role_type';
  
  -- Vérifier chaque valeur attendue
  foreach v_missing_value in array v_expected_values
  loop
    if not (v_missing_value = any(v_existing_values)) then
      -- Note: ALTER TYPE ADD VALUE ne peut pas être dans une transaction
      -- et nécessite PostgreSQL 9.1+
      raise notice 'Valeur manquante dans role_type: %. Utilisez ALTER TYPE role_type ADD VALUE ''%'';', v_missing_value, v_missing_value;
    end if;
  end loop;
end;
$$;

-- Vérifier et ajouter les valeurs manquantes pour vehicle_status
do $$
declare
  v_expected_values text[] := array['ok','blocked'];
  v_existing_values text[];
  v_missing_value text;
begin
  select array_agg(enumlabel)
  into v_existing_values
  from pg_enum e
  join pg_type t on e.enumtypid = t.oid
  where t.typname = 'vehicle_status';
  
  foreach v_missing_value in array v_expected_values
  loop
    if not (v_missing_value = any(v_existing_values)) then
      raise notice 'Valeur manquante dans vehicle_status: %. Utilisez ALTER TYPE vehicle_status ADD VALUE ''%'';', v_missing_value, v_missing_value;
    end if;
  end loop;
end;
$$;

-- Vérifier et ajouter les valeurs manquantes pour closure_status
do $$
declare
  v_expected_values text[] := array['pending','validated','rejected'];
  v_existing_values text[];
  v_missing_value text;
begin
  select array_agg(enumlabel)
  into v_existing_values
  from pg_enum e
  join pg_type t on e.enumtypid = t.oid
  where t.typname = 'closure_status';
  
  foreach v_missing_value in array v_expected_values
  loop
    if not (v_missing_value = any(v_existing_values)) then
      raise notice 'Valeur manquante dans closure_status: %. Utilisez ALTER TYPE closure_status ADD VALUE ''%'';', v_missing_value, v_missing_value;
    end if;
  end loop;
end;
$$;

-- =====================================================
-- ÉTAPE 4: RAPPORT FINAL
-- =====================================================

-- Afficher le rapport final des types enum
select 
  t.typname as type_name,
  string_agg(e.enumlabel, ', ' order by e.enumsortorder) as valeurs,
  count(e.enumlabel) as nombre_valeurs
from pg_type t
join pg_enum e on e.enumtypid = t.oid
where t.typname in ('role_type', 'vehicle_status', 'closure_status')
group by t.typname
order by t.typname;

-- =====================================================
-- RECOMMANDATIONS
-- =====================================================

-- Si des valeurs manquantes sont détectées, vous avez deux options:
-- 
-- OPTION 1: ALTER TYPE ADD VALUE (recommandé si le type est déjà utilisé)
--   ALTER TYPE role_type ADD VALUE IF NOT EXISTS 'nouvelle_valeur';
--   Note: Cette commande ne peut pas être dans une transaction
--   et nécessite PostgreSQL 9.1+ avec support IF NOT EXISTS (10+)
--
-- OPTION 2: DROP TYPE CASCADE + CREATE TYPE (si aucune donnée importante)
--   DROP TYPE IF EXISTS role_type CASCADE;
--   CREATE TYPE role_type AS ENUM ('organizer','manager','driver','mechanic');
--   Note: Cela supprimera toutes les colonnes et dépendances utilisant ce type
--
-- Pour ce script, nous utilisons l'OPTION 1 (ALTER TYPE) car plus sûre en production
