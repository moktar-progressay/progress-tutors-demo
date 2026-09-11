import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fullName, money, num, prettyDate, useTable, useUpdateRow } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/payment-requests")({
  head: () => ({
    meta: [
      { title: "Payment Requests — ProgressTutors" },
      {
        name: "description",
        content: "Review, approve, query and mark paid the payment requests tutors submit.",
      },
      { property: "og:title", content: "Payment Requests — ProgressTutors" },
      { property: "og:description", content: "Approve and pay tutor payment requests." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPaymentRequests,
});

const tone = (s: string) =>
  s === "approved"
    ? "green"
    : s === "paid"
      ? "blue"
      : s === "queried"
        ? "amber"
        : s === "rejected"
          ? "pink"
          : "purple";

function AdminPaymentRequests() {
  const requests = useTable("payment_requests", "submitted_at");
  const items = useTable("payment_request_items");
  const tutors = useTable("tutors");
  const sessions = useTable("sessions");
  const classes = useTable("classes");
  const update = useUpdateRow("payment_requests", ["tutor_earnings"]);
  const updateEarning = useUpdateRow("tutor_earnings");
  const earnings = useTable("tutor_earnings");

  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = (requests.data ?? []).filter((r) => {
    const t = (tutors.data ?? []).find((x) => x.id === r.tutor_id);
    return (
      q === "" || `${fullName(t)} ${r.reference ?? ""}`.toLowerCase().includes(q.toLowerCase())
    );
  });

  const submitted = rows.filter((r) => r.status === "submitted");
  const approved = rows.filter((r) => r.status === "approved");
  const paid = rows.filter((r) => r.status === "paid");

  async function decide(id: string, status: string) {
    await update.mutateAsync({ id, values: { status, decided_at: new Date().toISOString() } });
    const linked = (earnings.data ?? []).filter((e) => e.payment_request_id === id);
    await Promise.all(
      linked.map((e) =>
        updateEarning.mutateAsync({
          id: e.id,
          values: {
            status: status === "paid" ? "paid" : status === "approved" ? "approved" : "eligible",
          },
        }),
      ),
    );
    toast.success(`Request marked ${status}`);
  }

  return (
    <Page>
      <PageHeader
        title="Payments"
        subtitle="Collect from families and manage tutor payouts in one place."
      />

      <div className="flex gap-1 rounded-xl bg-muted p-1">
        <Link
          to="/admin/payments"
          className="flex-1 rounded-lg px-4 py-2 text-center text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          Client payments
        </Link>
        <span className="flex-1 rounded-lg bg-card px-4 py-2 text-center text-sm font-bold text-primary shadow-sm">
          Tutor payouts
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Waiting" value={String(submitted.length)} tone="amber" />
        <StatCard label="Approved" value={String(approved.length)} tone="green" />
        <StatCard label="Paid" value={String(paid.length)} tone="blue" />
        <StatCard
          label="Value waiting"
          value={money(submitted.reduce((a, r) => a + num(r.total_amount), 0))}
          tone="pink"
        />
      </div>

      <Section id="pr-list" title="All requests">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by tutor or reference"
          className="mb-3 h-10 max-w-sm rounded-xl"
        />
        {rows.length === 0 ? (
          <Empty>No payment requests have been submitted yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const t = (tutors.data ?? []).find((x) => x.id === r.tutor_id);
              const lines = (items.data ?? []).filter((i) => i.payment_request_id === r.id);
              const open = expanded === r.id;
              return (
                <li key={r.id} className="rounded-2xl border border-border px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setExpanded(open ? null : r.id)}
                    >
                      <p className="text-sm font-bold">
                        {r.reference ?? "Request"} · {fullName(t)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lines.length} lessons · {num(r.total_hours)} hours · submitted{" "}
                        {prettyDate(r.submitted_at.slice(0, 10))}
                      </p>
                    </button>
                    <span className="font-bold">{money(r.total_amount)}</span>
                    <Pill tone={tone(r.status)}>{r.status}</Pill>
                    {r.status === "submitted" ? (
                      <>
                        <Button size="sm" onClick={() => decide(r.id, "approved")}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => decide(r.id, "queried")}
                        >
                          Query
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => decide(r.id, "rejected")}>
                          Reject
                        </Button>
                      </>
                    ) : null}
                    {r.status === "approved" ? (
                      <Button size="sm" onClick={() => decide(r.id, "paid")}>
                        Mark paid
                      </Button>
                    ) : null}
                  </div>
                  {open ? (
                    <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                      {lines.length === 0 ? (
                        <li className="text-xs text-muted-foreground">No line detail recorded.</li>
                      ) : (
                        lines.map((l) => {
                          const s = (sessions.data ?? []).find((x) => x.id === l.session_id);
                          const c = (classes.data ?? []).find((x) => x.id === s?.class_id);
                          return (
                            <li key={l.id} className="flex flex-wrap gap-2">
                              <span className="min-w-0 flex-1">
                                {s ? prettyDate(s.session_date) : "—"} ·{" "}
                                {c?.name ?? l.description ?? "Session"}
                              </span>
                              <span>{num(l.hours)}h</span>
                              <span className="font-semibold">{money(l.amount)}</span>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </Page>
  );
}
