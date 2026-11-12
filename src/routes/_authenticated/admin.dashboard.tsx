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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  GraduationCap,
  Info,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
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
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Page } from "@/components/AppShell";
import { FilterDialog } from "@/components/filter-dialog";
import { SelectField } from "@/components/form-kit";
import { Avatar, avatarTone, Empty, PageHeader, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip as InfoTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  { value: "custom", label: "Custom dates" },
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
  help,
  children,
}: {
  title: string;
  subtitle: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <section className="surface min-w-0 p-4 sm:p-5">
      <div className="flex items-center gap-1.5">
        <h2 className="font-bold">{title}</h2>
        {help ? <InfoButton label={help} /> : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      <div className="mt-4 h-64 min-w-0 sm:h-72">{children}</div>
    </section>
  );
}

function InfoButton({ label }: { label: string }) {
  return (
    <TooltipProvider delayDuration={100}>
      <InfoTooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            title={label}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-72 text-xs">{label}</TooltipContent>
      </InfoTooltip>
    </TooltipProvider>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  fontSize: 12,
};

function AttendanceDateTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
}) {
  const [day = "", ...dateParts] = String(payload?.value ?? "").split(" ");
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill="currentColor" className="text-[10px] text-muted-foreground">
        <tspan x="0" dy="12" className="font-bold">
          {day}
        </tspan>
        <tspan x="0" dy="13">
          {dateParts.join(" ")}
        </tspan>
      </text>
    </g>
  );
}

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
  const [rangeDays, setRangeDays] = useState("7");
  const [customStartDate, setCustomStartDate] = useState(() =>
    format(subDays(new Date(), 6), "yyyy-MM-dd"),
  );
  const [customEndDate, setCustomEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const activeFilterCount =
    [siteFilter, tutorFilter, subjectFilter, deliveryFilter].filter((value) => value !== "all")
      .length + (rangeDays === "7" ? 0 : 1);
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

  const analyticsEnd =
    rangeDays === "custom" && customEndDate ? parseISO(customEndDate) : new Date();
  const analyticsStart =
    rangeDays === "custom" && customStartDate
      ? parseISO(customStartDate)
      : subDays(analyticsEnd, Number(rangeDays) - 1);
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
      { date: string; dateLabel: string; fullDate: string; studentsAttended: number }
    >();
    analyticsDates.forEach((date) => {
      const key = format(date, "yyyy-MM-dd");
      points.set(key, {
        date: key,
        dateLabel: format(date, "EEE d MMM"),
        fullDate: format(date, "EEEE d MMMM yyyy"),
        studentsAttended: 0,
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
      if (["present", "late"].includes(mark.status)) point.studentsAttended += 1;
    });
    return Array.from(points.values())
      .map((point) => ({
        date: point.date,
        dateLabel: point.dateLabel,
        fullDate: point.fullDate,
        studentsAttended: point.studentsAttended,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [analyticsDates, filteredAttendance, filteredSessions]);

  const attendanceAudit = useMemo(() => {
    const sessionsByDate = new Map<string, typeof filteredSessions>();
    filteredSessions.forEach((session) => {
      const existing = sessionsByDate.get(session.session_date) ?? [];
      existing.push(session);
      sessionsByDate.set(session.session_date, existing);
    });
    const attendanceBySession = new Map<string, number>();
    const attendedBySession = new Map<string, number>();
    filteredAttendance.forEach((mark) => {
      attendanceBySession.set(mark.session_id, (attendanceBySession.get(mark.session_id) ?? 0) + 1);
      if (["present", "late"].includes(mark.status)) {
        attendedBySession.set(mark.session_id, (attendedBySession.get(mark.session_id) ?? 0) + 1);
      }
    });

    return analyticsDates
      .map((date) => {
        const dateKey = format(date, "yyyy-MM-dd");
        const daySessions = sessionsByDate.get(dateKey) ?? [];
        const scheduledLessons = filteredLessons.filter((lesson) =>
          lessonRunsOn(lesson, date),
        ).length;
        const attendanceMarks = daySessions.reduce(
          (total, session) => total + (attendanceBySession.get(session.id) ?? 0),
          0,
        );
        const attendedMarks = daySessions.reduce(
          (total, session) => total + (attendedBySession.get(session.id) ?? 0),
          0,
        );
        return {
          date: dateKey,
          dateLabel: format(date, "EEE d MMM"),
          scheduledLessons,
          sessionRecords: daySessions.length,
          attendanceMarks,
          attendedMarks,
          attendanceRate: attendanceMarks
            ? Math.round((attendedMarks / attendanceMarks) * 100)
            : null,
        };
      })
      .filter(
        (row) => row.scheduledLessons > 0 || row.sessionRecords > 0 || row.attendanceMarks > 0,
      );
  }, [analyticsDates, filteredAttendance, filteredLessons, filteredSessions]);
  const attendanceAuditTotals = attendanceAudit.reduce(
    (totals, row) => ({
      scheduledLessons: totals.scheduledLessons + row.scheduledLessons,
      attendanceMarks: totals.attendanceMarks + row.attendanceMarks,
      attendedMarks: totals.attendedMarks + row.attendedMarks,
    }),
    { scheduledLessons: 0, attendanceMarks: 0, attendedMarks: 0 },
  );
  const attendanceAuditRate = attendanceAuditTotals.attendanceMarks
    ? Math.round(
        (attendanceAuditTotals.attendedMarks / attendanceAuditTotals.attendanceMarks) * 100,
      )
    : null;

  const genderAttendance = useMemo(() => {
    const studentMap = new Map((students.data ?? []).map((student) => [student.id, student]));
    const groups = new Map([
      ["Boys", { name: "Boys", value: 0, colour: "#2563eb" }],
      ["Girls", { name: "Girls", value: 0, colour: "#db2777" }],
    ]);
    filteredAttendance.forEach((mark) => {
      if (!["present", "late"].includes(mark.status)) return;
      const group = groups.get(genderGroup(studentMap.get(mark.student_id)?.gender));
      if (!group) return;
      group.value += 1;
    });
    return Array.from(groups.values());
  }, [filteredAttendance, students.data]);

  const reportingPeriod = `${format(analyticsStart, "d MMM")}–${format(analyticsEnd, "d MMM yyyy")}`;

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

  const studentLeaderboard = useMemo(() => {
    const totals = new Map<string, number>();
    filteredAttendance.forEach((mark) => {
      if (!["present", "late"].includes(mark.status)) return;
      totals.set(mark.student_id, (totals.get(mark.student_id) ?? 0) + 1);
    });
    return Array.from(totals.entries())
      .map(([studentId, attended]) => ({
        student: (students.data ?? []).find((item) => item.id === studentId),
        attended,
      }))
      .filter((item) => item.student)
      .sort(
        (a, b) =>
          b.attended - a.attended ||
          fullName(a.student).localeCompare(fullName(b.student), "en-GB"),
      )
      .slice(0, 8);
  }, [filteredAttendance, students.data]);

  const attendanceYAxisMax = Math.max(
    5,
    Math.ceil(
      (Math.max(...attendanceTimeline.map((point) => point.studentsAttended), 0) * 1.15) / 5,
    ) * 5,
  );

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
    setRangeDays("7");
    setCustomStartDate(format(subDays(new Date(), 6), "yyyy-MM-dd"));
    setCustomEndDate(format(new Date(), "yyyy-MM-dd"));
    setSiteFilter("all");
    setTutorFilter("all");
    setSubjectFilter("all");
    setDeliveryFilter("all");
  }

  const paymentRequests = useTable("payment_requests");
  const invoices = useTable("billing_invoices");
  const parents = useTable("parents", "first_name");
  const parentStudents = useTable("parent_students");
  const subscriptions = useTable("client_subscriptions");
  const [onboardingProgramme, setOnboardingProgramme] = useState<"tuition" | "football">("tuition");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    attendance: true, upcoming: true, tasks: true, alerts: true,
    recap: true, finance: true, leaderboards: false, reports: false,
  });
  const toggleSection = (key: string) => setOpenSections((previous) => ({ ...previous, [key]: !previous[key] }));
  const today = new Date();
  const upcoming = filteredLessons.flatMap((lesson) =>
    Array.from({ length: 14 }, (_, offset) => addDays(today, offset))
      .filter((date) => lessonRunsOn(lesson, date))
      .map((date) => ({ lesson, date }))
  ).sort((a, b) => a.date.getTime() - b.date.getTime() || (a.lesson.start_time ?? "").localeCompare(b.lesson.start_time ?? "")).slice(0, 6);
  const lastWeek = filteredLessons.flatMap((lesson) =>
    Array.from({ length: 7 }, (_, offset) => subDays(today, offset + 1))
      .filter((date) => lessonRunsOn(lesson, date))
      .map((date) => ({ lesson, date }))
  ).sort((a, b) => b.date.getTime() - a.date.getTime() || (a.lesson.start_time ?? "").localeCompare(b.lesson.start_time ?? "")).slice(0, 20);
  const sessionByLessonDate = new Map((sessions.data ?? []).map((session) => [session.class_id + ":" + session.session_date, session.id]));
  const marksBySession = new Map<string, { present: number; marked: number }>();
  (attendance.data ?? []).forEach((mark) => {
    const count = marksBySession.get(mark.session_id) ?? { present: 0, marked: 0 };
    count.marked += 1;
    if (["present", "late"].includes(mark.status)) count.present += 1;
    marksBySession.set(mark.session_id, count);
  });
  const lessonTile = ({ lesson, date }: { lesson: ClassRow; date: Date }) => {
    const tutor = (tutors.data ?? []).find((item) => item.id === lesson.tutor_id);
    const tutorName = tutor ? fullName(tutor) : "Not assigned";
    const dateKey = format(date, "yyyy-MM-dd");
    const sessionId = sessionByLessonDate.get(lesson.id + ":" + dateKey);
    const marks = sessionId ? marksBySession.get(sessionId) : undefined;
    const expected = enrolmentCount(lesson);
    const pct = marks?.marked ? Math.round(marks.present / marks.marked * 100) : null;
    return <Link key={lesson.id + ":" + dateKey} to="/admin/classes/$id" params={{ id: lesson.id }}
      className="block min-w-0 overflow-hidden rounded-lg border border-border bg-card transition hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
      <div className={cn("flex items-center gap-2 px-2.5 py-1.5", scheduleColour(lesson))}>
        <CalendarDays className="h-4 w-4 shrink-0"/>
        <span className="min-w-0 flex-1 truncate text-xs font-extrabold">{lesson.name}</span>
      </div>
      <div className="space-y-1.5 px-2.5 py-2">
        <div className="flex items-center justify-between gap-2 text-xs"><span>{format(date, "EEE d MMM")} · {hhmm(lesson.start_time)}–{hhmm(lesson.end_time)}</span></div>
        <div className="flex items-center gap-2"><Avatar initials={initialsOf(tutorName)} tone={avatarTone(tutorName)} size="sm"/><span className="truncate text-xs font-medium">{tutorName}</span></div>
        <div className="rounded-md bg-muted/60 px-2 py-1.5">
          <div className="flex items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">Attendance</span><strong>{marks?.marked ? marks.present : "—"}/{expected}</strong></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{width: pct === null ? "0%" : pct + "%"}}/></div>
          <span className="mt-1 block text-[10px] text-muted-foreground">{pct === null ? "Register not taken" : pct + "% of recorded marks present"}</span>
        </div>
      </div>
    </Link>;
  };
  const unassigned = filteredLessons.filter((lesson) => !lesson.tutor_id);
  const nearlyFull = filteredLessons.filter((lesson) => lesson.capacity > 0 && enrolmentCount(lesson) / lesson.capacity >= 0.9);
  const unmarked = filteredSessions.filter((session) => !filteredAttendance.some((mark) => mark.session_id === session.id));
  const pendingRequests = (paymentRequests.data ?? []).filter((request) => request.status === "submitted");
  const unpaidInvoices = (invoices.data ?? []).filter((invoice) => ["draft", "unpaid", "overdue", "sent"].includes(invoice.status ?? ""));
  const recentInvoices = [...(invoices.data ?? [])].sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))).slice(0, 8);
  const invoiceNeedsAction = (invoices.data ?? []).filter((invoice) => ["draft", "unpaid", "overdue", "sent"].includes(invoice.status ?? "")).length;
  const invoiceParentName = (parentId: string | null | undefined) => {
    const parent = (parents.data ?? []).find((item) => item.id === parentId);
    return parent ? fullName(parent) : "Parent not linked";
  };
  const invoiceAmount = (value: number | null | undefined) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value ?? 0);
  // Stage totals are independently observed records, not a mutually exclusive funnel.
  const registeredStudentCount = (students.data ?? []).length;
  const billedParentIds = new Set<string>([
    ...(invoices.data ?? []).map((invoice) => invoice.parent_id).filter((id): id is string => Boolean(id)),
    ...(subscriptions.data ?? []).map((subscription) => subscription.parent_id).filter((id): id is string => Boolean(id)),
  ]);
  const billedStudentIds = new Set((parentStudents.data ?? [])
    .filter((link) => billedParentIds.has(link.parent_id))
    .map((link) => link.student_id));
  const billedStudentCount = (students.data ?? []).filter((student) => billedStudentIds.has(student.id)).length;
  const enrolledStudentIds = new Set((enrolments.data ?? []).map((item) => item.student_id));
  const enrolledStudentCount = (students.data ?? []).filter((student) => enrolledStudentIds.has(student.id)).length;
  const attendancePercent = attendanceAuditRate;
  const panel = (key: string, title: string, count: number | null, children: ReactNode, icon?: ReactNode) => (
    <section className="surface min-w-0 overflow-hidden">
      <button type="button" aria-expanded={Boolean(openSections[key])} onClick={() => toggleSection(key)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40">
        <span className="flex min-w-0 items-center gap-2 font-bold">{icon}{title}{count !== null && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{count}</span>}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", openSections[key] && "rotate-180")} />
      </button>
      {openSections[key] && <div className="border-t border-border p-4">{children}</div>}
    </section>
  );
  const quickLink = (label: string, to: "/admin/students" | "/admin/classes" | "/admin/payments" | "/admin/payment-requests", search?: { add: boolean }) => (
    <Link to={to} search={search} className="flex min-h-11 items-center justify-between rounded-xl bg-primary/5 px-3 py-2 text-sm font-semibold hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
      {label}<ChevronRight className="h-4 w-4 text-primary" />
    </Link>
  );
  return (
    <Page className="space-y-4 pb-24">
      <div className="sticky top-0 z-30 -mx-3 border-b border-border bg-background/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-xl font-extrabold">Operations dashboard</h1><p className="text-xs text-muted-foreground">Classes, attendance and actions requiring attention</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <SelectField label="Period" value={rangeDays} onChange={setRangeDays} options={RANGE_OPTIONS} />
            <Button size="sm" variant="secondary" onClick={() => setFiltersOpen(true)}><Filter className="h-4 w-4" /> Filters {activeFilterCount || ""}</Button>
          </div>
        </div>
      </div>
      <FilterDialog open={filtersOpen} onOpenChange={setFiltersOpen} title="Dashboard filters" description="Filters apply to operational metrics and lessons." onClear={resetFilters}>
        {rangeDays === "custom" && <div className="flex flex-wrap gap-2"><Input type="date" aria-label="Start date" value={customStartDate} max={customEndDate} onChange={(e) => setCustomStartDate(e.target.value)} /><Input type="date" aria-label="End date" value={customEndDate} min={customStartDate} onChange={(e) => setCustomEndDate(e.target.value)} /></div>}
        <SelectField label="Site" value={siteFilter} onChange={setSiteFilter} options={[{value:"all",label:"All sites"},...(sites.data??[]).map((site)=>({value:site.id,label:site.name}))]} />
        <SelectField label="Tutor" value={tutorFilter} onChange={setTutorFilter} options={[{value:"all",label:"All tutors"},{value:"unassigned",label:"Unassigned"},...(tutors.data??[]).map((tutor)=>({value:tutor.id,label:fullName(tutor)}))]} />
        <SelectField label="Subject" value={subjectFilter} onChange={setSubjectFilter} options={[{value:"all",label:"All subjects"},...subjects.map((subject)=>({value:subject,label:subject}))]} />
      </FilterDialog>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Link to="/admin/classes"><StatCard compact tone="pink" label="Lessons in period" value={String(lessonOccurrences)} icon={<CalendarDays className="h-5 w-5" />} /></Link>
        <Link to="/admin/classes"><StatCard compact tone="green" label="Attendance" value={attendancePercent === null ? "Not recorded" : attendancePercent+"%"} hint={attendedMarks+"/"+filteredAttendance.length+" marked present or late"} icon={<BarChart3 className="h-5 w-5" />} /></Link>
        <Link to="/admin/payments"><StatCard compact tone="blue" label="Invoices needing action" value={String(unpaidInvoices.length)} icon={<Info className="h-5 w-5" />} /></Link>
        <Link to="/admin/payment-requests"><StatCard compact tone="purple" label="Tutor requests to review" value={String(pendingRequests.length)} icon={<Users className="h-5 w-5" />} /></Link>
      </div>
      <div className="grid min-w-0 gap-3 lg:grid-cols-1">
        {panel("attendance","Attendance over time",null,
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Daily attendance on days with recorded registers</span>
              <span>{attendanceAudit.filter((day) => day.attendanceRate !== null).length} recorded days</span>
            </div>
            <div className="h-64 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceAudit} margin={{top:12,right:10,left:-12,bottom:8}} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="dateLabel" tick={{fontSize:10}} minTickGap={26} interval="preserveStartEnd"/>
                  <YAxis domain={[0,100]} ticks={[0,25,50,75,100]} tickFormatter={(v)=>v+"%"} tick={{fontSize:10}}/>
                  <Tooltip content={({active,payload}) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0]?.payload as (typeof attendanceAudit)[number] | undefined;
                    if (!point) return null;
                    return <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-md">
                      <p className="font-semibold">{point.dateLabel}</p>
                      <p>{point.attendanceRate === null ? "Attendance not recorded" : point.attendanceRate + "% attendance"}</p>
                      <p className="text-muted-foreground">{point.attendedMarks}/{point.attendanceMarks} marked present or late</p>
                    </div>;
                  }}/>
                  <Bar dataKey="attendanceRate" name="Attendance" fill="#ec2d70" radius={[4,4,0,0]} maxBarSize={28}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Each bar represents a day with recorded attendance. Days without registers are blank, not 0%. Present and late count as attended.</p>
          </div>)}
      </div>
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        {panel("recap","Last week's recap",lastWeek.length,<div className="max-h-[310px] overflow-y-auto overscroll-contain pr-1" tabIndex={0} aria-label="Scroll last week's lessons"><p className="mb-2 text-xs text-muted-foreground">Previous 7 completed days. Attendance shown only when recorded.</p><div className="grid gap-2">{lastWeek.length ? lastWeek.map(lessonTile) : <Empty>No lessons in the previous 7 days.</Empty>}</div></div>,<CheckCircle2 className="h-4 w-4 text-emerald-600"/>)}
        {panel("upcoming","Upcoming lessons",upcoming.length,<div className="max-h-[310px] overflow-y-auto overscroll-contain pr-1" tabIndex={0} aria-label="Scroll upcoming lessons"><div className="grid gap-2">{upcoming.length ? upcoming.map(lessonTile) : <Empty>No upcoming lessons.</Empty>}</div></div>,<CalendarDays className="h-4 w-4 text-primary"/>)}
      </div>
      {panel("finance","Student conversion funnel",null,<div className="space-y-4">
        <p className="text-xs text-muted-foreground">Move each family from enquiry to registration, billing and enrolment. Stage totals are not yet a verified conversion funnel.</p>
                  <section className="min-w-0">
            <h3 className="mb-2 text-sm font-bold">Student onboarding by programme</h3>
            <div className="mb-3 flex gap-2" role="group" aria-label="Choose onboarding programme">
              <button type="button" aria-pressed={onboardingProgramme === "tuition"} onClick={() => setOnboardingProgramme("tuition")} className={cn("rounded-lg px-3 py-2 text-xs font-bold",onboardingProgramme === "tuition" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70")}>Tuition</button>
              <button type="button" aria-pressed={onboardingProgramme === "football"} onClick={() => setOnboardingProgramme("football")} className={cn("rounded-lg px-3 py-2 text-xs font-bold",onboardingProgramme === "football" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70")}>Football</button>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">Programme-specific counts are not yet available because existing student, invoice and registration records have not been reliably linked to Tuition or Football. The totals below are for all programmes.</p>
            <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-muted p-2"><strong className="block text-lg">{registeredStudentCount}</strong>All students</div>
              <div className="rounded-lg bg-muted p-2"><strong className="block text-lg">{billedStudentCount}</strong>Linked to billing</div>
              <div className="rounded-lg bg-muted p-2"><strong className="block text-lg">{enrolledStudentCount}</strong>Class enrolments</div>
            </div>
            <ol className="space-y-2 text-xs">
              <li className="rounded-lg border border-border p-2"><div className="flex justify-between gap-2"><strong>0. Leads</strong><span className="text-muted-foreground">Not tracked</span></div><p className="text-muted-foreground">Interested families not yet registered for {onboardingProgramme === "tuition" ? "tuition" : "football"}.</p></li>
              <li className="rounded-lg border border-border p-2"><div className="flex justify-between gap-2"><strong>1. Registration</strong><span className="text-muted-foreground">Not segmented</span></div><p className="text-muted-foreground">Complete the {onboardingProgramme === "tuition" ? "tuition" : "football"} registration form.</p>
              {onboardingProgramme === "tuition" ? <div className="flex flex-wrap gap-x-3 gap-y-1"><a className="text-primary underline" href="https://form.jotform.com/Alqaderi/tuition" target="_blank" rel="noopener noreferrer">Freston Road / Lancaster Jotform</a><a className="text-primary underline" href="https://form.jotform.com/252443149600350" target="_blank" rel="noopener noreferrer">Chelsea Youth Hub</a><a className="text-primary underline" href="https://progressay.com/forms/f858c51c-e12f-4105-abf8-1f0f0a883967" target="_blank" rel="noopener noreferrer">New Progressay form</a></div> : <a className="text-primary underline" href="https://form.jotform.com/Alqaderi/Ken-impact-KIDS" target="_blank" rel="noopener noreferrer">Kensington Impact FC registration</a>}</li>
              <li className="rounded-lg border border-border p-2"><div className="flex justify-between gap-2"><strong>2. Billing</strong><span className="text-muted-foreground">Not segmented</span></div><p className="text-muted-foreground">Create a {onboardingProgramme === "tuition" ? "tuition" : "football"} subscription or invoice.</p><Link to="/admin/payments" className="text-primary underline">Manage subscriptions and invoices</Link></li>
              {onboardingProgramme === "tuition" && <li className="rounded-lg border border-border p-2"><div className="flex justify-between gap-2"><strong>3. UC childcare confirmation, if applicable</strong><span className="text-muted-foreground">Not tracked</span></div><p className="text-muted-foreground">Prepare and check the confirmation document for eligible families.</p><Link to="/admin/payments" className="text-primary underline">Open billing documents</Link></li>}
              <li className="rounded-lg border border-border p-2"><div className="flex justify-between gap-2"><strong>{onboardingProgramme === "tuition" ? "4" : "3"}. {onboardingProgramme === "tuition" ? "GoProgress course enrolment" : "Football group enrolment"}</strong><span className="text-muted-foreground">Not segmented</span></div><p className="text-muted-foreground">Assign the student to the correct {onboardingProgramme === "tuition" ? "course" : "football training group"}.</p><Link to="/admin/classes" className="text-primary underline">Manage classes and enrolments</Link></li>
            </ol>
          </section>

        <div className="grid gap-3 lg:grid-cols-2">
          <section className="min-w-0 rounded-lg border border-border p-3">
            <h3 className="mb-2 text-sm font-bold">Tasks to move families forward</h3>
            <div className="space-y-2 text-xs">
              <p className="font-semibold">Leads and registration</p>
              {quickLink("Add student","/admin/students",{add:true})}
              <p className="font-semibold">Billing and UC documents</p>
              {quickLink("Create invoice","/admin/payments")}
              <Link to="/admin/payments" className="block text-primary underline">Review {invoiceNeedsAction} invoices needing attention</Link>
              <p className="font-semibold">Course enrolment</p>
              {quickLink("Assign students to classes","/admin/classes")}
            </div>
          </section>
          <section className="min-w-0 rounded-lg border border-border p-3">
            <h3 className="mb-2 text-sm font-bold">Insights and suggestions</h3>
            <div className="space-y-2 text-xs">
              <p>{invoiceNeedsAction} invoices need review. Follow up on draft and unpaid invoices to support collection.</p>
              <p>{unassigned.length} classes have no tutor assigned.</p>
              <p>{unmarked.length} attendance registers need completing.</p>
              <p className="text-muted-foreground">Programme-level lead conversion, unpaid registrations and UC document completion require linked form and billing data before reliable automated recommendations are possible.</p>
            </div>
          </section>
        </div>
        <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-bold">Recent invoices and payment requests</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">          <section className="min-w-0">
            <h3 className="mb-2 text-sm font-bold">Recently created invoices</h3>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border" tabIndex={0} aria-label="Recent invoices">
              {recentInvoices.length ? recentInvoices.map((invoice) => <Link key={invoice.id} to="/admin/payments" className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 text-xs last:border-0 hover:bg-muted/50">
                <span className="min-w-0"><span className="block truncate font-semibold">{invoiceParentName(invoice.parent_id)}</span><span className="text-muted-foreground">{invoice.invoice_number ?? "Draft invoice"} · {String(invoice.created_at ?? "").slice(0,10) || "Date unavailable"}</span></span>
                <span className="shrink-0 text-right"><span className="block font-semibold">{invoiceAmount(invoice.total)}</span><span className={cn("capitalize", ["overdue","unpaid"].includes(invoice.status ?? "") ? "text-rose-600" : "text-muted-foreground")}>{invoice.status ?? "Unknown"}</span></span>
              </Link>) : <p className="p-3 text-xs text-muted-foreground">No invoices found in ProgressTutors billing records.</p>}
            </div>
          </section>

          <div className="space-y-2">        <div className="grid gap-2 sm:grid-cols-3">
          <Link to="/admin/payments" className="rounded-lg border border-border p-3 hover:bg-muted/50"><p className="text-xs text-muted-foreground">Invoices requiring attention</p><p className="text-2xl font-bold">{invoiceNeedsAction}</p><p className="text-xs text-primary">Review drafts and unpaid invoices →</p></Link>
          <Link to="/admin/payments" className="rounded-lg border border-border p-3 hover:bg-muted/50"><p className="text-xs text-muted-foreground">Recent invoices</p><p className="text-2xl font-bold">{recentInvoices.length}</p><p className="text-xs text-primary">Open billing →</p></Link>
          <Link to="/admin/payment-requests" className="rounded-lg border border-border p-3 hover:bg-muted/50"><p className="text-xs text-muted-foreground">Tutor payment requests</p><p className="text-2xl font-bold">{pendingRequests.length}</p><p className="text-xs text-primary">Review requests →</p></Link>
        </div>
</div></div>
        </details>
        <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-bold">Operational tasks and alerts</summary><div className="mt-3 grid gap-3 lg:grid-cols-2"><div>{panel("tasks","Tasks requiring action",unmarked.length+unassigned.length+unpaidInvoices.length+pendingRequests.length,<div className="space-y-3 text-sm">
          <Link className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted" to="/admin/classes"><ClipboardList className="h-4 w-4 text-primary"/><span>Complete attendance registers · {unmarked.length}</span></Link>
          <Link className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted" to="/admin/classes"><Users className="h-4 w-4 text-primary"/><span>Assign tutors · {unassigned.length} classes</span></Link>
          <Link className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted" to="/admin/payments"><ClipboardList className="h-4 w-4 text-primary"/><span>Review invoices · {unpaidInvoices.length}</span></Link>
          <Link className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted" to="/admin/payment-requests"><ClipboardList className="h-4 w-4 text-primary"/><span>Review tutor payment requests · {pendingRequests.length}</span></Link>
          {quickLink("Onboard a student","/admin/students",{add:true})}
        </div>,<ClipboardList className="h-4 w-4 text-primary"/>)}
        </div><div>{panel("alerts","Operational alerts & suggestions",nearlyFull.length+unassigned.length,<div className="space-y-3 text-sm">
          {nearlyFull.slice(0,5).map((lesson)=><Link key={lesson.id} to="/admin/classes/$id" params={{id:lesson.id}} className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-950"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><span><strong>{lesson.name}</strong> · {enrolmentCount(lesson)}/{lesson.capacity} places filled. Consider reviewing capacity.</span></Link>)}
          {unassigned.length>0 && <Link to="/admin/classes" className="flex items-start gap-2 rounded-lg bg-pink-50 p-3 text-pink-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><span>{unassigned.length} classes need a tutor</span></Link>}
          {!nearlyFull.length&&!unassigned.length&&<p className="text-muted-foreground">No capacity or staffing alerts from current records.</p>}
        </div>,<AlertTriangle className="h-4 w-4 text-amber-600"/>)}
</div></div></details>
      </div>)}
      {panel("leaderboards","Leaderboards",null,<div className="grid gap-4 sm:grid-cols-2">
        <div><h3 className="mb-2 font-bold">Tutors · scheduled hours</h3>{tutorLeaderboard.slice(0,5).map((item,i)=><Link key={item.tutor!.id} to="/admin/tutors/$id" params={{id:item.tutor!.id}} className="flex justify-between gap-2 border-b py-2 text-sm"><span className="flex min-w-0 items-center gap-2"><Avatar initials={initialsOf(fullName(item.tutor))} tone={avatarTone(fullName(item.tutor))} size="sm"/><span className="truncate">{i+1}. {fullName(item.tutor)}</span></span><b>{item.hours.toFixed(1)}h</b></Link>)}</div>
        <div><h3 className="mb-2 font-bold">Students · recorded attendance</h3>{studentLeaderboard.slice(0,5).map((item,i)=><Link key={item.student!.id} to="/admin/students/$id" params={{id:item.student!.id}} className="flex justify-between gap-2 border-b py-2 text-sm"><span className="flex min-w-0 items-center gap-2"><Avatar initials={initialsOf(fullName(item.student))} tone={avatarTone(fullName(item.student))} size="sm"/><span className="truncate">{i+1}. {fullName(item.student)}</span></span><b>{item.attended}</b></Link>)}</div>
      </div>)}
      {panel("reports","Insights & reports",null,<div className="space-y-3">
        <p className="text-sm text-muted-foreground">Attendance: {attendancePercent===null?"No saved marks":attendancePercent+"%"} · {reportingPeriod}</p>
        <Link to="/admin/reports" className="font-semibold text-primary hover:underline">Open detailed reports</Link>
      </div>)}
    </Page>
  );
}
