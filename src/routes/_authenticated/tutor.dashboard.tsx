import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Avatar, GoProgressLink, Hero, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { TUTOR_LESSONS, money } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/_authenticated/tutor/dashboard")({
  head: () => ({
    meta: [
      { title: "Tutor Dashboard — ProgressTutors" },
      {
        name: "description",
        content: "Know where you teach, who you teach, sign in to lessons and see what you're owed.",
      },
      { property: "og:title", content: "Tutor Dashboard — ProgressTutors" },
      { property: "og:description", content: "Today's lessons, reviews due and earnings for tutors." },
    ],
  }),
  component: TutorDashboard,
});

export function LessonCard({ lessonId }: { lessonId: string }) {
  const { signedIn, signIn } = useDemo();
  const l = TUTOR_LESSONS.find((x) => x.id === lessonId);
  if (!l) return null;
  const active = signedIn[l.id];

  return (
    <li className={`rounded-2xl border p-4 ${active ? "border-primary bg-tile-pink/50" : "border-border"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-extrabold">{l.title}</p>
          <p className="text-sm text-muted-foreground">
            {l.studentId ? "Aisha Khan" : `${l.groupCount} students`} · {l.location}
          </p>
          <p className="mt-1 text-sm font-semibold">
            {l.dayLabel} {l.start}–{l.end}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Pill tone={l.studentId ? "blue" : "purple"}>{l.studentId ? "1-to-1" : "Group"}</Pill>
          <GoProgressLink />
        </div>
      </div>

      {active ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Pill tone="green">● Lesson active · signed in at {active}</Pill>
          <Button size="sm" asChild>
            <Link to="/tutor/lesson/$id/review" params={{ id: l.id }}>
              End Lesson & Review
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => {
              signIn(l.id);
              toast.success("Signed in — tutor attendance recorded");
            }}
          >
            Sign In
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <Link to="/tutor/lesson/$id" params={{ id: l.id }}>
              View Lesson
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href="https://goprogress.example.com" target="_blank" rel="noreferrer">
              Open GoProgress
            </a>
          </Button>
        </div>
      )}
    </li>
  );
}

function TutorDashboard() {
  const { eligibleLessons, awaitingReview } = useDemo();
  const ready = eligibleLessons.reduce((a, l) => a + l.rate * l.hours, 0);
  const today = TUTOR_LESSONS.filter((l) => l.dayLabel === "Today");

  return (
    <>
      <Hero
        title="Good afternoon, Sarah 👋"
        subtitle="Know where to teach, who to teach and what you're owed."
      />

      <Page className="-mt-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Today's Lessons" value={String(today.length)} tone="pink" />
          <StatCard label="Reviews Due" value={String(awaitingReview.length)} tone="amber" />
          <StatCard label="Ready to Request" value={money(ready)} tone="green" />
          <StatCard label="Earned This Month" value={money(420)} tone="blue" />
        </div>

        {awaitingReview.length > 0 ? (
          <Section id="action-required" title="Action Required" subtitle="Lesson Review required">
            <div className="space-y-2">
              {awaitingReview.map((l) => (
                <div
                  key={l.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl bg-tile-amber px-4 py-3 text-tile-amber-ink"
                >
                  <div className="flex-1">
                    <p className="text-sm font-bold">
                      {l.who} · {l.date}
                    </p>
                    <p className="text-xs">
                      Complete this review to make the lesson eligible for payment. {l.classLabel}
                    </p>
                  </div>
                  <Button size="sm" asChild>
                    <Link to="/tutor/lesson/$id/review" params={{ id: l.id }}>
                      Write Review
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        <Section id="today-lessons" title="Today's Lessons" subtitle="Sign in to record your attendance">
          <ul className="space-y-3">
            {today.map((l) => (
              <LessonCard key={l.id} lessonId={l.id} />
            ))}
          </ul>
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section id="tutor-earnings" title="Earnings" subtitle="This month">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Earned" value={money(420)} tone="green" />
              <StatCard label="Ready to request" value={money(ready)} tone="pink" />
              <StatCard label="Awaiting Lesson Reviews" value={money(120)} tone="amber" />
              <StatCard label="Approved" value={money(125)} tone="blue" />
            </div>
            <div className="mt-3 flex gap-2">
              <Button asChild>
                <Link to="/tutor/payment-requests">Submit Payment Request</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/tutor/earnings">View earnings</Link>
              </Button>
            </div>
          </Section>

          <Section id="tutor-students" title="Who you teach" subtitle="1-to-1 students and group classes">
            <ul className="space-y-2">
              {[
                { n: "Aisha Khan", d: "GCSE Maths · 1-to-1 · Online", i: "AK" },
                { n: "GCSE English", d: "Group · 9 students · Lancaster Youth Hub", i: "GE" },
                { n: "GCSE Maths Booster", d: "Group · 8 students · Lancaster Youth Hub", i: "MB" },
                { n: "Mia Patel", d: "GCSE Maths · 1-to-1 · Lancaster Youth Hub", i: "MP" },
              ].map((s) => (
                <li key={s.n} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
                  <Avatar initials={s.i} size="sm" tone="purple" />
                  <span>
                    <span className="block text-sm font-bold">{s.n}</span>
                    <span className="block text-xs text-muted-foreground">{s.d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </Page>
    </>
  );
}
