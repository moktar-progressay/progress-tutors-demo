import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Avatar, CapacityPill, Field, PageHeader, Pill, Section } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CLASSES, DAYS, SITES, TUTORS, site, tutor } from "@/lib/demo-data";

export const Route = createFileRoute("/admin/classes")({
  head: () => ({
    meta: [
      { title: "Classes — ProgressTutors" },
      {
        name: "description",
        content: "Browse every recurring class with site, day, tutor, capacity and GoProgress sync status.",
      },
      { property: "og:title", content: "Classes — ProgressTutors" },
      { property: "og:description", content: "Filter classes by site, day, subject, level, tutor and status." },
    ],
  }),
  component: Classes,
});

function Classes() {
  const [siteF, setSiteF] = useState("All sites");
  const [dayF, setDayF] = useState("All days");
  const [subjectF, setSubjectF] = useState("All subjects");
  const [levelF, setLevelF] = useState("All levels");
  const [tutorF, setTutorF] = useState("All tutors");
  const [statusF, setStatusF] = useState("All statuses");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"Cards" | "List" | "Timetable">("Cards");

  const subjects = Array.from(new Set(CLASSES.map((c) => c.subject)));
  const levels = Array.from(new Set(CLASSES.map((c) => c.level)));

  const filtered = CLASSES.filter((c) => {
    const t = tutor(c.tutorId);
    const text = `${c.subject} ${c.code} ${t?.name ?? ""}`.toLowerCase();
    return (
      (siteF === "All sites" || site(c.siteId)?.name === siteF) &&
      (dayF === "All days" || c.day === dayF) &&
      (subjectF === "All subjects" || c.subject === subjectF) &&
      (levelF === "All levels" || c.level === levelF) &&
      (tutorF === "All tutors" || t?.name === tutorF) &&
      (statusF === "All statuses" || c.status === statusF) &&
      (q === "" || text.includes(q.toLowerCase()))
    );
  });

  return (
    <Page>
      <PageHeader
        title="Classes"
        subtitle="12 active classes · 96 students"
        actions={
          <>
            <Button variant="secondary" onClick={() => toast.success("Demo: Add Class form would open")}>
              Add Class
            </Button>
            <Button asChild>
              <Link to="/admin/operations">Operations Planner</Link>
            </Button>
          </>
        }
      />

      <div className="surface space-y-3 p-4">
        <div className="flex flex-wrap gap-3">
          <Field label="Site" value={siteF} onChange={setSiteF} options={["All sites", ...SITES.map((s) => s.name)]} />
          <Field label="Day" value={dayF} onChange={setDayF} options={["All days", ...DAYS]} />
          <Field label="Subject" value={subjectF} onChange={setSubjectF} options={["All subjects", ...subjects]} />
          <Field label="Level" value={levelF} onChange={setLevelF} options={["All levels", ...levels]} />
          <Field label="Tutor" value={tutorF} onChange={setTutorF} options={["All tutors", ...TUTORS.map((t) => t.name)]} />
          <Field
            label="Status"
            value={statusF}
            onChange={setStatusF}
            options={["All statuses", "Active", "Needs tutor", "Draft"]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search classes, tutors or codes"
            className="h-10 max-w-sm rounded-xl"
          />
          <div className="flex rounded-xl bg-muted p-1">
            {(["Cards", "List", "Timetable"] as const).map((v) => (
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
          <span className="text-xs text-muted-foreground">{filtered.length} results</span>
        </div>
      </div>

      {view === "Cards" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const t = tutor(c.tutorId);
            const spaces = c.capacity - c.enrolled;
            return (
              <article key={c.id} className="surface flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-extrabold">{c.subject}</h2>
                    <p className="text-xs text-muted-foreground">
                      {c.type} · {site(c.siteId)?.name}
                    </p>
                  </div>
                  <Pill tone={c.status === "Active" ? "green" : "amber"}>{c.status}</Pill>
                </div>
                <p className="text-sm font-semibold">
                  {c.day} {c.start}–{c.end}
                </p>
                <div className="flex items-center gap-2">
                  <Avatar initials={t?.initials ?? "?"} size="sm" tone={t ? "pink" : "amber"} />
                  <span className="text-sm font-semibold">{t?.name ?? "Tutor needed"}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="blue">
                    {c.enrolled}/{c.capacity} students
                  </Pill>
                  <CapacityPill enrolled={c.enrolled} capacity={c.capacity} />
                  {spaces > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      {spaces} space{spaces === 1 ? "" : "s"} left
                    </span>
                  ) : null}
                </div>
                <p className="text-xs font-semibold text-muted-foreground">
                  GoProgress {c.goprogress ? "✓ Connected" : "· Not connected"}
                </p>
                <Button asChild variant="secondary" className="mt-auto rounded-full">
                  <Link to="/admin/classes/$id" params={{ id: c.id }}>
                    View Class
                  </Link>
                </Button>
              </article>
            );
          })}
        </div>
      ) : null}

      {view === "List" ? (
        <Section id="class-list" title="All classes">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  {["Class", "Code", "Site", "Schedule", "Tutor", "Students", "Status", ""].map((h) => (
                    <th key={h} className="pb-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="py-3 font-semibold">{c.subject}</td>
                    <td className="py-3 text-muted-foreground">{c.code}</td>
                    <td className="py-3">{site(c.siteId)?.name}</td>
                    <td className="py-3">
                      {c.day} {c.start}
                    </td>
                    <td className="py-3">{tutor(c.tutorId)?.name ?? "—"}</td>
                    <td className="py-3">
                      {c.enrolled}/{c.capacity}
                    </td>
                    <td className="py-3">
                      <CapacityPill enrolled={c.enrolled} capacity={c.capacity} />
                    </td>
                    <td className="py-3 text-right">
                      <Button size="sm" variant="ghost" asChild>
                        <Link to="/admin/classes/$id" params={{ id: c.id }}>
                          View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {view === "Timetable" ? (
        <Section id="class-timetable" title="Timetable view" subtitle="Grouped by day">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {DAYS.filter((d) => filtered.some((c) => c.day === d)).map((d) => (
              <div key={d} className="rounded-2xl border border-border p-4">
                <p className="text-sm font-extrabold">{d}</p>
                <ul className="mt-2 space-y-2">
                  {filtered
                    .filter((c) => c.day === d)
                    .map((c) => (
                      <li key={c.id}>
                        <Link
                          to="/admin/classes/$id"
                          params={{ id: c.id }}
                          className="block rounded-xl bg-muted/60 px-3 py-2 hover:bg-secondary"
                        >
                          <p className="text-sm font-bold">{c.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.start}–{c.end} · {tutor(c.tutorId)?.name ?? "Tutor needed"} · {c.enrolled}/
                            {c.capacity}
                          </p>
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </Page>
  );
}
