import { Check, Download, FileText, Plus, Save, Send, Share2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { fullName, initialsOf, money, num, prettyDate, type Row } from "@/lib/db";
import { Avatar, avatarTone } from "@/components/kit";
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
  const today = new Date().toLocaleDateString("en-CA");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [tutorSearch, setTutorSearch] = useState("");
  const [tutorPickerOpen, setTutorPickerOpen] = useState(false);
  const [tutorId, setTutorId] = useState("");
  const [reference, setReference] = useState(`PR-${Date.now().toString().slice(-6)}`);
  const [notes, setNotes] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [untilDate, setUntilDate] = useState(today);
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
    if (!id || (fromDate && untilDate && fromDate > untilDate)) {
      setLines([]);
      return;
    }
    const available = earnings
      .filter(
        (earning) =>
          earning.tutor_id === id &&
          !earning.payment_request_id &&
          earning.earning_date <= today &&
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

  };

  useEffect(() => {
    if (open && !savedRequest) loadHours();
  }, [open, tutorId, fromDate, untilDate, earnings, classes]);

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
        date: untilDate || today,
        hours: 1,
        amount: num(tutor?.hourly_rate),
        selected: true,
      },
    ]);

  const validate = () => {
    if (fromDate && untilDate && fromDate > untilDate) { toast.error("End date must not precede start date"); return false; }
    if (!tutorId) {
      toast.error("Select a tutor first");
      return false;
    }
    if (selectedLines.length === 0) {
      toast.error("Select or add at least one worked-hours line");
      return false;
    }
    if (selectedLines.some((line) => !line.description.trim() || !line.date || line.date > today || (fromDate && line.date < fromDate) || (untilDate && line.date > untilDate) || !Number.isFinite(line.hours) || !Number.isFinite(line.amount) || line.hours <= 0 || line.amount < 0)) {
      toast.error("Hours must be greater than zero and amounts cannot be negative");
      return false;
    }
    return true;
  };

  const save = async (status: "draft" | "submitted") => {
    if (!validate()) return;
    if (status === "submitted" && totalAmount <= 0) { toast.error("A submitted request must have a positive total"); return; }
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

  const documentData = {
      type: "payment_request",
      parentName: tutor ? fullName(tutor) : "Tutor",
      parentEmail: tutor?.email ?? "",
      studentName: "",
      documentDate: today,
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
    } as const;
  const exportPdf = () => {
    if (!validate()) return;
    downloadPaymentDocument(documentData);
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
      <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden rounded-none border-0 p-0 sm:h-[100dvh] sm:w-screen sm:max-w-none sm:rounded-none">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle>Create tutor payment request</DialogTitle>
          <DialogDescription>
            Select the tutor, check their worked hours, then save a draft or submit it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b p-2 xl:hidden"><Button variant={mobileTab === "edit" ? "default" : "ghost"} onClick={() => setMobileTab("edit")}>Edit</Button><Button variant={mobileTab === "preview" ? "default" : "ghost"} onClick={() => setMobileTab("preview")}>Preview</Button></div>
        <div className="grid min-h-0 flex-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className={`min-h-0 overflow-y-auto ${mobileTab === "edit" ? "block" : "hidden"} xl:block`}>
          <aside className="space-y-4 border-b border-border p-4 lg:overflow-y-auto lg:border-r lg:border-b-0">
            <div className="relative">
              <p className="mb-1 text-xs font-bold text-muted-foreground">Tutor</p>
              <button type="button" aria-expanded={tutorPickerOpen} onClick={() => { setTutorPickerOpen(!tutorPickerOpen); setTutorSearch(""); }} className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-left text-sm">
                {tutor ? <Avatar initials={initialsOf(fullName(tutor))} tone={avatarTone(fullName(tutor))} /> : null}
                <span className="flex-1">{tutor ? fullName(tutor) : "Select tutor"}</span><span aria-hidden="true">⌄</span>
              </button>
              {tutorPickerOpen ? <div className="absolute z-30 mt-1 w-full rounded-xl border border-border bg-popover p-2 shadow-lg" onKeyDown={(event) => { if (event.key === "Escape") setTutorPickerOpen(false); }}>
                <Input autoFocus placeholder="Search tutors" aria-label="Search tutors" value={tutorSearch} onChange={(event) => setTutorSearch(event.target.value)} />
                <div className="mt-2 max-h-64 overflow-y-auto">
                  {tutors.filter((item) => fullName(item).toLowerCase().includes(tutorSearch.toLowerCase())).map((item) => (
                    <button key={item.id} type="button" onClick={() => { if (item.id !== tutorId) { setTutorId(item.id); setSavedRequest(null); setLines([]); } setTutorPickerOpen(false); }} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted">
                      <Avatar initials={initialsOf(fullName(item))} tone={avatarTone(fullName(item))} />
                      <span className="min-w-0 flex-1 truncate">{fullName(item)}</span>
                      {item.id === tutorId ? <Check className="h-4 w-4 text-primary" /> : null}
                    </button>
                  ))}
                  {!tutors.some((item) => fullName(item).toLowerCase().includes(tutorSearch.toLowerCase())) ? <p className="p-3 text-sm text-muted-foreground">No matching tutors</p> : null}
                </div>
              </div> : null}
            </div>
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
                    <div className="grid gap-2 sm:grid-cols-[auto_minmax(100px,1fr)_minmax(120px,2fr)_65px_85px_auto] sm:items-end">
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
                            updateLine(index, { hours: num(event.target.value), amount: Math.round(num(event.target.value) * (line.hours > 0 ? line.amount / line.hours : num(tutor?.hourly_rate)) * 100) / 100 })
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
                    <p className="mt-1 text-xs text-muted-foreground">Hourly rate: {money(line.hours > 0 ? line.amount / line.hours : 0)}</p>
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
          <section className={`min-h-0 overflow-y-auto p-4 ${mobileTab === "preview" ? "block" : "hidden"} xl:block`}>
            <aside className="h-fit rounded-2xl border border-border bg-muted/40 p-3">
              <div className="mb-3">
                <p className="text-sm font-extrabold">Payment request preview</p>
                <p className="text-[11px] text-muted-foreground">Updates as you type</p>
              </div>
              <div className="rounded-xl border border-border bg-white p-5 text-slate-900 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-lg font-black">Progress<span className="text-pink-600">Tutors</span></p><p className="mt-1 text-[10px] text-slate-500">Progressay</p></div>
                  <div className="text-right"><p className="text-lg font-black">Payment request</p><p className="text-xs text-slate-500">{reference || "New draft"}</p></div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4 text-xs">
                  <div><p className="font-bold">Tutor</p><p className="mt-1 break-words text-slate-600">{tutor ? fullName(tutor) : "Choose a tutor"}</p></div>
                  <div className="text-right text-slate-600"><p>From: {period.from ? prettyDate(period.from) : "Not set"}</p><p>Until: {period.until ? prettyDate(period.until) : "Not set"}</p></div>
                </div>
                <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
                  <div className="grid grid-cols-[minmax(0,1fr)_35px_55px_65px] gap-1 bg-slate-100 px-2 py-2 text-[10px] font-bold"><span>Description</span><span>Hours</span><span>Rate</span><span className="text-right">Amount</span></div>
                  {selectedLines.length === 0 ? <p className="px-3 py-6 text-center text-xs text-slate-400">Select a tutor and add worked hours</p> : selectedLines.map((line,index) => (
                    <div key={line.earningId ?? index} className="grid grid-cols-[minmax(0,1fr)_35px_55px_65px] gap-1 border-t border-slate-100 px-2 py-2 text-[10px]">
                      <div className="break-words"><p className="font-semibold">{line.description || "Teaching session"}</p><p className="text-slate-500">{line.date ? prettyDate(line.date) : ""}</p></div><span>{line.hours}</span><span>{money(line.hours > 0 ? line.amount / line.hours : 0)}</span><span className="text-right font-bold">{money(line.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 ml-auto grid max-w-[230px] grid-cols-2 gap-y-2 text-xs">
                  <span className="text-slate-500">Total hours</span><span className="text-right">{totalHours}</span>
                  <span className="border-t border-slate-200 pt-2 font-black">Total</span><span className="border-t border-slate-200 pt-2 text-right text-base font-black">{money(totalAmount)}</span>
                  <span className="rounded-l-md bg-pink-50 px-2 py-2 font-bold text-pink-700">Requested amount</span><span className="rounded-r-md bg-pink-50 px-2 py-2 text-right font-black text-pink-700">{money(totalAmount)}</span>
                </div>
                {notes.trim() ? <div className="mt-5 text-xs"><p className="font-bold">Notes</p><p className="mt-1 whitespace-pre-wrap break-words text-slate-600">{notes}</p></div> : null}
              </div>
            </aside>
          </section>
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
