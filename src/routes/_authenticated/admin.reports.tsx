import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { SITES, TUTORS, money } from "@/lib/demo-data";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports — ProgressTutors" },
      {
        name: "description",
        content: "Attendance, capacity, revenue and tutor delivery trends across all tuition sites.",
      },
      { property: "og:title", content: "Reports — ProgressTutors" },
      { property: "og:description", content: "Attendance, capacity and revenue trends for your tuition business." },
    ],
  }),
  component: Reports,
});

const MONTHS = [
  { m: "Apr", revenue: 7200, attendance: 88 },
  { m: "May", revenue: 8100, attendance: 90 },
  { m: "Jun", revenue: 9400, attendance: 91 },
  { m: "Jul", revenue: 8800, attendance: 87 },
  { m: "Aug", revenue: 7600, attendance: 85 },
  { m: "Sep", revenue: 12540, attendance: 92 },
];

function Reports() {
  const max = Math.max(...MONTHS.map((m) => m.revenue));
  return (
    <Page>
      <PageHeader title="Reports" subtitle="Attendance, capacity, revenue and tutor delivery" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenue this month" value={money(12540)} tone="green" />
        <StatCard label="Attendance" value="92%" tone="blue" />
        <StatCard label="Capacity used" value="82%" tone="amber" />
        <StatCard label="Lesson reviews" value="119" tone="purple" />
      </div>

      <Section id="rev-chart" title="Revenue trend" subtitle="Last 6 months">
        <div className="flex h-56 items-end gap-3">
          {MONTHS.map((m) => (
            <div key={m.m} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-bold">{money(m.revenue)}</span>
              <div
                className="w-full rounded-t-xl bg-primary/85"
                style={{ height: `${(m.revenue / max) * 100}%` }}
              />
              <span className="text-xs font-semibold text-muted-foreground">{m.m}</span>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section id="rep-sites" title="Capacity by site">
          <ul className="space-y-3">
            {SITES.map((s) => (
              <li key={s.id}>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>{s.name}</span>
                  <span>{s.capacity}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${s.capacity}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="rep-attendance" title="Attendance by month">
          <ul className="space-y-3">
            {MONTHS.map((m) => (
              <li key={m.m} className="flex items-center gap-3">
                <span className="w-10 text-sm font-semibold">{m.m}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${m.attendance}%` }} />
                </div>
                <span className="w-10 text-right text-sm font-bold">{m.attendance}%</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section id="rep-tutors" title="Tutor delivery">
        <div className="flex flex-wrap gap-2">
          {TUTORS.map((t) => (
            <Pill key={t.id} tone="blue">
              {t.name}: {t.lessons} lessons · {t.attendance}%
            </Pill>
          ))}
        </div>
      </Section>
    </Page>
  );
}
