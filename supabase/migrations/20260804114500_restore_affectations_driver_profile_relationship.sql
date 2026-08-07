-- Restore PostgREST embedding from affectations_vehicules to profils.
-- The frontend uses: driver:profils(full_name)

do $$
begin
  if exists (
    select 1
      from pg_constraint c
      join pg_class rel on rel.oid = c.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
     where nsp.nspname = 'public'
       and rel.relname = 'affectations_vehicules'
       and c.conname = 'affectations_vehicules_driver_user_id_fkey'
       and c.confrelid <> 'public.profils'::regclass
  ) then
    alter table public.affectations_vehicules
      drop constraint affectations_vehicules_driver_user_id_fkey;
  end if;

  if not exists (
    select 1
      from pg_constraint c
      join pg_class rel on rel.oid = c.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
     where nsp.nspname = 'public'
       and rel.relname = 'affectations_vehicules'
       and c.conname = 'affectations_vehicules_driver_user_id_fkey'
       and c.confrelid = 'public.profils'::regclass
  ) then
    alter table public.affectations_vehicules
      add constraint affectations_vehicules_driver_user_id_fkey
      foreign key (driver_user_id) references public.profils(user_id) on delete cascade not valid;
  end if;
end $$;

notify pgrst, 'reload schema';
