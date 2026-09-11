import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Avatar, Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import {
  CheckField,
  ConfirmDeleteDialog,
  FormDialog,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/form-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fullName,
  initialsOf,
  useTable,
  useDeleteRow,
  useUpdateRow,
  useUpsert,
  type Insert,
  type StudentRow,
} from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/students/")({
  head: () => ({
    meta: [
      { title: "Students — ProgressTutors" },
      {
        name: "description",
        content: "Add, edit, archive and search real student records in the shared demo.",
      },
      { property: "og:title", content: "Students — ProgressTutors" },
      { property: "og:description", content: "Shared student roster with search and filters." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentsPage,
});

const BLANK = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  year_group: "",
  school: "",
  email: "",
  phone: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  send_flag: false,
  ehcp_flag: false,
  medical_notes: "",
  allergy_notes: "",
  status: "active",
  notes: "",
  parent_id: "",
};

type FormState = typeof BLANK;

function StudentsPage() {
  const students = useTable("students", "first_name");
  const parents = useTable("parents", "first_name");
  const classes = useTable("classes", "name");
  const enrolments = useTable("class_enrolments");
  const sites = useTable("sites", "name");
  const programmes = useTable("programmes", "name");
  const links = useTable("parent_students");

  const createStudent = useUpsert("students");
  const updateStudent = useUpdateRow("students");
  const deleteStudent = useDeleteRow("students");
  const linkParent = useUpsert("parent_students", ["students"]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [siteId, setSiteId] = useState("all");
  const [programmeId, setProgrammeId] = useState("all");
  const [classId, setClassId] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [studentPendingDelete, setStudentPendingDelete] = useState<StudentRow | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);

  const rows = students.data ?? [];
  const classList = classes.data ?? [];
  const enrolList = enrolments.data ?? [];

  const classIdsForFilters = useMemo(() => {
    return classList
      .filter(
        (c) =>
          (siteId === "all" || c.site_id === siteId) &&
          (programmeId === "all" || c.programme_id === programmeId) &&
          (classId === "all" || c.id === classId),
      )
      .map((c) => c.id);
  }, [classList, siteId, programmeId, classId]);

  const filtered = rows.filter((s) => {
    const name = fullName(s).toLowerCase();
    const matchesQ =
      q === "" ||
      name.includes(q.toLowerCase()) ||
      (s.email ?? "").toLowerCase().includes(q.toLowerCase());
    const matchesStatus = status === "all" || s.status === status;
    const scoped = siteId === "all" && programmeId === "all" && classId === "all";
    const matchesClass =
      scoped ||
      enrolList.some(
        (e) =>
          e.student_id === s.id && classIdsForFilters.includes(e.class_id) && e.status === "active",
      );
    return matchesQ && matchesStatus && matchesClass;
  });

  const active = rows.filter((s) => s.status === "active").length;
  const archived = rows.filter((s) => s.status === "archived").length;
  const enrolled = new Set(enrolList.filter((e) => e.status === "active").map((e) => e.student_id));
  const unassigned = rows.filter((s) => s.status === "active" && !enrolled.has(s.id)).length;

  function openNew() {
    setEditing(null);
    setForm(BLANK);
    setOpen(true);
  }

  function openEdit(s: StudentRow) {
    const link = (links.data ?? []).find((l) => l.student_id === s.id);
    setEditing(s);
    setForm({
      first_name: s.first_name,
      last_name: s.last_name ?? "",
      date_of_birth: s.date_of_birth ?? "",
      year_group: s.year_group ?? "",
      school: s.school ?? "",
      email: s.email ?? "",
      phone: s.phone ?? "",
      emergency_contact_name: s.emergency_contact_name ?? "",
      emergency_contact_phone: s.emergency_contact_phone ?? "",
      send_flag: s.send_flag,
      ehcp_flag: s.ehcp_flag,
      medical_notes: s.medical_notes ?? "",
      allergy_notes: s.allergy_notes ?? "",
      status: s.status,
      notes: s.notes ?? "",
      parent_id: link?.parent_id ?? "",
    });
    setOpen(true);
  }

  async function save() {
    const { parent_id, ...rest } = form;
    const payload: Insert<"students"> = {
      ...rest,
      last_name: rest.last_name || null,
      date_of_birth: rest.date_of_birth || null,
      year_group: rest.year_group || null,
      school: rest.school || null,
      email: rest.email || null,
      phone: rest.phone || null,
      emergency_contact_name: rest.emergency_contact_name || null,
      emergency_contact_phone: rest.emergency_contact_phone || null,
      medical_notes: rest.medical_notes || null,
      allergy_notes: rest.allergy_notes || null,
      notes: rest.notes || null,
    };
    try {
      if (editing) {
        await updateStudent.mutateAsync({ id: editing.id, values: payload });
        if (parent_id) {
          await linkParent.mutateAsync({ parent_id, student_id: editing.id });
        }
        toast.success("Student updated");
      } else {
        const created = await createStudent.mutateAsync(payload);
        const newId = created[0]?.id;
        if (parent_id && newId) await linkParent.mutateAsync({ parent_id, student_id: newId });
        toast.success("Student added to the shared database");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the student");
    }
  }

  async function archive(s: StudentRow) {
    await updateStudent.mutateAsync({
      id: s.id,
      values: { status: s.status === "archived" ? "active" : "archived" },
    });
    toast.success(s.status === "archived" ? "Student restored" : "Student archived");
  }

  return (
    <Page>
      <PageHeader
        title="Students"
        subtitle="Shared operational demo · Live data"
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link to="/admin/students/import">Import CSV</Link>
            </Button>
            <Button onClick={openNew}>Add Student</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active" value={String(active)} tone="green" />
        <StatCard label="Archived" value={String(archived)} tone="neutral" />
        <StatCard label="Not in a class" value={String(unassigned)} tone="amber" />
        <StatCard label="Total records" value={String(rows.length)} tone="pink" />
      </div>

      <div className="surface flex flex-wrap items-end gap-3 p-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email"
          className="h-10 max-w-xs rounded-xl"
        />
        <SelectField
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "active", label: "Active" },
            { value: "trial", label: "Trial" },
            { value: "paused", label: "Paused" },
            { value: "archived", label: "Archived" },
            { value: "all", label: "All statuses" },
          ]}
        />
        <SelectField
          label="Site"
          value={siteId}
          onChange={setSiteId}
          options={[
            { value: "all", label: "All sites" },
            ...(sites.data ?? []).map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <SelectField
          label="Programme"
          value={programmeId}
          onChange={setProgrammeId}
          options={[
            { value: "all", label: "All programmes" },
            ...(programmes.data ?? []).map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
        <SelectField
          label="Class"
          value={classId}
          onChange={setClassId}
          options={[
            { value: "all", label: "All classes" },
            ...classList.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </div>

      <Section id="students-table" title="Student roster" subtitle={`${filtered.length} shown`}>
        {students.isLoading ? (
          <Empty>Loading students…</Empty>
        ) : filtered.length === 0 ? (
          <Empty>No students yet. Add one, or import your existing CSV.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  {["Student", "Year", "Parent / guardian", "Classes", "Status", ""].map((h) => (
                    <th key={h} className="pb-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const name = fullName(s);
                  const link = (links.data ?? []).find((l) => l.student_id === s.id);
                  const parent = (parents.data ?? []).find((p) => p.id === link?.parent_id);
                  const myClasses = enrolList
                    .filter((e) => e.student_id === s.id && e.status === "active")
                    .map((e) => classList.find((c) => c.id === e.class_id))
                    .filter(Boolean);
                  return (
                    <tr key={s.id} className="border-t border-border">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Avatar initials={initialsOf(name)} size="sm" tone="purple" />
                          <Link
                            to="/admin/students/$id"
                            params={{ id: s.id }}
                            className="font-semibold hover:text-primary"
                          >
                            {name}
                          </Link>
                        </div>
                      </td>
                      <td className="py-3">{s.year_group ?? "—"}</td>
                      <td className="py-3">{parent ? fullName(parent) : "—"}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {myClasses.length === 0 ? (
                            <Pill tone="amber">Unassigned</Pill>
                          ) : (
                            myClasses.map((c) => (
                              <Pill key={c!.id} tone="blue">
                                {c!.name}
                              </Pill>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 capitalize">{s.status}</td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => archive(s)}>
                          {s.status === "archived" ? "Restore" : "Archive"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setStudentPendingDelete(s)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Medical, allergy and emergency details are kept on the student's own page, not on this
          list.
        </p>
      </Section>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        wide
        title={editing ? `Edit ${fullName(editing)}` : "Add student"}
        description="Only first name is required. Sensitive details stay on the student record."
        onSubmit={save}
        busy={createStudent.isPending || updateStudent.isPending}
        dangerLabel={editing ? "Delete" : undefined}
        dangerBusy={deleteStudent.isPending}
        onDanger={editing ? () => setStudentPendingDelete(editing) : undefined}
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
          label="Date of birth"
          type="date"
          value={form.date_of_birth}
          onChange={(v) => setForm({ ...form, date_of_birth: v })}
        />
        <TextField
          label="Year group"
          value={form.year_group}
          onChange={(v) => setForm({ ...form, year_group: v })}
        />
        <TextField
          label="School / college"
          value={form.school}
          onChange={(v) => setForm({ ...form, school: v })}
        />
        <SelectField
          label="Parent / guardian"
          value={form.parent_id}
          onChange={(v) => setForm({ ...form, parent_id: v })}
          options={[
            { value: "", label: "Not linked" },
            ...(parents.data ?? []).map((p) => ({ value: p.id, label: fullName(p) })),
          ]}
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
          label="Emergency contact name"
          value={form.emergency_contact_name}
          onChange={(v) => setForm({ ...form, emergency_contact_name: v })}
        />
        <TextField
          label="Emergency contact number"
          value={form.emergency_contact_phone}
          onChange={(v) => setForm({ ...form, emergency_contact_phone: v })}
        />
        <SelectField
          label="Status"
          value={form.status}
          onChange={(v) => setForm({ ...form, status: v })}
          options={[
            { value: "active", label: "Active" },
            { value: "trial", label: "Trial" },
            { value: "paused", label: "Paused" },
            { value: "archived", label: "Archived" },
          ]}
        />
        <div className="flex items-center gap-6 sm:col-span-2">
          <CheckField
            label="SEND"
            checked={form.send_flag}
            onChange={(v) => setForm({ ...form, send_flag: v })}
          />
          <CheckField
            label="EHCP"
            checked={form.ehcp_flag}
            onChange={(v) => setForm({ ...form, ehcp_flag: v })}
          />
        </div>
        <TextAreaField
          label="Medical conditions"
          value={form.medical_notes}
          onChange={(v) => setForm({ ...form, medical_notes: v })}
        />
        <TextAreaField
          label="Allergies"
          value={form.allergy_notes}
          onChange={(v) => setForm({ ...form, allergy_notes: v })}
        />
        <TextAreaField
          label="Notes"
          value={form.notes}
          onChange={(v) => setForm({ ...form, notes: v })}
        />
      </FormDialog>
      <ConfirmDeleteDialog
        open={Boolean(studentPendingDelete)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleteStudent.isPending) setStudentPendingDelete(null);
        }}
        title="Are you sure you want to delete this student?"
        description="This cannot be undone. Their enrolments, attendance, progress and other linked student records will also be removed."
        confirmLabel="Delete student"
        busy={deleteStudent.isPending}
        onConfirm={async () => {
          if (!studentPendingDelete) return;
          try {
            await deleteStudent.mutateAsync(studentPendingDelete.id);
            toast.success("Student deleted");
            setStudentPendingDelete(null);
            if (editing?.id === studentPendingDelete.id) {
              setEditing(null);
              setOpen(false);
            }
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not delete the student");
          }
        }}
      />
    </Page>
  );
}
