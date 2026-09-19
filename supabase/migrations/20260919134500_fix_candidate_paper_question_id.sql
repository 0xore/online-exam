create or replace function public.get_candidate_paper(
  p_slug text,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  exam_row public.exams;
  attempt_row public.attempts;
  question_ids uuid[];
  current_question_id uuid;
  question_row public.questions;
  paper jsonb := '[]'::jsonb;
  saved jsonb := '{}'::jsonb;
begin
  if p_token_hash is null or length(p_token_hash) < 32 then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  select * into exam_row
  from public.exams
  where slug = p_slug
    and published = true;

  if exam_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  select * into attempt_row
  from public.attempts
  where exam_id = exam_row.id
    and session_token_hash = p_token_hash;

  if attempt_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if attempt_row.status = 'active' then
    attempt_row := public.lock_expired_attempt(attempt_row.id);
  end if;

  question_ids := attempt_row.question_order;
  if question_ids is null or coalesce(array_length(question_ids, 1), 0) = 0 then
    select coalesce(array_agg(id order by position), '{}')
    into question_ids
    from public.questions
    where exam_id = exam_row.id;
  end if;

  foreach current_question_id in array question_ids
  loop
    select * into question_row
    from public.questions
    where id = current_question_id
      and exam_id = exam_row.id;

    if question_row.id is null then
      continue;
    end if;

    paper := paper || jsonb_build_array(
      jsonb_build_object(
        'id', question_row.id,
        'type', question_row.type,
        'question_text', question_row.question_text,
        'options', public.candidate_question_options(question_row, attempt_row.option_order)
      )
    );
  end loop;

  select coalesce(jsonb_object_agg(answers.question_id::text, answers.answer), '{}'::jsonb)
  into saved
  from public.answers
  where answers.attempt_id = attempt_row.id;

  return jsonb_build_object(
    'ok', true,
    'attempt_id', attempt_row.id,
    'student_name', attempt_row.student_name,
    'started_at', attempt_row.started_at,
    'expires_at', attempt_row.expires_at,
    'status', attempt_row.status,
    'exam_title', exam_row.title,
    'exam_type', exam_row.exam_type,
    'duration_minutes', exam_row.duration_minutes,
    'server_now', now(),
    'questions', paper,
    'answers', saved
  );
end;
$$;

revoke all on function public.get_candidate_paper(text, text) from public;
grant execute on function public.get_candidate_paper(text, text) to anon, authenticated;
