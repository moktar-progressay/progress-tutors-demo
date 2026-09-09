import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { ActingPicker } from "@/components/acting-picker";
import { Empty, PageHeader, Pill, Section } from "@/components/kit";
import { useActingId } from "@/lib/acting";
import { fullName, hhmm, prettyDate, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/tutor/lessons")({
  head: () => ({
    meta: [
      { title: "My Lessons — ProgressTutors" },
      { name: "description", content: "Every session assigned to you, with sign-in and review status." },
      { property: "og:title", content: "My Lessons — ProgressTutors" },
      { property: "og:description", content: "Tutor lesson list with sign-in and review status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TutorLessons,
});

function TutorLessons() {
  const [tutorId, setTutorId] = useActingId("tutor");
  const tutors = useTable("tutors", "first_name");
  const sessions = useTable("sessions", "session_date");
  const classes = useTable("classes");
  const signins = useTable("tutor_signins");
  const reviews = useTable("lesson_reviews");

  const mine = (sessions.data ?? []).filter((s) => s.tutor_id === tutorId);

  return (
    <Page>
      <PageHeader title="My lessons" subtitle="Sign-ins and reviews are shared with the office in real time" />

      <ActingPicker
        label="I am"
        value={tutorId}
        onChange={setTutorId}
        options={(tutors.data ?? []).map((t) => ({ value: t.id, label: fullName(t) }))}
      />

      <Section id="tutor-lessons" title="Sessions" subtitle={`${mine.length} in total`}>
        {mine.length === 0 ? (
          <Empty>No sessions yet. Admin opens registers from the Operations page.</Empty>
        ) : (
          <ul className="space-y-2">
            {mine.map((s) => {
              const c = (classes.data ?? []).find((x) => x.id === s.class_id);
              const signed = (signins.data ?? []).some((x) => x.session_id === s.id);
              const reviewed = (reviews.data ?? []).some((r) => r.session_id === s.id);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{c?.name ?? "Session"}</p>
                    <p className="text-xs text-muted-foreground">
                      {prettyDate(s.session_date)} · {hhmm(s.start_time)}–{hhmm(s.end_time)}
                    </p>
                  </div>
                  <Pill tone={signed ? "green" : "neutral"}>{signed ? "Signed in" : "Not signed in"}</Pill>
                  <Pill tone={reviewed ? "green" : "amber"}>{reviewed ? "Reviewed" : "Review due"}</Pill>
                  <Link
                    to="/tutor/lesson/$id"
                    params={{ id: s.id }}
                    className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                  >
                    Open
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </Page>
  );
}
