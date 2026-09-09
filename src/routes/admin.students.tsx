import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Avatar, Field, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CLASSES, STUDENTS, klass } from "@/lib/demo-data";

export const Route = createFileRoute("/admin/students")({
  head: () => ({
    meta: [
      { title: "Students — ProgressTutors" },
      { name: "description", content: "Every student, their classes, parents, attendance and enrolment status." },
      { property: "og:title", content: "Students — ProgressTutors" },
      { property: "og:description", content: "Student roster with attendance and parent contacts." },
    ],
  }),
  component: Students;
});

function Students() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All statuses");
  const filtered = STUDENTS.filter(
    (s) =>
      (status === "All statuses" || s.status === status) &&
      (q === "" || `${s.name} ${s.parentName} ${s.year}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <Page>
      <PageHeader
        title="Students"
        subtitle="96 students across 3 sites"
        actions={
          <Button onClick={() => toast.success("Demo: Add Student form would open")}>Add Student</Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active" value="88" tone="green" />
        <StatCard label="On trial" value="5" tone="amber" />
        <StatCard label="Paused" value="3" tone="purple" />
        <StatCard label="Without a class" value="4" tone="pink" />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search students or parents"
          className="h-10 max-w-sm rounded-xl"
        />
        <Field
          label="Status"
          value={status}
          onChange={setStatus}
          options={["All statuses", "Active", "Trial", "Paused"]}
        />
      </div>

      <Section id="student-table" title="Student roster" subtitle={`${filtered.length} shown`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                {["Student", "Year", "Parent", "Classes", "Attendance", "Status", ""].map((h) => (
                  <th key={h} className="pb-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <Avatar initials={s.initials} size="sm" tone="purple" />
                      <span className="font-semibold">{s.name}</span>
                    </div>
                  </td>
                  <td className="py-3">{s.year}</td>
                  <td className="py-3">{s.parentName}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.classIds.map((cid) => (
                        <Link key={cid} to="/admin/classes/$id" params={{ id: cid }}>
                          <Pill tone="blue">{klass(cid)?.subject ?? cid}</Pill>
                        </Link>
                      ))}
                    </div>
                  </td>
                  <td className="py-3">
                    <Pill tone={s.attendance >= 90 ? "green" : "amber"}>{s.attendance}%</Pill>
                  </td>
                  <td className="py-3">{s.status}</td>
                  <td className="py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => toast.success(`Demo: profile for ${s.name}`)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Demo dataset shows {STUDENTS.length} of 96 students across {CLASSES.length} classes.
        </p>
      </Section>
    </Page>
  );
}
