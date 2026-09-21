import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { FormDialog, SelectField, TextAreaField, TextField } from "@/components/form-kit";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { useTutorScope } from "@/lib/auth-scope";
import { fullName, prettyDate, useTable, useUpsert } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/tutor/students/$id")({
  head: () => ({
    meta: [{ title: "Student - ProgressTutors" }, { name: "robots", content: "noindex" }],
  }),
  component: TutorStudent,
});

function TutorStudent() {
  const { id } = Route.useParams();
  const scope = useTutorScope();
  const students = useTable("students");
  const classes = useTable("classes");
  const enrolments = useTable("class_enrolments");
  const attendance = useTable("student_attendance");
  const homework = useTable("homework_items", "due_date");
  const progress = useTable("progress_records");
  const addHomework = useUpsert("homework_items");
  const [homeworkOpen, setHomeworkOpen] = useState(false);
  const [form, setForm] = useState({ class_id: "", title: "", description: "", due_date: "" });
  const myClasses = (classes.data ?? []).filter((item) => item.tutor_id === scope.tutorId);
  const classIds = new Set(myClasses.map((item) => item.id));
  const myEnrolments = (enrolments.data ?? []).filter(
    (item) => item.student_id === id && classIds.has(item.class_id) && item.status === "active",
  );
  const student = (students.data ?? []).find((item) => item.id === id);
  if (!student || myEnrolments.length === 0) {
    return (
      <Page>
        <Empty>This student is not enrolled in one of your classes.</Empty>
      </Page>
    );
  }
  const marks = (attendance.data ?? []).filter((item) => item.student_id === id);
  const present = marks.filter(
    (item) => item.status === "present" || item.status === "late",
  ).length;
  const attendanceRate = marks.length ? Math.round((present / marks.length) * 100) : null;
  const tasks = (homework.data ?? []).filter(
    (item) => item.student_id === id && (!item.class_id || classIds.has(item.class_id)),
  );
  const records = (progress.data ?? []).filter((item) => item.student_id === id);

  return (
    <Page className="space-y-5">
      <PageHeader
        breadcrumb={
          <Link to="/tutor/students" className="hover:text-primary">
            My students
          </Link>
        }
        title={fullName(student)}
        subtitle={
          [student.year_group, student.school].filter(Boolean).join(" · ") || "Student record"
        }
        actions={<Button onClick={() => setHomeworkOpen(true)}>Add homework</Button>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="My classes" value={String(myEnrolments.length)} tone="blue" />
        <StatCard
          label="Attendance"
          value={attendanceRate === null ? "-" : `${attendanceRate}%`}
          tone="green"
        />
        <StatCard label="Homework" value={String(tasks.length)} tone="amber" />
        <StatCard label="Progress records" value={String(records.length)} tone="purple" />
      </div>
      <Section id="tutor-student-classes" title="Classes with you">
        <div className="grid gap-2 sm:grid-cols-2">
          {myEnrolments.map((enrolment) => {
            const lesson = myClasses.find((item) => item.id === enrolment.class_id);
            return lesson ? (
              <Link
                key={enrolment.id}
                to="/tutor/classes/$id"
                params={{ id: lesson.id }}
                className="rounded-xl border border-border px-4 py-3 font-bold hover:border-primary/40"
              >
                {lesson.name}
              </Link>
            ) : null;
          })}
        </div>
      </Section>
      <Section id="tutor-student-homework" title="Homework">
        {tasks.length === 0 ? (
          <Empty>No homework set.</Empty>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className="flex gap-3 rounded-xl border border-border px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{task.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {task.due_date ? `Due ${prettyDate(task.due_date)}` : "No due date"}
                  </span>
                </span>
                <Pill tone={task.status === "complete" ? "green" : "amber"}>{task.status}</Pill>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section id="tutor-student-progress" title="Progress">
        {records.length === 0 ? (
          <Empty>No progress records yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {records.map((record) => (
              <li key={record.id} className="rounded-xl border border-border px-4 py-3 text-sm">
                <p className="font-bold">{record.subject ?? "Progress"}</p>
                <p className="text-xs text-muted-foreground">
                  {prettyDate(record.record_date)} · {record.status}
                </p>
                {record.note ? <p className="mt-1">{record.note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <FormDialog
        open={homeworkOpen}
        onOpenChange={setHomeworkOpen}
        title="Add homework"
        busy={addHomework.isPending}
        onSubmit={async () => {
          if (!form.title.trim()) return;
          await addHomework.mutateAsync({
            student_id: student.id,
            class_id: form.class_id || null,
            title: form.title.trim(),
            description: form.description.trim() || null,
            due_date: form.due_date || null,
            status: "due",
          });
          toast.success("Homework added");
          setHomeworkOpen(false);
          setForm({ class_id: "", title: "", description: "", due_date: "" });
        }}
      >
        <SelectField
          label="Class"
          value={form.class_id}
          onChange={(class_id) => setForm({ ...form, class_id })}
          options={[
            { value: "", label: "Choose class" },
            ...myClasses.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <TextField
          label="Due date"
          type="date"
          value={form.due_date}
          onChange={(due_date) => setForm({ ...form, due_date })}
        />
        <TextField
          full
          required
          label="Homework title"
          value={form.title}
          onChange={(title) => setForm({ ...form, title })}
        />
        <TextAreaField
          label="Instructions"
          value={form.description}
          onChange={(description) => setForm({ ...form, description })}
        />
      </FormDialog>
    </Page>
  );
}
