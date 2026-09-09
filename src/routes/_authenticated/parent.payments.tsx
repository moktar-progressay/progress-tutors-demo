import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { ActingPicker } from "@/components/acting-picker";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { useActingId } from "@/lib/acting";
import { fullName, money, num, prettyDate, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/parent/payments")({
  head: () => ({
    meta: [
      { title: "My Payments — ProgressTutors" },
      { name: "description", content: "Your plan, what is due next and every payment the office has recorded." },
      { property: "og:title", content: "My Payments — ProgressTutors" },
      { property: "og:description", content: "Family payment history and plans." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ParentPayments,
});

function ParentPayments() {
  const [parentId, setParentId] = useActingId("parent");
  const parents = useTable("parents", "first_name");
  const students = useTable("students");
  const subs = useTable("client_subscriptions");
  const payments = useTable("client_payments", "payment_date");

  const mySubs = (subs.data ?? []).filter((s) => s.parent_id === parentId);
  const myPayments = (payments.data ?? []).filter((p) => p.parent_id === parentId);
  const paid = myPayments.filter((p) => p.status === "received").reduce((a, p) => a + num(p.amount), 0);
  const perCycle = mySubs.filter((s) => s.status === "active").reduce((a, s) => a + num(s.amount), 0);
  const childName = (id: string | null) => fullName((students.data ?? []).find((s) => s.id === id));

  return (
    <Page>
      <PageHeader title="My payments" subtitle="Payments are recorded by the office; nothing is charged here" />

      <ActingPicker
        label="I am"
        value={parentId}
        onChange={setParentId}
        options={(parents.data ?? []).map((p) => ({ value: p.id, label: fullName(p) }))}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Paid so far" value={money(paid)} tone="green" />
        <StatCard label="Per cycle" value={money(perCycle)} tone="blue" />
        <StatCard label="Active plans" value={String(mySubs.filter((s) => s.status === "active").length)} tone="purple" />
        <StatCard label="Payments logged" value={String(myPayments.length)} tone="pink" />
      </div>

      <Section id="parent-plans-mine" title="My plans">
        {mySubs.length === 0 ? (
          <Empty>No plan set up yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {mySubs.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {s.plan_name ?? "Plan"} · {childName(s.student_id)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {money(s.amount)} {s.cadence}
                    {s.next_due_date ? ` · next due ${prettyDate(s.next_due_date)}` : ""}
                  </p>
                </div>
                <Pill tone={s.status === "active" ? "green" : "neutral"}>{s.status}</Pill>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="parent-history" title="Payment history">
        {myPayments.length === 0 ? (
          <Empty>No payments recorded yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {myPayments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-2">
                <span className="min-w-0 flex-1 text-sm">
                  {prettyDate(p.payment_date)} · {childName(p.student_id)}
                </span>
                <span className="text-xs text-muted-foreground">{p.method ?? "—"}</span>
                <span className="font-bold">{money(p.amount)}</span>
                <Pill tone={p.status === "received" ? "green" : "amber"}>{p.status}</Pill>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Page>
  );
}
