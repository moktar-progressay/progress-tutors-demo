import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpenCheck, MapPin, Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { FormDialog, SelectField, TextAreaField, TextField } from "@/components/form-kit";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { SessionRegister } from "@/components/session-register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTutorScope } from "@/lib/auth-scope";
import { fullName, hhmm, prettyDate, useTable, useUpdateRow, useUpsert } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/tutor/classes/$id")({
  head: () => ({
    meta: [{ title: "Tutor Class - ProgressTutors" }, { name: "robots", content: "noindex" }],
  }),
  component: TutorClass,
});

function TutorClass() {
  const { id } = Route.useParams();
  const scope = useTutorScope();
  const classes = useTable("classes");
  const sites = useTable("sites");
  const students = useTable("students", "first_name");
  const enrolments = useTable("class_enrolments");
  const sessions = useTable("sessions", "session_date");
  const homework = useTable("homework_items", "due_date");
  const addEnrolment = useUpsert("class_enrolments");
  const updateEnrolment = useUpdateRow("class_enrolments");
  const addSession = useUpsert("sessions", ["student_attendance"]);
  const addHomework = useUpsert("homework_items");
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [registerDate, setRegisterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [homeworkOpen, setHomeworkOpen] = useState(false);
  const [homeworkForm, setHomeworkForm] = useState({
    student_id: "",
    title: "",
    description: "",
    due_date: "",
  });

  const lesson = (classes.data ?? []).find((item) => item.id === id);
  if (!lesson || lesson.tutor_id !== scope.tutorId) {
    return (
      <Page>
        <Empty>This class is not assigned to your tutor account.</Empty>
      </Page>
    );
  }
  const site = (sites.data ?? []).find((item) => item.id === lesson.site_id);
  const roster = (enrolments.data ?? []).filter((item) => item.class_id === lesson.id);
  const activeRoster = roster.filter((item) => item.status === "active");
  const activeStudentIds = new Set(activeRoster.map((item) => item.student_id));
  const rosterStudents = (students.data ?? []).filter((student) =>
    activeStudentIds.has(student.id),
  );
  const register = (sessions.data ?? []).find(
    (session) => session.class_id === lesson.id && session.session_date === registerDate,
  );
  const filteredStudents = (students.data ?? []).filter((student) => {
    const query = studentSearch.trim().toLowerCase();
    return (
      !query ||
      [fullName(student), student.school, student.year_group]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  });
  const classHomework = (homework.data ?? []).filter((item) => item.class_id === lesson.id);
  const lessonId = lesson.id;

  async function saveStudents() {
    try {
      const selected = new Set(selectedIds);
      const existing = new Map(roster.map((item) => [item.student_id, item]));
      const add = selectedIds.filter((studentId) => !existing.has(studentId));
      await Promise.all([
        ...roster
          .filter((item) => selected.has(item.student_id) && item.status !== "active")
          .map((item) =>
            updateEnrolment.mutateAsync({
              id: item.id,
              values: { status: "active", end_date: null },
            }),
          ),
        ...roster
          .filter((item) => !selected.has(item.student_id) && item.status === "active")
          .map((item) =>
            updateEnrolment.mutateAsync({
              id: item.id,
              values: { status: "inactive", end_date: new Date().toISOString().slice(0, 10) },
            }),
          ),
      ]);
      if (add.length)
        await addEnrolment.mutateAsync(
          add.map((studentId) => ({ class_id: lessonId, student_id: studentId, status: "active" })),
        );
      toast.success("Class students updated");
      setManageOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update students");
    }
  }

  return (
    <Page className="space-y-5">
      <PageHeader
        breadcrumb={
          <Link to="/tutor/lessons" className="inline-flex items-center gap-1 hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> My schedule
          </Link>
        }
        title={lesson.name}
        subtitle={`${lesson.weekday} · ${hhmm(lesson.start_time)}-${hhmm(lesson.end_time)}`}
        actions={
          <Button
            onClick={() => {
              setSelectedIds(activeRoster.map((item) => item.student_id));
              setStudentSearch("");
              setManageOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Manage students
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Students" value={String(rosterStudents.length)} tone="pink" />
        <StatCard label="Subject" value={lesson.subject ?? "TBC"} tone="blue" />
        <StatCard label="Level" value={lesson.level ?? "TBC"} tone="purple" />
        <StatCard
          label="Capacity"
          value={`${rosterStudents.length}/${lesson.capacity}`}
          tone="green"
        />
      </div>

      <Section id="tutor-class-details" title="Teaching details">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {site?.name ?? lesson.venue_name ?? "Venue to confirm"}
          </p>
          <p>{lesson.delivery_mode.replace("_", " ")}</p>
          {lesson.room ? <p>Room: {lesson.room}</p> : null}
          {lesson.notes ? <p className="sm:col-span-2">{lesson.notes}</p> : null}
        </div>
      </Section>

      <Section
        id="tutor-class-students"
        title={`Students (${rosterStudents.length})`}
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setSelectedIds(activeRoster.map((item) => item.student_id));
              setManageOpen(true);
            }}
          >
            <Users className="h-4 w-4" /> Add / remove
          </Button>
        }
      >
        {rosterStudents.length === 0 ? (
          <Empty>No students enrolled.</Empty>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {rosterStudents.map((student) => (
              <Link
                key={student.id}
                to="/tutor/students/$id"
                params={{ id: student.id }}
                className="rounded-xl border border-border px-4 py-3 hover:border-primary/40"
              >
                <p className="font-bold">{fullName(student)}</p>
                <p className="text-xs text-muted-foreground">
                  {[student.year_group, student.school].filter(Boolean).join(" · ") ||
                    "Details to confirm"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section
        id="tutor-register"
        title="Attendance register"
        subtitle="Choose the lesson date, then mark each student"
      >
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            Lesson date
            <Input
              type="date"
              value={registerDate}
              onChange={(event) => setRegisterDate(event.target.value)}
              className="h-10 w-48 rounded-xl"
            />
          </label>
          {!register ? (
            <Button
              variant="secondary"
              disabled={addSession.isPending}
              onClick={async () => {
                await addSession.mutateAsync({
                  class_id: lesson.id,
                  site_id: lesson.site_id,
                  tutor_id: scope.tutorId,
                  session_date: registerDate,
                  start_time: lesson.start_time,
                  end_time: lesson.end_time,
                  agreed_amount: lesson.session_rate,
                  status: "scheduled",
                });
                toast.success(`Register opened for ${prettyDate(registerDate)}`);
              }}
            >
              Open register
            </Button>
          ) : null}
        </div>
        {register ? (
          <SessionRegister session={register} />
        ) : (
          <Empty>Open the register to take attendance.</Empty>
        )}
      </Section>

      <Section
        id="tutor-class-homework"
        title="Homework"
        action={
          <Button size="sm" variant="secondary" onClick={() => setHomeworkOpen(true)}>
            <BookOpenCheck className="h-4 w-4" /> Add homework
          </Button>
        }
      >
        {classHomework.length === 0 ? (
          <Empty>No homework set for this class.</Empty>
        ) : (
          <ul className="space-y-2">
            {classHomework.map((item) => {
              const student = (students.data ?? []).find((value) => value.id === item.student_id);
              return (
                <li key={item.id} className="rounded-xl border border-border px-4 py-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span>
                      <span className="block font-bold">{item.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {fullName(student)} ·{" "}
                        {item.due_date ? `Due ${prettyDate(item.due_date)}` : "No due date"}
                      </span>
                    </span>
                    <Pill tone={item.status === "complete" ? "green" : "amber"}>{item.status}</Pill>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <FormDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        wide
        title="Manage students"
        description="Tick students to add them. Untick students to remove them from this class."
        submitLabel="Save students"
        busy={addEnrolment.isPending || updateEnrolment.isPending}
        onSubmit={saveStudents}
      >
        <div className="space-y-3 sm:col-span-2">
          <Input
            value={studentSearch}
            onChange={(event) => setStudentSearch(event.target.value)}
            placeholder="Search students"
            className="h-11 rounded-xl"
          />
          <div className="max-h-80 divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {filteredStudents.map((student) => (
              <label key={student.id} className="flex cursor-pointer items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(student.id)}
                  onChange={() =>
                    setSelectedIds((current) =>
                      current.includes(student.id)
                        ? current.filter((value) => value !== student.id)
                        : [...current, student.id],
                    )
                  }
                  className="h-5 w-5 accent-[var(--color-primary)]"
                />
                <span>
                  <span className="block text-sm font-bold">{fullName(student)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {[student.year_group, student.school].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </FormDialog>

      <FormDialog
        open={homeworkOpen}
        onOpenChange={setHomeworkOpen}
        title="Add homework"
        busy={addHomework.isPending}
        onSubmit={async () => {
          if (!homeworkForm.student_id || !homeworkForm.title.trim()) return;
          await addHomework.mutateAsync({
            student_id: homeworkForm.student_id,
            class_id: lesson.id,
            title: homeworkForm.title.trim(),
            description: homeworkForm.description.trim() || null,
            due_date: homeworkForm.due_date || null,
            status: "due",
          });
          toast.success("Homework added");
          setHomeworkOpen(false);
          setHomeworkForm({ student_id: "", title: "", description: "", due_date: "" });
        }}
      >
        <SelectField
          label="Student"
          value={homeworkForm.student_id}
          onChange={(student_id) => setHomeworkForm({ ...homeworkForm, student_id })}
          options={[
            { value: "", label: "Choose student" },
            ...rosterStudents.map((student) => ({ value: student.id, label: fullName(student) })),
          ]}
        />
        <TextField
          label="Due date"
          type="date"
          value={homeworkForm.due_date}
          onChange={(due_date) => setHomeworkForm({ ...homeworkForm, due_date })}
        />
        <TextField
          full
          required
          label="Homework title"
          value={homeworkForm.title}
          onChange={(title) => setHomeworkForm({ ...homeworkForm, title })}
        />
        <TextAreaField
          label="Instructions"
          value={homeworkForm.description}
          onChange={(description) => setHomeworkForm({ ...homeworkForm, description })}
        />
      </FormDialog>
    </Page>
  );
}
