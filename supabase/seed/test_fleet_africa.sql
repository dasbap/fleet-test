-- =====================================================
-- Seed integration Supabase distant (idempotent)
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
  ('free', 'Free Test Fleet Africa', 0, 3, true, false, false, false, false, false),
  ('pro', 'Pro Test Fleet Africa', 8000, 75, true, true, true, true, true, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  max_vehicles = EXCLUDED.max_vehicles,
  is_active = EXCLUDED.is_active;

INSERT INTO public.organisations (name, country_code)
SELECT 'TEST Fleet Africa Org', 'CM'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.organisations
  WHERE name = 'TEST Fleet Africa Org'
);

INSERT INTO public.flottes (org_id, name, collection_policy)
SELECT o.id, 'TEST Fleet Africa Fleet', 'mix'
FROM public.organisations o
WHERE o.name = 'TEST Fleet Africa Org'
  AND NOT EXISTS (
    SELECT 1
    FROM public.flottes f
    WHERE f.org_id = o.id
      AND f.name = 'TEST Fleet Africa Fleet'
  );

INSERT INTO public.abonnements (fleet_id, plan_id, starts_at, ends_at, status)
SELECT f.id, p.id, now(), now() + interval '30 days', 'active'
FROM public.flottes f
JOIN public.organisations o ON o.id = f.org_id
JOIN public.plans p ON p.code = 'free'
WHERE o.name = 'TEST Fleet Africa Org'
  AND f.name = 'TEST Fleet Africa Fleet'
  AND NOT EXISTS (
    SELECT 1
    FROM public.abonnements a
    WHERE a.fleet_id = f.id
      AND a.status = 'active'
      AND a.ends_at >= now()
  );

INSERT INTO public.vehicules (fleet_id, registration, brand, model, year, current_km, status)
SELECT f.id, v.registration, v.brand, v.model, v.year, v.current_km, 'ok'
FROM public.flottes f
JOIN public.organisations o ON o.id = f.org_id
JOIN (
  VALUES
    ('IT-SEED-001', 'Toyota', 'Corolla', 2021, 12500),
    ('IT-SEED-002', 'Hyundai', 'i10', 2022, 8400),
    ('IT-SEED-003', 'Suzuki', 'Dzire', 2020, 22300)
) AS v(registration, brand, model, year, current_km) ON TRUE
WHERE o.name = 'TEST Fleet Africa Org'
  AND f.name = 'TEST Fleet Africa Fleet'
ON CONFLICT (fleet_id, registration) DO NOTHING;

COMMIT;
