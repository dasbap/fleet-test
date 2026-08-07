create or replace function public.admin_delete_faq_question(
  p_question_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.support_current_user_is_admin() then
    raise exception 'admin_required';
  end if;

  delete from public.faq_questions
  where id = p_question_id;

  if not found then
    raise exception 'faq_question_not_found';
  end if;
end;
$$;

grant execute on function public.admin_delete_faq_question(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
