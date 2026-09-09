import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { ActingPicker } from "@/components/acting-picker";
import { PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { useActingId } from "@/lib/acting";
import { fullName, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/student/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards — ProgressTutors" },
      { name: "description", content: "Points, levels and badges earned from attendance and finished homework." },
      { property: "og:title", content: "Rewards — ProgressTutors" },
      { property: "og:description", content: "Student rewards, levels and badges." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Rewards,
});

function Rewards() {
  const [studentId, setStudentId] = useActingId("student");
  const students = useTable("students", "first_name");
  const attendance = useTable("student_attendance");
  const homework = useTable("homework_items");

  const marks = (attendance.data ?? []).filter((a) => a.student_id === studentId);
  const attended = marks.filter((m) => m.status === "present" || m.status === "late").length;
  const onTime = marks.filter((m) => m.status === "present").length;
  const done = (homework.data ?? []).filter((h) => h.student_id === studentId && h.status === "complete").length;
  const xp = attended * 50 + done * 25;
  const level = 1 + Math.floor(xp / 200);
  const toNext = 200 - (xp % 200);

  const badges = [
    { name: "First lesson", earned: attended >= 1, hint: "Attend your first lesson" },
    { name: "Five in a row", earned: onTime >= 5, hint: "Be on time five times" },
    { name: "Homework hero", earned: done >= 3, hint: "Finish three homework tasks" },
    { name: "Full term", earned: attended >= 10, hint: "Attend ten lessons" },
    { name: "Perfect start", earned: marks.length > 0 && onTime === marks.length, hint: "Never miss a lesson" },
  ];

  return (
    <Page>
      <PageHeader title="Rewards" subtitle="Earned from real registers and finished homework" />

      <ActingPicker
        label="I am"
        value={studentId}
        onChange={setStudentId}
        options={(students.data ?? []).map((s) => ({ value: s.id, label: fullName(s) }))}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="XP" value={String(xp)} tone="purple" />
        <StatCard label="Level" value={String(level)} hint={`${toNext} XP to the next level`} tone="pink" />
        <StatCard label="Lessons attended" value={String(attended)} tone="green" />
        <StatCard label="Homework done" value={String(done)} tone="amber" />
      </div>

      <Section id="student-badges" title="Badges">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((b) => (
            <div key={b.name} className="rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold">{b.name}</p>
                <Pill tone={b.earned ? "green" : "neutral"}>{b.earned ? "Earned" : "Locked"}</Pill>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{b.hint}</p>
            </div>
          ))}
        </div>
      </Section>
    </Page>
  );
}
