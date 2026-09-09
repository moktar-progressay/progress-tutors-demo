import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { GoProgressLink, PageHeader, Section } from "@/components/kit";
import { CHILDREN } from "@/lib/demo-data";

export const Route = createFileRoute("/student/lessons")({
  head: () => ({
    meta: [
      { title: "My Lessons — ProgressTutors" },
      { name: "description", content: "Your lesson timetable with tutor, time and location." },
      { property: "og:title", content: "My Lessons — ProgressTutors" },
      { property: "og:description", content: "See every upcoming lesson." },
    ],
  }),
  component: StudentLessons,
});

function StudentLessons() {
  const me = CHILDREN[0]!;

  return (
    <Page>
      <PageHeader title="My Lessons" subtitle={`${me.year} · ${me.lessons.length} lessons scheduled`} />
      <Section id="sl-list" title="Timetable">
        <ul className="space-y-2">
          {me.lessons.map((l) => (
            <li key={l.subject + l.when} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{l.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {l.when} · {l.where} · {l.tutor}
                </p>
              </div>
              <GoProgressLink />
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  );
}
