create or replace function public.submit_faq_question(
  p_question text,
  p_parent_question_id uuid default null
)
returns public.faq_questions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.faq_questions;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if public.support_current_user_is_admin() then
    raise exception 'admins_cannot_submit_faq_questions';
  end if;

  insert into public.faq_questions (user_id, parent_question_id, question)
  values (auth.uid(), p_parent_question_id, trim(p_question))
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.submit_faq_question(text, uuid) to authenticated;

notify pgrst, 'reload schema';
