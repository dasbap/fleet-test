create or replace function public.queue_demo_account_lifecycle_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_template text;
  v_email text;
  v_user_id uuid;
  v_metadata jsonb;
begin
  if to_regclass('public.notification_queue') is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' then
    if old.is_active is not distinct from new.is_active then
      return new;
    end if;

    v_template := case when new.is_active then 'account_reactivated' else 'account_suspended' end;
    v_email := nullif(trim(coalesce(new.email, old.email, '')), '');
    v_user_id := new.user_id;
    v_metadata := jsonb_build_object(
      'user_id', new.user_id,
      'account_type', new.account_type,
      'expires_at', new.expires_at,
      'event', case when new.is_active then 'reactivated' else 'suspended' end
    );

    if v_email is not null then
      insert into public.notification_queue (fleet_id, to_email, template_id, metadata)
      values (null, v_email, v_template, v_metadata);
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    v_email := nullif(trim(coalesce(old.email, '')), '');
    v_user_id := old.user_id;
    if v_email is not null then
      insert into public.notification_queue (fleet_id, to_email, template_id, metadata)
      values (
        null,
        v_email,
        'account_deleted',
        jsonb_build_object('user_id', old.user_id, 'account_type', old.account_type, 'event', 'deleted')
      );
    end if;
    return old;
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function public.queue_demo_account_lifecycle_email() from public, anon, authenticated;
grant execute on function public.queue_demo_account_lifecycle_email() to service_role;

drop trigger if exists trg_queue_demo_account_lifecycle_email on public.demo_profiles;
create trigger trg_queue_demo_account_lifecycle_email
after update of is_active or delete on public.demo_profiles
for each row execute function public.queue_demo_account_lifecycle_email();
