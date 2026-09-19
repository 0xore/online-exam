create or replace function public.normalize_answer_text(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(trim(regexp_replace(coalesce(p_value, ''), '\s+', ' ', 'g')));
$$;

create or replace function public.candidate_question_options(
  p_question public.questions,
  p_option_order jsonb
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  ordered_ids text[];
  built jsonb := '[]'::jsonb;
  option_id text;
  option_text text;
begin
  if p_question.options is null then
    return null;
  end if;

  if jsonb_typeof(coalesce(p_option_order, '{}'::jsonb) -> p_question.id::text) = 'array' then
    select coalesce(array_agg(option_value), '{}')
    into ordered_ids
    from jsonb_array_elements_text(p_option_order -> p_question.id::text) as option_value;
  else
    select coalesce(array_agg(element ->> 'id'), '{}')
    into ordered_ids
    from jsonb_array_elements(p_question.options) as element
    where coalesce(element ->> 'id', '') <> '';
  end if;

  foreach option_id in array ordered_ids
  loop
    select element ->> 'text'
    into option_text
    from jsonb_array_elements(p_question.options) as element
    where element ->> 'id' = option_id
    limit 1;

    if option_text is not null then
      built := built || jsonb_build_array(
        jsonb_build_object('id', option_id, 'text', option_text)
      );
    end if;
  end loop;

  return built;
end;
$$;

create or replace function public.sanitize_candidate_answer(
  p_question public.questions,
  p_answer jsonb
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  selected jsonb := '[]'::jsonb;
  clean_text text;
begin
  if p_question.type in ('single_choice', 'multiple_choice', 'true_false') then
    select coalesce(jsonb_agg(to_jsonb(option_value)), '[]'::jsonb)
    into selected
    from jsonb_array_elements_text(coalesce(p_answer -> 'selected', '[]'::jsonb)) as option_value
    where exists (
      select 1
      from jsonb_array_elements(coalesce(p_question.options, '[]'::jsonb)) as element
      where element ->> 'id' = option_value
    );

    if p_question.type <> 'multiple_choice' and jsonb_typeof(selected) = 'array' and jsonb_array_length(selected) > 1 then
      selected := jsonb_build_array(selected -> 0);
    end if;

    return jsonb_build_object('selected', selected);
  end if;

  clean_text := left(coalesce(p_answer ->> 'text', ''), 8000);
  return jsonb_build_object('text', clean_text);
end;
$$;

create or replace function public.compute_auto_marks(
  p_question public.questions,
  p_answer jsonb
)
returns numeric
language plpgsql
stable
set search_path = public
as $$
declare
  selected_ids text[];
  correct_ids text[];
  given_text text;
begin
  if p_question.type = 'long_answer' then
    return null;
  end if;

  if p_question.type = 'short_answer' then
    if p_question.acceptable_answers is null or jsonb_typeof(p_question.acceptable_answers) <> 'array' then
      return null;
    end if;

    given_text := public.normalize_answer_text(p_answer ->> 'text');
    if given_text = '' then
      return 0;
    end if;

    if exists (
      select 1
      from jsonb_array_elements_text(p_question.acceptable_answers) as acceptable
      where public.normalize_answer_text(acceptable) = given_text
    ) then
      return p_question.marks;
    end if;

    return 0;
  end if;

  select coalesce(array_agg(option_value order by option_value), '{}')
  into selected_ids
  from jsonb_array_elements_text(coalesce(p_answer -> 'selected', '[]'::jsonb)) as option_value;

  if jsonb_typeof(p_question.correct_answer) = 'array' then
    select coalesce(array_agg(option_value order by option_value), '{}')
    into correct_ids
    from jsonb_array_elements_text(p_question.correct_answer) as option_value;
  elsif jsonb_typeof(p_question.correct_answer) = 'string' then
    correct_ids := array[p_question.correct_answer #>> '{}'];
  else
    return 0;
  end if;

  if selected_ids = correct_ids then
    return p_question.marks;
  end if;

  return 0;
end;
$$;

create or replace function public.refresh_attempt_scores(p_attempt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.attempts
  set
    auto_score = (
      select coalesce(sum(auto_marks), 0)
      from public.answers
      where attempt_id = p_attempt_id
    ),
    manual_score = (
      select coalesce(sum(manual_marks), 0)
      from public.answers
      where attempt_id = p_attempt_id
    ),
    final_score = (
      select coalesce(sum(coalesce(manual_marks, auto_marks, 0)), 0)
      from public.answers
      where attempt_id = p_attempt_id
    )
  where id = p_attempt_id;
end;
$$;

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

create or replace function public.save_candidate_answer(
  p_slug text,
  p_token_hash text,
  p_question_id uuid,
  p_answer jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  exam_row public.exams;
  attempt_row public.attempts;
  question_row public.questions;
  clean_answer jsonb;
  marks numeric;
  saved_row public.answers;
begin
  if p_token_hash is null or length(p_token_hash) < 32 then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'This attempt is not available.');
  end if;

  select * into exam_row
  from public.exams
  where slug = p_slug
    and published = true;

  if exam_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'This exam is not available.');
  end if;

  select * into attempt_row
  from public.attempts
  where exam_id = exam_row.id
    and session_token_hash = p_token_hash;

  if attempt_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'This attempt is not available.');
  end if;

  if attempt_row.status = 'active' then
    attempt_row := public.lock_expired_attempt(attempt_row.id);
  end if;

  if attempt_row.status <> 'active' then
    return jsonb_build_object(
      'ok', false,
      'code', 'locked',
      'status', attempt_row.status,
      'message', 'This attempt is locked. Answers can no longer be changed.'
    );
  end if;

  select * into question_row
  from public.questions
  where id = p_question_id
    and exam_id = exam_row.id;

  if question_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_input', 'message', 'That question is not on this exam.');
  end if;

  clean_answer := public.sanitize_candidate_answer(question_row, coalesce(p_answer, '{}'::jsonb));
  marks := public.compute_auto_marks(question_row, clean_answer);

  insert into public.answers (
    attempt_id,
    question_id,
    answer,
    auto_marks,
    saved_at
  ) values (
    attempt_row.id,
    question_row.id,
    clean_answer,
    marks,
    now()
  )
  on conflict on constraint answers_unique_question
  do update set
    answer = excluded.answer,
    auto_marks = excluded.auto_marks,
    saved_at = excluded.saved_at
  returning * into saved_row;

  perform public.refresh_attempt_scores(attempt_row.id);

  return jsonb_build_object(
    'ok', true,
    'question_id', saved_row.question_id,
    'saved_at', saved_row.saved_at,
    'server_now', now()
  );
end;
$$;

create or replace function public.submit_candidate_attempt(
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
begin
  if p_token_hash is null or length(p_token_hash) < 32 then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'This attempt is not available.');
  end if;

  select * into exam_row
  from public.exams
  where slug = p_slug
    and published = true;

  if exam_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'This exam is not available.');
  end if;

  select * into attempt_row
  from public.attempts
  where exam_id = exam_row.id
    and session_token_hash = p_token_hash;

  if attempt_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'This attempt is not available.');
  end if;

  if attempt_row.status = 'active' then
    attempt_row := public.lock_expired_attempt(attempt_row.id);
  end if;

  if attempt_row.status in ('submitted', 'expired') then
    return jsonb_build_object(
      'ok', true,
      'already_locked', true,
      'status', attempt_row.status,
      'exam_type', exam_row.exam_type
    );
  end if;

  update public.attempts
  set
    status = 'submitted',
    submitted_at = now()
  where id = attempt_row.id
    and status = 'active'
  returning * into attempt_row;

  perform public.refresh_attempt_scores(attempt_row.id);

  return jsonb_build_object(
    'ok', true,
    'already_locked', false,
    'status', attempt_row.status,
    'exam_type', exam_row.exam_type,
    'submitted_at', attempt_row.submitted_at
  );
end;
$$;

revoke all on function public.normalize_answer_text(text) from public, anon, authenticated;
revoke all on function public.candidate_question_options(public.questions, jsonb) from public, anon, authenticated;
revoke all on function public.sanitize_candidate_answer(public.questions, jsonb) from public, anon, authenticated;
revoke all on function public.compute_auto_marks(public.questions, jsonb) from public, anon, authenticated;
revoke all on function public.refresh_attempt_scores(uuid) from public, anon, authenticated;
revoke all on function public.get_candidate_paper(text, text) from public;
revoke all on function public.save_candidate_answer(text, text, uuid, jsonb) from public;
revoke all on function public.submit_candidate_attempt(text, text) from public;

grant execute on function public.get_candidate_paper(text, text) to anon, authenticated;
grant execute on function public.save_candidate_answer(text, text, uuid, jsonb) to anon, authenticated;
grant execute on function public.submit_candidate_attempt(text, text) to anon, authenticated;
