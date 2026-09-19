create or replace function public.provision_first_admin(p_email text, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  new_id uuid;
  normalized_email text := lower(trim(p_email));
  existing_id uuid;
begin
  if exists (select 1 from public.admin_users) then
    return false;
  end if;

  if normalized_email is null
     or normalized_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'Enter a valid email address.';
  end if;

  if p_password is null or length(p_password) < 8 then
    raise exception 'Password must be at least 8 characters.';
  end if;

  select id into existing_id
  from auth.users
  where lower(email) = normalized_email
  limit 1;

  if existing_id is not null then
    update auth.users
    set
      encrypted_password = crypt(p_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
    where id = existing_id;

    insert into public.admin_users (user_id)
    values (existing_id)
    on conflict (user_id) do nothing;

    return true;
  end if;

  new_id := gen_random_uuid();

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    is_sso_user,
    is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    normalized_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    false,
    false
  );

  insert into auth.identities (
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    new_id,
    new_id::text,
    jsonb_build_object(
      'sub', new_id::text,
      'email', normalized_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  );

  insert into public.admin_users (user_id) values (new_id);
  return true;
end;
$$;

revoke all on function public.provision_first_admin(text, text) from public;
grant execute on function public.provision_first_admin(text, text) to anon, authenticated;

comment on function public.provision_first_admin(text, text) is
  'Creates the first administrator without sending email. No-ops after an admin exists.';
