import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, CircleHelp, Filter, WalletCards, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { FilterDialog } from "@/components/filter-dialog";
import { Avatar, Empty, PageHeader, Pill, Section, StatCard, avatarTone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fullName, initialsOf, money, num, prettyDate, useTable, useUpdateRow } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/payment-requests")({
  head: () => ({
    meta: [
      { title: "Payment Requests - ProgressTutors" },
      {
        name: "description",
        content: "Review, approve, query and mark paid the payment requests tutors submit.",
      },
      { property: "og:title", content: "Payment Requests - ProgressTutors" },
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

const statusLabel = (status: string) =>
  status === "submitted"
    ? "Needs review"
    : status === "approved"
      ? "Approved"
      : status === "paid"
        ? "Paid"
        : status === "queried"
          ? "Query sent"
          : status === "rejected"
            ? "Declined"
            : status;

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
  const [status, setStatus] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = (requests.data ?? []).filter((r) => {
    const t = (tutors.data ?? []).find((x) => x.id === r.tutor_id);
    const matchesQuery =
      q === "" || `${fullName(t)} ${r.reference ?? ""}`.toLowerCase().includes(q.toLowerCase());
    return matchesQuery && (status === "all" || r.status === status);
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
        subtitle="Manage money coming in from parents and requests from tutors."
      />

      <div className="flex gap-1 rounded-xl bg-muted p-1">
        <Link
          to="/admin/payments"
          className="flex-1 rounded-lg px-4 py-2 text-center text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          Parent payments
        </Link>
        <span className="flex-1 rounded-lg bg-card px-4 py-2 text-center text-sm font-bold text-primary shadow-sm">
          Tutor requests
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Needs review" value={String(submitted.length)} tone="amber" />
        <StatCard label="Approved" value={String(approved.length)} tone="green" />
        <StatCard label="Paid" value={String(paid.length)} tone="blue" />
        <StatCard
          label="Requested value"
          value={money(submitted.reduce((a, r) => a + num(r.total_amount), 0))}
          tone="pink"
        />
      </div>

      <Section
        id="pr-list"
        title="Tutor payment requests"
        subtitle="Review each request, approve it, then mark it paid"
        action={
          <Button size="sm" variant="secondary" onClick={() => setFiltersOpen(true)}>
            <Filter className="h-4 w-4" /> Filters
            {q || status !== "all" ? <span>1</span> : null}
          </Button>
        }
      >
        {rows.length === 0 ? (
          <Empty>No payment requests have been submitted yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const t = (tutors.data ?? []).find((x) => x.id === r.tutor_id);
              const lines = (items.data ?? []).filter((i) => i.payment_request_id === r.id);
              const open = expanded === r.id;
              return (
                <li key={r.id} className="rounded-2xl border border-border p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    {t ? (
                      <Link
                        to="/admin/tutors/$id"
                        params={{ id: t.id }}
                        aria-label={`Open ${fullName(t)}'s tutor page`}
                      >
                        <Avatar initials={initialsOf(fullName(t))} tone={avatarTone(fullName(t))} />
                      </Link>
                    ) : (
                      <Avatar initials={initialsOf(fullName(t))} tone={avatarTone(fullName(t))} />
                    )}
                    <div className="min-w-0 flex-1">
                      {t ? (
                        <Link
                          to="/admin/tutors/$id"
                          params={{ id: t.id }}
                          className="text-sm font-bold hover:text-primary"
                        >
                          {fullName(t)}
                        </Link>
                      ) : (
                        <p className="text-sm font-bold">{fullName(t)}</p>
                      )}
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() => setExpanded(open ? null : r.id)}
                      >
                        <p className="text-xs text-muted-foreground">
                          {r.reference ?? "Payment request"} · submitted{" "}
                          {prettyDate(r.submitted_at.slice(0, 10))}
                        </p>
                        <p className="mt-1 text-xs font-semibold">
                          {lines.length} lessons · {num(r.total_hours)} hours
                        </p>
                      </button>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-extrabold">{money(r.total_amount)}</p>
                      <Pill tone={tone(r.status)} className="mt-1">
                        {statusLabel(r.status)}
                      </Pill>
                    </div>
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
                                {s ? prettyDate(s.session_date) : "Date unavailable"} ·{" "}
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
                  {r.status === "submitted" ? (
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
                      <Button size="sm" onClick={() => decide(r.id, "approved")}>
                        <Check className="h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => decide(r.id, "queried")}>
                        <CircleHelp className="h-4 w-4" /> Query
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => decide(r.id, "rejected")}>
                        <X className="h-4 w-4" /> Decline
                      </Button>
                    </div>
                  ) : null}
                  {r.status === "approved" ? (
                    <div className="mt-3 flex justify-end border-t border-border pt-3">
                      <Button size="sm" onClick={() => decide(r.id, "paid")}>
                        <WalletCards className="h-4 w-4" /> Mark paid
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <FilterDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filter tutor requests"
        description={`${rows.length} request${rows.length === 1 ? "" : "s"} match these filters.`}
        onClear={() => {
          setQ("");
          setStatus("all");
        }}
      >
        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-xs font-bold text-muted-foreground">Search</span>
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Tutor or reference"
            className="h-10 rounded-xl"
          />
        </label>
        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-xs font-bold text-muted-foreground">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm font-medium"
          >
            <option value="all">All statuses</option>
            <option value="submitted">Needs review</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="queried">Query sent</option>
            <option value="rejected">Declined</option>
          </select>
        </label>
      </FilterDialog>
    </Page>
  );
}
