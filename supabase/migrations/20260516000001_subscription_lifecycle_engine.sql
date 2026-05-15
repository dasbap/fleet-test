-- ============================================================
-- Lifecycle abonnements E-Samba
-- - Feature flags sur plans
-- - Colonnes supplémentaires abonnements
-- - Fonctions RPC lifecycle (service_role uniquement)
-- - Fonction cron billing_suspend_expired_subscriptions()
-- ============================================================

-- ─── 1. Feature flags sur plans ────────────────────────────
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_vehicles          integer     NULL;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS enables_finance       boolean     NOT NULL DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS enables_ai            boolean     NOT NULL DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS enables_reports       boolean     NOT NULL DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS enables_driver_scoring boolean    NOT NULL DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS enables_anomaly_insights boolean  NOT NULL DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS enables_geofencing    boolean     NOT NULL DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS enables_scheduled_reports boolean NOT NULL DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS enables_offline_driver boolean    NOT NULL DEFAULT false;

-- Mise à jour des plans existants avec les flags attendus
UPDATE public.plans SET
  max_vehicles             = 3,
  enables_finance          = false,
  enables_ai               = false,
  enables_reports          = false,
  enables_driver_scoring   = false,
  enables_anomaly_insights = false,
  enables_geofencing       = false,
  enables_scheduled_reports= false,
  enables_offline_driver   = false
WHERE code = 'free';

UPDATE public.plans SET
  max_vehicles             = 5,
  enables_finance          = true,
  enables_ai               = false,
  enables_reports          = true,
  enables_driver_scoring   = true,
  enables_anomaly_insights = false,
  enables_geofencing       = false,
  enables_scheduled_reports= false,
  enables_offline_driver   = true
WHERE code = 'starter';

UPDATE public.plans SET
  max_vehicles             = 25,
  enables_finance          = true,
  enables_ai               = true,
  enables_reports          = true,
  enables_driver_scoring   = true,
  enables_anomaly_insights = true,
  enables_geofencing       = true,
  enables_scheduled_reports= true,
  enables_offline_driver   = true
WHERE code = 'pro';

UPDATE public.plans SET
  max_vehicles             = NULL,   -- illimité
  enables_finance          = true,
  enables_ai               = true,
  enables_reports          = true,
  enables_driver_scoring   = true,
  enables_anomaly_insights = true,
  enables_geofencing       = true,
  enables_scheduled_reports= true,
  enables_offline_driver   = true
WHERE code = 'enterprise';

-- ─── 2. Colonnes abonnements (idempotentes) ─────────────────
-- trial_ends_at et grace_until sont déjà ajoutés dans 20260515000001
-- On ajoute cancelled_at pour tracer la résiliation volontaire
ALTER TABLE public.abonnements ADD COLUMN IF NOT EXISTS cancelled_at    timestamptz NULL;
ALTER TABLE public.abonnements ADD COLUMN IF NOT EXISTS cancelled_by    uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- ─── 3. RPC : billing_start_trial ───────────────────────────
-- Crée un abonnement trial pour une flotte (idempotent).
-- Appelé après la création de la flotte (service_role).
CREATE OR REPLACE FUNCTION public.billing_start_trial(
  p_fleet_id uuid,
  p_trial_days integer DEFAULT 30
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id       uuid;
  v_existing_id   uuid;
  v_sub_id        uuid;
  v_now           timestamptz := now();
BEGIN
  -- Vérifie si un abonnement trial existe déjà
  SELECT id INTO v_existing_id
  FROM abonnements
  WHERE fleet_id = p_fleet_id
    AND status = 'trial'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  -- Récupère le plan free
  SELECT id INTO v_plan_id FROM plans WHERE code = 'free' AND is_active = true LIMIT 1;
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan free introuvable ou inactif';
  END IF;

  INSERT INTO abonnements (fleet_id, plan_id, payment_id, starts_at, ends_at, status, trial_ends_at)
  VALUES (
    p_fleet_id,
    v_plan_id,
    NULL,
    v_now,
    v_now + (p_trial_days || ' days')::interval,
    'trial',
    v_now + (p_trial_days || ' days')::interval
  )
  RETURNING id INTO v_sub_id;

  INSERT INTO billing_events (fleet_id, subscription_id, event_type, payload)
  VALUES (p_fleet_id, v_sub_id, 'subscription.activated', jsonb_build_object('status', 'trial', 'trial_days', p_trial_days));

  RETURN v_sub_id;
END;
$$;

-- ─── 4. RPC : billing_enter_grace_period ────────────────────
-- Passe un abonnement expiré en grace_period.
CREATE OR REPLACE FUNCTION public.billing_enter_grace_period(
  p_subscription_id uuid,
  p_grace_days integer DEFAULT 7
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub record;
BEGIN
  SELECT id, fleet_id, status INTO v_sub
  FROM abonnements WHERE id = p_subscription_id FOR UPDATE;

  IF v_sub.id IS NULL THEN
    RAISE EXCEPTION 'Abonnement introuvable : %', p_subscription_id;
  END IF;

  IF v_sub.status NOT IN ('active', 'trial') THEN
    RAISE EXCEPTION 'Transition grace_period impossible depuis le statut %', v_sub.status;
  END IF;

  UPDATE abonnements
  SET status      = 'grace_period',
      grace_until = now() + (p_grace_days || ' days')::interval
  WHERE id = p_subscription_id;

  INSERT INTO billing_events (fleet_id, subscription_id, event_type, payload)
  VALUES (v_sub.fleet_id, p_subscription_id, 'subscription.grace_period_started',
          jsonb_build_object('grace_days', p_grace_days, 'grace_until', now() + (p_grace_days || ' days')::interval));
END;
$$;

-- ─── 5. RPC : billing_suspend_subscription ──────────────────
CREATE OR REPLACE FUNCTION public.billing_suspend_subscription(p_subscription_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub record;
BEGIN
  SELECT id, fleet_id, status INTO v_sub
  FROM abonnements WHERE id = p_subscription_id FOR UPDATE;

  IF v_sub.id IS NULL THEN RETURN; END IF;

  UPDATE abonnements SET status = 'suspended' WHERE id = p_subscription_id;

  INSERT INTO billing_events (fleet_id, subscription_id, event_type, payload)
  VALUES (v_sub.fleet_id, p_subscription_id, 'subscription.suspended', '{}'::jsonb);
END;
$$;

-- ─── 6. RPC : billing_cancel_subscription ───────────────────
CREATE OR REPLACE FUNCTION public.billing_cancel_subscription(
  p_subscription_id uuid,
  p_cancelled_by    uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub record;
BEGIN
  SELECT id, fleet_id, status INTO v_sub
  FROM abonnements WHERE id = p_subscription_id FOR UPDATE;

  IF v_sub.id IS NULL THEN
    RAISE EXCEPTION 'Abonnement introuvable : %', p_subscription_id;
  END IF;

  IF v_sub.status = 'cancelled' THEN RETURN; END IF;

  UPDATE abonnements
  SET status       = 'cancelled',
      cancelled_at = now(),
      cancelled_by = p_cancelled_by,
      ends_at      = LEAST(ends_at, now())
  WHERE id = p_subscription_id;

  INSERT INTO billing_events (fleet_id, subscription_id, event_type, payload)
  VALUES (v_sub.fleet_id, p_subscription_id, 'subscription.cancelled',
          jsonb_build_object('cancelled_by', p_cancelled_by));
END;
$$;

-- ─── 7. Fonction cron : passe expired/suspended en masse ────
-- À appeler quotidiennement (pg_cron ou Edge Function scheduleée).
CREATE OR REPLACE FUNCTION public.billing_run_daily_lifecycle()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now            timestamptz := now();
  v_to_grace       uuid[];
  v_to_suspend     uuid[];
  v_to_expire      uuid[];
  v_sub            record;
BEGIN
  -- Actifs expirés → grace_period
  SELECT array_agg(id) INTO v_to_grace
  FROM abonnements
  WHERE status IN ('active', 'trial')
    AND ends_at < v_now
    AND grace_until IS NULL;

  IF v_to_grace IS NOT NULL THEN
    FOREACH v_sub.id IN ARRAY v_to_grace LOOP
      PERFORM public.billing_enter_grace_period(v_sub.id, 7);
    END LOOP;
  END IF;

  -- grace_period expirée → suspended
  SELECT array_agg(id) INTO v_to_suspend
  FROM abonnements
  WHERE status = 'grace_period'
    AND grace_until IS NOT NULL
    AND grace_until < v_now;

  IF v_to_suspend IS NOT NULL THEN
    FOREACH v_sub.id IN ARRAY v_to_suspend LOOP
      PERFORM public.billing_suspend_subscription(v_sub.id);
    END LOOP;
  END IF;

  -- suspended depuis > 90 jours → expired
  SELECT array_agg(id) INTO v_to_expire
  FROM abonnements
  WHERE status = 'suspended'
    AND ends_at < v_now - interval '90 days';

  IF v_to_expire IS NOT NULL THEN
    UPDATE abonnements SET status = 'expired'
    WHERE id = ANY(v_to_expire);
  END IF;

  RETURN jsonb_build_object(
    'to_grace',   coalesce(array_length(v_to_grace,   1), 0),
    'to_suspend', coalesce(array_length(v_to_suspend, 1), 0),
    'to_expire',  coalesce(array_length(v_to_expire,  1), 0)
  );
END;
$$;

COMMENT ON FUNCTION public.billing_run_daily_lifecycle() IS
  'Cron daily : active→grace_period→suspended→expired. Appeler via Edge Function scheduleée ou pg_cron.';
