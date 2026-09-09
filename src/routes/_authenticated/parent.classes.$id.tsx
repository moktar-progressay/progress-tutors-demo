import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { CapacityPill, Empty, Field, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { CHILDREN, klass, money, site, tutor } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/_authenticated/parent/classes/$id")({
  head: () => ({
    meta: [
      { title: "Class Details — ProgressTutors" },
      { name: "description", content: "Class details, schedule, price and enrolment for your child." },
      { property: "og:title", content: "Class Details — ProgressTutors" },
      { property: "og:description", content: "Join a class and link it to GoProgress." },
    ],
  }),
  component: ParentClassDetail,
});

function ParentClassDetail() {
  const { id } = Route.useParams();
  const { addEnrolment } = useDemo();
  const c = klass(id);
  const [child, setChild] = useState(CHILDREN[0]?.short ?? "Aisha");
  const [payment, setPayment] = useState("Monthly subscription (demo card ••42)");
  const [step, setStep] = useState<"details" | "confirm" | "done">("details");

  if (!c) {
    return (
      <Page>
        <Empty>Class not found.</Empty>
      </Page>
    );
  }

  if (step === "done") {
    return (
      <Page>
        <div className="surface flex flex-col items-center gap-3 p-10 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <h1 className="text-2xl font-extrabold">Class added for {child} and linked to GoProgress.</h1>
          <p className="text-sm text-muted-foreground">
            {c.subject} · {c.day} {c.start}–{c.end} · {site(c.siteId)?.name}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link to="/parent/dashboard">Back to dashboard</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/parent/classes">Find more classes</Link>
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
          <Link to="/parent/classes" className="hover:text-primary">
            Find Classes
          </Link>
        }
        title={c.subject}
        subtitle={`${c.type} · ${site(c.siteId)?.name} · ${c.day} ${c.start}–${c.end}`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Places" value={`${c.enrolled}/${c.capacity}`} tone="blue" />
        <StatCard label="Price" value={`${money(c.price)}/session`} tone="green" />
        <StatCard label="Tutor" value={tutor(c.tutorId)?.name ?? "To be confirmed"} tone="pink" />
        <StatCard label="Level" value={c.level} tone="purple" />
      </div>

      <Section id="pc-join" title="Join this class">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Which child" value={child} onChange={setChild} options={CHILDREN.map((x) => x.short)} />
          <Field
            label="Payment option"
            value={payment}
            onChange={setPayment}
            options={[
              "Monthly subscription (demo card ••42)",
              "Pay per session (demo card ••42)",
              "Termly upfront (demo bank transfer)",
            ]}
          />
          <CapacityPill enrolled={c.enrolled} capacity={c.capacity} />
        </div>

        {step === "details" ? (
          <Button className="mt-4" onClick={() => setStep("confirm")}>
            Join Class
          </Button>
        ) : (
          <div className="mt-4 rounded-2xl border border-border p-4">
            <p className="text-sm font-bold">Confirm enrolment</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>Child: {child}</li>
              <li>
                Class: {c.subject} · {c.day} {c.start}–{c.end}
              </li>
              <li>Location: {site(c.siteId)?.name}</li>
              <li>Payment: {payment}</li>
            </ul>
            <div className="mt-3 flex gap-2">
              <Button
                onClick={() => {
                  addEnrolment({ child, classId: c.id, className: c.subject });
                  setStep("done");
                  toast.success(`Class added for ${child} and linked to GoProgress.`);
                }}
              >
                Confirm enrolment
              </Button>
              <Button variant="ghost" onClick={() => setStep("details")}>
                Back
              </Button>
            </div>
          </div>
        )}
      </Section>

      <Section id="pc-about" title="About this class">
        <p className="text-sm text-muted-foreground">
          Weekly {c.level} {c.subject} in {c.room}. Attendance and homework are shared with parents through
          GoProgress.
        </p>
        <div className="mt-3 flex gap-2">
          <Pill tone="blue">{c.recurrence}</Pill>
          <Pill tone="green">{c.goprogress ? "GoProgress connected" : "GoProgress not linked"}</Pill>
        </div>
      </Section>
    </Page>
  );
}
