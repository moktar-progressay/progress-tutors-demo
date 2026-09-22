import { createFileRoute, Link } from "@tanstack/react-router";
import { eachDayOfInterval, format, startOfMonth } from "date-fns";
import { LayoutGrid, List, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Avatar, Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import {
  ConfirmDeleteDialog,
  FormDialog,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/form-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fullName,
  initialsOf,
  money,
  num,
  type TutorRow,
  useDeleteRow,
  useTable,
  useUpdateRow,
  useUpsert,
} from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/tutors")({
  validateSearch: (search: Record<string, unknown>) => ({
    add: search["add"] === true || search["add"] === "true",
  }),
  head: () => ({
    meta: [
      { title: "Tutors & Coaches — ProgressTutors" },
      {
        name: "description",
        content: "Manage tutor and coach records, subjects, levels and pay rates.",
      },
      { property: "og:title", content: "Tutors & Coaches — ProgressTutors" },
      { property: "og:description", content: "Shared tutor and coach records." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TutorsPage,
});

const BLANK = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  subjects: "",
  levels: "",
  hourly_rate: "",
  pay_notes: "",
  status: "active",
  notes: "",
};

function minutes(time: string | null | undefined) {
  if (!time) return 0;
  const [hour, minute] = time.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

function durationHours(start: string | null | undefined, end: string | null | undefined) {
  return Math.max(0, minutes(end) - minutes(start)) / 60;
}

function lessonRunsOn(
  lesson: {
    start_date: string | null;
    end_date: string | null;
    recurrence: string;
    weekday: string | null;
  },
  date: Date,
) {
  const iso = format(date, "yyyy-MM-dd");
  if (lesson.start_date && iso < lesson.start_date) return false;
  if (lesson.end_date && iso > lesson.end_date) return false;
  if (lesson.recurrence === "once") return lesson.start_date === iso;
  return lesson.weekday === format(date, "EEEE");
}

function hoursLabel(value: number) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}h`;
}

function TutorsPage() {
  const { add } = Route.useSearch();
  const tutors = useTable("tutors", "first_name");
  const classes = useTable("classes", "name");
  const sessions = useTable("sessions", "session_date");
  const create = useUpsert("tutors");
  const update = useUpdateRow("tutors");
  const deleteTutor = useDeleteRow("tutors");

  const [q, setQ] = useState("");
  const [view, setView] = useState<"table" | "cards">("table");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TutorRow | null>(null);
  const [tutorPendingDelete, setTutorPendingDelete] = useState<TutorRow | null>(null);
  const [form, setForm] = useState(BLANK);

  useEffect(() => {
    if (!add) return;
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }, [add]);

  const rows = (tutors.data ?? []).filter(
    (t) =>
      q === "" ||
      fullName(t).toLowerCase().includes(q.toLowerCase()) ||
      (t.subjects ?? []).join(" ").toLowerCase().includes(q.toLowerCase()),
  );
  const classList = classes.data ?? [];
  const unassignedClasses = classList.filter((c) => !c.tutor_id && c.active).length;
  const today = new Date();
  const todayKey = format(today, "yyyy-MM-dd");
  const monthStartKey = format(startOfMonth(today), "yyyy-MM-dd");
  const monthDates = eachDayOfInterval({ start: startOfMonth(today), end: today });
  const classById = new Map(classList.map((lesson) => [lesson.id, lesson]));
  const tutorMetrics = new Map(
    (tutors.data ?? []).map((tutor) => {
      const theirClasses = classList.filter((lesson) => lesson.tutor_id === tutor.id);
      const scheduledHours = monthDates.reduce(
        (total, date) =>
          total +
          theirClasses.reduce(
            (dayTotal, lesson) =>
              dayTotal +
              (lesson.active && lessonRunsOn(lesson, date)
                ? durationHours(lesson.start_time, lesson.end_time)
                : 0),
            0,
          ),
        0,
      );
      const completedHours = (sessions.data ?? []).reduce((total, session) => {
        const lesson = session.class_id ? classById.get(session.class_id) : undefined;
        const sessionTutorId = session.tutor_id ?? lesson?.tutor_id;
        if (
          sessionTutorId !== tutor.id ||
          session.session_date < monthStartKey ||
          session.session_date > todayKey ||
          session.status.toLowerCase() === "cancelled"
        ) {
          return total;
        }
        return (
          total +
          durationHours(
            session.start_time ?? lesson?.start_time,
            session.end_time ?? lesson?.end_time,
          )
        );
      }, 0);
      return [
        tutor.id,
        {
          classes: theirClasses,
          scheduledHours,
          completedHours,
          progress: scheduledHours ? Math.min(100, (completedHours / scheduledHours) * 100) : 0,
        },
      ] as const;
    }),
  );

  function openNew() {
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }

  function openEdit(t: TutorRow) {
    setEditing(t);
    setForm({
      first_name: t.first_name,
      last_name: t.last_name ?? "",
      email: t.email ?? "",
      phone: t.phone ?? "",
      subjects: (t.subjects ?? []).join(", "),
      levels: (t.levels ?? []).join(", "),
      hourly_rate: t.hourly_rate === null ? "" : String(t.hourly_rate),
      pay_notes: t.pay_notes ?? "",
      status: t.status,
      notes: t.notes ?? "",
    });
    setOpen(true);
  }

  async function save() {
    const payload = {
      first_name: form.first_name,
      last_name: form.last_name || null,
      email: form.email || null,
      phone: form.phone || null,
      subjects: form.subjects
        ? form.subjects
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      levels: form.levels
        ? form.levels
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
      pay_notes: form.pay_notes || null,
      status: form.status,
      notes: form.notes || null,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, values: payload });
      else await create.mutateAsync(payload);
      toast.success(editing ? "Tutor updated" : "Tutor added");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <Page>
      <PageHeader
        title="Tutors & Coaches"
        subtitle="Shared operational demo · Live data"
        actions={<Button onClick={openNew}>Add Tutor</Button>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Active"
          value={String((tutors.data ?? []).filter((t) => t.status === "active").length)}
          tone="green"
        />
        <StatCard label="All records" value={String((tutors.data ?? []).length)} tone="pink" />
        <StatCard label="Classes" value={String(classList.length)} tone="blue" />
        <StatCard label="Classes without a tutor" value={String(unassignedClasses)} tone="amber" />
      </div>

      <div className="surface flex flex-wrap items-center justify-between gap-3 p-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tutors or subjects"
          className="h-10 max-w-xs rounded-xl"
        />
        <div className="flex rounded-xl border border-border bg-muted p-1" aria-label="Tutor view">
          <Button
            type="button"
            size="sm"
            variant={view === "table" ? "default" : "ghost"}
            onClick={() => setView("table")}
            aria-pressed={view === "table"}
          >
            <List className="h-4 w-4" /> Table
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "cards" ? "default" : "ghost"}
            onClick={() => setView("cards")}
            aria-pressed={view === "cards"}
          >
            <LayoutGrid className="h-4 w-4" /> Cards
          </Button>
        </div>
      </div>

      <Section id="tutors-list" title="Tutor records" subtitle={`${rows.length} shown`}>
        {rows.length === 0 ? (
          <Empty>No tutors or coaches yet. Add the first one to assign them to a class.</Empty>
        ) : view === "table" ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="min-w-56">Tutor</TableHead>
                  <TableHead className="min-w-48">Subjects</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Classes</TableHead>
                  <TableHead className="min-w-52">Hours completed this month</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => {
                  const name = fullName(t);
                  const metrics = tutorMetrics.get(t.id);
                  const completedHours = metrics?.completedHours ?? 0;
                  const scheduledHours = metrics?.scheduledHours ?? 0;
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar initials={initialsOf(name)} tone="pink" />
                          <div className="min-w-0">
                            <Link
                              to="/admin/tutors/$id"
                              params={{ id: t.id }}
                              className="block truncate font-extrabold hover:text-primary"
                            >
                              {name}
                            </Link>
                            <p className="max-w-48 truncate text-xs text-muted-foreground">
                              {t.email ?? "No email"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(t.subjects ?? []).length ? (
                            (t.subjects ?? []).map((subject) => (
                              <Pill key={subject} tone="blue">
                                {subject}
                              </Pill>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">Not set</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Pill tone={t.status === "active" ? "green" : "neutral"}>{t.status}</Pill>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {metrics?.classes.length ?? 0}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="font-bold">{hoursLabel(completedHours)}</span>
                            <span className="text-muted-foreground">
                              of {hoursLabel(scheduledHours)} due
                            </span>
                          </div>
                          <Progress value={metrics?.progress ?? 0} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {t.hourly_rate === null ? "Not set" : `${money(num(t.hourly_rate))}/hr`}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(t)}
                            aria-label={`Edit ${name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setTutorPendingDelete(t)}
                            aria-label={`Delete ${name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((t) => {
              const name = fullName(t);
              const metrics = tutorMetrics.get(t.id);
              const theirClasses = metrics?.classes ?? [];
              return (
                <article key={t.id} className="surface p-5">
                  <div className="flex items-center gap-3">
                    <Avatar initials={initialsOf(name)} tone="pink" />
                    <div className="min-w-0">
                      <Link
                        to="/admin/tutors/$id"
                        params={{ id: t.id }}
                        className="block truncate font-extrabold hover:text-primary"
                      >
                        {name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {t.email ?? "No email"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(t.subjects ?? []).map((s) => (
                      <Pill key={s} tone="blue">
                        {s}
                      </Pill>
                    ))}
                    <Pill tone={t.status === "active" ? "green" : "neutral"}>{t.status}</Pill>
                  </div>
                  <p className="mt-3 text-sm">
                    Rate:{" "}
                    <span className="font-bold">
                      {t.hourly_rate === null ? "Not set" : `${money(num(t.hourly_rate))}/hr`}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {theirClasses.length === 0
                      ? "No classes assigned"
                      : `${theirClasses.length} class(es) assigned`}
                  </p>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold">Hours completed this month</span>
                      <span className="text-muted-foreground">
                        {hoursLabel(metrics?.completedHours ?? 0)} /{" "}
                        {hoursLabel(metrics?.scheduledHours ?? 0)}
                      </span>
                    </div>
                    <Progress value={metrics?.progress ?? 0} className="h-2" />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setTutorPendingDelete(t)}
                    >
                      Delete
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Section>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${fullName(editing)}` : "Add tutor or coach"}
        onSubmit={save}
        busy={create.isPending || update.isPending}
        dangerLabel={editing ? "Delete" : undefined}
        dangerBusy={deleteTutor.isPending}
        onDanger={editing ? () => setTutorPendingDelete(editing) : undefined}
      >
        <TextField
          label="First name"
          value={form.first_name}
          onChange={(v) => setForm({ ...form, first_name: v })}
          required
        />
        <TextField
          label="Last name"
          value={form.last_name}
          onChange={(v) => setForm({ ...form, last_name: v })}
        />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
        />
        <TextField
          label="Phone"
          value={form.phone}
          onChange={(v) => setForm({ ...form, phone: v })}
        />
        <TextField
          label="Subjects / activities (comma separated)"
          value={form.subjects}
          onChange={(v) => setForm({ ...form, subjects: v })}
          full
        />
        <TextField
          label="Levels (comma separated)"
          value={form.levels}
          onChange={(v) => setForm({ ...form, levels: v })}
          full
        />
        <TextField
          label="Hourly rate (£)"
          type="number"
          value={form.hourly_rate}
          onChange={(v) => setForm({ ...form, hourly_rate: v })}
        />
        <SelectField
          label="Status"
          value={form.status}
          onChange={(v) => setForm({ ...form, status: v })}
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
        <TextAreaField
          label="Pay notes"
          value={form.pay_notes}
          onChange={(v) => setForm({ ...form, pay_notes: v })}
        />
        <TextAreaField
          label="Notes"
          value={form.notes}
          onChange={(v) => setForm({ ...form, notes: v })}
        />
      </FormDialog>
      <ConfirmDeleteDialog
        open={Boolean(tutorPendingDelete)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleteTutor.isPending) setTutorPendingDelete(null);
        }}
        title="Are you sure you want to delete this tutor?"
        description="This cannot be undone. Their lessons will remain but become unassigned, and linked tutor payment and assignment records will be removed."
        confirmLabel="Delete tutor"
        busy={deleteTutor.isPending}
        onConfirm={async () => {
          if (!tutorPendingDelete) return;
          try {
            await deleteTutor.mutateAsync(tutorPendingDelete.id);
            toast.success("Tutor deleted");
            setTutorPendingDelete(null);
            if (editing?.id === tutorPendingDelete.id) {
              setEditing(null);
              setOpen(false);
            }
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not delete the tutor");
          }
        }}
      />
    </Page>
  );
}
