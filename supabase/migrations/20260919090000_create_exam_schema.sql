-- Exam platform core schema.
-- Candidate access goes through the Next.js server. Direct anon table access is denied.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  description text,
  duration_minutes integer not null default 45,
  available_from timestamptz,
  available_until timestamptz,
  published boolean not null default false,
  pass_mark numeric(6, 2),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exams_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint exams_duration_positive check (duration_minutes > 0),
  constraint exams_pass_mark_valid check (pass_mark is null or pass_mark >= 0),
  constraint exams_availability_window check (
    available_from is null
    or available_until is null
    or available_until > available_from
  )
);

create unique index exams_slug_unique on public.exams (slug);
create index exams_published_idx on public.exams (published) where published = true;

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  position integer not null,
  type text not null,
  question_text text not null,
  marks numeric(6, 2) not null,
  options jsonb,
  correct_answer jsonb,
  acceptable_answers jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_type_valid check (
    type in (
      'single_choice',
      'multiple_choice',
      'true_false',
      'short_answer',
      'long_answer'
    )
  ),
  constraint questions_position_positive check (position > 0),
  constraint questions_marks_positive check (marks > 0),
  constraint questions_unique_position unique (exam_id, position)
);

create index questions_exam_id_idx on public.questions (exam_id);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  student_name text not null,
  student_email text not null,
  student_email_normalized text generated always as (lower(trim(student_email))) stored,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  status text not null default 'active',
  session_token_hash text not null,
  question_order uuid[],
  option_order jsonb,
  auto_score numeric(8, 2),
  manual_score numeric(8, 2),
  final_score numeric(8, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attempts_name_present check (length(trim(student_name)) > 0),
  constraint attempts_email_present check (student_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  constraint attempts_status_valid check (
    status in ('active', 'submitted', 'expired', 'reset')
  ),
  constraint attempts_expiry_after_start check (expires_at > started_at),
  constraint attempts_lock_timestamps check (
    (
      status in ('submitted', 'expired')
      and submitted_at is not null
    )
    or (
      status in ('active', 'reset')
      and submitted_at is null
    )
  )
);

create unique index attempts_session_token_hash_unique
  on public.attempts (session_token_hash);
create unique index attempts_one_open_or_completed_per_email
  on public.attempts (exam_id, student_email_normalized)
  where status in ('active', 'submitted', 'expired');
create index attempts_exam_status_idx on public.attempts (exam_id, status);
create index attempts_active_expiry_idx
  on public.attempts (expires_at)
  where status = 'active';

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  answer jsonb,
  auto_marks numeric(6, 2),
  manual_marks numeric(6, 2),
  marker_comment text,
  saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint answers_unique_question unique (attempt_id, question_id)
);

create index answers_attempt_id_idx on public.answers (attempt_id);
create index answers_question_id_idx on public.answers (question_id);

create trigger exams_set_updated_at
  before update on public.exams
  for each row execute function public.set_updated_at();

create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

create trigger attempts_set_updated_at
  before update on public.attempts
  for each row execute function public.set_updated_at();

create trigger answers_set_updated_at
  before update on public.answers
  for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

create or replace function public.exam_is_mcq_only(p_exam_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select bool_and(type in ('single_choice', 'multiple_choice', 'true_false'))
      from public.questions
      where exam_id = p_exam_id
    ),
    false
  );
$$;

alter table public.admin_users enable row level security;
alter table public.exams enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.answers enable row level security;

create policy admin_users_admin_all
  on public.admin_users
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy exams_admin_all
  on public.exams
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy questions_admin_all
  on public.questions
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy attempts_admin_all
  on public.attempts
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy answers_admin_all
  on public.answers
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on function public.is_admin() from public, anon;
revoke all on function public.exam_is_mcq_only(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.exam_is_mcq_only(uuid) to authenticated;

revoke all on table public.admin_users from anon, authenticated, public;
revoke all on table public.exams from anon, authenticated, public;
revoke all on table public.questions from anon, authenticated, public;
revoke all on table public.attempts from anon, authenticated, public;
revoke all on table public.answers from anon, authenticated, public;

grant select, insert, update, delete on table public.admin_users to authenticated;
grant select, insert, update, delete on table public.exams to authenticated;
grant select, insert, update, delete on table public.questions to authenticated;
grant select, insert, update, delete on table public.attempts to authenticated;
grant select, insert, update, delete on table public.answers to authenticated;

comment on table public.exams is 'Published exams are started through the Next.js server, not by anon clients.';
comment on column public.questions.correct_answer is 'Server-only answer key. Never send to candidate clients during an active attempt.';
comment on column public.attempts.session_token_hash is 'SHA-256 of the opaque attempt cookie. Do not store the raw token.';
comment on column public.answers.auto_marks is 'Updated on each trusted save for objective and configured short-answer questions.';
