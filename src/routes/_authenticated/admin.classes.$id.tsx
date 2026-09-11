import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Filter, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Avatar, avatarTone, Empty, GoProgressLink, PageHeader, Pill } from "@/components/kit";
import { FormDialog, SelectField, TextAreaField, TextField } from "@/components/form-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEMO_DATE,
  fullName,
  hhmm,
  initialsOf,
  money,
  prettyDate,
  useTable,
  useDeleteRow,
  useUpdateRow,
  useUpsert,
  weekdayOf,
} from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/classes/$id")({
  head: () => ({
    meta: [{ title: "Lesson | ProgressTutors" }, { name: "robots", content: "noindex" }],
  }),
  component: ClassProfile,
});

const TABS = ["Overview", "Students", "Lesson Reviews", "Payments", "GoProgress", "Notes"] as const;
type Tab = (typeof TABS)[number];

function ClassProfile() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const classes = useTable("classes", "name");
  const sites = useTable("sites", "name");
  const tutors = useTable("tutors", "first_name");
  const students = useTable("students", "first_name");
  const parents = useTable("parents", "first_name");
  const parentStudents = useTable("parent_students");
  const enrolments = useTable("class_enrolments");
  const sessions = useTable("sessions", "session_date");
  const attendance = useTable("student_attendance");
  const reviews = useTable("lesson_reviews", "submitted_at");
  const subscriptions = useTable("client_subscriptions");
  const payments = useTable("client_payments", "payment_date");
  const updateClass = useUpdateRow("classes");
  const deleteClass = useDeleteRow("classes");
  const addEnrolment = useUpsert("class_enrolments");
  const updateEnrolment = useUpdateRow("class_enrolments");

  const [tab, setTab] = useState<Tab>("Students");
  const [lessonPickerOpen, setLessonPickerOpen] = useState(false);
  const [lessonSearch, setLessonSearch] = useState("");
  const [enrolOpen, setEnrolOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentSchool, setStudentSchool] = useState("all");
  const [studentYear, setStudentYear] = useState("all");
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState({
    name: "",
    start_date: DEMO_DATE,
    start_time: "10:00",
    end_time: "11:00",
    recurrence: "weekly",
    end_date: "",
    tutor_id: "",
    room: "",
    active: "active",
    notes: "",
    goprogress_course_url: "",
  });

  const rows = useMemo(() => classes.data ?? [], [classes.data]);
  const c = rows.find((item) => item.id === id);
  const visibleClasses = rows.filter((item) => item.active || item.id === id);

  if (classes.isLoading)
    return (
      <Page>
        <p className="py-12 text-center text-muted-foreground">Loading lesson…</p>
      </Page>
    );
  if (!c)
    return (
      <Page>
        <PageHeader title="Lesson not found" subtitle="It may have been removed." />
        <Link to="/admin/classes" className="text-sm font-bold text-primary">
          Back to schedule
        </Link>
      </Page>
    );

  const site = (sites.data ?? []).find((item) => item.id === c.site_id);
  const tutor = (tutors.data ?? []).find((item) => item.id === c.tutor_id);
  const roster = (enrolments.data ?? []).filter((item) => item.class_id === c.id);
  const activeRoster = roster.filter((item) => item.status === "active");
  const classSessions = (sessions.data ?? []).filter((item) => item.class_id === c.id);
  const sessionIds = new Set(classSessions.map((item) => item.id));
  const classAttendance = (attendance.data ?? []).filter((item) => sessionIds.has(item.session_id));
  const classReviews = (reviews.data ?? []).filter((item) => sessionIds.has(item.session_id));
  const classSubscriptions = (subscriptions.data ?? []).filter((item) => item.class_id === c.id);
  const subscriptionIds = new Set(classSubscriptions.map((item) => item.id));
  const classPayments = (payments.data ?? []).filter(
    (item) => item.subscription_id && subscriptionIds.has(item.subscription_id),
  );
  const received = classPayments
    .filter((item) => item.status === "received")
    .reduce((total, item) => total + Number(item.amount), 0);
  const notEnrolled = (students.data ?? []).filter(
    (student) =>
      student.status === "active" && !activeRoster.some((item) => item.student_id === student.id),
  );
  const studentSchools = Array.from(
    new Set(
      notEnrolled
        .map((student) => student.school)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort();
  const studentYears = Array.from(
    new Set(
      notEnrolled
        .map((student) => student.year_group)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort();
  const filteredStudents = notEnrolled.filter((student) => {
    const query = studentSearch.trim().toLowerCase();
    const haystack = [fullName(student), student.email, student.school, student.year_group]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (studentSchool === "all" || student.school === studentSchool) &&
      (studentYear === "all" || student.year_group === studentYear)
    );
  });
  const nextSession = [...classSessions]
    .filter((item) => !["completed", "cancelled"].includes(item.status))
    .sort((a, b) => a.session_date.localeCompare(b.session_date))[0];

  const classLabel = (item: typeof c) => {
    const classSite = (sites.data ?? []).find((value) => value.id === item.site_id);
    return `${item.name} · ${classSite?.name ?? "Venue TBC"} · ${item.weekday ?? "Day TBC"} ${hhmm(item.start_time)}–${hhmm(item.end_time)}`;
  };
  const filteredLessons = visibleClasses.filter((lesson) => {
    const query = lessonSearch.trim().toLowerCase();
    return !query || classLabel(lesson).toLowerCase().includes(query);
  });
  const parentFor = (studentIdValue: string) => {
    const links = (parentStudents.data ?? []).filter((item) => item.student_id === studentIdValue);
    const link = links.find((item) => item.is_primary) ?? links[0];
    return (parents.data ?? []).find((item) => item.id === link?.parent_id);
  };
  const attendanceFor = (studentIdValue: string) => {
    const records = classAttendance.filter((item) => item.student_id === studentIdValue);
    const attended = records.filter(
      (item) => item.status === "present" || item.status === "late",
    ).length;
    return {
      attended,
      total: records.length,
      rate: records.length ? Math.round((attended / records.length) * 100) : null,
    };
  };
  const openEdit = () => {
    setEdit({
      name: c.name,
      start_date: c.start_date ?? DEMO_DATE,
      start_time: hhmm(c.start_time),
      end_time: hhmm(c.end_time),
      recurrence: c.recurrence ?? "weekly",
      end_date: c.end_date ?? "",
      tutor_id: c.tutor_id ?? "",
      room: c.room ?? "",
      active: c.active ? "active" : "archived",
      notes: c.notes ?? "",
      goprogress_course_url: c.goprogress_course_url ?? "",
    });
    setEditOpen(true);
  };

  return (
    <Page className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild size="icon" variant="ghost" aria-label="Back to schedule">
            <Link to="/admin/classes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Lesson
            </p>
            <h1 className="truncate text-base font-extrabold sm:text-xl">{c.name}</h1>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setLessonSearch("");
              setLessonPickerOpen(true);
            }}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Change lesson</span>
          </Button>
          <Button size="icon" onClick={openEdit} aria-label="Edit lesson">
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={c.active ? "green" : "neutral"}>
                  {c.active ? "Active" : "Archived"}
                </Pill>
                {c.level ? <Pill>{c.level}</Pill> : null}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {site?.name ?? "Venue to confirm"} · {c.weekday ?? "Day to confirm"}{" "}
                {hhmm(c.start_time)}–{hhmm(c.end_time)}
                {c.room ? ` · ${c.room}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Avatar
                initials={initialsOf(fullName(tutor))}
                tone={avatarTone(fullName(tutor))}
                size="lg"
              />
              <div>
                <p className="text-sm font-bold">
                  {tutor ? fullName(tutor) : "Tutor not assigned"}
                </p>
                <p className="text-xs text-muted-foreground">Tutor</p>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 divide-x divide-y divide-border border-t border-border sm:grid-cols-4 sm:divide-y-0">
            {[
              ["Students", `${activeRoster.length}/${c.capacity}`],
              ["Spaces", String(Math.max(c.capacity - activeRoster.length, 0))],
              ["Lessons held", String(classSessions.length)],
              ["Per lesson", money(c.price_per_session)],
            ].map(([label, value]) => (
              <div key={label} className="px-3 py-4 text-center">
                <p className="text-xl font-extrabold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto border-t border-border px-3">
          <div className="flex min-w-max gap-1">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`border-b-2 px-3 py-3 text-sm font-semibold ${tab === item ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      {tab === "Overview" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
            <h2 className="text-lg font-bold">Lesson overview</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <Info label="Subject" value={c.subject ?? "Not set"} />
              <Info label="Age group" value={c.age_group ?? "Not set"} />
              <Info label="Delivery" value={c.delivery_mode.replace("_", " ")} />
              <Info label="Tutor pay" value={money(c.session_rate)} />
            </dl>
          </section>
          <aside className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-bold">Next lesson</h2>
            {nextSession ? (
              <>
                <p className="mt-3 text-sm font-bold">{prettyDate(nextSession.session_date)}</p>
                <p className="text-sm text-muted-foreground">
                  {hhmm(nextSession.start_time)}–{hhmm(nextSession.end_time)}
                </p>
                <Button className="mt-4 w-full" onClick={() => setTab("Students")}>
                  View students
                </Button>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No upcoming lesson.</p>
            )}
            <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
              {Math.max(c.capacity - activeRoster.length, 0)} spaces available
            </p>
          </aside>
        </div>
      ) : null}

      {tab === "Students" ? (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Students ({activeRoster.length})</h2>
              <p className="text-xs text-muted-foreground">Current and previous enrolments</p>
            </div>
            <Button
              onClick={() => {
                setSelectedStudentIds([]);
                setStudentSearch("");
                setStudentSchool("all");
                setStudentYear("all");
                setEnrolOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add students
            </Button>
          </div>
          {roster.length === 0 ? (
            <div className="mt-4">
              <Empty>No students enrolled yet.</Empty>
            </div>
          ) : (
            <div className="mt-4">
              <div className="space-y-3 md:hidden">
                {roster.map((item) => {
                  const student = (students.data ?? []).find(
                    (value) => value.id === item.student_id,
                  );
                  const studentAttendance = attendanceFor(item.student_id);
                  return (
                    <article key={item.id} className="rounded-2xl border border-border p-3">
                      <div className="flex items-start gap-3">
                        <Avatar
                          initials={initialsOf(fullName(student))}
                          tone={avatarTone(fullName(student))}
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/admin/students/$id"
                            params={{ id: item.student_id }}
                            className="block truncate text-sm font-bold hover:text-primary"
                          >
                            {fullName(student)}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {[student?.year_group, fullName(parentFor(item.student_id))]
                              .filter((value) => value && value !== "—")
                              .join(" · ") || "No additional details"}
                          </p>
                        </div>
                        <Pill tone={item.status === "active" ? "green" : "neutral"}>
                          {item.status}
                        </Pill>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground">
                            Attendance
                          </p>
                          <p className="text-sm font-bold">
                            {studentAttendance.rate === null
                              ? "Not recorded yet"
                              : `${studentAttendance.attended}/${studentAttendance.total} lessons (${studentAttendance.rate}%)`}
                          </p>
                        </div>
                        {item.status === "active" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              updateEnrolment.mutate(
                                { id: item.id, values: { status: "left" } },
                                { onSuccess: () => toast.success("Student removed from lesson") },
                              )
                            }
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="border-b border-border text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-3">Student</th>
                      <th className="px-3 py-3">Year</th>
                      <th className="px-3 py-3">Parent</th>
                      <th className="px-3 py-3">Attendance</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {roster.map((item) => {
                      const student = (students.data ?? []).find(
                        (value) => value.id === item.student_id,
                      );
                      const studentAttendance = attendanceFor(item.student_id);
                      return (
                        <tr key={item.id}>
                          <td className="px-3 py-3">
                            <span className="flex items-center gap-2">
                              <Avatar
                                initials={initialsOf(fullName(student))}
                                tone={avatarTone(fullName(student))}
                                size="sm"
                              />
                              <Link
                                to="/admin/students/$id"
                                params={{ id: item.student_id }}
                                className="font-bold hover:text-primary"
                              >
                                {fullName(student)}
                              </Link>
                            </span>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {student?.year_group ?? "—"}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            {fullName(parentFor(item.student_id))}
                          </td>
                          <td className="px-3 py-3 font-semibold">
                            {studentAttendance.rate === null
                              ? "Not recorded yet"
                              : `${studentAttendance.attended}/${studentAttendance.total} attended (${studentAttendance.rate}%)`}
                          </td>
                          <td className="px-3 py-3">
                            <Pill tone={item.status === "active" ? "green" : "neutral"}>
                              {item.status}
                            </Pill>
                          </td>
                          <td className="px-3 py-3 text-right">
                            {item.status === "active" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  updateEnrolment.mutate(
                                    { id: item.id, values: { status: "left" } },
                                    {
                                      onSuccess: () => toast.success("Student removed from lesson"),
                                    },
                                  )
                                }
                              >
                                Remove
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {tab === "Lesson Reviews" ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">Lesson Reviews</h2>
          {classReviews.length === 0 ? (
            <div className="mt-4">
              <Empty>No lesson reviews submitted.</Empty>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {classReviews.map((review) => {
                const session = classSessions.find((item) => item.id === review.session_id);
                const reviewTutor = (tutors.data ?? []).find((item) => item.id === review.tutor_id);
                return (
                  <article key={review.id} className="py-4">
                    <div className="flex justify-between gap-2">
                      <p className="font-bold">
                        {session ? prettyDate(session.session_date) : "Lesson"}
                      </p>
                      <p className="text-xs text-muted-foreground">{fullName(reviewTutor)}</p>
                    </div>
                    {review.covered ? (
                      <p className="mt-2 text-sm">
                        <strong>Covered:</strong> {review.covered}
                      </p>
                    ) : null}
                    {review.progress_note ? (
                      <p className="mt-1 text-sm text-muted-foreground">{review.progress_note}</p>
                    ) : null}
                    {review.next_steps ? (
                      <p className="mt-1 text-sm">
                        <strong>Next:</strong> {review.next_steps}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {tab === "Payments" ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">Lesson payments</h2>
              <p className="text-xs text-muted-foreground">
                Subscriptions and payments linked to this lesson
              </p>
            </div>
            <p className="text-2xl font-extrabold text-primary">{money(received)} received</p>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold">Subscriptions</h3>
              {classSubscriptions.map((item) => (
                <div
                  key={item.id}
                  className="mt-2 flex justify-between border-b border-border py-2 text-sm"
                >
                  <span>
                    {item.plan_name ?? "Class plan"} · {item.cadence}
                  </span>
                  <b>{money(item.amount)}</b>
                </div>
              ))}
            </div>
            <div>
              <h3 className="text-sm font-bold">Recent payments</h3>
              {classPayments.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="mt-2 flex justify-between border-b border-border py-2 text-sm"
                >
                  <span>{prettyDate(item.payment_date)}</span>
                  <b>
                    {money(item.amount)} · {item.status}
                  </b>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "GoProgress" ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">GoProgress</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect this class to its course, students and lesson records.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Pill tone={c.goprogress_course_url ? "green" : "amber"}>
              {c.goprogress_course_url ? "Connected" : "Not connected"}
            </Pill>
            <GoProgressLink label={c.goprogress_course_url ? "Open course" : "GoProgress"} />
            <Button variant="secondary" onClick={openEdit}>
              Edit connection
            </Button>
          </div>
        </section>
      ) : null}

      {tab === "Notes" ? (
        <Notes
          initial={c.notes ?? ""}
          save={async (notes) => {
            await updateClass.mutateAsync({ id: c.id, values: { notes } });
          }}
        />
      ) : null}

      <Dialog open={lessonPickerOpen} onOpenChange={setLessonPickerOpen}>
        <DialogContent className="flex max-h-[82vh] flex-col p-0 sm:max-w-xl">
          <DialogHeader className="px-5 pt-5 text-left">
            <DialogTitle>Change lesson</DialogTitle>
            <DialogDescription>Search and choose another lesson.</DialogDescription>
          </DialogHeader>
          <div className="relative px-5">
            <Search className="absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={lessonSearch}
              onChange={(event) => setLessonSearch(event.target.value)}
              placeholder="Search lesson, venue, day or time"
              className="h-11 rounded-xl pl-10"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            <div className="mt-3 divide-y divide-border rounded-xl border border-border">
              {filteredLessons.map((lesson) => (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => {
                    setLessonPickerOpen(false);
                    navigate({ to: "/admin/classes/$id", params: { id: lesson.id } });
                  }}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{lesson.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {classLabel(lesson)}
                    </span>
                  </span>
                  {lesson.id === c.id ? <Check className="h-4 w-4 text-primary" /> : null}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={enrolOpen} onOpenChange={setEnrolOpen}>
        <DialogContent className="flex max-h-[88vh] flex-col p-0 sm:max-w-2xl">
          <DialogHeader className="px-5 pt-5 text-left">
            <DialogTitle>Add students</DialogTitle>
            <DialogDescription>
              Search, filter and select several students for this lesson.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 px-5 sm:grid-cols-2">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Search name, email, school or year"
                className="h-11 rounded-xl pl-10"
              />
            </div>
            <SelectField
              label="School"
              value={studentSchool}
              onChange={setStudentSchool}
              options={[
                { value: "all", label: "All schools" },
                ...studentSchools.map((school) => ({ value: school, label: school })),
              ]}
            />
            <SelectField
              label="Year group"
              value={studentYear}
              onChange={setStudentYear}
              options={[
                { value: "all", label: "All year groups" },
                ...studentYears.map((year) => ({ value: year, label: year })),
              ]}
            />
          </div>
          <div className="flex items-center justify-between border-y border-border px-5 py-3 text-sm">
            <span className="font-semibold">{selectedStudentIds.length} selected</span>
            <button
              type="button"
              className="font-bold text-primary"
              onClick={() => {
                const visibleIds = filteredStudents.map((student) => student.id);
                const allVisibleSelected =
                  visibleIds.length > 0 &&
                  visibleIds.every((studentId) => selectedStudentIds.includes(studentId));
                setSelectedStudentIds(
                  allVisibleSelected
                    ? selectedStudentIds.filter((studentId) => !visibleIds.includes(studentId))
                    : Array.from(new Set([...selectedStudentIds, ...visibleIds])),
                );
              }}
            >
              {filteredStudents.length > 0 &&
              filteredStudents.every((student) => selectedStudentIds.includes(student.id))
                ? "Clear visible"
                : "Select all visible"}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5">
            {filteredStudents.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No students match these filters.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {filteredStudents.map((student) => {
                  const selected = selectedStudentIds.includes(student.id);
                  return (
                    <li key={student.id}>
                      <label className="flex cursor-pointer items-center gap-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            setSelectedStudentIds(
                              selected
                                ? selectedStudentIds.filter((studentId) => studentId !== student.id)
                                : [...selectedStudentIds, student.id],
                            )
                          }
                          className="h-5 w-5 shrink-0 accent-[var(--color-primary)]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">
                            {fullName(student)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[student.year_group, student.school, student.email]
                              .filter(Boolean)
                              .join(" · ") || "No extra details"}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <DialogFooter className="border-t border-border p-4 sm:space-x-2">
            <Button type="button" variant="ghost" onClick={() => setEnrolOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                selectedStudentIds.length === 0 ||
                addEnrolment.isPending ||
                updateEnrolment.isPending
              }
              onClick={async () => {
                try {
                  const previous = roster.filter((item) =>
                    selectedStudentIds.includes(item.student_id),
                  );
                  const previousIds = new Set(previous.map((item) => item.student_id));
                  await Promise.all(
                    previous.map((item) =>
                      updateEnrolment.mutateAsync({
                        id: item.id,
                        values: { status: "active", end_date: null },
                      }),
                    ),
                  );
                  const fresh = selectedStudentIds.filter(
                    (studentId) => !previousIds.has(studentId),
                  );
                  if (fresh.length > 0)
                    await addEnrolment.mutateAsync(
                      fresh.map((studentId) => ({
                        class_id: c.id,
                        student_id: studentId,
                        status: "active",
                      })),
                    );
                  toast.success(
                    `${selectedStudentIds.length} student${selectedStudentIds.length === 1 ? "" : "s"} added`,
                  );
                  setSelectedStudentIds([]);
                  setEnrolOpen(false);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not add students");
                }
              }}
            >
              {addEnrolment.isPending || updateEnrolment.isPending
                ? "Adding…"
                : `Add ${selectedStudentIds.length || ""} student${selectedStudentIds.length === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <FormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        wide
        title="Edit lesson"
        busy={updateClass.isPending}
        onSubmit={async () => {
          await updateClass.mutateAsync({
            id: c.id,
            values: {
              name: edit.name,
              start_date: edit.start_date,
              weekday: weekdayOf(edit.start_date),
              start_time: edit.start_time,
              end_time: edit.end_time,
              recurrence: edit.recurrence,
              end_date: edit.recurrence === "once" ? edit.start_date : edit.end_date || null,
              tutor_id: edit.tutor_id || null,
              room: edit.room || null,
              active: edit.active === "active",
              notes: edit.notes || null,
              goprogress_course_url: edit.goprogress_course_url || null,
            },
          });
          toast.success("Lesson updated");
          setEditOpen(false);
        }}
      >
        <TextField
          full
          required
          label="Lesson name"
          value={edit.name}
          onChange={(name) => setEdit({ ...edit, name })}
        />
        <TextField
          label="Start date"
          type="date"
          value={edit.start_date}
          onChange={(start_date) => setEdit({ ...edit, start_date })}
        />
        <SelectField
          label="Repeats"
          value={edit.recurrence}
          onChange={(recurrence) => setEdit({ ...edit, recurrence })}
          options={[
            { value: "once", label: "Does not repeat" },
            { value: "weekly", label: "Every week" },
          ]}
        />
        <TextField
          label="Start time"
          type="time"
          value={edit.start_time}
          onChange={(start_time) => setEdit({ ...edit, start_time })}
        />
        <TextField
          label="End time"
          type="time"
          value={edit.end_time}
          onChange={(end_time) => setEdit({ ...edit, end_time })}
        />
        {edit.recurrence === "weekly" ? (
          <TextField
            label="Repeat until"
            type="date"
            value={edit.end_date}
            onChange={(end_date) => setEdit({ ...edit, end_date })}
          />
        ) : null}
        <SelectField
          label="Tutor"
          value={edit.tutor_id}
          onChange={(tutor_id) => setEdit({ ...edit, tutor_id })}
          options={[
            { value: "", label: "Not assigned" },
            ...(tutors.data ?? []).map((item) => ({ value: item.id, label: fullName(item) })),
          ]}
        />
        <TextField label="Room" value={edit.room} onChange={(room) => setEdit({ ...edit, room })} />
        <SelectField
          label="Status"
          value={edit.active}
          onChange={(activeValue) => setEdit({ ...edit, active: activeValue })}
          options={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ]}
        />
        <TextField
          label="GoProgress course URL"
          value={edit.goprogress_course_url}
          onChange={(goprogress_course_url) => setEdit({ ...edit, goprogress_course_url })}
        />
        <TextAreaField
          label="Notes"
          value={edit.notes}
          onChange={(notes) => setEdit({ ...edit, notes })}
        />
        <div className="border-t border-border pt-4 sm:col-span-2">
          <Button
            type="button"
            variant="destructive"
            disabled={deleteClass.isPending}
            onClick={async () => {
              if (
                !window.confirm(
                  "Delete this lesson permanently? Its enrolments, registers and linked lesson records will also be removed.",
                )
              )
                return;
              try {
                await deleteClass.mutateAsync(c.id);
                toast.success("Lesson deleted");
                setEditOpen(false);
                navigate({ to: "/admin/classes" });
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not delete the lesson");
              }
            }}
          >
            {deleteClass.isPending ? "Deleting…" : "Delete lesson"}
          </Button>
        </div>
      </FormDialog>
    </Page>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold capitalize">{value}</dd>
    </div>
  );
}

function Notes({ initial, save }: { initial: string; save: (notes: string) => Promise<void> }) {
  const [value, setValue] = useState(initial);
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">Lesson notes</h2>
      <div className="mt-4">
        <TextAreaField label="Internal notes" value={value} onChange={setValue} />
      </div>
      <Button
        className="mt-4"
        onClick={async () => {
          await save(value);
          toast.success("Notes saved");
        }}
      >
        Save notes
      </Button>
    </section>
  );
}
