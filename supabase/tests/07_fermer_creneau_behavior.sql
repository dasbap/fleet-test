-- Vérifie le comportement de fermer_creneau (clôture + km véhicule côté serveur).

-- 1) Définition : la RPC doit mettre à jour current_km via GREATEST
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(
    'public.fermer_creneau(uuid,integer,integer,text,text,text,text)'::regprocedure
  )
  INTO v_def;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'fonction manquante: fermer_creneau(uuid,int,int,text,text,text,text)';
  END IF;

  IF position('update vehicules' in lower(v_def)) = 0
     AND position('update public.vehicules' in lower(v_def)) = 0 THEN
    RAISE EXCEPTION 'fermer_creneau: UPDATE vehicules absent du corps de fonction';
  END IF;

  IF position('greatest' in lower(v_def)) = 0 THEN
    RAISE EXCEPTION 'fermer_creneau: GREATEST(current_km, ...) absent du corps de fonction';
  END IF;
END $$;

-- 2) Comportement : créneau fermé, clôture pending, km véhicule mis à jour
DO $$
DECLARE
  v_user_id uuid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  v_org_id uuid;
  v_fleet_id uuid;
  v_vehicle_id uuid;
  v_assignment_id uuid;
  v_shift_id uuid;
  v_km_before int := 45230;
  v_km_end int := 45310;
  v_km_after int;
  v_shift_km_end int;
  v_shift_status text;
  v_closure_status text;
BEGIN
  DELETE FROM clotures_creneaux WHERE shift_id IN (
    SELECT c.id FROM creneaux_conducteurs c
    JOIN affectations_vehicules a ON a.id = c.assignment_id
    WHERE a.driver_user_id = v_user_id OR a.created_by = v_user_id
  );
  DELETE FROM creneaux_conducteurs WHERE assignment_id IN (
    SELECT id FROM affectations_vehicules
    WHERE driver_user_id = v_user_id OR created_by = v_user_id
  );
  DELETE FROM affectations_vehicules
  WHERE driver_user_id = v_user_id OR created_by = v_user_id;
  DELETE FROM profils WHERE user_id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'test-fermer-creneau@example.com',
    crypt('test-password', gen_salt('bf')),
    now(),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profils (user_id, full_name)
  VALUES (v_user_id, 'Test fermer_creneau')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO organisations (name, country_code)
  VALUES ('Test fermer_creneau', 'CM')
  RETURNING id INTO v_org_id;

  INSERT INTO flottes (org_id, name)
  VALUES (v_org_id, 'Flotte test fermer_creneau')
  RETURNING id INTO v_fleet_id;

  INSERT INTO vehicules (fleet_id, registration, brand, model, current_km, status)
  VALUES (v_fleet_id, 'TEST-FERM-01', 'Toyota', 'Corolla', v_km_before, 'ok')
  RETURNING id INTO v_vehicle_id;

  INSERT INTO affectations_vehicules (
    fleet_id,
    vehicle_id,
    driver_user_id,
    starts_at,
    is_active,
    created_by
  )
  VALUES (v_fleet_id, v_vehicle_id, v_user_id, now(), true, v_user_id)
  RETURNING id INTO v_assignment_id;

  INSERT INTO creneaux_conducteurs (assignment_id, km_start, status, started_at)
  VALUES (v_assignment_id, v_km_before, 'open', now())
  RETURNING id INTO v_shift_id;

  PERFORM public.fermer_creneau(
    v_shift_id::uuid,
    v_km_end::integer,
    15000::integer,
    'cash'::text,
    'photo'::text,
    'proof-test-fermer'::text,
    'idem-test-fermer-1'::text
  );

  SELECT status INTO v_shift_status
  FROM creneaux_conducteurs
  WHERE id = v_shift_id;

  IF v_shift_status IS DISTINCT FROM 'closed' THEN
    RAISE EXCEPTION 'creneau non fermé: status=%', v_shift_status;
  END IF;

  SELECT status::text INTO v_closure_status
  FROM clotures_creneaux
  WHERE shift_id = v_shift_id;

  IF v_closure_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'cloture non pending: status=%', v_closure_status;
  END IF;

  SELECT current_km INTO v_km_after
  FROM vehicules
  WHERE id = v_vehicle_id;

  IF v_km_after <> v_km_end THEN
    RAISE EXCEPTION 'current_km attendu %, obtenu %', v_km_end, v_km_after;
  END IF;

  -- GREATEST : re-clôture avec km inférieur ne doit pas régresser km_end ni current_km
  PERFORM public.fermer_creneau(
    v_shift_id::uuid,
    (v_km_before - 100)::integer,
    15000::integer,
    'cash'::text,
    'photo'::text,
    'proof-test-fermer-2'::text,
    'idem-test-fermer-2'::text
  );

  SELECT km_end INTO v_shift_km_end
  FROM creneaux_conducteurs
  WHERE id = v_shift_id;

  IF v_shift_km_end <> v_km_end THEN
    RAISE EXCEPTION 'GREATEST: km_end créneau régressé à %', v_shift_km_end;
  END IF;

  SELECT current_km INTO v_km_after
  FROM vehicules
  WHERE id = v_vehicle_id;

  IF v_km_after <> v_km_end THEN
    RAISE EXCEPTION 'GREATEST: current_km régressé à %', v_km_after;
  END IF;

  -- GREATEST véhicule : km compteur déjà supérieur au km de clôture
  UPDATE vehicules SET current_km = v_km_end + 500 WHERE id = v_vehicle_id;

  INSERT INTO creneaux_conducteurs (assignment_id, km_start, status, started_at)
  VALUES (v_assignment_id, v_km_end, 'open', now())
  RETURNING id INTO v_shift_id;

  PERFORM public.fermer_creneau(
    v_shift_id::uuid,
    (v_km_end + 50)::integer,
    15000::integer,
    'cash'::text,
    'photo'::text,
    'proof-test-fermer-3'::text,
    'idem-test-fermer-3'::text
  );

  SELECT current_km INTO v_km_after
  FROM vehicules
  WHERE id = v_vehicle_id;

  IF v_km_after <> v_km_end + 500 THEN
    RAISE EXCEPTION 'GREATEST véhicule: current_km attendu %, obtenu %', v_km_end + 500, v_km_after;
  END IF;

  DELETE FROM clotures_creneaux WHERE shift_id IN (
    SELECT c.id FROM creneaux_conducteurs c
    JOIN affectations_vehicules a ON a.id = c.assignment_id
    WHERE a.driver_user_id = v_user_id
  );
  DELETE FROM creneaux_conducteurs WHERE assignment_id IN (
    SELECT id FROM affectations_vehicules WHERE driver_user_id = v_user_id
  );
  DELETE FROM affectations_vehicules
  WHERE driver_user_id = v_user_id OR created_by = v_user_id;
  DELETE FROM vehicules WHERE fleet_id = v_fleet_id;
  DELETE FROM flottes WHERE id = v_fleet_id;
  DELETE FROM organisations WHERE id = v_org_id;
  DELETE FROM profils WHERE user_id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;
END $$;
