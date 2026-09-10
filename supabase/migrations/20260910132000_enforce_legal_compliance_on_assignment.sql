create or replace function public.enforce_assignment_legal_compliance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active is true then
    if not public.is_vehicle_legally_compliant(new.vehicle_id) then
      raise exception 'vehicule_documents_legaux_incomplets_ou_expires';
    end if;

    if not public.is_driver_legally_compliant(new.driver_user_id) then
      raise exception 'chauffeur_documents_legaux_incomplets_ou_expires';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_assignment_legal_compliance_trigger on public.affectations_vehicules;
create trigger enforce_assignment_legal_compliance_trigger
before insert or update of driver_user_id, vehicle_id, is_active
on public.affectations_vehicules
for each row
execute function public.enforce_assignment_legal_compliance();
