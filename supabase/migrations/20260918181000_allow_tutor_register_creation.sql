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
