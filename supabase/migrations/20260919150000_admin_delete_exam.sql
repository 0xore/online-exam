-- Exam delete was blocked when any answer still referenced a question
-- (answers.question_id is ON DELETE RESTRICT). Administrators need to
-- remove an exam together with its questions, attempts, and answers.

alter table public.answers
  drop constraint answers_question_id_fkey;

alter table public.answers
  add constraint answers_question_id_fkey
    foreign key (question_id) references public.questions (id) on delete cascade;

create or replace function public.admin_delete_exam(p_exam_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from public.exams where id = p_exam_id) then
    return false;
  end if;

  delete from public.answers
  where attempt_id in (
    select id from public.attempts where exam_id = p_exam_id
  );

  delete from public.attempts where exam_id = p_exam_id;
  delete from public.questions where exam_id = p_exam_id;
  delete from public.exams where id = p_exam_id;

  return true;
end;
$$;

revoke all on function public.admin_delete_exam(uuid) from public, anon;
grant execute on function public.admin_delete_exam(uuid) to authenticated;

comment on function public.admin_delete_exam(uuid) is
  'Deletes an exam and its questions, attempts, and answers. Administrators only.';
