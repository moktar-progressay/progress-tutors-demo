import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, CreditCard, Users, Wallet } from "lucide-react";
import { Page } from "@/components/AppShell";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { DEMO_DATE, fullName, hhmm, money, num, useTable, weekdayOf } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | ProgressTutors" },
      {
        name: "description",
        content: "Today's lessons, contacts and payments for your tuition centre.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const lessons = useTable("classes", "start_time");
  const students = useTable("students");
  const parents = useTable("parents");
  const tutors = useTable("tutors");
  const enrolments = useTable("class_enrolments");
  const payments = useTable("client_payments");
  const requests = useTable("payment_requests");
  const sites = useTable("sites", "name");

  const today = weekdayOf(DEMO_DATE);
  const todayLessons = (lessons.data ?? [])
    .filter((lesson) => lesson.active && lesson.weekday === today)
    .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
  const activeEnrolments = (enrolments.data ?? []).filter((item) => item.status === "active");
  const collected = (payments.data ?? [])
    .filter((item) => ["received", "paid"].includes(item.status))
    .reduce((total, item) => total + num(item.amount), 0);
  const tutorPayments = (requests.data ?? []).filter((item) => item.status === "submitted");
  const unpaid = (payments.data ?? [])
    .filter((item) => !["received", "paid"].includes(item.status))
    .reduce((total, item) => total + num(item.amount), 0);
  const contactTotal =
    (students.data ?? []).length + (parents.data ?? []).length + (tutors.data ?? []).length;

  return (
    <Page className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle="Your tuition centre at a glance."
        actions={
          <Button asChild>
            <Link to="/admin/classes">Open schedule</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Today's lessons"
          value={String(todayLessons.length)}
          tone="pink"
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <StatCard
          label="Unpaid fees"
          value={money(unpaid)}
          tone="amber"
          icon={<CreditCard className="h-5 w-5" />}
        />
        <StatCard
          label="Tutor payments waiting"
          value={money(tutorPayments.reduce((total, item) => total + num(item.total_amount), 0))}
          tone="purple"
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          label="Total contacts"
          value={String(contactTotal)}
          hint={`${(students.data ?? []).length} students · ${(parents.data ?? []).length} parents · ${(tutors.data ?? []).length} tutors`}
          tone="green"
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Section
          id="today-lessons"
          title="Today's lessons"
          subtitle={`${today} · One calendar for all online and face-to-face tuition`}
          action={
            <Link to="/admin/classes" className="text-xs font-bold text-primary">
              Open schedule
            </Link>
          }
        >
          {todayLessons.length === 0 ? (
            <Empty>No lessons scheduled today.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {todayLessons.map((lesson) => {
                const tutor = (tutors.data ?? []).find((item) => item.id === lesson.tutor_id);
                const site = (sites.data ?? []).find((item) => item.id === lesson.site_id);
                const count = activeEnrolments.filter((item) => item.class_id === lesson.id).length;
                return (
                  <li key={lesson.id}>
                    <Link
                      to="/admin/classes/$id"
                      params={{ id: lesson.id }}
                      className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 py-3"
                    >
                      <p className="text-sm font-extrabold text-primary">
                        {hhmm(lesson.start_time)}
                      </p>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{lesson.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {tutor ? fullName(tutor) : "Tutor needed"} ·{" "}
                          {site?.name ??
                            lesson.venue_name ??
                            (lesson.delivery_mode === "online" ? "Online" : "Venue TBC")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Pill tone="blue">
                          {count}/{lesson.capacity}
                        </Pill>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section id="money-overview" title="Money" subtitle="Client payments and tutor payouts">
          <div className="space-y-3">
            <div className="rounded-xl bg-tile-green px-4 py-3 text-tile-green-ink">
              <p className="text-xs font-bold uppercase">Collected</p>
              <p className="mt-1 text-2xl font-extrabold">{money(collected)}</p>
            </div>
            <div className="rounded-xl bg-tile-amber px-4 py-3 text-tile-amber-ink">
              <p className="text-xs font-bold uppercase">Payment requests</p>
              <p className="mt-1 text-2xl font-extrabold">{tutorPayments.length}</p>
            </div>
            <Link
              to="/admin/payments"
              className="inline-flex items-center gap-1 text-sm font-bold text-primary"
            >
              Open payments <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </Section>
      </div>
    </Page>
  );
}
