import { ArrowLeft, FileText, Plus, Save, X } from "lucide-react";
import { useMemo, useState } from "react";
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

export type BillingCreateMode = "invoice" | "subscription";

export type NewSubscriptionValues = {
  student_id: string | null;
  billing_plan_id: string | null;
  plan_name: string;
  amount: number;
  cadence: string;
  next_due_date: string | null;
  notes: string | null;
};

export type NewInvoiceValues = {
  issue_date: string;
  due_date: string | null;
  notes: string | null;
  status: "draft" | "approved";
  item: {
    student_id: string | null;
    billing_plan_id: string | null;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
  };
};

type Props = {
  mode: BillingCreateMode;
  client: ParentRow;
  students: StudentRow[];
  plans: Row<"billing_plans">[];
  busy: boolean;
  onCancel: () => void;
  onCreateSubscription: (values: NewSubscriptionValues) => Promise<void>;
  onCreateInvoice: (values: NewInvoiceValues) => Promise<void>;
};

const today = () => new Date().toISOString().slice(0, 10);

const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};

export function ClientBillingCreate({
  mode,
  client,
  students,
  plans,
  busy,
  onCancel,
  onCreateSubscription,
  onCreateInvoice,
}: Props) {
  return mode === "subscription" ? (
    <SubscriptionCreate
      client={client}
      students={students}
      plans={plans}
      busy={busy}
      onCancel={onCancel}
      onCreate={onCreateSubscription}
    />
  ) : (
    <InvoiceCreate
      client={client}
      students={students}
      plans={plans}
      busy={busy}
      onCancel={onCancel}
      onCreate={onCreateInvoice}
    />
  );
}

function CustomerSummary({ client }: { client: ParentRow }) {
  return (
    <section className="border-b border-border bg-muted/35 px-4 py-5 sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[180px_minmax(0,1fr)_120px]">
        <p className="pt-2 text-sm font-bold text-destructive">
          Client name<span aria-hidden="true">*</span>
        </p>
        <div>
          <div className="flex min-h-11 items-center gap-3 rounded-lg border border-input bg-background px-3">
            <Avatar
              initials={initialsOf(fullName(client))}
              tone={avatarTone(fullName(client))}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{fullName(client)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {client.email ?? "No email address recorded"}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
            <div>
              <p className="font-bold uppercase tracking-wide text-muted-foreground">
                Billing address
              </p>
              <button type="button" className="mt-2 font-semibold text-primary">
                Add address
              </button>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wide text-muted-foreground">
                Email to
              </p>
              <p className="mt-2 font-semibold">{client.email ?? "Add email address"}</p>
            </div>
          </div>
        </div>
        <div className="flex h-10 items-center justify-center rounded-lg border border-input bg-background text-sm font-bold">
          GBP
        </div>
      </div>
    </section>
  );
}

function EditorHeader({
  title,
  mode,
  onCancel,
}: {
  title: string;
  mode: BillingCreateMode;
  onCancel: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onCancel}
        className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted"
        aria-label="Back to client"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
        {mode === "invoice" ? <FileText className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </span>
      <h1 className="min-w-0 flex-1 truncate text-xl font-black sm:text-2xl">{title}</h1>
      <button
        type="button"
        onClick={onCancel}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </header>
  );
}

function SubscriptionCreate({
  client,
  students,
  plans,
  busy,
  onCancel,
  onCreate,
}: {
  client: ParentRow;
  students: StudentRow[];
  plans: Row<"billing_plans">[];
  busy: boolean;
  onCancel: () => void;
  onCreate: (values: NewSubscriptionValues) => Promise<void>;
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [planId, setPlanId] = useState("");
  const [planName, setPlanName] = useState("");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState("monthly");
  const [nextDueDate, setNextDueDate] = useState(today());
  const [notes, setNotes] = useState("");

  const choosePlan = (id: string) => {
    setPlanId(id);
    const plan = plans.find((item) => item.id === id);
    if (plan) {
      setPlanName(plan.name);
      setAmount(String(plan.unit_amount));
      setCadence(plan.billing_frequency === "one_off" ? "monthly" : plan.billing_frequency);
    }
  };

  const submit = async () => {
    if (!planName.trim() || !amount || Number(amount) <= 0) return;
    await onCreate({
      student_id: studentId || null,
      billing_plan_id: planId || null,
      plan_name: planName.trim(),
      amount: Number(amount),
      cadence,
      next_due_date: nextDueDate || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="min-h-[calc(100dvh-var(--app-header-height))] bg-background">
      <EditorHeader title="New subscription" mode="subscription" onCancel={onCancel} />
      <CustomerSummary client={client} />

      <main className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-8">
        <section className="grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)]">
          <div>
            <h2 className="font-black">Subscription details</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Select a product and billing schedule.
            </p>
          </div>
          <div className="max-w-3xl space-y-5">
            <Field label="Student">
              <select
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">All linked students</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {fullName(student)}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px]">
              <Field label="Select product" required>
                <select
                  value={planId}
                  onChange={(event) => choosePlan(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">Custom subscription</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} · {money(plan.unit_amount)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Currency">
                <Input value="GBP" readOnly className="h-11 rounded-lg bg-muted" />
              </Field>
            </div>

            {!planId ? (
              <Field label="Subscription name" required>
                <Input
                  value={planName}
                  onChange={(event) => setPlanName(event.target.value)}
                  placeholder="For example, Maths and English tuition"
                  className="h-11 rounded-lg"
                />
              </Field>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Amount" required>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="h-11 rounded-lg"
                />
              </Field>
              <Field label="Billing cycle">
                <select
                  value={cadence}
                  onChange={(event) => setCadence(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="termly">Termly</option>
                </select>
              </Field>
              <Field label="First billing date">
                <Input
                  type="date"
                  value={nextDueDate}
                  onChange={(event) => setNextDueDate(event.target.value)}
                  className="h-11 rounded-lg"
                />
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Optional internal notes"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </Field>
          </div>
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-8">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button
          onClick={() => void submit()}
          disabled={busy || !planName.trim() || !amount || Number(amount) <= 0}
        >
          <Save className="h-4 w-4" /> {busy ? "Creating…" : "Create subscription"}
        </Button>
      </footer>
    </div>
  );
}

function InvoiceCreate({
  client,
  students,
  plans,
  busy,
  onCancel,
  onCreate,
}: {
  client: ParentRow;
  students: StudentRow[];
  plans: Row<"billing_plans">[];
  busy: boolean;
  onCancel: () => void;
  onCreate: (values: NewInvoiceValues) => Promise<void>;
}) {
  const issueDate = today();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [planId, setPlanId] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [dueDate, setDueDate] = useState(addDays(issueDate, 30));
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const subtotal = useMemo(
    () => Number(quantity || 0) * Number(unitPrice || 0),
    [quantity, unitPrice],
  );
  const tax = subtotal * (Number(taxRate || 0) / 100);
  const total = subtotal + tax;

  const choosePlan = (id: string) => {
    setPlanId(id);
    const plan = plans.find((item) => item.id === id);
    if (plan) {
      setDescription(plan.name);
      setUnitPrice(String(plan.unit_amount));
    }
  };

  const submit = async (status: "draft" | "approved") => {
    if (!description.trim() || Number(quantity) <= 0 || Number(unitPrice) < 0) return;
    await onCreate({
      issue_date: issueDate,
      due_date: dueDate || null,
      notes: [reference.trim() ? `Reference: ${reference.trim()}` : "", notes.trim()]
        .filter(Boolean)
        .join("\n") || null,
      status,
      item: {
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
      <EditorHeader title="New invoice" mode="invoice" onCancel={onCancel} />
      <main className="mx-auto max-w-[1600px] px-4 py-5 pb-28 sm:px-6">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)]">
          <section className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
            <h2 className="mb-4 text-base font-black">Edit invoice</h2>
          <div>
            <h2 className="font-black">Invoice details</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Add the dates, student and billable product.
            </p>
          </div>
          <div className="min-w-0 space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Invoice number">
                <Input value="Generated on save" readOnly className="h-11 rounded-lg bg-muted" />
              </Field>
              <Field label="Invoice date" required>
                <Input value={issueDate} readOnly className="h-11 rounded-lg bg-muted" />
              </Field>
              <Field label="Due date" required>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="h-11 rounded-lg"
                />
              </Field>
            </div>

            <Field label="Reference">
              <Input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="For example, Autumn term tuition"
                className="h-11 rounded-lg"
              />
            </Field>

            <section className="overflow-hidden rounded-xl border border-border">
              <div className="border-b border-border bg-muted/60 px-4 py-3">
                <h3 className="font-black">Line items</h3>
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
                      placeholder="Description of tuition or service"
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
                  <span className="text-sm font-bold text-muted-foreground">Line total</span>
                  <strong className="text-xl">{money(total)}</strong>
                </div>
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <Field label="Notes">
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={5}
                  placeholder="Message shown on the invoice"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </Field>
              <dl className="space-y-3 rounded-xl bg-muted p-4 text-sm">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="font-bold">{money(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Tax</dt>
                  <dd className="font-bold">{money(tax)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-3 text-base">
                  <dt className="font-black">Total</dt>
                  <dd className="font-black">{money(total)}</dd>
                </div>
              </dl>
            </div>
          </div>
          </section>
          <aside className="min-w-0 lg:sticky lg:top-20" aria-label="Live invoice preview">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">Live invoice preview</h2><span className="text-xs text-muted-foreground">Updates as you type</span></div>
            <div className="aspect-[1/1.414] overflow-auto rounded-xl border border-border bg-white p-5 text-slate-900 shadow-sm sm:p-8">
              <div className="flex justify-between gap-4"><div><h3 className="text-xl font-black text-pink-600">ProgressTutors</h3><p className="mt-1 text-xs text-slate-500">Progressay Impact CIC</p></div><div className="text-right"><h3 className="text-2xl font-light uppercase tracking-wider">Invoice</h3><p className="text-xs text-slate-500">Number generated on save</p></div></div>
              <div className="mt-10 grid grid-cols-2 gap-4 text-xs"><div><p className="font-bold uppercase text-slate-500">Bill to</p><p className="mt-2 font-bold">{fullName(client)}</p><p className="break-all text-slate-500">{client.email ?? ""}</p></div><div className="text-right"><p>Invoice date: {issueDate}</p><p className="mt-1">Due date: {dueDate || "Not set"}</p><p className="mt-1">Currency: GBP</p></div></div>
              {reference.trim() && <p className="mt-5 text-xs">Reference: {reference}</p>}
              <div className="mt-10 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b-2 border-slate-200 bg-slate-50"><tr><th className="p-2">Item</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">Amount</th></tr></thead><tbody><tr className="border-b border-slate-100"><td className="p-2"><span className="font-semibold">{description || "Description of service"}</span>{studentId && <span className="block text-slate-500">{fullName(students.find((student) => student.id === studentId) ?? students[0])}</span>}</td><td className="p-2 text-right">{quantity || "0"}</td><td className="p-2 text-right">{money(Number(unitPrice) || 0)}</td><td className="p-2 text-right">{money(subtotal)}</td></tr></tbody></table></div>
              <div className="ml-auto mt-6 max-w-52 space-y-2 text-xs"><div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="flex justify-between"><span>Tax ({taxRate}%)</span><strong>{money(tax)}</strong></div><div className="flex justify-between border-t-2 border-slate-200 pt-3 text-base font-black"><span>Total</span><span>{money(total)}</span></div></div>
              {notes.trim() && <div className="mt-10 border-t border-slate-200 pt-4 text-xs"><p className="font-bold">Notes</p><p className="mt-2 whitespace-pre-wrap text-slate-600">{notes}</p></div>}
            </div>
          </aside>
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-8">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button
          variant="secondary"
          onClick={() => void submit("draft")}
          disabled={busy || !description.trim() || !unitPrice}
        >
          Save as draft
        </Button>
        <Button
          onClick={() => void submit("approved")}
          disabled={busy || !description.trim() || !unitPrice}
        >
          <Save className="h-4 w-4" /> {busy ? "Creating…" : "Create invoice"}
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
  children: React.ReactNode;
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
