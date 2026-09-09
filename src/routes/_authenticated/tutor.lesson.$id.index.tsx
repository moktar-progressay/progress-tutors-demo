import { createFileRoute, Link } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { GoProgressLink, PageHeader, Pill, Section } from "@/components/kit";
import { SessionRegister } from "@/components/session-register";
import { hhmm, money, prettyDate, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/tutor/lesson/$id/")({
  head: () => ({
    meta: [
      { title: "Lesson — ProgressTutors" },
      { name: "description", content: "Sign in, take the register and submit your lesson review." },
      { property: "og:title", content: "Lesson — ProgressTutors" },
      { property: "og:description", content: "Live lesson register for tutors." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TutorLesson;
});

function TutorLesson() {
  const { id } = Route.useParams();
  const sessions = useTable("sessions");
  const classes = useTable("classes");
  const sites = useTable("sites");
  const reviews = useTable("lesson_reviews");

  const s = (sessions.data ?? []).find((x) => x.id === id);
  if (!s) {
    return (
      <Page>
        <PageHeader title="Lesson not found" subtitle="It may not have been opened yet." />
        <Link to="/tutor/lessons" className="text-sm font-bold text-primary">
          Back to my lessons
        </Link>
      </Page>
    );
  }

  const c = (classes.data ?? []).find((x) => x.id === s.class_id);
  const site = (sites.data ?? []).find((x) => x.id === s.site_id);
  const review = (reviews.data ?? []).find((r) => r.session_id === s.id);

  return (
    <Page>
      <PageHeader
        breadcrumb={
          <Link to="/tutor/lessons" className="hover:text-primary">
            My lessons
          </Link>
        }
        title={c?.name ?? "Lesson"}
        subtitle={`${prettyDate(s.session_date)} · ${hhmm(s.start_time)}–${hhmm(s.end_time)} · ${
          site?.name ?? "Venue to confirm"
        }`}
        actions={
          <Link
            to="/tutor/lesson/$id/review"
            params={{ id: s.id }}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            {review ? "Edit review" : "Write review"}
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="purple">Agreed pay {money(s.agreed_amount ?? c?.session_rate)}</Pill>
        <Pill tone={review ? "green" : "amber"}>{review ? "Review submitted" : "Review outstanding"}</Pill>
        <GoProgressLink label="GoProgress course" />
      </div>

      <Section id="lesson-register" title="Register" subtitle="Saved instantly to the shared database">
        <SessionRegister session={s} />
      </Section>
    </Page>
  );
}
