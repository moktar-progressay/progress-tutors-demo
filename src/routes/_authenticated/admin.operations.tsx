import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { SelectField, TextField } from "@/components/form-kit";
import { SessionRegister } from "@/components/session-register";
import { Button } from "@/components/ui/button";
import {
  capacityTone,
  DEMO_DATE,
  fullName,
  hhmm,
  prettyDate,
  useTable,
  useUpsert,
  weekdayOf,
} from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/operations")({
  head: () => ({
    meta: [
      { title: "Operations — ProgressTutors" },
      { name: "description", content: "Run the day: schedule blocks, sessions, tutor sign-ins and live registers." },
      { property: "og:title", content: "Operations — ProgressTutors" },
      { property: "og:description", content: "Daily operations board with live registers." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Operations,
});

function Operations() {
  const [date, setDate] = useState(DEMO_DATE);
  const [siteFilter, setSiteFilter] = useState("");

  const sites = useTable("sites", "name");
  const blocks = useTable("recurring_schedule_blocks");
  const classes = useTable("classes", "start_time");
  const tutors = useTable("tutors");
  const enrolments = useTable("class_enrolments");
  const sessions = useTable("sessions");
  const signins = useTable("tutor_signins");
  const attendance = useTable("student_attendance");
  const createSession = useUpsert("sessions");

  const weekday = weekdayOf(date);
  const siteList = sites.data ?? [];
  const defaultSite = siteList.find((s) => s.name === "Lancaster Youth Hub")?.id ?? "";
  const site = siteFilter || defaultSite;

  const dayBlocks = useMemo(
    () =>
      (blocks.data ?? []).filter(
        (b) => b.weekday === weekday && (site === "all" || !site || b.site_id === site),
      ),
    [blocks.data, weekday, site],
  );

  const daySessions = (sessions.data ?? []).filter((s) => s.session_date === date);
  const signedIn = (signins.data ?? []).filter((s) => daySessions.some((d) => d.id === s.session_id)).length;
  const marked = (attendance.data ?? []).filter((a) => daySessions.some((d) => d.id === a.session_id)).length;

  async function startSession(classId: string) {
    const c = (classes.data ?? []).find((x) => x.id === classId);
    if (!c) return;
    await createSession.mutateAsync({
      class_id: c.id,
      site_id: c.site_id,
      schedule_block_id: c.schedule_block_id,
      tutor_id: c.tutor_id,
      session_date: date,
      start_time: c.start_time,
      end_time: c.end_time,
      status: "in_progress",
      agreed_amount: c.session_rate,
    });
    toast.success("Session opened — the register is live");
  }

  return (
    <Page>
      <PageHeader title="Operations" subtitle={`${prettyDate(date)} · shared operational demo · live data`} />

      <div className="flex flex-wrap items-end gap-3">
        <TextField label="Date" type="date" value={date} onChange={setDate} />
        <SelectField
          label="Site"
          value={site}
          onChange={setSiteFilter}
          options={[{ value: "all", label: "All sites" }, ...siteList.map((s) => ({ value: s.id, label: s.name }))]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Blocks running" value={String(dayBlocks.length)} tone="pink" />
        <StatCard label="Sessions open" value={String(daySessions.length)} tone="blue" />
        <StatCard label="Tutor sign-ins" value={String(signedIn)} tone="green" />
        <StatCard label="Attendance marks" value={String(marked)} tone="purple" />
      </div>

      {dayBlocks.length === 0 ? (
        <Section id="ops-empty" title="Nothing scheduled">
          <Empty>No recurring blocks run on {weekday} at this site.</Empty>
        </Section>
      ) : null}

      {dayBlocks.map((b) => {
        const blockSite = siteList.find((s) => s.id === b.site_id);
        const blockClasses = (classes.data ?? []).filter((c) => c.schedule_block_id === b.id && c.active);
        return (
          <Section
            key={b.id}
            id={`ops-${b.id}`}
            title={b.title}
            subtitle={`${hhmm(b.start_time)}–${hhmm(b.end_time)} · ${blockSite?.name ?? "Venue to confirm"}${
              b.status === "coming_soon" ? " · Coming soon, no start date confirmed" : ""
            }`}
          >
            {blockClasses.length === 0 ? (
              <Empty>
                No classes created in this block yet — tutor not assigned, 0 enrolled.{" "}
                <Link to="/admin/classes" className="font-bold text-primary">
                  Create one
                </Link>
              </Empty>
            ) : (
              <div className="space-y-4">
                {blockClasses.map((c) => {
                  const session = daySessions.find((s) => s.class_id === c.id);
                  const count = (enrolments.data ?? []).filter(
                    (e) => e.class_id === c.id && e.status === "active",
                  ).length;
                  const tutor = (tutors.data ?? []).find((t) => t.id === c.tutor_id);
                  return (
                    <div key={c.id} className="rounded-2xl border border-border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to="/admin/classes/$id"
                          params={{ id: c.id }}
                          className="text-sm font-bold hover:text-primary"
                        >
                          {c.name}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {hhmm(c.start_time)}–{hhmm(c.end_time)} · {tutor ? fullName(tutor) : "Tutor not assigned"}
                        </span>
                        <Pill tone={capacityTone(count, c.capacity)}>
                          {count}/{c.capacity}
                        </Pill>
                        {!session ? (
                          <Button size="sm" className="ml-auto" onClick={() => startSession(c.id)}>
                            Open register
                          </Button>
                        ) : (
                          <Pill tone="green" className="ml-auto">
                            Register open
                          </Pill>
                        )}
                      </div>
                      {session ? (
                        <div className="mt-4">
                          <SessionRegister session={session} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        );
      })}
    </Page>
  );
}
