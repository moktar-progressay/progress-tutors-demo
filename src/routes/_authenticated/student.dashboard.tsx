import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { ActingPicker } from "@/components/acting-picker";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { useActingId } from "@/lib/acting";
import { DEMO_DATE, fullName, hhmm, prettyDate, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/student/dashboard")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — ProgressTutors" },
      { name: "description", content: "Your next lessons, homework, attendance streak and reward points." },
      { property: "og:title", content: "Student Dashboard — ProgressTutors" },
      { property: "og:description", content: "Student view of lessons, homework and rewards." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentDashboard,
});

function StudentDashboard() {
  const [studentId, setStudentId] = useActingId("student");
  const students = useTable("students", "first_name");
  const enrolments = useTable("class_enrolments");
  const classes = useTable("classes");
  const sessions = useTable("sessions", "session_date");
  const homework = useTable("homework_items");
  const attendance = useTable("student_attendance");

  const me = (students.data ?? []).find((s) => s.id === studentId);
  const myClassIds = (enrolments.data ?? [])
    .filter((e) => e.student_id === studentId && e.status === "active")
    .map((e) => e.class_id);
  const upcoming = (sessions.data ?? []).filter(
    (s) => s.class_id && myClassIds.includes(s.class_id) && s.session_date >= DEMO_DATE,
  );
  const hw = (homework.data ?? []).filter((h) => h.student_id === studentId);
  const done = hw.filter((h) => h.status === "complete").length;
  const marks = (attendance.data ?? []).filter((a) => a.student_id === studentId);
  const present = marks.filter((m) => m.status === "present" || m.status === "late").length;
  const xp = present * 50 + done * 25;

  return (
    <Page>
      <PageHeader title={me ? `Hi, ${me.first_name}` : "Student"} subtitle="Shared operational demo · Live data" />

      <ActingPicker
        label="I am"
        value={studentId}
        onChange={setStudentId}
        options={(students.data ?? []).map((s) => ({ value: s.id, label: fullName(s) }))}
      />

      {!studentId ? (
        <Section id="student-pick" title="Choose your name">
          <Empty>Pick your name above to see your lessons and homework.</Empty>
        </Section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="XP" value={String(xp)} hint="50 per lesson attended, 25 per homework" tone="purple" />
            <StatCard label="Lessons attended" value={String(present)} tone="green" />
            <StatCard label="Homework done" value={`${done}/${hw.length}`} tone="amber" />
            <StatCard label="Classes" value={String(myClassIds.length)} tone="pink" />
          </div>

          <Section id="student-next" title="Next lessons">
            {upcoming.length === 0 ? (
              <Empty>No lessons scheduled yet.</Empty>
            ) : (
              <ul className="space-y-2">
                {upcoming.slice(0, 6).map((s) => {
                  const c = (classes.data ?? []).find((x) => x.id === s.class_id);
                  return (
                    <li key={s.id} className="rounded-xl border border-border px-4 py-3">
                      <p className="text-sm font-bold">{c?.name ?? "Lesson"}</p>
                      <p className="text-xs text-muted-foreground">
                        {prettyDate(s.session_date)} · {hhmm(s.start_time)}–{hhmm(s.end_time)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link to="/student/lessons" className="mt-3 inline-block text-sm font-bold text-primary">
              All my lessons →
            </Link>
          </Section>

          <Section id="student-hw" title="Homework">
            {hw.length === 0 ? (
              <Empty>Nothing set yet.</Empty>
            ) : (
              <ul className="space-y-2">
                {hw.slice(0, 5).map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-2">
                    <span className="min-w-0 flex-1 text-sm font-semibold">{h.title}</span>
                    <Pill tone={h.status === "complete" ? "green" : "amber"}>{h.status}</Pill>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/student/homework" className="mt-3 inline-block text-sm font-bold text-primary">
              Open homework →
            </Link>
          </Section>
        </>
      )}
    </Page>
  );
}
