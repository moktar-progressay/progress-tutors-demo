import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { Empty, GoProgressLink, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { fullName, hhmm, prettyDate, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/parent/children/$id")({
  head: () => ({
    meta: [
      { title: "My Child — ProgressTutors" },
      { name: "description", content: "One child's classes, attendance, homework and progress notes." },
      { property: "og:title", content: "My Child — ProgressTutors" },
      { property: "og:description", content: "Child attendance, homework and progress." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChildDetail,
});

function ChildDetail() {
  const { id } = Route.useParams();
  const students = useTable("students");
  const enrolments = useTable("class_enrolments");
  const classes = useTable("classes");
  const sessions = useTable("sessions", "session_date");
  const attendance = useTable("student_attendance");
  const homework = useTable("homework_items");
  const progress = useTable("progress_records", "record_date");

  const child = (students.data ?? []).find((s) => s.id === id);
  if (!child) {
    return (
      <Page>
        <PageHeader title="Child not found" />
        <Link to="/parent/dashboard" className="text-sm font-bold text-primary">
          Back to dashboard
        </Link>
      </Page>
    );
  }

  const joined = (enrolments.data ?? []).filter((e) => e.student_id === child.id && e.status === "active");
  const marks = (attendance.data ?? []).filter((a) => a.student_id === child.id);
  const present = marks.filter((m) => m.status === "present" || m.status === "late").length;
  const rate = marks.length === 0 ? null : Math.round((present / marks.length) * 100);
  const hw = (homework.data ?? []).filter((h) => h.student_id === child.id);
  const notes = (progress.data ?? []).filter((p) => p.student_id === child.id);

  return (
    <Page>
      <PageHeader
        breadcrumb={
          <Link to="/parent/dashboard" className="hover:text-primary">
            My children
          </Link>
        }
        title={fullName(child)}
        subtitle={[child.year_group, child.school].filter(Boolean).join(" · ") || "Details to confirm"}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Classes" value={String(joined.length)} tone="pink" />
        <StatCard label="Attendance" value={rate === null ? "—" : `${rate}%`} tone="green" />
        <StatCard label="Homework set" value={String(hw.length)} tone="blue" />
        <StatCard label="Progress notes" value={String(notes.length)} tone="purple" />
      </div>

      <Section id="child-classes" title="Classes">
        {joined.length === 0 ? (
          <Empty>Not enrolled in any class yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {joined.map((e) => {
              const c = (classes.data ?? []).find((x) => x.id === e.class_id);
              const next = (sessions.data ?? []).find((s) => s.class_id === e.class_id);
              return (
                <li key={e.id} className="rounded-xl border border-border px-4 py-3">
                  <p className="text-sm font-bold">{c?.name ?? "Class"}</p>
                  <p className="text-xs text-muted-foreground">
                    {c?.weekday} {hhmm(c?.start_time)}–{hhmm(c?.end_time)}
                    {next ? ` · next ${prettyDate(next.session_date)}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section id="child-homework" title="Homework" subtitle="Set by tutors, tracked in GoProgress">
        {hw.length === 0 ? (
          <Empty>Nothing set yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {hw.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-2">
                <span className="min-w-0 flex-1 text-sm font-semibold">{h.title}</span>
                {h.due_date ? <span className="text-xs text-muted-foreground">due {h.due_date}</span> : null}
                <Pill tone={h.status === "complete" ? "green" : "amber"}>{h.status}</Pill>
                {h.goprogress_linked ? <GoProgressLink /> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="child-progress" title="Progress notes">
        {notes.length === 0 ? (
          <Empty>No progress recorded yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {notes.map((p) => (
              <li key={p.id} className="rounded-xl border border-border px-4 py-3">
                <p className="text-sm font-bold">
                  {p.subject ?? "Progress"} {p.score !== null ? `· ${p.score}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {prettyDate(p.record_date)} · {p.note ?? "No note"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Page>
  );
}
