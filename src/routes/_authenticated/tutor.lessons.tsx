import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/AppShell";
import { PageHeader, Section } from "@/components/kit";
import { TUTOR_LESSONS } from "@/lib/demo-data";
import { LessonCard } from "./tutor.dashboard";

export const Route = createFileRoute("/_authenticated/tutor/lessons")({
  head: () => ({
    meta: [
      { title: "My Lessons — ProgressTutors" },
      { name: "description", content: "Every upcoming lesson: when, where, who you teach and sign-in status." },
      { property: "og:title", content: "My Lessons — ProgressTutors" },
      { property: "og:description", content: "Your teaching schedule with sign-in and GoProgress links." },
    ],
  }),
  component: TutorLessons,
});

function TutorLessons() {
  const days = Array.from(new Set(TUTOR_LESSONS.map((l) => l.dayLabel)));
  return (
    <Page>
      <PageHeader title="My Lessons" subtitle="Where you teach and who you teach" />
      {days.map((d) => (
        <Section key={d} id={`lessons-${d}`} title={d} subtitle={`${TUTOR_LESSONS.filter((l) => l.dayLabel === d).length} lessons`}>
          <ul className="space-y-3">
            {TUTOR_LESSONS.filter((l) => l.dayLabel === d).map((l) => (
              <LessonCard key={l.id} lessonId={l.id} />
            ))}
          </ul>
        </Section>
      ))}
    </Page>
  );
}
