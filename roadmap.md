# ProgressTutors demo roadmap

## Phase 1 — Prototype UI (in progress)
- [x] Design system (pink identity, curved hero/footer)
- [x] App shell, role switcher, responsive nav
- [x] Admin screens (dashboard, operations, classes, class detail, students, tutors, payments, payment requests, reports)
- [x] Tutor screens (dashboard, lessons, lesson, review, earnings, payment requests)
- [ ] Parent screens (dashboard, child, find classes, class detail, payments)
- [ ] Student screens (dashboard, lessons, homework, progress, rewards)

## Phase 2 — Shared live database (new brief, 9 Sep)
- [ ] Schema migration: sites, programmes, pricing_plans, recurring_schedule_blocks, classes, tutors,
      parents, students, parent_students, class_enrolments, sessions, tutor_assignments, tutor_signins,
      lesson_reviews, student_attendance, progress_records, homework_items, client_subscriptions,
      client_payments, tutor_earnings, payment_requests, payment_request_items
- [ ] RLS: authenticated read/write, anonymous denied; GRANTs on every table
- [ ] Seed real sites, tuition + football schedule blocks, football pricing plans (Play/Train/Compete)
- [ ] Auth gate: sign up / sign in / sign out; unauthenticated redirect before data loads
- [ ] Students CRUD + archive + search + filters + sensitive fields only in detail
- [ ] Parents CRUD, Tutors CRUD
- [ ] Classes CRUD inside schedule blocks; assign tutor; add/move students
- [ ] Saturday operations view defaulting to 12 Sep 2026 / Lancaster + Westway football block
- [ ] Sessions: tutor sign-in timestamp, student register (Present/Absent/Late/Excused), % from DB
- [ ] Lesson reviews persisted
- [ ] Progress records + homework items shared across parent/student views
- [ ] Client subscriptions + manual payments; admin totals from DB
- [ ] Tutor earnings from agreed rate → payment requests → approve/query/reject/mark paid
- [ ] CSV import for students (client-side parse, column mapping, dedupe preview)
- [ ] Dashboards derive all numbers from DB (0 when empty)
- [ ] Remove hard-coded people from operational surfaces; label "Shared operational demo · Live data"
