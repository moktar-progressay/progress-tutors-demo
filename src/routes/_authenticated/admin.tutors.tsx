import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Avatar, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { CLASSES, TUTORS, money, site } from "@/lib/demo-data";

export const Route = createFileRoute("/_authenticated/admin/tutors")({
  head: () => ({
    meta: [
      { title: "Tutors — ProgressTutors" },
      {
        name: "description",
        content: "Tutor availability, attendance, lesson reviews, assigned classes and pay rates.",
      },
      { property: "og:title", content: "Tutors — ProgressTutors" },
      { property: "og:description", content: "Manage tutors, assignments and pay rates across sites." },
    ],
  }),
  component: Tutors,
});

function Tutors() {
  return (
    <Page>
      <PageHeader
        title="Tutors"
        subtitle="8 tutors · 2 tutor gaps this week"
        actions={<Button onClick={() => toast.success("Demo: Add Tutor form would open")}>Add Tutor</Button>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active tutors" value="8" tone="pink" />
        <StatCard label="Avg attendance" value="93%" tone="green" />
        <StatCard label="Reviews this month" value="119" tone="blue" />
        <StatCard label="Pay pending" value={money(2480)} tone="amber" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TUTORS.map((t) => {
          const assigned = CLASSES.filter((c) => c.tutorId === t.id);
          return (
            <article key={t.id} className="surface p-5">
              <div className="flex items-center gap-3">
                <Avatar initials={t.initials} size="lg" />
                <div>
                  <h2 className="text-lg font-extrabold">{t.name}</h2>
                  <p className="text-xs text-muted-foreground">{t.subjects.join(" · ")}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-tile-green px-2 py-2 text-tile-green-ink">
                  <p className="text-base font-extrabold">{t.attendance}%</p>
                  <p className="text-[10px] font-semibold">Attendance</p>
                </div>
                <div className="rounded-xl bg-tile-blue px-2 py-2 text-tile-blue-ink">
                  <p className="text-base font-extrabold">{t.reviews}</p>
                  <p className="text-[10px] font-semibold">Reviews</p>
                </div>
                <div className="rounded-xl bg-tile-purple px-2 py-2 text-tile-purple-ink">
                  <p className="text-base font-extrabold">{t.lessons}</p>
                  <p className="text-[10px] font-semibold">Lessons</p>
                </div>
              </div>
              <p className="mt-4 text-xs font-semibold text-muted-foreground">Assigned classes</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {assigned.length === 0 ? (
                  <Pill tone="amber">No classes assigned</Pill>
                ) : (
                  assigned.map((c) => (
                    <Pill key={c.id} tone="blue">
                      {c.subject} · {site(c.siteId)?.name}
                    </Pill>
                  ))
                )}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-bold">{money(t.rate)}/hour</span>
                <Button size="sm" variant="secondary" onClick={() => toast.success(`Demo: message ${t.name}`)}>
                  Message
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <Section id="tutor-gaps" title="Tutor gaps" subtitle="Sessions still needing a tutor">
        <ul className="space-y-2">
          {CLASSES.filter((c) => !c.tutorId).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3">
              <span className="flex-1 text-sm font-bold">
                {c.subject} · {site(c.siteId)?.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {c.day} {c.start}–{c.end}
              </span>
              <Button size="sm" onClick={() => toast.success(`Demo: tutor assigned to ${c.subject}`)}>
                Assign Tutor
              </Button>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  );
}
