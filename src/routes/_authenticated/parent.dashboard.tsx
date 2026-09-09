import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { ActingPicker } from "@/components/acting-picker";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { useActingId } from "@/lib/acting";
import { DEMO_DATE, fullName, hhmm, money, num, prettyDate, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/parent/dashboard")({
  head: () => ({
    meta: [
      { title: "Parent Dashboard — ProgressTutors" },
      { name: "description", content: "Your children's classes, attendance, homework and payments in one place." },
      { property: "og:title", content: "Parent Dashboard — ProgressTutors" },
      { property: "og:description", content: "Family view of classes, homework and payments." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ParentDashboard,
});

function ParentDashboard() {
  const [parentId, setParentId] = useActingId("parent");
  const parents = useTable("parents", "first_name");
  const links = useTable("parent_students");
  const students = useTable("students");
  const enrolments = useTable("class_enrolments");
  const classes = useTable("classes");
  const sites = useTable("sites");
  const sessions = useTable("sessions", "session_date");
  const homework = useTable("homework_items");
  const payments = useTable("client_payments");

  const me = (parents.data ?? []).find((p) => p.id === parentId);
  const childIds = (links.data ?? []).filter((l) => l.parent_id === parentId).map((l) => l.student_id);
  const children = (students.data ?? []).filter((s) => childIds.includes(s.id));
  const myEnrolments = (enrolments.data ?? []).filter(
    (e) => childIds.includes(e.student_id) && e.status === "active",
  );
  const myClassIds = myEnrolments.map((e) => e.class_id);
  const upcoming = (sessions.data ?? []).filter(
    (s) => s.class_id && myClassIds.includes(s.class_id) && s.session_date >= DEMO_DATE,
  );
  const dueHomework = (homework.data ?? []).filter(
    (h) => h.student_id && childIds.includes(h.student_id) && h.status !== "complete",
  );
  const myPayments = (payments.data ?? []).filter((p) => p.parent_id === parentId);
  const paid = myPayments.filter((p) => p.status === "received").reduce((a, p) => a + num(p.amount), 0);

  return (
    <Page>
      <PageHeader
        title={me ? `Hello, ${me.first_name}` : "Parent"}
        subtitle="Shared operational demo · Live data"
        actions={
          <Link to="/parent/classes" className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            Find a class
          </Link>
        }
      />

      <ActingPicker
        label="I am"
        value={parentId}
        onChange={setParentId}
        options={(parents.data ?? []).map((p) => ({ value: p.id, label: fullName(p) }))}
      />

      {!parentId ? (
        <Section id="parent-pick" title="Choose your name">
          <Empty>Pick your name above. The office adds families on the Parents page.</Empty>
        </Section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Children" value={String(children.length)} tone="pink" />
            <StatCard label="Classes joined" value={String(myEnrolments.length)} tone="blue" />
            <StatCard label="Homework due" value={String(dueHomework.length)} tone="amber" />
            <StatCard label="Paid so far" value={money(paid)} tone="green" />
          </div>

          <Section id="parent-children" title="My children">
            {children.length === 0 ? (
              <Empty>No children linked to you yet — the office can link them from a student record.</Empty>
            ) : (
              <ul className="space-y-2">
                {children.map((c) => {
                  const joined = myEnrolments.filter((e) => e.student_id === c.id).length;
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3">
                      <Link
                        to="/parent/children/$id"
                        params={{ id: c.id }}
                        className="min-w-0 flex-1 text-sm font-bold hover:text-primary"
                      >
                        {fullName(c)}
                      </Link>
                      <Pill tone="blue">{joined} classes</Pill>
                      <Pill tone={c.status === "active" ? "green" : "neutral"}>{c.status}</Pill>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section id="parent-next" title="Next lessons">
            {upcoming.length === 0 ? (
              <Empty>Nothing scheduled yet.</Empty>
            ) : (
              <ul className="space-y-2">
                {upcoming.slice(0, 8).map((s) => {
                  const k = (classes.data ?? []).find((x) => x.id === s.class_id);
                  const site = (sites.data ?? []).find((x) => x.id === s.site_id);
                  return (
                    <li key={s.id} className="rounded-xl border border-border px-4 py-3">
                      <p className="text-sm font-bold">{k?.name ?? "Lesson"}</p>
                      <p className="text-xs text-muted-foreground">
                        {prettyDate(s.session_date)} · {hhmm(s.start_time)}–{hhmm(s.end_time)} ·{" "}
                        {site?.name ?? "Venue to confirm"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section id="parent-money" title="Payments" subtitle="Recorded by the office">
            {myPayments.length === 0 ? (
              <Empty>No payments recorded yet.</Empty>
            ) : (
              <ul className="space-y-2">
                {myPayments.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-2">
                    <span className="min-w-0 flex-1 text-sm">{prettyDate(p.payment_date)}</span>
                    <span className="font-bold">{money(p.amount)}</span>
                    <Pill tone={p.status === "received" ? "green" : "amber"}>{p.status}</Pill>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/parent/payments" className="mt-3 inline-block text-sm font-bold text-primary">
              See all payments →
            </Link>
          </Section>
        </>
      )}
    </Page>
  );
}
