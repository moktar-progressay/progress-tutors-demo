import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Avatar, Empty, PageHeader, Pill, Section, StatCard, type Tone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { PAYMENT_REQUESTS, money, tutor, type PRStatus } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/_authenticated/admin/payment-requests")({
  head: () => ({
    meta: [
      { title: "Payment Requests — ProgressTutors" },
      {
        name: "description",
        content: "Approve tutor Payment Requests built from verified lessons, sign-in times and lesson reviews.",
      },
      { property: "og:title", content: "Payment Requests — ProgressTutors" },
      { property: "og:description", content: "Review, approve, query or reject tutor pay in one place." },
    ],
  }),
  component: PaymentRequests,
});

const TABS = ["All", "Pending Review", "Approved", "Paid", "Rejected"] as const;

const tone = (s: PRStatus): Tone =>
  s === "Approved" ? "green" : s === "Paid" ? "blue" : s === "Rejected" ? "purple" : s === "On Hold" ? "amber" : "pink";

function PaymentRequests() {
  const { prStatus, setPrStatus } = useDemo();
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [openId, setOpenId] = useState<string | null>("PR-1042");

  const list = PAYMENT_REQUESTS.filter((p) => tab === "All" || prStatus[p.id] === tab);
  const open = PAYMENT_REQUESTS.find((p) => p.id === openId);
  const openStatus = open ? (prStatus[open.id] ?? open.status) : undefined;

  const total = (s: PRStatus) =>
    PAYMENT_REQUESTS.filter((p) => prStatus[p.id] === s).reduce((a, p) => a + p.amount, 0);

  return (
    <Page>
      <PageHeader
        title="Payment Requests"
        subtitle="Tutor pay generated from completed, verified lessons"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total Requested" value={money(PAYMENT_REQUESTS.reduce((a, p) => a + p.amount, 0))} tone="pink" />
        <StatCard label="Pending Review" value={money(total("Pending Review"))} tone="amber" />
        <StatCard label="Approved" value={money(total("Approved"))} tone="green" />
        <StatCard label="Paid" value={money(total("Paid"))} tone="blue" />
        <StatCard label="On Hold" value={money(total("On Hold"))} tone="purple" />
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

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Section id="pr-table" title="Requests" subtitle={`${list.length} shown`}>
          {list.length === 0 ? (
            <Empty>No Payment Requests with this status.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    {["Request ID", "Tutor", "Lessons", "Hours", "Amount", "Status", ""].map((h) => (
                      <th key={h} className="pb-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => {
                    const t = tutor(p.tutorId);
                    const st = prStatus[p.id] ?? p.status;
                    return (
                      <tr key={p.id} className="border-t border-border">
                        <td className="py-3 font-semibold">{p.id}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Avatar initials={t?.initials ?? "?"} size="sm" />
                            {t?.name}
                          </div>
                        </td>
                        <td className="py-3">{p.lessons}</td>
                        <td className="py-3">{p.hours}</td>
                        <td className="py-3 font-bold">{money(p.amount)}</td>
                        <td className="py-3">
                          <Pill tone={tone(st)}>{st}</Pill>
                        </td>
                        <td className="py-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => setOpenId(p.id)}>
                            Open
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section
          id="pr-detail"
          title={open ? `Payment Request ${open.id}` : "Request detail"}
          subtitle={open ? `${tutor(open.tutorId)?.name} · ${open.lessons} verified lessons` : "Select a request"}
        >
          {!open || !openStatus ? (
            <Empty>Open a Payment Request to review its lessons.</Empty>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="Lessons" value={String(open.lessons)} tone="blue" />
                <StatCard label="Hours" value={String(open.hours)} tone="purple" />
                <StatCard label="Amount" value={money(open.amount)} tone="green" />
              </div>
              <Pill tone={tone(openStatus)}>{openStatus}</Pill>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-xs">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      {["Date", "Student / Class", "Scheduled", "Sign-in", "Review", "GoProgress", "Rate", "Amount"].map(
                        (h) => (
                          <th key={h} className="pb-2 font-semibold">
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {open.lines.map((l, i) => (
                      <tr key={`${l.lessonId}-${i}`} className="border-t border-border">
                        <td className="py-2">{l.date}</td>
                        <td className="py-2 font-semibold">{l.who}</td>
                        <td className="py-2">{l.scheduled}</td>
                        <td className="py-2">{l.signIn}</td>
                        <td className="py-2">
                          <Pill tone={l.review === "Complete" ? "green" : "amber"}>{l.review}</Pill>
                        </td>
                        <td className="py-2">
                          <Pill tone={l.goprogress === "Synced" ? "blue" : "amber"}>{l.goprogress}</Pill>
                        </td>
                        <td className="py-2">{money(l.rate)}</td>
                        <td className="py-2 font-bold">{money(l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setPrStatus(open.id, "Approved");
                    toast.success(`${open.id} approved`);
                  }}
                >
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPrStatus(open.id, "On Hold");
                    toast.success(`${open.id} queried with tutor`);
                  }}
                >
                  Query
                </Button>
                <Button variant="secondary" onClick={() => toast.success("Demo: adjust lines and amount")}>
                  Adjust
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPrStatus(open.id, "Rejected");
                    toast.success(`${open.id} rejected`);
                  }}
                >
                  Reject
                </Button>
                <Button variant="ghost" onClick={() => toast.success("Demo: message sent to tutor")}>
                  Message Tutor
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setPrStatus(open.id, "Paid");
                    toast.success(`${open.id} marked as paid`);
                  }}
                >
                  Mark Paid
                </Button>
              </div>
            </div>
          )}
        </Section>
      </div>
    </Page>
  );
}
