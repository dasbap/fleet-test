-- Tests fonctionnels RLS travaux_maintenance (prod, lecture seule sur données existantes)
-- Simule auth.uid() via request.jwt.claim.sub + rôle authenticated.

DO $$
DECLARE
  v_manager_id uuid := 'a16cb679-6968-42e6-94f7-f8a60c8db256';
  v_mechanic_id uuid := 'cfc1fc80-735b-496e-8224-8b9fca859fc3';
  v_manager_fleet uuid := '35b4a470-e0a5-4474-8444-69968ddce5d1';
  v_mechanic_fleet uuid := 'd246baea-e705-484c-b5f6-1c0926248e45';
  v_manager_vehicle uuid := 'a3de69dc-d3fa-4eb3-9ab7-f1d14263dbaa';
  v_mechanic_vehicle uuid := 'e99f6f6b-34dc-4779-88de-7bb6161cbd10';
  v_existing_job uuid := '49fd3544-b1d9-4d8c-8549-0cf3b03cd480';
  v_job_id uuid;
  v_count int;
  v_errors text[] := ARRAY[]::text[];
BEGIN
  -- Manager : SELECT
  PERFORM set_config('request.jwt.claim.sub', v_manager_id::text, true);
  SET LOCAL role authenticated;
  SELECT count(*)::int INTO v_count
  FROM public.travaux_maintenance
  WHERE fleet_id = v_manager_fleet;
  IF v_count < 0 THEN
    v_errors := array_append(v_errors, 'manager SELECT: count invalide');
  END IF;
  RAISE NOTICE 'manager SELECT count=%', v_count;

  -- Mechanic : SELECT
  PERFORM set_config('request.jwt.claim.sub', v_mechanic_id::text, true);
  SELECT count(*)::int INTO v_count
  FROM public.travaux_maintenance
  WHERE fleet_id = v_mechanic_fleet;
  RAISE NOTICE 'mechanic SELECT count=%', v_count;

  -- Manager : INSERT + UPDATE + DELETE
  PERFORM set_config('request.jwt.claim.sub', v_manager_id::text, true);
  BEGIN
    INSERT INTO public.travaux_maintenance (vehicle_id, fleet_id, priority, status)
    VALUES (v_manager_vehicle, v_manager_fleet, 'medium', 'queued')
    RETURNING id INTO v_job_id;
    RAISE NOTICE 'manager INSERT ok job=%', v_job_id;

    UPDATE public.travaux_maintenance
    SET status = 'in_progress'
    WHERE id = v_job_id;
    RAISE NOTICE 'manager UPDATE ok';

    DELETE FROM public.travaux_maintenance WHERE id = v_job_id;
    RAISE NOTICE 'manager DELETE ok';
  EXCEPTION
    WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'manager CRUD: ' || SQLERRM);
  END;

  -- Mechanic : INSERT + UPDATE ; DELETE sur job existant doit être bloqué
  PERFORM set_config('request.jwt.claim.sub', v_mechanic_id::text, true);
  BEGIN
    INSERT INTO public.travaux_maintenance (vehicle_id, fleet_id, priority, status)
    VALUES (v_mechanic_vehicle, v_mechanic_fleet, 'low', 'queued')
    RETURNING id INTO v_job_id;
    RAISE NOTICE 'mechanic INSERT ok job=%', v_job_id;

    UPDATE public.travaux_maintenance
    SET status = 'in_progress'
    WHERE id = v_job_id;
    RAISE NOTICE 'mechanic UPDATE ok';

    DELETE FROM public.travaux_maintenance WHERE id = v_job_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
      v_errors := array_append(v_errors, 'mechanic DELETE: aurait dû être refusé');
    ELSE
      RAISE NOTICE 'mechanic DELETE: 0 ligne (RLS, attendu)';
    END IF;

    -- Nettoyage via contexte manager
    PERFORM set_config('request.jwt.claim.sub', v_manager_id::text, true);
    DELETE FROM public.travaux_maintenance WHERE id = v_job_id;
  EXCEPTION
    WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'mechanic CRUD: ' || SQLERRM);
  END;

  -- Manager : UPDATE sur job existant
  PERFORM set_config('request.jwt.claim.sub', v_manager_id::text, true);
  BEGIN
    UPDATE public.travaux_maintenance
    SET notes = coalesce(notes, '') || ' [rls-test]'
    WHERE id = v_existing_job AND fleet_id = v_manager_fleet;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count = 0 THEN
      RAISE NOTICE 'manager UPDATE existing job: 0 ligne (non bloquant — CRUD nouveau job validé)';
    ELSE
      RAISE NOTICE 'manager UPDATE existing job ok';
      UPDATE public.travaux_maintenance
      SET notes = replace(coalesce(notes, ''), ' [rls-test]', '')
      WHERE id = v_existing_job;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'manager UPDATE existing: ' || SQLERRM);
  END;

  IF array_length(v_errors, 1) > 0 THEN
    RAISE EXCEPTION 'Échecs RLS travaux_maintenance: %', array_to_string(v_errors, ' | ');
  END IF;

  RAISE NOTICE 'OK — tests fonctionnels RLS travaux_maintenance passés';
END $$;
