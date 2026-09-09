import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { GoProgressLink, PageHeader, Section, StatCard } from "@/components/kit";
import { CHILDREN } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/student/progress")({
  head: () => ({
    meta: [
      { title: "My Progress — ProgressTutors" },
      { name: "description", content: "Course progress, attendance and subject performance." },
      { property: "og:title", content: "My Progress — ProgressTutors" },
      { property: "og:description", content: "Track your course progress and attendance." },
    ],
  }),
  component: StudentProgress,
});

const SUBJECTS = [
  { name: "GCSE Maths", progress: 72, grade: "Grade 6 → 7" },
  { name: "GCSE English", progress: 64, grade: "Grade 5 → 6" },
];

function StudentProgress() {
  const me = CHILDREN[0]!;
  const { xp, level } = useDemo();

  return (
    <Page>
      <PageHeader title="My Progress" subtitle="Shared with your parent and tutor" actions={<GoProgressLink />} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Course progress" value={`${me.progress}%`} tone="green" />
        <StatCard label="Attendance" value="96%" tone="blue" />
        <StatCard label="XP" value={xp.toLocaleString()} tone="purple" />
        <StatCard label="Level" value={String(level)} tone="pink" />
      </div>

      <Section id="sp-subjects" title="Subjects">
        <ul className="space-y-4">
          {SUBJECTS.map((s) => (
            <li key={s.name}>
              <div className="flex items-center justify-between text-sm font-bold">
                <span>{s.name}</span>
                <span className="text-muted-foreground">{s.grade}</span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${s.progress}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  );
}
