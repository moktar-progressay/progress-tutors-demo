import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Empty, PageHeader, Pill } from "@/components/kit";
import { FormDialog, SelectField, TextAreaField, TextField } from "@/components/form-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { capacityTone, fullName, hhmm, useTable, useUpsert, WEEKDAYS } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/classes/")({
  head: () => ({
    meta: [
      { title: "Schedule | ProgressTutors" },
      { name: "description", content: "Filter lessons and open one lesson workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SchedulePage,
});

const BLANK = {
  name: "",
  schedule_block_id: "",
  tutor_id: "",
  subject: "",
  level: "",
  age_group: "",
  capacity: "12",
  room: "",
  delivery_mode: "in_person",
  goprogress_course_url: "",
  session_rate: "",
  price_per_session: "",
  notes: "",
};

function SchedulePage() {
  const lessons = useTable("classes", "name");
  const sites = useTable("sites", "name");
  const blocks = useTable("recurring_schedule_blocks", "weekday");
  const tutors = useTable("tutors", "first_name");
  const enrolments = useTable("class_enrolments");
  const createLesson = useUpsert("classes");

  const [search, setSearch] = useState("");
  const [day, setDay] = useState("all");
  const [siteId, setSiteId] = useState("all");
  const [tutorId, setTutorId] = useState("all");
  const [status, setStatus] = useState("active");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);

  const rows = lessons.data ?? [];
  const enrolmentRows = (enrolments.data ?? []).filter((item) => item.status === "active");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows
      .filter((lesson) => {
        const tutor = (tutors.data ?? []).find((item) => item.id === lesson.tutor_id);
        const haystack = [lesson.name, lesson.subject, lesson.level, fullName(tutor)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (
          (!query || haystack.includes(query)) &&
          (day === "all" || lesson.weekday === day) &&
          (siteId === "all" || lesson.site_id === siteId) &&
          (tutorId === "all" ||
            (tutorId === "unassigned" ? !lesson.tutor_id : lesson.tutor_id === tutorId)) &&
          (status === "all" || (status === "active" ? lesson.active : !lesson.active))
        );
      })
      .sort((a, b) => {
        const firstDay = WEEKDAYS.indexOf(a.weekday as (typeof WEEKDAYS)[number]);
        const secondDay = WEEKDAYS.indexOf(b.weekday as (typeof WEEKDAYS)[number]);
        return firstDay - secondDay || (a.start_time ?? "").localeCompare(b.start_time ?? "");
      });
  }, [day, rows, search, siteId, status, tutorId, tutors.data]);

  function openNew() {
    if ((blocks.data ?? []).length === 0) {
      toast.error("Add a weekly schedule on the dashboard first");
      return;
    }
    setForm({ ...BLANK, schedule_block_id: blocks.data?.[0]?.id ?? "" });
    setOpen(true);
  }

  async function save() {
    const block = (blocks.data ?? []).find((item) => item.id === form.schedule_block_id);
    if (!block) {
      toast.error("Choose a weekly schedule");
      return;
    }

    try {
      await createLesson.mutateAsync({
        name: form.name.trim(),
        programme_id: block.programme_id,
        site_id: block.site_id,
        schedule_block_id: block.id,
        tutor_id: form.tutor_id || null,
        subject: form.subject.trim() || null,
        level: form.level.trim() || null,
        age_group: form.age_group.trim() || null,
        weekday: block.weekday,
        start_time: block.start_time,
        end_time: block.end_time,
        capacity: Number(form.capacity) || 0,
        room: form.room.trim() || null,
        delivery_mode: form.delivery_mode,
        goprogress_course_url: form.goprogress_course_url.trim() || null,
        session_rate: form.session_rate ? Number(form.session_rate) : null,
        price_per_session: form.price_per_session ? Number(form.price_per_session) : null,
        notes: form.notes.trim() || null,
      });
      toast.success("Lesson added to your schedule");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the lesson");
    }
  }

  return (
    <Page className="space-y-5">
      <PageHeader
        title="Schedule"
        subtitle="See every lesson, then filter by day, venue or tutor."
        actions={<Button onClick={openNew}>Add lesson</Button>}
      />

      <section className="border-y border-border bg-card px-4 py-4 sm:rounded-2xl sm:border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search lessons, subjects or tutors"
            className="h-11 rounded-xl pl-10"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <SelectField
            label="Day"
            value={day}
            onChange={setDay}
            options={[
              { value: "all", label: "All days" },
              ...WEEKDAYS.map((item) => ({ value: item, label: item })),
            ]}
          />
          <SelectField
            label="Venue"
            value={siteId}
            onChange={setSiteId}
            options={[
              { value: "all", label: "All venues" },
              ...(sites.data ?? []).map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
          <SelectField
            label="Tutor"
            value={tutorId}
            onChange={setTutorId}
            options={[
              { value: "all", label: "All tutors" },
              { value: "unassigned", label: "Unassigned" },
              ...(tutors.data ?? []).map((item) => ({ value: item.id, label: fullName(item) })),
            ]}
          />
          <SelectField
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All lessons" },
              { value: "active", label: "Active" },
              { value: "archived", label: "Archived" },
            ]}
          />
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">Lessons</h2>
        <p className="text-sm text-muted-foreground">{filtered.length} shown</p>
      </div>

      {filtered.length === 0 ? (
        <Empty>No lessons match these filters.</Empty>
      ) : (
        <section className="overflow-hidden border-y border-border bg-card sm:rounded-2xl sm:border">
          <ul className="divide-y divide-border">
            {filtered.map((lesson) => {
              const site = (sites.data ?? []).find((item) => item.id === lesson.site_id);
              const block = (blocks.data ?? []).find(
                (item) => item.id === lesson.schedule_block_id,
              );
              const tutor = (tutors.data ?? []).find((item) => item.id === lesson.tutor_id);
              const enrolled = enrolmentRows.filter((item) => item.class_id === lesson.id).length;
              return (
                <li key={lesson.id}>
                  <Link
                    to="/admin/classes/$id"
                    params={{ id: lesson.id }}
                    className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="text-center">
                      <p className="text-xs font-bold text-primary">
                        {(lesson.weekday ?? "Day").slice(0, 3)}
                      </p>
                      <p className="mt-1 text-sm font-extrabold">{hhmm(lesson.start_time)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold">{lesson.name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {[
                          lesson.subject,
                          site?.name ?? block?.venue_name,
                          tutor ? fullName(tutor) : "Tutor unassigned",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Pill tone={capacityTone(enrolled, lesson.capacity)}>
                          {enrolled}/{lesson.capacity}
                        </Pill>
                        {!lesson.tutor_id ? <Pill tone="amber">Tutor needed</Pill> : null}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        wide
        title="Add lesson"
        description="Choose the weekly schedule first. Its day, time and venue will be used automatically."
        onSubmit={save}
        busy={createLesson.isPending}
        submitLabel="Add lesson"
      >
        <TextField
          label="Lesson name"
          value={form.name}
          onChange={(name) => setForm({ ...form, name })}
          required
          full
        />
        <SelectField
          label="Weekly schedule"
          value={form.schedule_block_id}
          onChange={(schedule_block_id) => setForm({ ...form, schedule_block_id })}
          options={(blocks.data ?? []).map((block) => ({
            value: block.id,
            label: `${block.title} · ${block.weekday} ${hhmm(block.start_time)}`,
          }))}
          full
        />
        <SelectField
          label="Tutor"
          value={form.tutor_id}
          onChange={(tutor_id) => setForm({ ...form, tutor_id })}
          options={[
            { value: "", label: "Not assigned" },
            ...(tutors.data ?? []).map((tutor) => ({ value: tutor.id, label: fullName(tutor) })),
          ]}
        />
        <TextField
          label="Subject or activity"
          value={form.subject}
          onChange={(subject) => setForm({ ...form, subject })}
        />
        <TextField
          label="Level"
          value={form.level}
          onChange={(level) => setForm({ ...form, level })}
        />
        <TextField
          label="Age group"
          value={form.age_group}
          onChange={(age_group) => setForm({ ...form, age_group })}
        />
        <TextField
          label="Capacity"
          type="number"
          value={form.capacity}
          onChange={(capacity) => setForm({ ...form, capacity })}
        />
        <TextField
          label="Room or pitch"
          value={form.room}
          onChange={(room) => setForm({ ...form, room })}
        />
        <SelectField
          label="Format"
          value={form.delivery_mode}
          onChange={(delivery_mode) => setForm({ ...form, delivery_mode })}
          options={[
            { value: "in_person", label: "In person" },
            { value: "online", label: "Online" },
            { value: "hybrid", label: "Hybrid" },
          ]}
        />
        <TextField
          label="Tutor amount per session (£)"
          type="number"
          value={form.session_rate}
          onChange={(session_rate) => setForm({ ...form, session_rate })}
        />
        <TextField
          label="Price per session (£)"
          type="number"
          value={form.price_per_session}
          onChange={(price_per_session) => setForm({ ...form, price_per_session })}
        />
        <TextField
          label="GoProgress course link"
          value={form.goprogress_course_url}
          onChange={(goprogress_course_url) => setForm({ ...form, goprogress_course_url })}
          full
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
