alter table public.prospect_registrations
  alter column trial_end drop not null;

notify pgrst, 'reload schema';
