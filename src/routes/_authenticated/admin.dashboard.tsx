import { createFileRoute, Link } from "@tanstack/react-router";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Plus,
  RotateCcw,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Page } from "@/components/AppShell";
import { SelectField } from "@/components/form-kit";
import { Avatar, avatarTone, Empty, PageHeader, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { fullName, hhmm, initialsOf, useTable, type ClassRow } from "@/lib/db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Operations Dashboard | ProgressTutors" },
      {
        name: "description",
        content: "Schedule, attendance, students and tutor workload for your tuition centre.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

type CalendarView = "day" | "week" | "month";

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

const SCHEDULE_COLOURS = {
  pink: "border-pink-800 bg-pink-600 text-white",
  blue: "border-blue-800 bg-blue-600 text-white",
  green: "border-emerald-800 bg-emerald-600 text-white",
  amber: "border-amber-600 bg-amber-400 text-amber-950",
  violet: "border-violet-800 bg-violet-600 text-white",
  teal: "border-teal-800 bg-teal-600 text-white",
} as const;

type ScheduleColour = keyof typeof SCHEDULE_COLOURS;
const SCHEDULE_COLOUR_NAMES = Object.keys(SCHEDULE_COLOURS) as ScheduleColour[];
const SCHEDULE_HOURS = Array.from({ length: 13 }, (_, index) => index + 8);
const SCHEDULE_HOUR_HEIGHT = 56;
const SCHEDULE_MINUTE_SCALE = SCHEDULE_HOUR_HEIGHT / 60;
const SCHEDULE_HEIGHT = SCHEDULE_HOURS.length * SCHEDULE_HOUR_HEIGHT;

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function scheduleColour(lesson: ClassRow) {
  if (lesson.card_colour && lesson.card_colour in SCHEDULE_COLOURS) {
    return SCHEDULE_COLOURS[lesson.card_colour as ScheduleColour];
  }
  const index = stableHash(lesson.tutor_id ?? lesson.id) % SCHEDULE_COLOUR_NAMES.length;
  return SCHEDULE_COLOURS[SCHEDULE_COLOUR_NAMES[index] ?? "pink"];
}

function minutes(time: string | null | undefined) {
  if (!time) return 0;
  const [hour, minute] = time.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

function lessonHours(lesson: ClassRow) {
  return Math.max(0, minutes(lesson.end_time) - minutes(lesson.start_time)) / 60;
}

function lessonRunsOn(lesson: ClassRow, date: Date) {
  const iso = format(date, "yyyy-MM-dd");
  if (lesson.start_date && iso < lesson.start_date) return false;
  if (lesson.end_date && iso > lesson.end_date) return false;
  if (lesson.recurrence === "once") return lesson.start_date === iso;
  return lesson.weekday === format(date, "EEEE");
}

function genderGroup(value: string | null | undefined) {
  const gender = (value ?? "").trim().toLowerCase();
  if (["boy", "boys", "male", "m"].includes(gender)) return "Boys";
  if (["girl", "girls", "female", "f"].includes(gender)) return "Girls";
  return "Not recorded";
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="surface min-w-0 p-4 sm:p-5">
      <h2 className="font-bold">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      <div className="mt-4 h-64 min-w-0 sm:h-72">{children}</div>
    </section>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  fontSize: 12,
};

function AdminDashboard() {
  const lessons = useTable("classes", "start_time");
  const students = useTable("students", "first_name");
  const tutors = useTable("tutors", "first_name");
  const enrolments = useTable("class_enrolments");
  const sessions = useTable("sessions", "session_date");
  const attendance = useTable("student_attendance", "recorded_at");
  const sites = useTable("sites", "name");

  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [calendarView, setCalendarView] = useState<CalendarView>("day");
  const [rangeDays, setRangeDays] = useState("30");
  const [siteFilter, setSiteFilter] = useState("all");
  const [tutorFilter, setTutorFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");

  const activeLessons = useMemo(
    () => (lessons.data ?? []).filter((lesson) => lesson.active),
    [lessons.data],
  );
  const subjects = useMemo(
    () =>
      Array.from(
        new Set(activeLessons.map((lesson) => lesson.subject?.trim()).filter(Boolean) as string[]),
      ).sort((a, b) => a.localeCompare(b, "en-GB")),
    [activeLessons],
  );
  const filteredLessons = useMemo(
    () =>
      activeLessons.filter(
        (lesson) =>
          (siteFilter === "all" || lesson.site_id === siteFilter) &&
          (tutorFilter === "all" ||
            (tutorFilter === "unassigned" ? !lesson.tutor_id : lesson.tutor_id === tutorFilter)) &&
          (subjectFilter === "all" || lesson.subject === subjectFilter) &&
          (deliveryFilter === "all" || lesson.delivery_mode === deliveryFilter),
      ),
    [activeLessons, deliveryFilter, siteFilter, subjectFilter, tutorFilter],
  );
  const filteredLessonIds = useMemo(
    () => new Set(filteredLessons.map((lesson) => lesson.id)),
    [filteredLessons],
  );

  const analyticsEnd = new Date();
  const analyticsStart = subDays(analyticsEnd, Number(rangeDays) - 1);
  const analyticsDates = eachDayOfInterval({ start: analyticsStart, end: analyticsEnd });
  const filteredSessions = (sessions.data ?? []).filter(
    (session) =>
      Boolean(session.class_id && filteredLessonIds.has(session.class_id)) &&
      session.session_date >= format(analyticsStart, "yyyy-MM-dd") &&
      session.session_date <= format(analyticsEnd, "yyyy-MM-dd"),
  );
  const filteredSessionIds = new Set(filteredSessions.map((session) => session.id));
  const filteredAttendance = (attendance.data ?? []).filter((mark) =>
    filteredSessionIds.has(mark.session_id),
  );
  const attendedMarks = filteredAttendance.filter((mark) =>
    ["present", "late"].includes(mark.status),
  ).length;
  const attendanceRate = filteredAttendance.length
    ? Math.round((attendedMarks / filteredAttendance.length) * 100)
    : 0;
  const activeEnrolments = (enrolments.data ?? []).filter(
    (item) => item.status === "active" && filteredLessonIds.has(item.class_id),
  );
  const filteredStudentIds = new Set(activeEnrolments.map((item) => item.student_id));

  const attendanceTimeline = useMemo(() => {
    const points = new Map<
      string,
      { date: string; dateLabel: string; fullDate: string; studentIds: Set<string> }
    >();
    analyticsDates.forEach((date) => {
      const dateKey = format(date, "yyyy-MM-dd");
      points.set(dateKey, {
        date: dateKey,
        dateLabel: format(date, "d MMM"),
        fullDate: format(date, "EEEE d MMMM yyyy"),
        studentIds: new Set<string>(),
      });
    });
    const sessionDates = new Map(
      filteredSessions.map((session) => [session.id, session.session_date]),
    );
    filteredAttendance.forEach((mark) => {
      const sessionDate = sessionDates.get(mark.session_id);
      if (!sessionDate) return;
      const point = points.get(sessionDate);
      if (!point) return;
      if (["present", "late"].includes(mark.status)) point.studentIds.add(mark.student_id);
    });
    return Array.from(points.values())
      .map((point) => ({
        date: point.date,
        dateLabel: point.dateLabel,
        fullDate: point.fullDate,
        studentsAttended: point.studentIds.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [analyticsDates, filteredAttendance, filteredSessions]);

  const genderAttendance = useMemo(() => {
    const studentMap = new Map((students.data ?? []).map((student) => [student.id, student]));
    const groups = new Map([
      ["Boys", { name: "Boys", Present: 0, Absent: 0 }],
      ["Girls", { name: "Girls", Present: 0, Absent: 0 }],
      ["Not recorded", { name: "Not recorded", Present: 0, Absent: 0 }],
    ]);
    filteredAttendance.forEach((mark) => {
      const group = groups.get(genderGroup(studentMap.get(mark.student_id)?.gender));
      if (!group) return;
      if (["present", "late"].includes(mark.status)) group.Present += 1;
      else if (mark.status === "absent") group.Absent += 1;
    });
    return Array.from(groups.values());
  }, [filteredAttendance, students.data]);

  const lessonOccurrences = useMemo(
    () =>
      analyticsDates.reduce(
        (total, date) =>
          total + filteredLessons.filter((lesson) => lessonRunsOn(lesson, date)).length,
        0,
      ),
    [analyticsDates, filteredLessons],
  );
  const lessonAttendance = useMemo(() => {
    const sessionClasses = new Map(
      filteredSessions.map((session) => [session.id, session.class_id]),
    );
    const studentsByLesson = new Map(
      filteredLessons.map((lesson) => [lesson.id, new Set<string>()]),
    );
    filteredAttendance.forEach((mark) => {
      if (!["present", "late"].includes(mark.status)) return;
      const classId = sessionClasses.get(mark.session_id);
      if (!classId) return;
      studentsByLesson.get(classId)?.add(mark.student_id);
    });
    return filteredLessons
      .map((lesson) => ({
        lesson: lesson.name,
        studentsAttended: studentsByLesson.get(lesson.id)?.size ?? 0,
      }))
      .sort(
        (a, b) =>
          b.studentsAttended - a.studentsAttended || a.lesson.localeCompare(b.lesson, "en-GB"),
      );
  }, [filteredAttendance, filteredLessons, filteredSessions]);

  const tutorLeaderboard = useMemo(() => {
    const totals = new Map<string, { hours: number; lessons: number }>();
    analyticsDates.forEach((date) => {
      filteredLessons.forEach((lesson) => {
        if (!lesson.tutor_id || !lessonRunsOn(lesson, date)) return;
        const current = totals.get(lesson.tutor_id) ?? { hours: 0, lessons: 0 };
        current.hours += lessonHours(lesson);
        current.lessons += 1;
        totals.set(lesson.tutor_id, current);
      });
    });
    return Array.from(totals.entries())
      .map(([tutorId, total]) => ({
        tutor: (tutors.data ?? []).find((item) => item.id === tutorId),
        ...total,
      }))
      .filter((item) => item.tutor)
      .sort((a, b) => b.hours - a.hours || b.lessons - a.lessons)
      .slice(0, 8);
  }, [analyticsDates, filteredLessons, tutors.data]);

  const anchor = parseISO(selectedDate);
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const calendarDays =
    calendarView === "day"
      ? [anchor]
      : calendarView === "week"
        ? Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
        : eachDayOfInterval({
            start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
            end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
          });
  const moveCalendar = (direction: -1 | 1) => {
    const next =
      calendarView === "day"
        ? addDays(anchor, direction)
        : calendarView === "week"
          ? direction < 0
            ? subWeeks(anchor, 1)
            : addWeeks(anchor, 1)
          : direction < 0
            ? subMonths(anchor, 1)
            : addMonths(anchor, 1);
    setSelectedDate(format(next, "yyyy-MM-dd"));
  };
  const calendarTitle =
    calendarView === "day"
      ? format(anchor, "EEEE d MMMM yyyy")
      : calendarView === "week"
        ? `${format(weekStart, "d MMM")} to ${format(addDays(weekStart, 6), "d MMM yyyy")}`
        : format(anchor, "MMMM yyyy");

  const enrolmentCount = (lesson: ClassRow) =>
    activeEnrolments.filter((item) => item.class_id === lesson.id).length;

  const scheduleCard = (lesson: ClassRow, compact = false) => {
    const tutor = (tutors.data ?? []).find((item) => item.id === lesson.tutor_id);
    const enrolled = enrolmentCount(lesson);
    const filled = lesson.capacity > 0 ? Math.min(100, (enrolled / lesson.capacity) * 100) : 0;
    const tutorName = tutor ? fullName(tutor) : "Teacher needed";
    return (
      <Link
        key={lesson.id}
        to="/admin/classes/$id"
        params={{ id: lesson.id }}
        title={`${lesson.name}. ${enrolled} of ${lesson.capacity} seats filled. ${tutorName}.`}
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-xl border border-l-4 border-white/30 p-1.5 text-left shadow-sm ring-1 ring-black/5 transition hover:brightness-95",
          scheduleColour(lesson),
          compact ? "text-[9px]" : "text-[10px] sm:text-xs",
        )}
      >
        <p className="line-clamp-2 font-extrabold leading-tight">{lesson.name}</p>
        <p className="mt-0.5 whitespace-nowrap text-[9px] font-semibold leading-none opacity-85">
          {hhmm(lesson.start_time)}-{hhmm(lesson.end_time)}
        </p>
        {!compact ? (
          <div className="mt-auto min-w-0 pt-1">
            <div className="mb-1 h-1 overflow-hidden rounded-full bg-black/20">
              <div className="h-full rounded-full bg-white/90" style={{ width: `${filled}%` }} />
            </div>
            <div className="flex min-w-0 items-end justify-between gap-1">
              <span title={tutorName}>
                <Avatar initials={initialsOf(tutorName)} tone={avatarTone(tutorName)} size="sm" />
              </span>
              <span className="shrink-0 whitespace-nowrap rounded-full bg-black/20 px-1.5 py-0.5 text-[9px] font-extrabold leading-none">
                {enrolled}/{lesson.capacity} seats
              </span>
            </div>
          </div>
        ) : null}
      </Link>
    );
  };

  const compactTimeline = (days: Date[]) => (
    <div className="mt-3 max-h-[430px] overflow-auto rounded-xl border border-border bg-card">
      <div className={cn("min-w-[760px]", days.length === 1 && "min-w-0")}>
        <div
          className="sticky top-0 z-20 grid border-b border-border bg-card"
          style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <div className="p-1.5" />
          {days.map((day) => (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => setSelectedDate(format(day, "yyyy-MM-dd"))}
              className="border-l border-border p-1.5 text-center hover:bg-muted"
            >
              <span className="block text-[9px] font-bold uppercase text-muted-foreground">
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold",
                  format(day, "yyyy-MM-dd") === selectedDate &&
                    "bg-primary text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </span>
            </button>
          ))}
        </div>
        <div
          className="grid"
          style={{ gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <div className="relative" style={{ height: SCHEDULE_HEIGHT }}>
            {SCHEDULE_HOURS.map((hour) => (
              <span
                key={hour}
                className="absolute right-1.5 -translate-y-2 text-[9px] text-muted-foreground"
                style={{ top: `${(hour - 8) * SCHEDULE_HOUR_HEIGHT}px` }}
              >
                {hour}:00
              </span>
            ))}
          </div>
          {days.map((day) => {
            const dayLessons = filteredLessons
              .filter((lesson) => lessonRunsOn(lesson, day))
              .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
            return (
              <div
                key={day.toISOString()}
                className="relative border-l border-border"
                style={{
                  height: SCHEDULE_HEIGHT,
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${SCHEDULE_HOUR_HEIGHT - 1}px, var(--border) ${SCHEDULE_HOUR_HEIGHT}px)`,
                }}
              >
                {dayLessons.map((lesson) => {
                  const top =
                    Math.max(0, minutes(lesson.start_time) - 8 * 60) * SCHEDULE_MINUTE_SCALE;
                  const height = Math.max(
                    38,
                    (minutes(lesson.end_time) - minutes(lesson.start_time)) * SCHEDULE_MINUTE_SCALE,
                  );
                  const overlappingLessons = dayLessons.filter(
                    (candidate) =>
                      minutes(candidate.start_time) < minutes(lesson.end_time) &&
                      minutes(candidate.end_time) > minutes(lesson.start_time),
                  );
                  const overlapIndex = overlappingLessons.findIndex(
                    (candidate) => candidate.id === lesson.id,
                  );
                  const width = overlappingLessons.length > 1 ? 94 / overlappingLessons.length : 94;
                  return (
                    <div
                      key={lesson.id}
                      className="absolute px-0.5"
                      style={{
                        top,
                        height,
                        left: `${3 + Math.max(0, overlapIndex) * width}%`,
                        width: `${width}%`,
                      }}
                    >
                      {scheduleCard(lesson, days.length > 3)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  function resetFilters() {
    setRangeDays("30");
    setSiteFilter("all");
    setTutorFilter("all");
    setSubjectFilter("all");
    setDeliveryFilter("all");
  }

  return (
    <Page className="space-y-5">
      <PageHeader
        title="Operations dashboard"
        subtitle="Schedule, attendance and teaching activity. Financial information stays in Payments."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link to="/admin/students" search={{ add: true }}>
                <UserPlus className="h-4 w-4" /> Add student
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/admin/tutors" search={{ add: true }}>
                <Users className="h-4 w-4" /> Add teacher
              </Link>
            </Button>
            <Button asChild>
              <Link to="/admin/classes" search={{ add: true }}>
                <Plus className="h-4 w-4" /> Add lesson
              </Link>
            </Button>
          </div>
        }
      />

      <section className="surface p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <SelectField
            label="Reporting period"
            value={rangeDays}
            onChange={setRangeDays}
            options={RANGE_OPTIONS}
          />
          <SelectField
            label="Site"
            value={siteFilter}
            onChange={setSiteFilter}
            options={[
              { value: "all", label: "All sites" },
              ...(sites.data ?? []).map((site) => ({ value: site.id, label: site.name })),
            ]}
          />
          <SelectField
            label="Teacher"
            value={tutorFilter}
            onChange={setTutorFilter}
            options={[
              { value: "all", label: "All teachers" },
              { value: "unassigned", label: "Unassigned" },
              ...(tutors.data ?? []).map((tutor) => ({
                value: tutor.id,
                label: fullName(tutor),
              })),
            ]}
          />
          <SelectField
            label="Subject"
            value={subjectFilter}
            onChange={setSubjectFilter}
            options={[
              { value: "all", label: "All subjects" },
              ...subjects.map((subject) => ({ value: subject, label: subject })),
            ]}
          />
          <SelectField
            label="Delivery"
            value={deliveryFilter}
            onChange={setDeliveryFilter}
            options={[
              { value: "all", label: "All delivery" },
              { value: "in_person", label: "Face-to-face" },
              { value: "online", label: "Online" },
              { value: "hybrid", label: "Hybrid" },
            ]}
          />
          <Button variant="ghost" onClick={resetFilters}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Link to="/admin/classes" className="block rounded-2xl focus:outline-none focus:ring-2">
          <StatCard
            label="Lessons in period"
            value={String(lessonOccurrences)}
            tone="pink"
            icon={<CalendarDays className="h-5 w-5" />}
          />
        </Link>
        <Link to="/admin/students" className="block rounded-2xl focus:outline-none focus:ring-2">
          <StatCard
            label="Students"
            value={String(filteredStudentIds.size)}
            tone="green"
            icon={<GraduationCap className="h-5 w-5" />}
          />
        </Link>
        <Link to="/admin/tutors" className="block rounded-2xl focus:outline-none focus:ring-2">
          <StatCard
            label="Teachers"
            value={String(tutorLeaderboard.length)}
            tone="purple"
            icon={<Users className="h-5 w-5" />}
          />
        </Link>
        <StatCard
          label="Attendance"
          value={filteredAttendance.length ? `${attendanceRate}%` : "No data"}
          hint={`${filteredAttendance.length} register marks`}
          tone="blue"
          icon={<BarChart3 className="h-5 w-5" />}
        />
      </div>

      <section className="surface p-3 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <h2 className="font-bold">Schedule</h2>
            <p className="text-xs text-muted-foreground">A compact view of the main timetable.</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
            >
              Today
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => moveCalendar(-1)}
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => moveCalendar(1)} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <Link to="/admin/classes">Open schedule</Link>
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-extrabold sm:text-base">{calendarTitle}</p>
          <div className="flex rounded-xl bg-muted p-1">
            {(["day", "week", "month"] as CalendarView[]).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setCalendarView(view)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold capitalize",
                  calendarView === view
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                {view}
              </button>
            ))}
          </div>
        </div>
        {calendarView === "day" ? compactTimeline([anchor]) : null}
        {calendarView === "week" ? compactTimeline(calendarDays) : null}
        {calendarView === "month" ? (
          <div className="mt-3 grid max-h-[430px] grid-cols-7 overflow-auto rounded-xl border border-border bg-card">
            {Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)).map((day) => (
              <div
                key={format(day, "EEEE")}
                className="sticky top-0 z-10 border-b border-r border-border bg-card p-1.5 text-center text-[9px] font-bold uppercase text-muted-foreground"
              >
                {format(day, "EEE")}
              </div>
            ))}
            {calendarDays.map((day) => {
              const dayLessons = filteredLessons.filter((lesson) => lessonRunsOn(lesson, day));
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    setSelectedDate(format(day, "yyyy-MM-dd"));
                    setCalendarView("day");
                  }}
                  className={cn(
                    "min-h-20 border-b border-r border-border p-1 text-left hover:bg-muted/40",
                    !isSameMonth(day, anchor) && "bg-muted/30 text-muted-foreground",
                  )}
                >
                  <span className="text-[10px] font-bold">{format(day, "d")}</span>
                  <span className="mt-1 block space-y-1">
                    {dayLessons.slice(0, 2).map((lesson) => (
                      <span
                        key={lesson.id}
                        className={cn(
                          "block truncate rounded px-1 py-0.5 text-[8px] font-bold",
                          scheduleColour(lesson),
                        )}
                      >
                        {hhmm(lesson.start_time)} {lesson.name}
                      </span>
                    ))}
                    {dayLessons.length > 2 ? (
                      <span className="block text-[8px] font-bold text-primary">
                        +{dayLessons.length - 2} more
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <ChartCard
          title="Attendance over time"
          subtitle="Unique students marked present or late across all lessons on each day"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={attendanceTimeline}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [Number(value), "Unique students attended"]}
                labelFormatter={(label, payload) => String(payload[0]?.payload?.fullDate ?? label)}
              />
              <Line
                type="monotone"
                dataKey="studentsAttended"
                name="Unique students attended"
                stroke="#ec2d70"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Attendance by gender"
          subtitle="Recorded attendance only. Missing gender remains visible rather than inferred."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={genderAttendance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Present" stackId="attendance" fill="#19a974" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Absent" stackId="attendance" fill="#ec2d70" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Students attending each lesson"
          subtitle="Unique students marked present or late for each lesson in the selected reporting period"
        >
          <div className="h-full overflow-x-auto">
            <div
              className="h-full"
              style={{ minWidth: `${Math.max(560, lessonAttendance.length * 105)}px` }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={lessonAttendance}
                  margin={{ top: 10, right: 10, left: -20, bottom: 78 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="lesson"
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={82}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [Number(value), "Unique students attended"]}
                  />
                  <Bar
                    dataKey="studentsAttended"
                    name="Unique students attended"
                    fill="#6c49b8"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </ChartCard>

        <section className="surface min-w-0 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold">Teacher leaderboard</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Scheduled teaching hours in the selected reporting period
              </p>
            </div>
            <Link to="/admin/tutors" className="text-xs font-bold text-primary">
              All teachers
            </Link>
          </div>
          {tutorLeaderboard.length === 0 ? (
            <div className="mt-4">
              <Empty>No assigned teaching hours match these filters.</Empty>
            </div>
          ) : (
            <ol className="mt-4 space-y-2">
              {tutorLeaderboard.map((item, index) => {
                const name = fullName(item.tutor);
                return (
                  <li key={item.tutor!.id}>
                    <Link
                      to="/admin/tutors/$id"
                      params={{ id: item.tutor!.id }}
                      className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 hover:border-primary/40"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                        {index + 1}
                      </span>
                      <Avatar initials={initialsOf(name)} tone={avatarTone(name)} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {item.lessons} lesson{item.lessons === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="text-sm font-extrabold text-primary">
                        {item.hours.toFixed(item.hours % 1 ? 1 : 0)}h
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </Page>
  );
}
