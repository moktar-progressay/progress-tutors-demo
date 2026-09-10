import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { FormDialog, SelectField, TextAreaField, TextField } from "@/components/form-kit";
import { Button } from "@/components/ui/button";
import {
  DEMO_DATE,
  fullName,
  hhmm,
  money,
  num,
  prettyDate,
  type ScheduleBlock,
  useDeleteRow,
  useTable,
  useUpdateRow,
  useUpsert,
  WEEKDAYS,
  weekdayOf,
} from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — ProgressTutors" },
      {
        name: "description",
        content: "Live picture of sites, classes, enrolments, payments and tutor pay requests.",
      },
      { property: "og:title", content: "Admin Dashboard — ProgressTutors" },
      { property: "og:description", content: "Shared operational dashboard with live figures." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDashboard,
});

const BLANK_SCHEDULE = {
  title: "",
  venue_name: "",
  weekday: "Saturday",
  start_time: "10:00",
  end_time: "12:00",
  start_date: "",
  end_date: "",
  notes: "",
};

function AdminDashboard() {
  const sites = useTable("sites", "name");
  const programmes = useTable("programmes", "name");
  const blocks = useTable("recurring_schedule_blocks");
  const classes = useTable("classes", "name");
  const students = useTable("students");
  const parents = useTable("parents");
  const tutors = useTable("tutors");
  const enrolments = useTable("class_enrolments");
  const payments = useTable("client_payments");
  const requests = useTable("payment_requests");
  const plans = useTable("pricing_plans", "sort_order");
  const createSchedule = useUpsert("recurring_schedule_blocks");
  const updateSchedule = useUpdateRow("recurring_schedule_blocks");
  const deleteSchedule = useDeleteRow("recurring_schedule_blocks");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleBlock | null>(null);
  const [scheduleForm, setScheduleForm] = useState(BLANK_SCHEDULE);

  const activeStudents = (students.data ?? []).filter((s) => s.status === "active");
  const activeEnrolments = (enrolments.data ?? []).filter((e) => e.status === "active");
  const collected = (payments.data ?? [])
    .filter((p) => p.status === "received")
    .reduce((a, p) => a + num(p.amount), 0);
  const pendingRequests = (requests.data ?? []).filter((r) => r.status === "submitted");
  const unassigned = (classes.data ?? []).filter((c) => !c.tutor_id);
  const today = weekdayOf(DEMO_DATE);

  function openNewSchedule() {
    setEditingSchedule(null);
    setScheduleForm(BLANK_SCHEDULE);
    setScheduleOpen(true);
  }

  function openEditSchedule(block: ScheduleBlock) {
    setEditingSchedule(block);
    setScheduleForm({
      title: block.title,
      venue_name: block.venue_name ?? "",
      weekday: block.weekday,
      start_time: hhmm(block.start_time),
      end_time: hhmm(block.end_time),
      start_date: block.start_date ?? "",
      end_date: block.end_date ?? "",
      notes: block.notes ?? "",
    });
    setScheduleOpen(true);
  }

  async function saveSchedule() {
    const values = {
      title: scheduleForm.title.trim(),
      venue_name: scheduleForm.venue_name.trim() || null,
      weekday: scheduleForm.weekday,
      start_time: scheduleForm.start_time,
      end_time: scheduleForm.end_time,
      start_date: scheduleForm.start_date || null,
      end_date: scheduleForm.end_date || null,
      notes: scheduleForm.notes.trim() || null,
      recurrence: "weekly",
      status: "active",
    };

    try {
      if (editingSchedule) {
        await updateSchedule.mutateAsync({ id: editingSchedule.id, values });
        toast.success("Schedule updated");
      } else {
        await createSchedule.mutateAsync(values);
        toast.success("Schedule created");
      }
      setScheduleOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the schedule");
    }
  }

  async function removeSchedule(block: ScheduleBlock) {
    if (!window.confirm(`Delete ${block.title}?`)) return;
    try {
      await deleteSchedule.mutateAsync(block.id);
      toast.success("Schedule deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the schedule");
    }
  }

  return (
    <Page>
      <PageHeader
        title="Admin dashboard"
        subtitle="Your private school workspace · Live data"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={openNewSchedule}>Add schedule</Button>
            <Link
              to="/admin/classes"
              className="rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-primary"
            >
              View schedule
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active students" value={String(activeStudents.length)} tone="pink" />
        <StatCard label="Class places filled" value={String(activeEnrolments.length)} tone="blue" />
        <StatCard label="Payments received" value={money(collected)} tone="green" />
        <StatCard
          label="Pay requests waiting"
          value={String(pendingRequests.length)}
          tone="amber"
        />
      </div>

      <Section
        id="dash-week"
        title="This week's schedule"
        subtitle="Only schedules owned by your account appear here"
      >
        {(blocks.data ?? []).length === 0 ? (
          <Empty>
            Your schedule is empty.{" "}
            <button type="button" className="font-bold text-primary" onClick={openNewSchedule}>
              Add your first weekly schedule
            </button>
          </Empty>
        ) : (
          <ul className="space-y-2">
            {(blocks.data ?? []).map((b) => {
              const site = (sites.data ?? []).find((s) => s.id === b.site_id);
              const inBlock = (classes.data ?? []).filter((c) => c.schedule_block_id === b.id);
              const enrolled = activeEnrolments.filter((e) =>
                inBlock.some((c) => c.id === e.class_id),
              ).length;
              return (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{b.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.weekday} {hhmm(b.start_time)}–{hhmm(b.end_time)} ·{" "}
                      {site?.name ?? b.venue_name ?? "Venue to confirm"} ·{" "}
                      {b.status === "coming_soon"
                        ? "Coming soon"
                        : b.start_date
                          ? `from ${b.start_date}`
                          : "weekly"}
                    </p>
                  </div>
                  {b.weekday === today ? <Pill tone="green">Runs on the opening day</Pill> : null}
                  <Pill tone="blue">
                    {inBlock.length} classes · {enrolled} enrolled
                  </Pill>
                  <Button size="sm" variant="ghost" onClick={() => openEditSchedule(b)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void removeSchedule(b)}>
                    Delete
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <FormDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        title={editingSchedule ? "Edit weekly schedule" : "Add weekly schedule"}
        description="This schedule is private to your signed-in account."
        submitLabel={editingSchedule ? "Save changes" : "Create schedule"}
        onSubmit={saveSchedule}
        busy={createSchedule.isPending || updateSchedule.isPending}
      >
        <TextField
          label="Schedule name"
          value={scheduleForm.title}
          onChange={(title) => setScheduleForm({ ...scheduleForm, title })}
          required
          full
        />
        <TextField
          label="Venue"
          value={scheduleForm.venue_name}
          onChange={(venue_name) => setScheduleForm({ ...scheduleForm, venue_name })}
          full
        />
        <SelectField
          label="Day"
          value={scheduleForm.weekday}
          onChange={(weekday) => setScheduleForm({ ...scheduleForm, weekday })}
          options={WEEKDAYS.map((day) => ({ value: day, label: day }))}
        />
        <TextField
          label="Start date"
          type="date"
          value={scheduleForm.start_date}
          onChange={(start_date) => setScheduleForm({ ...scheduleForm, start_date })}
        />
        <TextField
          label="Start time"
          type="time"
          value={scheduleForm.start_time}
          onChange={(start_time) => setScheduleForm({ ...scheduleForm, start_time })}
          required
        />
        <TextField
          label="End time"
          type="time"
          value={scheduleForm.end_time}
          onChange={(end_time) => setScheduleForm({ ...scheduleForm, end_time })}
          required
        />
        <TextField
          label="End date"
          type="date"
          value={scheduleForm.end_date}
          onChange={(end_date) => setScheduleForm({ ...scheduleForm, end_date })}
        />
        <TextAreaField
          label="Notes"
          value={scheduleForm.notes}
          onChange={(notes) => setScheduleForm({ ...scheduleForm, notes })}
        />
      </FormDialog>

      <Section id="dash-attention" title="Needs attention">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-bold">Classes without a tutor</p>
            {unassigned.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Every class has someone assigned.
              </p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {unassigned.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <Link
                      to="/admin/classes/$id"
                      params={{ id: c.id }}
                      className="hover:text-primary"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-bold">Payment Requests to review</p>
            {pendingRequests.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Nothing waiting.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {pendingRequests.map((r) => {
                  const t = (tutors.data ?? []).find((x) => x.id === r.tutor_id);
                  return (
                    <li key={r.id}>
                      {fullName(t)} · {money(r.total_amount)}
                    </li>
                  );
                })}
              </ul>
            )}
            <Link
              to="/admin/payment-requests"
              className="mt-3 inline-block text-sm font-bold text-primary"
            >
              Open Payment Requests →
            </Link>
          </div>
        </div>
      </Section>

      <Section id="dash-people" title="People">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Students" value={String((students.data ?? []).length)} tone="purple" />
          <StatCard label="Parents" value={String((parents.data ?? []).length)} tone="blue" />
          <StatCard
            label="Tutors & coaches"
            value={String((tutors.data ?? []).length)}
            tone="green"
          />
          <StatCard label="Sites" value={String((sites.data ?? []).length)} tone="pink" />
        </div>
      </Section>

      <Section
        id="dash-programmes"
        title="Programmes & pricing"
        subtitle="Prices exactly as agreed by the organisation"
      >
        <ul className="space-y-2">
          {(programmes.data ?? []).map((p) => (
            <li key={p.id} className="rounded-xl border border-border px-4 py-3">
              <p className="text-sm font-bold">
                {p.name}{" "}
                <span className="text-xs font-medium text-muted-foreground">
                  · {p.programme_type}
                </span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(plans.data ?? [])
                  .filter((pl) => pl.programme_id === p.id)
                  .map((pl) => (
                    <Pill key={pl.id} tone="green">
                      {pl.name} · {money(pl.amount)} {pl.pricing_unit}
                    </Pill>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  );
}
