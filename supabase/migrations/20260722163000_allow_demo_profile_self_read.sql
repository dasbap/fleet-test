-- Allow an authenticated demo user to load only their own demo profile.

alter table public.demo_profiles enable row level security;

drop policy if exists demo_profiles_self_read on public.demo_profiles;

create policy demo_profiles_self_read
  on public.demo_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

grant select on table public.demo_profiles to authenticated;

notify pgrst, 'reload schema';
