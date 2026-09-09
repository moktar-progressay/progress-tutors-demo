import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { FormDialog, SelectField, TextAreaField, TextField } from "@/components/form-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fullName, money, num, useTable, useUpdateRow, useUpsert, type ParentRow } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/parents")({
  head: () => ({
    meta: [
      { title: "Parents & Guardians — ProgressTutors" },
      { name: "description", content: "Manage parent and guardian records, their children and billing status." },
      { property: "og:title", content: "Parents & Guardians — ProgressTutors" },
      { property: "og:description", content: "Shared parent and guardian records." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ParentsPage,
});

const BLANK = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  billing_status: "active",
  status: "active",
  notes: "",
};

function ParentsPage() {
  const parents = useTable("parents", "first_name");
  const students = useTable("students", "first_name");
  const links = useTable("parent_students");
  const payments = useTable("client_payments");
  const create = useUpsert("parents");
  const update = useUpdateRow("parents");

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ParentRow | null>(null);
  const [form, setForm] = useState(BLANK);

  const rows = (parents.data ?? []).filter(
    (p) =>
      q === "" ||
      fullName(p).toLowerCase().includes(q.toLowerCase()) ||
      (p.email ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  const collected = (payments.data ?? [])
    .filter((p) => p.status === "paid")
    .reduce((a, p) => a + num(p.amount), 0);

  function openNew() {
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }

  function openEdit(p: ParentRow) {
    setEditing(p);
    setForm({
      first_name: p.first_name,
      last_name: p.last_name ?? "",
      email: p.email ?? "",
      phone: p.phone ?? "",
      billing_status: p.billing_status,
      status: p.status,
      notes: p.notes ?? "",
    });
    setOpen(true);
  }

  async function save() {
    const payload = {
      ...form,
      last_name: form.last_name || null,
      email: form.email || null,
      phone: form.phone || null,
      notes: form.notes || null,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, values: payload });
      else await create.mutateAsync(payload);
      toast.success(editing ? "Parent updated" : "Parent added");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <Page>
      <PageHeader
        title="Parents & Guardians"
        subtitle="Shared operational demo · Live data"
        actions={<Button onClick={openNew}>Add Parent</Button>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Parent records" value={String((parents.data ?? []).length)} tone="pink" />
        <StatCard label="Linked children" value={String((links.data ?? []).length)} tone="blue" />
        <StatCard label="Payments collected" value={money(collected)} tone="green" />
      </div>

      <div className="surface p-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search parents"
          className="h-10 max-w-xs rounded-xl"
        />
      </div>

      <Section id="parents-table" title="Parent records" subtitle={`${rows.length} shown`}>
        {rows.length === 0 ? (
          <Empty>No parent or guardian records yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  {["Parent", "Contact", "Children", "Billing", ""].map((h) => (
                    <th key={h} className="pb-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const children = (links.data ?? [])
                    .filter((l) => l.parent_id === p.id)
                    .map((l) => (students.data ?? []).find((s) => s.id === l.student_id))
                    .filter(Boolean);
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="py-3 font-semibold">{fullName(p)}</td>
                      <td className="py-3 text-muted-foreground">
                        {p.email ?? "—"}
                        {p.phone ? ` · ${p.phone}` : ""}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {children.length === 0 ? (
                            <span className="text-muted-foreground">None linked</span>
                          ) : (
                            children.map((c) => (
                              <Pill key={c!.id} tone="purple">
                                {fullName(c!)}
                              </Pill>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <Pill tone={p.billing_status === "active" ? "green" : "amber"}>{p.billing_status}</Pill>
                      </td>
                      <td className="py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? `Edit ${fullName(editing)}` : "Add parent or guardian"}
        onSubmit={save}
        busy={create.isPending || update.isPending}
      >
        <TextField label="First name" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} required />
        <TextField label="Last name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
        <TextField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <TextField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <SelectField
          label="Billing status"
          value={form.billing_status}
          onChange={(v) => setForm({ ...form, billing_status: v })}
          options={[
            { value: "active", label: "Active" },
            { value: "overdue", label: "Overdue" },
            { value: "paused", label: "Paused" },
          ]}
        />
        <SelectField
          label="Status"
          value={form.status}
          onChange={(v) => setForm({ ...form, status: v })}
          options={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ]}
        />
        <TextAreaField label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
      </FormDialog>
    </Page>
  );
}
