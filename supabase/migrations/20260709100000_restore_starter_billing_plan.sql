-- Restore the Starter plan expected by billing checkout and integration flows.

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS max_vehicles integer,
  ADD COLUMN IF NOT EXISTS enables_finance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enables_ai boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enables_reports boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enables_driver_scoring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enables_anomaly_insights boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enables_geofencing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enables_scheduled_reports boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enables_offline_driver boolean NOT NULL DEFAULT false;

INSERT INTO public.plans (
  code,
  name,
  price_per_vehicle,
  min_commitment_days,
  is_active,
  max_vehicles,
  enables_finance,
  enables_ai,
  enables_reports,
  enables_driver_scoring,
  enables_anomaly_insights,
  enables_geofencing,
  enables_scheduled_reports,
  enables_offline_driver
)
VALUES (
  'starter',
  'Starter',
  5000,
  30,
  true,
  25,
  true,
  false,
  true,
  true,
  false,
  false,
  false,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price_per_vehicle = EXCLUDED.price_per_vehicle,
  min_commitment_days = EXCLUDED.min_commitment_days,
  is_active = EXCLUDED.is_active,
  max_vehicles = EXCLUDED.max_vehicles,
  enables_finance = EXCLUDED.enables_finance,
  enables_ai = EXCLUDED.enables_ai,
  enables_reports = EXCLUDED.enables_reports,
  enables_driver_scoring = EXCLUDED.enables_driver_scoring,
  enables_anomaly_insights = EXCLUDED.enables_anomaly_insights,
  enables_geofencing = EXCLUDED.enables_geofencing,
  enables_scheduled_reports = EXCLUDED.enables_scheduled_reports,
  enables_offline_driver = EXCLUDED.enables_offline_driver;

NOTIFY pgrst, 'reload schema';
