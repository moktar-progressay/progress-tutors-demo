import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { FormDialog, SelectField, TextAreaField, TextField } from "@/components/form-kit";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useTutorScope } from "@/lib/auth-scope";
import { fullName, useInvalidate, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/tutor/students/")({
  head: () => ({
    meta: [{ title: "My Students - ProgressTutors" }, { name: "robots", content: "noindex" }],
  }),
  component: TutorStudents,
});

function TutorStudents() {
  const scope = useTutorScope();
  const classes = useTable("classes");
  const enrolments = useTable("class_enrolments");
  const students = useTable("students", "first_name");
  const invalidate = useInvalidate();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    class_id: "",
    first_name: "",
    last_name: "",
    year_group: "",
    school: "",
    date_of_birth: "",
    notes: "",
  });
  const classIds = new Set(
    (classes.data ?? []).filter((item) => item.tutor_id === scope.tutorId).map((item) => item.id),
  );
  const relevantEnrolments = (enrolments.data ?? []).filter(
    (item) => classIds.has(item.class_id) && item.status === "active",
  );
  const studentIds = new Set(relevantEnrolments.map((item) => item.student_id));
  const rows = (students.data ?? []).filter((student) => {
    const query = search.trim().toLowerCase();
    return (
      studentIds.has(student.id) &&
      (!query ||
        [fullName(student), student.school, student.year_group]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query))
    );
  });
  const myClasses = (classes.data ?? []).filter(
    (item) => item.tutor_id === scope.tutorId && item.active,
  );

  async function addStudent() {
    if (!form.class_id || !form.first_name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("add_student_to_tutor_class", {
        p_class_id: form.class_id,
        p_first_name: form.first_name.trim(),
        p_last_name: form.last_name.trim() || null,
        p_year_group: form.year_group.trim() || null,
        p_school: form.school.trim() || null,
        p_date_of_birth: form.date_of_birth || null,
        p_notes: form.notes.trim() || null,
      });
      if (error) throw error;
      await invalidate("students", "class_enrolments");
      toast.success("Student added to your class");
      setAddOpen(false);
      setForm({
        class_id: "",
        first_name: "",
        last_name: "",
        year_group: "",
        school: "",
        date_of_birth: "",
        notes: "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the student");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page className="space-y-5">
      <PageHeader
        title="My students"
        subtitle="Students enrolled in your assigned classes"
        actions={
          <Button onClick={() => setAddOpen(true)} disabled={myClasses.length === 0}>
            <Plus className="h-4 w-4" /> Add student
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Students" value={String(studentIds.size)} tone="pink" />
        <StatCard label="Classes" value={String(classIds.size)} tone="blue" />
      </div>
      <Section id="tutor-student-list" title="Student records">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, school or year"
            className="h-11 rounded-xl pl-10"
          />
        </div>
        {rows.length === 0 ? (
          <Empty>No students match your search.</Empty>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {rows.map((student) => {
              const count = relevantEnrolments.filter(
                (item) => item.student_id === student.id,
              ).length;
              return (
                <Link
                  key={student.id}
                  to="/tutor/students/$id"
                  params={{ id: student.id }}
                  className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:border-primary/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{fullName(student)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[student.year_group, student.school].filter(Boolean).join(" · ") ||
                        "Details to confirm"}
                    </span>
                  </span>
                  <Pill tone="blue">
                    {count} class{count === 1 ? "" : "es"}
                  </Pill>
                </Link>
              );
            })}
          </div>
        )}
      </Section>

      <FormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add student"
        description="Create the student and enrol them in one of your classes."
        submitLabel="Add student"
        busy={saving}
        onSubmit={addStudent}
      >
        <SelectField
          label="Class"
          value={form.class_id}
          onChange={(class_id) => setForm({ ...form, class_id })}
          options={[
            { value: "", label: "Choose class" },
            ...myClasses.map((item) => ({ value: item.id, label: item.name })),
          ]}
        />
        <TextField
          required
          label="First name"
          value={form.first_name}
          onChange={(first_name) => setForm({ ...form, first_name })}
        />
        <TextField
          label="Last name"
          value={form.last_name}
          onChange={(last_name) => setForm({ ...form, last_name })}
        />
        <TextField
          label="Date of birth"
          type="date"
          value={form.date_of_birth}
          onChange={(date_of_birth) => setForm({ ...form, date_of_birth })}
        />
        <TextField
          label="Year group"
          value={form.year_group}
          onChange={(year_group) => setForm({ ...form, year_group })}
        />
        <TextField
          label="School"
          value={form.school}
          onChange={(school) => setForm({ ...form, school })}
        />
        <TextAreaField
          label="Notes"
          value={form.notes}
          onChange={(notes) => setForm({ ...form, notes })}
        />
      </FormDialog>
    </Page>
  );
}
