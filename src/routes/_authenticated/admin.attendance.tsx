import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Check, ClipboardCheck, Search, Users, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Avatar, avatarTone, PageHeader } from "@/components/kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fullName, initialsOf, prettyDate, useTable, useUpsert, useUpdateRow } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/attendance")({
  head: () => ({ meta: [{ title: "Attendance | ProgressTutors" }, { name: "robots", content: "noindex" }] }),
  component: AttendanceWorkspace,
});

type Mark = "present" | "absent";
type View = "course" | "student";
type Filter = "all" | "present" | "absent" | "unmarked";

function AttendanceWorkspace() {
  const classes = useTable("classes", "name");
  const students = useTable("students", "first_name");
  const enrolments = useTable("class_enrolments");
  const sessions = useTable("sessions", "session_date");
  const attendance = useTable("student_attendance");
  const createSession = useUpsert("sessions", ["student_attendance"]);
  const createMark = useUpsert("student_attendance");
  const updateMark = useUpdateRow("student_attendance");
  const [view, setView] = useState<View>("course");
  const registerRef = useRef<HTMLElement | null>(null);
  const studentRegisterRef = useRef<HTMLElement | null>(null);
  const [jumpToRegister, setJumpToRegister] = useState(false);
  const [classId, setClassId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const classRows = classes.data ?? [];
  const sessionRows = sessions.data ?? [];
  const markRows = attendance.data ?? [];
  const enrolmentRows = enrolments.data ?? [];
  const studentRows = students.data ?? [];
  const now = new Date();
  const suggestions = sessionRows.filter(row => row.class_id && row.session_date).map(row => {
    const course = classRows.find(c => c.id === row.class_id);
    const start = new Date(row.session_date + "T" + (row.start_time || course?.start_time || "00:00").slice(0,5) + ":00");
    const end = new Date(row.session_date + "T" + (row.end_time || course?.end_time || "23:59").slice(0,5) + ":00");
    const marked = markRows.filter(m => m.session_id === row.id).length;
    const total = enrolmentRows.filter(e => e.class_id === row.class_id && e.status === "active").length;
    return {row, course, start, end, marked, total};
  }).filter(item => Number.isFinite(item.start.getTime()) && Number.isFinite(item.end.getTime()));
  const upcoming = suggestions.filter(x => x.end >= now && x.start.getTime() <= now.getTime() + 7*86400000).sort((a,b) => a.start.getTime()-b.start.getTime()).slice(0,5);
  const recent = suggestions.filter(x => x.end < now && x.end.getTime() >= now.getTime()-7*86400000).sort((a,b) => b.end.getTime()-a.end.getTime()).slice(0,5);
  const lessonColours = ["#ec2d70", "#155dfb", "#00a36c", "#ffb900", "#8424f5", "#009b91"];
  const colourFor = (item: typeof suggestions[number]) => {
    const source = item.course as Record<string, unknown> | undefined;
    const saved = source?.colour ?? source?.color ?? source?.card_colour ?? source?.card_color;
    if (typeof saved === "string" && /^#[0-9a-f]{6}$/i.test(saved)) return saved;
    const key = String(item.row.class_id ?? "");
    return lessonColours[Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), 0) % lessonColours.length];
  };
  const quickCard = (item: typeof suggestions[number]) => <button type="button" key={item.row.id}
    onClick={() => {setView("course");setClassId(item.row.class_id ?? ""); setSessionId(item.row.id); setDate(item.row.session_date); setFilter("all");setJumpToRegister(true);}}
    className="block w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-border px-3 py-2.5 text-left shadow-sm transition hover:brightness-95" style={{backgroundColor:colourFor(item),color: colourFor(item) === "#ffb900" ? "#242424" : "#fff"}}>
    <span className="block w-full min-w-0 truncate text-sm font-bold">{item.course?.name ?? "Lesson"}</span>
    <span className="block min-w-0 truncate text-xs opacity-90">{prettyDate(item.row.session_date)} · {(item.row.start_time || item.course?.start_time || "").slice(0,5)}</span>
    <span className="block min-w-0 truncate text-xs font-semibold">{item.marked}/{item.total} marked</span>
  </button>;
  const selectedClass = classRows.find((row) => row.id === classId);
  const classSessions = useMemo(() => sessionRows.filter((row) => row.class_id === classId).sort((a,b) => b.session_date.localeCompare(a.session_date)), [sessionRows, classId]);
  const selectedSession = classSessions.find((row) => row.id === sessionId);
  const roster = useMemo(() => enrolmentRows.filter((row) => row.class_id === classId && row.status === "active").map((row) => studentRows.find((student) => student.id === row.student_id)).filter((student): student is typeof studentRows[number] => Boolean(student)), [enrolmentRows, studentRows, classId]);
  const marks = markRows.filter((row) => row.session_id === sessionId);
  const markFor = (id: string) => marks.find((row) => row.student_id === id);
  const shown = roster.filter((student) => {
    const mark = markFor(student.id);
    const status = mark?.status ?? "unmarked";
    return (filter === "all" || (filter === "present" ? ["present","late"].includes(status) : filter === "absent" ? ["absent","excused"].includes(status) : !mark)) &&
      [fullName(student),student.email,student.school].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase());
  });
  const totals = { total: roster.length, present: roster.filter((s) => ["present","late"].includes(markFor(s.id)?.status ?? "")).length, absent: roster.filter((s) => ["absent","excused"].includes(markFor(s.id)?.status ?? "")).length, unmarked: roster.filter((s) => !markFor(s.id)).length };
  const studentClasses = enrolmentRows.filter((row) => row.student_id === studentId && row.status === "active");
  const studentClassIds = new Set(studentClasses.map((row) => row.class_id));
  const studentSessions = sessionRows.filter((row) => row.class_id && studentClassIds.has(row.class_id)).sort((a,b) => b.session_date.localeCompare(a.session_date));
  const studentMarkFor = (id: string) => markRows.find((row) => row.session_id === id && row.student_id === studentId);
  const suggestedStudents = studentRows.map(student => {
    const enrolled = enrolmentRows.filter(e => e.student_id === student.id && e.status === "active");
    const ids = new Set(enrolled.map(e => e.class_id));
    const lessons = suggestions.filter(item => item.row.class_id && ids.has(item.row.class_id));
    const recentLessons = lessons.filter(item => item.end.getTime() <= now.getTime() && item.end.getTime() >= now.getTime() - 7 * 86400000);
    const outstanding = recentLessons.filter(item => !markRows.some(m => m.session_id === item.row.id && m.student_id === student.id)).length;
    return {student, recentCount:recentLessons.length, outstanding, lastLesson:recentLessons.reduce((max,item)=>Math.max(max,item.end.getTime()),0)};
  }).filter(item => item.recentCount > 0).sort((a,b)=>b.outstanding-a.outstanding || b.lastLesson-a.lastLesson).slice(0,8);
  useEffect(() => {
    if (!jumpToRegister) return;
    const target = view === "course" ? (selectedSession ? registerRef.current : null) : (studentId ? studentRegisterRef.current : null);
    if (target) {
      target.scrollIntoView({behavior:"smooth",block:"start"});
      setJumpToRegister(false);
    }
  }, [jumpToRegister,view,selectedSession,studentId]);


  async function saveMark(targetSessionId: string, targetStudentId: string, status: Mark) {
    const existing = markRows.find((row) => row.session_id === targetSessionId && row.student_id === targetStudentId);
    if (existing) await updateMark.mutateAsync({id: existing.id, values:{status}});
    else await createMark.mutateAsync({session_id:targetSessionId,student_id:targetStudentId,status});
  }
  async function markOne(targetSessionId: string, targetStudentId: string, status: Mark) {
    if (busy) return;
    setBusy(true);
    try { await saveMark(targetSessionId,targetStudentId,status); toast.success("Attendance saved"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save attendance"); }
    finally { setBusy(false); }
  }
  async function markAllPresent() {
    if (!selectedSession || busy) return;
    setBusy(true);
    try {
      // Preserve existing absent/excused/late marks. Only fill missing marks.
      const missing = roster.filter((student) => !markFor(student.id));
      if (!missing.length) { toast.info("All students are already marked"); return; }
      await createMark.mutateAsync(missing.map((student) => ({session_id:selectedSession.id,student_id:student.id,status:"present"})));
      toast.success(`Marked ${missing.length} unmarked students present`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save the register"); }
    finally { setBusy(false); }
  }
  async function createLessonRegister() {
    if (!selectedClass || busy || !date) return;
    const existing = classSessions.find((row) => row.session_date === date);
    if (existing) { setSessionId(existing.id); return; }
    setBusy(true);
    try {
      const created = await createSession.mutateAsync({class_id:selectedClass.id,schedule_block_id:selectedClass.schedule_block_id,site_id:selectedClass.site_id,tutor_id:selectedClass.tutor_id,session_date:date,start_time:selectedClass.start_time,end_time:selectedClass.end_time,status:"scheduled",agreed_amount:selectedClass.session_rate});
      if (created[0]) setSessionId(created[0].id);
      toast.success("Lesson register created");
    } catch(error) { toast.error(error instanceof Error ? error.message : "Could not create register"); }
    finally { setBusy(false); }
  }
  const markButtons = (targetSessionId: string, targetStudentId: string, current: string) => (
    <div className="flex w-full min-w-0 gap-1.5 lg:w-auto">
      <button type="button" disabled={busy} aria-pressed={current === "present" || current === "late"} onClick={() => void markOne(targetSessionId,targetStudentId,"present")} className={`inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border px-2 text-xs font-semibold lg:min-h-9 lg:flex-none lg:px-3 disabled:opacity-50 ${["present","late"].includes(current) ? "border-green-600 bg-green-600 text-white" : "border-border hover:bg-green-50 dark:hover:bg-green-950"}`}><Check className="h-3.5 w-3.5"/>Present</button>
      <button type="button" disabled={busy} aria-pressed={current === "absent" || current === "excused"} onClick={() => void markOne(targetSessionId,targetStudentId,"absent")} className={`inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border px-2 text-xs font-semibold lg:min-h-9 lg:flex-none lg:px-3 disabled:opacity-50 ${["absent","excused"].includes(current) ? "border-red-500 bg-red-500 text-white" : "border-border hover:bg-red-50 dark:hover:bg-red-950"}`}><X className="h-3.5 w-3.5"/>Absent</button>
    </div>
  );
  return <Page className="min-w-0 max-w-full space-y-4 overflow-x-hidden pb-24">
    <PageHeader title="Take attendance" subtitle="Choose a lesson, mark the register and review attendance by student."/>
    <div role="tablist" aria-label="Attendance view" className="grid w-full min-w-0 grid-cols-2 overflow-hidden rounded-xl border border-border bg-card">
      <button type="button" role="tab" aria-selected={view === "course"} onClick={() => setView("course") } className={`flex min-h-12 items-center justify-center gap-2 text-sm font-bold ${view === "course" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}><Users className="h-4 w-4"/>By course</button>
      <button type="button" role="tab" aria-selected={view === "student"} onClick={() => setView("student") } className={`flex min-h-12 items-center justify-center gap-2 text-sm font-bold ${view === "student" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}><UserRound className="h-4 w-4"/>By student</button>
    </div>
    {view === "course" ? <>      <section className="min-w-0 max-w-full rounded-xl border border-border bg-card p-3 sm:p-4">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-semibold">COURSE
            <select className="h-11 w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 text-sm" value={classId} onChange={(e) => {setClassId(e.target.value);setSessionId("");setFilter("all");}}><option value="">Choose a course</option>{classRows.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select>
          </label>
          <label className="space-y-1 text-xs font-semibold">LESSON
            <select className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" value={sessionId} disabled={!classId} onChange={(e) => {setSessionId(e.target.value);setFilter("all");}}><option value="">Choose a lesson</option>{classSessions.map((row) => <option key={row.id} value={row.id}>{prettyDate(row.session_date)} · {row.start_time?.slice(0,5) ?? ""}</option>)}</select>
          </label>
        </div>
        {classId && <div className="mt-3 flex flex-wrap items-end gap-2"><label className="space-y-1 text-xs font-semibold">Create register for date<input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="block h-10 rounded-lg border border-border bg-background px-2"/></label><Button type="button" variant="outline" disabled={busy || !date} onClick={() => void createLessonRegister()}>Open or create register</Button></div>}
      </section>
      <section className="space-y-2" aria-label="Suggested lesson registers">
        <h2 className="text-sm font-bold">Quick start attendance</h2>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 space-y-2"><h3 className="text-xs font-semibold text-muted-foreground">Upcoming lessons</h3>{upcoming.length ? upcoming.map(quickCard) : <p className="text-xs text-muted-foreground">No upcoming registers in the next 7 days.</p>}</div>
          <div className="min-w-0 space-y-2"><h3 className="text-xs font-semibold text-muted-foreground">Recently passed</h3>{recent.length ? recent.map(quickCard) : <p className="text-xs text-muted-foreground">No recent registers in the last 7 days.</p>}</div>
        </div>
      </section>

      {selectedSession ? <section ref={registerRef} className="min-w-0 scroll-mt-20 rounded-xl border border-border bg-card p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold">{selectedClass?.name}</h2><p className="text-xs text-muted-foreground">{prettyDate(selectedSession.session_date)}</p></div><Link to="/admin/classes/$id" params={{id:classId}} className="text-xs font-semibold text-primary underline">Open class</Link></div>
        <div className="mb-3 grid grid-cols-4 gap-1.5 sm:gap-2">{([{label:"Total",value:totals.total},{label:"Present",value:totals.present},{label:"Absent",value:totals.absent},{label:"Unmarked",value:totals.unmarked}]).map((item) => <div key={item.label} className="min-w-0 rounded-lg border border-border p-1.5 sm:p-2"><p className="truncate text-[9px] uppercase sm:text-[10px] text-muted-foreground">{item.label}</p><p className="text-lg font-bold">{item.value}</p></div>)}</div>
        <div className="mb-3 flex flex-wrap items-center gap-2"><Button type="button" variant="outline" disabled={busy || !totals.unmarked} onClick={() => void markAllPresent()}><ClipboardCheck className="mr-2 h-4 w-4"/>Mark unmarked present</Button><div className="relative min-w-[180px] flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search student" className="pl-9"/></div><select aria-label="Filter attendance" value={filter} onChange={(e)=>setFilter(e.target.value as Filter)} className="h-10 rounded-lg border border-border bg-background px-2 text-xs"><option value="all">All</option><option value="present">Present</option><option value="absent">Absent</option><option value="unmarked">Unmarked</option></select></div>
        <div className="space-y-2 lg:hidden" aria-label="Attendance register">
          {shown.map(student => {const mark=markFor(student.id);return <div key={student.id} className="min-w-0 rounded-xl border border-border bg-card p-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar initials={initialsOf(fullName(student))} tone={avatarTone(fullName(student))}/>
              <div className="min-w-0 flex-1">
                <Link to="/admin/students/$id" params={{id:student.id}} className="block truncate text-sm font-semibold hover:text-primary">{fullName(student)}</Link>
                <span className="block text-[11px] capitalize text-muted-foreground">{mark?.status ?? "Unmarked"}</span>
              </div>
              <div className="flex w-[132px] shrink-0 gap-1">
                <button type="button" aria-label={`Mark ${fullName(student)} present`} aria-pressed={mark?.status === "present" || mark?.status === "late"} disabled={busy} onClick={() => void markOne(selectedSession.id,student.id,"present")} className={`flex h-10 min-w-0 flex-1 flex-col items-center justify-center rounded-lg border text-[10px] font-semibold disabled:opacity-50 ${["present","late"].includes(mark?.status ?? "") ? "border-green-600 bg-green-600 text-white" : "border-green-200 text-green-700"}`}><Check className="h-4 w-4"/>Present</button>
                <button type="button" aria-label={`Mark ${fullName(student)} absent`} aria-pressed={mark?.status === "absent" || mark?.status === "excused"} disabled={busy} onClick={() => void markOne(selectedSession.id,student.id,"absent")} className={`flex h-10 min-w-0 flex-1 flex-col items-center justify-center rounded-lg border text-[10px] font-semibold disabled:opacity-50 ${["absent","excused"].includes(mark?.status ?? "") ? "border-red-500 bg-red-500 text-white" : "border-red-200 text-red-600"}`}><X className="h-4 w-4"/>Absent</button>
              </div>
            </div>
          </div>})}
          {!shown.length && <p className="p-3 text-sm text-muted-foreground">No students match this filter.</p>}
        </div>
        <div className="hidden lg:block max-h-[520px] overflow-auto rounded-lg border border-border" tabIndex={0} aria-label="Attendance register table">
          <table className="w-full min-w-[530px] border-collapse text-left text-sm"><thead className="sticky top-0 z-10 bg-muted text-xs uppercase"><tr><th scope="col" className="border-b border-border p-3">Student</th><th scope="col" className="border-b border-border p-3">Status</th><th scope="col" className="border-b border-border p-3">Attendance</th></tr></thead><tbody>{shown.map((student) => {const mark=markFor(student.id);return <tr key={student.id} className="border-b border-border last:border-0"><td className="p-3"><Link to="/admin/students/$id" params={{id:student.id}} className="flex items-center gap-2 font-semibold hover:text-primary"><Avatar initials={initialsOf(fullName(student))} tone={avatarTone(fullName(student))}/><span>{fullName(student)}</span></Link></td><td className="p-3 text-xs capitalize">{mark?.status ?? "Unmarked"}</td><td className="p-3">{markButtons(selectedSession.id,student.id,mark?.status ?? "")}</td></tr>})}</tbody></table>
          {!shown.length && <p className="p-4 text-sm text-muted-foreground">No students match this filter.</p>}
        </div>
      </section> : <section className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Choose a course and lesson to start taking attendance.</section>}
    </> : <>
      <section className="min-w-0 space-y-2" aria-label="Suggested students">
        <h2 className="text-sm font-bold">Suggested students</h2>
        <p className="text-xs text-muted-foreground">Recent lessons, prioritising outstanding registers.</p>
        {suggestedStudents.length ? <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">{suggestedStudents.map(item => <button type="button" key={item.student.id} onClick={() => {setStudentId(item.student.id);setJumpToRegister(true);}} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-primary hover:bg-primary/5"><Avatar initials={initialsOf(fullName(item.student))} tone={avatarTone(fullName(item.student))}/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{fullName(item.student)}</span><span className="block text-xs text-muted-foreground">{item.outstanding ? item.outstanding + " unmarked register(s)" : item.recentCount + " recent lesson(s)"}</span></span></button>)}</div> : <p className="text-xs text-muted-foreground">No recent student lessons to suggest.</p>}
      </section>
      <section className="rounded-xl border border-border bg-card p-4"><label className="block space-y-2 text-xs font-semibold">STUDENT<select value={studentId} onChange={(e)=>setStudentId(e.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"><option value="">Choose a student</option>{studentRows.map((row)=><option key={row.id} value={row.id}>{fullName(row)}</option>)}</select></label></section>
      {studentId ? <section ref={studentRegisterRef} className="scroll-mt-20 rounded-xl border border-border bg-card p-4"><h2 className="mb-3 font-bold">{fullName(studentRows.find((row)=>row.id===studentId))}</h2><div className="space-y-2 lg:hidden">{studentSessions.map(row=>{const mark=studentMarkFor(row.id);return <div key={row.id} className="min-w-0 space-y-2 rounded-xl border border-border p-3"><div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{classRows.find(c=>c.id===row.class_id)?.name ?? "Class"}</p><p className="text-xs text-muted-foreground">{prettyDate(row.session_date)}</p></div><span className="shrink-0 text-xs capitalize text-muted-foreground">{mark?.status ?? "Unmarked"}</span></div>{markButtons(row.id,studentId,mark?.status ?? "")}</div>})}{!studentSessions.length && <p className="text-sm text-muted-foreground">No lessons found for active enrolments.</p>}</div><div className="hidden max-h-[520px] overflow-auto rounded-lg border border-border lg:block" tabIndex={0}><table className="w-full min-w-[500px] text-left text-sm"><thead className="sticky top-0 z-10 bg-muted text-xs uppercase"><tr><th className="border-b border-border p-3">Lesson</th><th className="border-b border-border p-3">Status</th><th className="border-b border-border p-3">Attendance</th></tr></thead><tbody>{studentSessions.map((row)=>{const mark=studentMarkFor(row.id);return <tr key={row.id} className="border-b border-border"><td className="p-3"><span className="font-semibold">{classRows.find((c)=>c.id===row.class_id)?.name ?? "Class"}</span><span className="block text-xs text-muted-foreground">{prettyDate(row.session_date)}</span></td><td className="p-3 text-xs capitalize">{mark?.status ?? "Unmarked"}</td><td className="p-3">{markButtons(row.id,studentId,mark?.status ?? "")}</td></tr>})}</tbody></table>{!studentSessions.length && <p className="p-4 text-sm text-muted-foreground">No lessons found for active enrolments.</p>}</div></section> : <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Choose a student to review attendance across lessons.</p>}
    </>}
  </Page>;
}
