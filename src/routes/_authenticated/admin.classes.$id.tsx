import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Empty, GoProgressLink, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { FormDialog, SelectField, TextField } from "@/components/form-kit";
import { SessionRegister } from "@/components/session-register";
import { Button } from "@/components/ui/button";
import {
  capacityTone,
  DEMO_DATE,
  fullName,
  hhmm,
  money,
  prettyDate,
  useTable,
  useUpdateRow,
  useUpsert,
} from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/classes/$id")({
  head: () => ({
    meta: [
      { title: "Class detail — ProgressTutors" },
      { name: "description", content: "Roster, tutor assignment, sessions and registers for one class." },
      { property: "og:title", content: "Class detail — ProgressTutors" },
      { property: "og:description", content: "Class roster and session registers." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClassDetail,
});

function ClassDetail() {
  const { id } = Route.useParams();
  const classes = useTable("classes");
  const sites = useTable("sites");
  const tutors = useTable("tutors", "first_name");
  const students = useTable("students", "first_name");
  const enrolments = useTable("class_enrolments");
  const sessions = useTable("sessions", "session_date");

  const updateClass = useUpdateRow("classes");
  const addEnrolment = useUpsert("class_enrolments");
  const updateEnrolment = useUpdateRow("class_enrolments");
  const addSession = useUpsert("sessions");

  const [enrolOpen, setEnrolOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionDate, setSessionDate] = useState(DEMO_DATE);

  const c = (classes.data ?? []).find((x) => x.id === id);
  if (!c) {
    return (
      <Page>
        <PageHeader title="Class not found" subtitle="It may have been removed." />
        <Link to="/admin/classes" className="text-sm font-bold text-primary">
          Back to classes
        </Link>
      </Page>
    );
  }

  const site = (sites.data ?? []).find((s) => s.id === c.site_id);
  const tutor = (tutors.data ?? []).find((t) => t.id === c.tutor_id);
  const roster = (enrolments.data ?? []).filter((e) => e.class_id === c.id);
  const active = roster.filter((e) => e.status === "active");
  const classSessions = (sessions.data ?? []).filter((s) => s.class_id === c.id);
  const notEnrolled = (students.data ?? []).filter(
    (s) => s.status === "active" && !active.some((e) => e.student_id === s.id),
  );

  return (
    <Page>
      <PageHeader
        breadcrumb={
          <Link to="/admin/classes" className="hover:text-primary">
            Classes
          </Link>
        }
        title={c.name}
        subtitle={`${c.weekday ?? "Day to confirm"} ${hhmm(c.start_time)}–${hhmm(c.end_time)} · ${
          site?.name ?? "Venue to confirm"
        }`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEnrolOpen(true)}>
              Enrol student
            </Button>
            <Button onClick={() => setSessionOpen(true)}>Add session</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Enrolled" value={`${active.length}/${c.capacity}`} tone={capacityTone(active.length, c.capacity)} />
        <StatCard label="Sessions" value={String(classSessions.length)} tone="blue" />
        <StatCard label="Tutor pay per session" value={money(c.session_rate)} tone="purple" />
        <StatCard label="Price per session" value={money(c.price_per_session)} tone="green" />
      </div>

      <Section id="class-setup" title="Setup" subtitle="Changes are shared with everyone using the demo">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Tutor / coach"
            value={c.tutor_id ?? ""}
            onChange={(v) =>
              updateClass.mutate(
                { id: c.id, values: { tutor_id: v || null } },
                { onSuccess: () => toast.success("Tutor updated") },
              )
            }
            options={[
              { value: "", label: "Tutor not assigned" },
              ...(tutors.data ?? []).map((t) => ({ value: t.id, label: fullName(t) })),
            ]}
          />
          <SelectField
            label="Status"
            value={c.active ? "active" : "archived"}
            onChange={(v) => updateClass.mutate({ id: c.id, values: { active: v === "active" } })}
            options={[
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
            ]}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!c.tutor_id ? <Pill tone="amber">Tutor not assigned</Pill> : <Pill tone="green">{fullName(tutor)}</Pill>}
          <Pill tone="blue">{c.delivery_mode.replace("_", " ")}</Pill>
          {c.room ? <Pill tone="purple">{c.room}</Pill> : null}
          <GoProgressLink label={c.goprogress_course_url ? "GoProgress course" : "GoProgress not linked"} />
        </div>
      </Section>

      <Section id="class-roster" title="Roster" subtitle={`${active.length} active`}>
        {roster.length === 0 ? (
          <Empty>No students enrolled yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {roster.map((e) => {
              const s = (students.data ?? []).find((x) => x.id === e.student_id);
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-2">
                  <Link
                    to="/admin/students/$id"
                    params={{ id: e.student_id }}
                    className="min-w-0 flex-1 text-sm font-semibold hover:text-primary"
                  >
                    {fullName(s)}
                  </Link>
                  <Pill tone={e.status === "active" ? "green" : "neutral"}>{e.status}</Pill>
                  {e.status === "active" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        updateEnrolment.mutate(
                          { id: e.id, values: { status: "left" } },
                          { onSuccess: () => toast.success("Student removed from the class") },
                        )
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section id="class-sessions" title="Sessions & registers" subtitle="Sign-ins and attendance are saved live">
        {classSessions.length === 0 ? (
          <Empty>No sessions yet. Add one for the date you are running.</Empty>
        ) : (
          <div className="space-y-4">
            {classSessions.map((s) => (
              <div key={s.id} className="rounded-2xl border border-border p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold">{prettyDate(s.session_date)}</p>
                  <Pill tone={s.status === "completed" ? "green" : "blue"}>{s.status}</Pill>
                  <span className="text-xs text-muted-foreground">
                    {hhmm(s.start_time)}–{hhmm(s.end_time)}
                  </span>
                </div>
                <SessionRegister session={s} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <FormDialog
        open={enrolOpen}
        onOpenChange={setEnrolOpen}
        title="Enrol a student"
        busy={addEnrolment.isPending}
        onSubmit={async () => {
          if (!studentId) return;
          await addEnrolment.mutateAsync({ class_id: c.id, student_id: studentId, status: "active" });
          toast.success("Student enrolled");
          setStudentId("");
          setEnrolOpen(false);
        }}
      >
        <SelectField
          full
          label="Student"
          value={studentId}
          onChange={setStudentId}
          options={[
            { value: "", label: "Choose a student" },
            ...notEnrolled.map((s) => ({ value: s.id, label: fullName(s) })),
          ]}
        />
      </FormDialog>

      <FormDialog
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        title="Add a session"
        busy={addSession.isPending}
        onSubmit={async () => {
          await addSession.mutateAsync({
            class_id: c.id,
            site_id: c.site_id,
            schedule_block_id: c.schedule_block_id,
            tutor_id: c.tutor_id,
            session_date: sessionDate,
            start_time: c.start_time,
            end_time: c.end_time,
            status: "scheduled",
            agreed_amount: c.session_rate,
          });
          toast.success("Session added");
          setSessionOpen(false);
        }}
      >
        <TextField full label="Date" type="date" value={sessionDate} onChange={setSessionDate} />
      </FormDialog>
    </Page>
  );
}
