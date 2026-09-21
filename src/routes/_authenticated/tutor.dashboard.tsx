import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, MapPin, Users } from "lucide-react";
import { Page } from "@/components/AppShell";
import { ActingPicker } from "@/components/acting-picker";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { useTutorScope } from "@/lib/auth-scope";
import { fullName, hhmm, prettyDate, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/tutor/dashboard")({
  head: () => ({
    meta: [
      { title: "Tutor Dashboard - ProgressTutors" },
      { name: "description", content: "Your teaching schedule, students and lesson reviews." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TutorDashboard,
});

function TutorDashboard() {
  const scope = useTutorScope();
  const classes = useTable("classes", "start_time");
  const sites = useTable("sites", "name");
  const sessions = useTable("sessions", "session_date");
  const reviews = useTable("lesson_reviews");
  const signins = useTable("tutor_signins");
  const enrolments = useTable("class_enrolments");
  const students = useTable("students", "first_name");
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const weekday = today.toLocaleDateString("en-GB", { weekday: "long" });
  const myClasses = (classes.data ?? []).filter(
    (lesson) => lesson.tutor_id === scope.tutorId && lesson.active,
  );
  const myClassIds = new Set(myClasses.map((lesson) => lesson.id));
  const myEnrolments = (enrolments.data ?? []).filter(
    (item) => myClassIds.has(item.class_id) && item.status === "active",
  );
  const myStudentIds = new Set(myEnrolments.map((item) => item.student_id));
  const todayLessons = myClasses.filter((lesson) => lesson.weekday === weekday);
  const mySessions = (sessions.data ?? []).filter((session) => session.tutor_id === scope.tutorId);
  const upcoming = mySessions.filter((session) => session.session_date >= todayIso);
  const reviewsDue = mySessions.filter(
    (session) =>
      (signins.data ?? []).some((signin) => signin.session_id === session.id) &&
      !(reviews.data ?? []).some((review) => review.session_id === session.id),
  );
  const rosterNames = (classId: string) => {
    const ids = new Set(
      myEnrolments.filter((item) => item.class_id === classId).map((item) => item.student_id),
    );
    return (students.data ?? []).filter((student) => ids.has(student.id)).map(fullName);
  };

  return (
    <Page className="space-y-5">
      <PageHeader
        title={scope.tutor ? `Hello, ${scope.tutor.first_name}` : "Tutor dashboard"}
        subtitle="Your teaching workspace"
        actions={
          <Link
            to="/tutor/lessons"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Open schedule
          </Link>
        }
      />

      {scope.isAdminPreview ? (
        <details className="rounded-2xl border border-border bg-card p-4">
          <summary className="cursor-pointer text-sm font-bold text-primary">
            Admin preview: {scope.tutor ? fullName(scope.tutor) : "choose tutor"}
          </summary>
          <div className="mt-3">
            <ActingPicker
              label="Preview tutor"
              value={scope.tutorId}
              onChange={scope.setPreviewTutorId}
              options={scope.tutors.map((tutor) => ({
                value: tutor.id,
                label: fullName(tutor),
              }))}
            />
          </div>
        </details>
      ) : null}

      {!scope.tutorId ? (
        <Section id="tutor-not-linked" title="Tutor account not linked">
          <Empty>Ask an administrator to link this login to your tutor record.</Empty>
        </Section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="My classes" value={String(myClasses.length)} tone="pink" />
            <StatCard label="Today" value={String(todayLessons.length)} tone="blue" />
            <StatCard label="My students" value={String(myStudentIds.size)} tone="green" />
            <StatCard label="Reviews due" value={String(reviewsDue.length)} tone="amber" />
          </div>

          <Section
            id="tutor-today"
            title="Today's teaching"
            subtitle={today.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          >
            {todayLessons.length === 0 ? (
              <Empty>No lessons assigned today.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {todayLessons.map((lesson) => {
                  const site = (sites.data ?? []).find((item) => item.id === lesson.site_id);
                  const names = rosterNames(lesson.id);
                  return (
                    <li key={lesson.id}>
                      <Link
                        to="/tutor/classes/$id"
                        params={{ id: lesson.id }}
                        className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 py-3"
                      >
                        <span className="font-extrabold text-primary">
                          {hhmm(lesson.start_time)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold">{lesson.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[lesson.subject, lesson.level].filter(Boolean).join(" · ") ||
                              "Subject to confirm"}
                          </span>
                          <span className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {site?.name ?? lesson.venue_name ?? "Venue to confirm"}
                          </span>
                          <span className="mt-1 block truncate text-xs text-muted-foreground">
                            {names.length ? names.join(", ") : "No students enrolled"}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section id="tutor-classes" title="My classes">
            {myClasses.length === 0 ? (
              <Empty>No classes assigned to you yet.</Empty>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {myClasses.map((lesson) => {
                  const site = (sites.data ?? []).find((item) => item.id === lesson.site_id);
                  const names = rosterNames(lesson.id);
                  return (
                    <Link
                      key={lesson.id}
                      to="/tutor/classes/$id"
                      params={{ id: lesson.id }}
                      className="rounded-2xl border border-border p-4 hover:border-primary/40"
                    >
                      <div className="flex justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold">{lesson.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {lesson.weekday} · {hhmm(lesson.start_time)}-{hhmm(lesson.end_time)}
                          </p>
                        </div>
                        <Pill tone="blue">{names.length} students</Pill>
                      </div>
                      <p className="mt-3 text-sm font-semibold">
                        {[lesson.subject, lesson.level].filter(Boolean).join(" · ") ||
                          "Subject to confirm"}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {site?.name ?? lesson.venue_name ?? "Venue to confirm"}
                      </p>
                      <p className="mt-2 flex items-start gap-1 text-xs text-muted-foreground">
                        <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{names.length ? names.join(", ") : "No students enrolled"}</span>
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </Section>

          <Section
            id="tutor-next"
            title="Upcoming session registers"
            action={
              <Link to="/tutor/lessons" className="text-xs font-bold text-primary">
                <CalendarDays className="mr-1 inline h-4 w-4" /> Full schedule
              </Link>
            }
          >
            {upcoming.length === 0 ? (
              <Empty>Registers will appear when session dates are opened.</Empty>
            ) : (
              <ul className="space-y-2">
                {upcoming.slice(0, 6).map((session) => {
                  const lesson = myClasses.find((item) => item.id === session.class_id);
                  return (
                    <li key={session.id} className="rounded-xl border border-border px-4 py-3">
                      <Link
                        to="/tutor/lesson/$id"
                        params={{ id: session.id }}
                        className="flex items-center gap-3"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">
                            {lesson?.name ?? "Lesson"}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {prettyDate(session.session_date)} · {hhmm(session.start_time)}-
                            {hhmm(session.end_time)}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </>
      )}
    </Page>
  );
}
