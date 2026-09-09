import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Avatar, Empty, PageHeader, Pill, Section, StatCard, type Tone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { CLIENTS, money, type ClientAccount } from "@/lib/demo-data";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [
      { title: "Billing & Subscriptions — ProgressTutors" },
      {
        name: "description",
        content: "Collect from parents: subscriptions, invoices, outstanding balances, failed payments and credits.",
      },
      { property: "og:title", content: "Billing & Subscriptions — ProgressTutors" },
      { property: "og:description", content: "Client payments, plans, invoices, refunds and credits." },
    ],
  }),
  component: Payments,
});

const TABS = ["Clients", "Subscriptions", "Invoices", "Payments", "Refunds"] as const;
type Tab = (typeof TABS)[number];

const statusTone = (s: string): Tone =>
  s === "Active" || s === "Paid" || s === "Succeeded"
    ? "green"
    : s === "Failed" || s === "Overdue"
      ? "pink"
      : s === "Paused"
        ? "purple"
        : "amber";

function Payments() {
  const [tab, setTab] = useState<Tab>("Clients");
  const [open, setOpen] = useState<ClientAccount | null>(null);

  const act = (label: string) => {
    toast.success(`Demo: ${label}${open ? ` — ${open.parent}` : ""}`);
  };

  return (
    <Page>
      <PageHeader title="Payments" subtitle="Billing & Subscriptions" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total Collected" value={money(12540)} tone="green" />
        <StatCard label="Outstanding" value={money(1845)} tone="pink" />
        <StatCard label="Expected" value={money(8920)} tone="blue" />
        <StatCard label="Active Subscriptions" value="24" tone="purple" />
        <StatCard label="Failed Payments" value="2" tone="amber" />
      </div>

      <div className="surface p-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Section id="pay-table" title={tab} subtitle="Demo billing data">
          <div className="overflow-x-auto">
            {tab === "Clients" || tab === "Subscriptions" ? (
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    {["Parent / client", "Children", "Plan", "Next payment", "Amount", "Status", ""].map((h) => (
                      <th key={h} className="pb-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CLIENTS.map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Avatar initials={c.initials} size="sm" />
                          <span>
                            <span className="block font-semibold">{c.parent}</span>
                            <span className="block text-xs text-muted-foreground">{c.email}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3">{c.children.join(", ")}</td>
                      <td className="py-3">{c.plan}</td>
                      <td className="py-3">{c.nextPayment}</td>
                      <td className="py-3 font-bold">{money(c.amount)}</td>
                      <td className="py-3">
                        <Pill tone={statusTone(c.status)}>{c.status}</Pill>
                      </td>
                      <td className="py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setOpen(c)}>
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {tab === "Invoices" ? (
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    {["Invoice", "Client", "Date", "Amount", "Status"].map((h) => (
                      <th key={h} className="pb-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CLIENTS.flatMap((c) => c.invoices.map((i) => ({ ...i, client: c.parent }))).map((i) => (
                    <tr key={i.id} className="border-t border-border">
                      <td className="py-3 font-semibold">{i.id}</td>
                      <td className="py-3">{i.client}</td>
                      <td className="py-3">{i.date}</td>
                      <td className="py-3 font-bold">{money(i.amount)}</td>
                      <td className="py-3">
                        <Pill tone={statusTone(i.status)}>{i.status}</Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {tab === "Payments" ? (
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    {["Payment", "Client", "Date", "Method", "Amount", "Status"].map((h) => (
                      <th key={h} className="pb-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CLIENTS.flatMap((c) => c.payments.map((p) => ({ ...p, client: c.parent }))).map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="py-3 font-semibold">{p.id}</td>
                      <td className="py-3">{p.client}</td>
                      <td className="py-3">{p.date}</td>
                      <td className="py-3">{p.method}</td>
                      <td className="py-3 font-bold">{money(p.amount)}</td>
                      <td className="py-3">
                        <Pill tone={statusTone(p.status)}>{p.status}</Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {tab === "Refunds" ? <Empty>No refunds have been issued in this demo period.</Empty> : null}
          </div>
        </Section>

        <Section id="client-drawer" title="Client detail" subtitle={open ? open.parent : "Select a client"}>
          {!open ? (
            <Empty>Open a client from the table to see their household billing.</Empty>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar initials={open.initials} size="lg" />
                <div>
                  <p className="font-extrabold">{open.parent}</p>
                  <p className="text-xs text-muted-foreground">{open.children.join(" · ")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Household total" value={money(open.amount)} tone="pink" />
                <StatCard label="Credits" value={money(open.credits)} tone="green" />
              </div>

              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Subscriptions per child</p>
                <ul className="mt-2 space-y-2">
                  {open.subscriptions.map((s) => (
                    <li key={s.child} className="rounded-xl border border-border px-3 py-2">
                      <p className="text-sm font-bold">{s.child}</p>
                      <p className="text-xs text-muted-foreground">{s.plan}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-sm font-bold">{money(s.amount)}/mo</span>
                        <Pill tone={statusTone(s.status)}>{s.status}</Pill>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Invoices</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {open.invoices.length === 0 ? (
                    <li className="text-muted-foreground">No invoices</li>
                  ) : (
                    open.invoices.map((i) => (
                      <li key={i.id} className="flex justify-between">
                        <span>
                          {i.id} · {i.date}
                        </span>
                        <span className="font-semibold">
                          {money(i.amount)} · {i.status}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Payments</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {open.payments.length === 0 ? (
                    <li className="text-muted-foreground">No payments</li>
                  ) : (
                    open.payments.map((p) => (
                      <li key={p.id} className="flex justify-between">
                        <span>
                          {p.id} · {p.date}
                        </span>
                        <span className="font-semibold">
                          {money(p.amount)} · {p.status}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  "Send reminder",
                  "Create invoice",
                  "Add credit",
                  "Refund",
                  "Pause subscription",
                  "Cancel subscription",
                  "Change plan",
                ].map((a) => (
                  <Button key={a} size="sm" variant="secondary" onClick={() => act(a)}>
                    {a}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>
    </Page>
  );
}
