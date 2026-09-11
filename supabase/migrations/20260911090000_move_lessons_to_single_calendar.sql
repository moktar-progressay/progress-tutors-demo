-- Lessons belong directly to their administrator's single calendar.
-- Existing lesson, tutor and student rows are preserved.
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS recurrence text NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS venue_name text,
  ADD COLUMN IF NOT EXISTS online_url text;

UPDATE public.classes lesson
SET
  owner_user_id = COALESCE(lesson.owner_user_id, schedule.owner_user_id),
  start_date = COALESCE(lesson.start_date, schedule.start_date),
  end_date = COALESCE(lesson.end_date, schedule.end_date),
  recurrence = COALESCE(NULLIF(lesson.recurrence, ''), schedule.recurrence, 'weekly'),
  venue_name = COALESCE(lesson.venue_name, schedule.venue_name)
FROM public.recurring_schedule_blocks schedule
WHERE schedule.id = lesson.schedule_block_id;

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM public.classes WHERE owner_user_id IS NULL) THEN
    RAISE EXCEPTION 'Every existing lesson must have an owning administrator before migration';
  END IF;
END
$migration$;

ALTER TABLE public.classes
  ALTER COLUMN owner_user_id SET DEFAULT auth.uid(),
  ALTER COLUMN owner_user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS classes_owner_user_idx
  ON public.classes (owner_user_id);

CREATE INDEX IF NOT EXISTS classes_owner_weekday_time_idx
  ON public.classes (owner_user_id, weekday, start_time);

DROP POLICY IF EXISTS "owners read lessons in their schedules" ON public.classes;
DROP POLICY IF EXISTS "owners create lessons in their schedules" ON public.classes;
DROP POLICY IF EXISTS "owners update lessons in their schedules" ON public.classes;
DROP POLICY IF EXISTS "owners delete lessons in their schedules" ON public.classes;

CREATE POLICY "owners read lessons in their calendar"
  ON public.classes
  FOR SELECT TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));

CREATE POLICY "owners create lessons in their calendar"
  ON public.classes
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

CREATE POLICY "owners update lessons in their calendar"
  ON public.classes
  FOR UPDATE TO authenticated
  USING (owner_user_id = (SELECT auth.uid()))
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

CREATE POLICY "owners delete lessons in their calendar"
  ON public.classes
  FOR DELETE TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owners manage enrolments in their lessons"
  ON public.class_enrolments;

CREATE POLICY "owners manage enrolments in their calendar"
  ON public.class_enrolments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.classes lesson
      WHERE lesson.id = class_enrolments.class_id
        AND lesson.owner_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.classes lesson
      WHERE lesson.id = class_enrolments.class_id
        AND lesson.owner_user_id = (SELECT auth.uid())
    )
  );

-- The old blocks are retained only as a reversible data archive. They are no
-- longer exposed as schedules in the product and new lessons do not use them.
UPDATE public.classes
SET schedule_block_id = NULL
WHERE schedule_block_id IS NOT NULL;
