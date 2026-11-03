import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Copy,
  Filter,
  Plus,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Avatar, avatarTone, Empty, PageHeader } from "@/components/kit";
import { ConfirmDeleteDialog, SelectField, TextField } from "@/components/form-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LessonTimeRangePicker } from "@/components/lesson-time-range-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEMO_DATE,
  fullName,
  hhmm,
  initialsOf,
  prettyDate,
  useTable,
  useDeleteRow,
  useUpdateRow,
  useUpsert,
  weekdayOf,
} from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/classes/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    date:
      typeof search["date"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search["date"])
        ? search["date"]
        : undefined,
  }),
  head: () => ({
    meta: [{ title: "Lesson | ProgressTutors" }, { name: "robots", content: "noindex" }],
  }),
  component: ClassProfile,
});

const SUBJECT_OPTIONS = [
  "English",
  "Maths",
  "Science",
  "Biology",
  "Chemistry",
  "Physics",
  "Computing",
  "History",
  "Geography",
  "French",
  "Spanish",
  "Football",
];

function ClassProfile() {
  const { id } = Route.useParams();
  const { date: requestedDate } = Route.useSearch();
  return <ClassWorkspace id={id} requestedDate={requestedDate} />;
}

type ClassWorkspaceProps = {
  id: string;
  requestedDate?: string;
  embedded?: boolean;
  onClose?: () => void;
  onClone?: () => void;
};

export function ClassWorkspace({
  id,
  requestedDate,
  embedded = false,
  onClose,
  onClone,
}: ClassWorkspaceProps) {
  const navigate = useNavigate();
  const classes = useTable("classes", "name");
  const sites = useTable("sites", "name");
  const tutors = useTable("tutors", "first_name");
  const students = useTable("students", "first_name");
  const parents = useTable("parents", "first_name");
  const parentStudents = useTable("parent_students");
  const enrolments = useTable("class_enrolments");
  const sessions = useTable("sessions", "session_date");
  const attendance = useTable("student_attendance");
  const updateClass = useUpdateRow("classes");
  const deleteClass = useDeleteRow("classes");
  const addEnrolment = useUpsert("class_enrolments");
  const updateEnrolment = useUpdateRow("class_enrolments");
  const addSession = useUpsert("sessions", ["student_attendance"]);
  const addAttendance = useUpsert("student_attendance");
  const updateAttendance = useUpdateRow("student_attendance");

  const [lessonPickerOpen, setLessonPickerOpen] = useState(false);
  const [lessonSearch, setLessonSearch] = useState("");
  const [enrolOpen, setEnrolOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentSchool, setStudentSchool] = useState("all");
  const [studentYear, setStudentYear] = useState("all");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(
    () => requestedDate ?? format(new Date(), "yyyy-MM-dd"),
  );
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState<
    "all" | "present" | "absent" | "unmarked"
  >("all");
  const [initialisedClassId, setInitialisedClassId] = useState<string | null>(null);
  const [edit, setEdit] = useState({
    name: "",
    start_date: DEMO_DATE,
    start_time: "10:00",
    end_time: "11:00",
    recurrence: "weekly",
    end_date: "",
    delivery_mode: "in_person",
    site_id: "",
    venue_name: "",
    online_url: "",
    tutor_id: "",
    subject: "",
    level: "",
    room: "",
    capacity: "12",
    session_rate: "",
    price_per_session: "",
    card_colour: "pink",
    active: "active",
    notes: "",
    goprogress_course_url: "",
  });

  const rows = useMemo(() => classes.data ?? [], [classes.data]);
  const c = rows.find((item) => item.id === id);
  const visibleClasses = rows.filter((item) => item.active || item.id === id);

  useEffect(() => {
    if (!c || initialisedClassId === c.id) return;
    setEdit({
      name: c.name,
      start_date: c.start_date ?? DEMO_DATE,
      start_time: hhmm(c.start_time),
      end_time: hhmm(c.end_time),
      recurrence: c.recurrence ?? "weekly",
      end_date: c.end_date ?? "",
      delivery_mode: c.delivery_mode,
      site_id: c.site_id ?? "",
      venue_name: c.venue_name ?? "",
      online_url: c.online_url ?? "",
      tutor_id: c.tutor_id ?? "",
      subject: c.subject ?? "",
      level: c.level ?? "",
      room: c.room ?? "",
      capacity: String(c.capacity),
      session_rate: c.session_rate === null ? "" : String(c.session_rate),
      price_per_session: c.price_per_session === null ? "" : String(c.price_per_session),
      card_colour: c.card_colour ?? "pink",
      active: c.active ? "active" : "archived",
      notes: c.notes ?? "",
      goprogress_course_url: c.goprogress_course_url ?? "",
    });
    setInitialisedClassId(c.id);
  }, [c, initialisedClassId]);

  useEffect(() => {
    if (requestedDate) setAttendanceDate(requestedDate);
  }, [requestedDate]);

  if (classes.isLoading)
    return (
      <Page>
        <p className="py-12 text-center text-muted-foreground">Loading lesson…</p>
      </Page>
    );
  if (!c)
    return (
      <Page>
        <PageHeader title="Lesson not found" subtitle="It may have been removed." />
        <Link to="/admin/classes" className="text-sm font-bold text-primary">
          Back to schedule
        </Link>
      </Page>
    );

  const tutor = (tutors.data ?? []).find((item) => item.id === c.tutor_id);
  const roster = (enrolments.data ?? []).filter((item) => item.class_id === c.id);
  const activeRoster = roster.filter((item) => item.status === "active");
  const classSessions = (sessions.data ?? []).filter((item) => item.class_id === c.id);
  const sessionIds = new Set(classSessions.map((item) => item.id));
  const classAttendance = (attendance.data ?? []).filter((item) => sessionIds.has(item.session_id));
  const manageableStudents = (students.data ?? []).filter(
    (student) =>
      student.status === "active" || activeRoster.some((item) => item.student_id === student.id),
  );
  const studentSchools = Array.from(
    new Set(
      manageableStudents
        .map((student) => student.school)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort();
  const studentYears = Array.from(
    new Set(
      manageableStudents
        .map((student) => student.year_group)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort();
  const filteredStudents = manageableStudents.filter((student) => {
    const query = studentSearch.trim().toLowerCase();
    const haystack = [fullName(student), student.email, student.school, student.year_group]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      (!query || haystack.includes(query)) &&
      (studentSchool === "all" || student.school === studentSchool) &&
      (studentYear === "all" || student.year_group === studentYear)
    );
  });
  const attendanceSession = classSessions.find((item) => item.session_date === attendanceDate);
  const subjectOptions = Array.from(
    new Set([
      ...SUBJECT_OPTIONS,
      ...rows
        .map((item) => item.subject?.trim())
        .filter((value): value is string => Boolean(value)),
    ]),
  ).sort((a, b) => a.localeCompare(b, "en-GB"));

  const classLabel = (item: typeof c) => {
    const classSite = (sites.data ?? []).find((value) => value.id === item.site_id);
    return `${item.name} · ${classSite?.name ?? "Venue TBC"} · ${item.weekday ?? "Day TBC"} ${hhmm(item.start_time)}–${hhmm(item.end_time)}`;
  };
  const filteredLessons = visibleClasses.filter((lesson) => {
    const query = lessonSearch.trim().toLowerCase();
    return !query || classLabel(lesson).toLowerCase().includes(query);
  });
  const parentFor = (studentIdValue: string) => {
    const links = (parentStudents.data ?? []).filter((item) => item.student_id === studentIdValue);
    const link = links.find((item) => item.is_primary) ?? links[0];
    return (parents.data ?? []).find((item) => item.id === link?.parent_id);
  };
  const currentAttendanceFor = (studentIdValue: string) =>
    attendanceSession
      ? classAttendance.find(
          (item) => item.session_id === attendanceSession.id && item.student_id === studentIdValue,
        )
      : undefined;
  const attendanceRoster = activeRoster.filter((item) => {
    const student = (students.data ?? []).find((value) => value.id === item.student_id);
    const parent = parentFor(item.student_id);
    const query = attendanceSearch.trim().toLowerCase();
    const mark = currentAttendanceFor(item.student_id);
    const matchesAttendance =
      attendanceFilter === "all" ||
      (attendanceFilter === "present" && ["present", "late"].includes(mark?.status ?? "")) ||
      (attendanceFilter === "absent" && ["absent", "excused"].includes(mark?.status ?? "")) ||
      (attendanceFilter === "unmarked" && !mark);
    return (
      matchesAttendance &&
      (!query ||
        [fullName(student), student?.year_group, student?.school, fullName(parent)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query))
    );
  });
  const marksForDate = attendanceSession
    ? classAttendance.filter((item) => item.session_id === attendanceSession.id)
    : [];
  const presentForDate = marksForDate.filter((item) =>
    ["present", "late"].includes(item.status),
  ).length;
  const attendancePercentage = marksForDate.length
    ? Math.round((presentForDate / marksForDate.length) * 100)
    : null;

  const markAttendance = async (studentIdValue: string, status: "present" | "absent") => {
    try {
      let session = attendanceSession;
      if (!session) {
        const created = await addSession.mutateAsync({
          class_id: c.id,
          schedule_block_id: c.schedule_block_id,
          site_id: c.site_id,
          tutor_id: c.tutor_id,
          session_date: attendanceDate,
          start_time: c.start_time,
          end_time: c.end_time,
          status: "scheduled",
          agreed_amount: c.session_rate,
        });
        session = created[0];
      }
      if (!session) throw new Error("Could not create the lesson date");
      const existing = classAttendance.find(
        (item) => item.session_id === session.id && item.student_id === studentIdValue,
      );
      if (existing) {
        await updateAttendance.mutateAsync({ id: existing.id, values: { status } });
      } else {
        await addAttendance.mutateAsync({
          session_id: session.id,
          student_id: studentIdValue,
          status,
        });
      }
      toast.success(`Marked ${status} for ${prettyDate(session.session_date)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save attendance");
    }
  };
  const saveLesson = async () => {
    if (!edit.name.trim()) {
      toast.error("Add a lesson name before saving");
      return;
    }
    try {
      await updateClass.mutateAsync({
        id: c.id,
        values: {
          name: edit.name.trim(),
          start_date: edit.start_date,
          weekday: weekdayOf(edit.start_date),
          start_time: edit.start_time,
          end_time: edit.end_time,
          recurrence: edit.recurrence,
          end_date: edit.recurrence === "once" ? edit.start_date : edit.end_date || null,
          delivery_mode: edit.delivery_mode,
          site_id: edit.delivery_mode === "online" ? null : edit.site_id || null,
          venue_name: edit.delivery_mode === "online" ? null : edit.venue_name.trim() || null,
          online_url: edit.delivery_mode === "online" ? edit.online_url.trim() || null : null,
          tutor_id: edit.tutor_id || null,
          subject: edit.subject.trim() || null,
          level: edit.level.trim() || null,
          room: edit.room.trim() || null,
          capacity: Number(edit.capacity) || 0,
          session_rate: edit.session_rate ? Number(edit.session_rate) : null,
          price_per_session: edit.price_per_session ? Number(edit.price_per_session) : null,
          card_colour: edit.card_colour,
          active: edit.active === "active",
          notes: edit.notes.trim() || null,
          goprogress_course_url: edit.goprogress_course_url.trim() || null,
        },
      });
      toast.success("Lesson saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the lesson");
    }
  };

  return (
    <Page className={embedded ? "space-y-3 px-3 py-3 pb-24 sm:px-5 sm:py-4" : "space-y-3 pb-24"}>
      <section className="sticky top-0 z-20 rounded-2xl border border-border bg-card/95 p-2.5 shadow-sm backdrop-blur sm:p-3">
        <div className="flex min-w-0 items-center gap-2">
          {embedded ? (
            <Button size="icon" variant="ghost" aria-label="Close lesson" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <Button asChild size="icon" variant="ghost" aria-label="Back to schedule">
              <Link to="/admin/classes">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
          )}
          <Input
            value={edit.name}
            onChange={(event) => setEdit({ ...edit, name: event.target.value })}
            aria-label="Lesson name"
            className="min-w-0 flex-1 border-0 bg-transparent px-1 text-base font-extrabold shadow-none focus-visible:ring-0 sm:text-xl"
          />
          {embedded ? null : (
            <Button
              size="icon"
              variant="secondary"
              onClick={() => {
                setLessonSearch("");
                setLessonPickerOpen(true);
              }}
              aria-label="Change lesson"
            >
              <Filter className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
            aria-label="Delete lesson"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={saveLesson}
            disabled={updateClass.isPending}
            aria-label="Save lesson"
          >
            <Save className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2" aria-label="Lesson summary">
        <SummaryCard
          label="Attendance"
          hint={
            marksForDate.length ? `${presentForDate}/${marksForDate.length} present` : "Not marked"
          }
        >
          <AttendanceProgress percentage={attendancePercentage} compact />
        </SummaryCard>
        <SummaryCard label="Students" value={String(activeRoster.length)} hint="Enrolled">
          <Users className="h-5 w-5 text-emerald-600" />
        </SummaryCard>
        <SummaryCard
          label="Seats"
          value={String(Math.max(Number(edit.capacity) - activeRoster.length, 0))}
          hint={`${activeRoster.length}/${Number(edit.capacity) || 0} filled`}
        >
          <CalendarDays className="h-5 w-5 text-blue-600" />
        </SummaryCard>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-extrabold">Date &amp; time</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Start date"
              type="date"
              value={edit.start_date}
              onChange={(start_date) => setEdit({ ...edit, start_date })}
            />
            <SelectField
              label="Repeats"
              value={edit.recurrence}
              onChange={(recurrence) => setEdit({ ...edit, recurrence })}
              options={[
                { value: "once", label: "Does not repeat" },
                { value: "weekly", label: "Every week" },
              ]}
            />
            <LessonTimeRangePicker
              start={edit.start_time}
              end={edit.end_time}
              onChange={(start_time, end_time) => setEdit({ ...edit, start_time, end_time })}
            />
            {edit.recurrence === "weekly" ? (
              <TextField
                label="Repeat until"
                type="date"
                value={edit.end_date}
                onChange={(end_date) => setEdit({ ...edit, end_date })}
              />
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-extrabold">Lesson details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Subject"
              value={edit.subject}
              onChange={(subject) => setEdit({ ...edit, subject })}
              options={[
                { value: "", label: "Select subject" },
                ...subjectOptions.map((subject) => ({ value: subject, label: subject })),
              ]}
            />
            <TextField
              label="Level"
              value={edit.level}
              onChange={(level) => setEdit({ ...edit, level })}
            />
            <SelectField
              label="Delivery"
              value={edit.delivery_mode}
              onChange={(delivery_mode) => setEdit({ ...edit, delivery_mode })}
              options={[
                { value: "in_person", label: "Face-to-face" },
                { value: "online", label: "Online" },
                { value: "hybrid", label: "Hybrid" },
              ]}
            />
            {edit.delivery_mode === "online" ? (
              <TextField
                label="Meeting link"
                value={edit.online_url}
                onChange={(online_url) => setEdit({ ...edit, online_url })}
              />
            ) : (
              <SelectField
                label="Location"
                value={edit.site_id}
                onChange={(site_id) => setEdit({ ...edit, site_id })}
                options={[
                  { value: "", label: "Venue to confirm" },
                  ...(sites.data ?? []).map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
            )}
            <TextField
              label="Room"
              value={edit.room}
              onChange={(room) => setEdit({ ...edit, room })}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-extrabold">Tutor</h2>
          <div className="flex items-end gap-3">
            <Avatar
              initials={initialsOf(fullName(tutor))}
              tone={avatarTone(fullName(tutor))}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <SelectField
                label="Assigned tutor"
                value={edit.tutor_id}
                onChange={(tutor_id) => setEdit({ ...edit, tutor_id })}
                options={[
                  { value: "", label: "Not assigned" },
                  ...(tutors.data ?? []).map((item) => ({ value: item.id, label: fullName(item) })),
                ]}
              />
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Attendance &amp; students</h2>
            <p className="text-xs text-muted-foreground">
              Mark attendance and manage the lesson roster in one place.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 items-end gap-2 sm:w-auto sm:grid-cols-[11rem_8rem_auto]">
            <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
              Attendance for
              <input
                type="date"
                value={attendanceDate}
                onChange={(event) => setAttendanceDate(event.target.value)}
                className="h-9 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground"
              />
            </label>
            <TextField
              label="Capacity"
              type="number"
              value={edit.capacity}
              onChange={(capacity) => setEdit({ ...edit, capacity })}
            />
            <Button
              className="col-span-2 sm:col-span-1"
              onClick={() => {
                setSelectedStudentIds(activeRoster.map((item) => item.student_id));
                setStudentSearch("");
                setStudentSchool("all");
                setStudentYear("all");
                setEnrolOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Manage students
            </Button>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={attendanceSearch}
              onChange={(event) => setAttendanceSearch(event.target.value)}
              placeholder="Search students, parents, year or school"
              className="h-10 rounded-xl pl-9"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto" aria-label="Attendance filters">
            {(
              [
                ["all", "All"],
                ["present", "Present"],
                ["absent", "Absent"],
                ["unmarked", "Unmarked"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={attendanceFilter === value ? "default" : "outline"}
                className="shrink-0 rounded-full"
                onClick={() => setAttendanceFilter(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        {activeRoster.length === 0 ? (
          <div className="mt-4">
            <Empty>No students enrolled yet.</Empty>
          </div>
        ) : attendanceRoster.length === 0 ? (
          <div className="mt-4">
            <Empty>No students match your search.</Empty>
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[320px] table-fixed text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="w-[52%] px-2 py-2.5 sm:px-3">Student</th>
                  <th className="w-[24%] px-1 py-2.5 text-center">Present</th>
                  <th className="w-[24%] px-1 py-2.5 text-center">Absent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attendanceRoster.map((item) => {
                  const student = (students.data ?? []).find(
                    (value) => value.id === item.student_id,
                  );
                  const currentAttendance = currentAttendanceFor(item.student_id);
                  const saving =
                    addSession.isPending || addAttendance.isPending || updateAttendance.isPending;
                  return (
                    <tr key={item.id}>
                      <td className="px-2 py-2.5 sm:px-3">
                        <Link
                          to="/admin/students/$id"
                          params={{ id: item.student_id }}
                          className="flex min-w-0 items-center gap-2 font-bold hover:text-primary"
                        >
                          <Avatar
                            initials={initialsOf(fullName(student))}
                            tone={avatarTone(fullName(student))}
                            size="sm"
                          />
                          <span className="min-w-0 truncate">{fullName(student)}</span>
                        </Link>
                      </td>
                      <td className="px-1 py-2.5 text-center">
                        <AttendanceChoiceButton
                          type="present"
                          selected={currentAttendance?.status === "present"}
                          disabled={saving}
                          onClick={() => markAttendance(item.student_id, "present")}
                        />
                      </td>
                      <td className="px-1 py-2.5 text-center">
                        <AttendanceChoiceButton
                          type="absent"
                          selected={currentAttendance?.status === "absent"}
                          disabled={saving}
                          onClick={() => markAttendance(item.student_id, "absent")}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur sm:left-auto sm:right-5 sm:bottom-5 sm:w-auto sm:rounded-2xl sm:border">
        <div className="mx-auto flex max-w-xl gap-2 sm:w-[28rem]">
          <Button className="flex-1" variant="secondary" onClick={onClone} disabled={!onClone}>
            <Copy className="h-4 w-4" /> Clone lesson
          </Button>
          <Button className="flex-1" asChild>
            <Link to="/admin/classes/$id" params={{ id: c.id }} search={{ date: attendanceDate }}>
              See lesson
            </Link>
          </Button>
        </div>
      </footer>

      <Dialog open={lessonPickerOpen} onOpenChange={setLessonPickerOpen}>
        <DialogContent className="flex max-h-[82vh] flex-col p-0 sm:max-w-xl">
          <DialogHeader className="px-5 pt-5 text-left">
            <DialogTitle>Change lesson</DialogTitle>
            <DialogDescription>Search and choose another lesson.</DialogDescription>
          </DialogHeader>
          <div className="relative px-5">
            <Search className="absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={lessonSearch}
              onChange={(event) => setLessonSearch(event.target.value)}
              placeholder="Search lesson, venue, day or time"
              className="h-11 rounded-xl pl-10"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            <div className="mt-3 divide-y divide-border rounded-xl border border-border">
              {filteredLessons.map((lesson) => (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => {
                    setLessonPickerOpen(false);
                    navigate({ to: "/admin/classes/$id", params: { id: lesson.id } });
                  }}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{lesson.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {classLabel(lesson)}
                    </span>
                  </span>
                  {lesson.id === c.id ? <Check className="h-4 w-4 text-primary" /> : null}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={enrolOpen} onOpenChange={setEnrolOpen}>
        <DialogContent className="flex max-h-[88vh] flex-col p-0 sm:max-w-2xl">
          <DialogHeader className="px-5 pt-5 text-left">
            <DialogTitle>Manage students</DialogTitle>
            <DialogDescription>
              Tick students to add them. Untick enrolled students to remove them from this lesson.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 px-5 sm:grid-cols-2">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Search name, email, school or year"
                className="h-11 rounded-xl pl-10"
              />
            </div>
            <SelectField
              label="School"
              value={studentSchool}
              onChange={setStudentSchool}
              options={[
                { value: "all", label: "All schools" },
                ...studentSchools.map((school) => ({ value: school, label: school })),
              ]}
            />
            <SelectField
              label="Year group"
              value={studentYear}
              onChange={setStudentYear}
              options={[
                { value: "all", label: "All year groups" },
                ...studentYears.map((year) => ({ value: year, label: year })),
              ]}
            />
          </div>
          <div className="flex items-center justify-between border-y border-border px-5 py-3 text-sm">
            <span className="font-semibold">{selectedStudentIds.length} selected</span>
            <button
              type="button"
              className="font-bold text-primary"
              onClick={() => {
                const visibleIds = filteredStudents.map((student) => student.id);
                const allVisibleSelected =
                  visibleIds.length > 0 &&
                  visibleIds.every((studentId) => selectedStudentIds.includes(studentId));
                setSelectedStudentIds(
                  allVisibleSelected
                    ? selectedStudentIds.filter((studentId) => !visibleIds.includes(studentId))
                    : Array.from(new Set([...selectedStudentIds, ...visibleIds])),
                );
              }}
            >
              {filteredStudents.length > 0 &&
              filteredStudents.every((student) => selectedStudentIds.includes(student.id))
                ? "Clear visible"
                : "Select all visible"}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5">
            {filteredStudents.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No students match these filters.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {filteredStudents.map((student) => {
                  const selected = selectedStudentIds.includes(student.id);
                  return (
                    <li key={student.id}>
                      <label className="flex cursor-pointer items-center gap-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() =>
                            setSelectedStudentIds(
                              selected
                                ? selectedStudentIds.filter((studentId) => studentId !== student.id)
                                : [...selectedStudentIds, student.id],
                            )
                          }
                          className="h-5 w-5 shrink-0 accent-[var(--color-primary)]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">
                            {fullName(student)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[student.year_group, student.school, student.email]
                              .filter(Boolean)
                              .join(" · ") || "No extra details"}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <DialogFooter className="border-t border-border p-4 sm:space-x-2">
            <Button type="button" variant="ghost" onClick={() => setEnrolOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={addEnrolment.isPending || updateEnrolment.isPending}
              onClick={async () => {
                try {
                  const selected = new Set(selectedStudentIds);
                  const existingByStudent = new Map(roster.map((item) => [item.student_id, item]));
                  const toReactivate = roster.filter(
                    (item) => selected.has(item.student_id) && item.status !== "active",
                  );
                  const toRemove = roster.filter(
                    (item) => item.status === "active" && !selected.has(item.student_id),
                  );
                  await Promise.all([
                    ...toReactivate.map((item) =>
                      updateEnrolment.mutateAsync({
                        id: item.id,
                        values: { status: "active", end_date: null },
                      }),
                    ),
                    ...toRemove.map((item) =>
                      updateEnrolment.mutateAsync({
                        id: item.id,
                        values: {
                          status: "inactive",
                          end_date: new Date().toISOString().slice(0, 10),
                        },
                      }),
                    ),
                  ]);
                  const fresh = selectedStudentIds.filter(
                    (studentId) => !existingByStudent.has(studentId),
                  );
                  if (fresh.length > 0)
                    await addEnrolment.mutateAsync(
                      fresh.map((studentId) => ({
                        class_id: c.id,
                        student_id: studentId,
                        status: "active",
                      })),
                    );
                  toast.success("Class students updated");
                  setSelectedStudentIds([]);
                  setEnrolOpen(false);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not add students");
                }
              }}
            >
              {addEnrolment.isPending || updateEnrolment.isPending ? "Saving…" : "Save students"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(nextOpen) => {
          if (!deleteClass.isPending) setDeleteOpen(nextOpen);
        }}
        title="Are you sure you want to delete this lesson?"
        description="This cannot be undone. Enrolments and linked lesson records will also be removed."
        confirmLabel="Delete lesson"
        busy={deleteClass.isPending}
        onConfirm={async () => {
          try {
            await deleteClass.mutateAsync(c.id);
            toast.success("Lesson deleted");
            setDeleteOpen(false);
            if (embedded) onClose?.();
            else navigate({ to: "/admin/classes" });
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not delete the lesson");
          }
        }}
      />
    </Page>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value?: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <article className="flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">
      <div className="min-w-0">
        {value ? <p className="text-xl font-extrabold leading-none sm:text-2xl">{value}</p> : null}
        <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-[10px] text-muted-foreground">{hint}</p>
      </div>
      {children}
    </article>
  );
}

function AttendanceProgress({
  percentage,
  compact = false,
}: {
  percentage: number | null;
  compact?: boolean;
}) {
  const safePercentage = Math.max(0, Math.min(100, percentage ?? 0));
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center rounded-full ${compact ? "h-12 w-12" : "h-16 w-16"}`}
      style={{
        background: `conic-gradient(var(--primary) ${safePercentage * 3.6}deg, var(--muted) 0deg)`,
      }}
      role="img"
      aria-label={percentage === null ? "Attendance not marked" : `${percentage}% attendance`}
    >
      <span className="absolute inset-[5px] grid place-items-center rounded-full bg-card text-xs font-extrabold">
        {percentage === null ? "—" : `${percentage}%`}
      </span>
    </span>
  );
}

function AttendanceChoiceButton({
  type,
  selected,
  disabled,
  onClick,
}: {
  type: "present" | "absent";
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const isPresent = type === "present";
  return (
    <Button
      type="button"
      size="sm"
      variant={selected ? (isPresent ? "default" : "destructive") : "outline"}
      className={`h-9 w-full gap-1 px-1 text-[11px] sm:text-xs ${
        selected && isPresent
          ? "bg-emerald-600 hover:bg-emerald-700"
          : !selected && !isPresent
            ? "text-destructive hover:text-destructive"
            : ""
      }`}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`Mark ${type}`}
    >
      {isPresent ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      <span>{isPresent ? "Present" : "Absent"}</span>
    </Button>
  );
}
