import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { CHILDREN } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/_authenticated/student/homework")({
  head: () => ({
    meta: [
      { title: "My Homework — ProgressTutors" },
      { name: "description", content: "Homework tasks, due dates and submissions — earn XP as you complete them." },
      { property: "og:title", content: "My Homework — ProgressTutors" },
      { property: "og:description", content: "Complete homework and earn XP." },
    ],
  }),
  component: StudentHomework,
});

function StudentHomework() {
  const me = CHILDREN[0]!;
  const { addXp } = useDemo();
  const [done, setDone] = useState<Record<string, boolean>>(
    Object.fromEntries(me.homework.map((h) => [h.title, h.status === "Submitted"])),
  );
  const dueCount = me.homework.filter((h) => !done[h.title]).length;

  return (
    <Page>
      <PageHeader title="Homework" subtitle="Complete a task to earn 25 XP" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Due" value={String(dueCount)} tone="amber" />
        <StatCard label="Submitted" value={String(me.homework.length - dueCount)} tone="green" />
        <StatCard label="Tasks total" value={String(me.homework.length)} tone="blue" />
      </div>

      <Section id="sh-list" title="Tasks">
        <ul className="space-y-2">
          {me.homework.map((h) => (
            <li key={h.title} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{h.title}</p>
                <p className="text-xs text-muted-foreground">
                  {h.subject} · {h.due}
                </p>
              </div>
              {done[h.title] ? (
                <Pill tone="green">Submitted</Pill>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    setDone((d) => ({ ...d, [h.title]: true }));
                    addXp(25);
                    toast.success("Nice work — +25 XP");
                  }}
                >
                  Mark complete
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  );
}
