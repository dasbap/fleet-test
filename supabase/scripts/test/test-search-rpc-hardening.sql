-- =====================================================
-- TESTS SQL PROD-READY : recherche véhicules (RPC sécurisée)
-- Couvre :
-- 1) Contrôle d'accès (autorisé / refusé)
-- 2) Pagination (limit / offset + total_count)
-- 3) Similarité (score pg_trgm non nul sur requête ciblée)
-- =====================================================
-- Usage: Supabase SQL Editor (ou psql connecté à la DB projet)
-- Le script est transactionnel et se termine par ROLLBACK.
-- =====================================================

begin;

do $$
declare
  v_allowed_user uuid;
  v_denied_user uuid;
  v_org_id uuid;
  v_fleet_id uuid;
  v_fleet_name text := 'TEST-SEARCH-' || to_char(now(), 'YYYYMMDDHH24MISS');
  v_page1_count int;
  v_page2_count int;
  v_page1_total bigint;
  v_page2_total bigint;
  v_similarity_max double precision;
begin
  -- Préconditions: fonction RPC
  if not exists (
    select 1
    from pg_proc
    where proname = 'rechercher_vehicules_flotte'
  ) then
    raise exception 'Fonction rechercher_vehicules_flotte introuvable';
  end if;

  -- Sélection d'utilisateurs de test
  select id
  into v_allowed_user
  from auth.users
  order by created_at desc
  limit 1;

  if v_allowed_user is null then
    raise exception 'Aucun utilisateur dans auth.users pour exécuter les tests';
  end if;

  select id
  into v_denied_user
  from auth.users
  where id <> v_allowed_user
  order by created_at asc
  limit 1;

  if v_denied_user is null then
    -- Fallback: UUID sans adhésion (doit être refusé)
    v_denied_user := gen_random_uuid();
  end if;

  -- Données de test minimales
  insert into organisations (name, country_code)
  values ('ORG ' || v_fleet_name, 'CM')
  returning id into v_org_id;

  insert into flottes (org_id, name, collection_policy)
  values (v_org_id, v_fleet_name, 'mix')
  returning id into v_fleet_id;

  insert into flotte_adhesions (fleet_id, user_id, role, is_active)
  values (v_fleet_id, v_allowed_user, 'organizer', true)
  on conflict (fleet_id, user_id, role) do update
  set is_active = true;

  insert into vehicules (fleet_id, registration, brand, model, current_km, status)
  values
    (v_fleet_id, 'TSR-001', 'Toyota', 'Hilux', 1000, 'ok'),
    (v_fleet_id, 'TSR-002', 'Isuzu', 'Dmax', 2000, 'ok'),
    (v_fleet_id, 'TSR-003', 'Hyundai', 'H1', 3000, 'ok'),
    (v_fleet_id, 'TSR-004', 'Nissan', 'Navara', 4000, 'blocked'),
    (v_fleet_id, 'TSR-005', 'Kia', 'K2700', 5000, 'ok');

  -- Données maintenance/alertes pour enrichir la vue
  insert into travaux_maintenance (vehicle_id, fleet_id, priority, status)
  select id, v_fleet_id, 'high', 'in_progress'
  from vehicules
  where fleet_id = v_fleet_id
    and registration = 'TSR-002';

  insert into alertes_automatiques (fleet_id, alert_type, vehicle_id, severity, message, resolved)
  select v_fleet_id, 'vehicle_blocked', id, 'critical', 'Alerte test critique', false
  from vehicules
  where fleet_id = v_fleet_id
    and registration = 'TSR-004';

  -- =====================================================
  -- TEST 1: autorisation (utilisateur membre flotte)
  -- =====================================================
  perform set_config('request.jwt.claim.sub', v_allowed_user::text, true);

  select count(*), max(total_count)
  into v_page1_count, v_page1_total
  from public.rechercher_vehicules_flotte(
    v_fleet_id,
    '',
    '{}'::text[],
    '{}'::text[],
    '{}'::text[],
    'plate',
    2,
    0
  );

  if v_page1_count <> 2 then
    raise exception 'Pagination page 1 invalide: attendu 2, obtenu %', v_page1_count;
  end if;

  if v_page1_total < 5 then
    raise exception 'total_count invalide page 1: attendu >= 5, obtenu %', v_page1_total;
  end if;

  -- =====================================================
  -- TEST 2: pagination offset
  -- =====================================================
  select count(*), max(total_count)
  into v_page2_count, v_page2_total
  from public.rechercher_vehicules_flotte(
    v_fleet_id,
    '',
    '{}'::text[],
    '{}'::text[],
    '{}'::text[],
    'plate',
    2,
    2
  );

  if v_page2_count <> 2 then
    raise exception 'Pagination page 2 invalide: attendu 2, obtenu %', v_page2_count;
  end if;

  if v_page1_total <> v_page2_total then
    raise exception 'total_count incohérent entre pages: % vs %', v_page1_total, v_page2_total;
  end if;

  -- =====================================================
  -- TEST 3: similarité réelle
  -- =====================================================
  select max(similarity)
  into v_similarity_max
  from public.rechercher_vehicules_flotte(
    v_fleet_id,
    'TSR-004',
    '{}'::text[],
    '{}'::text[],
    '{}'::text[],
    'similarity',
    10,
    0
  );

  if coalesce(v_similarity_max, 0) <= 0 then
    raise exception 'Score de similarité invalide: attendu > 0, obtenu %', v_similarity_max;
  end if;

  -- =====================================================
  -- TEST 4: refus d'accès (utilisateur sans adhésion)
  -- =====================================================
  perform set_config('request.jwt.claim.sub', v_denied_user::text, true);

  begin
    perform *
    from public.rechercher_vehicules_flotte(
      v_fleet_id,
      '',
      '{}'::text[],
      '{}'::text[],
      '{}'::text[],
      'plate',
      5,
      0
    );
    raise exception 'Contrôle d''accès invalide: utilisateur non membre non bloqué';
  exception
    when others then
      if position('Accès refusé à la flotte' in sqlerrm) = 0 then
        raise exception 'Erreur inattendue sur refus accès: %', sqlerrm;
      end if;
  end;

  raise notice '✅ Tests SQL recherche RPC: OK (droits/refus + pagination + similarité)';
end $$;

rollback;
