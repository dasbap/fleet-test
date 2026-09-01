do $$
begin
  if to_regclass('public.prospect_registrations') is not null then
    alter table public.prospect_registrations
      alter column trial_end drop not null;
  end if;
end
$$;

notify pgrst, 'reload schema';
