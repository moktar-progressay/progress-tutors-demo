-- Keep each administrator's schedules, lessons and lesson enrolments private.
DROP POLICY IF EXISTS "blocks auth all"
  ON public.recurring_schedule_blocks;

DROP POLICY IF EXISTS "classes auth all"
  ON public.classes;

CREATE POLICY "owners read lessons in their schedules"
  ON public.classes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.recurring_schedule_blocks schedule
      WHERE schedule.id = classes.schedule_block_id
        AND schedule.owner_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "owners create lessons in their schedules"
  ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.recurring_schedule_blocks schedule
      WHERE schedule.id = classes.schedule_block_id
        AND schedule.owner_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "owners update lessons in their schedules"
  ON public.classes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.recurring_schedule_blocks schedule
      WHERE schedule.id = classes.schedule_block_id
        AND schedule.owner_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.recurring_schedule_blocks schedule
      WHERE schedule.id = classes.schedule_block_id
        AND schedule.owner_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "owners delete lessons in their schedules"
  ON public.classes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.recurring_schedule_blocks schedule
      WHERE schedule.id = classes.schedule_block_id
        AND schedule.owner_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "class_enrolments auth all"
  ON public.class_enrolments;

CREATE POLICY "owners manage enrolments in their lessons"
  ON public.class_enrolments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.classes lesson
      JOIN public.recurring_schedule_blocks schedule
        ON schedule.id = lesson.schedule_block_id
      WHERE lesson.id = class_enrolments.class_id
        AND schedule.owner_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.classes lesson
      JOIN public.recurring_schedule_blocks schedule
        ON schedule.id = lesson.schedule_block_id
      WHERE lesson.id = class_enrolments.class_id
        AND schedule.owner_user_id = (SELECT auth.uid())
    )
  );
