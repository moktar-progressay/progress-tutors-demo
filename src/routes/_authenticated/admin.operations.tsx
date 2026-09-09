import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Avatar, CapacityPill, Field, PageHeader, Pill, Section } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { CLASSES, DAYS, SITES, STUDENTS, TUTORS, capacityStatus, site, tutor } from "@/lib/demo-data";

export const Route = createFileRoute("/_authenticated/admin/operations")({
  head: () => ({
    meta: [
      { title: "Operations Planner — ProgressTutors" },
      {
        name: "description",
        content: "Weekly tuition timetable with rooms, tutors, capacity status and site-level operational alerts.",
      },
      { property: "og:title", content: "Operations Planner — ProgressTutors" },
      { property: "og:description", content: "Plan classes, rooms and tutors across every tuition site." },
    ],
  }),
  component: Operations,
});

const HOURS = ["10:00", "11:00", "12:00", "13:00", "16:30", "17:00", "18:00", "19:00", "20:00"];

const toneFor = (enrolled: number, capacity: number) => {
  const s = capacityStatus(enrolled, capacity);
  return s === "available"
    ? "border-l-tile-green-ink bg-tile-green"
    : s === "nearly"
      ? "border-l-tile-amber-ink bg-tile-amber"
      : s === "full"
        ? "border-l-tile-pink-ink bg-tile-pink"
        : "border-l-tile-purple-ink bg-tile-purple";
};

function Operations() {
  const [siteFilter, setSiteFilter] = useState("All sites");
  const [dayFilter, setDayFilter] = useState("All days");
  const [view, setView] = useState<"Classes" | "Rooms" | "Students">("Classes");

  const classes = CLASSES.filter(
    (c) =>
      (siteFilter === "All sites" || site(c.siteId)?.name === siteFilter) &&
      (dayFilter === "All days" || c.day === dayFilter),
  );

  const rows =
    view === "Rooms"
      ? Array.from(new Set(classes.map((c) => `${site(c.siteId)?.name} · ${c.room}`)))
      : view === "Students"
        ? Array.from(new Set(classes.map((c) => `${c.level} cohort`)))
        : DAYS.filter((d) => classes.some((c) => c.day === d));

  const rowMatch = (row: string, c: (typeof CLASSES)[number]) =>
    view === "Rooms"
      ? `${site(c.siteId)?.name} · ${c.room}` === row
      : view === "Students"
        ? `${c.level} cohort` === row
        : c.day === row;

  const studentsToday = classes.reduce((a, c) => a + c.enrolled, 0);
  const tutorsToday = new Set(classes.filter((c) => c.tutorId).map((c) => c.tutorId)).size;
  const noTutor = classes.filter((c) => !c.tutorId);

  return (
    <Page>
      <PageHeader
        title="Operations Planner"
        subtitle="Visual timetable of classes, rooms, tutors and capacity"
        actions={
          <>
            <Button variant="secondary" onClick={() => toast.success("Demo: Add Class form would open")}>
              Add Class
            </Button>
            <Button asChild>
              <Link to="/admin/classes">All Classes</Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <Field
          label="Site"
          value={siteFilter}
          onChange={setSiteFilter}
          options={["All sites", ...SITES.map((s) => s.name)]}
        />
        <Field label="Day" value={dayFilter} onChange={setDayFilter} options={["All days", ...DAYS]} />
        <div className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
          View
          <div className="flex rounded-xl bg-muted p-1">
            {(["Classes", "Rooms", "Students"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  view === v ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[3fr_1fr]">
        <Section id="timetable" title="Weekly timetable" subtitle={`${classes.length} classes shown`}>
          <div className="overflow-x-auto no-scrollbar">
            <div className="min-w-[900px]">
              <div
                className="grid gap-2 border-b border-border pb-2 text-xs font-bold text-muted-foreground"
                style={{ gridTemplateColumns: `140px repeat(${HOURS.length}, minmax(120px, 1fr))` }}
              >
                <span />
                {HOURS.map((h) => (
                  <span key={h}>{h}</span>
                ))}
              </div>

              {rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No classes match these filters.</p>
              ) : null}

              {rows.map((row) => (
                <div
                  key={row}
                  className="grid items-stretch gap-2 border-b border-border py-3"
                  style={{ gridTemplateColumns: `140px repeat(${HOURS.length}, minmax(120px, 1fr))` }}
                >
                  <span className="self-center text-sm font-bold">{row}</span>
                  {HOURS.map((h) => {
                    const c = classes.find((x) => rowMatch(row, x) && x.start === h);
                    if (!c) return <span key={h} className="rounded-xl bg-muted/40" />;
                    const t = tutor(c.tutorId);
                    return (
                      <Link
                        key={h}
                        to="/admin/classes/$id"
                        params={{ id: c.id }}
                        className={`rounded-xl border-l-4 p-2 text-left transition-transform hover:-translate-y-0.5 ${toneFor(c.enrolled, c.capacity)}`}
                      >
                        <p className="text-xs font-extrabold">{c.subject}</p>
                        <p className="text-[10px] font-semibold opacity-75">
                          {c.level} · {c.start}–{c.end}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <Avatar initials={t?.initials ?? "?"} size="sm" tone={t ? "pink" : "amber"} />
                          <span className="truncate text-[10px] font-bold">{t?.name ?? "Unassigned"}</span>
                        </div>
                        <p className="mt-1 text-[10px] font-semibold opacity-80">
                          {c.enrolled}/{c.capacity} · {c.room}
                        </p>
                        <span className="mt-1 inline-block">
                          <CapacityPill enrolled={c.enrolled} capacity={c.capacity} />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Section>

        <div className="space-y-6">
          <Section id="ops-panel" title="Site operations" subtitle="Live snapshot">
            <dl className="space-y-2 text-sm">
              {[
                ["Opening hours", siteFilter === "All sites" ? "Mon–Sun 09:00–20:00" : (SITES.find((s) => s.name === siteFilter)?.hours ?? "—")],
                ["Classes today", String(classes.length)],
                ["Students today", String(studentsToday)],
                ["Tutors today", String(tutorsToday)],
                ["Capacity", "82%"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-border pb-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-bold">{v}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="ops-alerts" title="Alerts" subtitle="Needs attention">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between rounded-xl bg-tile-pink px-3 py-2 text-tile-pink-ink">
                Classes without tutor <span className="font-extrabold">{noTutor.length}</span>
              </li>
              <li className="flex items-center justify-between rounded-xl bg-tile-amber px-3 py-2 text-tile-amber-ink">
                Students without class <span className="font-extrabold">4</span>
              </li>
              <li className="flex items-center justify-between rounded-xl bg-tile-blue px-3 py-2 text-tile-blue-ink">
                Tutor gaps this week <span className="font-extrabold">2</span>
              </li>
              <li className="flex items-center justify-between rounded-xl bg-tile-purple px-3 py-2 text-tile-purple-ink">
                Over capacity classes <span className="font-extrabold">1</span>
              </li>
            </ul>
            {noTutor.map((c) => (
              <div key={c.id} className="mt-3 rounded-xl border border-border px-3 py-2 text-sm">
                <p className="font-bold">{c.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {site(c.siteId)?.name} · {c.day} {c.start}
                </p>
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => toast.success(`Demo: tutor assigned to ${c.subject}`)}
                >
                  Assign Tutor
                </Button>
              </div>
            ))}
          </Section>

          <Section id="ops-actions" title="Quick actions">
            <div className="flex flex-wrap gap-2">
              {["Add Class", "Add Tutor", "Add Student", "Assign Tutor"].map((a) => (
                <Button key={a} size="sm" variant="secondary" onClick={() => toast.success(`Demo: ${a}`)}>
                  {a}
                </Button>
              ))}
              <Button size="sm" variant="outline" asChild>
                <a href="https://goprogress.example.com" target="_blank" rel="noreferrer">
                  Open GoProgress
                </a>
              </Button>
            </div>
          </Section>

          <Section id="ops-tutors" title="Tutors on shift">
            <ul className="space-y-2">
              {TUTORS.map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  <Avatar initials={t.initials} size="sm" />
                  <span className="flex-1 text-sm font-semibold">{t.name}</span>
                  <Pill tone="green">{t.subjects.join(" · ")}</Pill>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              {STUDENTS.length} student profiles in this demo dataset.
            </p>
          </Section>
        </div>
      </div>
    </Page>
  );
}
