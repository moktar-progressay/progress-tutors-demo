import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Avatar, Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { DELIVERED_LESSONS, STUDENTS, TUTOR_LESSONS, money } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/_authenticated/tutor/lesson/$id/")({
  head: () => ({
    meta: [
      { title: "Lesson — ProgressTutors" },
      { name: "description", content: "Lesson detail with register, sign-in time and GoProgress attendance." },
      { property: "og:title", content: "Lesson — ProgressTutors" },
      { property: "og:description", content: "Sign in, take the register and complete your lesson review." },
    ],
  }),
  component: LessonDetail,
});

function LessonDetail() {
  const { id } = Route.useParams();
  const { signedIn, signIn } = useDemo();
  const lesson = TUTOR_LESSONS.find((l) => l.id === id);
  const delivered = DELIVERED_LESSONS.find((l) => l.id === id);
  const active = signedIn[id];

  const title = lesson?.title ?? delivered?.who ?? "Lesson";
  const when = lesson ? `${lesson.dayLabel} ${lesson.start}–${lesson.end}` : (delivered?.scheduled ?? "");
  const where = lesson?.location ?? delivered?.classLabel ?? "";

  const roster = STUDENTS.slice(0, lesson?.groupCount ?? 4);

  return (
    <Page>
      <PageHeader
        breadcrumb={
          <span>
            <Link to="/tutor/lessons" className="hover:text-primary">
              My Lessons
            </Link>{" "}
            › <span className="text-foreground">{title}</span>
          </span>
        }
        title={title}
        subtitle={`${when} · ${where}`}
        actions={
          <>
            {active ? (
              <Pill tone="green">● Signed in at {active}</Pill>
            ) : (
              <Button
                onClick={() => {
                  signIn(id);
                  toast.success("Signed in — tutor attendance recorded");
                }}
              >
                Sign In
              </Button>
            )}
            <Button variant="secondary" asChild>
              <Link to="/tutor/lesson/$id/review" params={{ id }}>
                Lesson Review
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Scheduled" value={when} tone="blue" />
        <StatCard label="Sign-in" value={active ?? delivered?.signIn ?? "Not signed in"} tone="pink" />
        <StatCard label="Rate" value={`${money(lesson?.rate ?? delivered?.rate ?? 25)}/hr`} tone="green" />
        <StatCard label="GoProgress" value={delivered?.goprogress ?? "Ready"} tone="purple" />
      </div>

      <Section id="lesson-register" title="Register" subtitle="Attendance syncs to GoProgress">
        {lesson?.studentId || (!lesson && delivered) ? (
          <ul className="space-y-2">
            <li className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
              <Avatar initials="AK" size="sm" tone="purple" />
              <span className="flex-1 text-sm font-bold">Aisha Khan</span>
              <Pill tone="green">Present</Pill>
            </li>
          </ul>
        ) : roster.length ? (
          <ul className="space-y-2">
            {roster.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
                <Avatar initials={s.initials} size="sm" tone="purple" />
                <span className="flex-1 text-sm font-bold">{s.name}</span>
                <Pill tone={s.attendance > 85 ? "green" : "amber"}>
                  {s.attendance > 85 ? "Present" : "Late"}
                </Pill>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No register available for this lesson.</Empty>
        )}
      </Section>
    </Page>
  );
}
