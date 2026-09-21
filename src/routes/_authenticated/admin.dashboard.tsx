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
  MapPin,
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
import { Avatar, avatarTone, Empty, PageHeader, Pill, StatCard } from "@/components/kit";
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

function analyticsBucket(date: Date, rangeDays: string) {
  const days = Number(rangeDays);
  if (days <= 7) return { key: format(date, "yyyy-MM-dd"), label: format(date, "EEE") };
  if (days <= 30) {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    return { key: format(start, "yyyy-MM-dd"), label: format(start, "d MMM") };
  }
  const start = startOfMonth(date);
  return { key: format(start, "yyyy-MM-dd"), label: format(start, "MMM") };
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
    const points = new Map<string, { key: string; name: string; present: number; total: number }>();
    analyticsDates.forEach((date) => {
      const item = analyticsBucket(date, rangeDays);
      if (!points.has(item.key)) {
        points.set(item.key, { key: item.key, name: item.label, present: 0, total: 0 });
      }
    });
    const sessionDates = new Map(
      filteredSessions.map((session) => [session.id, session.session_date]),
    );
    filteredAttendance.forEach((mark) => {
      const sessionDate = sessionDates.get(mark.session_id);
      if (!sessionDate) return;
      const item = analyticsBucket(parseISO(sessionDate), rangeDays);
      const point = points.get(item.key);
      if (!point) return;
      point.total += 1;
      if (["present", "late"].includes(mark.status)) point.present += 1;
    });
    return Array.from(points.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((point) => ({
        name: point.name,
        attendance: point.total ? Math.round((point.present / point.total) * 100) : 0,
      }));
  }, [analyticsDates, filteredAttendance, filteredSessions, rangeDays]);

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
  const studentsVsLessons = [
    { name: "Students", total: filteredStudentIds.size },
    { name: "Lessons", total: lessonOccurrences },
  ];

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
            <p className="text-xs text-muted-foreground">
              Open a lesson or student record directly.
            </p>
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

        <div
          className={cn(
            "mt-4 grid gap-2",
            calendarView === "week" && "lg:grid-cols-7",
            calendarView === "month" && "grid-cols-2 sm:grid-cols-4 xl:grid-cols-7",
          )}
        >
          {calendarDays.map((day) => {
            const dayLessons = filteredLessons
              .filter((lesson) => lessonRunsOn(lesson, day))
              .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
            return (
              <article
                key={day.toISOString()}
                className={cn(
                  "min-w-0 rounded-xl border border-border bg-background p-2",
                  calendarView === "day" && "p-4",
                  calendarView === "month" && !isSameMonth(day, anchor) && "opacity-45",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(format(day, "yyyy-MM-dd"));
                    if (calendarView === "month") setCalendarView("day");
                  }}
                  className="mb-2 text-left"
                >
                  <span className="block text-[10px] font-bold uppercase text-muted-foreground">
                    {format(day, "EEE")}
                  </span>
                  <span className="text-sm font-extrabold">{format(day, "d MMM")}</span>
                </button>
                <div className="space-y-2">
                  {dayLessons.map((lesson) => {
                    const tutor = (tutors.data ?? []).find((item) => item.id === lesson.tutor_id);
                    const site = (sites.data ?? []).find((item) => item.id === lesson.site_id);
                    const lessonStudentIds = activeEnrolments
                      .filter((item) => item.class_id === lesson.id)
                      .map((item) => item.student_id);
                    const lessonStudents = (students.data ?? []).filter((student) =>
                      lessonStudentIds.includes(student.id),
                    );
                    return (
                      <div
                        key={lesson.id}
                        className="rounded-xl border border-primary/20 bg-secondary p-3 text-secondary-foreground"
                      >
                        <Link
                          to="/admin/classes/$id"
                          params={{ id: lesson.id }}
                          className="block hover:text-primary"
                        >
                          <p className="text-xs font-extrabold text-primary">
                            {hhmm(lesson.start_time)}-{hhmm(lesson.end_time)}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm font-bold">{lesson.name}</p>
                          <p className="mt-1 line-clamp-2 text-xs">
                            {[lesson.subject, lesson.level].filter(Boolean).join(" · ") ||
                              "Subject to confirm"}
                          </p>
                          <p className="mt-2 flex items-center gap-1 text-[11px]">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">
                              {site?.name ?? lesson.venue_name ?? "Venue to confirm"}
                            </span>
                          </p>
                        </Link>
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          <Link
                            to={tutor ? "/admin/tutors/$id" : "/admin/tutors"}
                            params={tutor ? { id: tutor.id } : {}}
                            className="text-[11px] font-semibold hover:text-primary"
                          >
                            {tutor ? fullName(tutor) : "Teacher needed"}
                          </Link>
                          <Pill tone="blue">{lessonStudents.length} students</Pill>
                        </div>
                        {calendarView === "day" && lessonStudents.length ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {lessonStudents.slice(0, 8).map((student) => (
                              <Link
                                key={student.id}
                                to="/admin/students/$id"
                                params={{ id: student.id }}
                                className="rounded-full bg-card px-2 py-1 text-[11px] font-semibold hover:text-primary"
                              >
                                {fullName(student)}
                              </Link>
                            ))}
                            {lessonStudents.length > 8 ? (
                              <span className="px-2 py-1 text-[11px] text-muted-foreground">
                                +{lessonStudents.length - 8} more
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {dayLessons.length === 0 && calendarView !== "month" ? (
                    <Empty>No lessons</Empty>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <ChartCard
          title="Attendance over time"
          subtitle="Present and late marks as a percentage of all recorded attendance"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={attendanceTimeline}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [`${value}%`, "Attendance"]}
              />
              <Line
                type="monotone"
                dataKey="attendance"
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
          title="Students versus lessons"
          subtitle="Unique enrolled students compared with scheduled lesson occurrences"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={studentsVsLessons}
              layout="vertical"
              margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="total" fill="#6c49b8" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
