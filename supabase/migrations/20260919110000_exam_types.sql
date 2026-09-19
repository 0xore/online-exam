alter table public.exams
  add column if not exists exam_type text not null default 'mixed';

alter table public.exams
  drop constraint if exists exams_type_valid;

alter table public.exams
  add constraint exams_type_valid check (exam_type in ('mcq', 'mixed'));

update public.exams
set exam_type = 'mixed'
where slug = 'practice-5min';

create or replace function public.exam_is_mcq_only(p_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.exams
    where id = p_exam_id
      and exam_type = 'mcq'
  );
$$;

create or replace function public.enforce_exam_question_types()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  current_exam_type text;
begin
  if tg_table_name = 'questions' then
    select exam_type into current_exam_type
    from public.exams
    where id = new.exam_id;

    if current_exam_type = 'mcq'
       and new.type not in ('single_choice', 'multiple_choice', 'true_false') then
      raise exception 'MCQ exams can only include single-choice, multiple-choice, or true/false questions.';
    end if;

    return new;
  end if;

  if new.exam_type = 'mcq'
     and exists (
       select 1
       from public.questions
       where exam_id = new.id
         and type not in ('single_choice', 'multiple_choice', 'true_false')
     ) then
    raise exception 'Remove short-answer and essay questions before changing this exam to MCQ.';
  end if;

  return new;
end;
$$;

drop trigger if exists questions_enforce_exam_type on public.questions;
create trigger questions_enforce_exam_type
  before insert or update of type, exam_id on public.questions
  for each row execute function public.enforce_exam_question_types();

drop trigger if exists exams_enforce_question_types on public.exams;
create trigger exams_enforce_question_types
  before update of exam_type on public.exams
  for each row execute function public.enforce_exam_question_types();

comment on column public.exams.exam_type is
  'mcq = objective questions only and candidate results after lock; mixed = MCQ plus written questions.';
