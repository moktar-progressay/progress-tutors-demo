import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Filter,
  Plus,
  RotateCcw,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { PaymentDocumentDialog } from "@/components/payment-document-dialog";
import { Avatar, Empty, PageHeader, Pill, Section, StatCard, avatarTone } from "@/components/kit";
import { FormDialog, SelectField, TextAreaField, TextField } from "@/components/form-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEMO_DATE,
  fullName,
  initialsOf,
  money,
  num,
  prettyDate,
  useTable,
  useUpdateRow,
  useUpsert,
  type SubscriptionRow,
} from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  head: () => ({
    meta: [
      { title: "Parent Payments - ProgressTutors" },
      {
        name: "description",
        content: "Manage parent subscriptions, invoices and payment collection.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ParentPayments,
});

type PaymentMode = "invoice" | "received";
const paymentTone = (status: string) =>
  status === "received" ? "green" : status === "overdue" ? "pink" : "amber";
const paymentLabel = (status: string) =>
  status === "received" ? "Paid" : status === "overdue" ? "Overdue" : "Payment due";

function ParentPayments() {
  const parents = useTable("parents", "first_name");
  const students = useTable("students", "first_name");
  const plans = useTable("pricing_plans", "sort_order");
  const programmes = useTable("programmes");
  const subscriptions = useTable("client_subscriptions");
  const payments = useTable("client_payments", "payment_date");
  const addSubscription = useUpsert("client_subscriptions");
  const updateSubscription = useUpdateRow("client_subscriptions");
  const addPayment = useUpsert("client_payments", ["parents"]);
  const updatePayment = useUpdateRow("client_payments", ["parents"]);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("invoice");
  const [subscription, setSubscription] = useState({
    parent_id: "",
    student_id: "",
    pricing_plan_id: "",
    weekly_hours: "2",
    amount: "",
    cadence: "monthly",
    next_due_date: DEMO_DATE,
    notes: "",
  });
  const [payment, setPayment] = useState({
    parent_id: "",
    student_id: "",
    subscription_id: "",
    amount: "",
    payment_date: DEMO_DATE,
    payment_link: "",
    method: "bank_transfer",
    reference: "",
    note: "",
  });

  const parentName = (id: string | null) =>
    fullName((parents.data ?? []).find((parent) => parent.id === id));
  const studentName = (id: string | null) =>
    fullName((students.data ?? []).find((student) => student.id === id));
  const allPayments = payments.data ?? [];
  const received = allPayments.filter((item) => item.status === "received");
  const outstanding = allPayments.filter((item) => item.status !== "received");
  const activeSubscriptions = (subscriptions.data ?? []).filter((item) => item.status === "active");
  const filteredPayments = allPayments.filter((item) => {
    const matchesStatus = status === "all" || item.status === status;
    const haystack =
      `${parentName(item.parent_id)} ${studentName(item.student_id)} ${item.reference ?? ""}`.toLowerCase();
    return matchesStatus && (query === "" || haystack.includes(query.toLowerCase()));
  });

  function openPayment(mode: PaymentMode) {
    setPaymentMode(mode);
    setPayment({
      parent_id: "",
      student_id: "",
      subscription_id: "",
      amount: "",
      payment_date: DEMO_DATE,
      payment_link: "",
      method: "bank_transfer",
      reference: "",
      note: "",
    });
    setPaymentOpen(true);
  }

  function openSubscriptionInvoice(item: SubscriptionRow) {
    setPaymentMode("invoice");
    setPayment({
      parent_id: item.parent_id ?? "",
      student_id: item.student_id ?? "",
      subscription_id: item.id,
      amount: String(item.amount),
      payment_date: item.next_due_date ?? DEMO_DATE,
      payment_link: "",
      method: "bank_transfer",
      reference: "",
      note: item.plan_name ?? "Monthly tuition subscription",
    });
    setPaymentOpen(true);
  }

  function calculatedAmount(planId: string, weeklyHours: string, cadence: string) {
    const plan = (plans.data ?? []).find((item) => item.id === planId);
    if (!plan) return "";
    const cycles = cadence === "monthly" ? 4 : cadence === "termly" ? 12 : 1;
    return String(num(plan.amount) * num(weeklyHours) * cycles);
  }

  return (
    <Page>
      <PageHeader
        title="Payments"
        subtitle="Manage money coming in from parents and requests from tutors."
        actions={
          <>
            <Button variant="secondary" onClick={() => setDocumentOpen(true)}>
              <FileText className="h-4 w-4" /> Documents
            </Button>
            <Button onClick={() => openPayment("invoice")}>
              <Plus className="h-4 w-4" /> Create invoice
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1.5">
        <span className="rounded-xl bg-card px-3 py-2.5 text-center text-sm font-bold text-primary shadow-sm">
          Parent payments
        </span>
        <Link
          to="/admin/payment-requests"
          className="rounded-xl px-3 py-2.5 text-center text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          Tutor requests
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Outstanding"
          value={money(outstanding.reduce((total, item) => total + num(item.amount), 0))}
          hint={`${outstanding.length} invoices`}
          tone="amber"
        />
        <StatCard
          label="Collected"
          value={money(received.reduce((total, item) => total + num(item.amount), 0))}
          hint={`${received.length} payments`}
          tone="green"
        />
        <StatCard
          label="Active subscriptions"
          value={String(activeSubscriptions.length)}
          tone="purple"
        />
        <StatCard
          label="Next billing cycle"
          value={money(activeSubscriptions.reduce((total, item) => total + num(item.amount), 0))}
          tone="blue"
        />
      </div>

      <Section
        id="parent-subscriptions"
        title="Subscriptions"
        subtitle="Recurring plans agreed with parents"
        action={
          <Button size="sm" variant="secondary" onClick={() => setSubscriptionOpen(true)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        }
      >
        {(subscriptions.data ?? []).length === 0 ? (
          <Empty>No subscriptions yet. Add the first parent subscription.</Empty>
        ) : (
          <ul className="grid gap-2 lg:grid-cols-2">
            {(subscriptions.data ?? []).map((item) => {
              const name = parentName(item.parent_id);
              return (
                <li key={item.id} className="rounded-2xl border border-border p-3">
                  <div className="flex items-center gap-3">
                    <Avatar initials={initialsOf(name)} tone={avatarTone(name)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {studentName(item.student_id)} · {item.plan_name ?? "Subscription"}
                      </p>
                    </div>
                    <Pill tone={item.status === "active" ? "green" : "neutral"}>{item.status}</Pill>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3 border-t border-border pt-3">
                    <div>
                      <p className="font-extrabold">
                        {money(item.amount)} / {item.cadence.replace("_", " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.next_due_date
                          ? `Next due ${prettyDate(item.next_due_date)}`
                          : "No due date"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {item.status === "active" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openSubscriptionInvoice(item)}
                        >
                          Create invoice
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          updateSubscription.mutate(
                            {
                              id: item.id,
                              values: { status: item.status === "active" ? "paused" : "active" },
                            },
                            { onSuccess: () => toast.success("Subscription updated") },
                          )
                        }
                      >
                        {item.status === "active" ? (
                          "Pause"
                        ) : (
                          <>
                            <RotateCcw className="h-4 w-4" /> Resume
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section
        id="parent-invoices"
        title="Invoices and collections"
        subtitle="Create an invoice, then record when payment is received"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setFiltersOpen((open) => !open)}>
              <Filter className="h-4 w-4" /> Filters{" "}
              <ChevronDown className={`h-3.5 w-3.5 ${filtersOpen ? "rotate-180" : ""}`} />
            </Button>
            <Button size="sm" onClick={() => openPayment("received")}>
              <WalletCards className="h-4 w-4" /> Record
            </Button>
          </div>
        }
      >
        {filtersOpen ? (
          <div className="mb-4 grid gap-2 rounded-2xl bg-muted p-3 sm:grid-cols-[1fr_180px_auto]">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search parent, child or reference"
              className="h-10 rounded-xl bg-card"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-medium"
            >
              <option value="all">All statuses</option>
              <option value="due">Payment due</option>
              <option value="overdue">Overdue</option>
              <option value="received">Paid</option>
            </select>
            <Button
              variant="ghost"
              onClick={() => {
                setQuery("");
                setStatus("all");
              }}
            >
              Clear
            </Button>
          </div>
        ) : null}
        {filteredPayments.length === 0 ? (
          <Empty>No invoices or payments match this view.</Empty>
        ) : (
          <ul className="space-y-2">
            {filteredPayments.map((item) => {
              const name = parentName(item.parent_id);
              return (
                <li key={item.id} className="rounded-2xl border border-border p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <Avatar initials={initialsOf(name)} tone={avatarTone(name)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold">{name}</p>
                        <Pill tone={paymentTone(item.status)}>{paymentLabel(item.status)}</Pill>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {studentName(item.student_id)} · {item.reference ?? "No reference"}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {item.status === "received" ? "Paid" : "Due"}{" "}
                        {prettyDate(
                          item.status === "received"
                            ? item.payment_date
                            : (item.due_date ?? item.payment_date),
                        )}
                        {item.method ? ` · ${item.method.replace("_", " ")}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-lg font-extrabold">{money(item.amount)}</p>
                  </div>
                  {item.status !== "received" ? (
                    <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
                      {item.payment_link ? (
                        <Button size="sm" variant="secondary" asChild>
                          <a href={item.payment_link} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" /> Payment link
                          </a>
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        onClick={() =>
                          updatePayment.mutate(
                            {
                              id: item.id,
                              values: {
                                status: "received",
                                payment_date: DEMO_DATE,
                                paid_at: new Date().toISOString(),
                              },
                            },
                            { onSuccess: () => toast.success("Invoice marked as paid") },
                          )
                        }
                      >
                        <Check className="h-4 w-4" /> Mark paid
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section
        id="payment-documents"
        title="Documents"
        subtitle="Editable childcare confirmations and invoices"
      >
        <button
          type="button"
          onClick={() => setDocumentOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-border p-4 text-left hover:bg-muted"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
            <FileText className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Create and preview a PDF</span>
            <span className="block text-xs text-muted-foreground">
              Choose a parent and student, edit every field, add a Stripe payment link, then
              download.
            </span>
          </span>
          <span className="text-sm font-bold text-primary">Create</span>
        </button>
      </Section>

      <FormDialog
        open={subscriptionOpen}
        onOpenChange={setSubscriptionOpen}
        title="Add subscription"
        description="Set the recurring amount and next billing date."
        submitLabel="Add subscription"
        busy={addSubscription.isPending}
        onSubmit={async () => {
          if (!subscription.parent_id || !subscription.amount) {
            toast.error("Choose a parent and enter an amount");
            return;
          }
          const plan = (plans.data ?? []).find((item) => item.id === subscription.pricing_plan_id);
          await addSubscription.mutateAsync({
            parent_id: subscription.parent_id,
            student_id: subscription.student_id || null,
            pricing_plan_id: subscription.pricing_plan_id || null,
            programme_id: plan?.programme_id ?? null,
            plan_name: plan?.name ?? "Subscription",
            amount: Number(subscription.amount),
            cadence: subscription.cadence,
            next_due_date: subscription.next_due_date || null,
            notes: subscription.notes || null,
            status: "active",
          });
          toast.success("Subscription added");
          setSubscriptionOpen(false);
        }}
      >
        <SelectField
          label="Parent"
          value={subscription.parent_id}
          onChange={(value) => setSubscription({ ...subscription, parent_id: value })}
          options={[
            { value: "", label: "Choose parent" },
            ...(parents.data ?? []).map((item) => ({ value: item.id, label: fullName(item) })),
          ]}
        />
        <SelectField
          label="Student"
          value={subscription.student_id}
          onChange={(value) => setSubscription({ ...subscription, student_id: value })}
          options={[
            { value: "", label: "Choose student" },
            ...(students.data ?? []).map((item) => ({ value: item.id, label: fullName(item) })),
          ]}
        />
        <SelectField
          label="Plan"
          value={subscription.pricing_plan_id}
          onChange={(value) => {
            const plan = (plans.data ?? []).find((item) => item.id === value);
            setSubscription({
              ...subscription,
              pricing_plan_id: value,
              amount: plan
                ? calculatedAmount(value, subscription.weekly_hours, subscription.cadence)
                : subscription.amount,
            });
          }}
          options={[
            { value: "", label: "Custom subscription" },
            ...(plans.data ?? []).map((item) => ({
              value: item.id,
              label: `${(programmes.data ?? []).find((programme) => programme.id === item.programme_id)?.name ?? ""} ${item.name} · ${money(item.amount)}`,
            })),
          ]}
        />
        <TextField
          label="Teaching hours per week"
          type="number"
          value={subscription.weekly_hours}
          onChange={(value) =>
            setSubscription({
              ...subscription,
              weekly_hours: value,
              amount: subscription.pricing_plan_id
                ? calculatedAmount(subscription.pricing_plan_id, value, subscription.cadence)
                : subscription.amount,
            })
          }
          required
        />
        <TextField
          label={`${subscription.cadence === "monthly" ? "Monthly" : "Subscription"} amount (£)`}
          type="number"
          value={subscription.amount}
          onChange={(value) => setSubscription({ ...subscription, amount: value })}
          required
        />
        <SelectField
          label="Billing cycle"
          value={subscription.cadence}
          onChange={(value) =>
            setSubscription({
              ...subscription,
              cadence: value,
              amount: subscription.pricing_plan_id
                ? calculatedAmount(subscription.pricing_plan_id, subscription.weekly_hours, value)
                : subscription.amount,
            })
          }
          options={[
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
            { value: "termly", label: "Termly" },
            { value: "one_off", label: "One off" },
          ]}
        />
        {subscription.pricing_plan_id ? (
          <div className="rounded-xl bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground sm:col-span-2">
            {money(
              (plans.data ?? []).find((item) => item.id === subscription.pricing_plan_id)?.amount,
            )}{" "}
            × {subscription.weekly_hours || "0"} hours ×{" "}
            {subscription.cadence === "monthly"
              ? "4 weeks"
              : subscription.cadence === "termly"
                ? "12 weeks"
                : "1"}{" "}
            = {money(Number(subscription.amount))}{" "}
            {subscription.cadence === "monthly" ? "per month" : subscription.cadence}
          </div>
        ) : null}
        <TextField
          label="Next invoice date"
          type="date"
          value={subscription.next_due_date}
          onChange={(value) => setSubscription({ ...subscription, next_due_date: value })}
        />
        <TextAreaField
          label="Notes"
          value={subscription.notes}
          onChange={(value) => setSubscription({ ...subscription, notes: value })}
        />
      </FormDialog>

      <FormDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        title={paymentMode === "invoice" ? "Create invoice" : "Record parent payment"}
        description={
          paymentMode === "invoice"
            ? "Add an amount due from a parent."
            : "Record money that has already been received."
        }
        submitLabel={paymentMode === "invoice" ? "Create invoice" : "Record payment"}
        busy={addPayment.isPending}
        onSubmit={async () => {
          if (!payment.parent_id || !payment.amount) {
            toast.error("Choose a parent and enter an amount");
            return;
          }
          await addPayment.mutateAsync({
            parent_id: payment.parent_id,
            student_id: payment.student_id || null,
            subscription_id: payment.subscription_id || null,
            amount: Number(payment.amount),
            payment_date: paymentMode === "received" ? payment.payment_date : DEMO_DATE,
            due_date: paymentMode === "invoice" ? payment.payment_date : null,
            paid_at: paymentMode === "received" ? new Date().toISOString() : null,
            payment_link:
              paymentMode === "invoice" && payment.payment_link ? payment.payment_link : null,
            method: paymentMode === "received" ? payment.method : null,
            reference: payment.reference || null,
            note: payment.note || null,
            status: paymentMode === "received" ? "received" : "due",
          });
          toast.success(paymentMode === "invoice" ? "Invoice created" : "Payment recorded");
          setPaymentOpen(false);
        }}
      >
        <SelectField
          label="Parent"
          value={payment.parent_id}
          onChange={(value) => setPayment({ ...payment, parent_id: value })}
          options={[
            { value: "", label: "Choose parent" },
            ...(parents.data ?? []).map((item) => ({ value: item.id, label: fullName(item) })),
          ]}
        />
        <SelectField
          label="Student"
          value={payment.student_id}
          onChange={(value) => setPayment({ ...payment, student_id: value })}
          options={[
            { value: "", label: "Choose student" },
            ...(students.data ?? []).map((item) => ({ value: item.id, label: fullName(item) })),
          ]}
        />
        <SelectField
          label="Subscription"
          value={payment.subscription_id}
          onChange={(value) => {
            const selected = (subscriptions.data ?? []).find((item) => item.id === value);
            setPayment({
              ...payment,
              subscription_id: value,
              parent_id: selected?.parent_id ?? payment.parent_id,
              student_id: selected?.student_id ?? payment.student_id,
              amount: selected ? String(selected.amount) : payment.amount,
            });
          }}
          options={[
            { value: "", label: "No linked subscription" },
            ...(subscriptions.data ?? []).map((item) => ({
              value: item.id,
              label: `${parentName(item.parent_id)} · ${item.plan_name ?? "Subscription"}`,
            })),
          ]}
        />
        <TextField
          label="Amount (£)"
          type="number"
          value={payment.amount}
          onChange={(value) => setPayment({ ...payment, amount: value })}
          required
        />
        {paymentMode === "invoice" ? (
          <TextField
            label="Stripe payment link (optional)"
            type="url"
            value={payment.payment_link}
            placeholder="https://buy.stripe.com/..."
            onChange={(value) => setPayment({ ...payment, payment_link: value })}
            full
          />
        ) : null}
        <TextField
          label={paymentMode === "invoice" ? "Due date" : "Date received"}
          type="date"
          value={payment.payment_date}
          onChange={(value) => setPayment({ ...payment, payment_date: value })}
        />
        {paymentMode === "received" ? (
          <SelectField
            label="Method"
            value={payment.method}
            onChange={(value) => setPayment({ ...payment, method: value })}
            options={[
              { value: "bank_transfer", label: "Bank transfer" },
              { value: "cash", label: "Cash" },
              { value: "card", label: "Card" },
              { value: "other", label: "Other" },
            ]}
          />
        ) : null}
        <TextField
          label="Reference"
          value={payment.reference}
          onChange={(value) => setPayment({ ...payment, reference: value })}
          placeholder="Optional invoice or bank reference"
        />
        <TextAreaField
          label="Note"
          value={payment.note}
          onChange={(value) => setPayment({ ...payment, note: value })}
        />
      </FormDialog>
      <PaymentDocumentDialog
        open={documentOpen}
        onOpenChange={setDocumentOpen}
        parents={parents.data ?? []}
        students={students.data ?? []}
      />
    </Page>
  );
}
