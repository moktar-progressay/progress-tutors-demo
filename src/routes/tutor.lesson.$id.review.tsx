import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { PageHeader, Pill, Section } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DELIVERED_LESSONS, TUTOR_LESSONS } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/tutor/lesson/$id/review")({
  head: () => ({
    meta: [
      { title: "Lesson Review — ProgressTutors" },
      {
        name: "description",
        content: "Submit a lesson review so the lesson becomes eligible for payment.",
      },
      { property: "og:title", content: "Lesson Review — ProgressTutors" },
      { property: "og:description", content: "What went well, even better if, topics covered and homework set." },
    ],
  }),
  component: LessonReview,
});

const FIELDS = [
  { key: "well", label: "What went well?", placeholder: "Aisha confidently factorised quadratics…" },
  { key: "better", label: "Even better if?", placeholder: "More practice on completing the square…" },
  { key: "topics", label: "Topics covered", placeholder: "Quadratic equations, factorising, graph sketching" },
  { key: "homework", label: "Homework / next steps", placeholder: "Exam questions 4–9, due before next lesson" },
  { key: "notes", label: "Additional notes", placeholder: "Parent asked about mock exam dates" },
];

function LessonReview() {
  const { id } = Route.useParams();
  const { signedIn, endLesson, reviewDelivered, submitReview } = useDemo();
  const [values, setValues] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const lesson = TUTOR_LESSONS.find((l) => l.id === id);
  const delivered = DELIVERED_LESSONS.find((l) => l.id === id);
  const subject = lesson?.title ?? delivered?.classLabel ?? "Lesson";
  const who = lesson ? (lesson.studentId ? "Aisha Khan" : `${lesson.groupCount} students`) : (delivered?.who ?? "");
  const scheduled = lesson ? `${lesson.start}–${lesson.end}` : (delivered?.scheduled ?? "");
  const signInTime = signedIn[id] ?? delivered?.signIn ?? "16:57";

  if (done) {
    return (
      <Page>
        <div className="surface flex flex-col items-center gap-3 p-10 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <h1 className="text-2xl font-extrabold">Review submitted</h1>
          <p className="text-sm text-muted-foreground">
            This lesson is now eligible for payment and has been added to your draft Payment Request.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link to="/tutor/payment-requests">Open Payment Requests</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/tutor/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        breadcrumb={
          <span>
            <Link to="/tutor/lessons" className="hover:text-primary">
              My Lessons
            </Link>{" "}
            › Lesson Review
          </span>
        }
        title="Lesson Review"
        subtitle="Complete this review to make the lesson eligible for payment"
      />

      <Section id="review-context" title="Lesson details" subtitle="Pre-populated from the schedule">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Tutor", "Sarah Ahmed"],
            ["Student / Class", who],
            ["Subject", subject],
            ["Date", lesson?.dayLabel ?? delivered?.date ?? "Today"],
            ["Scheduled time", scheduled],
            ["Actual sign-in time", signInTime],
          ].map(([k, v]) => (
            <label key={k} className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
              {k}
              <Input readOnly value={v} className="h-10 rounded-xl bg-muted font-medium text-foreground" />
            </label>
          ))}
        </div>
        <div className="mt-3">
          <Pill tone="green">Tutor attendance recorded</Pill>
        </div>
      </Section>

      <Section id="review-form" title="Your review">
        <div className="space-y-4">
          {FIELDS.map((f) => (
            <label key={f.key} className="block text-sm font-bold">
              {f.label}
              <Textarea
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="mt-1 min-h-24 rounded-xl font-medium"
              />
            </label>
          ))}
          <Button
            size="lg"
            onClick={() => {
              reviewDelivered(id);
              submitReview(id);
              endLesson(id);
              setDone(true);
              toast.success("Review submitted. This lesson is now eligible for payment.");
            }}
          >
            Submit Lesson Review
          </Button>
        </div>
      </Section>
    </Page>
  );
}
