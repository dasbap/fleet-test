do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'demo_profiles_fleet_id_fkey'
      and conrelid = 'public.demo_profiles'::regclass
  ) then
    alter table public.demo_profiles
      add constraint demo_profiles_fleet_id_fkey
      foreign key (fleet_id)
      references public.flottes(id)
      on delete set null;
  end if;
end $$;

notify pgrst, 'reload schema';
