import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Avatar, CapacityPill, Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { CLASSES, STUDENTS, klass, money, site, tutor } from "@/lib/demo-data";

export const Route = createFileRoute("/_authenticated/admin/classes/$id")({
  head: () => ({
    meta: [
      { title: "Class Detail — ProgressTutors" },
      {
        name: "description",
        content: "Class roster, recurring schedule, GoProgress sync, attendance, payments and notes.",
      },
      { property: "og:title", content: "Class Detail — ProgressTutors" },
      { property: "og:description", content: "Everything about a single tuition class in one place." },
    ],
  }),
  component: ClassDetail,
});

const TABS = ["Students", "Schedule", "GoProgress", "Attendance", "Payments", "Notes"] as const;
type Tab = (typeof TABS)[number];

function ClassDetail() {
  const { id } = Route.useParams();
  const c = klass(id) ?? CLASSES[0]!;
  const t = tutor(c.tutorId);
  const s = site(c.siteId);
  const [tab, setTab] = useState<Tab>("Students");
  const roster = STUDENTS.filter((st) => st.classIds.includes(c.id));

  return (
    <Page>
      <PageHeader
        breadcrumb={
          <span>
            <Link to="/admin/operations" className="hover:text-primary">
              Operations
            </Link>{" "}
            ›{" "}
            <Link to="/admin/classes" className="hover:text-primary">
              Classes
            </Link>{" "}
            › <span className="text-foreground">{c.subject}</span>
          </span>
        }
        title={c.subject}
        subtitle={`${c.type} · ${s?.name} · ${c.day} ${c.start}–${c.end} · ${c.room} · ${c.recurrence}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => toast.success("Demo: class settings would open")}>
              Edit Class
            </Button>
            <Button asChild>
              <a href="https://goprogress.example.com" target="_blank" rel="noreferrer">
                Open GoProgress
              </a>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Pill tone="green">{c.status}</Pill>
        <Pill tone="blue">Code: {c.code}</Pill>
        <CapacityPill enrolled={c.enrolled} capacity={c.capacity} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Students" value={`${c.enrolled}/${c.capacity}`} tone="pink" />
        <StatCard label="Tutor" value={t?.name ?? "Tutor needed"} tone="blue" />
        <StatCard label="GoProgress" value={c.goprogress ? "Connected" : "Not linked"} tone="green" />
        <StatCard label="Attendance" value={`${c.attendance}%`} tone="amber" />
      </div>

      <div className="surface p-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map((x) => (
            <button
              key={x}
              type="button"
              onClick={() => setTab(x)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                tab === x ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {x}
            </button>
          ))}
        </div>
      </div>

      {tab === "Students" ? (
        <Section id="cd-students" title="Students" subtitle={`${roster.length} enrolled`}>
          {roster.length === 0 ? (
            <Empty>No students enrolled yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    {["Student", "Year", "Parent", "Attendance", "Status", "Actions"].map((h) => (
                      <th key={h} className="pb-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roster.map((st) => (
                    <tr key={st.id} className="border-t border-border">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Avatar initials={st.initials} size="sm" tone="purple" />
                          <span className="font-semibold">{st.name}</span>
                        </div>
                      </td>
                      <td className="py-3">{st.year}</td>
                      <td className="py-3">{st.parentName}</td>
                      <td className="py-3">
                        <Pill tone={st.attendance >= 90 ? "green" : "amber"}>{st.attendance}%</Pill>
                      </td>
                      <td className="py-3">{st.status}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {["View Student", "View Parent", "Move Class", "Remove", "Message Parent"].map((a) => (
                            <Button
                              key={a}
                              size="sm"
                              variant="ghost"
                              onClick={() => toast.success(`Demo: ${a} — ${st.name}`)}
                            >
                              {a}
                            </Button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      ) : null}

      {tab === "Schedule" ? (
        <Section id="cd-schedule" title="Schedule" subtitle={`${c.recurrence} · ${c.day} ${c.start}–${c.end}`}>
          <ul className="space-y-2">
            {["14 Sep", "21 Sep", "28 Sep", "5 Oct", "12 Oct"].map((d) => (
              <li key={d} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <span className="text-sm font-semibold">
                  {c.day} {d}
                </span>
                <span className="text-xs text-muted-foreground">
                  {c.start}–{c.end} · {c.room} · {t?.name ?? "Tutor needed"}
                </span>
                <Pill tone="blue">Scheduled</Pill>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {tab === "GoProgress" ? (
        <Section id="cd-gp" title="GoProgress" subtitle="Linked learning and attendance platform">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Course" value={`${c.subject} ${c.level}`} tone="blue" />
            <StatCard label="Students synced" value={`${c.enrolled}`} tone="green" />
            <StatCard label="Teachers synced" value={t ? "1" : "0"} tone="purple" />
            <StatCard label="Lessons synced" value="16" tone="amber" />
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={() => toast.success("Demo: GoProgress sync complete")}>
              Sync Now
            </Button>
            <Button asChild>
              <a href="https://goprogress.example.com" target="_blank" rel="noreferrer">
                Open GoProgress
              </a>
            </Button>
          </div>
        </Section>
      ) : null}

      {tab === "Attendance" ? (
        <Section id="cd-att" title="Attendance" subtitle={`Class average ${c.attendance}%`}>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${c.attendance}%` }} />
          </div>
          <ul className="mt-4 space-y-2">
            {roster.map((st) => (
              <li key={st.id} className="flex items-center gap-3">
                <Avatar initials={st.initials} size="sm" tone="green" />
                <span className="w-40 text-sm font-semibold">{st.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${st.attendance}%` }} />
                </div>
                <span className="w-12 text-right text-sm font-bold">{st.attendance}%</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {tab === "Payments" ? (
        <Section id="cd-pay" title="Payments" subtitle="For this class this month">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Expected" value={money(c.enrolled * c.price * 4)} tone="blue" />
            <StatCard label="Collected" value={money(c.enrolled * c.price * 3)} tone="green" />
            <StatCard label="Outstanding" value={money(c.price * 4)} tone="pink" />
          </div>
        </Section>
      ) : null}

      {tab === "Notes" ? (
        <Section id="cd-notes" title="Notes">
          <ul className="space-y-2 text-sm">
            <li className="rounded-xl border border-border px-4 py-3">
              <p className="font-semibold">Room change requested for October half term.</p>
              <p className="text-xs text-muted-foreground">Added by Moktar · 4 Sep</p>
            </li>
            <li className="rounded-xl border border-border px-4 py-3">
              <p className="font-semibold">Waiting list has 3 students — consider opening a second group.</p>
              <p className="text-xs text-muted-foreground">Added by Sarah Ahmed · 1 Sep</p>
            </li>
          </ul>
        </Section>
      ) : null}
    </Page>
  );
}
