BEGIN;

CREATE OR REPLACE FUNCTION public.sync_pending_subscription_with_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'succeeded' THEN
    UPDATE public.abonnements
       SET status = 'inactive'
     WHERE payment_id = NEW.id
       AND status = 'pending_payment';

  ELSIF NEW.status IN ('failed', 'canceled') THEN
    UPDATE public.abonnements
       SET status = 'cancelled',
           cancelled_at = COALESCE(cancelled_at, now()),
           ends_at = LEAST(COALESCE(ends_at, now()), now())
     WHERE payment_id = NEW.id
       AND status = 'pending_payment';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_pending_subscription_with_payment_status()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_pending_subscription_with_payment_status()
  TO service_role;

DROP TRIGGER IF EXISTS trg_sync_pending_subscription_with_payment_status
  ON public.paiements;

CREATE TRIGGER trg_sync_pending_subscription_with_payment_status
AFTER UPDATE OF status ON public.paiements
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.sync_pending_subscription_with_payment_status();

NOTIFY pgrst, 'reload schema';

COMMIT;
