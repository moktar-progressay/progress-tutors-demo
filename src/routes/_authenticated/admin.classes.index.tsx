import { createFileRoute, Link } from "@tanstack/react-router";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  Filter,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Avatar, avatarTone, Empty, PageHeader, Pill } from "@/components/kit";
import {
  ConfirmDeleteDialog,
  FormDialog,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/form-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  capacityTone,
  DEMO_DATE,
  fullName,
  hhmm,
  initialsOf,
  type ClassRow,
  type Site,
  type TutorRow,
  useTable,
  useDeleteRow,
  useUpdateRow,
  useUpsert,
  WEEKDAYS,
} from "@/lib/db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/classes/")({
  validateSearch: (search: Record<string, unknown>) => ({
    add: search["add"] === true || search["add"] === "true",
  }),
  head: () => ({
    meta: [
      { title: "Schedule | ProgressTutors" },
      { name: "description", content: "One calendar for every online and face-to-face lesson." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SchedulePage,
});

type CalendarView = "day" | "week" | "month" | "list";

const BLANK = {
  name: "",
  date: DEMO_DATE,
  start_time: "10:00",
  end_time: "11:00",
  recurrence: "weekly",
  end_date: "",
  delivery_mode: "in_person",
  site_id: "",
  venue_name: "",
  room: "",
  online_url: "",
  tutor_id: "",
  subject: "English",
  level: "",
  capacity: "12",
  session_rate: "",
  price_per_session: "",
  notes: "",
  card_colour: "pink",
};

const CARD_COLOURS = {
  pink: "border-pink-800 bg-pink-600 text-white",
  blue: "border-blue-800 bg-blue-600 text-white",
  green: "border-emerald-800 bg-emerald-600 text-white",
  amber: "border-amber-600 bg-amber-400 text-amber-950",
  violet: "border-violet-800 bg-violet-600 text-white",
  teal: "border-teal-800 bg-teal-600 text-white",
} as const;

type CardColour = keyof typeof CARD_COLOURS;
const CARD_COLOUR_NAMES = Object.keys(CARD_COLOURS) as CardColour[];

const HOURS = Array.from({ length: 13 }, (_, index) => index + 8);
const CALENDAR_HOUR_HEIGHT = 100;
const CALENDAR_MINUTE_SCALE = CALENDAR_HOUR_HEIGHT / 60;
const CALENDAR_HEIGHT = HOURS.length * CALENDAR_HOUR_HEIGHT;

function minutes(time: string | null) {
  if (!time) return 0;
  const [hour, minute] = time.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

function clock(totalMinutes: number) {
  const safe = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const hour = Math.floor(safe / 60);
  const minute = safe % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function subjectLabel(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("en-GB")
    .replace(/(^|[\s/-])\p{L}/gu, (character) => character.toLocaleUpperCase("en-GB"));
}

function stableHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function compareLessons(a: ClassRow, b: ClassRow) {
  return (
    minutes(a.start_time) - minutes(b.start_time) ||
    minutes(a.end_time) - minutes(b.end_time) ||
    a.name.localeCompare(b.name, "en-GB") ||
    a.id.localeCompare(b.id)
  );
}

function lessonRunsOn(lesson: ClassRow, date: Date) {
  const iso = format(date, "yyyy-MM-dd");
  if (lesson.start_date && iso < lesson.start_date) return false;
  if (lesson.end_date && iso > lesson.end_date) return false;
  if (lesson.recurrence === "once") return lesson.start_date === iso;
  return lesson.weekday === format(date, "EEEE");
}

function SchedulePage() {
  const { add } = Route.useSearch();
  const lessons = useTable("classes", "start_time");
  const sites = useTable("sites", "name");
  const tutors = useTable("tutors", "first_name");
  const students = useTable("students", "first_name");
  const enrolments = useTable("class_enrolments");
  const createLesson = useUpsert("classes");
  const updateLesson = useUpdateRow("classes");
  const deleteLesson = useDeleteRow("classes");
  const addEnrolments = useUpsert("class_enrolments", ["classes"]);

  const [view, setView] = useState<CalendarView>("week");
  const [selectedDate, setSelectedDate] = useState(DEMO_DATE);
  const [search, setSearch] = useState("");
  const [tutorId, setTutorId] = useState("all");
  const [siteId, setSiteId] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClassRow | null>(null);
  const [lessonPendingDelete, setLessonPendingDelete] = useState<ClassRow | null>(null);
  const [quickEditing, setQuickEditing] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragRef = useRef<{
    lesson: ClassRow;
    pointerId: number;
    pointerType: string;
    startX: number;
    startY: number;
    armed: boolean;
    moved: boolean;
  } | null>(null);
  const dragHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageOverflowRef = useRef("");
  const suppressClickRef = useRef(false);
  const [showMore, setShowMore] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [form, setForm] = useState(BLANK);

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setView("day");
  }, []);

  useEffect(() => {
    if (!add) return;
    setEditingId(null);
    setSelectedStudentIds([]);
    setStudentSearch("");
    setShowMore(false);
    setForm({ ...BLANK, date: selectedDate });
    setFormOpen(true);
  }, [add, selectedDate]);

  const anchor = parseISO(selectedDate);
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const monthStart = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const monthEnd = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (lessons.data ?? [])
      .filter((lesson) => {
        const tutor = (tutors.data ?? []).find((item) => item.id === lesson.tutor_id);
        const haystack = [lesson.name, lesson.subject, lesson.level, fullName(tutor)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (
          lesson.active &&
          (!query || haystack.includes(query)) &&
          (tutorId === "all" ||
            (tutorId === "unassigned" ? !lesson.tutor_id : lesson.tutor_id === tutorId)) &&
          (siteId === "all" || lesson.site_id === siteId) &&
          (formatFilter === "all" || lesson.delivery_mode === formatFilter) &&
          (subjectFilter === "all" || subjectLabel(lesson.subject) === subjectFilter)
        );
      })
      .sort(compareLessons);
  }, [formatFilter, lessons.data, search, siteId, subjectFilter, tutorId, tutors.data]);

  const subjects = Array.from(
    new Set((lessons.data ?? []).map((item) => subjectLabel(item.subject)).filter(Boolean)),
  ).sort();
  const activeFilterCount = [tutorId, siteId, formatFilter, subjectFilter].filter(
    (value) => value !== "all",
  ).length;
  const visibleStudents = (students.data ?? []).filter((student) => {
    const query = studentSearch.trim().toLowerCase();
    return (
      !query ||
      [fullName(student), student.school, student.year_group]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  });

  const tutorFor = (lesson: ClassRow) =>
    (tutors.data ?? []).find((item) => item.id === lesson.tutor_id);
  const siteFor = (lesson: ClassRow) =>
    (sites.data ?? []).find((item) => item.id === lesson.site_id);
  const countFor = (lesson: ClassRow) =>
    (enrolments.data ?? []).filter(
      (item) => item.class_id === lesson.id && item.status === "active",
    ).length;
  const studentsFor = (lesson: ClassRow) => {
    const ids = new Set(
      (enrolments.data ?? [])
        .filter((item) => item.class_id === lesson.id && item.status === "active")
        .map((item) => item.student_id),
    );
    return (students.data ?? []).filter((student) => ids.has(student.id));
  };
  const colourFor = (lesson: ClassRow) => {
    if (lesson.card_colour && lesson.card_colour in CARD_COLOURS)
      return CARD_COLOURS[lesson.card_colour as CardColour];
    const index = stableHash(lesson.tutor_id ?? lesson.id) % CARD_COLOUR_NAMES.length;
    const fallbackColour = CARD_COLOUR_NAMES[index % CARD_COLOUR_NAMES.length] ?? "pink";
    return CARD_COLOURS[fallbackColour];
  };

  function openNew(date = selectedDate) {
    setEditingId(null);
    setForm({ ...BLANK, date });
    setSelectedStudentIds([]);
    setStudentSearch("");
    setShowMore(false);
    setFormOpen(true);
  }

  function cloneLesson(lesson: ClassRow) {
    setEditingId(null);
    setForm({
      ...BLANK,
      name: lesson.name,
      date: selectedDate,
      start_time: hhmm(lesson.start_time),
      end_time: hhmm(lesson.end_time),
      recurrence: lesson.recurrence ?? "weekly",
      end_date: lesson.end_date ?? "",
      delivery_mode: lesson.delivery_mode,
      site_id: lesson.site_id ?? "",
      venue_name: lesson.venue_name ?? "",
      room: lesson.room ?? "",
      online_url: lesson.online_url ?? "",
      tutor_id: lesson.tutor_id ?? "",
      subject: lesson.subject ?? "",
      level: lesson.level ?? "",
      capacity: String(lesson.capacity),
      session_rate: lesson.session_rate === null ? "" : String(lesson.session_rate),
      price_per_session: lesson.price_per_session === null ? "" : String(lesson.price_per_session),
      notes: lesson.notes ?? "",
      card_colour: lesson.card_colour ?? "pink",
    });
    setSelectedStudentIds([]);
    setShowMore(true);
    setDetail(null);
    setFormOpen(true);
  }

  function beginQuickEdit(lesson: ClassRow) {
    setEditingId(lesson.id);
    setForm({
      ...BLANK,
      name: lesson.name,
      date: lesson.start_date ?? selectedDate,
      start_time: hhmm(lesson.start_time),
      end_time: hhmm(lesson.end_time),
      recurrence: lesson.recurrence ?? "weekly",
      end_date: lesson.end_date ?? "",
      delivery_mode: lesson.delivery_mode,
      site_id: lesson.site_id ?? "",
      venue_name: lesson.venue_name ?? "",
      room: lesson.room ?? "",
      online_url: lesson.online_url ?? "",
      tutor_id: lesson.tutor_id ?? "",
      subject: lesson.subject ?? "",
      level: lesson.level ?? "",
      capacity: String(lesson.capacity),
      session_rate: lesson.session_rate === null ? "" : String(lesson.session_rate),
      price_per_session: lesson.price_per_session === null ? "" : String(lesson.price_per_session),
      notes: lesson.notes ?? "",
      card_colour: lesson.card_colour ?? "pink",
    });
    setQuickEditing(true);
  }

  async function saveQuickEdit() {
    if (!detail) return;
    if (!form.name.trim()) {
      toast.error("Add a lesson name");
      return;
    }
    if (minutes(form.end_time) <= minutes(form.start_time)) {
      toast.error("End time must be after start time");
      return;
    }
    try {
      const updated = await updateLesson.mutateAsync({
        id: detail.id,
        values: {
          name: form.name.trim(),
          start_date: form.date,
          weekday: format(parseISO(form.date), "EEEE"),
          start_time: form.start_time,
          end_time: form.end_time,
          tutor_id: form.tutor_id || null,
          delivery_mode: form.delivery_mode,
          site_id: form.delivery_mode === "online" ? null : form.site_id || null,
          online_url: form.delivery_mode === "online" ? form.online_url.trim() || null : null,
          capacity: Number(form.capacity) || 0,
          subject: subjectLabel(form.subject) || null,
          venue_name: form.delivery_mode === "online" ? null : form.venue_name.trim() || null,
          card_colour: form.card_colour,
        },
      });
      setDetail(updated);
      setQuickEditing(false);
      setEditingId(null);
      toast.success("Lesson updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the lesson");
    }
  }

  function beginDrag(event: React.PointerEvent<HTMLDivElement>, lesson: ClassRow) {
    if (event.button !== 0) return;
    if (dragHoldTimerRef.current) clearTimeout(dragHoldTimerRef.current);
    dragRef.current = {
      lesson,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      armed: event.pointerType !== "touch",
      moved: false,
    };
    if (event.pointerType === "touch") {
      dragHoldTimerRef.current = setTimeout(() => {
        if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
        dragRef.current.armed = true;
        suppressClickRef.current = true;
        pageOverflowRef.current = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        setDraggingId(lesson.id);
        navigator.vibrate?.(30);
      }, 500);
    }
  }

  function continueDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.armed) {
      if (distance > 10) {
        if (dragHoldTimerRef.current) clearTimeout(dragHoldTimerRef.current);
        dragHoldTimerRef.current = null;
        dragRef.current = null;
      }
      return;
    }
    if (distance < 8) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    drag.moved = true;
    setDraggingId(drag.lesson.id);
    event.preventDefault();
  }

  async function finishDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (dragHoldTimerRef.current) clearTimeout(dragHoldTimerRef.current);
    dragHoldTimerRef.current = null;
    dragRef.current = null;
    setDraggingId(null);
    document.body.style.overflow = pageOverflowRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !drag.moved) return;
    suppressClickRef.current = true;

    const target = document
      .elementsFromPoint(event.clientX, event.clientY)
      .find(
        (element): element is HTMLElement =>
          element instanceof HTMLElement && element.hasAttribute("data-calendar-date"),
      );
    const targetDate = target?.dataset["calendarDate"];
    if (!target || !targetDate) return;

    const rect = target.getBoundingClientRect();
    const duration = Math.max(15, minutes(drag.lesson.end_time) - minutes(drag.lesson.start_time));
    const rawStart = 8 * 60 + (event.clientY - rect.top) / CALENDAR_MINUTE_SCALE;
    const snappedStart = Math.round(rawStart / 15) * 15;
    const start = Math.max(8 * 60, Math.min(21 * 60 - duration, snappedStart));
    const end = start + duration;

    try {
      await updateLesson.mutateAsync({
        id: drag.lesson.id,
        values: {
          start_date: targetDate,
          weekday: format(parseISO(targetDate), "EEEE"),
          start_time: clock(start),
          end_time: clock(end),
        },
      });
      setSelectedDate(targetDate);
      toast.success(
        `${drag.lesson.recurrence === "weekly" ? "Weekly lesson" : "Lesson"} moved to ${clock(start)}`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not move the lesson");
    }
  }

  function editLesson(lesson: ClassRow) {
    setEditingId(lesson.id);
    setForm({
      ...BLANK,
      name: lesson.name,
      date: lesson.start_date ?? selectedDate,
      start_time: hhmm(lesson.start_time),
      end_time: hhmm(lesson.end_time),
      recurrence: lesson.recurrence ?? "weekly",
      end_date: lesson.end_date ?? "",
      delivery_mode: lesson.delivery_mode,
      site_id: lesson.site_id ?? "",
      venue_name: lesson.venue_name ?? "",
      room: lesson.room ?? "",
      online_url: lesson.online_url ?? "",
      tutor_id: lesson.tutor_id ?? "",
      subject: lesson.subject ?? "",
      level: lesson.level ?? "",
      capacity: String(lesson.capacity),
      session_rate: lesson.session_rate === null ? "" : String(lesson.session_rate),
      price_per_session: lesson.price_per_session === null ? "" : String(lesson.price_per_session),
      notes: lesson.notes ?? "",
      card_colour: lesson.card_colour ?? "pink",
    });
    setSelectedStudentIds(
      (enrolments.data ?? [])
        .filter((item) => item.class_id === lesson.id && item.status === "active")
        .map((item) => item.student_id),
    );
    setStudentSearch("");
    setShowMore(false);
    setDetail(null);
    setFormOpen(true);
  }

  async function save() {
    try {
      const values = {
        name: form.name.trim(),
        schedule_block_id: null,
        site_id: form.site_id || null,
        tutor_id: form.tutor_id || null,
        subject: subjectLabel(form.subject) || null,
        level: form.level.trim() || null,
        weekday: format(parseISO(form.date), "EEEE"),
        start_date: form.date,
        end_date: form.recurrence === "once" ? form.date : form.end_date || null,
        recurrence: form.recurrence,
        start_time: form.start_time,
        end_time: form.end_time,
        capacity: Number(form.capacity) || 0,
        delivery_mode: form.delivery_mode,
        venue_name: form.venue_name.trim() || null,
        room: form.room.trim() || null,
        online_url: form.online_url.trim() || null,
        session_rate: form.session_rate ? Number(form.session_rate) : null,
        price_per_session: form.price_per_session ? Number(form.price_per_session) : null,
        notes: form.notes.trim() || null,
        card_colour: form.card_colour,
      };
      const created = editingId ? null : await createLesson.mutateAsync(values);
      if (editingId) await updateLesson.mutateAsync({ id: editingId, values });
      const lessonId = editingId ?? created?.[0]?.id;
      if (lessonId && selectedStudentIds.length > 0) {
        const alreadyEnrolled = new Set(
          (enrolments.data ?? [])
            .filter((item) => item.class_id === lessonId && item.status === "active")
            .map((item) => item.student_id),
        );
        const newStudentIds = selectedStudentIds.filter((id) => !alreadyEnrolled.has(id));
        if (newStudentIds.length > 0)
          await addEnrolments.mutateAsync(
            newStudentIds.map((studentId) => ({
              class_id: lessonId,
              student_id: studentId,
              status: "active",
            })),
          );
      }
      toast.success(editingId ? "Lesson updated" : "Lesson added to your calendar");
      setFormOpen(false);
      setEditingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the lesson");
    }
  }

  function move(direction: -1 | 1) {
    const next =
      view === "month"
        ? direction < 0
          ? subMonths(anchor, 1)
          : addMonths(anchor, 1)
        : view === "day"
          ? addDays(anchor, direction)
          : direction < 0
            ? subWeeks(anchor, 1)
            : addWeeks(anchor, 1);
    setSelectedDate(format(next, "yyyy-MM-dd"));
  }

  function downloadTeachingReport() {
    const reportDates =
      view === "day"
        ? [anchor]
        : view === "week"
          ? weekDays
          : view === "month"
            ? eachDayOfInterval({ start: startOfMonth(anchor), end: endOfMonth(anchor) })
            : [];
    const visibleLessons =
      view === "list"
        ? filtered.map((lesson) => ({ lesson, date: null as Date | null }))
        : reportDates.flatMap((date) =>
            filtered
              .filter((lesson) => lessonRunsOn(lesson, date))
              .map((lesson) => ({ lesson, date })),
          );

    if (visibleLessons.length === 0) {
      toast.error("There are no lessons in this view to include in the report");
      return;
    }

    const groups = new Map<string, typeof visibleLessons>();
    [...visibleLessons]
      .sort(
        (a, b) =>
          fullName(tutorFor(a.lesson)).localeCompare(fullName(tutorFor(b.lesson)), "en-GB") ||
          (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0) ||
          compareLessons(a.lesson, b.lesson),
      )
      .forEach((occurrence) => {
        const lesson = occurrence.lesson;
        const tutorName = tutorFor(lesson) ? fullName(tutorFor(lesson)) : "Tutor not assigned";
        groups.set(tutorName, [...(groups.get(tutorName) ?? []), occurrence]);
      });

    const report: TeachingReportGroup[] = Array.from(groups, ([tutor, tutorLessons]) => ({
      tutor,
      tutorInitials: initialsOf(tutor),
      lessons: tutorLessons.map(({ lesson, date: occurrenceDate }) => {
        const enrolledStudents = studentsFor(lesson)
          .map((student) => ({
            name: fullName(student),
            initials: initialsOf(fullName(student)),
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
        const venue =
          lesson.delivery_mode === "online"
            ? lesson.online_url
              ? `Online - ${lesson.online_url}`
              : "Online"
            : (siteFor(lesson)?.name ?? lesson.venue_name ?? "Venue to be confirmed");
        const firstDate = lesson.start_date
          ? format(parseISO(lesson.start_date), "d MMM yyyy")
          : "Date to be confirmed";
        const when = occurrenceDate
          ? `${format(occurrenceDate, "EEE d MMM yyyy")}, ${hhmm(lesson.start_time)}-${hhmm(lesson.end_time)}`
          : lesson.recurrence === "once"
            ? `${firstDate}, ${hhmm(lesson.start_time)}-${hhmm(lesson.end_time)}`
            : `Every ${lesson.weekday}, ${hhmm(lesson.start_time)}-${hhmm(lesson.end_time)} from ${firstDate}`;
        return {
          name: lesson.name,
          subject: subjectLabel(lesson.subject) || "Subject not set",
          when,
          where: venue,
          delivery:
            lesson.delivery_mode === "in_person"
              ? "Face-to-face"
              : lesson.delivery_mode === "hybrid"
                ? "Hybrid"
                : "Online",
          capacity: lesson.capacity,
          enrolled: enrolledStudents.length,
          students: enrolledStudents,
          colour: (lesson.card_colour as CardColour | null) ?? "pink",
        };
      }),
    }));

    const filterLabels = [
      tutorId !== "all"
        ? tutorId === "unassigned"
          ? "Unassigned tutors"
          : fullName((tutors.data ?? []).find((tutor) => tutor.id === tutorId))
        : null,
      siteId !== "all" ? (sites.data ?? []).find((site) => site.id === siteId)?.name : null,
      formatFilter !== "all"
        ? formatFilter === "in_person"
          ? "Face-to-face"
          : subjectLabel(formatFilter)
        : null,
      subjectFilter !== "all" ? subjectFilter : null,
      search.trim() ? `Search: ${search.trim()}` : null,
    ].filter(Boolean) as string[];
    const scope = `${dateTitle}${filterLabels.length ? ` | ${filterLabels.join(" | ")}` : ""}`;
    const pdf = createTeachingReportPdf(report, scope);
    const url = URL.createObjectURL(pdf);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ProgressTutors-teaching-report-${selectedDate}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    toast.success("Teaching report downloaded");
  }

  const dateTitle =
    view === "day"
      ? format(anchor, "EEE d MMM yyyy")
      : view === "month"
        ? format(anchor, "MMMM yyyy")
        : `${format(weekStart, "d MMM")} – ${format(addDays(weekStart, 6), "d MMM yyyy")}`;

  const renderCard = (lesson: ClassRow, compact = false) => {
    const tutor = tutorFor(lesson);
    const enrolled = countFor(lesson);
    const filled = lesson.capacity > 0 ? Math.min(100, (enrolled / lesson.capacity) * 100) : 0;
    return (
      <button
        key={lesson.id}
        type="button"
        onClick={(event) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            event.preventDefault();
            return;
          }
          setDetail(lesson);
        }}
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-xl border border-l-4 border-white/30 p-1.5 text-left shadow-sm ring-1 ring-black/5 transition hover:brightness-95",
          colourFor(lesson),
          compact ? "text-[10px]" : "text-xs",
        )}
      >
        <p className="line-clamp-2 font-extrabold leading-tight">{lesson.name}</p>
        <p className="mt-0.5 whitespace-nowrap text-[9px] font-semibold leading-none opacity-85">
          {hhmm(lesson.start_time)}–{hhmm(lesson.end_time)}
        </p>
        {!compact ? (
          <div className="mt-auto min-w-0 pt-1">
            <div className="mb-1 h-1 overflow-hidden rounded-full bg-black/20">
              <div
                className="h-full rounded-full bg-white/90 transition-[width]"
                style={{ width: `${filled}%` }}
              />
            </div>
            <div className="flex min-w-0 items-end justify-between gap-1">
              <span className="flex min-w-0 items-center" title={fullName(tutor)}>
                <Avatar
                  initials={initialsOf(fullName(tutor))}
                  tone={avatarTone(fullName(tutor))}
                  size="sm"
                />
              </span>
              <span className="shrink-0 whitespace-nowrap rounded-full bg-black/20 px-1.5 py-0.5 text-[9px] font-extrabold leading-none">
                {enrolled}/{lesson.capacity} seats
              </span>
            </div>
          </div>
        ) : null}
      </button>
    );
  };

  const timeline = (days: Date[]) => (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <div className={cn("min-w-[760px]", days.length === 1 && "min-w-0")}>
        <div
          className="grid border-b border-border"
          style={{ gridTemplateColumns: `4rem repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <div className="p-2" />
          {days.map((day) => (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => setSelectedDate(format(day, "yyyy-MM-dd"))}
              className="border-l border-border p-2 text-center hover:bg-muted"
            >
              <span className="block text-[10px] font-bold uppercase text-muted-foreground">
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold",
                  format(day, "yyyy-MM-dd") === selectedDate &&
                    "bg-primary text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </span>
            </button>
          ))}
        </div>
        <div
          className="grid"
          style={{ gridTemplateColumns: `4rem repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <div className="relative" style={{ height: CALENDAR_HEIGHT }}>
            {HOURS.map((hour) => (
              <span
                key={hour}
                className="absolute right-2 -translate-y-2 text-[10px] text-muted-foreground"
                style={{ top: `${(hour - 8) * CALENDAR_HOUR_HEIGHT}px` }}
              >
                {hour}:00
              </span>
            ))}
          </div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="relative border-l border-border"
              data-calendar-date={format(day, "yyyy-MM-dd")}
              style={{
                height: CALENDAR_HEIGHT,
                backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${CALENDAR_HOUR_HEIGHT - 1}px, var(--border) ${CALENDAR_HOUR_HEIGHT}px)`,
              }}
              onDoubleClick={() => openNew(format(day, "yyyy-MM-dd"))}
            >
              {filtered
                .filter((lesson) => lessonRunsOn(lesson, day))
                .map((lesson, _index, dayLessons) => {
                  const top =
                    Math.max(0, minutes(lesson.start_time) - 8 * 60) * CALENDAR_MINUTE_SCALE;
                  const height = Math.max(
                    44,
                    (minutes(lesson.end_time) - minutes(lesson.start_time)) * CALENDAR_MINUTE_SCALE,
                  );
                  const overlappingLessons = dayLessons.filter(
                    (candidate) =>
                      minutes(candidate.start_time) < minutes(lesson.end_time) &&
                      minutes(candidate.end_time) > minutes(lesson.start_time),
                  );
                  const overlapIndex = overlappingLessons.findIndex(
                    (candidate) => candidate.id === lesson.id,
                  );
                  const width = overlappingLessons.length > 1 ? 94 / overlappingLessons.length : 94;
                  return (
                    <div
                      key={lesson.id}
                      className={cn(
                        "absolute touch-auto select-none px-1 transition-opacity",
                        draggingId === lesson.id && "z-20 cursor-grabbing opacity-60",
                        draggingId !== lesson.id && "cursor-grab",
                      )}
                      style={{
                        top,
                        height,
                        left: `${3 + Math.max(0, overlapIndex) * width}%`,
                        width: `${width}%`,
                      }}
                      title="Drag to reschedule. On mobile, press and hold first."
                      onContextMenu={(event) => event.preventDefault()}
                      onPointerDown={(event) => beginDrag(event, lesson)}
                      onPointerMove={continueDrag}
                      onPointerUp={finishDrag}
                      onPointerCancel={() => {
                        if (dragHoldTimerRef.current) clearTimeout(dragHoldTimerRef.current);
                        dragHoldTimerRef.current = null;
                        dragRef.current = null;
                        setDraggingId(null);
                        document.body.style.overflow = pageOverflowRef.current;
                      }}
                    >
                      {renderCard(lesson, days.length > 3)}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Page className="space-y-4">
      <PageHeader
        title="Schedule"
        subtitle="One calendar for every online and face-to-face lesson."
        actions={
          <Button className="hidden sm:inline-flex" onClick={() => openNew()}>
            Add lesson
          </Button>
        }
      />

      <section className="space-y-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setSelectedDate(DEMO_DATE)}>
            Today
          </Button>
          <Button size="icon" variant="ghost" onClick={() => move(-1)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => move(1)} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <p className="min-w-40 flex-1 text-sm font-extrabold sm:text-base">{dateTitle}</p>
          <div className="flex rounded-xl bg-muted p-1">
            {(["day", "week", "month", "list"] as CalendarView[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold capitalize",
                  view === item ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={() => setFiltersOpen(true)}>
            <Filter className="h-4 w-4" /> Filters{activeFilterCount ? ` ${activeFilterCount}` : ""}
          </Button>
          <Button size="sm" variant="secondary" onClick={downloadTeachingReport}>
            <Download className="h-4 w-4" /> Report
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search lessons, subjects or tutors"
            className="h-10 rounded-xl pl-10"
          />
        </div>
      </section>

      {view === "day" ? timeline([anchor]) : null}
      {view === "week" ? timeline(weekDays) : null}
      {view === "month" ? (
        <div className="grid grid-cols-7 overflow-hidden rounded-2xl border border-border bg-card">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="border-b border-border p-2 text-center text-[10px] font-bold uppercase text-muted-foreground"
            >
              {day.slice(0, 3)}
            </div>
          ))}
          {monthDays.map((day) => {
            const dayLessons = filtered.filter((lesson) => lessonRunsOn(lesson, day));
            return (
              <div
                key={day.toISOString()}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedDate(format(day, "yyyy-MM-dd"));
                  setView("day");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    setSelectedDate(format(day, "yyyy-MM-dd"));
                    setView("day");
                  }
                }}
                className={cn(
                  "min-h-24 border-b border-r border-border p-1.5 text-left hover:bg-muted/40",
                  !isSameMonth(day, anchor) && "bg-muted/30 text-muted-foreground",
                )}
              >
                <span className="text-xs font-bold">{format(day, "d")}</span>
                <div className="mt-1 space-y-1">
                  {dayLessons.slice(0, 3).map((lesson) => renderCard(lesson, true))}
                </div>
                {dayLessons.length > 3 ? (
                  <span className="text-[10px] font-bold text-primary">
                    +{dayLessons.length - 3} more
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
      {view === "list" ? (
        filtered.length === 0 ? (
          <Empty>No lessons match your filters.</Empty>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {filtered.map((lesson) => (
                <li key={lesson.id}>
                  <button
                    type="button"
                    onClick={() => setDetail(lesson)}
                    className="grid w-full grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-xs font-bold text-primary">
                        {lesson.weekday?.slice(0, 3)}
                      </p>
                      <p className="text-sm font-extrabold">{hhmm(lesson.start_time)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold">{lesson.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {fullName(tutorFor(lesson))} ·{" "}
                        {lesson.delivery_mode === "online"
                          ? "Online"
                          : (siteFor(lesson)?.name ?? lesson.venue_name ?? "Venue TBC")}
                      </p>
                    </div>
                    <Pill tone={capacityTone(countFor(lesson), lesson.capacity)}>
                      {countFor(lesson)}/{lesson.capacity}
                    </Pill>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      ) : null}

      <Button
        size="icon"
        onClick={() => openNew()}
        aria-label="Add lesson"
        className="fixed right-4 bottom-24 z-30 h-14 w-14 rounded-2xl shadow-xl sm:hidden"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:max-h-[90vh] sm:max-w-md sm:pb-6">
          <DialogHeader>
            <DialogTitle>Filter lessons</DialogTitle>
            <DialogDescription>
              Filters change the view, never the calendar itself.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <SelectField
              label="Tutor"
              value={tutorId}
              onChange={setTutorId}
              options={[
                { value: "all", label: "All tutors" },
                { value: "unassigned", label: "Tutor needed" },
                ...(tutors.data ?? []).map((item) => ({ value: item.id, label: fullName(item) })),
              ]}
            />
            <SelectField
              label="Delivery"
              value={formatFilter}
              onChange={setFormatFilter}
              options={[
                { value: "all", label: "Online and face-to-face" },
                { value: "online", label: "Online" },
                { value: "in_person", label: "Face-to-face" },
                { value: "hybrid", label: "Hybrid" },
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
              label="Subject"
              value={subjectFilter}
              onChange={setSubjectFilter}
              options={[
                { value: "all", label: "All subjects" },
                ...subjects.map((item) => ({ value: item, label: item })),
              ]}
            />
            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => {
                  setTutorId("all");
                  setSiteId("all");
                  setFormatFilter("all");
                  setSubjectFilter("all");
                }}
              >
                Clear filters
              </Button>
              <Button onClick={() => setFiltersOpen(false)}>Show lessons</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) {
            setDetail(null);
            setQuickEditing(false);
            setEditingId(null);
          }
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:max-h-[90vh] sm:max-w-md sm:pb-6">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
                <DialogDescription>
                  {detail.weekday} · {hhmm(detail.start_time)}–{hhmm(detail.end_time)}
                </DialogDescription>
              </DialogHeader>
              {quickEditing ? (
                <div className="grid gap-3">
                  <TextField
                    full
                    required
                    label="Lesson name"
                    value={form.name}
                    onChange={(name) => setForm({ ...form, name })}
                    placeholder="Enter lesson name"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label="Date"
                      type="date"
                      value={form.date}
                      onChange={(date) => setForm({ ...form, date })}
                    />
                    <SelectField
                      label="Delivery"
                      value={form.delivery_mode}
                      onChange={(delivery_mode) => setForm({ ...form, delivery_mode })}
                      options={[
                        { value: "in_person", label: "Face-to-face" },
                        { value: "online", label: "Online" },
                        { value: "hybrid", label: "Hybrid" },
                      ]}
                    />
                  </div>
                  <TimeRangePicker
                    start={form.start_time}
                    end={form.end_time}
                    onChange={(start_time, end_time) => setForm({ ...form, start_time, end_time })}
                  />
                  <TutorPicker
                    value={form.tutor_id}
                    onChange={(tutor_id) => setForm({ ...form, tutor_id })}
                    tutors={tutors.data ?? []}
                  />
                  <SubjectPicker
                    value={form.subject}
                    onChange={(subject) => setForm({ ...form, subject })}
                    options={Array.from(
                      new Set([
                        "English",
                        "Maths",
                        "Science",
                        ...subjects,
                        subjectLabel(form.subject),
                      ]),
                    ).filter(Boolean)}
                  />
                  {form.delivery_mode === "online" ? (
                    <TextField
                      full
                      label="Meeting link"
                      value={form.online_url}
                      onChange={(online_url) => setForm({ ...form, online_url })}
                    />
                  ) : (
                    <LocationPicker
                      value={form.site_id}
                      onChange={(site_id) => setForm({ ...form, site_id })}
                      customValue={form.venue_name}
                      onCustomChange={(venue_name) => setForm({ ...form, venue_name })}
                      sites={sites.data ?? []}
                    />
                  )}
                  <CardColourPicker
                    value={form.card_colour}
                    onChange={(card_colour) => setForm({ ...form, card_colour })}
                  />
                  <TextField
                    label="Capacity"
                    type="number"
                    value={form.capacity}
                    onChange={(capacity) => setForm({ ...form, capacity })}
                  />
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <p className="flex items-center gap-2">
                    <Avatar
                      initials={initialsOf(fullName(tutorFor(detail)))}
                      tone={avatarTone(fullName(tutorFor(detail)))}
                      size="sm"
                    />
                    {fullName(tutorFor(detail))}
                  </p>
                  <p className="flex items-center gap-2">
                    {detail.delivery_mode === "online" ? (
                      <Video className="h-4 w-4 text-primary" />
                    ) : (
                      <MapPin className="h-4 w-4 text-primary" />
                    )}
                    {detail.delivery_mode === "online"
                      ? "Online lesson"
                      : (siteFor(detail)?.name ?? detail.venue_name ?? "Venue to confirm")}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-primary" />
                    {detail.recurrence === "once" ? "One-off lesson" : "Repeats weekly"}
                  </p>
                  <Pill tone={capacityTone(countFor(detail), detail.capacity)}>
                    {countFor(detail)}/{detail.capacity} students
                  </Pill>
                  <div className="space-y-1.5" aria-label="Seat capacity">
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{
                          width: `${
                            detail.capacity > 0
                              ? Math.min(100, (countFor(detail) / detail.capacity) * 100)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {Math.max(0, detail.capacity - countFor(detail))} seats remaining
                    </p>
                  </div>
                  <div className="flex items-center gap-3 border-t border-border pt-3">
                    <div className="flex -space-x-2">
                      {studentsFor(detail)
                        .slice(0, 6)
                        .map((student) => (
                          <Avatar
                            key={student.id}
                            initials={initialsOf(fullName(student))}
                            tone={avatarTone(fullName(student))}
                            size="sm"
                          />
                        ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {studentsFor(detail).length
                        ? `${studentsFor(detail).length} enrolled`
                        : "No students enrolled"}
                    </span>
                  </div>
                </div>
              )}
              <div className="sticky bottom-0 z-10 -mx-2 grid grid-cols-4 gap-2 border-t border-border bg-background px-2 py-3">
                {quickEditing ? (
                  <>
                    <Button
                      className="col-span-1 px-2 text-xs"
                      variant="ghost"
                      onClick={() => {
                        setQuickEditing(false);
                        setEditingId(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="col-span-2 px-2 text-xs"
                      disabled={updateLesson.isPending}
                      onClick={saveQuickEdit}
                    >
                      {updateLesson.isPending ? "Saving…" : "Save changes"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      className="px-2 text-xs"
                      variant="secondary"
                      onClick={() => beginQuickEdit(detail)}
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                    <Button
                      className="px-2 text-xs"
                      variant="secondary"
                      onClick={() => cloneLesson(detail)}
                    >
                      <Copy className="h-4 w-4" /> Clone
                    </Button>
                    <Button asChild className="px-2 text-xs">
                      <Link to="/admin/classes/$id" params={{ id: detail.id }}>
                        Open
                      </Link>
                    </Button>
                    <Button
                      className="px-2 text-xs"
                      variant="destructive"
                      aria-label="Delete lesson"
                      onClick={() => setLessonPendingDelete(detail)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        wide
        title={editingId ? "Edit lesson" : "Add lesson"}
        description={
          editingId
            ? "Update this lesson without leaving the calendar."
            : "Add an event to your calendar. You are not creating another schedule."
        }
        onSubmit={save}
        busy={createLesson.isPending || updateLesson.isPending || addEnrolments.isPending}
        submitLabel={editingId ? "Save changes" : "Add lesson"}
        dangerLabel={editingId ? "Delete" : undefined}
        dangerBusy={deleteLesson.isPending}
        onDanger={
          editingId
            ? () => {
                const lesson = (lessons.data ?? []).find((item) => item.id === editingId);
                if (lesson) setLessonPendingDelete(lesson);
              }
            : undefined
        }
      >
        <TextField
          label="Lesson name"
          value={form.name}
          onChange={(name) => setForm({ ...form, name })}
          placeholder="Enter lesson name"
          required
          full
        />
        <TextField
          label="Date"
          type="date"
          value={form.date}
          onChange={(date) => setForm({ ...form, date })}
          required
        />
        <SelectField
          label="Repeats"
          value={form.recurrence}
          onChange={(recurrence) => setForm({ ...form, recurrence })}
          options={[
            { value: "once", label: "Does not repeat" },
            { value: "weekly", label: "Every week" },
          ]}
        />
        <TimeRangePicker
          start={form.start_time}
          end={form.end_time}
          onChange={(start_time, end_time) => setForm({ ...form, start_time, end_time })}
        />
        <SelectField
          label="Delivery"
          value={form.delivery_mode}
          onChange={(delivery_mode) => setForm({ ...form, delivery_mode })}
          options={[
            { value: "in_person", label: "Face-to-face" },
            { value: "online", label: "Online" },
            { value: "hybrid", label: "Hybrid" },
          ]}
        />
        <TutorPicker
          value={form.tutor_id}
          onChange={(tutor_id) => setForm({ ...form, tutor_id })}
          tutors={tutors.data ?? []}
        />
        <SubjectPicker
          value={form.subject}
          onChange={(subject) => setForm({ ...form, subject })}
          options={Array.from(
            new Set(["English", "Maths", "Science", ...subjects, subjectLabel(form.subject)]),
          ).filter(Boolean)}
        />
        {form.delivery_mode !== "online" ? (
          <LocationPicker
            value={form.site_id}
            onChange={(site_id) => setForm({ ...form, site_id })}
            customValue={form.venue_name}
            onCustomChange={(venue_name) => setForm({ ...form, venue_name })}
            sites={sites.data ?? []}
          />
        ) : (
          <TextField
            label="Online meeting link"
            value={form.online_url}
            onChange={(online_url) => setForm({ ...form, online_url })}
          />
        )}
        <CardColourPicker
          value={form.card_colour}
          onChange={(card_colour) => setForm({ ...form, card_colour })}
        />
        <div className="sm:col-span-2">
          <Button type="button" variant="ghost" onClick={() => setShowMore(!showMore)}>
            {showMore ? "Show fewer options" : "See more options"}
          </Button>
        </div>
        {showMore ? (
          <>
            <TextField
              label="Repeat until"
              type="date"
              value={form.end_date}
              onChange={(end_date) => setForm({ ...form, end_date })}
            />
            <TextField
              label="Level"
              value={form.level}
              onChange={(level) => setForm({ ...form, level })}
            />
            <TextField
              label="Venue name"
              value={form.venue_name}
              onChange={(venue_name) => setForm({ ...form, venue_name })}
            />
            <TextField
              label="Room"
              value={form.room}
              onChange={(room) => setForm({ ...form, room })}
            />
            <TextField
              label="Capacity"
              type="number"
              value={form.capacity}
              onChange={(capacity) => setForm({ ...form, capacity })}
            />
            <TextField
              label="Client price per lesson (£)"
              type="number"
              value={form.price_per_session}
              onChange={(price_per_session) => setForm({ ...form, price_per_session })}
            />
            <TextField
              label="Tutor pay per lesson (£)"
              type="number"
              value={form.session_rate}
              onChange={(session_rate) => setForm({ ...form, session_rate })}
            />
            <TextAreaField
              label="Notes"
              value={form.notes}
              onChange={(notes) => setForm({ ...form, notes })}
            />
            <div className="space-y-2 sm:col-span-2">
              <p className="text-xs font-semibold text-muted-foreground">
                Students ({selectedStudentIds.length} selected)
              </p>
              <Input
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Search students by name, school or year"
                className="h-10 rounded-xl"
              />
              <div className="max-h-52 divide-y divide-border overflow-y-auto rounded-xl border border-border">
                {visibleStudents.map((student) => (
                  <label
                    key={student.id}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(student.id)}
                      onChange={() =>
                        setSelectedStudentIds((current) =>
                          current.includes(student.id)
                            ? current.filter((id) => id !== student.id)
                            : [...current, student.id],
                        )
                      }
                      className="h-4 w-4 accent-[var(--color-primary)]"
                    />
                    <Avatar
                      initials={initialsOf(fullName(student))}
                      size="sm"
                      tone={avatarTone(fullName(student))}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{fullName(student)}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[student.year_group, student.school].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </FormDialog>

      <ConfirmDeleteDialog
        open={Boolean(lessonPendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deleteLesson.isPending) setLessonPendingDelete(null);
        }}
        title="Are you sure you want to delete this lesson?"
        description="This cannot be undone. Enrolments and linked lesson records will also be removed."
        confirmLabel="Delete lesson"
        busy={deleteLesson.isPending}
        onConfirm={async () => {
          if (!lessonPendingDelete) return;
          try {
            await deleteLesson.mutateAsync(lessonPendingDelete.id);
            toast.success("Lesson deleted");
            setLessonPendingDelete(null);
            setDetail(null);
            setFormOpen(false);
            setEditingId(null);
            setQuickEditing(false);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not delete the lesson");
          }
        }}
      />
    </Page>
  );
}

function TimeRangePicker({
  start,
  end,
  onChange,
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-3 rounded-xl border border-border bg-muted/30 p-3 sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-muted-foreground">Time</p>
        <div className="flex items-center gap-2 text-sm font-extrabold">
          <span className="rounded-lg bg-card px-2.5 py-1.5 shadow-sm">{hhmm(start)}</span>
          <span className="text-muted-foreground">to</span>
          <span className="rounded-lg bg-card px-2.5 py-1.5 shadow-sm">{hhmm(end)}</span>
        </div>
      </div>
      <Slider
        min={6 * 60}
        max={22 * 60}
        step={15}
        minStepsBetweenThumbs={1}
        value={[minutes(start), minutes(end)]}
        onValueChange={([nextStart, nextEnd]) => {
          if (nextStart === undefined || nextEnd === undefined) return;
          onChange(clock(nextStart), clock(nextEnd));
        }}
      />
      <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
        <span>06:00</span>
        <span>Drag start and end</span>
        <span>22:00</span>
      </div>
    </div>
  );
}

function TutorPicker({
  value,
  onChange,
  tutors,
}: {
  value: string;
  onChange: (value: string) => void;
  tutors: TutorRow[];
}) {
  const [expanded, setExpanded] = useState(!value);
  const selectedTutor = tutors.find((tutor) => tutor.id === value);
  return (
    <div className="min-w-0 space-y-2 sm:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">Tutor</p>
        <button
          type="button"
          className="text-xs font-bold text-primary"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Close" : selectedTutor ? "Edit" : "+ Add"}
        </button>
      </div>
      <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/30 bg-card py-1.5 pl-1.5 pr-3 text-xs font-bold">
        <Avatar
          initials={initialsOf(selectedTutor ? fullName(selectedTutor) : "Tutor needed")}
          tone={avatarTone(selectedTutor ? fullName(selectedTutor) : "Tutor needed")}
          size="sm"
        />
        <span className="truncate">{selectedTutor ? fullName(selectedTutor) : "Tutor needed"}</span>
      </div>
      {expanded ? (
        <div className="overflow-x-auto rounded-2xl bg-muted/40 p-2">
          <div className="flex w-max min-w-full gap-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setExpanded(false);
              }}
              className="shrink-0 rounded-full border border-border bg-card px-3 py-2 text-xs font-bold"
            >
              Tutor needed
            </button>
            {tutors.map((tutor) => (
              <button
                key={tutor.id}
                type="button"
                aria-label={`Choose ${fullName(tutor)}`}
                onClick={() => {
                  onChange(tutor.id);
                  setExpanded(false);
                }}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border bg-card py-1.5 pl-1.5 pr-3 text-xs font-bold",
                  value === tutor.id ? "border-primary ring-2 ring-primary/20" : "border-border",
                )}
              >
                <Avatar
                  initials={initialsOf(fullName(tutor))}
                  tone={avatarTone(fullName(tutor))}
                  size="sm"
                />
                {fullName(tutor)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LocationPicker({
  value,
  onChange,
  customValue,
  onCustomChange,
  sites,
}: {
  value: string;
  onChange: (value: string) => void;
  customValue: string;
  onCustomChange: (value: string) => void;
  sites: Site[];
}) {
  const [expanded, setExpanded] = useState(!value && !customValue);
  const [adding, setAdding] = useState(Boolean(customValue) && !value);
  const selectedSite = sites.find((site) => site.id === value);
  const colours = [
    "bg-tile-blue text-tile-blue-ink",
    "bg-tile-green text-tile-green-ink",
    "bg-tile-amber text-tile-amber-ink",
    "bg-tile-purple text-tile-purple-ink",
    "bg-tile-pink text-tile-pink-ink",
  ];
  return (
    <div className="min-w-0 space-y-2 sm:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">Location</p>
        <button
          type="button"
          className="text-xs font-bold text-primary"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Close" : selectedSite || customValue ? "Edit" : "+ Add"}
        </button>
      </div>
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-tile-blue px-3 py-2 text-xs font-bold text-tile-blue-ink">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          {selectedSite?.name || customValue.trim() || "No location selected"}
        </span>
      </span>
      {expanded ? (
        <div className="space-y-2 rounded-2xl bg-muted/40 p-2">
          <div className="overflow-x-auto pb-1">
            <div className="flex w-max min-w-full gap-2">
              {sites.map((site, index) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => {
                    onChange(site.id);
                    onCustomChange("");
                    setAdding(false);
                    setExpanded(false);
                  }}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold ring-offset-2",
                    colours[index % colours.length],
                    value === site.id && "ring-2 ring-primary",
                  )}
                >
                  <MapPin className="h-3.5 w-3.5" /> {site.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setAdding(true);
                }}
                className={cn(
                  "shrink-0 rounded-full border border-dashed border-primary px-3 py-2 text-xs font-bold text-primary",
                  !value && customValue && "ring-2 ring-primary",
                )}
              >
                + Other location
              </button>
            </div>
          </div>
          {adding ? (
            <div className="flex min-w-0 gap-2">
              <Input
                value={customValue}
                onChange={(event) => onCustomChange(event.target.value)}
                placeholder="Type the location"
                className="h-10 min-w-0 flex-1 rounded-xl"
                autoFocus={!customValue}
              />
              <Button
                type="button"
                size="sm"
                disabled={!customValue.trim()}
                onClick={() => setExpanded(false)}
              >
                Add
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CardColourPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: CardColour) => void;
}) {
  const swatches: Record<CardColour, string> = {
    pink: "bg-pink-600",
    blue: "bg-blue-600",
    green: "bg-emerald-600",
    amber: "bg-amber-400",
    violet: "bg-violet-600",
    teal: "bg-teal-600",
  };
  return (
    <div className="min-w-0 space-y-2 sm:col-span-2">
      <p className="text-xs font-semibold text-muted-foreground">Card colour</p>
      <div className="flex items-center gap-3">
        {CARD_COLOUR_NAMES.map((colour) => (
          <button
            key={colour}
            type="button"
            aria-label={`${colour} lesson card`}
            onClick={() => onChange(colour)}
            className={cn(
              "h-8 w-8 rounded-full border-2 border-background shadow-sm ring-offset-2",
              swatches[colour],
              value === colour && "ring-2 ring-foreground",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function SubjectPicker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const [expanded, setExpanded] = useState(!value);
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState("");
  const colours = [
    "bg-tile-pink text-tile-pink-ink",
    "bg-tile-blue text-tile-blue-ink",
    "bg-tile-green text-tile-green-ink",
    "bg-tile-amber text-tile-amber-ink",
    "bg-tile-purple text-tile-purple-ink",
  ];
  const selected = subjectLabel(value);
  const addCustom = () => {
    const next = subjectLabel(custom);
    if (!next) return;
    onChange(next);
    setCustom("");
    setAdding(false);
    setExpanded(false);
  };

  return (
    <div className="min-w-0 space-y-2 sm:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">Subject</p>
        <button
          type="button"
          className="text-xs font-bold text-primary"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Close" : selected ? "Edit" : "+ Add"}
        </button>
      </div>
      <span className="inline-flex max-w-full rounded-full bg-tile-blue px-3 py-2 text-xs font-bold text-tile-blue-ink">
        {selected || "No subject selected"}
      </span>
      {expanded ? (
        <div className="space-y-2 rounded-2xl bg-muted/40 p-2">
          <div className="overflow-x-auto pb-1">
            <div className="flex w-max min-w-full gap-2">
              {options.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setExpanded(false);
                  }}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-2 text-xs font-bold ring-offset-2 transition",
                    colours[index % colours.length],
                    selected === option && "ring-2 ring-primary",
                  )}
                >
                  {option}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAdding((current) => !current)}
                className="shrink-0 rounded-full border border-dashed border-primary px-3 py-2 text-xs font-bold text-primary"
              >
                + New subject
              </button>
            </div>
          </div>
          {adding ? (
            <div className="flex min-w-0 gap-2">
              <Input
                value={custom}
                onChange={(event) => setCustom(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustom();
                  }
                }}
                placeholder="New subject"
                className="min-w-0 flex-1 rounded-xl"
                autoFocus
              />
              <Button type="button" size="sm" onClick={addCustom}>
                Add
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type TeachingReportGroup = {
  tutor: string;
  tutorInitials: string;
  lessons: {
    name: string;
    subject: string;
    when: string;
    where: string;
    delivery: string;
    capacity: number;
    enrolled: number;
    students: { name: string; initials: string }[];
    colour: CardColour;
  }[];
};

function pdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/([\\()])/g, "\\$1");
}

function truncatePdfText(value: string, maxLength: number) {
  const clean = pdfText(value);
  return clean.length > maxLength ? `${clean.slice(0, Math.max(1, maxLength - 3))}...` : clean;
}

function createTeachingReportPdf(groups: TeachingReportGroup[], scope: string) {
  const lessonCount = groups.reduce((total, group) => total + group.lessons.length, 0);
  const tutorCount = groups.filter((group) => group.tutor !== "Tutor not assigned").length;
  const generated = new Date().toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const pages: string[][] = [[]];
  let pageIndex = 0;
  let y = 724;

  const palette: Record<CardColour, [number, number, number]> = {
    pink: [0.91, 0.18, 0.43],
    blue: [0.15, 0.39, 0.92],
    green: [0.04, 0.64, 0.43],
    amber: [0.96, 0.62, 0.04],
    violet: [0.49, 0.23, 0.93],
    teal: [0.02, 0.58, 0.58],
  };

  const command = (value: string) => pages[pageIndex]?.push(value);
  const textAt = (
    value: string,
    x: number,
    textY: number,
    size: number,
    options?: { bold?: boolean; colour?: [number, number, number] },
  ) => {
    const [red, green, blue] = options?.colour ?? [0.08, 0.09, 0.12];
    command(
      `BT /${options?.bold ? "F2" : "F1"} ${size} Tf ${red} ${green} ${blue} rg ${x} ${textY} Td (${pdfText(value)}) Tj ET`,
    );
  };
  const roundedRect = (
    x: number,
    rectY: number,
    width: number,
    height: number,
    radius: number,
    fill: [number, number, number],
    stroke?: [number, number, number],
  ) => {
    const right = x + width;
    const top = rectY + height;
    const curve = radius * 0.5523;
    const path = [
      `${x + radius} ${rectY} m`,
      `${right - radius} ${rectY} l`,
      `${right - radius + curve} ${rectY} ${right} ${rectY + radius - curve} ${right} ${rectY + radius} c`,
      `${right} ${top - radius} l`,
      `${right} ${top - radius + curve} ${right - radius + curve} ${top} ${right - radius} ${top} c`,
      `${x + radius} ${top} l`,
      `${x + radius - curve} ${top} ${x} ${top - radius + curve} ${x} ${top - radius} c`,
      `${x} ${rectY + radius} l`,
      `${x} ${rectY + radius - curve} ${x + radius - curve} ${rectY} ${x + radius} ${rectY} c h`,
    ].join(" ");
    command(
      `${fill.join(" ")} rg ${stroke ? `${stroke.join(" ")} RG 0.8 w ` : ""}${path} ${stroke ? "B" : "f"}`,
    );
  };
  const circle = (x: number, centreY: number, radius: number, fill: [number, number, number]) => {
    const curve = radius * 0.5523;
    command(
      `${fill.join(" ")} rg ${x + radius} ${centreY} m ${x + radius} ${centreY + curve} ${x + curve} ${centreY + radius} ${x} ${centreY + radius} c ${x - curve} ${centreY + radius} ${x - radius} ${centreY + curve} ${x - radius} ${centreY} c ${x - radius} ${centreY - curve} ${x - curve} ${centreY - radius} ${x} ${centreY - radius} c ${x + curve} ${centreY - radius} ${x + radius} ${centreY - curve} ${x + radius} ${centreY} c f`,
    );
  };

  const startPage = () => {
    command("0.97 0.98 1 rg 0 0 595 842 re f");
    command("0.91 0.18 0.43 rg 0 766 595 76 re f");
    textAt("ProgressTutors", 42, 811, 20, { bold: true, colour: [1, 1, 1] });
    textAt("Teaching schedule", 42, 787, 12, { bold: true, colour: [1, 1, 1] });
    roundedRect(42, 735, 511, 21, 10, [1, 1, 1]);
    textAt(truncatePdfText(scope, 82), 52, 742, 9, {
      bold: true,
      colour: [0.35, 0.12, 0.23],
    });
    textAt(
      `${lessonCount} lesson${lessonCount === 1 ? "" : "s"} | ${tutorCount} tutor${tutorCount === 1 ? "" : "s"} | Prepared ${generated}`,
      42,
      716,
      8,
      { colour: [0.38, 0.4, 0.46] },
    );
    y = 694;
  };

  const ensureSpace = (height: number) => {
    if (y - height >= 54) return false;
    pageIndex += 1;
    pages.push([]);
    startPage();
    return true;
  };

  const tutorHeader = (group: TeachingReportGroup) => {
    ensureSpace(42);
    roundedRect(42, y - 34, 511, 34, 13, [1, 0.93, 0.96]);
    circle(62, y - 17, 11, [0.91, 0.18, 0.43]);
    textAt(truncatePdfText(group.tutorInitials, 3), 54, y - 21, 8, {
      bold: true,
      colour: [1, 1, 1],
    });
    textAt(truncatePdfText(group.tutor, 52), 82, y - 21, 13, {
      bold: true,
      colour: [0.35, 0.12, 0.23],
    });
    y -= 44;
  };

  startPage();

  groups.forEach((group) => {
    tutorHeader(group);
    group.lessons.forEach((lesson) => {
      const studentRows = Math.max(1, Math.ceil(lesson.students.length / 2));
      const cardHeight = 114 + studentRows * 22;
      if (ensureSpace(cardHeight + 10)) tutorHeader(group);
      const cardBottom = y - cardHeight;
      const colour = palette[lesson.colour] ?? palette.pink;
      roundedRect(42, cardBottom, 511, cardHeight, 14, [1, 1, 1], [0.86, 0.88, 0.92]);
      roundedRect(42, cardBottom, 7, cardHeight, 3, colour);
      textAt(truncatePdfText(lesson.name, 58), 62, y - 23, 12, { bold: true });

      const subjectWidth = Math.min(145, 18 + lesson.subject.length * 5.2);
      roundedRect(62, y - 50, subjectWidth, 19, 9, [0.93, 0.95, 1]);
      textAt(truncatePdfText(lesson.subject, 24), 71, y - 44, 8, {
        bold: true,
        colour,
      });
      textAt(truncatePdfText(lesson.when, 52), 62, y - 69, 9, { bold: true });
      textAt(`${lesson.delivery} | ${truncatePdfText(lesson.where, 49)}`, 62, y - 86, 8, {
        colour: [0.38, 0.4, 0.46],
      });

      const filled = lesson.capacity > 0 ? Math.min(1, lesson.enrolled / lesson.capacity) : 0;
      textAt(`${lesson.enrolled}/${lesson.capacity} seats`, 431, y - 44, 9, {
        bold: true,
        colour,
      });
      roundedRect(431, y - 60, 96, 6, 3, [0.9, 0.91, 0.94]);
      if (filled > 0) roundedRect(431, y - 60, Math.max(6, 96 * filled), 6, 3, colour);

      textAt("Students", 62, y - 108, 8, {
        bold: true,
        colour: [0.38, 0.4, 0.46],
      });
      if (lesson.students.length === 0) {
        textAt("No students assigned", 62, y - 127, 9, { colour: [0.5, 0.52, 0.58] });
      } else {
        lesson.students.forEach((student, index) => {
          const column = index % 2;
          const row = Math.floor(index / 2);
          const itemX = 69 + column * 238;
          const itemY = y - 126 - row * 22;
          const avatarColours: [number, number, number][] = [
            [0.91, 0.18, 0.43],
            [0.15, 0.39, 0.92],
            [0.04, 0.64, 0.43],
            [0.49, 0.23, 0.93],
          ];
          circle(itemX, itemY + 3, 8, avatarColours[stableHash(student.name) % 4] ?? colour);
          textAt(truncatePdfText(student.initials, 3), itemX - 5, itemY, 6, {
            bold: true,
            colour: [1, 1, 1],
          });
          textAt(truncatePdfText(student.name, 29), itemX + 14, itemY, 8, { bold: true });
        });
      }
      y -= cardHeight + 10;
    });
  });

  pages.forEach((page, index) => {
    page.push("0.78 0.79 0.82 RG 48 38 m 547 38 l S");
    page.push(`BT /F1 8 Tf 0.38 0.4 0.46 rg 48 24 Td (Private team timetable) Tj ET`);
    page.push(`BT /F1 8 Tf 0.38 0.4 0.46 rg 510 24 Td (Page ${index + 1}/${pages.length}) Tj ET`);
  });

  const objects: string[] = [];
  const pageReferences = pages.map((_, index) => `${5 + index * 2} 0 R`).join(" ");
  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pageReferences}] /Count ${pages.length} >>`;
  objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[3] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  pages.forEach((commands, index) => {
    const pageId = 5 + index * 2;
    const contentId = pageId + 1;
    const stream = commands.join("\n");
    objects[pageId - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId - 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  const encoder = new TextEncoder();
  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = encoder.encode(output).length;
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = encoder.encode(output).length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    output += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([output], { type: "application/pdf" });
}
