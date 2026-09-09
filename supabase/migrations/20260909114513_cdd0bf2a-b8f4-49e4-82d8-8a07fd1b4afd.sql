-- ===== helper =====
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ===== sites =====
CREATE TABLE public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO authenticated;
GRANT ALL ON public.sites TO service_role;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sites auth all" ON public.sites FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER sites_updated BEFORE UPDATE ON public.sites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== programmes =====
CREATE TABLE public.programmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  programme_type text NOT NULL DEFAULT 'tuition',
  category text,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programmes TO authenticated;
GRANT ALL ON public.programmes TO service_role;
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "programmes auth all" ON public.programmes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER programmes_updated BEFORE UPDATE ON public.programmes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== pricing_plans =====
CREATE TABLE public.pricing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid REFERENCES public.programmes(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'GBP',
  pricing_unit text NOT NULL DEFAULT 'per hour',
  inclusion_notes text,
  availability_note text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_plans TO authenticated;
GRANT ALL ON public.pricing_plans TO service_role;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pricing_plans auth all" ON public.pricing_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER pricing_plans_updated BEFORE UPDATE ON public.pricing_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== recurring_schedule_blocks =====
CREATE TABLE public.recurring_schedule_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  title text NOT NULL,
  weekday text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  recurrence text NOT NULL DEFAULT 'weekly',
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_schedule_blocks TO authenticated;
GRANT ALL ON public.recurring_schedule_blocks TO service_role;
ALTER TABLE public.recurring_schedule_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks auth all" ON public.recurring_schedule_blocks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER blocks_updated BEFORE UPDATE ON public.recurring_schedule_blocks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== tutors =====
CREATE TABLE public.tutors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  subjects text[] NOT NULL DEFAULT '{}',
  levels text[] NOT NULL DEFAULT '{}',
  hourly_rate numeric(10,2),
  pay_notes text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutors TO authenticated;
GRANT ALL ON public.tutors TO service_role;
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tutors auth all" ON public.tutors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER tutors_updated BEFORE UPDATE ON public.tutors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== parents =====
CREATE TABLE public.parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  billing_status text NOT NULL DEFAULT 'active',
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parents TO authenticated;
GRANT ALL ON public.parents TO service_role;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parents auth all" ON public.parents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER parents_updated BEFORE UPDATE ON public.parents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== students =====
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text,
  date_of_birth date,
  year_group text,
  school text,
  email text,
  phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  send_flag boolean NOT NULL DEFAULT false,
  ehcp_flag boolean NOT NULL DEFAULT false,
  medical_notes text,
  allergy_notes text,
  courses_note text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students auth all" ON public.students FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER students_updated BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== parent_students =====
CREATE TABLE public.parent_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship text,
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_students TO authenticated;
GRANT ALL ON public.parent_students TO service_role;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent_students auth all" ON public.parent_students FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== classes =====
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  schedule_block_id uuid REFERENCES public.recurring_schedule_blocks(id) ON DELETE SET NULL,
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE SET NULL,
  name text NOT NULL,
  subject text,
  level text,
  age_group text,
  weekday text,
  start_time time,
  end_time time,
  capacity integer NOT NULL DEFAULT 12,
  room text,
  delivery_mode text NOT NULL DEFAULT 'in_person',
  goprogress_course_url text,
  session_rate numeric(10,2),
  price_per_session numeric(10,2),
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classes auth all" ON public.classes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER classes_updated BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== class_enrolments =====
CREATE TABLE public.class_enrolments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  start_date date DEFAULT current_date,
  end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_enrolments TO authenticated;
GRANT ALL ON public.class_enrolments TO service_role;
ALTER TABLE public.class_enrolments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "class_enrolments auth all" ON public.class_enrolments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER class_enrolments_updated BEFORE UPDATE ON public.class_enrolments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== sessions =====
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  schedule_block_id uuid REFERENCES public.recurring_schedule_blocks(id) ON DELETE SET NULL,
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE SET NULL,
  session_date date NOT NULL,
  start_time time,
  end_time time,
  status text NOT NULL DEFAULT 'scheduled',
  agreed_amount numeric(10,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, session_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions auth all" ON public.sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER sessions_updated BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== tutor_assignments =====
CREATE TABLE public.tutor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'lead',
  agreed_amount numeric(10,2),
  agreed_rate numeric(10,2),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutor_assignments TO authenticated;
GRANT ALL ON public.tutor_assignments TO service_role;
ALTER TABLE public.tutor_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tutor_assignments auth all" ON public.tutor_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER tutor_assignments_updated BEFORE UPDATE ON public.tutor_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== tutor_signins =====
CREATE TABLE public.tutor_signins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE SET NULL,
  signed_in_at timestamptz NOT NULL DEFAULT now(),
  signed_out_at timestamptz,
  method text NOT NULL DEFAULT 'app',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, tutor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutor_signins TO authenticated;
GRANT ALL ON public.tutor_signins TO service_role;
ALTER TABLE public.tutor_signins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tutor_signins auth all" ON public.tutor_signins FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== lesson_reviews =====
CREATE TABLE public.lesson_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE SET NULL,
  covered text,
  progress_note text,
  next_steps text,
  concerns text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_reviews TO authenticated;
GRANT ALL ON public.lesson_reviews TO service_role;
ALTER TABLE public.lesson_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson_reviews auth all" ON public.lesson_reviews FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER lesson_reviews_updated BEFORE UPDATE ON public.lesson_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== student_attendance =====
CREATE TABLE public.student_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'present',
  minutes_late integer,
  note text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_attendance TO authenticated;
GRANT ALL ON public.student_attendance TO service_role;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_attendance auth all" ON public.student_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER student_attendance_updated BEFORE UPDATE ON public.student_attendance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== progress_records =====
CREATE TABLE public.progress_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  subject text,
  record_date date NOT NULL DEFAULT current_date,
  score numeric(10,2),
  target text,
  note text,
  status text NOT NULL DEFAULT 'on_track',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_records TO authenticated;
GRANT ALL ON public.progress_records TO service_role;
ALTER TABLE public.progress_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_records auth all" ON public.progress_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER progress_records_updated BEFORE UPDATE ON public.progress_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== homework_items =====
CREATE TABLE public.homework_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'due',
  goprogress_linked boolean NOT NULL DEFAULT false,
  goprogress_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework_items TO authenticated;
GRANT ALL ON public.homework_items TO service_role;
ALTER TABLE public.homework_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homework_items auth all" ON public.homework_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER homework_items_updated BEFORE UPDATE ON public.homework_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== client_subscriptions =====
CREATE TABLE public.client_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  pricing_plan_id uuid REFERENCES public.pricing_plans(id) ON DELETE SET NULL,
  plan_name text,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  cadence text NOT NULL DEFAULT 'monthly',
  next_due_date date,
  status text NOT NULL DEFAULT 'active',
  method_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_subscriptions TO authenticated;
GRANT ALL ON public.client_subscriptions TO service_role;
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_subscriptions auth all" ON public.client_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER client_subscriptions_updated BEFORE UPDATE ON public.client_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== client_payments =====
CREATE TABLE public.client_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.parents(id) ON DELETE SET NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.client_subscriptions(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  payment_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'paid',
  method text,
  reference text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_payments TO authenticated;
GRANT ALL ON public.client_payments TO service_role;
ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_payments auth all" ON public.client_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER client_payments_updated BEFORE UPDATE ON public.client_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== payment_requests =====
CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text,
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'submitted',
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_hours numeric(10,2) NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_requests TO authenticated;
GRANT ALL ON public.payment_requests TO service_role;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_requests auth all" ON public.payment_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER payment_requests_updated BEFORE UPDATE ON public.payment_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== tutor_earnings =====
CREATE TABLE public.tutor_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  earning_date date NOT NULL DEFAULT current_date,
  hours numeric(10,2) NOT NULL DEFAULT 1,
  agreed_rate numeric(10,2),
  amount numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'eligible',
  payment_request_id uuid REFERENCES public.payment_requests(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, tutor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutor_earnings TO authenticated;
GRANT ALL ON public.tutor_earnings TO service_role;
ALTER TABLE public.tutor_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tutor_earnings auth all" ON public.tutor_earnings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER tutor_earnings_updated BEFORE UPDATE ON public.tutor_earnings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== payment_request_items =====
CREATE TABLE public.payment_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id uuid NOT NULL REFERENCES public.payment_requests(id) ON DELETE CASCADE,
  tutor_earning_id uuid REFERENCES public.tutor_earnings(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  description text,
  hours numeric(10,2) NOT NULL DEFAULT 1,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_request_items TO authenticated;
GRANT ALL ON public.payment_request_items TO service_role;
ALTER TABLE public.payment_request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_request_items auth all" ON public.payment_request_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ===== SEED: sites, programmes, plans, schedule blocks =====
INSERT INTO public.sites (name, city) VALUES
  ('Lancaster Youth Hub', 'London'),
  ('Freston Road', 'London'),
  ('Chelsea Youth Hub', 'London'),
  ('Westway Sports Centre', 'London'),
  ('Emslie Horniman Park', 'London');

INSERT INTO public.programmes (name, programme_type, category, description) VALUES
  ('Tuition', 'tuition', 'academic', 'Weekly academic tuition sessions'),
  ('Football', 'sports', 'football', 'Football play, train and compete pathway');

INSERT INTO public.pricing_plans (programme_id, name, amount, pricing_unit, inclusion_notes, availability_note, sort_order)
SELECT p.id, v.name, v.amount, 'per hour', v.inclusion, v.availability, v.sort_order
FROM public.programmes p,
(VALUES
  ('Play', 9.00, '1 hour per week on Saturday at Westway Sports Centre during the 13:00-15:00 football window.', NULL, 1),
  ('Train', 29.00, '1 hour on Tuesday at Emslie Horniman Park during 18:00-20:00, plus another 1 hour on Saturday at Westway Sports Centre during 13:00-15:00.', NULL, 2),
  ('Compete', 59.00, 'Everything in Train plus league competition on Sundays 16:00-17:00.', 'League start date coming soon', 3)
) AS v(name, amount, inclusion, availability, sort_order)
WHERE p.name = 'Football';

INSERT INTO public.recurring_schedule_blocks (programme_id, site_id, title, weekday, start_time, end_time, recurrence, start_date, status)
SELECT pr.id, s.id, 'Lancaster Saturday Tuition', 'Saturday', '10:00', '12:00', 'weekly', DATE '2026-09-12', 'active'
FROM public.programmes pr, public.sites s WHERE pr.name = 'Tuition' AND s.name = 'Lancaster Youth Hub';

INSERT INTO public.recurring_schedule_blocks (programme_id, site_id, title, weekday, start_time, end_time, recurrence, start_date, status)
SELECT pr.id, s.id, 'Freston Road Sunday Tuition', 'Sunday', '10:00', '13:00', 'weekly', DATE '2026-09-13', 'active'
FROM public.programmes pr, public.sites s WHERE pr.name = 'Tuition' AND s.name = 'Freston Road';

INSERT INTO public.recurring_schedule_blocks (programme_id, site_id, title, weekday, start_time, end_time, recurrence, start_date, status)
SELECT pr.id, s.id, 'Chelsea Tuesday Tuition', 'Tuesday', '16:30', '18:30', 'weekly', DATE '2026-09-15', 'active'
FROM public.programmes pr, public.sites s WHERE pr.name = 'Tuition' AND s.name = 'Chelsea Youth Hub';

INSERT INTO public.recurring_schedule_blocks (programme_id, site_id, title, weekday, start_time, end_time, recurrence, start_date, status)
SELECT pr.id, s.id, 'Westway Saturday Football', 'Saturday', '13:00', '15:00', 'weekly', DATE '2026-09-12', 'active'
FROM public.programmes pr, public.sites s WHERE pr.name = 'Football' AND s.name = 'Westway Sports Centre';

INSERT INTO public.recurring_schedule_blocks (programme_id, site_id, title, weekday, start_time, end_time, recurrence, start_date, status)
SELECT pr.id, s.id, 'Emslie Horniman Tuesday Football', 'Tuesday', '18:00', '20:00', 'weekly', DATE '2026-09-15', 'active'
FROM public.programmes pr, public.sites s WHERE pr.name = 'Football' AND s.name = 'Emslie Horniman Park';

INSERT INTO public.recurring_schedule_blocks (programme_id, site_id, title, weekday, start_time, end_time, recurrence, start_date, status, notes)
SELECT pr.id, NULL, 'Sunday League', 'Sunday', '16:00', '17:00', 'weekly', NULL, 'coming_soon', 'League start date not confirmed'
FROM public.programmes pr WHERE pr.name = 'Football';