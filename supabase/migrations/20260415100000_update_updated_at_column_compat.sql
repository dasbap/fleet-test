-- Compatibilité: certaines migrations historiques utilisent update_updated_at_column().
-- Le projet utilise désormais touch_updated_at(). On fournit un alias pour éviter les échecs de db reset.

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

