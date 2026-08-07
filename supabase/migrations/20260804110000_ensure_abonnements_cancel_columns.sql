-- Compatibility for admin plan reassignment on older abonnements schemas.

alter table public.abonnements
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users(id) on delete set null;

notify pgrst, 'reload schema';
