import { Download, ExternalLink, FileText, Undo2, Redo2, Save, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode } from "react";
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
import { DEMO_DATE, fullName } from "@/lib/db";
import {
  downloadPaymentDocument,
  type PaymentDocumentData,
  type PaymentDocumentType,
} from "@/lib/payment-documents";

type ParentOption = {
  id: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
};
type StudentOption = { id: string; first_name: string; last_name?: string | null };
type ParentStudentOption = { parent_id: string; student_id: string };

const emptyDocument = (): PaymentDocumentData => ({
  type: "childcare",
  parentName: "",
  parentEmail: "",
  studentName: "",
  documentDate: DEMO_DATE,
  reference: "URN: 2801807",
  service: "Childcare",
  hours: "",
  fromDate: "",
  untilDate: "",
  rate: "",
  total: "",
  dueDate: DEMO_DATE,
  paymentLink: "",
  notes: "",
});

export function PaymentDocumentDialog({
  open,
  onOpenChange,
  onCreateTutorRequest,
  parents,
  students,
  links,
  initialParentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTutorRequest?: () => void;
  parents: ParentOption[];
  students: StudentOption[];
  links: ParentStudentOption[];
  initialParentId?: string;
}) {
  const [data, setData] = useState<PaymentDocumentData>(emptyDocument);
  const [parentId, setParentId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [parentSearch, setParentSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [drafts, setDrafts] = useState<Array<{id:string;parent_id:string|null;student_id:string|null;document_data:unknown;updated_at:string}>>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [history, setHistory] = useState<PaymentDocumentData[]>([]);
  const [future, setFuture] = useState<PaymentDocumentData[]>([]);
  const [dirty, setDirty] = useState(false);
  const currentData = useRef(data);
  currentData.current = data;
  const applyChange = (key: keyof PaymentDocumentData, value: string) => {
    const current = currentData.current;
    if (current[key] === value) return;
    setHistory((previous) => [...previous.slice(-29), current]);
    setFuture([]);
    setDirty(true);
    setData({ ...current, [key]: value });
  };
  const undo = () => {
    if (!history.length) return;
    setFuture((previous) => [currentData.current, ...previous]);
    setData(history[history.length - 1]!);
    setHistory((previous) => previous.slice(0, -1));
    setDirty(true);
  };
  const redo = () => {
    if (!future.length) return;
    setHistory((previous) => [...previous, currentData.current]);
    setData(future[0]!);
    setFuture((previous) => previous.slice(1));
    setDirty(true);
  };
  useEffect(() => {
    if (!open) return;
    if (initialParentId) {
      const parent = parents.find((item) => item.id === initialParentId);
      if (parent) {
        setParentId(parent.id);
        setData((current) => ({...current, parentName: fullName(parent), parentEmail: parent.email ?? ""}));
      }
    }
    void supabase.from("payment_document_drafts").select("id,parent_id,student_id,document_data,updated_at").order("updated_at", {ascending:false}).then(({data:rows,error}) => {
      if (error) toast.error("Could not load document drafts");
      else setDrafts(rows ?? []);
    });
  }, [open, initialParentId]);
  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      const values = {parent_id:parentId || null,student_id:studentId || null,document_type:data.type,document_data:JSON.parse(JSON.stringify(data)),updated_at:new Date().toISOString()};
      const result = activeDraftId
        ? await supabase.from("payment_document_drafts").update(values).eq("id",activeDraftId).select("id,parent_id,student_id,document_data,updated_at").single()
        : await supabase.from("payment_document_drafts").insert(values).select("id,parent_id,student_id,document_data,updated_at").single();
      if (result.error || !result.data) throw result.error ?? new Error("Could not save draft");
      setActiveDraftId(result.data.id);
      setDrafts((current) => [result.data, ...current.filter((item) => item.id !== result.data.id)]);
      setDirty(false);
      toast.success("Draft saved securely. You can return to it later.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save draft"); }
    finally { setSavingDraft(false); }
  };
  const restoreDraft = (id:string) => {
    const draft = drafts.find((item) => item.id === id);
    if (!draft) return;
    setActiveDraftId(id);
    setParentId(draft.parent_id ?? "");
    setStudentId(draft.student_id ?? "");
    setData(draft.document_data as PaymentDocumentData);
    setHistory([]); setFuture([]); setDirty(false);
    toast.success("Draft restored");
  };
  const update = <K extends keyof PaymentDocumentData>(key: K, value: PaymentDocumentData[K]) => applyChange(key, value);
  const title = data.type === "invoice" ? "Invoice" : "Childcare payment confirmation";
  const children = useMemo(() => {
    const childIds = new Set(
      links.filter((link) => link.parent_id === parentId).map((link) => link.student_id),
    );
    return students.filter((student) => childIds.has(student.id));
  }, [links, parentId, students]);

  const chooseParent = (id: string) => {
    setParentId(id);
    const parent = parents.find((item) => item.id === id);
    const selectedChildBelongsToParent = links.some(
      (link) => link.parent_id === id && link.student_id === studentId,
    );
    if (!selectedChildBelongsToParent) setStudentId("");
    setData((current) => ({
      ...current,
      parentName: parent ? fullName(parent) : "",
      parentEmail: parent?.email ?? "",
      studentName: selectedChildBelongsToParent ? current.studentName : "",
    }));
  };
  const chooseStudent = (id: string) => {
    setStudentId(id);
    const student = students.find((item) => item.id === id);
    update("studentName", student ? fullName(student) : "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden rounded-none border-0 p-0 sm:h-[calc(100dvh-1rem)] sm:w-[calc(100vw-1rem)] sm:max-w-none sm:rounded-2xl sm:border">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-3 text-left">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-8">
            <div><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />{title}</DialogTitle>
              <DialogDescription className="mt-1 text-xs">Edit on the document or using the form · {dirty ? "Unsaved changes" : activeDraftId ? "Draft saved" : "New document"}</DialogDescription></div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" aria-label="Undo" disabled={!history.length} onClick={undo}><Undo2 className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" aria-label="Redo" disabled={!future.length} onClick={redo}><Redo2 className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" disabled={savingDraft} onClick={saveDraft}><Save className="h-4 w-4" /> {savingDraft ? "Saving…" : "Save draft"}</Button>
            </div>
          </div>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="min-h-0 space-y-3 overflow-y-auto border-b border-border p-4 lg:border-r lg:border-b-0">
            <Field label="Document type">
              <select
                value={data.type}
                onChange={(event) => {
                  const type = event.target.value as PaymentDocumentType;
                  if (type === "payment_request") {
                    onOpenChange(false);
                    onCreateTutorRequest?.();
                    return;
                  }
                  update("type", type);
                }}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              >
                <option value="childcare">Childcare confirmation</option>
                <option value="invoice">Invoice</option>
                <option value="payment_request">Tutor payment request</option>
              </select>
            </Field>
            <div className="space-y-2 rounded-xl border border-border p-3">
              <label className="text-xs font-semibold">Saved drafts</label>
              <select className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm" value={activeDraftId ?? ""} onChange={(event) => { if (event.target.value) restoreDraft(event.target.value); }}><option value="">New document / choose a draft</option>{drafts.map((draft) => <option key={draft.id} value={draft.id}>{(draft.document_data as PaymentDocumentData).parentName || "Untitled"} · {(draft.document_data as PaymentDocumentData).type} · {new Date(draft.updated_at).toLocaleDateString("en-GB")}</option>)}</select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Find parent">
                <Input value={parentSearch} onChange={(event) => setParentSearch(event.target.value)} placeholder="Search name or email"/>
                <select value={parentId} onChange={(event) => chooseParent(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select parent</option>{parents.filter((item) => item.id === parentId || [fullName(item),item.email ?? ""].join(" ").toLowerCase().includes(parentSearch.toLowerCase())).slice(0,60).map((item) => <option key={item.id} value={item.id}>{fullName(item)}</option>)}</select>
              </Field>
              <Field label="Find student">
                <Input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search child name"/>
                <select value={studentId} onChange={(event) => chooseStudent(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="">Select child</option>{students.filter((item) => item.id === studentId || fullName(item).toLowerCase().includes(studentSearch.toLowerCase())).slice(0,60).map((item) => <option key={item.id} value={item.id}>{fullName(item)}{children.some((child) => child.id === item.id) ? "" : " (not linked)"}</option>)}</select>
              </Field>
            </div>
            {studentId && parentId && !links.some((item) => item.parent_id === parentId && item.student_id === studentId) ? <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">This child is not linked to the selected parent. Verify the relationship before issuing the document.</p> : null}
            <Link to="/admin/students" className="text-xs font-semibold text-primary underline">Add a new student in Contacts</Link>
            <Field label="Parent name">
              <Input
                value={data.parentName}
                onChange={(event) => update("parentName", event.target.value)}
              />
            </Field>
            <Field label="Parent email">
              <Input
                type="email"
                value={data.parentEmail}
                onChange={(event) => update("parentEmail", event.target.value)}
              />
            </Field>
            <Field label="Student name">
              <Input
                value={data.studentName}
                onChange={(event) => update("studentName", event.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Document date">
                <Input
                  type="date"
                  value={data.documentDate}
                  onChange={(event) => update("documentDate", event.target.value)}
                />
              </Field>
              <Field label={data.type === "invoice" ? "Invoice number" : "Reference / URN"}>
                <Input
                  value={data.reference}
                  onChange={(event) => update("reference", event.target.value)}
                />
              </Field>
            </div>
            <Field label="Service">
              <Input
                value={data.service}
                onChange={(event) => update("service", event.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="From">
                <Input
                  type="date"
                  value={data.fromDate}
                  onChange={(event) => update("fromDate", event.target.value)}
                />
              </Field>
              <Field label="Until">
                <Input
                  type="date"
                  value={data.untilDate}
                  onChange={(event) => update("untilDate", event.target.value)}
                />
              </Field>
            </div>
            {data.type === "childcare" ? (
              <div className="grid grid-cols-3 gap-2">
                <Field label="Hours">
                  <Input
                    value={data.hours}
                    onChange={(event) => update("hours", event.target.value)}
                  />
                </Field>
                <Field label="Rate">
                  <Input
                    placeholder="£30ph"
                    value={data.rate}
                    onChange={(event) => update("rate", event.target.value)}
                  />
                </Field>
                <Field label="Total">
                  <Input
                    placeholder="£1,200"
                    value={data.total}
                    onChange={(event) => update("total", event.target.value)}
                  />
                </Field>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Due date">
                    <Input
                      type="date"
                      value={data.dueDate}
                      onChange={(event) => update("dueDate", event.target.value)}
                    />
                  </Field>
                  <Field label="Total">
                    <Input
                      placeholder="£0"
                      value={data.total}
                      onChange={(event) => update("total", event.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Stripe payment link (optional)">
                  <Input
                    type="url"
                    placeholder="https://buy.stripe.com/..."
                    value={data.paymentLink}
                    onChange={(event) => update("paymentLink", event.target.value)}
                  />
                </Field>
                <Field label="Notes">
                  <Textarea
                    value={data.notes}
                    onChange={(event) => update("notes", event.target.value)}
                    className="min-h-16"
                  />
                </Field>
              </>
            )}
          </div>

          <div className="min-h-0 overflow-y-auto bg-muted p-3 sm:p-6">
            <div className="mx-auto aspect-[210/297] w-full max-w-[720px] rounded-lg bg-white shadow-lg">
              <div className="flex h-full flex-col text-slate-900">
                <div className="bg-primary px-6 py-5 text-xl font-extrabold text-white sm:px-10 sm:text-2xl">
                  {title.toUpperCase()}
                </div>
                <div className="flex flex-1 flex-col p-5 text-[9px] sm:p-10 sm:text-xs">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-bold">Progressay Impact CIC</p>
                      <p>196 Freston Road</p>
                      <p>London, W10 6TT</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold"><InlineField field="parentName" value={data.parentName} placeholder="Parent name" onCommit={applyChange} /></p>
                      <p><InlineField field="parentEmail" value={data.parentEmail} placeholder="Parent email" onCommit={applyChange} /></p>
                      <p className="mt-2"><InlineField field="documentDate" value={data.documentDate} placeholder="YYYY-MM-DD" onCommit={applyChange} /></p>
                    </div>
                  </div>
                  {data.type === "childcare" ? (
                    <ChildcarePreview data={data} onCommit={applyChange} />
                  ) : (
                    <InvoicePreview data={data} onCommit={applyChange} />
                  )}
                  <p className="mt-auto border-t pt-3 text-center text-[7px] text-slate-500 sm:text-[9px]">
                    Progressay Impact CIC · Company number 12294686 · www.progressayimpact.co.uk
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="secondary" onClick={saveDraft} disabled={savingDraft}>{savingDraft ? "Saving…" : "Save draft"}</Button>
          {data.type === "invoice" && data.paymentLink ? (
            <Button
              variant="secondary"
              onClick={() => window.open(data.paymentLink, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="h-4 w-4" /> Test Stripe link
            </Button>
          ) : null}
          <Button
            onClick={() => {
              if (!data.parentName || !data.studentName || !data.total) {
                toast.error("Add the parent, student and total first");
                return;
              }
              downloadPaymentDocument(data);
              toast.success("PDF downloaded");
            }}
          >
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InlineField({field,value,placeholder,onCommit}:{
  field:keyof PaymentDocumentData;value:string;placeholder:string;
  onCommit:(field:keyof PaymentDocumentData,value:string)=>void;
}) {
  const element=useRef<HTMLSpanElement>(null);
  useEffect(()=>{if(element.current && document.activeElement!==element.current) element.current.textContent=value||placeholder;},[value,placeholder]);
  return <span ref={element} role="textbox" aria-label={field} contentEditable suppressContentEditableWarning tabIndex={0}
    onFocus={event=>{if(!value && event.currentTarget.textContent===placeholder)event.currentTarget.textContent="";}}
    onBlur={()=>{const next=element.current?.textContent?.trim()??"";onCommit(field,next===placeholder&&!value?"":next);}}
    onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();event.currentTarget.blur();}if(event.key==="Escape"){event.currentTarget.textContent=value||placeholder;event.currentTarget.blur();}}}
    className="inline-block min-w-5 cursor-text rounded-sm border-b border-dashed border-primary/50 px-0.5 outline-none hover:bg-primary/10 focus:bg-primary/10 focus:ring-2 focus:ring-primary/40"
    title="Click to edit">{value||placeholder}</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 text-xs font-semibold text-muted-foreground">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function ChildcarePreview({ data, onCommit }: { data: PaymentDocumentData; onCommit: (key: keyof PaymentDocumentData, value: string) => void }) {
  return (
    <div className="mt-8">
      <div className="flex justify-between gap-3">
        <p>Dear <InlineField field="parentName" value={data.parentName} placeholder="Parent" onCommit={onCommit} />,</p>
        <p className="font-bold"><InlineField field="reference" value={data.reference} placeholder="Reference" onCommit={onCommit} /></p>
      </div>
      <h3 className="mt-6 font-bold underline">Re: CHILDCARE CONFIRMATION FOR UNIVERSAL CREDIT</h3>
      <p className="mt-3 leading-relaxed">
        We confirm that the child named below attends our OFSTED registered childcare provision and
        that the charges shown relate to their childcare.
      </p>
      <div className="mt-4 border-2 border-slate-900 p-3 font-bold">
        <InlineField field="studentName" value={data.studentName} placeholder="Student name" onCommit={onCommit} />
      </div>
      <h3 className="mt-6 font-bold">Payment details</h3>
      <div className="mt-2 grid grid-cols-6 overflow-hidden border border-slate-900 text-center">
        <Cell head>Service</Cell>
        <Cell head>Hours</Cell>
        <Cell head>From</Cell>
        <Cell head>Until</Cell>
        <Cell head>Rate</Cell>
        <Cell head>Total</Cell>
        <Cell><InlineField field="service" value={data.service} placeholder="service" onCommit={onCommit} /></Cell>
        <Cell><InlineField field="hours" value={data.hours} placeholder="hours" onCommit={onCommit} /></Cell>
        <Cell><InlineField field="fromDate" value={data.fromDate} placeholder="fromDate" onCommit={onCommit} /></Cell>
        <Cell><InlineField field="untilDate" value={data.untilDate} placeholder="untilDate" onCommit={onCommit} /></Cell>
        <Cell><InlineField field="rate" value={data.rate} placeholder="rate" onCommit={onCommit} /></Cell>
        <Cell><InlineField field="total" value={data.total} placeholder="total" onCommit={onCommit} /></Cell>
      </div>
      <p className="mt-8">Yours sincerely,</p>
      <p className="mt-4 font-bold">Moktar Alqaderi (PGCE, QTS)</p>
      <p>CEO, Progressay</p>
    </div>
  );
}

function InvoicePreview({ data, onCommit }: { data: PaymentDocumentData; onCommit: (key: keyof PaymentDocumentData, value: string) => void }) {
  return (
    <div className="mt-8">
      <div className="flex justify-between">
        <div>
          <p className="font-bold">Invoice <InlineField field="reference" value={data.reference} placeholder="Draft" onCommit={onCommit} /></p>
          <p className="mt-4 font-bold">Bill to</p>
          <p><InlineField field="parentName" value={data.parentName} placeholder="Parent" onCommit={onCommit} /></p>
          <p>For: <InlineField field="studentName" value={data.studentName} placeholder="Student" onCommit={onCommit} /></p>
        </div>
        <p>Due: <InlineField field="dueDate" value={data.dueDate} placeholder="YYYY-MM-DD" onCommit={onCommit} /></p>
      </div>
      <div className="mt-8 grid grid-cols-[2fr_2fr_1fr] overflow-hidden border border-slate-300">
        <Cell head>Service</Cell>
        <Cell head>Period</Cell>
        <Cell head>Amount</Cell>
        <Cell><InlineField field="service" value={data.service} placeholder="service" onCommit={onCommit} /></Cell>
        <Cell>
          <InlineField field="fromDate" value={data.fromDate} placeholder="From" onCommit={onCommit} /> - <InlineField field="untilDate" value={data.untilDate} placeholder="Until" onCommit={onCommit} />
        </Cell>
        <Cell><InlineField field="total" value={data.total} placeholder="total" onCommit={onCommit} /></Cell>
      </div>
      <div className="mt-5 flex justify-end">
        <p className="border-t border-slate-500 px-4 pt-2 text-base font-extrabold">
          Total <InlineField field="total" value={data.total} placeholder="£0" onCommit={onCommit} />
        </p>
      </div>
      {data.paymentLink ? (
        <div className="mt-6 ml-auto w-fit rounded-lg bg-primary px-5 py-2 font-bold text-white">
          PAY ONLINE
        </div>
      ) : null}
      {data.notes ? (
        <div className="mt-6">
          <p className="font-bold">Notes</p>
          <p><InlineField field="notes" value={data.notes} placeholder="Notes" onCommit={onCommit} /></p>
        </div>
      ) : null}
    </div>
  );
}

function Cell({ children, head }: { children: ReactNode; head?: boolean }) {
  return (
    <div className={`${head ? "bg-slate-100 font-bold" : ""} min-w-0 border border-slate-300 p-2`}>
      {children}
    </div>
  );
}
