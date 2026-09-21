create or replace function private.link_tutor_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_tutor_id uuid;
begin
  if new.email is null then
    return new;
  end if;

  update public.tutors tutor
  set user_id = new.id
  where tutor.user_id is null
    and tutor.email is not null
    and lower(tutor.email) = lower(new.email)
  returning tutor.id into linked_tutor_id;

  if linked_tutor_id is not null then
    insert into public.user_roles (user_id, role)
    values (new.id, 'tutor')
    on conflict (user_id) do nothing;
  end if;

  return new;
end
$$;

revoke all on function private.link_tutor_auth_user() from public;
revoke all on function private.link_tutor_auth_user() from anon;
revoke all on function private.link_tutor_auth_user() from authenticated;

drop trigger if exists link_tutor_auth_user_after_signup on auth.users;
create trigger link_tutor_auth_user_after_signup
after insert or update of email on auth.users
for each row execute function private.link_tutor_auth_user();
