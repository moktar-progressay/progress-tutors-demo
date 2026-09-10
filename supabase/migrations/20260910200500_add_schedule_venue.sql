ALTER TABLE public.recurring_schedule_blocks
  ADD COLUMN venue_name text;

UPDATE public.recurring_schedule_blocks block
SET venue_name = site.name
FROM public.sites site
WHERE block.site_id = site.id
  AND block.venue_name IS NULL;
