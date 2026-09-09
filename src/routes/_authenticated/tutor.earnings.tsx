import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { DELIVERED_LESSONS, money } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/_authenticated/tutor/earnings")({
  head: () => ({
    meta: [
      { title: "Earnings — ProgressTutors" },
      { name: "description", content: "Tutor earnings: delivered lessons, eligible pay, approved and paid amounts." },
      { property: "og:title", content: "Earnings — ProgressTutors" },
      { property: "og:description", content: "See what you have earned and what is ready to request." },
    ],
  }),
  component: Earnings,
});

function Earnings() {
  const { eligibleLessons, awaitingReview, deliveredReviewed } = useDemo();
  const ready = eligibleLessons.reduce((a, l) => a + l.rate * l.hours, 0);

  return (
    <Page>
      <PageHeader title="Earnings" subtitle="September · Sarah Ahmed" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Earned this month" value={money(420)} tone="green" />
        <StatCard label="Ready to request" value={money(ready)} tone="pink" />
        <StatCard label="Awaiting Lesson Reviews" value={money(awaitingReview.length * 25)} tone="amber" />
        <StatCard label="Approved" value={money(125)} tone="blue" />
      </div>

      <Section id="earn-lessons" title="Delivered lessons" subtitle="Verified with sign-in and review status">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                {["Date", "Student / Class", "Scheduled", "Sign-in", "Review", "GoProgress", "Amount"].map((h) => (
                  <th key={h} className="pb-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DELIVERED_LESSONS.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="py-3">{l.date}</td>
                  <td className="py-3">
                    <span className="block font-semibold">{l.who}</span>
                    <span className="block text-xs text-muted-foreground">{l.classLabel}</span>
                  </td>
                  <td className="py-3">{l.scheduled}</td>
                  <td className="py-3">{l.signIn}</td>
                  <td className="py-3">
                    {deliveredReviewed[l.id] ? (
                      <Pill tone="green">Complete</Pill>
                    ) : (
                      <Button size="sm" variant="secondary" asChild>
                        <Link to="/tutor/lesson/$id/review" params={{ id: l.id }}>
                          Write review
                        </Link>
                      </Button>
                    )}
                  </td>
                  <td className="py-3">
                    <Pill tone={l.goprogress === "Synced" ? "blue" : "amber"}>{l.goprogress}</Pill>
                  </td>
                  <td className="py-3 font-bold">{money(l.rate * l.hours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button className="mt-4" asChild>
          <Link to="/tutor/payment-requests">Go to Payment Requests</Link>
        </Button>
      </Section>
    </Page>
  );
}
