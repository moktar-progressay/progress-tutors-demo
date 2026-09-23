import { ArrowLeft, Save, Trash2, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Avatar, avatarTone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fullName,
  initialsOf,
  money,
  type ParentRow,
  type Row,
  type StudentRow,
} from "@/lib/db";

export type InvoiceEditValues = {
  parent_id: string;
  issue_date: string;
  due_date: string | null;
  status: string;
  notes: string | null;
  item: {
    id: string | null;
    student_id: string | null;
    billing_plan_id: string | null;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
  };
};

type Props = {
  invoice: Row<"billing_invoices">;
  item: Row<"billing_invoice_items"> | undefined;
  parents: ParentRow[];
  students: StudentRow[];
  plans: Row<"billing_plans">[];
  busy: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onSave: (values: InvoiceEditValues) => Promise<void>;
};

export function InvoiceEditScreen({
  invoice,
  item,
  parents,
  students,
  plans,
  busy,
  onCancel,
  onDelete,
  onSave,
}: Props) {
  const [parentId, setParentId] = useState(invoice.parent_id);
  const [issueDate, setIssueDate] = useState(
    invoice.issue_date ?? invoice.created_at.slice(0, 10),
  );
  const [dueDate, setDueDate] = useState(invoice.due_date ?? "");
  const [status, setStatus] = useState(invoice.status);
  const [notes, setNotes] = useState(invoice.notes ?? "");
  const [studentId, setStudentId] = useState(item?.student_id ?? "");
  const [planId, setPlanId] = useState(item?.billing_plan_id ?? "");
  const [description, setDescription] = useState(item?.description ?? "Tuition");
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1));
  const [unitPrice, setUnitPrice] = useState(String(item?.unit_price ?? invoice.total));
  const [taxRate, setTaxRate] = useState(String(item?.tax_rate ?? 0));

  const client = parents.find((parent) => parent.id === parentId);
  const subtotal = useMemo(
    () => Number(quantity || 0) * Number(unitPrice || 0),
    [quantity, unitPrice],
  );
  const tax = subtotal * (Number(taxRate || 0) / 100);
  const total = subtotal + tax;

  const choosePlan = (id: string) => {
    setPlanId(id);
    const plan = plans.find((entry) => entry.id === id);
    if (plan) {
      setDescription(plan.name);
      setUnitPrice(String(plan.unit_amount));
    }
  };

  const save = async () => {
    if (!parentId || !description.trim() || Number(quantity) <= 0 || Number(unitPrice) < 0) return;
    await onSave({
      parent_id: parentId,
      issue_date: issueDate,
      due_date: dueDate || null,
      status,
      notes: notes.trim() || null,
      item: {
        id: item?.id ?? null,
        student_id: studentId || null,
        billing_plan_id: planId || null,
        description: description.trim(),
        quantity: Number(quantity),
        unit_price: Number(unitPrice),
        tax_rate: Number(taxRate),
      },
    });
  };

  return (
    <div className="min-h-[calc(100dvh-var(--app-header-height))] bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="Back to invoice"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-muted-foreground">Edit invoice</p>
          <h1 className="truncate text-xl font-black sm:text-2xl">{invoice.invoice_number}</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Close editor">
          <X className="h-5 w-5" />
        </Button>
      </header>

      <section className="border-b border-border bg-muted/35 px-4 py-5 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[180px_minmax(0,1fr)_140px]">
          <p className="pt-3 text-sm font-bold text-destructive">Client name *</p>
          <div className="relative">
            <select
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              className="h-12 w-full rounded-lg border border-input bg-background pl-14 pr-3 text-sm font-bold"
            >
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {fullName(parent)}
                </option>
              ))}
            </select>
            {client ? (
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
                <Avatar
                  initials={initialsOf(fullName(client))}
                  tone={avatarTone(fullName(client))}
                  size="sm"
                />
              </span>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              {client?.email ?? "No email address recorded"}
            </p>
          </div>
          <div className="flex h-11 items-center justify-center rounded-lg border border-input bg-background text-sm font-bold">
            GBP
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
          <div>
            <h2 className="font-black">Invoice details</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Edit the invoice, client and line item.
            </p>
          </div>

          <div className="max-w-4xl space-y-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Invoice number">
                <Input value={invoice.invoice_number} readOnly className="h-11 rounded-lg bg-muted" />
              </Field>
              <Field label="Invoice date" required>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)}
                  className="h-11 rounded-lg"
                />
              </Field>
              <Field label="Due date">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="h-11 rounded-lg"
                />
              </Field>
              <Field label="Status">
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm capitalize"
                >
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="void">Void</option>
                </select>
              </Field>
            </div>

            <section className="overflow-hidden rounded-xl border border-border">
              <div className="border-b border-border bg-muted/60 px-4 py-3">
                <h3 className="font-black">Line item</h3>
              </div>
              <div className="grid gap-4 p-4 md:grid-cols-2">
                <Field label="Student">
                  <select
                    value={studentId}
                    onChange={(event) => setStudentId(event.target.value)}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="">No student linked</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {fullName(student)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Product or service">
                  <select
                    value={planId}
                    onChange={(event) => choosePlan(event.target.value)}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Custom line item</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} · {money(plan.unit_amount)}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="md:col-span-2">
                  <Field label="Description" required>
                    <Input
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      className="h-11 rounded-lg"
                    />
                  </Field>
                </div>
                <Field label="Quantity" required>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="h-11 rounded-lg"
                  />
                </Field>
                <Field label="Rate" required>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(event) => setUnitPrice(event.target.value)}
                    className="h-11 rounded-lg"
                  />
                </Field>
                <Field label="Tax">
                  <select
                    value={taxRate}
                    onChange={(event) => setTaxRate(event.target.value)}
                    className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="0">No tax</option>
                    <option value="20">VAT 20%</option>
                  </select>
                </Field>
                <div className="flex items-end justify-between rounded-lg bg-muted px-4 py-3">
                  <span className="text-sm font-bold text-muted-foreground">Invoice total</span>
                  <strong className="text-xl">{money(total)}</strong>
                </div>
              </div>
            </section>

            <Field label="Notes">
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={5}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
          </div>
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-8">
        <Button
          variant="ghost"
          className="mr-auto text-destructive"
          onClick={onDelete}
          disabled={busy}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button
          onClick={() => void save()}
          disabled={busy || !parentId || !description.trim() || !unitPrice}
        >
          <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save changes"}
        </Button>
      </footer>
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
