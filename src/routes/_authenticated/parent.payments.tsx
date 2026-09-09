import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { CLIENTS, money } from "@/lib/demo-data";

export const Route = createFileRoute("/_authenticated/parent/payments")({
  head: () => ({
    meta: [
      { title: "My Payments — ProgressTutors" },
      { name: "description", content: "Subscriptions per child, invoices and payment history for your household." },
      { property: "og:title", content: "My Payments — ProgressTutors" },
      { property: "og:description", content: "Manage tuition subscriptions and see what is due." },
    ],
  }),
  component: ParentPayments,
});

function ParentPayments() {
  const account = CLIENTS[0]!;

  return (
    <Page>
      <PageHeader title="Payments" subtitle="Household billing for the Khan family" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Due this month" value={money(140)} tone="pink" />
        <StatCard label="Paid this term" value={money(420)} tone="green" />
        <StatCard label="Active subscriptions" value="2" tone="blue" />
      </div>

      <Section id="pp-subs" title="Subscriptions by child">
        <ul className="space-y-2">
          {account.subscriptions.map((s) => (
            <li key={s.child} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{s.child}</p>
                <p className="text-xs text-muted-foreground">{s.plan}</p>
              </div>
              <span className="font-bold">{money(s.amount)}/mo</span>
              <Pill tone={s.status === "Active" ? "green" : "amber"}>{s.status}</Pill>
              <Button size="sm" variant="ghost" onClick={() => toast.success(`Demo: manage ${s.child}'s plan`)}>
                Manage
              </Button>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="pp-invoices" title="Invoices">
        <ul className="space-y-2 text-sm">
          {account.invoices.map((i) => (
            <li key={i.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <span>
                {i.id} · {i.date}
              </span>
              <span className="flex items-center gap-3 font-semibold">
                {money(i.amount)} <Pill tone="green">{i.status}</Pill>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="pp-history" title="Payment history">
        <ul className="space-y-2 text-sm">
          {account.payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <span>
                {p.id} · {p.date} · {p.method}
              </span>
              <span className="flex items-center gap-3 font-semibold">
                {money(p.amount)} <Pill tone="green">{p.status}</Pill>
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  );
}
