import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarPlus, Plus, UserPlus, Users } from "lucide-react";
import { Page } from "@/components/AppShell";
import { Avatar, CapacityPill, GoProgressLink, Hero, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { SITES, TUTORS, money } from "@/lib/demo-data";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — ProgressTutors" },
      {
        name: "description",
        content: "Daily operations across every tuition site: lessons, capacity, alerts, payments and tutors.",
      },
      { property: "og:title", content: "Admin Dashboard — ProgressTutors" },
      { property: "og:description", content: "Lessons, capacity, alerts, client payments and tutor performance." },
    ],
  }),
  component: AdminDashboard,
});

const UPCOMING = [
  {
    id: "u1",
    kind: "1-to-1" as const,
    student: "Aisha Khan",
    subject: "GCSE Maths",
    tutor: "Sarah Ahmed",
    initials: "SA",
    when: "Today 17:00",
    where: "Online",
  },
  {
    id: "u2",
    kind: "group" as const,
    subject: "GCSE English",
    site: "Lancaster Youth Hub",
    tutor: "Sarah Ahmed",
    initials: "SA",
    when: "18:00",
    enrolled: 9,
    capacity: 10,
  },
  {
    id: "u3",
    kind: "group" as const,
    subject: "GCSE Science",
    site: "Freston Road",
    tutor: "James Wilson",
    initials: "JW",
    when: "18:00",
    enrolled: 11,
    capacity: 12,
  },
  {
    id: "u4",
    kind: "1-to-1" as const,
    student: "Mia Patel",
    subject: "GCSE Maths",
    tutor: "Tom Baker",
    initials: "TB",
    when: "Today 19:00",
    where: "Lancaster Youth Hub · Room 3",
  },
  {
    id: "u5",
    kind: "group" as const,
    subject: "KS2 Maths",
    site: "Chelsea Youth Hub",
    tutor: "Unassigned",
    initials: "?",
    when: "20:00",
    enrolled: 6,
    capacity: 10,
  },
];

function MiniCalendar() {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const busy = new Set([2, 4, 6, 9, 11, 13, 16, 18, 20, 23, 27]);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold">September</p>
        <p className="text-xs text-muted-foreground">5 lessons today</p>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const today = d === 9;
          return (
            <div
              key={d}
              className={`flex h-9 flex-col items-center justify-center rounded-lg text-xs font-semibold ${
                today ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground"
              }`}
            >
              {d}
              {busy.has(d) ? (
                <span className={`mt-0.5 h-1 w-1 rounded-full ${today ? "bg-white" : "bg-primary"}`} />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const QUICK: { label: string; icon: typeof Plus }[] = [
  { label: "Add Class", icon: Plus },
  { label: "Add Lesson", icon: CalendarPlus },
  { label: "Add Tutor", icon: UserPlus },
  { label: "Add Student", icon: Users },
];

function AdminDashboard() {
  return (
    <>
      <Hero title="Welcome back, Moktar 👋" subtitle="Here's what's happening across your tuition today." />

      <Page className="-mt-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Students" value="96" tone="pink" />
          <StatCard label="Classes" value="12" tone="blue" />
          <StatCard label="Tutors" value="8" tone="green" />
          <StatCard label="Lessons Today" value="5" tone="amber" />
          <StatCard label="Capacity" value="82%" tone="purple" />
          <StatCard label="Actions Required" value="3" tone="pink" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <Section
            id="upcoming"
            title="Upcoming Lessons"
            subtitle="Today across all sites"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin/operations">Operations Planner</Link>
              </Button>
            }
          >
            <ul className="space-y-3">
              {UPCOMING.map((l) => (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-border px-4 py-3"
                >
                  <Avatar initials={l.initials} tone={l.initials === "?" ? "amber" : "pink"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {l.kind === "1-to-1" ? l.student : l.subject}
                      <span className="ml-2 text-xs font-semibold text-muted-foreground">
                        {l.kind === "1-to-1" ? l.subject : l.site}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {l.tutor} · {l.when} · {l.kind === "1-to-1" ? l.where : `${l.enrolled}/${l.capacity} students`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill tone={l.kind === "1-to-1" ? "blue" : "purple"}>
                      {l.kind === "1-to-1" ? "1-to-1" : "Group"}
                    </Pill>
                    <GoProgressLink />
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="calendar" title="Calendar" subtitle="This month">
            <MiniCalendar />
          </Section>
        </div>

        <Section id="quick" title="Quick Actions">
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <Button key={q.label} variant="secondary" className="rounded-full">
                <q.icon className="h-4 w-4" />
                {q.label}
              </Button>
            ))}
            <Button variant="outline" className="rounded-full" asChild>
              <a href="https://goprogress.example.com" target="_blank" rel="noreferrer">
                Open GoProgress
              </a>
            </Button>
            <Button className="rounded-full" asChild>
              <Link to="/admin/operations">Operations Planner</Link>
            </Button>
          </div>
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section id="ops-snapshot" title="Operations Snapshot" subtitle="Capacity by site">
            <ul className="space-y-3">
              {SITES.map((s) => (
                <li key={s.id} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold">{s.name}</p>
                    <Pill tone={s.capacity >= 85 ? "amber" : "green"}>{s.capacity}% capacity</Pill>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.classes} classes · {s.students} students · {s.hours}
                  </p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${s.capacity}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="alerts" title="Alerts" subtitle="3 actions required">
            <ul className="space-y-3">
              {[
                { text: "GCSE English is full (10/10) at Lancaster Youth Hub", tone: "amber" as const },
                { text: "KS2 Maths has no tutor assigned at Chelsea Youth Hub", tone: "pink" as const },
                { text: "3 Payment Requests awaiting approval", tone: "blue" as const },
              ].map((a) => (
                <li key={a.text} className="flex items-start gap-3 rounded-2xl border border-border px-4 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-primary" />
                  <p className="flex-1 text-sm font-medium">{a.text}</p>
                  <Pill tone={a.tone}>Action</Pill>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" asChild>
                <Link to="/admin/payment-requests">Review Payment Requests</Link>
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link to="/admin/classes">Fix class issues</Link>
              </Button>
            </div>
          </Section>
        </div>

        <Section
          id="payments-summary"
          title="Payments"
          subtitle="Client billing this month"
          action={
            <Button size="sm" variant="ghost" asChild>
              <Link to="/admin/payments">Open Payments</Link>
            </Button>
          }
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Collected" value={money(12540)} tone="green" />
            <StatCard label="Owed" value={money(1845)} tone="pink" />
            <StatCard label="Expected" value={money(8920)} tone="blue" />
            <StatCard label="Processing" value={money(640)} tone="amber" />
          </div>
        </Section>

        <Section id="leaderboard" title="Tutor Leaderboard" subtitle="Attendance, reviews and lessons delivered">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-semibold">Tutor</th>
                  <th className="pb-2 font-semibold">Attendance</th>
                  <th className="pb-2 font-semibold">Lesson Reviews</th>
                  <th className="pb-2 font-semibold">Lessons delivered</th>
                </tr>
              </thead>
              <tbody>
                {[...TUTORS]
                  .sort((a, b) => b.attendance - a.attendance)
                  .map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar initials={t.initials} size="sm" />
                          <span className="font-semibold">{t.name}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <Pill tone={t.attendance >= 95 ? "green" : "amber"}>{t.attendance}%</Pill>
                      </td>
                      <td className="py-3">{t.reviews}</td>
                      <td className="py-3">{t.lessons}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="capacity-note" title="Capacity key">
          <div className="flex flex-wrap gap-2">
            <CapacityPill enrolled={5} capacity={10} />
            <CapacityPill enrolled={9} capacity={10} />
            <CapacityPill enrolled={10} capacity={10} />
            <CapacityPill enrolled={13} capacity={12} />
          </div>
        </Section>
      </Page>
    </>
  );
}
