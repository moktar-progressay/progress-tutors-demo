import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { PageHeader, Section } from "@/components/kit";
import { TextAreaField } from "@/components/form-kit";
import { Button } from "@/components/ui/button";
import { hhmm, prettyDate, useTable, useUpdateRow, useUpsert } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/tutor/lesson/$id/review")({
  head: () => ({
    meta: [
      { title: "Lesson Review — ProgressTutors" },
      { name: "description", content: "Record what was covered, progress made, next steps and any concerns." },
      { property: "og:title", content: "Lesson Review — ProgressTutors" },
      { property: "og:description", content: "Submit a lesson review after teaching." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LessonReview,
});

function LessonReview() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const sessions = useTable("sessions");
  const classes = useTable("classes");
  const reviews = useTable("lesson_reviews");
  const create = useUpsert("lesson_reviews");
  const update = useUpdateRow("lesson_reviews");

  const s = (sessions.data ?? []).find((x) => x.id === id);
  const existing = (reviews.data ?? []).find((r) => r.session_id === id);
  const c = (classes.data ?? []).find((x) => x.id === s?.class_id);

  const [covered, setCovered] = useState(existing?.covered ?? "");
  const [progress, setProgress] = useState(existing?.progress_note ?? "");
  const [next, setNext] = useState(existing?.next_steps ?? "");
  const [concerns, setConcerns] = useState(existing?.concerns ?? "");

  if (!s) {
    return (
      <Page>
        <PageHeader title="Lesson not found" />
        <Link to="/tutor/lessons" className="text-sm font-bold text-primary">
          Back to my lessons
        </Link>
      </Page>
    );
  }

  async function save() {
    const values = {
      covered: covered || null,
      progress_note: progress || null,
      next_steps: next || null,
      concerns: concerns || null,
    };
    try {
      if (existing) await update.mutateAsync({ id: existing.id, values });
      else await create.mutateAsync({ session_id: s!.id, tutor_id: s!.tutor_id, ...values });
      toast.success("Review saved — this unlocks pay for the session");
      navigate({ to: "/tutor/lesson/$id", params: { id: s!.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the review");
    }
  }

  return (
    <Page>
      <PageHeader
        breadcrumb={
          <Link to="/tutor/lesson/$id" params={{ id: s.id }} className="hover:text-primary">
            {c?.name ?? "Lesson"}
          </Link>
        }
        title="Lesson review"
        subtitle={`${prettyDate(s.session_date)} · ${hhmm(s.start_time)}–${hhmm(s.end_time)}`}
      />

      <Section id="review-form" title="What happened in the lesson?">
        <div className="grid gap-3">
          <TextAreaField label="Covered" value={covered} onChange={setCovered} placeholder="Topics and activities" />
          <TextAreaField label="Progress" value={progress} onChange={setProgress} placeholder="How the group did" />
          <TextAreaField label="Next steps" value={next} onChange={setNext} placeholder="Plan for next week" />
          <TextAreaField label="Concerns" value={concerns} onChange={setConcerns} placeholder="Anything the office should know" />
        </div>
        <Button className="mt-4" onClick={save} disabled={create.isPending || update.isPending}>
          Save review
        </Button>
      </Section>
    </Page>
  );
}
