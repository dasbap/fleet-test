-- Transactions Mobile Money pour l'upgrade d'abonnement.
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  provider text not null check (provider in ('orange', 'mtn')),
  amount_xaf integer not null check (amount_xaf > 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  transaction_id text,
  fleet_id uuid not null references public.flottes(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_transactions_fleet_id
  on public.payment_transactions (fleet_id);

create index if not exists idx_payment_transactions_status
  on public.payment_transactions (status);

create index if not exists idx_payment_transactions_created_at
  on public.payment_transactions (created_at desc);

drop trigger if exists trg_payment_transactions_updated_at on public.payment_transactions;
create trigger trg_payment_transactions_updated_at
  before update on public.payment_transactions
  for each row
  execute procedure public.update_updated_at_column();

alter table public.payment_transactions enable row level security;

drop policy if exists "fleet members can read own transactions" on public.payment_transactions;
create policy "fleet members can read own transactions"
  on public.payment_transactions
  for select
  using (
    fleet_id in (
      select fa.fleet_id
      from public.flotte_adhesions fa
      where fa.user_id = auth.uid()
    )
  );

drop policy if exists "fleet members can create own transactions" on public.payment_transactions;
create policy "fleet members can create own transactions"
  on public.payment_transactions
  for insert
  with check (
    fleet_id in (
      select fa.fleet_id
      from public.flotte_adhesions fa
      where fa.user_id = auth.uid()
    )
  );

drop policy if exists "service role can update transactions" on public.payment_transactions;
create policy "service role can update transactions"
  on public.payment_transactions
  for update
  using ((auth.jwt() ->> 'role') = 'service_role')
  with check ((auth.jwt() ->> 'role') = 'service_role');
