-- =====================================================
-- Seed TEST Yaounde (idempotent)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

INSERT INTO public.plans (
  code,
  name,
  price_per_vehicle,
  max_vehicles,
  is_active,
  enables_finance,
  enables_ai,
  enables_reports,
  enables_driver_scoring,
  enables_anomaly_insights
)
VALUES
  ('free', 'Free Test', 0, 3, true, false, false, false, false, false),
  ('pro', 'Pro Test', 8000, 100, true, true, true, true, true, true)
ON CONFLICT (code) DO UPDATE SET
  max_vehicles = EXCLUDED.max_vehicles,
  is_active = EXCLUDED.is_active;

INSERT INTO public.organisations (name, country_code)
SELECT 'TEST Organisation Yaoundé', 'CM'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.organisations
  WHERE name = 'TEST Organisation Yaoundé'
);

INSERT INTO public.flottes (org_id, name, collection_policy)
SELECT o.id, 'TEST Flotte Taxi Yaoundé', 'mix'
FROM public.organisations o
WHERE o.name = 'TEST Organisation Yaoundé'
  AND NOT EXISTS (
    SELECT 1
    FROM public.flottes f
    WHERE f.org_id = o.id
      AND f.name = 'TEST Flotte Taxi Yaoundé'
  );

INSERT INTO public.abonnements (fleet_id, plan_id, starts_at, ends_at, status)
SELECT f.id, p.id, now(), now() + interval '30 days', 'active'
FROM public.flottes f
JOIN public.organisations o ON o.id = f.org_id
JOIN public.plans p ON p.code = 'free'
WHERE o.name = 'TEST Organisation Yaoundé'
  AND f.name = 'TEST Flotte Taxi Yaoundé'
  AND NOT EXISTS (
    SELECT 1
    FROM public.abonnements a
    WHERE a.fleet_id = f.id
      AND a.plan_id = p.id
      AND a.status = 'active'
      AND a.ends_at >= now()
  );

INSERT INTO public.vehicules (fleet_id, registration, brand, model, year, current_km, status)
SELECT f.id, x.registration, x.brand, x.model, x.year, x.current_km, 'ok'
FROM public.flottes f
JOIN public.organisations o ON o.id = f.org_id
JOIN (
  VALUES
    ('TEST-YAO-001', 'Toyota', 'Hiace', 2020, 120000),
    ('TEST-YAO-002', 'Hyundai', 'H1', 2021, 86000),
    ('TEST-YAO-003', 'Peugeot', 'Boxer', 2019, 144000)
) AS x(registration, brand, model, year, current_km) ON TRUE
WHERE o.name = 'TEST Organisation Yaoundé'
ON CONFLICT (fleet_id, registration) DO NOTHING;

COMMIT;
