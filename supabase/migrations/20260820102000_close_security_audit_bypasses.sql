BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.assign_vehicle_to_subscription(uuid,uuid,uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.assign_vehicle_to_subscription(uuid, uuid, uuid)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.assign_vehicle_to_subscription(uuid, uuid, uuid)
      TO service_role;
  END IF;

  IF to_regprocedure('public.find_available_subscription_for_vehicle(uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.find_available_subscription_for_vehicle(uuid)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.find_available_subscription_for_vehicle(uuid)
      TO service_role;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
