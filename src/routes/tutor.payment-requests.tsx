import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { DELIVERED_LESSONS, PAYMENT_REQUESTS, money } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/tutor/payment-requests")({
  head: () => ({
    meta: [
      { title: "My Payment Requests — ProgressTutors" },
      {
        name: "description",
        content: "A draft Payment Request is built automatically from your verified, reviewed lessons.",
      },
      { property: "og:title", content: "My Payment Requests — ProgressTutors" },
      { property: "og:description", content: "Submit and track tutor Payment Requests." },
    ],
  }),
  component: TutorPaymentRequests,
});

function TutorPaymentRequests() {
  const { eligibleLessons, tutorRequests, submitTutorRequest, prStatus } = useDemo();
  const amount = eligibleLessons.reduce((a, l) => a + l.rate * l.hours, 0);
  const hours = eligibleLessons.reduce((a, l) => a + l.hours, 0);
  const history = PAYMENT_REQUESTS.filter((p) => p.tutorId === "sarah-ahmed");

  return (
    <Page>
      <PageHeader title="Payment Requests" subtitle="Built automatically from your eligible lessons" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Eligible lessons" value={String(eligibleLessons.length)} tone="pink" />
        <StatCard label="Hours" value={String(hours)} tone="blue" />
        <StatCard label="Draft total" value={money(amount)} tone="green" />
        <StatCard label="Submitted" value={String(tutorRequests.length)} tone="purple" />
      </div>

      <Section id="draft-pr" title="Draft Payment Request" subtitle="Only reviewed, verified lessons are included">
        {eligibleLessons.length === 0 ? (
          <Empty>No eligible lessons right now. Complete your lesson reviews to build a new request.</Empty>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    {["Date", "Student / Class", "Scheduled", "Sign-in", "Review", "Rate", "Amount"].map((h) => (
                      <th key={h} className="pb-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eligibleLessons.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="py-3">{l.date}</td>
                      <td className="py-3 font-semibold">{l.who}</td>
                      <td className="py-3">{l.scheduled}</td>
                      <td className="py-3">{l.signIn}</td>
                      <td className="py-3">
                        <Pill tone="green">Complete</Pill>
                      </td>
                      <td className="py-3">{money(l.rate)}</td>
                      <td className="py-3 font-bold">{money(l.rate * l.hours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm font-bold">
                {eligibleLessons.length} eligible lessons · {hours} hours · {money(amount)}
              </p>
              <Button
                onClick={() => {
                  submitTutorRequest();
                  toast.success("Payment Request submitted for approval");
                }}
              >
                Submit Payment Request
              </Button>
            </div>
          </>
        )}
      </Section>

      <Section id="my-prs" title="My requests" subtitle="Status updates as admin reviews them">
        <ul className="space-y-2">
          {tutorRequests.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3">
              <span className="font-bold">{r.id}</span>
              <span className="text-sm text-muted-foreground">
                {r.lessonIds.length} lessons · {r.hours} hours
              </span>
              <span className="ml-auto font-bold">{money(r.amount)}</span>
              <Pill tone="amber">{r.status}</Pill>
            </li>
          ))}
          {history.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3">
              <span className="font-bold">{r.id}</span>
              <span className="text-sm text-muted-foreground">
                {r.lessons} lessons · {r.hours} hours · submitted {r.submitted}
              </span>
              <span className="ml-auto font-bold">{money(r.amount)}</span>
              <Pill
                tone={
                  (prStatus[r.id] ?? r.status) === "Approved"
                    ? "green"
                    : (prStatus[r.id] ?? r.status) === "Paid"
                      ? "blue"
                      : "amber"
                }
              >
                {prStatus[r.id] ?? r.status}
              </Pill>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Eligible lessons come from {DELIVERED_LESSONS.length} delivered lessons this period.
        </p>
      </Section>
    </Page>
  );
}
