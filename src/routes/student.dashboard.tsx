import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { GoProgressLink, Hero, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { BADGES, CHILDREN } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/student/dashboard")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — ProgressTutors" },
      { name: "description", content: "Your next lessons, homework, XP, streak and badges." },
      { property: "og:title", content: "Student Dashboard — ProgressTutors" },
      { property: "og:description", content: "Lessons, homework, XP and rewards for students." },
    ],
  }),
  component: StudentDashboard,
});

export const ME = CHILDREN[0]!;

function StudentDashboard() {
  const { xp, level, tasksCompleted } = useDemo();
  const nextLevelXp = 1250 + (level - 6) * 200;

  return (
    <>
      <Hero title={`Hi ${ME.short} 👋`} subtitle={`Level ${level} · ${ME.streak} day streak · keep it going!`}>
        <div className="max-w-md">
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${Math.min(100, Math.round((xp / nextLevelXp) * 100))}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-bold opacity-90">
            {xp} XP · {Math.max(0, nextLevelXp - xp)} XP to level {level + 1}
          </p>
        </div>
      </Hero>

      <Page className="-mt-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="XP" value={xp.toLocaleString()} tone="purple" />
          <StatCard label="Level" value={String(level)} tone="pink" />
          <StatCard label="Streak" value={`${ME.streak} days`} tone="amber" />
          <StatCard label="Tasks completed" value={String(tasksCompleted)} tone="green" />
        </div>

        <Section id="s-lessons" title="Next lessons">
          <ul className="space-y-2">
            {ME.lessons.map((l) => (
              <li key={l.subject} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border px-4 py-3">
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
          <Button variant="ghost" className="mt-3" asChild>
            <Link to="/student/lessons">See all lessons</Link>
          </Button>
        </Section>

        <Section id="s-homework" title="Homework">
          <ul className="space-y-2">
            {ME.homework.map((h) => (
              <li key={h.title} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <span>
                  <span className="block text-sm font-bold">{h.title}</span>
                  <span className="block text-xs text-muted-foreground">{h.subject}</span>
                </span>
                <Pill tone={h.status === "Due" ? "amber" : "green"}>{h.due}</Pill>
              </li>
            ))}
          </ul>
          <Button variant="ghost" className="mt-3" asChild>
            <Link to="/student/homework">Open homework</Link>
          </Button>
        </Section>

        <Section id="s-badges" title="Badges">
          <div className="flex flex-wrap gap-3">
            {BADGES.map((b) => (
              <div
                key={b.name}
                className={`flex w-32 flex-col items-center gap-1 rounded-2xl border border-border p-3 text-center ${
                  b.earned ? "" : "opacity-40"
                }`}
              >
                <span className="text-2xl">{b.icon}</span>
                <span className="text-xs font-bold">{b.name}</span>
              </div>
            ))}
          </div>
          <Button variant="ghost" className="mt-3" asChild>
            <Link to="/student/rewards">See rewards</Link>
          </Button>
        </Section>
      </Page>
    </>
  );
}
