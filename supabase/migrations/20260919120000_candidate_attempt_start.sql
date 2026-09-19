create table public.attempt_start_events (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  student_email_normalized text not null,
  created_at timestamptz not null default now()
);

create index attempt_start_events_email_idx
  on public.attempt_start_events (exam_id, student_email_normalized, created_at desc);

alter table public.attempt_start_events enable row level security;

revoke all on table public.attempt_start_events from anon, authenticated, public;

create or replace function public.shuffle_text_array(input_values text[])
returns text[]
language sql
stable
set search_path = public
as $$
  select coalesce(array_agg(value order by random()), '{}')
  from unnest(input_values) as value;
$$;

create or replace function public.lock_expired_attempt(p_attempt_id uuid)
returns public.attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_attempt public.attempts;
begin
  update public.attempts
  set
    status = 'expired',
    submitted_at = now()
  where id = p_attempt_id
    and status = 'active'
    and expires_at <= now()
  returning * into current_attempt;

  if current_attempt.id is null then
    select * into current_attempt
    from public.attempts
    where id = p_attempt_id;
  end if;

  return current_attempt;
end;
$$;

create or replace function public.build_attempt_order(p_exam public.exams)
returns table (question_order uuid[], option_order jsonb)
language plpgsql
stable
set search_path = public
as $$
declare
  randomise_questions boolean := coalesce((p_exam.settings ->> 'randomise_questions')::boolean, false);
  randomise_options boolean := coalesce((p_exam.settings ->> 'randomise_options')::boolean, false);
  built_question_order uuid[];
  built_option_order jsonb := '{}'::jsonb;
  question_row record;
  option_ids text[];
begin
  if randomise_questions then
    select coalesce(array_agg(id order by random()), '{}')
    into built_question_order
    from public.questions
    where exam_id = p_exam.id;
  else
    select coalesce(array_agg(id order by position), '{}')
    into built_question_order
    from public.questions
    where exam_id = p_exam.id;
  end if;

  for question_row in
    select id, options
    from public.questions
    where exam_id = p_exam.id
      and options is not null
  loop
    select coalesce(array_agg(element ->> 'id'), '{}')
    into option_ids
    from jsonb_array_elements(question_row.options) as element
    where coalesce(element ->> 'id', '') <> '';

    if randomise_options then
      option_ids := public.shuffle_text_array(option_ids);
    end if;

    built_option_order := built_option_order || jsonb_build_object(question_row.id::text, to_jsonb(option_ids));
  end loop;

  question_order := built_question_order;
  option_order := built_option_order;
  return next;
end;
$$;

create or replace function public.start_or_resume_attempt(
  p_slug text,
  p_student_name text,
  p_student_email text,
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
  normalized_email text := lower(trim(p_student_email));
  clean_name text := trim(p_student_name);
  recent_starts integer;
  order_row record;
begin
  if clean_name is null or length(clean_name) < 2 or length(clean_name) > 120 then
    return jsonb_build_object('ok', false, 'code', 'invalid_input', 'message', 'Enter your full name.');
  end if;

  if normalized_email is null or normalized_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_input', 'message', 'Enter a valid email address.');
  end if;

  if p_token_hash is null or length(p_token_hash) < 32 then
    return jsonb_build_object('ok', false, 'code', 'invalid_input', 'message', 'Could not start the exam.');
  end if;

  select * into exam_row
  from public.exams
  where slug = p_slug
    and published = true;

  if exam_row.id is null then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'message', 'This exam is not available.');
  end if;

  delete from public.attempt_start_events
  where created_at < now() - interval '1 day';

  insert into public.attempt_start_events (exam_id, student_email_normalized)
  values (exam_row.id, normalized_email);

  select count(*) into recent_starts
  from public.attempt_start_events
  where exam_id = exam_row.id
    and student_email_normalized = normalized_email
    and created_at > now() - interval '15 minutes';

  if recent_starts > 8 then
    return jsonb_build_object('ok', false, 'code', 'rate_limited', 'message', 'Too many start attempts. Wait a few minutes and try again.');
  end if;

  select * into attempt_row
  from public.attempts
  where exam_id = exam_row.id
    and student_email_normalized = normalized_email
    and status in ('active', 'submitted', 'expired')
  order by created_at desc
  limit 1;

  if attempt_row.id is not null and attempt_row.status = 'active' then
    attempt_row := public.lock_expired_attempt(attempt_row.id);
  end if;

  if attempt_row.id is not null and attempt_row.status in ('submitted', 'expired') then
    return jsonb_build_object(
      'ok', false,
      'code', 'already_completed',
      'message', 'This email has already used its attempt for this exam.'
    );
  end if;

  if attempt_row.id is not null and attempt_row.status = 'active' then
    update public.attempts
    set session_token_hash = p_token_hash
    where id = attempt_row.id
    returning * into attempt_row;

    return jsonb_build_object(
      'ok', true,
      'resumed', true,
      'attempt_id', attempt_row.id,
      'started_at', attempt_row.started_at,
      'expires_at', attempt_row.expires_at,
      'status', attempt_row.status,
      'server_now', now()
    );
  end if;

  if exam_row.available_from is not null and now() < exam_row.available_from then
    return jsonb_build_object('ok', false, 'code', 'not_open', 'message', 'This exam is not open yet.');
  end if;

  if exam_row.available_until is not null and now() > exam_row.available_until then
    return jsonb_build_object('ok', false, 'code', 'not_open', 'message', 'This exam is no longer available.');
  end if;

  if not exists (select 1 from public.questions where exam_id = exam_row.id) then
    return jsonb_build_object('ok', false, 'code', 'no_questions', 'message', 'This exam has no questions yet.');
  end if;

  select * into order_row from public.build_attempt_order(exam_row);

  insert into public.attempts (
    exam_id,
    student_name,
    student_email,
    started_at,
    expires_at,
    status,
    session_token_hash,
    question_order,
    option_order
  ) values (
    exam_row.id,
    clean_name,
    trim(p_student_email),
    now(),
    now() + make_interval(mins => exam_row.duration_minutes),
    'active',
    p_token_hash,
    order_row.question_order,
    order_row.option_order
  )
  returning * into attempt_row;

  return jsonb_build_object(
    'ok', true,
    'resumed', false,
    'attempt_id', attempt_row.id,
    'started_at', attempt_row.started_at,
    'expires_at', attempt_row.expires_at,
    'status', attempt_row.status,
    'server_now', now()
  );
end;
$$;

create or replace function public.get_candidate_attempt(
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
    'server_now', now()
  );
end;
$$;

revoke all on function public.shuffle_text_array(input_values text[]) from public, anon, authenticated;
revoke all on function public.lock_expired_attempt(uuid) from public, anon, authenticated;
revoke all on function public.build_attempt_order(public.exams) from public, anon, authenticated;
revoke all on function public.start_or_resume_attempt(text, text, text, text) from public;
revoke all on function public.get_candidate_attempt(text, text) from public;
grant execute on function public.start_or_resume_attempt(text, text, text, text) to anon, authenticated;
grant execute on function public.get_candidate_attempt(text, text) to anon, authenticated;
