create or replace function public.has_admin_users()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users);
$$;

revoke all on function public.has_admin_users() from public;
grant execute on function public.has_admin_users() to anon, authenticated;

create or replace function public.bootstrap_first_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.admin_users) then
    return false;
  end if;

  insert into public.admin_users (user_id) values (auth.uid());
  return true;
end;
$$;

revoke all on function public.bootstrap_first_admin() from public, anon;
grant execute on function public.bootstrap_first_admin() to authenticated;

grant select on table public.exams to anon;

create policy exams_public_read_published
  on public.exams
  for select
  to anon, authenticated
  using (published = true);

comment on function public.bootstrap_first_admin() is
  'Promotes the current user to administrator only when admin_users is empty.';
