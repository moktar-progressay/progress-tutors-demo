import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Plus, Save, Search, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Avatar, Empty, Pill, avatarTone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fullName,
  initialsOf,
  money,
  num,
  prettyDate,
  useTable,
  useUpdateRow,
  type ParentRow,
} from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/parents/$id")({
  head: () => ({
    meta: [
      { title: "Client record | ProgressTutors" },
      { name: "description", content: "Client contact, students and billing record." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientDetail,
});

type ClientTab = "overview" | "transactions";

function ClientDetail() {
  const { id } = Route.useParams();
  const parents = useTable("parents", "first_name");
  const students = useTable("students", "first_name");
  const links = useTable("parent_students");
  const subscriptions = useTable("client_subscriptions");
  const invoices = useTable("billing_invoices", "created_at");
  const invoiceItems = useTable("billing_invoice_items");
  const payments = useTable("client_payments", "payment_date");
  const update = useUpdateRow("parents");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ClientTab>("transactions");
  const [editing, setEditing] = useState(false);

  if (parents.isLoading) {
    return (
      <Page>
        <Empty>Loading client…</Empty>
      </Page>
    );
  }

  const allParents = parents.data ?? [];
  const client = allParents.find((parent) => parent.id === id);
  if (!client) {
    return (
      <Page>
        <Empty>That client record could not be found.</Empty>
      </Page>
    );
  }

  const childIds = (links.data ?? [])
    .filter((link) => link.parent_id === id)
    .map((link) => link.student_id);
  const children = (students.data ?? []).filter((student) => childIds.includes(student.id));
  const clientSubscriptions = (subscriptions.data ?? []).filter((item) => item.parent_id === id);
  const clientInvoices = (invoices.data ?? [])
    .filter((item) => item.parent_id === id)
    .slice()
    .reverse();
  const clientPayments = (payments.data ?? [])
    .filter((item) => item.parent_id === id)
    .slice()
    .reverse();
  const outstanding = clientInvoices
    .filter((invoice) => invoice.status !== "paid")
    .reduce((sum, invoice) => sum + num(invoice.balance_due ?? invoice.total), 0);
  const collected = clientPayments
    .filter((payment) => ["paid", "received"].includes(payment.status))
    .reduce((sum, payment) => sum + num(payment.amount), 0);
  const studentById = new Map((students.data ?? []).map((student) => [student.id, student]));
  const studentForInvoice = (invoiceId: string) => {
    const item = (invoiceItems.data ?? []).find((line) => line.invoice_id === invoiceId);
    return item?.student_id ? studentById.get(item.student_id) : undefined;
  };
  const filteredParents = allParents.filter(
    (parent) =>
      !query ||
      fullName(parent).toLowerCase().includes(query.toLowerCase()) ||
      (parent.email ?? "").toLowerCase().includes(query.toLowerCase()),
  );
  const clientBalance = (parentId: string) =>
    (invoices.data ?? [])
      .filter((invoice) => invoice.parent_id === parentId)
      .reduce((sum, invoice) => sum + num(invoice.balance_due), 0);

  if (editing) {
    return (
      <Page className="p-0 sm:p-0">
        <ClientEditScreen
          client={client}
          busy={update.isPending}
          onCancel={() => setEditing(false)}
          onSave={async (values) => {
            try {
              await update.mutateAsync({ id: client.id, values });
              toast.success("Client updated");
              setEditing(false);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not update client");
            }
          }}
        />
      </Page>
    );
  }

  return (
    <Page className="p-0 sm:p-0">
      <div className="grid min-h-[calc(100dvh-4.5rem)] lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-card lg:block">
          <div className="sticky top-16">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <div>
                <h2 className="font-extrabold">All clients</h2>
                <p className="text-xs text-muted-foreground">
                  {allParents.length} billing accounts
                </p>
              </div>
              <Button asChild size="icon" aria-label="Add client">
                <Link to="/admin/parents">
                  <Plus className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search clients"
                  className="h-10 rounded-xl pl-9"
                />
              </div>
            </div>
            <div className="max-h-[calc(100dvh-12.5rem)] overflow-y-auto">
              {filteredParents.map((parent) => (
                <Link
                  key={parent.id}
                  to="/admin/parents/$id"
                  params={{ id: parent.id }}
                  className={`flex items-center gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-muted/70 ${
                    parent.id === id ? "bg-primary/5" : ""
                  }`}
                >
                  <Avatar
                    initials={initialsOf(fullName(parent))}
                    tone={avatarTone(fullName(parent))}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{fullName(parent)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {parent.email ?? "No email"}
                    </span>
                  </span>
                  <span className="text-sm font-extrabold">{money(clientBalance(parent.id))}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <main className="min-w-0 bg-background">
          <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
            <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6">
              <Avatar
                initials={initialsOf(fullName(client))}
                tone={avatarTone(fullName(client))}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-black sm:text-2xl">{fullName(client)}</h1>
                <p className="truncate text-xs text-muted-foreground sm:text-sm">
                  {client.email ?? "Client account and billing record"}
                </p>
              </div>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <Link to="/admin/payments">
                  <Plus className="h-4 w-4" /> New transaction
                </Link>
              </Button>
            </div>
            <nav className="flex gap-6 overflow-x-auto px-4 sm:px-6" aria-label="Client record">
              {(["overview", "transactions"] as ClientTab[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={`border-b-2 px-1 py-3 text-sm font-bold capitalize ${
                    tab === item
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}
            </nav>
          </header>

          {tab === "overview" ? (
            <div className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                <MiniMetric label="Students" value={String(children.length)} tone="blue" />
                <MiniMetric
                  label="Active plans"
                  value={String(
                    clientSubscriptions.filter((item) => item.status === "active").length,
                  )}
                  tone="purple"
                />
                <MiniMetric label="Outstanding" value={money(outstanding)} tone="amber" />
                <MiniMetric label="Collected" value={money(collected)} tone="green" />
              </div>
              <RecordPanel title="Contact details">
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <Detail label="Email" value={client.email ?? "Not recorded"} />
                  <Detail label="Phone" value={client.phone ?? "Not recorded"} />
                  <Detail label="Account status">
                    <Pill tone={client.status === "active" ? "green" : "neutral"}>
                      {client.status}
                    </Pill>
                  </Detail>
                  <Detail label="Billing status">
                    <Pill tone={client.billing_status === "active" ? "green" : "amber"}>
                      {client.billing_status}
                    </Pill>
                  </Detail>
                </dl>
              </RecordPanel>
              <RecordPanel title="Students" subtitle={`${children.length} linked`}>
                {children.length === 0 ? (
                  <Empty>No students are linked to this client.</Empty>
                ) : (
                  <div className="divide-y divide-border">
                    {children.map((student) => (
                      <Link
                        key={student.id}
                        to="/admin/students/$id"
                        params={{ id: student.id }}
                        className="flex items-center gap-3 py-3 hover:text-primary"
                      >
                        <Avatar
                          initials={initialsOf(fullName(student))}
                          tone={avatarTone(fullName(student))}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1 truncate font-bold">
                          {fullName(student)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {student.year_group ?? "View record"}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </RecordPanel>
            </div>
          ) : (
            <div className="space-y-4 p-4 sm:p-6">
              <p className="text-sm font-semibold text-muted-foreground">
                Subscriptions, invoices and payments for this client
              </p>
              <RecordPanel
                title="Subscriptions"
                action={
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/admin/payments">
                      <Plus className="h-4 w-4" /> New
                    </Link>
                  </Button>
                }
              >
                {clientSubscriptions.length === 0 ? (
                  <Empty>No subscriptions for this client.</Empty>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                      <TableHead
                        cells={["Created", "Student", "Plan", "Amount", "Next billing", "Status"]}
                      />
                      <tbody>
                        {clientSubscriptions.map((subscription) => {
                          const student = subscription.student_id
                            ? studentById.get(subscription.student_id)
                            : undefined;
                          return (
                            <tr key={subscription.id} className="border-t border-border">
                              <td className="py-3">
                                {prettyDate(subscription.created_at.slice(0, 10))}
                              </td>
                              <td className="py-3">
                                <PersonLink student={student} fallback="All students" />
                              </td>
                              <td className="py-3 font-semibold">
                                {subscription.plan_name ?? "Subscription"}
                              </td>
                              <td className="py-3 font-extrabold">{money(subscription.amount)}</td>
                              <td className="py-3">
                                {subscription.next_due_date
                                  ? prettyDate(subscription.next_due_date)
                                  : "—"}
                              </td>
                              <td className="py-3">
                                <Pill tone={subscription.status === "active" ? "green" : "neutral"}>
                                  {subscription.status}
                                </Pill>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </RecordPanel>

              <RecordPanel
                title="Invoices"
                subtitle={`${clientInvoices.length} total`}
                action={
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/admin/payments">
                      <Plus className="h-4 w-4" /> New
                    </Link>
                  </Button>
                }
              >
                {clientInvoices.length === 0 ? (
                  <Empty>No invoices for this client.</Empty>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                      <TableHead
                        cells={["Date", "Invoice", "Student", "Amount", "Balance due", "Status"]}
                      />
                      <tbody>
                        {clientInvoices.map((invoice) => (
                          <tr key={invoice.id} className="border-t border-border">
                            <td className="py-3">
                              {prettyDate(invoice.issue_date ?? invoice.created_at.slice(0, 10))}
                            </td>
                            <td className="py-3">
                              <Link
                                to="/admin/payments"
                                className="font-bold text-primary hover:underline"
                              >
                                {invoice.invoice_number}
                              </Link>
                            </td>
                            <td className="py-3">
                              <PersonLink
                                student={studentForInvoice(invoice.id)}
                                fallback="Multiple"
                              />
                            </td>
                            <td className="py-3 font-extrabold">{money(invoice.total)}</td>
                            <td className="py-3 font-extrabold">{money(invoice.balance_due)}</td>
                            <td className="py-3">
                              <Pill tone={invoice.status === "paid" ? "green" : "amber"}>
                                {invoice.status}
                              </Pill>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </RecordPanel>

              <RecordPanel title="Client payments" subtitle={`${clientPayments.length} recorded`}>
                {clientPayments.length === 0 ? (
                  <Empty>No payments recorded for this client.</Empty>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-sm">
                      <TableHead
                        cells={["Date", "Student", "Reference", "Method", "Amount", "Status"]}
                      />
                      <tbody>
                        {clientPayments.map((payment) => (
                          <tr key={payment.id} className="border-t border-border">
                            <td className="py-3">{prettyDate(payment.payment_date)}</td>
                            <td className="py-3">
                              <PersonLink
                                student={
                                  payment.student_id
                                    ? studentById.get(payment.student_id)
                                    : undefined
                                }
                                fallback="Client"
                              />
                            </td>
                            <td className="py-3 font-semibold">{payment.reference ?? "—"}</td>
                            <td className="py-3 capitalize">{payment.method ?? "—"}</td>
                            <td className="py-3 font-extrabold">{money(payment.amount)}</td>
                            <td className="py-3">
                              <Pill
                                tone={
                                  payment.status && ["paid", "received"].includes(payment.status)
                                    ? "green"
                                    : "amber"
                                }
                              >
                                {payment.status}
                              </Pill>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </RecordPanel>
            </div>
          )}
        </main>
      </div>
    </Page>
  );
}

function ClientEditScreen({
  client,
  busy,
  onCancel,
  onSave,
}: {
  client: ParentRow;
  busy: boolean;
  onCancel: () => void;
  onSave: (values: Partial<ParentRow>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    first_name: client.first_name,
    last_name: client.last_name ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    status: client.status,
    billing_status: client.billing_status,
    notes: client.notes ?? "",
  });

  return (
    <div className="min-h-[calc(100dvh-4.5rem)] bg-background">
      <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
        <Avatar
          initials={initialsOf(fullName(client))}
          tone={avatarTone(fullName(client))}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted-foreground">Edit client</p>
          <h1 className="truncate text-xl font-black">{fullName(client)}</h1>
        </div>
        <Button variant="ghost" onClick={onCancel} aria-label="Close editor">
          <X className="h-5 w-5" />
        </Button>
      </header>
      <form
        className="mx-auto grid max-w-5xl gap-5 p-4 pb-24 sm:grid-cols-2 sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave({
            ...form,
            last_name: form.last_name || null,
            email: form.email || null,
            phone: form.phone || null,
            notes: form.notes || null,
          });
        }}
      >
        <div className="sm:col-span-2">
          <h2 className="text-lg font-black">Primary contact</h2>
          <p className="text-sm text-muted-foreground">Client account and contact information</p>
        </div>
        <EditField
          label="First name"
          value={form.first_name}
          onChange={(value) => setForm({ ...form, first_name: value })}
          required
        />
        <EditField
          label="Last name"
          value={form.last_name}
          onChange={(value) => setForm({ ...form, last_name: value })}
        />
        <EditField
          label="Email address"
          type="email"
          value={form.email}
          onChange={(value) => setForm({ ...form, email: value })}
        />
        <EditField
          label="Phone"
          value={form.phone}
          onChange={(value) => setForm({ ...form, phone: value })}
        />
        <EditSelect
          label="Account status"
          value={form.status}
          onChange={(value) => setForm({ ...form, status: value })}
          options={["active", "inactive"]}
        />
        <EditSelect
          label="Billing status"
          value={form.billing_status}
          onChange={(value) => setForm({ ...form, billing_status: value })}
          options={["active", "hold", "inactive"]}
        />
        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-bold">Notes</span>
          <textarea
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
            className="min-h-32 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-border bg-background/95 p-4 backdrop-blur sm:col-span-2 sm:-mx-8 sm:px-8">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !form.first_name.trim()}>
            <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save client"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function RecordPanel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 sm:px-5">
        <div>
          <h2 className="font-black">{title}</h2>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="px-4 py-2 sm:px-5">{children}</div>
    </section>
  );
}

function TableHead({ cells }: { cells: string[] }) {
  return (
    <thead>
      <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
        {cells.map((cell) => (
          <th key={cell} className="pb-2 pr-4 font-bold">
            {cell}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function PersonLink({
  student,
  fallback,
}: {
  student: { id: string; first_name: string; last_name: string | null } | undefined;
  fallback: string;
}) {
  if (!student) return <span className="text-muted-foreground">{fallback}</span>;
  return (
    <Link
      to="/admin/students/$id"
      params={{ id: student.id }}
      className="inline-flex items-center gap-2 font-semibold hover:text-primary"
    >
      <Avatar
        initials={initialsOf(fullName(student))}
        tone={avatarTone(fullName(student))}
        size="sm"
      />
      <span>{fullName(student)}</span>
    </Link>
  );
}

function MiniMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "purple" | "amber" | "green";
}) {
  const styles = {
    blue: "bg-sky-100 text-sky-700",
    purple: "bg-violet-100 text-violet-700",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-emerald-100 text-emerald-700",
  };
  return (
    <div className={`rounded-xl px-3 py-2 ${styles[tone]}`}>
      <p className="truncate text-lg font-black">{value}</p>
      <p className="truncate text-[10px] font-bold uppercase tracking-wide">{label}</p>
    </div>
  );
}

function Detail({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{children ?? value}</dd>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-bold">
        {label}
        {required ? " *" : ""}
      </span>
      <Input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl"
      />
    </label>
  );
}

function EditSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-bold">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm capitalize"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
