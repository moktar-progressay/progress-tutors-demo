import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { ActingPicker } from "@/components/acting-picker";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { useActingId } from "@/lib/acting";
import { fullName, money, num, prettyDate, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/tutor/earnings")({
  head: () => ({
    meta: [
      { title: "My Earnings - ProgressTutors" },
      {
        name: "description",
        content: "Session by session earnings at the agreed rate, and what has been paid.",
      },
      { property: "og:title", content: "My Earnings - ProgressTutors" },
      { property: "og:description", content: "Tutor earnings from completed lessons." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TutorEarnings,
});

const tone = (s: string) =>
  s === "paid" ? "blue" : s === "approved" ? "green" : s === "claimed" ? "purple" : "amber";

function TutorEarnings() {
  const [tutorId, setTutorId] = useActingId("tutor");
  const tutors = useTable("tutors", "first_name");
  const earnings = useTable("tutor_earnings", "earning_date");
  const classes = useTable("classes");

  const mine = (earnings.data ?? []).filter((e) => e.tutor_id === tutorId);
  const sum = (status: string) =>
    mine.filter((e) => e.status === status).reduce((a, e) => a + num(e.amount), 0);

  return (
    <Page>
      <PageHeader
        title="My earnings"
        subtitle="Based on the agreed amount for each completed lesson"
        actions={
          <Button asChild>
            <Link to="/tutor/payment-requests">Request payment</Link>
          </Button>
        }
      />

      <ActingPicker
        label="I am"
        value={tutorId}
        onChange={setTutorId}
        options={(tutors.data ?? []).map((t) => ({ value: t.id, label: fullName(t) }))}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Ready to claim" value={money(sum("eligible"))} tone="amber" />
        <StatCard label="In a request" value={money(sum("claimed"))} tone="purple" />
        <StatCard label="Approved" value={money(sum("approved"))} tone="green" />
        <StatCard label="Paid" value={money(sum("paid"))} tone="blue" />
      </div>

      <Section id="earnings-list" title="Session earnings">
        {mine.length === 0 ? (
          <Empty>
            Nothing yet. Earnings appear once you have signed in and submitted the lesson review.
          </Empty>
        ) : (
          <ul className="space-y-2">
            {mine.map((e) => {
              const c = (classes.data ?? []).find((x) => x.id === e.class_id);
              return (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{c?.name ?? "Lesson"}</p>
                    <p className="text-xs text-muted-foreground">
                      {prettyDate(e.earning_date)} · {num(e.hours)} hours at {money(e.agreed_rate)}
                    </p>
                  </div>
                  <span className="font-bold">{money(e.amount)}</span>
                  <Pill tone={tone(e.status)}>{e.status}</Pill>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </Page>
  );
}
