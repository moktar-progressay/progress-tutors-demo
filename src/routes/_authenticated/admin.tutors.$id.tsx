import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { eachDayOfInterval, format, parseISO, subDays } from "date-fns";
import { ArrowLeft, CalendarDays, Mail, Phone, WalletCards } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Page } from "@/components/AppShell";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fullName, hhmm, money, num, prettyDate, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/tutors/$id")({
  head: () => ({
    meta: [{ title: "Teacher Profile | ProgressTutors" }, { name: "robots", content: "noindex" }],
  }),
  component: TutorProfile,
});

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  fontSize: 12,
};

function minutes(time: string | null | undefined) {
  if (!time) return 0;
  const [hour, minute] = time.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

function durationHours(start: string | null | undefined, end: string | null | undefined) {
  return Math.max(0, minutes(end) - minutes(start)) / 60;
}

function hoursLabel(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}h`;
}

function requestTone(status: string) {
  if (status === "paid") return "blue" as const;
  if (status === "approved") return "green" as const;
  if (status === "queried") return "amber" as const;
  if (status === "rejected") return "pink" as const;
  return "purple" as const;
}

function requestLabel(status: string) {
  if (status === "submitted") return "Needs review";
  if (status === "queried") return "Query sent";
  if (status === "rejected") return "Declined";
  return status;
}

function DateTick({
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

function TutorProfile() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const tutors = useTable("tutors", "first_name");
  const classes = useTable("classes", "start_time");
  const enrolments = useTable("class_enrolments");
  const sites = useTable("sites");
  const sessions = useTable("sessions", "session_date");
  const attendance = useTable("student_attendance", "recorded_at");
  const paymentRequests = useTable("payment_requests", "submitted_at");
  const paymentItems = useTable("payment_request_items");

  const tutor = (tutors.data ?? []).find((item) => item.id === id);
  const assignedClasses = (classes.data ?? []).filter(
    (item) => item.tutor_id === id && item.active,
  );
  const classIds = new Set(assignedClasses.map((item) => item.id));
  const classMap = new Map((classes.data ?? []).map((lesson) => [lesson.id, lesson]));
  const siteMap = new Map((sites.data ?? []).map((site) => [site.id, site]));
  const studentIds = new Set(
    (enrolments.data ?? [])
      .filter((item) => classIds.has(item.class_id) && item.status === "active")
      .map((item) => item.student_id),
  );
  const weeklyHours = assignedClasses.reduce(
    (total, lesson) => total + durationHours(lesson.start_time, lesson.end_time),
    0,
  );
  const tutorSessions = (sessions.data ?? [])
    .filter((session) => {
      const lesson = session.class_id ? classMap.get(session.class_id) : undefined;
      return (session.tutor_id ?? lesson?.tutor_id) === id;
    })
    .sort(
      (a, b) =>
        b.session_date.localeCompare(a.session_date) ||
        (b.start_time ?? "").localeCompare(a.start_time ?? ""),
    );
  const tutorRequests = (paymentRequests.data ?? [])
    .filter((request) => request.tutor_id === id)
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  const totalRequested = tutorRequests.reduce(
    (total, request) => total + num(request.total_amount),
    0,
  );

  const lessonTimeline = useMemo(() => {
    const end = new Date();
    const dates = eachDayOfInterval({ start: subDays(end, 29), end });
    const counts = new Map<string, number>();
    tutorSessions.forEach((session) => {
      counts.set(session.session_date, (counts.get(session.session_date) ?? 0) + 1);
    });
    return dates.map((date) => {
      const key = format(date, "yyyy-MM-dd");
      return {
        date: key,
        dateLabel: format(date, "EEE d MMM"),
        fullDate: format(date, "EEEE d MMMM yyyy"),
        lessons: counts.get(key) ?? 0,
      };
    });
  }, [tutorSessions]);

  if (!tutor) {
    return (
      <Page>
        <Empty>Teacher record not found.</Empty>
      </Page>
    );
  }

  return (
    <Page className="space-y-5">
      <PageHeader
        breadcrumb={
          <Link to="/admin/tutors" className="inline-flex items-center gap-1 hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Teachers
          </Link>
        }
        title={fullName(tutor)}
        subtitle="Teaching activity, lesson records and payment requests"
        actions={
          <label className="flex min-w-56 flex-col gap-1 text-xs font-semibold text-muted-foreground">
            View tutor
            <select
              value={id}
              onChange={(event) =>
                navigate({ to: "/admin/tutors/$id", params: { id: event.target.value } })
              }
              className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {(tutors.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {fullName(item)}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Active classes"
          value={String(assignedClasses.length)}
          tone="pink"
          compact
        />
        <StatCard label="Students" value={String(studentIds.size)} tone="green" compact />
        <StatCard label="Weekly hours" value={hoursLabel(weeklyHours)} tone="purple" compact />
        <StatCard
          label="Payment requests"
          value={String(tutorRequests.length)}
          hint={`${money(totalRequested)} requested`}
          tone="blue"
          compact
        />
      </div>

      <Section id="teacher-contact" title="Tutor details">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> {tutor.email ?? "No email recorded"}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" /> {tutor.phone ?? "No phone recorded"}
          </p>
          <div className="flex flex-wrap gap-1 sm:col-span-2">
            {(tutor.subjects ?? []).map((subject) => (
              <Pill key={subject} tone="blue">
                {subject}
              </Pill>
            ))}
            {(tutor.levels ?? []).map((level) => (
              <Pill key={level} tone="purple">
                {level}
              </Pill>
            ))}
            <Pill tone={tutor.status === "active" ? "green" : "neutral"}>{tutor.status}</Pill>
          </div>
        </div>
      </Section>

      <section className="surface min-w-0 p-4 sm:p-5">
        <h2 className="font-bold">Lessons over time</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Recorded lesson sessions during the last 30 days
        </p>
        <div className="mt-4 h-64 min-w-0 overflow-x-auto sm:h-72">
          <div
            className="h-full"
            style={{ minWidth: `${Math.max(720, lessonTimeline.length * 58)}px` }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lessonTimeline} margin={{ top: 24, right: 18, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dateLabel" tick={<DateTick />} interval={0} height={42} />
                <YAxis allowDecimals={false} width={34} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [Number(value), "Lessons"]}
                  labelFormatter={(label, payload) =>
                    String(payload[0]?.payload?.fullDate ?? label)
                  }
                />
                <Bar dataKey="lessons" name="Lessons" fill="#7c3aed" radius={[7, 7, 0, 0]}>
                  <LabelList
                    dataKey="lessons"
                    position="top"
                    className="fill-foreground text-xs font-bold"
                    formatter={(value: unknown) => (Number(value) > 0 ? Number(value) : "")}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <Section
        id="teacher-lessons"
        title="All lesson records"
        subtitle={`${tutorSessions.length} recorded lesson${tutorSessions.length === 1 ? "" : "s"}`}
        action={
          <Link to="/admin/classes" className="text-xs font-bold text-primary">
            <CalendarDays className="mr-1 inline h-4 w-4" /> Open schedule
          </Link>
        }
      >
        {tutorSessions.length === 0 ? (
          <Empty>No lesson records found for this tutor.</Empty>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead>Date</TableHead>
                  <TableHead className="min-w-64">Lesson</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tutorSessions.map((session) => {
                  const lesson = session.class_id ? classMap.get(session.class_id) : undefined;
                  const site = session.site_id
                    ? siteMap.get(session.site_id)
                    : lesson?.site_id
                      ? siteMap.get(lesson.site_id)
                      : undefined;
                  const marks = (attendance.data ?? []).filter(
                    (mark) => mark.session_id === session.id,
                  );
                  const attended = marks.filter((mark) =>
                    ["present", "late"].includes(mark.status),
                  ).length;
                  return (
                    <TableRow key={session.id}>
                      <TableCell className="whitespace-nowrap font-semibold">
                        {prettyDate(session.session_date)}
                      </TableCell>
                      <TableCell>
                        {lesson ? (
                          <Link
                            to="/admin/classes/$id"
                            params={{ id: lesson.id }}
                            className="font-bold hover:text-primary"
                          >
                            {lesson.name}
                          </Link>
                        ) : (
                          <span className="font-bold">Lesson record</span>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[lesson?.subject, lesson?.level].filter(Boolean).join(" · ") ||
                            "Subject not recorded"}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {hhmm(session.start_time ?? lesson?.start_time)}-
                        {hhmm(session.end_time ?? lesson?.end_time)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {site?.name ?? lesson?.venue_name ?? "Venue TBC"}
                      </TableCell>
                      <TableCell>
                        {marks.length ? `${attended}/${marks.length} attended` : "Not recorded"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {hoursLabel(
                          durationHours(
                            session.start_time ?? lesson?.start_time,
                            session.end_time ?? lesson?.end_time,
                          ),
                        )}
                      </TableCell>
                      <TableCell>
                        <Pill tone={session.status === "cancelled" ? "pink" : "green"}>
                          {session.status}
                        </Pill>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      <Section
        id="teacher-payment-requests"
        title="Payment requests"
        subtitle={`${tutorRequests.length} request${tutorRequests.length === 1 ? "" : "s"}`}
        action={
          <Button size="sm" variant="secondary" asChild>
            <Link to="/admin/payment-requests">
              <WalletCards className="h-4 w-4" /> Review payments
            </Link>
          </Button>
        }
      >
        {tutorRequests.length === 0 ? (
          <Empty>No payment requests found for this tutor.</Empty>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead>Submitted</TableHead>
                  <TableHead className="min-w-52">Reference</TableHead>
                  <TableHead>Lessons</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tutorRequests.map((request) => {
                  const lines = (paymentItems.data ?? []).filter(
                    (item) => item.payment_request_id === request.id,
                  );
                  return (
                    <TableRow key={request.id}>
                      <TableCell className="whitespace-nowrap font-semibold">
                        {format(parseISO(request.submitted_at), "d MMM yyyy")}
                      </TableCell>
                      <TableCell>{request.reference ?? "Payment request"}</TableCell>
                      <TableCell>{lines.length}</TableCell>
                      <TableCell>{hoursLabel(num(request.total_hours))}</TableCell>
                      <TableCell className="font-extrabold">
                        {money(request.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Pill tone={requestTone(request.status)}>
                          {requestLabel(request.status)}
                        </Pill>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </Page>
  );
}
