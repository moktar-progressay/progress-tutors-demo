-- Recurring schedules are private to the school administrator who owns them.
ALTER TABLE public.recurring_schedule_blocks
  ADD COLUMN owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.recurring_schedule_blocks
SET owner_user_id = (
  SELECT id
  FROM auth.users
  WHERE lower(email) = 'moktar@progressay.com'
  LIMIT 1
)
WHERE owner_user_id IS NULL;

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.recurring_schedule_blocks
    WHERE owner_user_id IS NULL
  ) THEN
    RAISE EXCEPTION 'The Progressay owner account was not found';
  END IF;
END
$migration$;

ALTER TABLE public.recurring_schedule_blocks
  ALTER COLUMN owner_user_id SET DEFAULT auth.uid(),
  ALTER COLUMN owner_user_id SET NOT NULL;

CREATE INDEX recurring_schedule_blocks_owner_idx
  ON public.recurring_schedule_blocks (owner_user_id);

DROP POLICY IF EXISTS "recurring_schedule_blocks auth all"
  ON public.recurring_schedule_blocks;

CREATE POLICY "owners read their schedules"
  ON public.recurring_schedule_blocks
  FOR SELECT TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));

CREATE POLICY "owners create their schedules"
  ON public.recurring_schedule_blocks
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

CREATE POLICY "owners update their schedules"
  ON public.recurring_schedule_blocks
  FOR UPDATE TO authenticated
  USING (owner_user_id = (SELECT auth.uid()))
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

CREATE POLICY "owners delete their schedules"
  ON public.recurring_schedule_blocks
  FOR DELETE TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));
