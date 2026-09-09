import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Page } from "@/components/AppShell";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { SelectField } from "@/components/form-kit";
import { Input } from "@/components/ui/input";
import { capacityTone, hhmm, money, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/parent/classes/")({
  head: () => ({
    meta: [
      { title: "Find a Class — ProgressTutors" },
      { name: "description", content: "Browse tuition and football sessions by site, day and programme, and request a place." },
      { property: "og:title", content: "Find a Class — ProgressTutors" },
      { property: "og:description", content: "Browse available classes and request a place." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FindClasses,
});

function FindClasses() {
  const classes = useTable("classes", "name");
  const sites = useTable("sites", "name");
  const programmes = useTable("programmes", "name");
  const plans = useTable("pricing_plans", "sort_order");
  const enrolments = useTable("class_enrolments");

  const [q, setQ] = useState("");
  const [site, setSite] = useState("");
  const [programme, setProgramme] = useState("");

  const rows = (classes.data ?? []).filter(
    (c) =>
      c.active &&
      (site === "" || c.site_id === site) &&
      (programme === "" || c.programme_id === programme) &&
      (q === "" || `${c.name} ${c.subject ?? ""} ${c.level ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <Page>
      <PageHeader title="Find a class" subtitle="Live availability from the shared timetable" />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search classes"
          className="h-10 max-w-sm rounded-xl"
        />
        <SelectField
          label="Site"
          value={site}
          onChange={setSite}
          options={[{ value: "", label: "All sites" }, ...(sites.data ?? []).map((s) => ({ value: s.id, label: s.name }))]}
        />
        <SelectField
          label="Programme"
          value={programme}
          onChange={setProgramme}
          options={[
            { value: "", label: "All programmes" },
            ...(programmes.data ?? []).map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Classes shown" value={String(rows.length)} tone="pink" />
        <StatCard label="Sites" value={String((sites.data ?? []).length)} tone="blue" />
        <StatCard label="Programmes" value={String((programmes.data ?? []).length)} tone="purple" />
        <StatCard label="Plans" value={String((plans.data ?? []).length)} tone="green" />
      </div>

      <Section id="parent-plans" title="Football memberships" subtitle="Prices exactly as set by the organisation">
        <ul className="space-y-2">
          {(plans.data ?? []).map((p) => (
            <li key={p.id} className="rounded-xl border border-border px-4 py-3">
              <p className="text-sm font-bold">
                {p.name} · {money(p.amount)} {p.pricing_unit}
              </p>
              {p.inclusion_notes ? <p className="text-xs text-muted-foreground">{p.inclusion_notes}</p> : null}
              {p.availability_note ? <Pill tone="amber">{p.availability_note}</Pill> : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="parent-classes" title="Available classes">
        {rows.length === 0 ? (
          <Empty>Nothing matches those filters yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {rows.map((c) => {
              const s = (sites.data ?? []).find((x) => x.id === c.site_id);
              const count = (enrolments.data ?? []).filter((e) => e.class_id === c.id && e.status === "active").length;
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/parent/classes/$id"
                      params={{ id: c.id }}
                      className="text-sm font-bold hover:text-primary"
                    >
                      {c.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {c.weekday} {hhmm(c.start_time)}–{hhmm(c.end_time)} · {s?.name ?? "Venue to confirm"}
                    </p>
                  </div>
                  <Pill tone={capacityTone(count, c.capacity)}>
                    {Math.max(c.capacity - count, 0)} places left
                  </Pill>
                  {c.price_per_session ? <Pill tone="green">{money(c.price_per_session)} per session</Pill> : null}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </Page>
  );
}
