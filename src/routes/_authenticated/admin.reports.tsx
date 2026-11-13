import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { Empty, PageHeader, Section, StatCard } from "@/components/kit";
import { fullName, money, num, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports — ProgressTutors" },
      { name: "description", content: "Attendance, income, tutor cost and enrolment figures calculated from live records." },
      { property: "og:title", content: "Reports — ProgressTutors" },
      { property: "og:description", content: "Live operational reporting." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Reports,
});

function Reports() {
  const sessions = useTable("sessions");
  const attendance = useTable("student_attendance");
  const payments = useTable("client_payments");
  const earnings = useTable("tutor_earnings");
  const tutors = useTable("tutors");

  const marks = attendance.data ?? [];
  const present = marks.filter((m) => m.status === "present" || m.status === "late").length;
  const rate = marks.length === 0 ? 0 : Math.round((present / marks.length) * 100);
  const income = (payments.data ?? [])
    .filter((p) => p.status === "received")
    .reduce((a, p) => a + num(p.amount), 0);
  const cost = (earnings.data ?? []).reduce((a, e) => a + num(e.amount), 0);

  return (
    <Page>
      <PageHeader title="Reports" subtitle="Every figure is calculated from the shared database" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Attendance rate" value={`${rate}%`} tone="green" />
        <StatCard label="Sessions delivered" value={String((sessions.data ?? []).length)} tone="blue" />
        <StatCard label="Income received" value={money(income)} tone="purple" />
        <StatCard label="Tutor cost" value={money(cost)} tone="pink" />
      </div>

      <Section id="rep-tutors" title="Tutor cost">
        {(tutors.data ?? []).length === 0 ? (
          <Empty>No tutors added yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {(tutors.data ?? []).map((t) => {
              const mine = (earnings.data ?? []).filter((e) => e.tutor_id === t.id);
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-2">
                  <span className="min-w-0 flex-1 text-sm font-semibold">{fullName(t)}</span>
                  <span className="text-xs text-muted-foreground">{mine.length} sessions</span>
                  <span className="font-bold">{money(mine.reduce((a, e) => a + num(e.amount), 0))}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </Page>
  );
}
