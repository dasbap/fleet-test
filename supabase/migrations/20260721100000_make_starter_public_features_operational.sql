-- Keep the Starter runtime contract aligned with the public pricing page.
-- Starter must support:
-- - up to 25 vehicles
-- - DVIR and basic alerts (available by route/RLS defaults)
-- - Finance & collections
-- - PDF/Excel exports through reports
-- - Driver scoring

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

UPDATE public.plans
SET
  name = 'Starter',
  price_per_vehicle = 15000,
  min_commitment_days = 30,
  is_active = true,
  max_vehicles = 25,
  enables_finance = true,
  enables_ai = false,
  enables_reports = true,
  enables_driver_scoring = true,
  enables_anomaly_insights = false,
  enables_geofencing = false,
  enables_scheduled_reports = false,
  enables_offline_driver = true
WHERE code = 'starter';

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
SELECT
  'starter',
  'Starter',
  15000,
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
WHERE NOT EXISTS (
  SELECT 1 FROM public.plans WHERE code = 'starter'
);

NOTIFY pgrst, 'reload schema';
