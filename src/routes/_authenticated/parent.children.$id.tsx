import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { Avatar, Empty, GoProgressLink, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { CHILDREN, childById, money } from "@/lib/demo-data";

export const Route = createFileRoute("/_authenticated/parent/children/$id")({
  head: () => ({
    meta: [
      { title: "Child Profile — ProgressTutors" },
      { name: "description", content: "One child's lessons, homework, progress and payments." },
      { property: "og:title", content: "Child Profile — ProgressTutors" },
      { property: "og:description", content: "Lessons, homework and progress for your child." },
    ],
  }),
  component: ChildProfilePage,
});

function ChildProfilePage() {
  const { id } = Route.useParams();
  const child = childById(id) ?? CHILDREN[0];

  if (!child) {
    return (
      <Page>
        <Empty>Child not found.</Empty>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        breadcrumb={
          <Link to="/parent/dashboard" className="hover:text-primary">
            Parent dashboard
          </Link>
        }
        title={child.name}
        subtitle={`${child.year} · Level ${child.level} · ${child.streak} day streak`}
        actions={
          <Button variant="outline" asChild>
            <a href="https://goprogress.example.com" target="_blank" rel="noreferrer">
              Open GoProgress
            </a>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Course progress" value={`${child.progress}%`} tone="green" />
        <StatCard label="XP" value={child.xp.toLocaleString()} tone="purple" />
        <StatCard label="Homework due" value={String(child.homework.filter((h) => h.status === "Due").length)} tone="amber" />
        <StatCard label="Monthly" value={money(child.monthly)} tone="pink" />
      </div>

      <Section id="child-lessons" title="Lessons">
        <ul className="space-y-2">
          {child.lessons.map((l) => (
            <li key={l.subject + l.when} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border px-4 py-3">
              <Avatar initials={child.initials} size="sm" tone="purple" />
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

      <Section id="child-homework" title="Homework">
        <ul className="space-y-2">
          {child.homework.map((h) => (
            <li key={h.title} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <span>
                <span className="block text-sm font-bold">{h.title}</span>
                <span className="block text-xs text-muted-foreground">{h.subject}</span>
              </span>
              <Pill tone={h.status === "Due" ? "amber" : "green"}>{h.due}</Pill>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="child-progress" title="Progress">
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${child.progress}%` }} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{child.progress}% of the current course complete.</p>
      </Section>
    </Page>
  );
}
