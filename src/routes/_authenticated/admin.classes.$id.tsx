import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Empty, GoProgressLink, PageHeader, Pill } from "@/components/kit";
import { FormDialog, SelectField, TextAreaField, TextField } from "@/components/form-kit";
import { SessionRegister } from "@/components/session-register";
import { Button } from "@/components/ui/button";
import { DEMO_DATE, fullName, hhmm, initialsOf, money, prettyDate, useTable, useUpdateRow, useUpsert } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/classes/$id")({
  head: () => ({ meta: [{ title: "Class profile — ProgressTutors" }, { name: "robots", content: "noindex" }] }),
  component: ClassProfile,
});

const TABS = ["Overview", "Students", "Sessions", "Attendance", "Lesson Reviews", "Payments", "GoProgress", "Notes"] as const;
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
  const addEnrolment = useUpsert("class_enrolments");
  const updateEnrolment = useUpdateRow("class_enrolments");
  const addSession = useUpsert("sessions");

  const [tab, setTab] = useState<Tab>("Students");
  const [siteFilter, setSiteFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [enrolOpen, setEnrolOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionDate, setSessionDate] = useState(DEMO_DATE);
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState({ name: "", tutor_id: "", room: "", active: "active", notes: "", goprogress_course_url: "" });

  const rows = useMemo(() => classes.data ?? [], [classes.data]);
  const c = rows.find((item) => item.id === id);
  const subjects = useMemo(() => Array.from(new Set(rows.map((item) => item.subject).filter((v): v is string => Boolean(v)))).sort(), [rows]);
  const visibleClasses = rows.filter((item) =>
    (siteFilter === "all" || item.site_id === siteFilter) &&
    (subjectFilter === "all" || item.subject === subjectFilter) &&
    (statusFilter === "all" || (statusFilter === "active" ? item.active : !item.active)),
  );

  if (classes.isLoading) return <Page><p className="py-12 text-center text-muted-foreground">Loading class profile…</p></Page>;
  if (!c) return <Page><PageHeader title="Class not found" subtitle="It may have been removed." /><Link to="/admin/classes" className="text-sm font-bold text-primary">Back to classes</Link></Page>;

  const site = (sites.data ?? []).find((item) => item.id === c.site_id);
  const tutor = (tutors.data ?? []).find((item) => item.id === c.tutor_id);
  const roster = (enrolments.data ?? []).filter((item) => item.class_id === c.id);
  const activeRoster = roster.filter((item) => item.status === "active");
  const classSessions = (sessions.data ?? []).filter((item) => item.class_id === c.id);
  const sessionIds = new Set(classSessions.map((item) => item.id));
  const classAttendance = (attendance.data ?? []).filter((item) => sessionIds.has(item.session_id));
  const present = classAttendance.filter((item) => item.status === "present" || item.status === "late").length;
  const attendanceRate = classAttendance.length ? Math.round((present / classAttendance.length) * 100) : null;
  const classReviews = (reviews.data ?? []).filter((item) => sessionIds.has(item.session_id));
  const classSubscriptions = (subscriptions.data ?? []).filter((item) => item.class_id === c.id);
  const subscriptionIds = new Set(classSubscriptions.map((item) => item.id));
  const classPayments = (payments.data ?? []).filter((item) => item.subscription_id && subscriptionIds.has(item.subscription_id));
  const received = classPayments.filter((item) => item.status === "received").reduce((total, item) => total + Number(item.amount), 0);
  const notEnrolled = (students.data ?? []).filter((student) => student.status === "active" && !activeRoster.some((item) => item.student_id === student.id));
  const nextSession = [...classSessions].filter((item) => !["completed", "cancelled"].includes(item.status)).sort((a, b) => a.session_date.localeCompare(b.session_date))[0];

  const classLabel = (item: typeof c) => {
    const classSite = (sites.data ?? []).find((value) => value.id === item.site_id);
    return `${item.name} · ${classSite?.name ?? "Venue TBC"} · ${item.weekday ?? "Day TBC"} ${hhmm(item.start_time)}–${hhmm(item.end_time)}`;
  };
  const parentFor = (studentIdValue: string) => {
    const links = (parentStudents.data ?? []).filter((item) => item.student_id === studentIdValue);
    const link = links.find((item) => item.is_primary) ?? links[0];
    return (parents.data ?? []).find((item) => item.id === link?.parent_id);
  };
  const rateFor = (studentIdValue: string) => {
    const records = classAttendance.filter((item) => item.student_id === studentIdValue);
    return records.length ? Math.round((records.filter((item) => item.status === "present" || item.status === "late").length / records.length) * 100) : null;
  };
  const openEdit = () => {
    setEdit({ name: c.name, tutor_id: c.tutor_id ?? "", room: c.room ?? "", active: c.active ? "active" : "archived", notes: c.notes ?? "", goprogress_course_url: c.goprogress_course_url ?? "" });
    setEditOpen(true);
  };

  return (
    <Page className="space-y-5">
      <PageHeader breadcrumb={<Link to="/admin/classes" className="hover:text-primary">Classes</Link>} title="Class profile" subtitle="Manage one class without losing your place" actions={<Button onClick={openEdit}>Edit class</Button>} />

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 lg:grid-cols-[minmax(18rem,2fr)_1fr_1fr_1fr_auto]">
        <SelectField label="Viewing class" value={c.id} onChange={(classId) => navigate({ to: "/admin/classes/$id", params: { id: classId } })} options={(visibleClasses.some((item) => item.id === c.id) ? visibleClasses : [c, ...visibleClasses]).map((item) => ({ value: item.id, label: classLabel(item) }))} />
        <SelectField label="Site" value={siteFilter} onChange={setSiteFilter} options={[{ value: "all", label: "All sites" }, ...(sites.data ?? []).map((item) => ({ value: item.id, label: item.name }))]} />
        <SelectField label="Subject" value={subjectFilter} onChange={setSubjectFilter} options={[{ value: "all", label: "All subjects" }, ...subjects.map((subject) => ({ value: subject, label: subject }))]} />
        <SelectField label="Status" value={statusFilter} onChange={setStatusFilter} options={[{ value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "archived", label: "Archived" }]} />
        <Button variant="secondary" className="self-end" onClick={() => navigate({ to: "/admin/classes" })}>All classes</Button>
      </div>

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-extrabold sm:text-3xl">{c.name}</h1><Pill tone={c.active ? "green" : "neutral"}>{c.active ? "Active" : "Archived"}</Pill>{c.level ? <Pill>{c.level}</Pill> : null}</div>
              <p className="mt-3 text-sm text-muted-foreground">{site?.name ?? "Venue to confirm"} · {c.weekday ?? "Day to confirm"} {hhmm(c.start_time)}–{hhmm(c.end_time)}{c.room ? ` · ${c.room}` : ""}</p>
            </div>
            <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-tile-pink text-sm font-bold text-tile-pink-ink">{initialsOf(fullName(tutor))}</span><div><p className="text-sm font-bold">{tutor ? fullName(tutor) : "Tutor not assigned"}</p><p className="text-xs text-muted-foreground">Tutor</p></div></div>
          </div>
          <div className="mt-6 grid grid-cols-2 divide-x divide-y divide-border border-t border-border sm:grid-cols-4 sm:divide-y-0">
            {[["Students", `${activeRoster.length}/${c.capacity}`], ["Attendance", attendanceRate === null ? "No data" : `${attendanceRate}%`], ["Sessions", String(classSessions.length)], ["Per session", money(c.price_per_session)]].map(([label, value]) => <div key={label} className="px-3 py-4 text-center"><p className="text-xl font-extrabold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}
          </div>
        </div>
        <div className="overflow-x-auto border-t border-border px-3"><div className="flex min-w-max gap-1">{TABS.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`border-b-2 px-3 py-3 text-sm font-semibold ${tab === item ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{item}</button>)}</div></div>
      </section>

      {tab === "Overview" ? <div className="grid gap-4 lg:grid-cols-3"><section className="rounded-2xl border border-border bg-card p-5 lg:col-span-2"><h2 className="text-lg font-bold">Class overview</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2"><Info label="Subject" value={c.subject ?? "Not set"} /><Info label="Age group" value={c.age_group ?? "Not set"} /><Info label="Delivery" value={c.delivery_mode.replace("_", " ")} /><Info label="Tutor pay" value={money(c.session_rate)} /></dl></section><aside className="rounded-2xl border border-border bg-card p-5"><h2 className="font-bold">Next session</h2>{nextSession ? <><p className="mt-3 text-sm font-bold">{prettyDate(nextSession.session_date)}</p><p className="text-sm text-muted-foreground">{hhmm(nextSession.start_time)}–{hhmm(nextSession.end_time)}</p><Button className="mt-4 w-full" onClick={() => setTab("Sessions")}>Start register</Button></> : <p className="mt-3 text-sm text-muted-foreground">No upcoming session.</p>}<p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">{Math.max(c.capacity - activeRoster.length, 0)} spaces available</p></aside></div> : null}

      {tab === "Students" ? <section className="rounded-2xl border border-border bg-card p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Students ({activeRoster.length})</h2><p className="text-xs text-muted-foreground">Current and previous enrolments</p></div><Button onClick={() => setEnrolOpen(true)}>Enrol student</Button></div>{roster.length === 0 ? <div className="mt-4"><Empty>No students enrolled yet.</Empty></div> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="px-3 py-3">Student</th><th className="px-3 py-3">Year</th><th className="px-3 py-3">Parent</th><th className="px-3 py-3">Attendance</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-border">{roster.map((item) => { const student = (students.data ?? []).find((value) => value.id === item.student_id); const rate = rateFor(item.student_id); return <tr key={item.id}><td className="px-3 py-3"><Link to="/admin/students/$id" params={{ id: item.student_id }} className="font-bold hover:text-primary">{fullName(student)}</Link></td><td className="px-3 py-3 text-muted-foreground">{student?.year_group ?? "—"}</td><td className="px-3 py-3 text-muted-foreground">{fullName(parentFor(item.student_id))}</td><td className="px-3 py-3 font-semibold">{rate === null ? "No data" : `${rate}%`}</td><td className="px-3 py-3"><Pill tone={item.status === "active" ? "green" : "neutral"}>{item.status}</Pill></td><td className="px-3 py-3 text-right">{item.status === "active" ? <Button size="sm" variant="ghost" onClick={() => updateEnrolment.mutate({ id: item.id, values: { status: "left" } }, { onSuccess: () => toast.success("Student removed from class") })}>Remove</Button> : null}</td></tr>; })}</tbody></table></div>}</section> : null}

      {tab === "Sessions" ? <section className="rounded-2xl border border-border bg-card p-4 sm:p-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold">Sessions</h2><p className="text-xs text-muted-foreground">Registers and tutor sign-ins</p></div><Button onClick={() => setSessionOpen(true)}>Add session</Button></div>{classSessions.length === 0 ? <div className="mt-4"><Empty>No sessions yet.</Empty></div> : <div className="mt-4 space-y-4">{classSessions.map((item) => <div key={item.id} className="rounded-2xl border border-border p-4"><div className="mb-3 flex flex-wrap items-center gap-2"><p className="text-sm font-bold">{prettyDate(item.session_date)}</p><Pill tone={item.status === "completed" ? "green" : "blue"}>{item.status}</Pill><span className="text-xs text-muted-foreground">{hhmm(item.start_time)}–{hhmm(item.end_time)}</span></div><SessionRegister session={item} /></div>)}</div>}</section> : null}

      {tab === "Attendance" ? <section className="rounded-2xl border border-border bg-card p-5"><h2 className="text-lg font-bold">Attendance</h2><p className="text-xs text-muted-foreground">{classAttendance.length} records</p><div className="mt-4 divide-y divide-border">{activeRoster.map((item) => { const student = (students.data ?? []).find((value) => value.id === item.student_id); const rate = rateFor(item.student_id); return <div key={item.id} className="flex items-center justify-between gap-3 py-3"><span className="font-semibold">{fullName(student)}</span><Pill tone={rate === null ? "neutral" : rate >= 90 ? "green" : rate >= 75 ? "amber" : "pink"}>{rate === null ? "No data" : `${rate}%`}</Pill></div>; })}</div></section> : null}

      {tab === "Lesson Reviews" ? <section className="rounded-2xl border border-border bg-card p-5"><h2 className="text-lg font-bold">Lesson Reviews</h2>{classReviews.length === 0 ? <div className="mt-4"><Empty>No lesson reviews submitted.</Empty></div> : <div className="mt-4 divide-y divide-border">{classReviews.map((review) => { const session = classSessions.find((item) => item.id === review.session_id); const reviewTutor = (tutors.data ?? []).find((item) => item.id === review.tutor_id); return <article key={review.id} className="py-4"><div className="flex justify-between gap-2"><p className="font-bold">{session ? prettyDate(session.session_date) : "Session"}</p><p className="text-xs text-muted-foreground">{fullName(reviewTutor)}</p></div>{review.covered ? <p className="mt-2 text-sm"><strong>Covered:</strong> {review.covered}</p> : null}{review.progress_note ? <p className="mt-1 text-sm text-muted-foreground">{review.progress_note}</p> : null}{review.next_steps ? <p className="mt-1 text-sm"><strong>Next:</strong> {review.next_steps}</p> : null}</article>; })}</div>}</section> : null}

      {tab === "Payments" ? <section className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-lg font-bold">Class payments</h2><p className="text-xs text-muted-foreground">Subscriptions and payments linked to this class</p></div><p className="text-2xl font-extrabold text-primary">{money(received)} received</p></div><div className="mt-5 grid gap-4 lg:grid-cols-2"><div><h3 className="text-sm font-bold">Subscriptions</h3>{classSubscriptions.map((item) => <div key={item.id} className="mt-2 flex justify-between border-b border-border py-2 text-sm"><span>{item.plan_name ?? "Class plan"} · {item.cadence}</span><b>{money(item.amount)}</b></div>)}</div><div><h3 className="text-sm font-bold">Recent payments</h3>{classPayments.slice(0, 8).map((item) => <div key={item.id} className="mt-2 flex justify-between border-b border-border py-2 text-sm"><span>{prettyDate(item.payment_date)}</span><b>{money(item.amount)} · {item.status}</b></div>)}</div></div></section> : null}

      {tab === "GoProgress" ? <section className="rounded-2xl border border-border bg-card p-5"><h2 className="text-lg font-bold">GoProgress</h2><p className="mt-2 text-sm text-muted-foreground">Connect this class to its course, students and lesson records.</p><div className="mt-4 flex flex-wrap items-center gap-3"><Pill tone={c.goprogress_course_url ? "green" : "amber"}>{c.goprogress_course_url ? "Connected" : "Not connected"}</Pill><GoProgressLink label={c.goprogress_course_url ? "Open course" : "GoProgress"} /><Button variant="secondary" onClick={openEdit}>Edit connection</Button></div></section> : null}

      {tab === "Notes" ? <Notes initial={c.notes ?? ""} save={(notes) => updateClass.mutateAsync({ id: c.id, values: { notes } })} /> : null}

      <FormDialog open={enrolOpen} onOpenChange={setEnrolOpen} title="Enrol a student" busy={addEnrolment.isPending} onSubmit={async () => { if (!studentId) return; await addEnrolment.mutateAsync({ class_id: c.id, student_id: studentId, status: "active" }); toast.success("Student enrolled"); setStudentId(""); setEnrolOpen(false); }}><SelectField full label="Student" value={studentId} onChange={setStudentId} options={[{ value: "", label: "Choose a student" }, ...notEnrolled.map((student) => ({ value: student.id, label: fullName(student) }))]} /></FormDialog>
      <FormDialog open={sessionOpen} onOpenChange={setSessionOpen} title="Add a session" busy={addSession.isPending} onSubmit={async () => { await addSession.mutateAsync({ class_id: c.id, site_id: c.site_id, schedule_block_id: c.schedule_block_id, tutor_id: c.tutor_id, session_date: sessionDate, start_time: c.start_time, end_time: c.end_time, status: "scheduled", agreed_amount: c.session_rate }); toast.success("Session added"); setSessionOpen(false); setTab("Sessions"); }}><TextField full label="Date" type="date" value={sessionDate} onChange={setSessionDate} /></FormDialog>
      <FormDialog open={editOpen} onOpenChange={setEditOpen} wide title="Edit class" busy={updateClass.isPending} onSubmit={async () => { await updateClass.mutateAsync({ id: c.id, values: { name: edit.name, tutor_id: edit.tutor_id || null, room: edit.room || null, active: edit.active === "active", notes: edit.notes || null, goprogress_course_url: edit.goprogress_course_url || null } }); toast.success("Class updated"); setEditOpen(false); }}><TextField full required label="Class name" value={edit.name} onChange={(name) => setEdit({ ...edit, name })} /><SelectField label="Tutor" value={edit.tutor_id} onChange={(tutor_id) => setEdit({ ...edit, tutor_id })} options={[{ value: "", label: "Not assigned" }, ...(tutors.data ?? []).map((item) => ({ value: item.id, label: fullName(item) }))]} /><TextField label="Room" value={edit.room} onChange={(room) => setEdit({ ...edit, room })} /><SelectField label="Status" value={edit.active} onChange={(activeValue) => setEdit({ ...edit, active: activeValue })} options={[{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }]} /><TextField label="GoProgress course URL" value={edit.goprogress_course_url} onChange={(goprogress_course_url) => setEdit({ ...edit, goprogress_course_url })} /><TextAreaField label="Notes" value={edit.notes} onChange={(notes) => setEdit({ ...edit, notes })} /></FormDialog>
    </Page>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-semibold capitalize">{value}</dd></div>;
}

function Notes({ initial, save }: { initial: string; save: (notes: string) => Promise<void> }) {
  const [value, setValue] = useState(initial);
  return <section className="rounded-2xl border border-border bg-card p-5"><h2 className="text-lg font-bold">Class notes</h2><div className="mt-4"><TextAreaField label="Internal notes" value={value} onChange={setValue} /></div><Button className="mt-4" onClick={async () => { await save(value); toast.success("Notes saved"); }}>Save notes</Button></section>;
}
