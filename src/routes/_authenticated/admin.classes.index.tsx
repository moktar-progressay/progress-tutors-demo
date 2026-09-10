import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { FormDialog, SelectField, TextAreaField, TextField } from "@/components/form-kit";
import { Button } from "@/components/ui/button";
import { capacityTone, fullName, hhmm, useTable, useUpsert, WEEKDAYS } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/classes/")({
  head: () => ({
    meta: [
      { title: "Classes & Groups — ProgressTutors" },
      { name: "description", content: "Create classes and groups inside each weekly schedule block and assign tutors." },
      { property: "og:title", content: "Classes & Groups — ProgressTutors" },
      { property: "og:description", content: "Shared class and group records." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClassesPage,
});

const BLANK = {
  name: "",
  programme_id: "",
  site_id: "",
  schedule_block_id: "",
  tutor_id: "",
  subject: "",
  level: "",
  age_group: "",
  weekday: "Saturday",
  start_time: "10:00",
  end_time: "12:00",
  capacity: "12",
  room: "",
  delivery_mode: "in_person",
  goprogress_course_url: "",
  session_rate: "",
  price_per_session: "",
  notes: "",
};

function ClassesPage() {
  const classes = useTable("classes", "name");
  const sites = useTable("sites", "name");
  const programmes = useTable("programmes", "name");
  const blocks = useTable("recurring_schedule_blocks", "weekday");
  const tutors = useTable("tutors", "first_name");
  const enrolments = useTable("class_enrolments");
  const create = useUpsert("classes");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);

  const rows = classes.data ?? [];
  const enrolList = (enrolments.data ?? []).filter((e) => e.status === "active");
  const withoutTutor = rows.filter((c) => !c.tutor_id).length;

  function openNew(blockId?: string) {
    const block = (blocks.data ?? []).find((b) => b.id === blockId);
    setForm({
      ...BLANK,
      schedule_block_id: block?.id ?? "",
      programme_id: block?.programme_id ?? "",
      site_id: block?.site_id ?? "",
      weekday: block?.weekday ?? "Saturday",
      start_time: hhmm(block?.start_time) === "—" ? "10:00" : hhmm(block?.start_time),
      end_time: hhmm(block?.end_time) === "—" ? "12:00" : hhmm(block?.end_time),
    });
    setOpen(true);
  }

  async function save() {
    try {
      await create.mutateAsync({
        name: form.name,
        programme_id: form.programme_id || null,
        site_id: form.site_id || null,
        schedule_block_id: form.schedule_block_id || null,
        tutor_id: form.tutor_id || null,
        subject: form.subject || null,
        level: form.level || null,
        age_group: form.age_group || null,
        weekday: form.weekday,
        start_time: form.start_time,
        end_time: form.end_time,
        capacity: Number(form.capacity) || 0,
        room: form.room || null,
        delivery_mode: form.delivery_mode,
        goprogress_course_url: form.goprogress_course_url || null,
        session_rate: form.session_rate ? Number(form.session_rate) : null,
        price_per_session: form.price_per_session ? Number(form.price_per_session) : null,
        notes: form.notes || null,
      });
      toast.success("Class created");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the class");
    }
  }

  return (
    <Page>
      <PageHeader
        title="Classes & Groups"
        subtitle="Shared operational demo · Live data"
        actions={<Button onClick={() => openNew()}>Add Class</Button>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Classes" value={String(rows.length)} tone="pink" />
        <StatCard label="Enrolled places" value={String(enrolList.length)} tone="blue" />
        <StatCard label="Without a tutor" value={String(withoutTutor)} tone="amber" />
        <StatCard label="Schedule blocks" value={String((blocks.data ?? []).length)} tone="purple" />
      </div>

      {(blocks.data ?? []).map((b) => {
        const site = (sites.data ?? []).find((s) => s.id === b.site_id);
        const programme = (programmes.data ?? []).find((p) => p.id === b.programme_id);
        const inBlock = rows.filter((c) => c.schedule_block_id === b.id);
        return (
          <Section
            key={b.id}
            id={`block-${b.id}`}
            title={b.title}
            subtitle={`${b.weekday} ${hhmm(b.start_time)}–${hhmm(b.end_time)} · ${site?.name ?? "Venue to confirm"} · ${
              programme?.name ?? "Programme"
            }${b.status === "coming_soon" ? " · Coming soon" : b.start_date ? ` · from ${b.start_date}` : ""}`}
            action={
              <Button size="sm" variant="secondary" onClick={() => openNew(b.id)}>
                Add class here
              </Button>
            }
          >
            {inBlock.length === 0 ? (
              <Empty>No classes created in this block yet — 0 enrolled, tutor not assigned.</Empty>
            ) : (
              <ul className="space-y-2">
                {inBlock.map((c) => {
                  const count = enrolList.filter((e) => e.class_id === c.id).length;
                  const tutor = (tutors.data ?? []).find((t) => t.id === c.tutor_id);
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border px-4 py-3 transition-colors hover:bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <Link to="/admin/classes/$id" params={{ id: c.id }} className="text-sm font-bold hover:text-primary">
                          {c.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {hhmm(c.start_time)}–{hhmm(c.end_time)} · {c.room ?? "Room to confirm"} ·{" "}
                          {tutor ? fullName(tutor) : "Tutor not assigned"}
                        </p>
                      </div>
                      <Pill tone={capacityTone(count, c.capacity)}>
                        {count}/{c.capacity} enrolled
                      </Pill>
                      {!c.tutor_id ? <Pill tone="amber">Tutor not assigned</Pill> : null}
                      <Link
                        to="/admin/classes/$id"
                        params={{ id: c.id }}
                        className="rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        View class
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        );
      })}

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        wide
        title="Add class or group"
        onSubmit={save}
        busy={create.isPending}
      >
        <TextField label="Class name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required full />
        <SelectField
          label="Programme"
          value={form.programme_id}
          onChange={(v) => setForm({ ...form, programme_id: v })}
          options={[{ value: "", label: "None" }, ...(programmes.data ?? []).map((p) => ({ value: p.id, label: p.name }))]}
        />
        <SelectField
          label="Site"
          value={form.site_id}
          onChange={(v) => setForm({ ...form, site_id: v })}
          options={[{ value: "", label: "None" }, ...(sites.data ?? []).map((s) => ({ value: s.id, label: s.name }))]}
        />
        <SelectField
          label="Schedule block"
          value={form.schedule_block_id}
          onChange={(v) => setForm({ ...form, schedule_block_id: v })}
          options={[
            { value: "", label: "Not in a block" },
            ...(blocks.data ?? []).map((b) => ({ value: b.id, label: b.title })),
          ]}
        />
        <SelectField
          label="Tutor / coach"
          value={form.tutor_id}
          onChange={(v) => setForm({ ...form, tutor_id: v })}
          options={[
            { value: "", label: "Not assigned" },
            ...(tutors.data ?? []).map((t) => ({ value: t.id, label: fullName(t) })),
          ]}
        />
        <TextField label="Subject / activity" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} />
        <TextField label="Level" value={form.level} onChange={(v) => setForm({ ...form, level: v })} />
        <TextField label="Age group" value={form.age_group} onChange={(v) => setForm({ ...form, age_group: v })} />
        <SelectField
          label="Day"
          value={form.weekday}
          onChange={(v) => setForm({ ...form, weekday: v })}
          options={WEEKDAYS.map((d) => ({ value: d, label: d }))}
        />
        <TextField label="Start time" type="time" value={form.start_time} onChange={(v) => setForm({ ...form, start_time: v })} />
        <TextField label="End time" type="time" value={form.end_time} onChange={(v) => setForm({ ...form, end_time: v })} />
        <TextField label="Capacity" type="number" value={form.capacity} onChange={(v) => setForm({ ...form, capacity: v })} />
        <TextField label="Room / pitch" value={form.room} onChange={(v) => setForm({ ...form, room: v })} />
        <SelectField
          label="Format"
          value={form.delivery_mode}
          onChange={(v) => setForm({ ...form, delivery_mode: v })}
          options={[
            { value: "in_person", label: "In person" },
            { value: "online", label: "Online" },
            { value: "hybrid", label: "Hybrid" },
          ]}
        />
        <TextField
          label="GoProgress course link"
          value={form.goprogress_course_url}
          onChange={(v) => setForm({ ...form, goprogress_course_url: v })}
        />
        <TextField
          label="Agreed tutor amount per session (£)"
          type="number"
          value={form.session_rate}
          onChange={(v) => setForm({ ...form, session_rate: v })}
        />
        <TextField
          label="Price per session (£)"
          type="number"
          value={form.price_per_session}
          onChange={(v) => setForm({ ...form, price_per_session: v })}
        />
        <TextAreaField label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
      </FormDialog>
    </Page>
  );
}
