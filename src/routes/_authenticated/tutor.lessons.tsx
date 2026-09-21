import { createFileRoute, Link } from "@tanstack/react-router";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, Users } from "lucide-react";
import { useState } from "react";
import { Page } from "@/components/AppShell";
import { Empty, PageHeader, Pill } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { useTutorScope } from "@/lib/auth-scope";
import { hhmm, useTable, type ClassRow } from "@/lib/db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tutor/lessons")({
  head: () => ({
    meta: [
      { title: "My Schedule - ProgressTutors" },
      { name: "description", content: "Your assigned teaching calendar." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TutorSchedule,
});

type View = "day" | "week" | "month";

function lessonRunsOn(lesson: ClassRow, date: Date) {
  const iso = format(date, "yyyy-MM-dd");
  if (lesson.start_date && iso < lesson.start_date) return false;
  if (lesson.end_date && iso > lesson.end_date) return false;
  if (lesson.recurrence === "once") return lesson.start_date === iso;
  return lesson.weekday === format(date, "EEEE");
}

function TutorSchedule() {
  const scope = useTutorScope();
  const classes = useTable("classes", "start_time");
  const sites = useTable("sites", "name");
  const enrolments = useTable("class_enrolments");
  const sessions = useTable("sessions", "session_date");
  const [view, setView] = useState<View>("day");
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const anchor = parseISO(selectedDate);
  const myLessons = (classes.data ?? []).filter(
    (lesson) => lesson.tutor_id === scope.tutorId && lesson.active,
  );
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const days =
    view === "day"
      ? [anchor]
      : view === "week"
        ? Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
        : (() => {
            const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
            const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
            const length = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
            return Array.from({ length }, (_, index) => addDays(start, index));
          })();

  const move = (direction: -1 | 1) => {
    const next =
      view === "day"
        ? addDays(anchor, direction)
        : view === "week"
          ? direction < 0
            ? subWeeks(anchor, 1)
            : addWeeks(anchor, 1)
          : direction < 0
            ? subMonths(anchor, 1)
            : addMonths(anchor, 1);
    setSelectedDate(format(next, "yyyy-MM-dd"));
  };

  const dateTitle =
    view === "day"
      ? format(anchor, "EEEE d MMMM yyyy")
      : view === "week"
        ? `${format(weekStart, "d MMM")} - ${format(addDays(weekStart, 6), "d MMM yyyy")}`
        : format(anchor, "MMMM yyyy");

  return (
    <Page className="space-y-4">
      <PageHeader title="My schedule" subtitle="Only lessons assigned to you are shown" />
      <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSelectedDate(format(new Date(), "yyyy-MM-dd"))}
          >
            Today
          </Button>
          <Button size="icon" variant="ghost" onClick={() => move(-1)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => move(1)} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <p className="min-w-44 flex-1 text-sm font-extrabold sm:text-base">{dateTitle}</p>
          <div className="flex rounded-xl bg-muted p-1">
            {(["day", "week", "month"] as View[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold capitalize",
                  view === item ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "mt-4 grid gap-2",
            view === "week" && "md:grid-cols-7",
            view === "month" && "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7",
          )}
        >
          {days.map((day) => {
            const lessons = myLessons.filter((lesson) => lessonRunsOn(lesson, day));
            return (
              <section
                key={day.toISOString()}
                className={cn(
                  "min-w-0 rounded-xl border border-border bg-background p-2",
                  view === "day" && "p-4",
                  !isSameMonth(day, anchor) && view === "month" && "opacity-45",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(format(day, "yyyy-MM-dd"));
                    if (view === "month") setView("day");
                  }}
                  className="mb-2 text-left"
                >
                  <span className="block text-[10px] font-bold uppercase text-muted-foreground">
                    {format(day, "EEE")}
                  </span>
                  <span className="text-sm font-extrabold">{format(day, "d MMM")}</span>
                </button>
                <div className="space-y-2">
                  {lessons.map((lesson) => {
                    const site = (sites.data ?? []).find((item) => item.id === lesson.site_id);
                    const count = (enrolments.data ?? []).filter(
                      (item) => item.class_id === lesson.id && item.status === "active",
                    ).length;
                    const session = (sessions.data ?? []).find(
                      (item) =>
                        item.class_id === lesson.id &&
                        item.session_date === format(day, "yyyy-MM-dd"),
                    );
                    return (
                      <Link
                        key={lesson.id}
                        to={session ? "/tutor/lesson/$id" : "/tutor/classes/$id"}
                        params={{ id: session?.id ?? lesson.id }}
                        className="block rounded-xl border border-primary/20 bg-secondary p-3 text-secondary-foreground"
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
                        <Pill tone="blue">
                          <Users className="mr-1 inline h-3 w-3" /> {count}
                        </Pill>
                      </Link>
                    );
                  })}
                  {lessons.length === 0 && view !== "month" ? <Empty>No lessons</Empty> : null}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </Page>
  );
}
