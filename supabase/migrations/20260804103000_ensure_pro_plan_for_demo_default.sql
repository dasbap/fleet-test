-- Ensure the Pro catalog plan exists before demo organizers receive it by default.

alter table public.plans
  add column if not exists max_vehicles integer,
  add column if not exists enables_finance boolean not null default false,
  add column if not exists enables_ai boolean not null default false;

insert into public.plans (
  code,
  name,
  price_per_vehicle,
  min_commitment_days,
  is_active,
  max_vehicles,
  enables_finance,
  enables_ai
)
values (
  'pro',
  'Pro',
  25000,
  60,
  true,
  75,
  true,
  true
)
on conflict (code) do update
  set name = excluded.name,
      price_per_vehicle = excluded.price_per_vehicle,
      min_commitment_days = excluded.min_commitment_days,
      is_active = true,
      max_vehicles = excluded.max_vehicles,
      enables_finance = excluded.enables_finance,
      enables_ai = excluded.enables_ai;

notify pgrst, 'reload schema';
