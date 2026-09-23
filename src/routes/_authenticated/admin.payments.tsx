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
  Grid2X2,
  LayoutDashboard,
  ListFilter,
  List,
  Mail,
  MoreHorizontal,
  PackageOpen,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Trash2,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import {
  InvoiceEditScreen,
  type InvoiceEditValues,
} from "@/components/invoice-edit-screen";
import { FamilyInvoiceDialog } from "@/components/family-invoice-dialog";
import { PaymentDocumentDialog } from "@/components/payment-document-dialog";
import { ZohoSyncPanel } from "@/components/zoho-sync-panel";
import { Avatar, Empty, Pill, Section, StatCard, avatarTone } from "@/components/kit";
import {
  ConfirmDeleteDialog,
  FormDialog,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/form-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEMO_DATE,
  fullName,
  initialsOf,
  money,
  num,
  prettyDate,
  useDeleteRow,
  useTable,
  useUpdateRow,
  useUpsert,
  type Row,
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
  const deleteSubscription = useDeleteRow("client_subscriptions");
  const addPayment = useUpsert("client_payments", ["parents"]);
  const updatePayment = useUpdateRow("client_payments", ["parents"]);
  const updateInvoice = useUpdateRow("billing_invoices");
  const updateInvoiceItem = useUpdateRow("billing_invoice_items");
  const addInvoiceItem = useUpsert("billing_invoice_items");
  const deleteInvoice = useDeleteRow("billing_invoices");
  const deleteInvoiceItem = useDeleteRow("billing_invoice_items");
  const addProduct = useUpsert("billing_plans");
  const updateProduct = useUpdateRow("billing_plans");
  const deleteProduct = useDeleteRow("billing_plans");

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
  const [displayMode, setDisplayMode] = useState<"table" | "cards">("table");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null);
  const [subscriptionPendingDelete, setSubscriptionPendingDelete] =
    useState<Row<"client_subscriptions"> | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceEditing, setInvoiceEditing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Row<"billing_invoices"> | null>(null);
  const [invoicePendingDelete, setInvoicePendingDelete] = useState<Row<"billing_invoices"> | null>(
    null,
  );
  const [invoiceEdit, setInvoiceEdit] = useState({ status: "draft", due_date: "", notes: "" });
  const [productOpen, setProductOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productPendingDelete, setProductPendingDelete] = useState<Row<"billing_plans"> | null>(
    null,
  );
  const [product, setProduct] = useState({
    name: "",
    description: "",
    unit_amount: "",
    billing_frequency: "monthly",
    children_included: "1",
    active: "true",
  });
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
  const filteredClients = allParents.filter(
    (parent) => query === "" || fullName(parent).toLowerCase().includes(query.toLowerCase()),
  );
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

  function openNewSubscription() {
    setEditingSubscriptionId(null);
    setSubscription({
      parent_id: "",
      student_id: "",
      pricing_plan_id: "",
      weekly_hours: "2",
      amount: "",
      cadence: "monthly",
      next_due_date: DEMO_DATE,
      notes: "",
    });
    setSubscriptionOpen(true);
  }

  function openSubscription(item: Row<"client_subscriptions">) {
    setEditingSubscriptionId(item.id);
    setSubscription({
      parent_id: item.parent_id ?? "",
      student_id: item.student_id ?? "",
      pricing_plan_id: item.pricing_plan_id ?? "",
      weekly_hours: "2",
      amount: String(item.amount ?? ""),
      cadence: item.cadence,
      next_due_date: item.next_due_date ?? "",
      notes: item.notes ?? "",
    });
    setSubscriptionOpen(true);
  }

  function openInvoice(item: Row<"billing_invoices">) {
    setSelectedInvoice(item);
    setInvoiceEdit({
      status: item.status,
      due_date: item.due_date ?? "",
      notes: item.notes ?? "",
    });
    setInvoiceOpen(true);
  }

  function openNewProduct() {
    setEditingProductId(null);
    setProduct({
      name: "",
      description: "",
      unit_amount: "",
      billing_frequency: "monthly",
      children_included: "1",
      active: "true",
    });
    setProductOpen(true);
  }

  function openProduct(item: Row<"billing_plans">) {
    setEditingProductId(item.id);
    setProduct({
      name: item.name,
      description: item.description ?? "",
      unit_amount: String(item.unit_amount),
      billing_frequency: item.billing_frequency,
      children_included: String(item.children_included),
      active: String(item.active),
    });
    setProductOpen(true);
  }

  function openPrimaryAction() {
    if (view === "subscriptions") {
      openNewSubscription();
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
    if (view === "products") {
      openNewProduct();
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

  if (invoiceEditing && selectedInvoice) {
    const selectedItem = (invoiceItems.data ?? []).find(
      (item) => item.invoice_id === selectedInvoice.id,
    );

    const saveFullInvoice = async (values: InvoiceEditValues) => {
      try {
        const subtotal = values.item.quantity * values.item.unit_price;
        const taxTotal = subtotal * (values.item.tax_rate / 100);
        const total = subtotal + taxTotal;
        const invoiceValues = {
          parent_id: values.parent_id,
          issue_date: values.issue_date,
          due_date: values.due_date,
          status: values.status,
          notes: values.notes,
          subtotal,
          tax_total: taxTotal,
          total,
          balance_due: values.status === "paid" ? 0 : total,
          amount_paid: values.status === "paid" ? total : selectedInvoice.amount_paid,
        };
        await updateInvoice.mutateAsync({ id: selectedInvoice.id, values: invoiceValues });
        const itemValues = {
          student_id: values.item.student_id,
          billing_plan_id: values.item.billing_plan_id,
          description: values.item.description,
          quantity: values.item.quantity,
          unit_price: values.item.unit_price,
          tax_rate: values.item.tax_rate,
          line_subtotal: subtotal,
          tax_amount: taxTotal,
          line_total: total,
        };
        if (values.item.id) {
          await updateInvoiceItem.mutateAsync({ id: values.item.id, values: itemValues });
        } else {
          await addInvoiceItem.mutateAsync({
            invoice_id: selectedInvoice.id,
            ...itemValues,
          });
        }
        setSelectedInvoice({ ...selectedInvoice, ...invoiceValues });
        setInvoiceEdit({
          status: values.status,
          due_date: values.due_date ?? "",
          notes: values.notes ?? "",
        });
        setInvoiceEditing(false);
        toast.success("Invoice updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update invoice");
      }
    };

    return (
      <Page className="p-0 sm:p-0">
        <InvoiceEditScreen
          invoice={selectedInvoice}
          item={selectedItem}
          parents={parents.data ?? []}
          students={students.data ?? []}
          plans={(billingPlans.data ?? []).filter((plan) => plan.active)}
          busy={
            updateInvoice.isPending ||
            updateInvoiceItem.isPending ||
            addInvoiceItem.isPending
          }
          onCancel={() => setInvoiceEditing(false)}
          onDelete={() => {
            setInvoicePendingDelete(selectedInvoice);
            setInvoiceEditing(false);
          }}
          onSave={saveFullInvoice}
        />
      </Page>
    );
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
                    : view === "products"
                      ? "Add product"
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
          <div className="hidden rounded-xl bg-muted p-1 md:flex" aria-label="Display mode">
            <button
              type="button"
              onClick={() => setDisplayMode("table")}
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                displayMode === "table" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
              }`}
              aria-label="Table view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("cards")}
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                displayMode === "cards" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
              }`}
              aria-label="Card view"
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
          </div>
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

      {view === "invoices" && invoiceOpen && selectedInvoice ? (
        <InvoiceSplitWorkspace
          invoices={filteredInvoices.slice(0, invoiceLimit)}
          invoiceItems={invoiceItems.data ?? []}
          selectedInvoice={selectedInvoice}
          edit={invoiceEdit}
          onEditChange={setInvoiceEdit}
          parentName={parentName}
          parentEmail={(id) =>
            (parents.data ?? []).find((parent) => parent.id === id)?.email ?? "No email address"
          }
          studentName={studentName}
          onSelect={openInvoice}
          onClose={() => {
            setInvoiceOpen(false);
            setSelectedInvoice(null);
          }}
          onNew={() => setFamilyInvoiceOpen(true)}
          onEdit={() => setInvoiceEditing(true)}
          onDelete={() => {
            setInvoicePendingDelete(selectedInvoice);
            setInvoiceOpen(false);
            setSelectedInvoice(null);
          }}
          saving={updateInvoice.isPending}
          onSave={async () => {
            const values = {
              status: invoiceEdit.status,
              due_date: invoiceEdit.due_date || null,
              notes: invoiceEdit.notes || null,
            };
            await updateInvoice.mutateAsync({ id: selectedInvoice.id, values });
            setSelectedInvoice({ ...selectedInvoice, ...values });
            toast.success("Invoice updated");
          }}
        />
      ) : null}

      {view === "invoices" && (!invoiceOpen || !selectedInvoice) ? (
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

          <div className="hidden items-center gap-5 rounded-xl border border-border bg-muted/45 px-4 py-3 md:flex">
            <div className="flex min-w-0 items-center gap-2 font-bold">
              <FileText className="h-4 w-4 text-primary" />
              <span className="whitespace-nowrap">Invoice insights</span>
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-4 gap-4 text-xs">
              <p className="truncate">
                <span className="text-muted-foreground">Outstanding </span>
                <strong>{money(outstandingTotal)}</strong>
              </p>
              <p className="truncate">
                <span className="text-muted-foreground">Overdue </span>
                <strong>{allPayments.filter((item) => item.status === "overdue").length}</strong>
              </p>
              <p className="truncate">
                <span className="text-muted-foreground">Paid </span>
                <strong>{money(receivedTotal)}</strong>
              </p>
              <p className="truncate">
                <span className="text-muted-foreground">Drafts </span>
                <strong>{draftInvoices.length}</strong>
              </p>
            </div>
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
                    <article
                      key={invoice.id}
                      className="cursor-pointer py-4 first:pt-1"
                      onClick={() => openInvoice(invoice)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar
                          initials={initialsOf(parentName(invoice.parent_id))}
                          tone={avatarTone(parentName(invoice.parent_id))}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/admin/parents/$id"
                            params={{ id: invoice.parent_id }}
                            onClick={(event) => event.stopPropagation()}
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
                                <Link
                                  key={studentId}
                                  to="/admin/students/$id"
                                  params={{ id: studentId }}
                                  onClick={(event) => event.stopPropagation()}
                                  className="flex items-center gap-1 rounded-full bg-muted pr-2 text-xs font-semibold hover:text-primary"
                                >
                                  <Avatar
                                    initials={initialsOf(studentName(studentId))}
                                    tone={avatarTone(studentName(studentId))}
                                    size="sm"
                                  />
                                  {studentName(studentId)}
                                </Link>
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

          {displayMode === "cards" ? (
            <div className="hidden gap-3 md:grid lg:grid-cols-2 xl:grid-cols-3">
              {filteredInvoices.slice(0, invoiceLimit).map((invoice) => {
                const children = Array.from(
                  new Set(
                    (invoiceItems.data ?? [])
                      .filter((line) => line.invoice_id === invoice.id)
                      .map((line) => line.student_id)
                      .filter(Boolean),
                  ),
                );
                return (
                  <button
                    key={invoice.id}
                    type="button"
                    onClick={() => openInvoice(invoice)}
                    className="rounded-2xl border border-border bg-card p-4 text-left hover:bg-muted/45"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar
                        initials={initialsOf(parentName(invoice.parent_id))}
                        tone={avatarTone(parentName(invoice.parent_id))}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{parentName(invoice.parent_id)}</p>
                        <p className="text-xs text-muted-foreground">{invoice.invoice_number}</p>
                      </div>
                      <Pill
                        tone={
                          invoice.status === "paid"
                            ? "green"
                            : invoice.status === "draft"
                              ? "neutral"
                              : "amber"
                        }
                      >
                        {invoice.status}
                      </Pill>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {children.map((id) => (
                        <Pill key={id} tone="neutral">
                          {studentName(id)}
                        </Pill>
                      ))}
                    </div>
                    <p className="mt-4 text-xl font-extrabold">{money(invoice.total)}</p>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div
            className={`${displayMode === "cards" ? "hidden" : "md:block"} overflow-hidden rounded-2xl border border-border bg-card shadow-sm max-md:hidden`}
          >
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
                          <td className="px-4 py-3 font-bold">
                            <button
                              type="button"
                              onClick={() => openInvoice(invoice)}
                              className="text-primary hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              aria-label={`Open invoice ${invoice.invoice_number}`}
                            >
                              {invoice.invoice_number}
                            </button>
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            <Link
                              to="/admin/parents/$id"
                              params={{ id: invoice.parent_id }}
                              className="flex items-center gap-2 hover:text-primary hover:underline"
                            >
                              <Avatar
                                initials={initialsOf(parentName(invoice.parent_id))}
                                tone={avatarTone(parentName(invoice.parent_id))}
                                size="sm"
                              />
                              {parentName(invoice.parent_id)}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {children.slice(0, 2).map((id) => (
                                <Link
                                  key={id}
                                  to="/admin/students/$id"
                                  params={{ id }}
                                  className="flex items-center gap-1 rounded-full bg-muted pr-2 text-xs font-semibold hover:text-primary"
                                >
                                  <Avatar
                                    initials={initialsOf(studentName(id))}
                                    tone={avatarTone(studentName(id))}
                                    size="sm"
                                  />
                                  {studentName(id)}
                                </Link>
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
                                onClick={() => openInvoice(invoice)}
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
          {displayMode === "cards" ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredClients.map((parent) => {
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-3 font-semibold">Client</th>
                    <th className="pb-3 font-semibold">Students</th>
                    <th className="pb-3 font-semibold">Subscriptions</th>
                    <th className="pb-3 text-right font-semibold">Paid</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredClients.map((parent) => {
                    const childIds = (parentLinks.data ?? [])
                      .filter((link) => link.parent_id === parent.id)
                      .map((link) => link.student_id);
                    const clientSubscriptions = activeSubscriptions.filter(
                      (item) => item.parent_id === parent.id,
                    );
                    const paid = allPayments
                      .filter((item) => item.parent_id === parent.id && item.status === "received")
                      .reduce((sum, item) => sum + num(item.amount), 0);
                    return (
                      <tr key={parent.id} className="hover:bg-muted/45">
                        <td className="py-3 pr-4">
                          <Link
                            to="/admin/parents/$id"
                            params={{ id: parent.id }}
                            className="flex items-center gap-3"
                          >
                            <Avatar
                              initials={initialsOf(fullName(parent))}
                              tone={avatarTone(fullName(parent))}
                              size="sm"
                            />
                            <span>
                              <span className="block font-bold">{fullName(parent)}</span>
                              <span className="block text-xs text-muted-foreground">
                                {parent.email ?? parent.phone ?? "No contact details"}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {childIds.map((id) => (
                              <Pill key={id} tone="neutral">
                                {studentName(id)}
                              </Pill>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 font-bold">{clientSubscriptions.length}</td>
                        <td className="py-3 text-right font-extrabold">{money(paid)}</td>
                        <td className="py-3">
                          <Pill tone={parent.status === "active" ? "green" : "neutral"}>
                            {parent.status}
                          </Pill>
                        </td>
                        <td className="py-3 text-right">
                          <Button size="sm" variant="ghost" asChild>
                            <Link to="/admin/parents/$id" params={{ id: parent.id }}>
                              Open
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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
                  <article
                    key={item.id}
                    className="cursor-pointer py-4 first:pt-1"
                    onClick={() => openSubscription(item)}
                  >
                    <div className="flex items-start gap-3">
                      <Link
                        to="/admin/parents/$id"
                        params={{ id: item.parent_id }}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Open ${parentName(item.parent_id)}'s page`}
                      >
                        <Avatar
                          initials={initialsOf(parentName(item.parent_id))}
                          tone={avatarTone(parentName(item.parent_id))}
                          size="sm"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/admin/parents/$id"
                          params={{ id: item.parent_id }}
                          onClick={(event) => event.stopPropagation()}
                          className="block truncate text-base font-extrabold hover:text-primary"
                        >
                          {parentName(item.parent_id)}
                        </Link>
                        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                          {item.student_id ? (
                            <Link
                              to="/admin/students/$id"
                              params={{ id: item.student_id }}
                              onClick={(event) => event.stopPropagation()}
                              className="flex min-w-0 items-center gap-1.5 hover:text-primary hover:underline"
                            >
                              <Avatar
                                initials={initialsOf(studentName(item.student_id))}
                                tone={avatarTone(studentName(item.student_id))}
                                size="sm"
                              />
                              <span className="truncate">{studentName(item.student_id)}</span>
                            </Link>
                          ) : (
                            <span>No student linked</span>
                          )}
                          <span>· {item.plan_name ?? "Subscription"}</span>
                        </div>
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
                          onClick={(event) => {
                            event.stopPropagation();
                            updateSubscription.mutate(
                              {
                                id: item.id,
                                values: { status: item.status === "active" ? "paused" : "active" },
                              },
                              { onSuccess: () => toast.success("Subscription updated") },
                            );
                          }}
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

          <div className="hidden space-y-4 md:block">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold">All subscriptions</h2>
                <p className="text-sm text-muted-foreground">Recurring billing plans by client</p>
              </div>
              <Button size="sm" onClick={openNewSubscription}>
                <Plus className="h-4 w-4" /> Add subscription
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="All" value={String((subscriptions.data ?? []).length)} tone="blue" />
              <StatCard
                label="Active"
                value={String(
                  (subscriptions.data ?? []).filter((item) => item.status === "active").length,
                )}
                tone="green"
              />
              <StatCard label="Monthly value" value={money(recurringTotal)} tone="purple" />
              <StatCard
                label="Cancelled"
                value={String(
                  (subscriptions.data ?? []).filter((item) => item.status === "cancelled").length,
                )}
                tone="amber"
              />
            </div>
            {filteredSubscriptions.length === 0 ? (
              <Empty>No subscriptions match this view.</Empty>
            ) : displayMode === "cards" ? (
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {filteredSubscriptions.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-border p-4 text-left hover:bg-muted/45"
                  >
                    <div className="flex items-start gap-3">
                      <Link to="/admin/parents/$id" params={{ id: item.parent_id }}>
                        <Avatar
                          initials={initialsOf(parentName(item.parent_id))}
                          tone={avatarTone(parentName(item.parent_id))}
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/admin/parents/$id"
                          params={{ id: item.parent_id }}
                          className="block truncate font-bold hover:text-primary hover:underline"
                        >
                          {parentName(item.parent_id)}
                        </Link>
                        <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                          {item.student_id ? (
                            <Link
                              to="/admin/students/$id"
                              params={{ id: item.student_id }}
                              className="flex min-w-0 items-center gap-1.5 hover:text-primary hover:underline"
                            >
                              <Avatar
                                initials={initialsOf(studentName(item.student_id))}
                                tone={avatarTone(studentName(item.student_id))}
                                size="sm"
                              />
                              <span className="truncate">{studentName(item.student_id)}</span>
                            </Link>
                          ) : (
                            <span>No student linked</span>
                          )}
                          <span>· {item.plan_name ?? "Subscription"}</span>
                        </div>
                      </div>
                      <Pill tone={item.status === "active" ? "green" : "neutral"}>
                        {item.status}
                      </Pill>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-lg font-extrabold">{money(item.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.next_due_date
                            ? `Next due ${prettyDate(item.next_due_date)}`
                            : "No due date"}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => openSubscription(item)}>
                        Edit
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-muted/90 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Client</th>
                      <th className="px-4 py-3 font-semibold">Student</th>
                      <th className="px-4 py-3 font-semibold">Plan</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Next due</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSubscriptions.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/45">
                        <td className="px-4 py-3">
                          <Link
                            to="/admin/parents/$id"
                            params={{ id: item.parent_id }}
                            className="flex items-center gap-2 text-left font-bold hover:text-primary hover:underline"
                          >
                            <Avatar
                              initials={initialsOf(parentName(item.parent_id))}
                              tone={avatarTone(parentName(item.parent_id))}
                              size="sm"
                            />
                            {parentName(item.parent_id)}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {item.student_id ? (
                            <Link
                              to="/admin/students/$id"
                              params={{ id: item.student_id }}
                              className="flex items-center gap-2 font-semibold hover:text-primary hover:underline"
                            >
                              <Avatar
                                initials={initialsOf(studentName(item.student_id))}
                                tone={avatarTone(studentName(item.student_id))}
                                size="sm"
                              />
                              {studentName(item.student_id)}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">No student linked</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{item.plan_name ?? "Subscription"}</td>
                        <td className="px-4 py-3">
                          <Pill tone={item.status === "active" ? "green" : "neutral"}>
                            {item.status}
                          </Pill>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.next_due_date ? prettyDate(item.next_due_date) : "Not set"}
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold">
                          {money(item.amount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => openSubscription(item)}>
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
          action={
            <Button size="sm" onClick={openNewProduct}>
              <Plus className="h-4 w-4" /> Add product
            </Button>
          }
        >
          {(billingPlans.data ?? []).length === 0 ? (
            <Empty>No products or services have been added.</Empty>
          ) : displayMode === "cards" ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(billingPlans.data ?? []).map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => openProduct(plan)}
                  className="rounded-2xl border border-border p-4 text-left hover:bg-muted/45"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                      <PackageOpen className="h-5 w-5" />
                    </span>
                    <Pill tone={plan.active ? "green" : "neutral"}>
                      {plan.active ? "Active" : "Inactive"}
                    </Pill>
                  </div>
                  <h3 className="mt-3 font-bold">{plan.name}</h3>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {plan.description ?? "Billable ProgressTutors service"}
                  </p>
                  <p className="mt-4 text-xl font-extrabold">{money(plan.unit_amount)}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-3 font-semibold">Product or service</th>
                    <th className="pb-3 font-semibold">Frequency</th>
                    <th className="pb-3 font-semibold">Students</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 text-right font-semibold">Price</th>
                    <th className="pb-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(billingPlans.data ?? []).map((plan) => (
                    <tr key={plan.id} className="hover:bg-muted/45">
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          onClick={() => openProduct(plan)}
                          className="flex items-center gap-3 text-left"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                            <PackageOpen className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block font-bold">{plan.name}</span>
                            <span className="block max-w-md truncate text-xs text-muted-foreground">
                              {plan.description ?? "Billable ProgressTutors service"}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="py-3 capitalize">
                        {plan.billing_frequency.replace("_", " ")}
                      </td>
                      <td className="py-3">{plan.children_included}</td>
                      <td className="py-3">
                        <Pill tone={plan.active ? "green" : "neutral"}>
                          {plan.active ? "Active" : "Inactive"}
                        </Pill>
                      </td>
                      <td className="py-3 text-right font-extrabold">{money(plan.unit_amount)}</td>
                      <td className="py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => openProduct(plan)}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
        title={editingSubscriptionId ? "Edit subscription" : "Add subscription"}
        description="Set the recurring amount and next billing date."
        submitLabel={editingSubscriptionId ? "Save changes" : "Add subscription"}
        busy={addSubscription.isPending || updateSubscription.isPending}
        dangerLabel={editingSubscriptionId ? "Delete" : undefined}
        onDanger={
          editingSubscriptionId
            ? () => {
                const current = (subscriptions.data ?? []).find(
                  (item) => item.id === editingSubscriptionId,
                );
                if (current) setSubscriptionPendingDelete(current);
                setSubscriptionOpen(false);
              }
            : undefined
        }
        onSubmit={async () => {
          if (!subscription.parent_id || !subscription.amount) {
            toast.error("Choose a client and enter an amount");
            return;
          }
          const plan = (plans.data ?? []).find((item) => item.id === subscription.pricing_plan_id);
          const existing = (subscriptions.data ?? []).find(
            (item) => item.id === editingSubscriptionId,
          );
          const values = {
            parent_id: subscription.parent_id,
            student_id: subscription.student_id || null,
            pricing_plan_id: subscription.pricing_plan_id || null,
            programme_id: plan?.programme_id ?? null,
            plan_name: plan?.name ?? existing?.plan_name ?? "Subscription",
            amount: Number(subscription.amount),
            cadence: subscription.cadence,
            next_due_date: subscription.next_due_date || null,
            notes: subscription.notes || null,
            status: existing?.status ?? "active",
          };
          if (editingSubscriptionId) {
            await updateSubscription.mutateAsync({ id: editingSubscriptionId, values });
            toast.success("Subscription updated");
          } else {
            await addSubscription.mutateAsync(values);
            toast.success("Subscription added");
          }
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
        open={productOpen}
        onOpenChange={setProductOpen}
        title={editingProductId ? "Edit product or service" : "Add product or service"}
        submitLabel={editingProductId ? "Save changes" : "Add product"}
        busy={addProduct.isPending || updateProduct.isPending}
        dangerLabel={editingProductId ? "Delete" : undefined}
        onDanger={
          editingProductId
            ? () => {
                const current = (billingPlans.data ?? []).find(
                  (item) => item.id === editingProductId,
                );
                if (current) setProductPendingDelete(current);
                setProductOpen(false);
              }
            : undefined
        }
        onSubmit={async () => {
          if (!product.name.trim() || !product.unit_amount) {
            toast.error("Enter a name and price");
            return;
          }
          const values = {
            name: product.name.trim(),
            description: product.description || null,
            unit_amount: Number(product.unit_amount),
            billing_frequency: product.billing_frequency,
            children_included: Number(product.children_included || 1),
            active: product.active === "true",
            currency: "GBP",
            source: "manual",
          };
          if (editingProductId) await updateProduct.mutateAsync({ id: editingProductId, values });
          else await addProduct.mutateAsync(values);
          toast.success(editingProductId ? "Product updated" : "Product added");
          setProductOpen(false);
        }}
      >
        <TextField
          label="Name"
          value={product.name}
          onChange={(value) => setProduct({ ...product, name: value })}
          required
        />
        <TextField
          label="Price (£)"
          type="number"
          value={product.unit_amount}
          onChange={(value) => setProduct({ ...product, unit_amount: value })}
          required
        />
        <SelectField
          label="Billing frequency"
          value={product.billing_frequency}
          onChange={(value) => setProduct({ ...product, billing_frequency: value })}
          options={[
            { value: "one_off", label: "One off" },
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
            { value: "termly", label: "Termly" },
          ]}
        />
        <TextField
          label="Students included"
          type="number"
          value={product.children_included}
          onChange={(value) => setProduct({ ...product, children_included: value })}
        />
        <SelectField
          label="Status"
          value={product.active}
          onChange={(value) => setProduct({ ...product, active: value })}
          options={[
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ]}
        />
        <TextAreaField
          label="Description"
          value={product.description}
          onChange={(value) => setProduct({ ...product, description: value })}
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
      <ConfirmDeleteDialog
        open={Boolean(subscriptionPendingDelete)}
        onOpenChange={(open) => !open && setSubscriptionPendingDelete(null)}
        title="Delete this subscription?"
        description="This permanently removes the recurring plan. Existing invoices remain unchanged."
        confirmLabel="Delete subscription"
        busy={deleteSubscription.isPending}
        onConfirm={async () => {
          if (!subscriptionPendingDelete) return;
          try {
            await deleteSubscription.mutateAsync(subscriptionPendingDelete.id);
            setSubscriptionPendingDelete(null);
            toast.success("Subscription deleted");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not delete subscription");
          }
        }}
      />
      <ConfirmDeleteDialog
        open={Boolean(invoicePendingDelete)}
        onOpenChange={(open) => !open && setInvoicePendingDelete(null)}
        title="Delete this invoice?"
        description="This permanently deletes the invoice and all of its line items."
        confirmLabel="Delete invoice"
        busy={deleteInvoice.isPending || deleteInvoiceItem.isPending}
        onConfirm={async () => {
          if (!invoicePendingDelete) return;
          try {
            const lines = (invoiceItems.data ?? []).filter(
              (item) => item.invoice_id === invoicePendingDelete.id,
            );
            for (const line of lines) await deleteInvoiceItem.mutateAsync(line.id);
            await deleteInvoice.mutateAsync(invoicePendingDelete.id);
            setInvoicePendingDelete(null);
            toast.success("Invoice deleted");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not delete invoice");
          }
        }}
      />
      <ConfirmDeleteDialog
        open={Boolean(productPendingDelete)}
        onOpenChange={(open) => !open && setProductPendingDelete(null)}
        title="Delete this product or service?"
        description="This removes it from the billing catalogue."
        confirmLabel="Delete product"
        busy={deleteProduct.isPending}
        onConfirm={async () => {
          if (!productPendingDelete) return;
          try {
            await deleteProduct.mutateAsync(productPendingDelete.id);
            setProductPendingDelete(null);
            toast.success("Product deleted");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not delete product");
          }
        }}
      />
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

type InvoiceEditState = { status: string; due_date: string; notes: string };

function InvoiceSplitWorkspace({
  invoices,
  invoiceItems,
  selectedInvoice,
  edit,
  onEditChange,
  parentName,
  parentEmail,
  studentName,
  onSelect,
  onClose,
  onNew,
  onEdit,
  onDelete,
  onSave,
  saving,
}: {
  invoices: Row<"billing_invoices">[];
  invoiceItems: Row<"billing_invoice_items">[];
  selectedInvoice: Row<"billing_invoices">;
  edit: InvoiceEditState;
  onEditChange: (value: InvoiceEditState) => void;
  parentName: (id: string | null) => string;
  parentEmail: (id: string | null) => string;
  studentName: (id: string | null) => string;
  onSelect: (invoice: Row<"billing_invoices">) => void;
  onClose: () => void;
  onNew: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSave: () => Promise<void>;
  saving: boolean;
}) {
  const lines = invoiceItems.filter((item) => item.invoice_id === selectedInvoice.id);
  const clientName = parentName(selectedInvoice.parent_id);
  const clientEmail = parentEmail(selectedInvoice.parent_id);
  const paid = edit.status === "paid";

  return (
    <section className="-mx-4 -mb-6 overflow-hidden border-y border-border bg-card sm:-mx-6 lg:-mx-8 lg:rounded-xl lg:border">
      <div className="grid min-h-[calc(100dvh-var(--app-header-height)-8.75rem)] grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 border-r border-border bg-background lg:flex lg:flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <div>
              <h2 className="font-extrabold">All invoices</h2>
              <p className="text-[11px] text-muted-foreground">{invoices.length} shown</p>
            </div>
            <Button size="icon" className="h-9 w-9" onClick={onNew} aria-label="New invoice">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
            {invoices.map((invoice) => {
              const isSelected = invoice.id === selectedInvoice.id;
              return (
                <div
                  key={invoice.id}
                  className={`px-4 py-3 transition-colors ${
                    isSelected ? "bg-secondary" : "hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Link
                      to="/admin/parents/$id"
                      params={{ id: invoice.parent_id }}
                      aria-label={`Open ${parentName(invoice.parent_id)}'s page`}
                    >
                      <Avatar
                        initials={initialsOf(parentName(invoice.parent_id))}
                        tone={avatarTone(parentName(invoice.parent_id))}
                        size="sm"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to="/admin/parents/$id"
                          params={{ id: invoice.parent_id }}
                          className="truncate text-sm font-bold hover:text-primary hover:underline"
                        >
                          {parentName(invoice.parent_id)}
                        </Link>
                        <p className="shrink-0 text-sm font-extrabold">{money(invoice.total)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelect(invoice)}
                        className="mt-0.5 block w-full text-left"
                        aria-label={`Open invoice ${invoice.invoice_number}`}
                      >
                        <span className="block text-xs font-semibold text-primary hover:underline">
                          {invoice.invoice_number} ·{" "}
                          {prettyDate(invoice.issue_date ?? invoice.created_at.slice(0, 10))}
                        </span>
                        <span
                          className={`mt-1 block text-[10px] font-extrabold uppercase ${invoice.status === "paid" ? "text-emerald-600" : invoice.status === "draft" ? "text-muted-foreground" : "text-amber-600"}`}
                        >
                          {invoice.status}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <div className="min-w-0 bg-muted/35">
          <div className="sticky top-[var(--app-header-height)] z-20 border-b border-border bg-background/95 backdrop-blur">
            <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
                aria-label="Back to all invoices"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-extrabold">
                  {selectedInvoice.invoice_number}
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  {clientName} · {money(selectedInvoice.total)}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={onEdit}>
                <Pencil className="h-4 w-4" /> Edit invoice
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="hidden sm:flex"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" /> PDF/Print
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="hidden h-9 w-9 lg:flex"
                onClick={onClose}
                aria-label="Close invoice"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-end gap-2 overflow-x-auto border-t border-border px-3 py-2 sm:px-4">
              <label className="shrink-0">
                <span className="sr-only">Invoice status</span>
                <select
                  value={edit.status}
                  onChange={(event) => onEditChange({ ...edit, status: event.target.value })}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-bold"
                >
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="void">Void</option>
                </select>
              </label>
              <label className="shrink-0">
                <span className="sr-only">Due date</span>
                <input
                  type="date"
                  value={edit.due_date}
                  onChange={(event) => onEditChange({ ...edit, due_date: event.target.value })}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-xs"
                />
              </label>
              <Button size="sm" onClick={() => void onSave()} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                onClick={() => {
                  window.location.href = `mailto:${clientEmail}?subject=${encodeURIComponent(`Invoice ${selectedInvoice.invoice_number}`)}`;
                }}
              >
                <Mail className="h-4 w-4" /> Email
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 sm:hidden"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="ml-auto h-9 w-9 shrink-0 text-destructive"
                onClick={onDelete}
                aria-label="Delete invoice"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mx-auto max-w-5xl p-3 sm:p-5 lg:p-8">
            <div className="mb-3 rounded-xl border border-border bg-background px-4 py-3">
              <label className="text-xs font-bold text-muted-foreground" htmlFor="invoice-notes">
                Internal notes
              </label>
              <textarea
                id="invoice-notes"
                value={edit.notes}
                onChange={(event) => onEditChange({ ...edit, notes: event.target.value })}
                placeholder="Add an internal note"
                rows={2}
                className="mt-1 w-full resize-y bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <article className="relative mx-auto min-h-[720px] max-w-4xl overflow-hidden border border-border bg-white p-6 text-slate-900 shadow-sm sm:p-10 lg:p-14">
              <div
                className={`absolute top-6 -left-12 w-44 -rotate-45 py-1 text-center text-xs font-bold text-white ${paid ? "bg-emerald-500" : edit.status === "void" ? "bg-slate-500" : "bg-primary"}`}
              >
                {edit.status.toUpperCase()}
              </div>
              <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-8">
                <div>
                  <p className="text-xl font-black text-primary">ProgressTutors</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Progressay Impact CIC
                    <br />
                    196 Freston Road
                    <br />
                    London W10 6TT
                    <br />
                    moktar@progressay.com
                  </p>
                </div>
                <div className="text-right">
                  <h1 className="text-4xl font-light">Invoice</h1>
                  <p className="mt-2 text-sm font-bold">{selectedInvoice.invoice_number}</p>
                  <p className="mt-7 text-xs text-slate-500">Balance due</p>
                  <p className="text-xl font-extrabold">
                    {money(paid ? 0 : selectedInvoice.balance_due)}
                  </p>
                </div>
              </header>

              <div className="grid gap-8 py-8 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Bill to
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <Link
                      to="/admin/parents/$id"
                      params={{ id: selectedInvoice.parent_id }}
                      aria-label={`Open ${clientName}'s page`}
                    >
                      <Avatar
                        initials={initialsOf(clientName)}
                        tone={avatarTone(clientName)}
                        size="sm"
                      />
                    </Link>
                    <div className="min-w-0">
                      <Link
                        to="/admin/parents/$id"
                        params={{ id: selectedInvoice.parent_id }}
                        className="block truncate font-bold text-primary hover:underline"
                      >
                        {clientName}
                      </Link>
                      <p className="truncate text-sm text-slate-500">{clientEmail}</p>
                    </div>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm sm:justify-self-end">
                  <dt className="text-slate-500">Invoice date</dt>
                  <dd className="text-right font-semibold">
                    {prettyDate(
                      selectedInvoice.issue_date ?? selectedInvoice.created_at.slice(0, 10),
                    )}
                  </dd>
                  <dt className="text-slate-500">Due date</dt>
                  <dd className="text-right font-semibold">
                    {edit.due_date ? prettyDate(edit.due_date) : "Not set"}
                  </dd>
                  <dt className="text-slate-500">Status</dt>
                  <dd className="text-right font-semibold capitalize">{edit.status}</dd>
                </dl>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] text-left text-sm">
                  <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Student / description</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Rate</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {lines.length ? (
                      lines.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {item.student_id ? (
                                <Link
                                  to="/admin/students/$id"
                                  params={{ id: item.student_id }}
                                  aria-label={`Open ${studentName(item.student_id)}'s page`}
                                >
                                  <Avatar
                                    initials={initialsOf(studentName(item.student_id))}
                                    tone={avatarTone(studentName(item.student_id))}
                                    size="sm"
                                  />
                                </Link>
                              ) : null}
                              <div className="min-w-0">
                                {item.student_id ? (
                                  <Link
                                    to="/admin/students/$id"
                                    params={{ id: item.student_id }}
                                    className="block truncate font-semibold hover:text-primary hover:underline"
                                  >
                                    {studentName(item.student_id)}
                                  </Link>
                                ) : (
                                  <p className="font-semibold">No student linked</p>
                                )}
                                <p className="text-xs text-slate-500">{item.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">{item.quantity}</td>
                          <td className="px-4 py-4 text-right">{money(item.unit_price)}</td>
                          <td className="px-4 py-4 text-right font-bold">
                            {money(item.line_total)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                          No detailed line items are stored for this imported invoice.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="ml-auto mt-8 w-full max-w-xs space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span>{money(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tax</span>
                  <span>{money(selectedInvoice.tax_total)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-300 pt-3 text-base font-extrabold">
                  <span>Total</span>
                  <span>{money(selectedInvoice.total)}</span>
                </div>
                <div className="flex justify-between rounded-md bg-rose-50 px-3 py-2 font-extrabold text-primary">
                  <span>Amount due</span>
                  <span>{money(paid ? 0 : selectedInvoice.balance_due)}</span>
                </div>
              </div>
              {edit.notes ? (
                <div className="mt-10 border-t border-slate-200 pt-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Notes</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{edit.notes}</p>
                </div>
              ) : null}
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
