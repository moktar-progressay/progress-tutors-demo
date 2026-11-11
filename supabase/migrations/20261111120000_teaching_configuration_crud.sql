-- Applied to progressay-tutors-demo on 11 November 2026.
CREATE TABLE IF NOT EXISTS public.teaching_levels (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.teaching_subjects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.site_rooms (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT, name text NOT NULL, floor text, capacity integer CHECK (capacity IS NULL OR capacity > 0), active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(site_id,name));
DO $$
DECLARE tbl text;
BEGIN
 FOREACH tbl IN ARRAY ARRAY['teaching_levels','teaching_subjects','site_rooms'] LOOP
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
   EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
   EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl);
   IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl AND policyname = tbl || '_admin_manage') THEN
     EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (SELECT auth.uid()) AND role = ''admin'')) WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (SELECT auth.uid()) AND role = ''admin''))', tbl || '_admin_manage', tbl);
   END IF;
 END LOOP;
END $$;
INSERT INTO public.teaching_levels(name) SELECT unnest(ARRAY['KS1','KS2','KS3','GCSE','A Level','Degree','Masters','Other']) ON CONFLICT(name) DO NOTHING;
INSERT INTO public.teaching_subjects(name) SELECT unnest(ARRAY['English','Maths','Science']) ON CONFLICT(name) DO NOTHING;
INSERT INTO public.teaching_subjects(name) SELECT DISTINCT trim(subject) FROM public.classes WHERE subject IS NOT NULL AND trim(subject) <> '' ON CONFLICT(name) DO NOTHING;
INSERT INTO public.teaching_levels(name) SELECT DISTINCT trim(level) FROM public.classes WHERE level IS NOT NULL AND trim(level) <> '' ON CONFLICT(name) DO NOTHING;
INSERT INTO public.site_rooms(site_id,name,floor)
SELECT s.id,r.name,r.floor FROM public.sites s CROSS JOIN (VALUES
('Training Room (Ground Floor)','Ground Floor'),('Board Room (Ground Floor)','Ground Floor'),
('Office Room (Ground Floor)','Ground Floor'),('Interview Room (Ground Floor)','Ground Floor'),
('Break Out (Ground Floor)','Ground Floor'),('Break Out (First Floor)','First Floor'),
('Progressay Office (First Floor)','First Floor')) r(name,floor)
WHERE s.name ILIKE '%freston%' ON CONFLICT(site_id,name) DO NOTHING;
INSERT INTO public.site_rooms(site_id,name)
SELECT DISTINCT site_id,trim(room) FROM public.classes WHERE site_id IS NOT NULL AND room IS NOT NULL AND trim(room) <> '' ON CONFLICT(site_id,name) DO NOTHING;
