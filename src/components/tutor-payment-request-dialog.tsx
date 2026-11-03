import { Check, Download, FileText, Plus, Save, Send, Share2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEMO_DATE, fullName, money, num, prettyDate, type Row } from "@/lib/db";
import { downloadPaymentDocument } from "@/lib/payment-documents";

export type TutorPaymentRequestLine = {
  earningId: string | null;
  sessionId: string | null;
  description: string;
  date: string;
  hours: number;
  amount: number;
  selected: boolean;
};

export type TutorPaymentRequestValues = {
  requestId?: string;
  tutorId: string;
  reference: string;
  notes: string;
  status: "draft" | "submitted";
  lines: TutorPaymentRequestLine[];
};

type NewTutorValues = {
  firstName: string;
  lastName: string;
  email: string;
  hourlyRate: number;
};

export function TutorPaymentRequestDialog({
  open,
  onOpenChange,
  tutors,
  earnings,
  classes,
  busy,
  onAddTutor,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tutors: Row<"tutors">[];
  earnings: Row<"tutor_earnings">[];
  classes: Row<"classes">[];
  busy: boolean;
  onAddTutor: (values: NewTutorValues) => Promise<Row<"tutors">>;
  onSave: (values: TutorPaymentRequestValues) => Promise<Row<"payment_requests">>;
}) {
  const [tutorId, setTutorId] = useState("");
  const [reference, setReference] = useState(`PR-${Date.now().toString().slice(-6)}`);
  const [notes, setNotes] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [untilDate, setUntilDate] = useState(DEMO_DATE);
  const [lines, setLines] = useState<TutorPaymentRequestLine[]>([]);
  const [addingTutor, setAddingTutor] = useState(false);
  const [newTutor, setNewTutor] = useState({
    firstName: "",
    lastName: "",
    email: "",
    hourlyRate: "",
  });
  const [savedRequest, setSavedRequest] = useState<Row<"payment_requests"> | null>(null);

  const tutor = tutors.find((item) => item.id === tutorId);
  const selectedLines = lines.filter((line) => line.selected);
  const totalHours = selectedLines.reduce((total, line) => total + num(line.hours), 0);
  const totalAmount = selectedLines.reduce((total, line) => total + num(line.amount), 0);
  const period = useMemo(() => {
    const dates = selectedLines
      .map((line) => line.date)
      .filter(Boolean)
      .sort();
    return {
      from: dates[0] ?? fromDate,
      until: dates.at(-1) ?? untilDate,
    };
  }, [fromDate, selectedLines, untilDate]);

  const loadHours = (id = tutorId) => {
    if (!id) {
      setLines([]);
      return;
    }
    const available = earnings
      .filter(
        (earning) =>
          earning.tutor_id === id &&
          !earning.payment_request_id &&
          earning.status !== "paid" &&
          earning.status !== "claimed" &&
          (!fromDate || earning.earning_date >= fromDate) &&
          (!untilDate || earning.earning_date <= untilDate),
      )
      .map((earning) => ({
        earningId: earning.id,
        sessionId: earning.session_id,
        description:
          classes.find((lesson) => lesson.id === earning.class_id)?.name ??
          earning.note ??
          "Teaching session",
        date: earning.earning_date,
        hours: num(earning.hours),
        amount: num(earning.amount),
        selected: true,
      }));
    setLines(available);
    if (available.length === 0) toast.info("No unclaimed worked hours found for this period");
  };

  const updateLine = (index: number, values: Partial<TutorPaymentRequestLine>) =>
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...values } : line)),
    );

  const addManualLine = () =>
    setLines((current) => [
      ...current,
      {
        earningId: null,
        sessionId: null,
        description: "Additional teaching work",
        date: untilDate || DEMO_DATE,
        hours: 1,
        amount: num(tutor?.hourly_rate),
        selected: true,
      },
    ]);

  const validate = () => {
    if (!tutorId) {
      toast.error("Select a tutor first");
      return false;
    }
    if (selectedLines.length === 0) {
      toast.error("Select or add at least one worked-hours line");
      return false;
    }
    if (selectedLines.some((line) => line.hours <= 0 || line.amount < 0)) {
      toast.error("Hours must be greater than zero and amounts cannot be negative");
      return false;
    }
    return true;
  };

  const save = async (status: "draft" | "submitted") => {
    if (!validate()) return;
    try {
      const request = await onSave({
        ...(savedRequest ? { requestId: savedRequest.id } : {}),
        tutorId,
        reference,
        notes,
        status,
        lines: selectedLines,
      });
      setSavedRequest(request);
      setReference(request.reference ?? reference);
      toast.success(
        status === "draft" ? "Payment request draft saved" : "Payment request submitted",
      );
      if (status === "submitted") onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the payment request");
    }
  };

  const exportPdf = () => {
    if (!validate()) return;
    downloadPaymentDocument({
      type: "payment_request",
      parentName: tutor ? fullName(tutor) : "Tutor",
      parentEmail: tutor?.email ?? "",
      studentName: "",
      documentDate: DEMO_DATE,
      reference,
      service: `${selectedLines.length} teaching line${selectedLines.length === 1 ? "" : "s"}`,
      hours: String(totalHours),
      fromDate: period.from,
      untilDate: period.until,
      rate: "",
      total: money(totalAmount),
      dueDate: "",
      paymentLink: "",
      notes,
    });
    toast.success("Payment request PDF downloaded");
  };

  const share = async () => {
    if (!validate()) return;
    const summary = `${reference}: ${fullName(tutor)} · ${totalHours} hours · ${money(totalAmount)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Tutor payment request",
          text: summary,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(`${summary}\n${window.location.href}`);
        toast.success("Share summary copied");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Could not share this request");
    }
  };

  const createTutor = async () => {
    if (!newTutor.firstName.trim()) {
      toast.error("Add the tutor's first name");
      return;
    }
    try {
      const created = await onAddTutor({
        firstName: newTutor.firstName.trim(),
        lastName: newTutor.lastName.trim(),
        email: newTutor.email.trim(),
        hourlyRate: num(newTutor.hourlyRate),
      });
      setTutorId(created.id);
      setAddingTutor(false);
      setNewTutor({ firstName: "", lastName: "", email: "", hourlyRate: "" });
      toast.success("Tutor added. Add a manual line or load their hours.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the tutor");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden rounded-none border-0 p-0 sm:h-[calc(100dvh-1rem)] sm:w-[calc(100vw-1rem)] sm:max-w-5xl sm:rounded-2xl sm:border">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle>Create tutor payment request</DialogTitle>
          <DialogDescription>
            Select the tutor, check their worked hours, then save a draft or submit it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[360px_1fr] lg:overflow-hidden">
          <aside className="space-y-4 border-b border-border p-4 lg:overflow-y-auto lg:border-r lg:border-b-0">
            <label className="block text-xs font-bold text-muted-foreground">
              Tutor
              <select
                value={tutorId}
                onChange={(event) => {
                  setTutorId(event.target.value);
                  setSavedRequest(null);
                  setLines([]);
                }}
                className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
              >
                <option value="">Select tutor</option>
                {tutors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {fullName(item)}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setAddingTutor((value) => !value)}
            >
              <Plus className="h-4 w-4" /> Add new tutor
            </Button>

            {addingTutor ? (
              <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
                <p className="text-sm font-extrabold">New tutor</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newTutor.firstName}
                    onChange={(event) =>
                      setNewTutor((current) => ({ ...current, firstName: event.target.value }))
                    }
                    placeholder="First name"
                  />
                  <Input
                    value={newTutor.lastName}
                    onChange={(event) =>
                      setNewTutor((current) => ({ ...current, lastName: event.target.value }))
                    }
                    placeholder="Last name"
                  />
                </div>
                <Input
                  type="email"
                  value={newTutor.email}
                  onChange={(event) =>
                    setNewTutor((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="Email"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newTutor.hourlyRate}
                  onChange={(event) =>
                    setNewTutor((current) => ({ ...current, hourlyRate: event.target.value }))
                  }
                  placeholder="Hourly rate (£)"
                />
                <Button type="button" size="sm" onClick={createTutor} disabled={busy}>
                  <Check className="h-4 w-4" /> Add tutor
                </Button>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-bold text-muted-foreground">
                From
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="mt-1"
                />
              </label>
              <label className="text-xs font-bold text-muted-foreground">
                Until
                <Input
                  type="date"
                  value={untilDate}
                  onChange={(event) => setUntilDate(event.target.value)}
                  className="mt-1"
                />
              </label>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => loadHours()}
              disabled={!tutorId}
            >
              Load worked hours
            </Button>

            <label className="block text-xs font-bold text-muted-foreground">
              Reference
              <Input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                className="mt-1"
              />
            </label>
            <label className="block text-xs font-bold text-muted-foreground">
              Notes
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-1 min-h-24"
                placeholder="Optional note for the office"
              />
            </label>
            {savedRequest ? (
              <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
                <p className="font-extrabold">Saved</p>
                <p>
                  {savedRequest.reference} · {savedRequest.status}
                </p>
              </div>
            ) : null}
          </aside>

          <main className="space-y-4 p-4 lg:overflow-y-auto sm:p-5">
            <div className="grid grid-cols-3 gap-2">
              <Summary label="Lines" value={String(selectedLines.length)} />
              <Summary label="Hours" value={String(totalHours)} />
              <Summary label="Total" value={money(totalAmount)} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold">Worked hours</h3>
                <p className="text-xs text-muted-foreground">
                  Untick a line to exclude it. Hours and amounts can be corrected before saving.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={addManualLine}
                disabled={!tutorId}
              >
                <Plus className="h-4 w-4" /> Add line
              </Button>
            </div>

            {lines.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <FileText className="mx-auto h-7 w-7 text-muted-foreground" />
                <p className="mt-2 text-sm font-bold">No hours loaded</p>
                <p className="text-xs text-muted-foreground">
                  Select a tutor and load their hours, or add a manual line.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {lines.map((line, index) => (
                  <article
                    key={`${line.earningId ?? "manual"}-${index}`}
                    className={`rounded-xl border p-3 ${line.selected ? "border-primary/40 bg-primary/5" : "border-border opacity-60"}`}
                  >
                    <div className="grid gap-2 sm:grid-cols-[auto_130px_1fr_90px_110px_auto] sm:items-end">
                      <input
                        type="checkbox"
                        checked={line.selected}
                        onChange={(event) => updateLine(index, { selected: event.target.checked })}
                        className="h-5 w-5 accent-primary"
                        aria-label={`Include ${line.description}`}
                      />
                      <label className="text-[10px] font-bold text-muted-foreground">
                        Date
                        <Input
                          type="date"
                          value={line.date}
                          onChange={(event) => updateLine(index, { date: event.target.value })}
                          className="mt-1 h-9"
                        />
                      </label>
                      <label className="text-[10px] font-bold text-muted-foreground">
                        Description
                        <Input
                          value={line.description}
                          onChange={(event) =>
                            updateLine(index, { description: event.target.value })
                          }
                          className="mt-1 h-9"
                        />
                      </label>
                      <label className="text-[10px] font-bold text-muted-foreground">
                        Hours
                        <Input
                          type="number"
                          min="0.25"
                          step="0.25"
                          value={line.hours}
                          onChange={(event) =>
                            updateLine(index, { hours: num(event.target.value) })
                          }
                          className="mt-1 h-9"
                        />
                      </label>
                      <label className="text-[10px] font-bold text-muted-foreground">
                        Amount (£)
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.amount}
                          onChange={(event) =>
                            updateLine(index, { amount: num(event.target.value) })
                          }
                          className="mt-1 h-9"
                        />
                      </label>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Remove line"
                        onClick={() =>
                          setLines((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {line.earningId ? (
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        Imported from confirmed tutor earnings · {prettyDate(line.date)}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </main>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button type="button" variant="ghost" onClick={share}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button type="button" variant="secondary" onClick={exportPdf}>
            <Download className="h-4 w-4" /> Export PDF
          </Button>
          <Button type="button" variant="secondary" onClick={() => save("draft")} disabled={busy}>
            <Save className="h-4 w-4" /> Save draft
          </Button>
          <Button type="button" onClick={() => save("submitted")} disabled={busy}>
            <Send className="h-4 w-4" /> Submit
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <strong className="block text-lg">{value}</strong>
      <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}
