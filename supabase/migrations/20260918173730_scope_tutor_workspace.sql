-- Link each tutor record to exactly one authenticated account. Existing demo
-- records are backfilled by email where a matching auth user already exists.
alter table public.tutors
  add column if not exists user_id uuid references auth.users(id) on delete set null;

update public.tutors tutor
set user_id = auth_user.id
from auth.users auth_user
where tutor.user_id is null
  and tutor.email is not null
  and auth_user.email is not null
  and lower(tutor.email) = lower(auth_user.email);

create unique index if not exists tutors_user_id_unique_idx
  on public.tutors (user_id)
  where user_id is not null;

create index if not exists classes_tutor_id_idx on public.classes (tutor_id);
create index if not exists sessions_tutor_id_idx on public.sessions (tutor_id);
create index if not exists class_enrolments_class_student_idx
  on public.class_enrolments (class_id, student_id);

-- RLS predicates use this non-exposed helper rather than trusting browser state.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_tutor_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
  from public.tutors
  where user_id = (select auth.uid())
  limit 1
$$;

revoke all on function private.current_tutor_id() from public;
grant execute on function private.current_tutor_id() to authenticated;

-- When a tutor signs up with the email already stored on their tutor record,
-- link the two records and assign the tutor application role automatically.
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

-- A tutor can read only their own profile. Admin policies remain unchanged.
drop policy if exists "tutors read own profile" on public.tutors;
create policy "tutors read own profile"
  on public.tutors for select to authenticated
  using (id = (select private.current_tutor_id()));

-- Calendar and class context.
drop policy if exists "tutors read assigned sites" on public.sites;
create policy "tutors read assigned sites"
  on public.sites for select to authenticated
  using (
    exists (
      select 1 from public.classes class
      where class.site_id = sites.id
        and class.tutor_id = (select private.current_tutor_id())
    )
  );

drop policy if exists "tutors read assigned classes" on public.classes;
create policy "tutors read assigned classes"
  on public.classes for select to authenticated
  using (tutor_id = (select private.current_tutor_id()));

drop policy if exists "tutors read assigned sessions" on public.sessions;
create policy "tutors read assigned sessions"
  on public.sessions for select to authenticated
  using (
    tutor_id = (select private.current_tutor_id())
    or exists (
      select 1 from public.classes class
      where class.id = sessions.class_id
        and class.tutor_id = (select private.current_tutor_id())
    )
  );

drop policy if exists "tutors update assigned sessions" on public.sessions;
create policy "tutors update assigned sessions"
  on public.sessions for update to authenticated
  using (
    tutor_id = (select private.current_tutor_id())
    or exists (
      select 1 from public.classes class
      where class.id = sessions.class_id
        and class.tutor_id = (select private.current_tutor_id())
    )
  )
  with check (
    tutor_id = (select private.current_tutor_id())
    or exists (
      select 1 from public.classes class
      where class.id = sessions.class_id
        and class.tutor_id = (select private.current_tutor_id())
    )
  );

drop policy if exists "tutors create assigned sessions" on public.sessions;
create policy "tutors create assigned sessions"
  on public.sessions for insert to authenticated
  with check (
    tutor_id = (select private.current_tutor_id())
    and exists (
      select 1 from public.classes class
      where class.id = sessions.class_id
        and class.tutor_id = (select private.current_tutor_id())
    )
  );

-- Students are visible only when enrolled in a class assigned to this tutor.
drop policy if exists "tutors read assigned enrolments" on public.class_enrolments;
create policy "tutors read assigned enrolments"
  on public.class_enrolments for select to authenticated
  using (
    exists (
      select 1 from public.classes class
      where class.id = class_enrolments.class_id
        and class.tutor_id = (select private.current_tutor_id())
    )
  );

drop policy if exists "tutors add assigned enrolments" on public.class_enrolments;
create policy "tutors add assigned enrolments"
  on public.class_enrolments for insert to authenticated
  with check (
    exists (
      select 1 from public.classes class
      where class.id = class_enrolments.class_id
        and class.tutor_id = (select private.current_tutor_id())
    )
  );

drop policy if exists "tutors update assigned enrolments" on public.class_enrolments;
create policy "tutors update assigned enrolments"
  on public.class_enrolments for update to authenticated
  using (
    exists (
      select 1 from public.classes class
      where class.id = class_enrolments.class_id
        and class.tutor_id = (select private.current_tutor_id())
    )
  )
  with check (
    exists (
      select 1 from public.classes class
      where class.id = class_enrolments.class_id
        and class.tutor_id = (select private.current_tutor_id())
    )
  );

drop policy if exists "tutors remove assigned enrolments" on public.class_enrolments;
create policy "tutors remove assigned enrolments"
  on public.class_enrolments for delete to authenticated
  using (
    exists (
      select 1 from public.classes class
      where class.id = class_enrolments.class_id
        and class.tutor_id = (select private.current_tutor_id())
    )
  );

drop policy if exists "tutors read assigned students" on public.students;
create policy "tutors read assigned students"
  on public.students for select to authenticated
  using (
    exists (
      select 1
      from public.class_enrolments enrolment
      join public.classes class on class.id = enrolment.class_id
      where enrolment.student_id = students.id
        and class.tutor_id = (select private.current_tutor_id())
    )
  );

-- Attendance and lesson reviews for the tutor's own sessions.
drop policy if exists "tutors manage assigned attendance" on public.student_attendance;
create policy "tutors manage assigned attendance"
  on public.student_attendance for all to authenticated
  using (
    exists (
      select 1 from public.sessions session
      where session.id = student_attendance.session_id
        and (
          session.tutor_id = (select private.current_tutor_id())
          or exists (
            select 1 from public.classes class
            where class.id = session.class_id
              and class.tutor_id = (select private.current_tutor_id())
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.sessions session
      where session.id = student_attendance.session_id
        and (
          session.tutor_id = (select private.current_tutor_id())
          or exists (
            select 1 from public.classes class
            where class.id = session.class_id
              and class.tutor_id = (select private.current_tutor_id())
          )
        )
    )
  );

drop policy if exists "tutors manage own reviews" on public.lesson_reviews;
create policy "tutors manage own reviews"
  on public.lesson_reviews for all to authenticated
  using (tutor_id = (select private.current_tutor_id()))
  with check (
    tutor_id = (select private.current_tutor_id())
    and exists (
      select 1 from public.sessions session
      where session.id = lesson_reviews.session_id
        and (
          session.tutor_id = (select private.current_tutor_id())
          or exists (
            select 1 from public.classes class
            where class.id = session.class_id
              and class.tutor_id = (select private.current_tutor_id())
          )
        )
    )
  );

drop policy if exists "tutors manage own signins" on public.tutor_signins;
create policy "tutors manage own signins"
  on public.tutor_signins for all to authenticated
  using (tutor_id = (select private.current_tutor_id()))
  with check (tutor_id = (select private.current_tutor_id()));

-- Homework and progress only for learners in an assigned class.
drop policy if exists "tutors manage assigned homework" on public.homework_items;
create policy "tutors manage assigned homework"
  on public.homework_items for all to authenticated
  using (
    exists (
      select 1 from public.classes class
      where class.id = homework_items.class_id
        and class.tutor_id = (select private.current_tutor_id())
    )
  )
  with check (
    exists (
      select 1 from public.classes class
      where class.id = homework_items.class_id
        and class.tutor_id = (select private.current_tutor_id())
    )
    and (
      homework_items.student_id is null
      or exists (
        select 1 from public.class_enrolments enrolment
        where enrolment.class_id = homework_items.class_id
          and enrolment.student_id = homework_items.student_id
      )
    )
  );

drop policy if exists "tutors manage assigned progress" on public.progress_records;
create policy "tutors manage assigned progress"
  on public.progress_records for all to authenticated
  using (
    exists (
      select 1 from public.classes class
      where class.id = progress_records.class_id
        and class.tutor_id = (select private.current_tutor_id())
    )
  )
  with check (
    exists (
      select 1 from public.classes class
      where class.id = progress_records.class_id
        and class.tutor_id = (select private.current_tutor_id())
    )
    and exists (
      select 1 from public.class_enrolments enrolment
      where enrolment.class_id = progress_records.class_id
        and enrolment.student_id = progress_records.student_id
    )
  );

-- Private pay data: tutors see and request only their own earnings. Existing
-- admin policies still allow administrators to approve and pay requests.
drop policy if exists "tutors manage own earnings" on public.tutor_earnings;
create policy "tutors manage own earnings"
  on public.tutor_earnings for all to authenticated
  using (tutor_id = (select private.current_tutor_id()))
  with check (tutor_id = (select private.current_tutor_id()));

drop policy if exists "tutors manage own payment requests" on public.payment_requests;
create policy "tutors manage own payment requests"
  on public.payment_requests for all to authenticated
  using (tutor_id = (select private.current_tutor_id()))
  with check (tutor_id = (select private.current_tutor_id()));

drop policy if exists "tutors manage own payment request items" on public.payment_request_items;
create policy "tutors manage own payment request items"
  on public.payment_request_items for all to authenticated
  using (
    exists (
      select 1 from public.payment_requests request
      where request.id = payment_request_items.payment_request_id
        and request.tutor_id = (select private.current_tutor_id())
    )
  )
  with check (
    exists (
      select 1 from public.payment_requests request
      where request.id = payment_request_items.payment_request_id
        and request.tutor_id = (select private.current_tutor_id())
    )
  );

-- Tutors can create a new learner only inside one of their assigned classes.
-- The student row and enrolment are written atomically so an orphaned learner
-- can never be created by a tutor.
create or replace function public.add_student_to_tutor_class(
  p_class_id uuid,
  p_first_name text,
  p_last_name text default null,
  p_year_group text default null,
  p_school text default null,
  p_date_of_birth date default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  tutor_uuid uuid := private.current_tutor_id();
  student_uuid uuid;
begin
  if tutor_uuid is null or not exists (
    select 1
    from public.classes class
    where class.id = p_class_id
      and class.tutor_id = tutor_uuid
  ) then
    raise exception 'You can only add students to your assigned classes';
  end if;

  if nullif(trim(p_first_name), '') is null then
    raise exception 'Student first name is required';
  end if;

  insert into public.students (
    first_name,
    last_name,
    year_group,
    school,
    date_of_birth,
    notes,
    status
  ) values (
    trim(p_first_name),
    nullif(trim(p_last_name), ''),
    nullif(trim(p_year_group), ''),
    nullif(trim(p_school), ''),
    p_date_of_birth,
    nullif(trim(p_notes), ''),
    'active'
  )
  returning id into student_uuid;

  insert into public.class_enrolments (class_id, student_id, status)
  values (p_class_id, student_uuid, 'active');

  return student_uuid;
end
$$;

revoke all on function public.add_student_to_tutor_class(uuid, text, text, text, text, date, text)
  from public;
revoke all on function public.add_student_to_tutor_class(uuid, text, text, text, text, date, text)
  from anon;
grant execute on function public.add_student_to_tutor_class(uuid, text, text, text, text, date, text)
  to authenticated;
