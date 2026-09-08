BEGIN;

REVOKE EXECUTE ON FUNCTION public.enforce_role_change_workflow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_last_active_organizer_loss() FROM PUBLIC, anon, authenticated;

COMMIT;
