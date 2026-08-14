-- Some older remote schemas have the billing context RPC but not the
-- subscription lifecycle columns it reads.

alter table public.abonnements
  add column if not exists trial_ends_at timestamptz,
  add column if not exists grace_until timestamptz;

notify pgrst, 'reload schema';
