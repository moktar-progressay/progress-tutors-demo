import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Avatar, Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { FormDialog, SelectField, TextAreaField, TextField } from "@/components/form-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fullName, initialsOf, money, num, useTable, useUpdateRow, useUpsert, type TutorRow } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/tutors")({
  head: () => ({
    meta: [
      { title: "Tutors & Coaches — ProgressTutors" },
      { name: "description", content: "Manage tutor and coach records, subjects, levels and pay rates." },
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

function TutorsPage() {
  const tutors = useTable("tutors", "first_name");
  const classes = useTable("classes", "name");
  const create = useUpsert("tutors");
  const update = useUpdateRow("tutors");

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TutorRow | null>(null);
  const [form, setForm] = useState(BLANK);

  const rows = (tutors.data ?? []).filter(
    (t) =>
      q === "" ||
      fullName(t).toLowerCase().includes(q.toLowerCase()) ||
      (t.subjects ?? []).join(" ").toLowerCase().includes(q.toLowerCase()),
  );
  const classList = classes.data ?? [];
  const unassignedClasses = classList.filter((c) => !c.tutor_id && c.active).length;

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
      subjects: form.subjects ? form.subjects.split(",").map((s) => s.trim()).filter(Boolean) : [],
      levels: form.levels ? form.levels.split(",").map((s) => s.trim()).filter(Boolean) : [],
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
        <StatCard label="Active" value={String((tutors.data ?? []).filter((t) => t.status === "active").length)} tone="green" />
        <StatCard label="All records" value={String((tutors.data ?? []).length)} tone="pink" />
        <StatCard label="Classes" value={String(classList.length)} tone="blue" />
        <StatCard label="Classes without a tutor" value={String(unassignedClasses)} tone="amber" />
      </div>

      <div className="surface p-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tutors or subjects"
          className="h-10 max-w-xs rounded-xl"
        />
      </div>

      <Section id="tutors-list" title="Tutor records" subtitle={`${rows.length} shown`}>
        {rows.length === 0 ? (
          <Empty>No tutors or coaches yet. Add the first one to assign them to a class.</Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((t) => {
              const name = fullName(t);
              const theirClasses = classList.filter((c) => c.tutor_id === t.id);
              return (
                <article key={t.id} className="surface p-5">
                  <div className="flex items-center gap-3">
                    <Avatar initials={initialsOf(name)} tone="pink" />
                    <div className="min-w-0">
                      <p className="truncate font-extrabold">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.email ?? "No email"}</p>
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
                    Rate: <span className="font-bold">{t.hourly_rate === null ? "Not set" : `${money(num(t.hourly_rate))}/hr`}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {theirClasses.length === 0 ? "No classes assigned" : `${theirClasses.length} class(es) assigned`}
                  </p>
                  <Button size="sm" variant="ghost" className="mt-3" onClick={() => openEdit(t)}>
                    Edit
                  </Button>
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
      >
        <TextField label="First name" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} required />
        <TextField label="Last name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
        <TextField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <TextField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <TextField
          label="Subjects / activities (comma separated)"
          value={form.subjects}
          onChange={(v) => setForm({ ...form, subjects: v })}
          full
        />
        <TextField label="Levels (comma separated)" value={form.levels} onChange={(v) => setForm({ ...form, levels: v })} full />
        <TextField label="Hourly rate (£)" type="number" value={form.hourly_rate} onChange={(v) => setForm({ ...form, hourly_rate: v })} />
        <SelectField
          label="Status"
          value={form.status}
          onChange={(v) => setForm({ ...form, status: v })}
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
        <TextAreaField label="Pay notes" value={form.pay_notes} onChange={(v) => setForm({ ...form, pay_notes: v })} />
        <TextAreaField label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
      </FormDialog>
    </Page>
  );
}
