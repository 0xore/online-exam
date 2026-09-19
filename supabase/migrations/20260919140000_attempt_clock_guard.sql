create or replace function public.protect_attempt_clock()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.started_at is distinct from old.started_at
    or new.expires_at is distinct from old.expires_at
  then
    raise exception 'Attempt start and expiry times cannot be changed.';
  end if;

  return new;
end;
$$;

drop trigger if exists attempts_protect_clock on public.attempts;
create trigger attempts_protect_clock
  before update on public.attempts
  for each row
  execute function public.protect_attempt_clock();

create or replace function public.sync_candidate_attempt(
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
    'status', attempt_row.status,
    'started_at', attempt_row.started_at,
    'expires_at', attempt_row.expires_at,
    'server_now', now()
  );
end;
$$;

revoke all on function public.protect_attempt_clock() from public, anon, authenticated;
revoke all on function public.sync_candidate_attempt(text, text) from public;
grant execute on function public.sync_candidate_attempt(text, text) to anon, authenticated;
