-- Plafond véhicules : contexte billing interne + trigger + RPC public (auth).

DO $$
DECLARE
  v_user_id uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_org_id uuid;
  v_fleet_id uuid;
  v_bad_fleet uuid := gen_random_uuid();
  v_ctx jsonb;
  i int;
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
  DELETE FROM public.flotte_adhesions WHERE user_id = v_user_id;
  DELETE FROM profils WHERE user_id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;

  BEGIN
    PERFORM public.get_fleet_billing_context_internal(v_bad_fleet);
    RAISE EXCEPTION 'attendu: flotte_introuvable';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT ILIKE '%flotte_introuvable%' THEN
        RAISE;
      END IF;
  END;

  PERFORM set_config('request.jwt.claim.sub', '', true);

  IF auth.uid() IS NULL THEN
    BEGIN
      PERFORM public.get_fleet_billing_context(v_bad_fleet);
      RAISE EXCEPTION 'attendu: Non authentifié';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM NOT ILIKE '%Non authentifié%'
           AND SQLERRM NOT ILIKE '%non_authentifie%' THEN
          RAISE;
        END IF;
    END;
  ELSE
    RAISE NOTICE 'Test auth RPC public ignoré : auth.uid()=% (SQL Editor avec JWT)', auth.uid();
  END IF;

  IF has_function_privilege(
    'authenticated',
    'public.get_fleet_billing_context_internal(uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'get_fleet_billing_context_internal ne doit pas être exécutable par authenticated';
  END IF;

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
    'test-vehicle-limit@example.com',
    crypt('test-password', gen_salt('bf')),
    now(),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profils (user_id, full_name)
  VALUES (v_user_id, 'Test vehicle limit')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO organisations (name, country_code)
  VALUES ('Test vehicle limit', 'CM')
  RETURNING id INTO v_org_id;

  INSERT INTO flottes (org_id, name)
  VALUES (v_org_id, 'Flotte limit test')
  RETURNING id INTO v_fleet_id;

  INSERT INTO public.flotte_adhesions (fleet_id, user_id, role, is_active)
  VALUES (v_fleet_id, v_user_id, 'organizer'::public.role_type, true)
  ON CONFLICT (fleet_id, user_id, role) DO UPDATE SET is_active = true;

  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);

  v_ctx := public.get_fleet_billing_context(v_fleet_id);
  IF v_ctx IS NULL OR (v_ctx->>'plan_code') IS NULL THEN
    RAISE EXCEPTION 'get_fleet_billing_context doit retourner plan_code pour membre flotte';
  END IF;

  BEGIN
    PERFORM public.get_fleet_billing_context(v_bad_fleet);
    RAISE EXCEPTION 'attendu: accès refusé ou flotte introuvable';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT ILIKE '%Accès refusé%'
         AND SQLERRM NOT ILIKE '%acces_refuse_flotte%'
         AND SQLERRM NOT ILIKE '%flotte_introuvable%'
         AND SQLERRM NOT ILIKE '%Flotte introuvable%' THEN
        RAISE;
      END IF;
  END;

  v_ctx := public.get_fleet_billing_context_internal(v_fleet_id);
  IF (v_ctx->>'plan_code') IS DISTINCT FROM 'free' THEN
    RAISE EXCEPTION 'plan_code attendu free, obtenu %', v_ctx->>'plan_code';
  END IF;

  IF (v_ctx->>'fleet_id')::uuid IS DISTINCT FROM v_fleet_id THEN
    RAISE EXCEPTION 'fleet_id incohérent dans le contexte interne';
  END IF;

  IF (v_ctx->>'org_id')::uuid IS DISTINCT FROM v_org_id THEN
    RAISE EXCEPTION 'org_id incohérent dans le contexte interne';
  END IF;

  PERFORM public.billing_start_trial(v_fleet_id, 30);

  FOR i IN 1..3 LOOP
    INSERT INTO vehicules (fleet_id, registration, current_km)
    VALUES (v_fleet_id, 'LIM-' || i, 1000 + i);
  END LOOP;

  v_ctx := public.get_fleet_billing_context_internal(v_fleet_id);
  IF (v_ctx->>'vehicle_count')::int <> 3 THEN
    RAISE EXCEPTION 'vehicle_count attendu 3, obtenu %', v_ctx->>'vehicle_count';
  END IF;

  BEGIN
    INSERT INTO vehicules (fleet_id, registration, current_km)
    VALUES (v_fleet_id, 'LIM-4', 2000);
    RAISE EXCEPTION 'attendu: limite_vehicules_plan_atteinte';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT ILIKE '%limite_vehicules_plan_atteinte%'
         AND SQLERRM NOT ILIKE '%limite_vehicules_abonnements_atteinte%' THEN
        RAISE;
      END IF;
  END;

  DELETE FROM droits_vehicules WHERE vehicle_id IN (
    SELECT id FROM vehicules WHERE fleet_id = v_fleet_id
  );
  DELETE FROM vehicules WHERE fleet_id = v_fleet_id;
  DELETE FROM billing_events WHERE fleet_id = v_fleet_id;
  DELETE FROM abonnements WHERE fleet_id = v_fleet_id;
  DELETE FROM public.flotte_adhesions WHERE fleet_id = v_fleet_id AND user_id = v_user_id;
  DELETE FROM flottes WHERE id = v_fleet_id;
  DELETE FROM organisations WHERE id = v_org_id;
  DELETE FROM public.audit_logs WHERE actor_id = v_user_id;
  DELETE FROM affectations_vehicules
  WHERE driver_user_id = v_user_id OR created_by = v_user_id;
  DELETE FROM profils WHERE user_id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;
END $$;
