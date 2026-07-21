alter table public.organisations
  add column if not exists is_demo boolean not null default false;

comment on column public.organisations.is_demo is
  'Organisation de demonstration - donnees jamais visibles par les vrais clients.';

create index if not exists idx_organisations_is_demo
  on public.organisations (is_demo)
  where is_demo = true;

alter table public.flottes
  add column if not exists is_demo boolean not null default false;

comment on column public.flottes.is_demo is
  'Flotte de demonstration - donnees isolees des flottes de production.';

create index if not exists idx_flottes_is_demo
  on public.flottes (is_demo)
  where is_demo = true;

insert into public.organisations (name, country_code, is_demo)
select 'Organisation DEMO E-Samba', 'CM', true
where not exists (
  select 1 from public.organisations where name = 'Organisation DEMO E-Samba'
);

update public.organisations
set is_demo = true
where name = 'Organisation DEMO E-Samba'
  and is_demo = false;

insert into public.flottes (org_id, name, collection_policy, is_demo)
select o.id, fleet.name, 'mix', true
from public.organisations o
cross join (
  values
    ('Flotte DEMO Starter'),
    ('Flotte DEMO Pro'),
    ('Flotte DEMO Entreprise')
) as fleet(name)
where o.name = 'Organisation DEMO E-Samba'
  and not exists (
    select 1
    from public.flottes existing
    where existing.org_id = o.id
      and existing.name = fleet.name
  );

update public.flottes f
set is_demo = true
from public.organisations o
where f.org_id = o.id
  and o.name = 'Organisation DEMO E-Samba'
  and f.is_demo = false;

drop policy if exists flottes_select_platform_admin on public.flottes;
create policy flottes_select_platform_admin on public.flottes
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists flottes_real_universe_isolation on public.flottes;
drop policy if exists "flottes_real_universe_isolation" on public.flottes;
create policy flottes_real_universe_isolation on public.flottes
  for select to authenticated
  using (
    public.is_platform_admin()
    or (
      is_demo = true
      and exists (
        select 1
        from public.demo_profiles dp
        where dp.user_id = auth.uid()
          and dp.is_active = true
          and (dp.expires_at is null or dp.expires_at > now())
      )
    )
    or (
      is_demo = false
      and exists (
        select 1
        from public.flotte_adhesions fa
        where fa.fleet_id = flottes.id
          and fa.user_id = auth.uid()
          and fa.is_active = true
      )
    )
  );

notify pgrst, 'reload schema';
