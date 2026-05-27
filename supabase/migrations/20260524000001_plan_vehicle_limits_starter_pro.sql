-- Plafonds véhicules Starter (25) et Pro (75)
UPDATE public.plans SET max_vehicles = 25 WHERE code = 'starter';
UPDATE public.plans SET max_vehicles = 75 WHERE code = 'pro';
