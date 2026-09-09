import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import {
  DEMO_DATE,
  fullName,
  hhmm,
  money,
  num,
  prettyDate,
  useTable,
  weekdayOf,
} from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — ProgressTutors" },
      { name: "description", content: "Live picture of sites, classes, enrolments, payments and tutor pay requests." },
      { property: "og:title", content: "Admin Dashboard — ProgressTutors" },
      { property: "og:description", content: "Shared operational dashboard with live figures." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const sites = useTable("sites", "name");
  const programmes = useTable("programmes", "name");
  const blocks = useTable("recurring_schedule_blocks");
  const classes = useTable("classes", "name");
  const students = useTable("students");
  const parents = useTable("parents");
  const tutors = useTable("tutors");
  const enrolments = useTable("class_enrolments");
  const payments = useTable("client_payments");
  const requests = useTable("payment_requests");
  const plans = useTable("pricing_plans", "sort_order");

  const activeStudents = (students.data ?? []).filter((s) => s.status === "active");
  const activeEnrolments = (enrolments.data ?? []).filter((e) => e.status === "active");
  const collected = (payments.data ?? [])
    .filter((p) => p.status === "received")
    .reduce((a, p) => a + num(p.amount), 0);
  const pendingRequests = (requests.data ?? []).filter((r) => r.status === "submitted");
  const unassigned = (classes.data ?? []).filter((c) => !c.tutor_id);
  const today = weekdayOf(DEMO_DATE);

  return (
    <Page>
      <PageHeader
        title="Admin dashboard"
        subtitle="Shared operational demo · Live data"
        actions={
          <Link to="/admin/operations" className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            Run today
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active students" value={String(activeStudents.length)} tone="pink" />
        <StatCard label="Class places filled" value={String(activeEnrolments.length)} tone="blue" />
        <StatCard label="Payments received" value={money(collected)} tone="green" />
        <StatCard label="Pay requests waiting" value={String(pendingRequests.length)} tone="amber" />
      </div>

      <Section
        id="dash-week"
        title="This week's schedule"
        subtitle={`Demo opening weekend starts ${prettyDate(DEMO_DATE)}`}
      >
        {(blocks.data ?? []).length === 0 ? (
          <Empty>No recurring blocks configured.</Empty>
        ) : (
          <ul className="space-y-2">
            {(blocks.data ?? []).map((b) => {
              const site = (sites.data ?? []).find((s) => s.id === b.site_id);
              const inBlock = (classes.data ?? []).filter((c) => c.schedule_block_id === b.id);
              const enrolled = activeEnrolments.filter((e) => inBlock.some((c) => c.id === e.class_id)).length;
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{b.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.weekday} {hhmm(b.start_time)}–{hhmm(b.end_time)} · {site?.name ?? "Venue to confirm"} ·{" "}
                      {b.status === "coming_soon" ? "Coming soon" : b.start_date ? `from ${b.start_date}` : "weekly"}
                    </p>
                  </div>
                  {b.weekday === today ? <Pill tone="green">Runs on the opening day</Pill> : null}
                  <Pill tone="blue">
                    {inBlock.length} classes · {enrolled} enrolled
                  </Pill>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section id="dash-attention" title="Needs attention">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-bold">Classes without a tutor</p>
            {unassigned.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Every class has someone assigned.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {unassigned.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <Link to="/admin/classes/$id" params={{ id: c.id }} className="hover:text-primary">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-bold">Payment Requests to review</p>
            {pendingRequests.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Nothing waiting.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {pendingRequests.map((r) => {
                  const t = (tutors.data ?? []).find((x) => x.id === r.tutor_id);
                  return (
                    <li key={r.id}>
                      {fullName(t)} · {money(r.total_amount)}
                    </li>
                  );
                })}
              </ul>
            )}
            <Link to="/admin/payment-requests" className="mt-3 inline-block text-sm font-bold text-primary">
              Open Payment Requests →
            </Link>
          </div>
        </div>
      </Section>

      <Section id="dash-people" title="People">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Students" value={String((students.data ?? []).length)} tone="purple" />
          <StatCard label="Parents" value={String((parents.data ?? []).length)} tone="blue" />
          <StatCard label="Tutors & coaches" value={String((tutors.data ?? []).length)} tone="green" />
          <StatCard label="Sites" value={String((sites.data ?? []).length)} tone="pink" />
        </div>
      </Section>

      <Section id="dash-programmes" title="Programmes & pricing" subtitle="Prices exactly as agreed by the organisation">
        <ul className="space-y-2">
          {(programmes.data ?? []).map((p) => (
            <li key={p.id} className="rounded-xl border border-border px-4 py-3">
              <p className="text-sm font-bold">
                {p.name} <span className="text-xs font-medium text-muted-foreground">· {p.programme_type}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(plans.data ?? [])
                  .filter((pl) => pl.programme_id === p.id)
                  .map((pl) => (
                    <Pill key={pl.id} tone="green">
                      {pl.name} · {money(pl.amount)} {pl.pricing_unit}
                    </Pill>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  );
}
