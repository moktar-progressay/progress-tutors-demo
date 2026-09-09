import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { ActingPicker } from "@/components/acting-picker";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { useActingId } from "@/lib/acting";
import { fullName, prettyDate, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/student/progress")({
  head: () => ({
    meta: [
      { title: "My Progress — ProgressTutors" },
      { name: "description", content: "Attendance, scores and tutor notes recorded for you across your classes." },
      { property: "og:title", content: "My Progress — ProgressTutors" },
      { property: "og:description", content: "Student progress and attendance record." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentProgress,
});

function StudentProgress() {
  const [studentId, setStudentId] = useActingId("student");
  const students = useTable("students", "first_name");
  const attendance = useTable("student_attendance");
  const progress = useTable("progress_records", "record_date");
  const classes = useTable("classes");

  const marks = (attendance.data ?? []).filter((a) => a.student_id === studentId);
  const present = marks.filter((m) => m.status === "present" || m.status === "late").length;
  const rate = marks.length === 0 ? null : Math.round((present / marks.length) * 100);
  const records = (progress.data ?? []).filter((p) => p.student_id === studentId);
  const scored = records.filter((r) => r.score !== null);
  const average =
    scored.length === 0 ? null : Math.round(scored.reduce((a, r) => a + Number(r.score), 0) / scored.length);

  return (
    <Page>
      <PageHeader title="My progress" subtitle="Built from registers and tutor notes" />

      <ActingPicker
        label="I am"
        value={studentId}
        onChange={setStudentId}
        options={(students.data ?? []).map((s) => ({ value: s.id, label: fullName(s) }))}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Attendance" value={rate === null ? "—" : `${rate}%`} tone="green" />
        <StatCard label="Lessons attended" value={String(present)} tone="blue" />
        <StatCard label="Average score" value={average === null ? "—" : String(average)} tone="purple" />
        <StatCard label="Notes" value={String(records.length)} tone="pink" />
      </div>

      <Section id="student-progress" title="Progress records">
        {records.length === 0 ? (
          <Empty>No progress recorded yet — tutors add notes after lessons.</Empty>
        ) : (
          <ul className="space-y-2">
            {records.map((r) => {
              const c = (classes.data ?? []).find((x) => x.id === r.class_id);
              return (
                <li key={r.id} className="rounded-xl border border-border px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold">{r.subject ?? c?.name ?? "Progress"}</p>
                    {r.score !== null ? <Pill tone="green">{r.score}</Pill> : null}
                    <Pill tone="blue">{r.status}</Pill>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {prettyDate(r.record_date)}
                    {r.target ? ` · target: ${r.target}` : ""}
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section id="student-attendance" title="Attendance history">
        {marks.length === 0 ? (
          <Empty>No registers taken yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {marks.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-2 text-sm">
                <span className="min-w-0 flex-1">{new Date(m.recorded_at).toLocaleDateString("en-GB")}</span>
                <Pill tone={m.status === "absent" ? "pink" : m.status === "late" ? "amber" : "green"}>{m.status}</Pill>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Page>
  );
}
