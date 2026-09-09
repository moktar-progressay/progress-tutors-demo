import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { ActingPicker } from "@/components/acting-picker";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { useActingId } from "@/lib/acting";
import {
  fullName,
  money,
  num,
  prettyDate,
  useTable,
  useUpdateRow,
  useUpsert,
} from "@/lib/db";

export const Route = createFileRoute("/_authenticated/tutor/payment-requests")({
  head: () => ({
    meta: [
      { title: "My Payment Requests — ProgressTutors" },
      { name: "description", content: "Claim your reviewed sessions in one request and track the office decision." },
      { property: "og:title", content: "My Payment Requests — ProgressTutors" },
      { property: "og:description", content: "Submit and track tutor payment requests." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TutorPaymentRequests,
});

const tone = (s: string) =>
  s === "approved" ? "green" : s === "paid" ? "blue" : s === "queried" ? "amber" : s === "rejected" ? "pink" : "purple";

function TutorPaymentRequests() {
  const [tutorId, setTutorId] = useActingId("tutor");
  const tutors = useTable("tutors", "first_name");
  const earnings = useTable("tutor_earnings", "earning_date");
  const classes = useTable("classes");
  const requests = useTable("payment_requests", "submitted_at");

  const createRequest = useUpsert("payment_requests");
  const createItems = useUpsert("payment_request_items", ["payment_requests"]);
  const updateEarning = useUpdateRow("tutor_earnings");

  const mine = (earnings.data ?? []).filter((e) => e.tutor_id === tutorId);
  const eligible = mine.filter((e) => e.status === "eligible");
  const amount = eligible.reduce((a, e) => a + num(e.amount), 0);
  const hours = eligible.reduce((a, e) => a + num(e.hours), 0);
  const myRequests = (requests.data ?? []).filter((r) => r.tutor_id === tutorId);

  async function submit() {
    if (eligible.length === 0) return;
    try {
      const [request] = await createRequest.mutateAsync({
        tutor_id: tutorId,
        reference: `PR-${Date.now().toString().slice(-6)}`,
        status: "submitted",
        total_amount: amount,
        total_hours: hours,
      });
      if (!request) return;
      await createItems.mutateAsync(
        eligible.map((e) => ({
          payment_request_id: request.id,
          tutor_earning_id: e.id,
          session_id: e.session_id,
          hours: num(e.hours),
          amount: num(e.amount),
          description: (classes.data ?? []).find((c) => c.id === e.class_id)?.name ?? null,
        })),
      );
      await Promise.all(
        eligible.map((e) =>
          updateEarning.mutateAsync({ id: e.id, values: { status: "claimed", payment_request_id: request.id } }),
        ),
      );
      toast.success("Payment Request submitted for approval");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit the request");
    }
  }

  return (
    <Page>
      <PageHeader title="Payment Requests" subtitle="Built from your signed-in, reviewed sessions" />

      <ActingPicker
        label="I am"
        value={tutorId}
        onChange={setTutorId}
        options={(tutors.data ?? []).map((t) => ({ value: t.id, label: fullName(t) }))}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Eligible sessions" value={String(eligible.length)} tone="pink" />
        <StatCard label="Hours" value={String(hours)} tone="blue" />
        <StatCard label="Draft total" value={money(amount)} tone="green" />
        <StatCard label="Requests sent" value={String(myRequests.length)} tone="purple" />
      </div>

      <Section id="draft-pr" title="Draft request" subtitle="Only reviewed sessions with a sign-in are included">
        {eligible.length === 0 ? (
          <Empty>Nothing eligible right now. Finish your lesson reviews to build a new request.</Empty>
        ) : (
          <>
            <ul className="space-y-2">
              {eligible.map((e) => {
                const c = (classes.data ?? []).find((x) => x.id === e.class_id);
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-2">
                    <span className="min-w-0 flex-1 text-sm font-semibold">{c?.name ?? "Session"}</span>
                    <span className="text-xs text-muted-foreground">{prettyDate(e.earning_date)}</span>
                    <span className="font-bold">{money(e.amount)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm font-bold">
                {eligible.length} sessions · {hours} hours · {money(amount)}
              </p>
              <Button onClick={submit} disabled={createRequest.isPending}>
                Submit Payment Request
              </Button>
            </div>
          </>
        )}
      </Section>

      <Section id="my-prs" title="My requests" subtitle="Status updates as the office reviews them">
        {myRequests.length === 0 ? (
          <Empty>You have not submitted a request yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {myRequests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3">
                <span className="font-bold">{r.reference ?? "Request"}</span>
                <span className="text-sm text-muted-foreground">
                  {num(r.total_hours)} hours · submitted {prettyDate(r.submitted_at.slice(0, 10))}
                </span>
                <span className="ml-auto font-bold">{money(r.total_amount)}</span>
                <Pill tone={tone(r.status)}>{r.status}</Pill>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Page>
  );
}
