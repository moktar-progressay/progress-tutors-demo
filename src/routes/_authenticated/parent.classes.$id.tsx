import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Empty, GoProgressLink, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { SelectField } from "@/components/form-kit";
import { Button } from "@/components/ui/button";
import { useActingId } from "@/lib/acting";
import { capacityTone, fullName, hhmm, money, prettyDate, useTable, useUpsert } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/parent/classes/$id")({
  head: () => ({
    meta: [
      { title: "Class details — ProgressTutors" },
      { name: "description", content: "Class times, venue, coach, places left and how to request a place for your child." },
      { property: "og:title", content: "Class details — ProgressTutors" },
      { property: "og:description", content: "Class details and enrolment request." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ParentClassDetail,
});

function ParentClassDetail() {
  const { id } = Route.useParams();
  const [parentId] = useActingId("parent");
  const [childId, setChildId] = useState("");

  const classes = useTable("classes");
  const sites = useTable("sites");
  const tutors = useTable("tutors");
  const links = useTable("parent_students");
  const students = useTable("students");
  const enrolments = useTable("class_enrolments");
  const sessions = useTable("sessions", "session_date");
  const enrol = useUpsert("class_enrolments");

  const c = (classes.data ?? []).find((x) => x.id === id);
  if (!c) {
    return (
      <Page>
        <PageHeader title="Class not found" />
        <Link to="/parent/classes" className="text-sm font-bold text-primary">
          Back to classes
        </Link>
      </Page>
    );
  }

  const site = (sites.data ?? []).find((s) => s.id === c.site_id);
  const tutor = (tutors.data ?? []).find((t) => t.id === c.tutor_id);
  const count = (enrolments.data ?? []).filter((e) => e.class_id === c.id && e.status === "active").length;
  const childIds = (links.data ?? []).filter((l) => l.parent_id === parentId).map((l) => l.student_id);
  const children = (students.data ?? []).filter((s) => childIds.includes(s.id));
  const upcoming = (sessions.data ?? []).filter((s) => s.class_id === c.id);
  const alreadyIn = (enrolments.data ?? []).some(
    (e) => e.class_id === c.id && e.student_id === childId && e.status !== "left",
  );

  return (
    <Page>
      <PageHeader
        breadcrumb={
          <Link to="/parent/classes" className="hover:text-primary">
            Find a class
          </Link>
        }
        title={c.name}
        subtitle={`${c.weekday ?? ""} ${hhmm(c.start_time)}–${hhmm(c.end_time)} · ${site?.name ?? "Venue to confirm"}`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Places left" value={String(Math.max(c.capacity - count, 0))} tone={capacityTone(count, c.capacity)} />
        <StatCard label="Price per session" value={money(c.price_per_session)} tone="green" />
        <StatCard label="Coach / tutor" value={tutor ? fullName(tutor) : "To be confirmed"} tone="blue" />
        <StatCard label="Format" value={c.delivery_mode.replace("_", " ")} tone="purple" />
      </div>

      <Section id="parent-join" title="Request a place">
        {children.length === 0 ? (
          <Empty>Choose your name on the parent dashboard first, so we know which children to offer.</Empty>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <SelectField
              label="Child"
              value={childId}
              onChange={setChildId}
              options={[{ value: "", label: "Choose" }, ...children.map((s) => ({ value: s.id, label: fullName(s) }))]}
            />
            <Button
              disabled={!childId || alreadyIn || enrol.isPending}
              onClick={async () => {
                await enrol.mutateAsync({ class_id: c.id, student_id: childId, status: "pending" });
                toast.success("Request sent — the office will confirm the place");
              }}
            >
              {alreadyIn ? "Already requested" : "Request place"}
            </Button>
          </div>
        )}
        {c.goprogress_course_url ? (
          <div className="mt-3">
            <GoProgressLink label="Course in GoProgress" />
          </div>
        ) : null}
      </Section>

      <Section id="parent-class-dates" title="Upcoming dates">
        {upcoming.length === 0 ? (
          <Empty>Dates are published once the office opens the register.</Empty>
        ) : (
          <ul className="space-y-2">
            {upcoming.slice(0, 8).map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-2 text-sm">
                <span className="min-w-0 flex-1">{prettyDate(s.session_date)}</span>
                <Pill tone="blue">
                  {hhmm(s.start_time)}–{hhmm(s.end_time)}
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Page>
  );
}
