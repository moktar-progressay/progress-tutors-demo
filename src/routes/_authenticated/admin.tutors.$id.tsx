import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, GraduationCap, Mail, Phone } from "lucide-react";
import { Page } from "@/components/AppShell";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { fullName, hhmm, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/tutors/$id")({
  head: () => ({
    meta: [{ title: "Teacher Profile | ProgressTutors" }, { name: "robots", content: "noindex" }],
  }),
  component: TutorProfile,
});

function TutorProfile() {
  const { id } = Route.useParams();
  const tutors = useTable("tutors");
  const classes = useTable("classes", "start_time");
  const enrolments = useTable("class_enrolments");
  const sites = useTable("sites");
  const tutor = (tutors.data ?? []).find((item) => item.id === id);
  const assignedClasses = (classes.data ?? []).filter(
    (item) => item.tutor_id === id && item.active,
  );
  const classIds = new Set(assignedClasses.map((item) => item.id));
  const studentIds = new Set(
    (enrolments.data ?? [])
      .filter((item) => classIds.has(item.class_id) && item.status === "active")
      .map((item) => item.student_id),
  );
  const weeklyHours = assignedClasses.reduce((total, item) => {
    if (!item.start_time || !item.end_time) return total;
    const [startHour, startMinute] = item.start_time.split(":").map(Number);
    const [endHour, endMinute] = item.end_time.split(":").map(Number);
    return (
      total +
      Math.max(
        0,
        ((endHour ?? 0) * 60 + (endMinute ?? 0) - (startHour ?? 0) * 60 - (startMinute ?? 0)) / 60,
      )
    );
  }, 0);

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
        subtitle="Teacher profile and assigned teaching"
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Classes" value={String(assignedClasses.length)} tone="pink" />
        <StatCard label="Students" value={String(studentIds.size)} tone="green" />
        <StatCard
          label="Weekly hours"
          value={weeklyHours.toFixed(weeklyHours % 1 ? 1 : 0)}
          tone="purple"
        />
        <StatCard label="Status" value={tutor.status} tone="blue" />
      </div>

      <Section id="teacher-contact" title="Teacher details">
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
          </div>
        </div>
      </Section>

      <Section
        id="teacher-classes"
        title="Assigned classes"
        subtitle={`${assignedClasses.length} active class${assignedClasses.length === 1 ? "" : "es"}`}
        action={
          <Link to="/admin/classes" className="text-xs font-bold text-primary">
            <CalendarDays className="mr-1 inline h-4 w-4" /> Schedule
          </Link>
        }
      >
        {assignedClasses.length === 0 ? (
          <Empty>No active classes assigned.</Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {assignedClasses.map((lesson) => {
              const site = (sites.data ?? []).find((item) => item.id === lesson.site_id);
              const count = (enrolments.data ?? []).filter(
                (item) => item.class_id === lesson.id && item.status === "active",
              ).length;
              return (
                <Link
                  key={lesson.id}
                  to="/admin/classes/$id"
                  params={{ id: lesson.id }}
                  className="rounded-xl border border-border p-4 hover:border-primary/40"
                >
                  <p className="font-bold">{lesson.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {lesson.weekday} · {hhmm(lesson.start_time)}-{hhmm(lesson.end_time)}
                  </p>
                  <p className="mt-2 text-sm">
                    {[lesson.subject, lesson.level].filter(Boolean).join(" · ") ||
                      "Subject to confirm"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Pill tone="green">
                      <GraduationCap className="h-3 w-3" /> {count} students
                    </Pill>
                    <Pill tone="blue">{site?.name ?? lesson.venue_name ?? "Venue TBC"}</Pill>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Section>
    </Page>
  );
}
