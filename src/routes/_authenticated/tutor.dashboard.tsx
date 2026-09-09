import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { ActingPicker } from "@/components/acting-picker";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { useActingId } from "@/lib/acting";
import { DEMO_DATE, fullName, hhmm, money, num, prettyDate, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/tutor/dashboard")({
  head: () => ({
    meta: [
      { title: "Tutor Dashboard — ProgressTutors" },
      { name: "description", content: "Your classes, upcoming sessions, reviews still owed and pay to date." },
      { property: "og:title", content: "Tutor Dashboard — ProgressTutors" },
      { property: "og:description", content: "Tutor view of classes, sessions and pay." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TutorDashboard,
});

function TutorDashboard() {
  const [tutorId, setTutorId] = useActingId("tutor");
  const tutors = useTable("tutors", "first_name");
  const classes = useTable("classes");
  const sites = useTable("sites");
  const sessions = useTable("sessions", "session_date");
  const reviews = useTable("lesson_reviews");
  const signins = useTable("tutor_signins");
  const earnings = useTable("tutor_earnings");
  const enrolments = useTable("class_enrolments");

  const me = (tutors.data ?? []).find((t) => t.id === tutorId);
  const myClasses = (classes.data ?? []).filter((c) => c.tutor_id === tutorId);
  const mySessions = (sessions.data ?? []).filter((s) => s.tutor_id === tutorId);
  const upcoming = mySessions.filter((s) => s.session_date >= DEMO_DATE);
  const owedReviews = mySessions.filter(
    (s) =>
      (signins.data ?? []).some((x) => x.session_id === s.id) &&
      !(reviews.data ?? []).some((r) => r.session_id === s.id),
  );
  const myEarnings = (earnings.data ?? []).filter((e) => e.tutor_id === tutorId);
  const paid = myEarnings.filter((e) => e.status === "paid").reduce((a, e) => a + num(e.amount), 0);

  return (
    <Page>
      <PageHeader title={me ? `Hello, ${me.first_name}` : "Tutor"} subtitle="Shared operational demo · Live data" />

      <ActingPicker
        label="I am"
        value={tutorId}
        onChange={setTutorId}
        options={(tutors.data ?? []).map((t) => ({ value: t.id, label: fullName(t) }))}
      />

      {!tutorId ? (
        <Section id="tutor-pick" title="Choose your name">
          <Empty>Pick your name above to see your classes. Admins add tutors on the Tutors page.</Empty>
        </Section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="My classes" value={String(myClasses.length)} tone="pink" />
            <StatCard label="Upcoming sessions" value={String(upcoming.length)} tone="blue" />
            <StatCard label="Reviews to write" value={String(owedReviews.length)} tone="amber" />
            <StatCard label="Paid to date" value={money(paid)} tone="green" />
          </div>

          <Section id="tutor-classes" title="My classes">
            {myClasses.length === 0 ? (
              <Empty>No classes assigned to you yet.</Empty>
            ) : (
              <ul className="space-y-2">
                {myClasses.map((c) => {
                  const site = (sites.data ?? []).find((s) => s.id === c.site_id);
                  const count = (enrolments.data ?? []).filter(
                    (e) => e.class_id === c.id && e.status === "active",
                  ).length;
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.weekday} {hhmm(c.start_time)}–{hhmm(c.end_time)} · {site?.name ?? "Venue to confirm"}
                        </p>
                      </div>
                      <Pill tone="blue">{count} students</Pill>
                      <Pill tone="purple">{money(c.session_rate)} agreed</Pill>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section id="tutor-next" title="Next sessions">
            {upcoming.length === 0 ? (
              <Empty>Nothing scheduled yet — admin opens registers on the day.</Empty>
            ) : (
              <ul className="space-y-2">
                {upcoming.slice(0, 8).map((s) => {
                  const c = (classes.data ?? []).find((x) => x.id === s.class_id);
                  return (
                    <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">{c?.name ?? "Session"}</p>
                        <p className="text-xs text-muted-foreground">
                          {prettyDate(s.session_date)} · {hhmm(s.start_time)}–{hhmm(s.end_time)}
                        </p>
                      </div>
                      <Link
                        to="/tutor/lesson/$id"
                        params={{ id: s.id }}
                        className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                      >
                        Open lesson
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </>
      )}
    </Page>
  );
}
