import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { ActingPicker } from "@/components/acting-picker";
import { Empty, GoProgressLink, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { useActingId } from "@/lib/acting";
import { fullName, useTable, useUpdateRow } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/student/homework")({
  head: () => ({
    meta: [
      { title: "My Homework — ProgressTutors" },
      { name: "description", content: "Homework set by your tutors, with a tick when you finish each task." },
      { property: "og:title", content: "My Homework — ProgressTutors" },
      { property: "og:description", content: "Student homework tracker." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentHomework,
});

function StudentHomework() {
  const [studentId, setStudentId] = useActingId("student");
  const students = useTable("students", "first_name");
  const homework = useTable("homework_items", "due_date");
  const classes = useTable("classes");
  const update = useUpdateRow("homework_items");

  const mine = (homework.data ?? []).filter((h) => h.student_id === studentId);
  const done = mine.filter((h) => h.status === "complete");

  return (
    <Page>
      <PageHeader title="My homework" subtitle="Ticking a task updates it for your tutor too" />

      <ActingPicker
        label="I am"
        value={studentId}
        onChange={setStudentId}
        options={(students.data ?? []).map((s) => ({ value: s.id, label: fullName(s) }))}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Set" value={String(mine.length)} tone="blue" />
        <StatCard label="Done" value={String(done.length)} tone="green" />
        <StatCard label="Still to do" value={String(mine.length - done.length)} tone="amber" />
        <StatCard label="XP from homework" value={String(done.length * 25)} tone="purple" />
      </div>

      <Section id="student-homework" title="Tasks">
        {mine.length === 0 ? (
          <Empty>Nothing set yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {mine.map((h) => {
              const c = (classes.data ?? []).find((x) => x.id === h.class_id);
              return (
                <li key={h.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{h.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c?.name ?? "Class"}
                      {h.due_date ? ` · due ${h.due_date}` : ""}
                      {h.description ? ` · ${h.description}` : ""}
                    </p>
                  </div>
                  {h.goprogress_linked ? <GoProgressLink /> : null}
                  {h.status === "complete" ? (
                    <Pill tone="green">Done</Pill>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() =>
                        update.mutate(
                          { id: h.id, values: { status: "complete" } },
                          { onSuccess: () => toast.success("Nice one — 25 XP added") },
                        )
                      }
                    >
                      Mark done
                    </Button>
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
