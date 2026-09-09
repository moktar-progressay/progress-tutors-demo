import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { ActingPicker } from "@/components/acting-picker";
import { Empty, PageHeader, Pill, Section } from "@/components/kit";
import { useActingId } from "@/lib/acting";
import { fullName, hhmm, prettyDate, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/student/lessons")({
  head: () => ({
    meta: [
      { title: "My Lessons — ProgressTutors" },
      { name: "description", content: "Every lesson you are booked into, with the register result once it is taken." },
      { property: "og:title", content: "My Lessons — ProgressTutors" },
      { property: "og:description", content: "Student lesson list and attendance." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentLessons,
});

function StudentLessons() {
  const [studentId, setStudentId] = useActingId("student");
  const students = useTable("students", "first_name");
  const enrolments = useTable("class_enrolments");
  const classes = useTable("classes");
  const sites = useTable("sites");
  const sessions = useTable("sessions", "session_date");
  const attendance = useTable("student_attendance");

  const myClassIds = (enrolments.data ?? [])
    .filter((e) => e.student_id === studentId && e.status === "active")
    .map((e) => e.class_id);
  const mine = (sessions.data ?? []).filter((s) => s.class_id && myClassIds.includes(s.class_id));

  return (
    <Page>
      <PageHeader title="My lessons" subtitle="Straight from the shared timetable" />

      <ActingPicker
        label="I am"
        value={studentId}
        onChange={setStudentId}
        options={(students.data ?? []).map((s) => ({ value: s.id, label: fullName(s) }))}
      />

      <Section id="student-lessons" title="Lessons" subtitle={`${mine.length} in total`}>
        {mine.length === 0 ? (
          <Empty>No lessons yet — you will see them once you are in a class.</Empty>
        ) : (
          <ul className="space-y-2">
            {mine.map((s) => {
              const c = (classes.data ?? []).find((x) => x.id === s.class_id);
              const site = (sites.data ?? []).find((x) => x.id === s.site_id);
              const mark = (attendance.data ?? []).find(
                (a) => a.session_id === s.id && a.student_id === studentId,
              );
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{c?.name ?? "Lesson"}</p>
                    <p className="text-xs text-muted-foreground">
                      {prettyDate(s.session_date)} · {hhmm(s.start_time)}–{hhmm(s.end_time)} ·{" "}
                      {site?.name ?? "Venue to confirm"}
                    </p>
                  </div>
                  {mark ? (
                    <Pill tone={mark.status === "absent" ? "pink" : mark.status === "late" ? "amber" : "green"}>
                      {mark.status}
                    </Pill>
                  ) : (
                    <Pill tone="blue">upcoming</Pill>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </Page>
  );
}
