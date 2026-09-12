import { Download, ExternalLink, FileText } from "lucide-react";
import { useState } from "react";
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
  parents,
  students,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parents: ParentOption[];
  students: StudentOption[];
}) {
  const [data, setData] = useState<PaymentDocumentData>(emptyDocument);
  const update = <K extends keyof PaymentDocumentData>(key: K, value: PaymentDocumentData[K]) =>
    setData((current) => ({ ...current, [key]: value }));
  const title = data.type === "invoice" ? "Invoice" : "Childcare payment confirmation";

  const chooseParent = (id: string) => {
    const parent = parents.find((item) => item.id === id);
    if (parent)
      setData((current) => ({
        ...current,
        parentName: fullName(parent),
        parentEmail: parent.email ?? "",
      }));
  };
  const chooseStudent = (id: string) => {
    const student = students.find((item) => item.id === id);
    if (student) update("studentName", fullName(student));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-1rem)] max-w-6xl overflow-y-auto rounded-3xl p-0">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <DialogTitle>Create document</DialogTitle>
          <DialogDescription>
            Edit the details, review the preview, then download the PDF.
          </DialogDescription>
        </DialogHeader>
        <div className="grid lg:grid-cols-[380px_1fr]">
          <div className="space-y-3 border-b border-border p-4 lg:border-r lg:border-b-0">
            <Field label="Document type">
              <select
                value={data.type}
                onChange={(event) => update("type", event.target.value as PaymentDocumentType)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
              >
                <option value="childcare">Childcare confirmation</option>
                <option value="invoice">Invoice</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Choose parent">
                <select
                  defaultValue=""
                  onChange={(event) => chooseParent(event.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
                >
                  <option value="">Select</option>
                  {parents.map((item) => (
                    <option key={item.id} value={item.id}>
                      {fullName(item)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Choose student">
                <select
                  defaultValue=""
                  onChange={(event) => chooseStudent(event.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm"
                >
                  <option value="">Select</option>
                  {students.map((item) => (
                    <option key={item.id} value={item.id}>
                      {fullName(item)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
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

          <div className="bg-muted p-3 sm:p-6">
            <div className="mx-auto aspect-[210/297] w-full max-w-[640px] overflow-hidden rounded-xl bg-white shadow-lg">
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
                      <p className="font-bold">{data.parentName || "Parent name"}</p>
                      <p>{data.parentEmail || "Parent email"}</p>
                      <p className="mt-2">{data.documentDate}</p>
                    </div>
                  </div>
                  {data.type === "childcare" ? (
                    <ChildcarePreview data={data} />
                  ) : (
                    <InvoicePreview data={data} />
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 text-xs font-semibold text-muted-foreground">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function ChildcarePreview({ data }: { data: PaymentDocumentData }) {
  return (
    <div className="mt-8">
      <div className="flex justify-between gap-3">
        <p>Dear {data.parentName || "Parent"},</p>
        <p className="font-bold">{data.reference || "Reference"}</p>
      </div>
      <h3 className="mt-6 font-bold underline">Re: CHILDCARE CONFIRMATION FOR UNIVERSAL CREDIT</h3>
      <p className="mt-3 leading-relaxed">
        We confirm that the child named below attends our OFSTED registered childcare provision and
        that the charges shown relate to their childcare.
      </p>
      <div className="mt-4 border-2 border-slate-900 p-3 font-bold">
        {data.studentName || "Student name"}
      </div>
      <h3 className="mt-6 font-bold">Payment details</h3>
      <div className="mt-2 grid grid-cols-6 overflow-hidden border border-slate-900 text-center">
        <Cell head>Service</Cell>
        <Cell head>Hours</Cell>
        <Cell head>From</Cell>
        <Cell head>Until</Cell>
        <Cell head>Rate</Cell>
        <Cell head>Total</Cell>
        <Cell>{data.service}</Cell>
        <Cell>{data.hours}</Cell>
        <Cell>{data.fromDate}</Cell>
        <Cell>{data.untilDate}</Cell>
        <Cell>{data.rate}</Cell>
        <Cell>{data.total}</Cell>
      </div>
      <p className="mt-8">Yours sincerely,</p>
      <p className="mt-4 font-bold">Moktar Alqaderi (PGCE, QTS)</p>
      <p>CEO, Progressay</p>
    </div>
  );
}

function InvoicePreview({ data }: { data: PaymentDocumentData }) {
  return (
    <div className="mt-8">
      <div className="flex justify-between">
        <div>
          <p className="font-bold">Invoice {data.reference || "Draft"}</p>
          <p className="mt-4 font-bold">Bill to</p>
          <p>{data.parentName}</p>
          <p>For: {data.studentName}</p>
        </div>
        <p>Due: {data.dueDate}</p>
      </div>
      <div className="mt-8 grid grid-cols-[2fr_2fr_1fr] overflow-hidden border border-slate-300">
        <Cell head>Service</Cell>
        <Cell head>Period</Cell>
        <Cell head>Amount</Cell>
        <Cell>{data.service}</Cell>
        <Cell>
          {data.fromDate} - {data.untilDate}
        </Cell>
        <Cell>{data.total}</Cell>
      </div>
      <div className="mt-5 flex justify-end">
        <p className="border-t border-slate-500 px-4 pt-2 text-base font-extrabold">
          Total {data.total || "£0"}
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
          <p>{data.notes}</p>
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
