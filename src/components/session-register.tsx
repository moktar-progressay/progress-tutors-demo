import { toast } from "sonner";
import { Empty, Pill } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { fullName, num, useTable, useUpdateRow, useUpsert, type SessionRow } from "@/lib/db";

const STATUSES = ["present", "late", "absent", "excused"] as const;
export type AttendanceStatus = (typeof STATUSES)[number];

const toneFor = (s: string) =>
  s === "present" ? "green" : s === "late" ? "amber" : s === "absent" ? "pink" : "purple";

/**
 * Tutor sign-in + student register for one session.
 * Everything written here is shared: sign-in timestamps and attendance persist in the database.
 */
export function SessionRegister({ session }: { session: SessionRow }) {
  const students = useTable("students", "first_name");
  const enrolments = useTable("class_enrolments");
  const attendance = useTable("student_attendance");
  const signins = useTable("tutor_signins");
  const tutors = useTable("tutors");
  const classes = useTable("classes");
  const earnings = useTable("tutor_earnings");
  const reviews = useTable("lesson_reviews");

  const markAttendance = useUpsert("student_attendance");
  const updateAttendance = useUpdateRow("student_attendance");
  const signIn = useUpsert("tutor_signins");
  const createEarning = useUpsert("tutor_earnings");

  const roster = (enrolments.data ?? [])
    .filter((e) => e.class_id === session.class_id && e.status === "active")
    .map((e) => (students.data ?? []).find((s) => s.id === e.student_id))
    .filter(Boolean);

  const mySignIn = (signins.data ?? []).find((s) => s.session_id === session.id);
  const tutor = (tutors.data ?? []).find((t) => t.id === session.tutor_id);
  const klass = (classes.data ?? []).find((c) => c.id === session.class_id);
  const review = (reviews.data ?? []).find((r) => r.session_id === session.id);
  const earning = (earnings.data ?? []).find((e) => e.session_id === session.id);

  async function setStatus(studentId: string, status: AttendanceStatus) {
    const existing = (attendance.data ?? []).find(
      (a) => a.session_id === session.id && a.student_id === studentId,
    );
    if (existing) await updateAttendance.mutateAsync({ id: existing.id, values: { status } });
    else
      await markAttendance.mutateAsync({ session_id: session.id, student_id: studentId, status });
  }

  async function doSignIn() {
    if (!session.tutor_id) {
      toast.error("Assign a tutor to this lesson first");
      return;
    }
    await signIn.mutateAsync({ session_id: session.id, tutor_id: session.tutor_id });
    toast.success("Signed in — the timestamp is saved for everyone");
  }

  async function makeEligible() {
    if (!session.tutor_id) return;
    const rate = num(session.agreed_amount ?? klass?.session_rate ?? tutor?.hourly_rate);
    await createEarning.mutateAsync({
      tutor_id: session.tutor_id,
      session_id: session.id,
      class_id: session.class_id,
      earning_date: session.session_date,
      hours: 1,
      agreed_rate: rate,
      amount: rate,
      status: "eligible",
    });
    toast.success("Earning created from the agreed lesson amount");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Tutor sign-in</p>
          <p className="text-xs text-muted-foreground">
            {tutor ? fullName(tutor) : "Tutor not assigned"} ·{" "}
            {mySignIn
              ? `signed in ${new Date(mySignIn.signed_in_at).toLocaleString("en-GB")}`
              : "not signed in yet"}
          </p>
        </div>
        {mySignIn ? (
          <Pill tone="green">Signed in</Pill>
        ) : (
          <Button size="sm" onClick={doSignIn} disabled={!session.tutor_id}>
            Sign in
          </Button>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-bold">Student register</p>
        {roster.length === 0 ? (
          <Empty>No students enrolled in this class yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {roster.map((s) => {
              const record = (attendance.data ?? []).find(
                (a) => a.session_id === session.id && a.student_id === s!.id,
              );
              return (
                <li
                  key={s!.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-4 py-2"
                >
                  <span className="min-w-0 flex-1 text-sm font-semibold">{fullName(s!)}</span>
                  {STATUSES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(s!.id, st)}
                      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                        record?.status === st
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                  {record ? <Pill tone={toneFor(record.status)}>{record.status}</Pill> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Pay for this lesson</p>
          <p className="text-xs text-muted-foreground">
            Needs a tutor sign-in and a submitted lesson review. Uses the agreed lesson amount, not
            a timer.
          </p>
        </div>
        {earning ? (
          <Pill tone="green">Earning created</Pill>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={!mySignIn || !review}
            onClick={makeEligible}
          >
            Create earning
          </Button>
        )}
      </div>
    </div>
  );
}
