create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
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

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

drop policy if exists admin_users_admin_all on public.admin_users;
drop policy if exists exams_admin_all on public.exams;
drop policy if exists questions_admin_all on public.questions;
drop policy if exists attempts_admin_all on public.attempts;
drop policy if exists answers_admin_all on public.answers;

create policy admin_users_admin_all
  on public.admin_users
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy exams_admin_all
  on public.exams
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy questions_admin_all
  on public.questions
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy attempts_admin_all
  on public.attempts
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy answers_admin_all
  on public.answers
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop function if exists public.is_admin();
