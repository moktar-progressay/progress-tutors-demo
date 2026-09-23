import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowDownUp,
  ArrowUpRight,
  Banknote,
  Boxes,
  Check,
  ChevronDown,
  CircleDollarSign,
  Download,
  ExternalLink,
  FileText,
  LayoutDashboard,
  ListFilter,
  MoreHorizontal,
  PackageOpen,
  Plus,
  RotateCcw,
  Search,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { FamilyInvoiceDialog } from "@/components/family-invoice-dialog";
import { PaymentDocumentDialog } from "@/components/payment-document-dialog";
import { ZohoSyncPanel } from "@/components/zoho-sync-panel";
import { Avatar, Empty, Pill, Section, StatCard, avatarTone } from "@/components/kit";
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
type PaymentView =
  | "overview"
  | "clients"
  | "invoices"
  | "subscriptions"
  | "transactions"
  | "tutor-requests"
  | "documents"
  | "products";

const PAYMENT_VIEWS: Array<{ id: PaymentView; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "clients", label: "Clients" },
  { id: "invoices", label: "Invoices" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "transactions", label: "Transactions" },
  { id: "tutor-requests", label: "Tutor requests" },
  { id: "documents", label: "Documents" },
  { id: "products", label: "Products & services" },
];
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
  const parentLinks = useTable("parent_students");
  const billingPlans = useTable("billing_plans", "name");
  const invoices = useTable("billing_invoices", "created_at");
  const invoiceItems = useTable("billing_invoice_items", "sort_order");
  const paymentRequests = useTable("payment_requests", "submitted_at");
  const tutors = useTable("tutors", "first_name");
  const addSubscription = useUpsert("client_subscriptions");
  const updateSubscription = useUpdateRow("client_subscriptions");
  const addPayment = useUpsert("client_payments", ["parents"]);
  const updatePayment = useUpdateRow("client_payments", ["parents"]);
  const updateInvoice = useUpdateRow("billing_invoices");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<PaymentView>("invoices");
  const [invoiceLimit, setInvoiceLimit] = useState(10);
  const [invoiceFilter, setInvoiceFilter] = useState<"all" | "draft" | "unpaid">("all");
  const [invoiceSortOpen, setInvoiceSortOpen] = useState(false);
  const [invoiceSort, setInvoiceSort] = useState<
    "created" | "date" | "number" | "client" | "amount"
  >("created");
  const [invoiceSortDirection, setInvoiceSortDirection] = useState<"asc" | "desc">("desc");
  const [subscriptionFilter, setSubscriptionFilter] = useState<"active" | "cancelled" | "all">(
    "all",
  );
  const [moreOpen, setMoreOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [familyInvoiceOpen, setFamilyInvoiceOpen] = useState(false);
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
  const activeSubscriptions = (subscriptions.data ?? []).filter((item) => item.status === "active");
  const filteredPayments = allPayments.filter((item) => {
    const matchesStatus = status === "all" || item.status === status;
    const haystack =
      `${parentName(item.parent_id)} ${studentName(item.student_id)} ${item.reference ?? ""}`.toLowerCase();
    return matchesStatus && (query === "" || haystack.includes(query.toLowerCase()));
  });
  const allInvoices = invoices.data ?? [];
  const allParents = parents.data ?? [];
  const receivedTotal = allPayments
    .filter((item) => item.status === "received")
    .reduce((total, item) => total + num(item.amount), 0);
  const outstandingTotal = allPayments
    .filter((item) => item.status !== "received")
    .reduce((total, item) => total + num(item.amount), 0);
  const recurringTotal = activeSubscriptions.reduce((total, item) => total + num(item.amount), 0);
  const draftInvoices = allInvoices.filter((item) => item.status === "draft");
  const submittedRequests = (paymentRequests.data ?? []).filter(
    (item) => item.status === "submitted",
  );
  const recentActivity = [
    ...allInvoices.map((item) => ({
      id: `invoice-${item.id}`,
      type: "Invoice",
      name: parentName(item.parent_id),
      amount: num(item.total),
      date: item.created_at,
      status: item.status,
    })),
    ...allPayments.map((item) => ({
      id: `payment-${item.id}`,
      type: item.status === "received" ? "Payment" : "Collection",
      name: parentName(item.parent_id),
      amount: num(item.amount),
      date: item.payment_date,
      status: item.status,
    })),
  ]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 6);
  const revenueByMonth = allPayments
    .filter((item) => item.status === "received" && item.payment_date)
    .reduce<Record<string, number>>((groups, item) => {
      const key = String(item.payment_date).slice(0, 7);
      groups[key] = (groups[key] ?? 0) + num(item.amount);
      return groups;
    }, {});
  const revenueSeries = Object.entries(revenueByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);
  const revenueMax = Math.max(1, ...revenueSeries.map(([, value]) => value));
  const filteredInvoices = allInvoices
    .filter((invoice) => {
      const lines = (invoiceItems.data ?? []).filter((line) => line.invoice_id === invoice.id);
      const haystack = `${invoice.invoice_number ?? ""} ${parentName(invoice.parent_id)} ${lines
        .map((line) => studentName(line.student_id))
        .join(" ")}`.toLowerCase();
      const matchesQuery = query === "" || haystack.includes(query.toLowerCase());
      const matchesStatus =
        invoiceFilter === "all" ||
        (invoiceFilter === "draft" && invoice.status === "draft") ||
        (invoiceFilter === "unpaid" && invoice.status !== "paid");
      return matchesQuery && matchesStatus;
    })
    .slice()
    .sort((a, b) => {
      const values = {
        created: [a.created_at, b.created_at],
        date: [a.issue_date ?? a.created_at, b.issue_date ?? b.created_at],
        number: [a.invoice_number, b.invoice_number],
        client: [parentName(a.parent_id), parentName(b.parent_id)],
        amount: [a.total, b.total],
      }[invoiceSort];
      const result =
        typeof values[0] === "number"
          ? Number(values[0]) - Number(values[1])
          : String(values[0]).localeCompare(String(values[1]));
      return invoiceSortDirection === "asc" ? result : -result;
    });
  const filteredSubscriptions = (subscriptions.data ?? []).filter((item) => {
    const haystack = `${parentName(item.parent_id)} ${studentName(item.student_id)} ${
      item.plan_name ?? ""
    }`.toLowerCase();
    const matchesQuery = query === "" || haystack.includes(query.toLowerCase());
    const matchesStatus = subscriptionFilter === "all" || item.status === subscriptionFilter;
    return matchesQuery && matchesStatus;
  });

  function exportTransactions() {
    const rows = [
      ["Client", "Student", "Status", "Amount", "Date", "Reference"],
      ...filteredPayments.map((item) => [
        parentName(item.parent_id),
        studentName(item.student_id),
        item.status,
        String(item.amount ?? 0),
        String(item.payment_date ?? ""),
        String(item.reference ?? ""),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "progress-tutors-transactions.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

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

  function openPrimaryAction() {
    if (view === "subscriptions") {
      setSubscriptionOpen(true);
      return;
    }
    if (view === "transactions") {
      openPayment("received");
      return;
    }
    if (view === "documents") {
      setDocumentOpen(true);
      return;
    }
    setFamilyInvoiceOpen(true);
  }

  function calculatedAmount(planId: string, weeklyHours: string, cadence: string) {
    const plan = (plans.data ?? []).find((item) => item.id === planId);
    if (!plan) return "";
    const cycles = cadence === "monthly" ? 4 : cadence === "termly" ? 12 : 1;
    return String(num(plan.amount) * num(weeklyHours) * cycles);
  }

  return (
    <Page className="pt-0 sm:pt-0">
      <div className="sticky top-[var(--app-header-height)] z-30 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="relative flex items-center gap-2">
          <h1 className="hidden shrink-0 text-xl font-extrabold lg:block">Payments</h1>
          <div className="relative min-w-0 flex-1 lg:ml-4 lg:max-w-xl">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                view === "subscriptions"
                  ? "Search subscriptions, clients or students"
                  : "Search invoices, clients or students"
              }
              className="h-10 rounded-xl bg-muted pl-9"
            />
          </div>
          <Button
            size="icon"
            aria-label={
              view === "subscriptions"
                ? "Add subscription"
                : view === "transactions"
                  ? "Record payment"
                  : view === "documents"
                    ? "Create document"
                    : "Create invoice"
            }
            onClick={openPrimaryAction}
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label="More payment options"
            onClick={() => setMoreOpen((open) => !open)}
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
          {moreOpen ? (
            <div className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-64 rounded-2xl border border-border bg-card p-2 shadow-xl">
              <p className="px-2 py-1 text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                Payments
              </p>
              {PAYMENT_VIEWS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setView(item.id);
                    setMoreOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-semibold ${
                    view === item.id
                      ? "bg-secondary text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                  {view === item.id ? <Check className="h-4 w-4" /> : null}
                </button>
              ))}
              <div className="my-1 border-t border-border" />
              <button
                type="button"
                onClick={() => {
                  setDocumentOpen(true);
                  setMoreOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <FileText className="h-4 w-4" /> Create PDF document
              </button>
              <button
                type="button"
                onClick={() => {
                  exportTransactions();
                  setMoreOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>
          ) : null}
        </div>
        {view === "invoices" ? (
          <div className="mt-2 flex items-center gap-2 md:hidden">
            {(["draft", "unpaid", "all"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setInvoiceFilter(item)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
                  invoiceFilter === item
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {item}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
              aria-label="Invoice filters"
            >
              <ListFilter className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setInvoiceSortOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
              aria-label="Sort invoices"
            >
              <ArrowDownUp className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        {view === "subscriptions" ? (
          <div className="mt-2 flex items-center gap-2 md:hidden">
            {(["active", "cancelled", "all"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSubscriptionFilter(item)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
                  subscriptionFilter === item
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {item}
              </button>
            ))}
            <span className="ml-auto text-xs font-semibold text-muted-foreground">
              {filteredSubscriptions.length} total
            </span>
          </div>
        ) : null}
        <nav
          className="mt-2 hidden gap-1 overflow-x-auto pb-1 md:flex"
          aria-label="Payments sections"
        >
          {PAYMENT_VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                view === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {view === "invoices" ? (
        <div className="space-y-4">
          <div className="hidden flex-wrap items-center justify-between gap-3 md:flex">
            <div>
              <h2 className="text-xl font-extrabold">All invoices</h2>
              <p className="text-sm text-muted-foreground">
                Recent first · one invoice can cover multiple children
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={exportTransactions}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setDocumentOpen(true)}>
                <FileText className="h-4 w-4" /> Export PDF
              </Button>
              <Button size="sm" onClick={() => setFamilyInvoiceOpen(true)}>
                <Plus className="h-4 w-4" /> New invoice
              </Button>
            </div>
          </div>

          <div className="hidden grid-cols-2 gap-3 md:grid lg:grid-cols-4">
            <StatCard
              label="Outstanding"
              value={money(outstandingTotal)}
              hint={`${allPayments.filter((item) => item.status !== "received").length} invoices`}
              tone="blue"
              icon={<CircleDollarSign className="h-5 w-5" />}
            />
            <StatCard
              label="Overdue"
              value={money(
                allPayments
                  .filter((item) => item.status === "overdue")
                  .reduce((sum, item) => sum + num(item.amount), 0),
              )}
              hint={`${allPayments.filter((item) => item.status === "overdue").length} invoices`}
              tone="amber"
              icon={<ArrowUpRight className="h-5 w-5" />}
            />
            <StatCard
              label="Paid this month"
              value={money(receivedTotal)}
              hint={`${allPayments.filter((item) => item.status === "received").length} payments`}
              tone="green"
              icon={<Check className="h-5 w-5" />}
            />
            <StatCard
              label="Draft invoices"
              value={money(draftInvoices.reduce((sum, item) => sum + num(item.total), 0))}
              hint={`${draftInvoices.length} drafts`}
              tone="purple"
              icon={<FileText className="h-5 w-5" />}
            />
          </div>

          <div className="grid grid-cols-4 gap-1.5 md:hidden">
            {[
              {
                label: "Outstanding",
                value: money(
                  allInvoices
                    .filter((item) => item.status !== "paid")
                    .reduce((sum, item) => sum + num(item.balance_due), 0),
                ),
                tone: "bg-tile-blue text-tile-blue-ink",
              },
              {
                label: "Overdue",
                value: money(
                  allInvoices
                    .filter(
                      (item) =>
                        item.status !== "paid" && item.due_date && item.due_date < DEMO_DATE,
                    )
                    .reduce((sum, item) => sum + num(item.balance_due), 0),
                ),
                tone: "bg-tile-amber text-tile-amber-ink",
              },
              {
                label: "Paid",
                value: money(allInvoices.reduce((sum, item) => sum + num(item.amount_paid), 0)),
                tone: "bg-tile-green text-tile-green-ink",
              },
              {
                label: "Drafts",
                value: String(draftInvoices.length),
                tone: "bg-tile-purple text-tile-purple-ink",
              },
            ].map((item) => (
              <div key={item.label} className={`min-w-0 rounded-xl px-2 py-2.5 ${item.tone}`}>
                <p className="truncate text-sm font-black">{item.value}</p>
                <p className="mt-0.5 truncate text-[8px] font-extrabold tracking-wide uppercase">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-border bg-card p-3 md:hidden">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold">Revenue over time</h3>
                <p className="text-[10px] text-muted-foreground">Payments received</p>
              </div>
              <span className="text-xs font-extrabold text-primary">{money(receivedTotal)}</span>
            </div>
            {revenueSeries.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No revenue data yet.</p>
            ) : (
              <div className="mt-3 flex h-20 items-end gap-2">
                {revenueSeries.map(([month, value]) => (
                  <div key={month} className="flex h-full flex-1 flex-col justify-end gap-1">
                    <div
                      className="w-full rounded-t-md bg-primary/80"
                      style={{ height: `${Math.max(8, (value / revenueMax) * 56)}px` }}
                    />
                    <span className="truncate text-center text-[8px] text-muted-foreground">
                      {month.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="md:hidden">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-extrabold">Invoices</h2>
              <span className="text-xs font-semibold text-muted-foreground">
                {filteredInvoices.length} total
              </span>
            </div>
            {filteredInvoices.length === 0 ? (
              <Empty>No invoices match this view.</Empty>
            ) : (
              <div className="divide-y divide-border">
                {filteredInvoices.slice(0, invoiceLimit).map((invoice) => {
                  const children = Array.from(
                    new Set(
                      (invoiceItems.data ?? [])
                        .filter((line) => line.invoice_id === invoice.id)
                        .map((line) => line.student_id)
                        .filter(Boolean),
                    ),
                  );
                  const statusLabel =
                    invoice.status === "paid"
                      ? "Paid"
                      : invoice.status === "draft"
                        ? "Draft"
                        : invoice.due_date && invoice.due_date < DEMO_DATE
                          ? "Overdue"
                          : "Unpaid";
                  return (
                    <article key={invoice.id} className="py-4 first:pt-1">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/admin/parents/$id"
                            params={{ id: invoice.parent_id }}
                            className="block truncate text-base font-extrabold hover:text-primary"
                          >
                            {parentName(invoice.parent_id)}
                          </Link>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {prettyDate(String(invoice.created_at).slice(0, 10))} ·{" "}
                            {invoice.invoice_number}
                          </p>
                          {children.length ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {children.map((studentId) => (
                                <Pill key={studentId} tone="neutral">
                                  {studentName(studentId)}
                                </Pill>
                              ))}
                            </div>
                          ) : null}
                          <p
                            className={`mt-2 text-xs font-extrabold tracking-wide uppercase ${
                              statusLabel === "Paid"
                                ? "text-emerald-600"
                                : statusLabel === "Overdue"
                                  ? "text-rose-500"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {statusLabel}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-base font-extrabold">{money(invoice.total)}</p>
                          <button
                            type="button"
                            onClick={() => setDocumentOpen(true)}
                            className="mt-3 rounded-full px-2 py-1 text-lg leading-none text-muted-foreground"
                            aria-label={`Open actions for ${invoice.invoice_number}`}
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            {invoiceLimit < filteredInvoices.length ? (
              <Button
                className="mt-3 w-full"
                variant="secondary"
                onClick={() => setInvoiceLimit((value) => value + 10)}
              >
                Load more
              </Button>
            ) : null}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:block">
            {filteredInvoices.length === 0 ? (
              <Empty>No invoices match this view.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[940px] text-left text-sm">
                  <thead className="sticky top-0 bg-muted/90 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Invoice #</th>
                      <th className="px-4 py-3 font-semibold">Client</th>
                      <th className="px-4 py-3 font-semibold">Students</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Due date</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount</th>
                      <th className="px-4 py-3 text-right font-semibold">Balance due</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredInvoices.slice(0, invoiceLimit).map((invoice) => {
                      const lines = (invoiceItems.data ?? []).filter(
                        (line) => line.invoice_id === invoice.id,
                      );
                      const children = Array.from(
                        new Set(lines.map((line) => line.student_id).filter(Boolean)),
                      );
                      const paid = invoice.status === "paid";
                      return (
                        <tr key={invoice.id} className="hover:bg-muted/45">
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {prettyDate(String(invoice.created_at).slice(0, 10))}
                          </td>
                          <td className="px-4 py-3 font-bold text-primary">
                            {invoice.invoice_number}
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            <Link
                              to="/admin/parents/$id"
                              params={{ id: invoice.parent_id }}
                              className="hover:text-primary hover:underline"
                            >
                              {parentName(invoice.parent_id)}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {children.slice(0, 2).map((id) => (
                                <Pill key={id} tone="neutral">
                                  {studentName(id)}
                                </Pill>
                              ))}
                              {children.length > 2 ? (
                                <Pill tone="neutral">+{children.length - 2}</Pill>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Pill
                              tone={
                                paid ? "green" : invoice.status === "draft" ? "neutral" : "amber"
                              }
                            >
                              {invoice.status}
                            </Pill>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                            {invoice.due_date ? prettyDate(invoice.due_date) : "Not set"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {money(invoice.total)}
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold">
                            {paid ? money(0) : money(invoice.total)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDocumentOpen(true)}
                              >
                                View
                              </Button>
                              {invoice.status === "draft" ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={updateInvoice.isPending}
                                  onClick={() =>
                                    updateInvoice.mutate(
                                      {
                                        id: invoice.id,
                                        values: {
                                          status: "approved",
                                          approved_at: new Date().toISOString(),
                                        },
                                      },
                                      {
                                        onSuccess: () =>
                                          toast.success("Draft approved. Nothing was emailed."),
                                      },
                                    )
                                  }
                                >
                                  Approve
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>
                Showing {Math.min(invoiceLimit, filteredInvoices.length)} of{" "}
                {filteredInvoices.length} invoices
              </span>
              <div className="flex items-center gap-2">
                {invoiceLimit < filteredInvoices.length ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setInvoiceLimit((value) => value + 10)}
                  >
                    Load 10 more
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setInvoiceLimit(filteredInvoices.length || 10)}
                >
                  All
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <ZohoSyncPanel />
          </div>
        </div>
      ) : null}

      {view === "overview" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Received"
              value={money(receivedTotal)}
              hint={`${allPayments.filter((item) => item.status === "received").length} payments`}
              tone="green"
              icon={<ArrowDownLeft className="h-5 w-5" />}
            />
            <StatCard
              label="Outstanding"
              value={money(outstandingTotal)}
              tone="amber"
              icon={<ArrowUpRight className="h-5 w-5" />}
            />
            <StatCard
              label="Monthly recurring"
              value={money(recurringTotal)}
              hint={`${activeSubscriptions.length} active`}
              tone="purple"
              icon={<RotateCcw className="h-5 w-5" />}
            />
            <StatCard
              label="Tutor requests"
              value={money(
                submittedRequests.reduce((sum, item) => sum + num(item.total_amount), 0),
              )}
              hint={`${submittedRequests.length} need review`}
              tone="blue"
              icon={<WalletCards className="h-5 w-5" />}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
            <section className="surface p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-extrabold">Revenue over time</h2>
                  <p className="text-xs text-muted-foreground">Payments received</p>
                </div>
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </div>
              {revenueSeries.length === 0 ? (
                <Empty>No received payments to chart yet.</Empty>
              ) : (
                <div className="mt-6 flex h-44 items-end gap-3">
                  {revenueSeries.map(([month, value]) => (
                    <div key={month} className="flex flex-1 flex-col items-center gap-2">
                      <span className="text-xs font-bold">{money(value)}</span>
                      <div
                        className="w-full rounded-t-xl bg-primary/80"
                        style={{ height: `${Math.max(12, (value / revenueMax) * 120)}px` }}
                      />
                      <span className="text-[11px] text-muted-foreground">{month}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="surface p-5">
              <h2 className="font-extrabold">Quick actions</h2>
              <div className="mt-4 grid gap-2">
                <Button onClick={() => setFamilyInvoiceOpen(true)}>
                  <Plus className="h-4 w-4" /> New invoice
                </Button>
                <Button variant="secondary" onClick={() => setSubscriptionOpen(true)}>
                  <RotateCcw className="h-4 w-4" /> Add subscription
                </Button>
                <Button variant="secondary" onClick={() => openPayment("received")}>
                  <Banknote className="h-4 w-4" /> Record payment
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/admin/payment-requests">Review tutor requests</Link>
                </Button>
              </div>
            </section>
          </div>
          <section className="surface p-5">
            <h2 className="font-extrabold">Recent activity</h2>
            <div className="mt-3 divide-y divide-border">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">
                    <CircleDollarSign className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.type} · {prettyDate(String(item.date).slice(0, 10))}
                    </p>
                  </div>
                  <Pill
                    tone={item.status === "received" || item.status === "paid" ? "green" : "amber"}
                  >
                    {item.status}
                  </Pill>
                  <strong>{money(item.amount)}</strong>
                </div>
              ))}
            </div>
          </section>
          <ZohoSyncPanel />
        </div>
      ) : null}

      {view === "clients" ? (
        <Section
          id="payment-clients"
          title="Clients"
          subtitle={`${allParents.length} client billing accounts`}
          action={
            <Button size="sm" variant="secondary" asChild>
              <Link to="/admin/parents">
                <UsersRound className="h-4 w-4" /> Manage contacts
              </Link>
            </Button>
          }
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {allParents
              .filter(
                (parent) =>
                  query === "" || fullName(parent).toLowerCase().includes(query.toLowerCase()),
              )
              .map((parent) => {
                const childIds = (parentLinks.data ?? [])
                  .filter((link) => link.parent_id === parent.id)
                  .map((link) => link.student_id);
                const clientSubscriptions = activeSubscriptions.filter(
                  (item) => item.parent_id === parent.id,
                );
                const clientPayments = allPayments.filter(
                  (item) => item.parent_id === parent.id && item.status === "received",
                );
                return (
                  <article key={parent.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        initials={initialsOf(fullName(parent))}
                        tone={avatarTone(fullName(parent))}
                      />
                      <div className="min-w-0">
                        <Link
                          to="/admin/parents/$id"
                          params={{ id: parent.id }}
                          className="block truncate font-bold hover:text-primary hover:underline"
                        >
                          {fullName(parent)}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {parent.email ?? parent.phone ?? "No contact details"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-muted p-2">
                        <strong className="block">{childIds.length}</strong>
                        <span className="text-[10px] text-muted-foreground">Children</span>
                      </div>
                      <div className="rounded-xl bg-muted p-2">
                        <strong className="block">{clientSubscriptions.length}</strong>
                        <span className="text-[10px] text-muted-foreground">Plans</span>
                      </div>
                      <div className="rounded-xl bg-muted p-2">
                        <strong className="block">
                          {money(clientPayments.reduce((sum, item) => sum + num(item.amount), 0))}
                        </strong>
                        <span className="text-[10px] text-muted-foreground">Paid</span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {childIds.map((id) => (
                        <Pill key={id} tone="neutral">
                          {studentName(id)}
                        </Pill>
                      ))}
                    </div>
                  </article>
                );
              })}
          </div>
        </Section>
      ) : null}

      {view === "subscriptions" ? (
        <div className="space-y-4">
          <div className="md:hidden">
            <h2 className="mb-2 text-xl font-extrabold">Subscriptions</h2>
            {filteredSubscriptions.length === 0 ? (
              <Empty>No subscriptions match this view.</Empty>
            ) : (
              <div className="divide-y divide-border">
                {filteredSubscriptions.map((item) => (
                  <article key={item.id} className="py-4 first:pt-1">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/admin/parents/$id"
                          params={{ id: item.parent_id }}
                          className="block truncate text-base font-extrabold hover:text-primary"
                        >
                          {parentName(item.parent_id)}
                        </Link>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {studentName(item.student_id)} · {item.plan_name ?? "Subscription"}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {item.next_due_date
                            ? `Next due ${prettyDate(item.next_due_date)}`
                            : "No due date"}
                        </p>
                        <p
                          className={`mt-2 text-xs font-extrabold tracking-wide uppercase ${
                            item.status === "active"
                              ? "text-emerald-600"
                              : item.status === "cancelled"
                                ? "text-rose-500"
                                : "text-muted-foreground"
                          }`}
                        >
                          {item.status}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-base font-extrabold">{money(item.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          /{item.cadence.replace("_", " ")}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            updateSubscription.mutate(
                              {
                                id: item.id,
                                values: { status: item.status === "active" ? "paused" : "active" },
                              },
                              { onSuccess: () => toast.success("Subscription updated") },
                            )
                          }
                          className="mt-3 text-sm font-bold text-primary"
                        >
                          {item.status === "active" ? "Pause" : "Resume"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="hidden md:block">
            <Section
              id="payment-subscriptions"
              title="Subscriptions"
              subtitle="Recurring plans agreed with clients"
              action={
                <Button size="sm" onClick={() => setSubscriptionOpen(true)}>
                  <Plus className="h-4 w-4" /> Add subscription
                </Button>
              }
            >
              {filteredSubscriptions.length === 0 ? (
                <Empty>No subscriptions match this view.</Empty>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {filteredSubscriptions.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-border p-4">
                      <div className="flex items-start gap-3">
                        <Avatar
                          initials={initialsOf(parentName(item.parent_id))}
                          tone={avatarTone(parentName(item.parent_id))}
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/admin/parents/$id"
                            params={{ id: item.parent_id }}
                            className="font-bold hover:text-primary hover:underline"
                          >
                            {parentName(item.parent_id)}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {studentName(item.student_id)} · {item.plan_name ?? "Subscription"}
                          </p>
                        </div>
                        <Pill tone={item.status === "active" ? "green" : "neutral"}>
                          {item.status}
                        </Pill>
                      </div>
                      <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
                        <div>
                          <strong className="text-lg">{money(item.amount)}</strong>
                          <span className="text-xs text-muted-foreground">
                            {" "}
                            / {item.cadence.replace("_", " ")}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {item.next_due_date
                              ? `Next due ${prettyDate(item.next_due_date)}`
                              : "No due date"}
                          </p>
                        </div>
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
                          {item.status === "active" ? "Pause" : "Resume"}
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>
      ) : null}

      {view === "transactions" ? (
        <Section
          id="payment-transactions"
          title="Transactions"
          subtitle="Invoices, collections and payments received"
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={exportTransactions}>
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button size="sm" onClick={() => openPayment("received")}>
                <WalletCards className="h-4 w-4" /> Record payment
              </Button>
            </div>
          }
        >
          {filtersOpen ? (
            <div className="mb-4 flex flex-wrap gap-2 rounded-xl bg-muted p-3">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="due">Payment due</option>
                <option value="overdue">Overdue</option>
                <option value="received">Paid</option>
              </select>
              <Button variant="ghost" onClick={() => setStatus("all")}>
                Clear
              </Button>
            </div>
          ) : null}
          {filteredPayments.length === 0 ? (
            <Empty>No transactions match this view.</Empty>
          ) : (
            <div className="divide-y divide-border">
              {filteredPayments.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Avatar
                    initials={initialsOf(parentName(item.parent_id))}
                    tone={avatarTone(parentName(item.parent_id))}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{parentName(item.parent_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {studentName(item.student_id)} · {item.reference ?? "No reference"}
                    </p>
                  </div>
                  <Pill tone={paymentTone(item.status)}>{paymentLabel(item.status)}</Pill>
                  <strong>{money(item.amount)}</strong>
                  {item.status !== "received" ? (
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
                          { onSuccess: () => toast.success("Payment marked as received") },
                        )
                      }
                    >
                      <Check className="h-4 w-4" /> Mark paid
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Section>
      ) : null}

      {view === "tutor-requests" ? (
        <Section
          id="payment-tutor-requests"
          title="Tutor payment requests"
          subtitle="Review submitted claims and lesson evidence"
          action={
            <Button size="sm" asChild>
              <Link to="/admin/payment-requests">Open full review</Link>
            </Button>
          }
        >
          {(paymentRequests.data ?? []).length === 0 ? (
            <Empty>No tutor requests have been submitted.</Empty>
          ) : (
            <div className="divide-y divide-border">
              {(paymentRequests.data ?? [])
                .slice()
                .reverse()
                .map((request) => {
                  const tutor = (tutors.data ?? []).find((item) => item.id === request.tutor_id);
                  return (
                    <div key={request.id} className="flex items-center gap-3 py-3">
                      <Avatar
                        initials={initialsOf(fullName(tutor))}
                        tone={avatarTone(fullName(tutor))}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">{fullName(tutor)}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.reference ?? "Payment request"} · {num(request.total_hours)}{" "}
                          hours
                        </p>
                      </div>
                      <Pill
                        tone={
                          request.status === "paid"
                            ? "blue"
                            : request.status === "approved"
                              ? "green"
                              : "amber"
                        }
                      >
                        {request.status}
                      </Pill>
                      <strong>{money(request.total_amount)}</strong>
                    </div>
                  );
                })}
            </div>
          )}
        </Section>
      ) : null}

      {view === "documents" ? (
        <Section
          id="payment-documents"
          title="Documents"
          subtitle="Editable childcare confirmations and invoice PDFs"
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
                Choose a client and student, edit every field and download.
              </span>
            </span>
            <span className="text-sm font-bold text-primary">Create</span>
          </button>
        </Section>
      ) : null}

      {view === "products" ? (
        <Section
          id="payment-products"
          title="Products & services"
          subtitle="Tuition, football and other billable services"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(billingPlans.data ?? []).map((plan) => (
              <article key={plan.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                    <PackageOpen className="h-5 w-5" />
                  </span>
                  <Pill tone={plan.active ? "green" : "neutral"}>
                    {plan.active ? "Active" : "Inactive"}
                  </Pill>
                </div>
                <h3 className="mt-3 font-bold">{plan.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.description ?? "Billable ProgressTutors service"}
                </p>
                <p className="mt-4 text-xl font-extrabold">{money(plan.unit_amount)}</p>
              </article>
            ))}
          </div>
          {(billingPlans.data ?? []).length === 0 ? (
            <Empty>No products or services have been added.</Empty>
          ) : null}
        </Section>
      ) : null}

      {invoiceSortOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-foreground/25 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-[2rem] bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold">Sort by</h2>
              <button
                type="button"
                onClick={() => setInvoiceSortOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
                aria-label="Close sort options"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-1">
              {[
                ["created", "Created time"],
                ["date", "Invoice date"],
                ["number", "Invoice number"],
                ["client", "Client name"],
                ["amount", "Amount"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setInvoiceSort(value as typeof invoiceSort)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left font-semibold ${
                    invoiceSort === value ? "border border-primary text-primary" : "hover:bg-muted"
                  }`}
                >
                  {label}
                  {invoiceSort === value ? (
                    <span className="text-xs">
                      {invoiceSortDirection === "desc" ? "New to old" : "Old to new"}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() =>
                  setInvoiceSortDirection((direction) => (direction === "desc" ? "asc" : "desc"))
                }
              >
                <ArrowDownUp className="h-4 w-4" />
                {invoiceSortDirection === "desc" ? "Descending" : "Ascending"}
              </Button>
              <Button className="flex-1" onClick={() => setInvoiceSortOpen(false)}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <FormDialog
        open={subscriptionOpen}
        onOpenChange={setSubscriptionOpen}
        title="Add subscription"
        description="Set the recurring amount and next billing date."
        submitLabel="Add subscription"
        busy={addSubscription.isPending}
        onSubmit={async () => {
          if (!subscription.parent_id || !subscription.amount) {
            toast.error("Choose a client and enter an amount");
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
          label="Client"
          value={subscription.parent_id}
          onChange={(value) => setSubscription({ ...subscription, parent_id: value })}
          options={[
            { value: "", label: "Choose client" },
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
        title={paymentMode === "invoice" ? "Create invoice" : "Record client payment"}
        description={
          paymentMode === "invoice"
            ? "Add an amount due from a client."
            : "Record money that has already been received."
        }
        submitLabel={paymentMode === "invoice" ? "Create invoice" : "Record payment"}
        busy={addPayment.isPending}
        onSubmit={async () => {
          if (!payment.parent_id || !payment.amount) {
            toast.error("Choose a client and enter an amount");
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
          label="Client"
          value={payment.parent_id}
          onChange={(value) => setPayment({ ...payment, parent_id: value })}
          options={[
            { value: "", label: "Choose client" },
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
        links={parentLinks.data ?? []}
      />
      <FamilyInvoiceDialog
        open={familyInvoiceOpen}
        onOpenChange={setFamilyInvoiceOpen}
        parents={parents.data ?? []}
        students={students.data ?? []}
        links={parentLinks.data ?? []}
        plans={(billingPlans.data ?? []).filter((plan) => plan.active)}
      />
    </Page>
  );
}
