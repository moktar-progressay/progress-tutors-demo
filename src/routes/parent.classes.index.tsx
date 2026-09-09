import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Page } from "@/components/AppShell";
import { CapacityPill, Empty, Field, PageHeader, Pill, Section } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { CHILDREN, CLASSES, DAYS, SITES, money, site, tutor } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";

export const Route = createFileRoute("/parent/classes/")({
  head: () => ({
    meta: [
      { title: "Find Classes — ProgressTutors" },
      { name: "description", content: "Search classes by subject, level, day, location and format, then join." },
      { property: "og:title", content: "Find Classes — ProgressTutors" },
      { property: "og:description", content: "Find and join the right class for your child." },
    ],
  }),
  component: FindClasses,
});

function FindClasses() {
  const { enrolments } = useDemo();
  const [child, setChild] = useState("Aisha");
  const [subject, setSubject] = useState("All subjects");
  const [level, setLevel] = useState("All levels");
  const [mode, setMode] = useState("Any format");
  const [location, setLocation] = useState("Any location");
  const [day, setDay] = useState("Any day");
  const [time, setTime] = useState("Any time");

  const results = CLASSES.filter((c) => {
    const online = c.room === "Online";
    return (
      (subject === "All subjects" || c.subject === subject) &&
      (level === "All levels" || c.level === level) &&
      (mode === "Any format" || (mode === "Online" ? online : !online)) &&
      (location === "Any location" || site(c.siteId)?.name === location) &&
      (day === "Any day" || c.day === day) &&
      (time === "Any time" || (time === "Morning" ? c.start < "13:00" : c.start >= "13:00")) &&
      c.enrolled < c.capacity
    );
  });

  return (
    <Page>
      <PageHeader title="Find Classes" subtitle="Search available classes and join in a few taps" />

      <div className="surface flex flex-wrap gap-3 p-4">
        <Field label="Which child" value={child} onChange={setChild} options={CHILDREN.map((c) => c.short)} />
        <Field
          label="Subject"
          value={subject}
          onChange={setSubject}
          options={["All subjects", ...Array.from(new Set(CLASSES.map((c) => c.subject)))]}
        />
        <Field
          label="Level"
          value={level}
          onChange={setLevel}
          options={["All levels", ...Array.from(new Set(CLASSES.map((c) => c.level)))]}
        />
        <Field label="Format" value={mode} onChange={setMode} options={["Any format", "Online", "In Person"]} />
        <Field
          label="Location"
          value={location}
          onChange={setLocation}
          options={["Any location", ...SITES.map((s) => s.name)]}
        />
        <Field label="Day" value={day} onChange={setDay} options={["Any day", ...DAYS]} />
        <Field label="Time" value={time} onChange={setTime} options={["Any time", "Morning", "Afternoon"]} />
      </div>

      {enrolments.length > 0 ? (
        <Section id="joined" title="Recently joined">
          <ul className="space-y-2">
            {enrolments.map((e, i) => (
              <li key={i} className="rounded-xl bg-tile-green px-4 py-3 text-sm font-semibold text-tile-green-ink">
                {e.className} added for {e.child} and linked to GoProgress.
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section id="results" title="Available classes" subtitle={`${results.length} with spaces`}>
        {results.length === 0 ? (
          <Empty>No classes match your search. Try widening the filters.</Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {results.map((c) => (
              <article key={c.id} className="surface p-5">
                <h2 className="text-lg font-extrabold">{c.subject}</h2>
                <p className="text-xs text-muted-foreground">
                  {c.day} {c.start} · {site(c.siteId)?.name}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Pill tone="blue">
                    {c.enrolled}/{c.capacity} places
                  </Pill>
                  <CapacityPill enrolled={c.enrolled} capacity={c.capacity} />
                  <span className="text-sm font-bold">{money(c.price)}/session</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Tutor {tutor(c.tutorId)?.name ?? "to be confirmed"}
                </p>
                <Button asChild className="mt-4 w-full rounded-full">
                  <Link to="/parent/classes/$id" params={{ id: c.id }} search={{ child }}>
                    View Class
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        )}
      </Section>
    </Page>
  );
}
