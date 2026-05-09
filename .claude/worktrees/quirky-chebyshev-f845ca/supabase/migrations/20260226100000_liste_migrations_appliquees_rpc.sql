-- RPC pour lister les versions de migrations appliquées (vérification santé / script verify-supabase-health).
-- Utilisée avec SUPABASE_SERVICE_ROLE_KEY pour comparer migrations locales vs projet.

create or replace function public.liste_migrations_appliquees()
returns setof text
language sql
security definer
set search_path = public, supabase_migrations
stable
as $$
  select version from supabase_migrations.schema_migrations order by version;
$$;

comment on function public.liste_migrations_appliquees() is
  'Retourne la liste des versions de migrations appliquées (pour scripts de vérification).';

grant execute on function public.liste_migrations_appliquees() to service_role;
