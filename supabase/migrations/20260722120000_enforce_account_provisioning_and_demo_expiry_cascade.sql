-- Enforce account provisioning boundaries and cascade demo-account expiration.

alter table public.profils
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists idx_profils_created_by
  on public.profils (created_by)
  where created_by is not null;

create or replace function public.expire_demo_accounts_by_type()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_rec record;
  v_count integer := 0;
  v_deleted_count integer := 0;
  v_errors text[] := '{}';
  v_deleted_ids uuid[];
begin
  for v_rec in
    select user_id, coalesce(email, '') as email, account_type
      from public.demo_profiles
     where is_active = true
       and expires_at is not null
       and expires_at < now()
  loop
    begin
      insert into public.demo_expiration_log (user_id, email, account_type, action, reason)
      values (v_rec.user_id, v_rec.email, v_rec.account_type, 'expired', 'expires_at passed; auth user and provisioned child accounts deleted');

      with recursive accounts_to_delete(user_id) as (
        select v_rec.user_id
        union
        select p.user_id
          from public.profils p
          join accounts_to_delete parent on p.created_by = parent.user_id
      ),
      deleted as (
        delete from auth.users u
         using accounts_to_delete doomed
         where u.id = doomed.user_id
         returning u.id
      )
      select coalesce(array_agg(id), '{}')
        into v_deleted_ids
        from deleted;

      v_deleted_count := v_deleted_count + coalesce(array_length(v_deleted_ids, 1), 0);

      v_count := v_count + 1;
    exception when others then
      v_errors := array_append(v_errors, format('user %s: %s', v_rec.user_id, sqlerrm));
    end;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'expired_count', v_count,
    'deleted_auth_users_count', v_deleted_count,
    'errors', to_jsonb(v_errors)
  );
end;
$$;

grant execute on function public.expire_demo_accounts_by_type() to service_role;
revoke execute on function public.expire_demo_accounts_by_type() from anon, authenticated;

notify pgrst, 'reload schema';
