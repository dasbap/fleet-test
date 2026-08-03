-- Allow active demo users to write their own onboarding progress logs.

alter table public.demo_onboarding_logs enable row level security;

drop policy if exists demo_onboarding_logs_self_insert on public.demo_onboarding_logs;
drop policy if exists demo_onboarding_logs_own_write on public.demo_onboarding_logs;

create policy demo_onboarding_logs_self_insert
  on public.demo_onboarding_logs
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
        from public.demo_profiles dp
       where dp.user_id = auth.uid()
         and dp.is_active = true
    )
  );

grant insert on table public.demo_onboarding_logs to authenticated;

notify pgrst, 'reload schema';
