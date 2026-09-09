import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { FormDialog, SelectField, TextAreaField, TextField } from "@/components/form-kit";
import { Button } from "@/components/ui/button";
import { fullName, prettyDate, useTable, useUpsert, useDeleteRow, useUpdateRow } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/students/$id")({
  head: () => ({
    meta: [
      { title: "Student record — ProgressTutors" },
      { name: "description", content: "Full student record including classes, attendance, progress and homework." },
      { property: "og:title", content: "Student record — ProgressTutors" },
      { property: "og:description", content: "Admin view of a single student record." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentDetail,
});

function StudentDetail() {
  const { id } = Route.useParams();
  const students = useTable("students");
  const classes = useTable("classes", "name");
  const enrolments = useTable("class_enrolments");
  const attendance = useTable("student_attendance");
  const progress = useTable("progress_records");
  const homework = useTable("homework_items");
  const parents = useTable("parents");
  const links = useTable("parent_students");

  const addEnrolment = useUpsert("class_enrolments");
  const removeEnrolment = useDeleteRow("class_enrolments");
  const updateEnrolment = useUpdateRow("class_enrolments");
  const addProgress = useUpsert("progress_records");
  const addHomework = useUpsert("homework_items");

  const [classDialog, setClassDialog] = useState(false);
  const [chosenClass, setChosenClass] = useState("");
  const [progressDialog, setProgressDialog] = useState(false);
  const [progressForm, setProgressForm] = useState({
    subject: "",
    record_date: new Date().toISOString().slice(0, 10),
    score: "",
    target: "",
    note: "",
    status: "on_track",
  });
  const [hwDialog, setHwDialog] = useState(false);
  const [hwForm, setHwForm] = useState({
    title: "",
    description: "",
    due_date: "",
    status: "due",
    class_id: "",
  });

  const student = (students.data ?? []).find((s) => s.id === id);
  if (students.isLoading) {
    return (
      <Page>
        <Empty>Loading record…</Empty>
      </Page>
    );
  }
  if (!student) {
    return (
      <Page>
        <Empty>That student record could not be found.</Empty>
      </Page>
    );
  }

  const myEnrolments = (enrolments.data ?? []).filter((e) => e.student_id === id);
  const myAttendance = (attendance.data ?? []).filter((a) => a.student_id === id);
  const present = myAttendance.filter((a) => a.status === "present" || a.status === "late").length;
  const attendancePct = myAttendance.length === 0 ? 0 : Math.round((present / myAttendance.length) * 100);
  const parent = (parents.data ?? []).find((p) =>
    (links.data ?? []).some((l) => l.student_id === id && l.parent_id === p.id),
  );
  const classList = classes.data ?? [];
  const available = classList.filter((c) => !myEnrolments.some((e) => e.class_id === c.id));

  return (
    <Page>
      <PageHeader
        breadcrumb={
          <Link to="/admin/students" className="hover:text-primary">
            Students
          </Link>
        }
        title={fullName(student)}
        subtitle={[student.year_group, student.school].filter(Boolean).join(" · ") || "No year group recorded"}
        actions={<Button onClick={() => setClassDialog(true)}>Add to class</Button>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Classes" value={String(myEnrolments.filter((e) => e.status === "active").length)} tone="blue" />
        <StatCard label="Attendance" value={myAttendance.length === 0 ? "—" : `${attendancePct}%`} tone="green" />
        <StatCard label="Sessions recorded" value={String(myAttendance.length)} tone="purple" />
        <StatCard label="Status" value={student.status} tone="pink" />
      </div>

      <Section id="sd-contact" title="Contact & guardian">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Parent / guardian</dt>
            <dd className="font-semibold">{parent ? fullName(parent) : "Not linked"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Student email</dt>
            <dd className="font-semibold">{student.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Phone</dt>
            <dd className="font-semibold">{student.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Date of birth</dt>
            <dd className="font-semibold">{student.date_of_birth ? prettyDate(student.date_of_birth) : "—"}</dd>
          </div>
        </dl>
      </Section>

      <Section id="sd-sensitive" title="Safeguarding & medical" subtitle="Admin only — not shown on dashboards">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Emergency contact</dt>
            <dd className="font-semibold">
              {student.emergency_contact_name ?? "—"}
              {student.emergency_contact_phone ? ` · ${student.emergency_contact_phone}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">SEND / EHCP</dt>
            <dd className="flex gap-2">
              <Pill tone={student.send_flag ? "amber" : "neutral"}>SEND {student.send_flag ? "yes" : "no"}</Pill>
              <Pill tone={student.ehcp_flag ? "amber" : "neutral"}>EHCP {student.ehcp_flag ? "yes" : "no"}</Pill>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Medical conditions</dt>
            <dd className="font-semibold">{student.medical_notes ?? "None recorded"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Allergies</dt>
            <dd className="font-semibold">{student.allergy_notes ?? "None recorded"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Notes</dt>
            <dd className="font-semibold">{student.notes ?? "—"}</dd>
          </div>
        </dl>
      </Section>

      <Section id="sd-classes" title="Classes">
        {myEnrolments.length === 0 ? (
          <Empty>Not in any class yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {myEnrolments.map((e) => {
              const c = classList.find((x) => x.id === e.class_id);
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3">
                  <span className="min-w-0 flex-1 text-sm font-bold">{c?.name ?? "Class removed"}</span>
                  <Pill tone={e.status === "active" ? "green" : "neutral"}>{e.status}</Pill>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await updateEnrolment.mutateAsync({
                        id: e.id,
                        values: { status: e.status === "active" ? "left" : "active" },
                      });
                      toast.success("Enrolment updated");
                    }}
                  >
                    {e.status === "active" ? "Mark left" : "Reactivate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await removeEnrolment.mutateAsync(e.id);
                      toast.success("Removed from class");
                    }}
                  >
                    Remove
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section
        id="sd-progress"
        title="Progress"
        action={
          <Button size="sm" variant="secondary" onClick={() => setProgressDialog(true)}>
            Add record
          </Button>
        }
      >
        {(progress.data ?? []).filter((p) => p.student_id === id).length === 0 ? (
          <Empty>No progress records yet.</Empty>
        ) : (
          <ul className="space-y-2 text-sm">
            {(progress.data ?? [])
              .filter((p) => p.student_id === id)
              .map((p) => (
                <li key={p.id} className="rounded-xl border border-border px-4 py-3">
                  <p className="font-bold">
                    {p.subject ?? "General"} · {prettyDate(p.record_date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.score !== null ? `Score ${p.score}` : "No score"} · Target {p.target ?? "—"} · {p.status}
                  </p>
                  {p.note ? <p className="mt-1 text-sm">{p.note}</p> : null}
                </li>
              ))}
          </ul>
        )}
      </Section>

      <Section
        id="sd-homework"
        title="Homework"
        action={
          <Button size="sm" variant="secondary" onClick={() => setHwDialog(true)}>
            Add homework
          </Button>
        }
      >
        {(homework.data ?? []).filter((h) => h.student_id === id).length === 0 ? (
          <Empty>No homework set yet.</Empty>
        ) : (
          <ul className="space-y-2 text-sm">
            {(homework.data ?? [])
              .filter((h) => h.student_id === id)
              .map((h) => (
                <li key={h.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                  <span>
                    <span className="block font-bold">{h.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {h.due_date ? `Due ${prettyDate(h.due_date)}` : "No due date"}
                    </span>
                  </span>
                  <Pill tone={h.status === "due" ? "amber" : "green"}>{h.status}</Pill>
                </li>
              ))}
          </ul>
        )}
      </Section>

      <FormDialog
        open={classDialog}
        onOpenChange={setClassDialog}
        title="Add to class"
        onSubmit={async () => {
          if (!chosenClass) return;
          await addEnrolment.mutateAsync({ class_id: chosenClass, student_id: id });
          toast.success("Student added to class");
          setClassDialog(false);
        }}
        busy={addEnrolment.isPending}
      >
        <SelectField
          label="Class"
          full
          value={chosenClass}
          onChange={setChosenClass}
          options={[{ value: "", label: "Choose a class" }, ...available.map((c) => ({ value: c.id, label: c.name }))]}
        />
      </FormDialog>

      <FormDialog
        open={progressDialog}
        onOpenChange={setProgressDialog}
        title="Add progress record"
        onSubmit={async () => {
          await addProgress.mutateAsync({
            student_id: id,
            subject: progressForm.subject || null,
            record_date: progressForm.record_date,
            score: progressForm.score ? Number(progressForm.score) : null,
            target: progressForm.target || null,
            note: progressForm.note || null,
            status: progressForm.status,
          });
          toast.success("Progress recorded");
          setProgressDialog(false);
        }}
        busy={addProgress.isPending}
      >
        <TextField label="Subject / activity" value={progressForm.subject} onChange={(v) => setProgressForm({ ...progressForm, subject: v })} />
        <TextField label="Date" type="date" value={progressForm.record_date} onChange={(v) => setProgressForm({ ...progressForm, record_date: v })} />
        <TextField label="Score" type="number" value={progressForm.score} onChange={(v) => setProgressForm({ ...progressForm, score: v })} />
        <TextField label="Target" value={progressForm.target} onChange={(v) => setProgressForm({ ...progressForm, target: v })} />
        <SelectField
          label="Status"
          value={progressForm.status}
          onChange={(v) => setProgressForm({ ...progressForm, status: v })}
          options={[
            { value: "on_track", label: "On track" },
            { value: "above", label: "Above target" },
            { value: "below", label: "Below target" },
          ]}
        />
        <TextAreaField label="Note" value={progressForm.note} onChange={(v) => setProgressForm({ ...progressForm, note: v })} />
      </FormDialog>

      <FormDialog
        open={hwDialog}
        onOpenChange={setHwDialog}
        title="Add homework"
        onSubmit={async () => {
          await addHomework.mutateAsync({
            student_id: id,
            class_id: hwForm.class_id || null,
            title: hwForm.title,
            description: hwForm.description || null,
            due_date: hwForm.due_date || null,
            status: hwForm.status,
          });
          toast.success("Homework added");
          setHwDialog(false);
        }}
        busy={addHomework.isPending}
      >
        <TextField label="Title" value={hwForm.title} onChange={(v) => setHwForm({ ...hwForm, title: v })} required full />
        <TextField label="Due date" type="date" value={hwForm.due_date} onChange={(v) => setHwForm({ ...hwForm, due_date: v })} />
        <SelectField
          label="Class"
          value={hwForm.class_id}
          onChange={(v) => setHwForm({ ...hwForm, class_id: v })}
          options={[{ value: "", label: "No class" }, ...classList.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <TextAreaField label="Description" value={hwForm.description} onChange={(v) => setHwForm({ ...hwForm, description: v })} />
      </FormDialog>
    </Page>
  );
}
