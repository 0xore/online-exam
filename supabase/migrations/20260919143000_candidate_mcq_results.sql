create or replace function public.get_candidate_result(
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
  answer_row public.answers;
  review jsonb := '[]'::jsonb;
  selected_ids text[];
  correct_ids text[];
  selected_labels jsonb;
  correct_labels jsonb;
  max_score numeric := 0;
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

  if attempt_row.status = 'active' then
    return jsonb_build_object('ok', false, 'code', 'active');
  end if;

  if exam_row.exam_type <> 'mcq' then
    return jsonb_build_object(
      'ok', true,
      'exam_type', exam_row.exam_type,
      'status', attempt_row.status,
      'result', null
    );
  end if;

  select coalesce(sum(marks), 0) into max_score
  from public.questions
  where exam_id = exam_row.id;

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

    select * into answer_row
    from public.answers
    where attempt_id = attempt_row.id
      and question_id = question_row.id;

    select coalesce(array_agg(option_value order by option_value), '{}')
    into selected_ids
    from jsonb_array_elements_text(coalesce(coalesce(answer_row.answer, '{}'::jsonb) -> 'selected', '[]'::jsonb)) as option_value;

    if jsonb_typeof(question_row.correct_answer) = 'array' then
      select coalesce(array_agg(option_value order by option_value), '{}')
      into correct_ids
      from jsonb_array_elements_text(question_row.correct_answer) as option_value;
    elsif jsonb_typeof(question_row.correct_answer) = 'string' then
      correct_ids := array[question_row.correct_answer #>> '{}'];
    else
      correct_ids := '{}';
    end if;

    select coalesce(jsonb_agg(jsonb_build_object('id', element ->> 'id', 'text', element ->> 'text')), '[]'::jsonb)
    into selected_labels
    from jsonb_array_elements(coalesce(public.candidate_question_options(question_row, attempt_row.option_order), '[]'::jsonb)) as element
    where element ->> 'id' = any(selected_ids);

    select coalesce(jsonb_agg(jsonb_build_object('id', element ->> 'id', 'text', element ->> 'text')), '[]'::jsonb)
    into correct_labels
    from jsonb_array_elements(coalesce(public.candidate_question_options(question_row, attempt_row.option_order), '[]'::jsonb)) as element
    where element ->> 'id' = any(correct_ids);

    review := review || jsonb_build_array(
      jsonb_build_object(
        'id', question_row.id,
        'question_text', question_row.question_text,
        'selected', selected_labels,
        'correct', correct_labels,
        'is_correct', selected_ids = correct_ids
      )
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'exam_type', exam_row.exam_type,
    'status', attempt_row.status,
    'result', jsonb_build_object(
      'auto_score', coalesce(attempt_row.auto_score, 0),
      'max_score', max_score,
      'pass_mark', exam_row.pass_mark,
      'passed', case
        when exam_row.pass_mark is null then null
        else coalesce(attempt_row.auto_score, 0) >= exam_row.pass_mark
      end,
      'questions', review
    )
  );
end;
$$;

revoke all on function public.get_candidate_result(text, text) from public;
grant execute on function public.get_candidate_result(text, text) to anon, authenticated;
