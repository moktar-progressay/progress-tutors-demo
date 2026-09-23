import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { Page } from "@/components/AppShell";
import { Avatar, Empty, PageHeader, Pill, Section, StatCard, avatarTone } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { fullName, initialsOf, money, num, prettyDate, useTable } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/parents/$id")({
  head: () => ({
    meta: [
      { title: "Client record | ProgressTutors" },
      { name: "description", content: "Client contact, children and billing record." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const parents = useTable("parents");
  const students = useTable("students");
  const links = useTable("parent_students");
  const subscriptions = useTable("client_subscriptions");
  const invoices = useTable("billing_invoices", "created_at");
  const payments = useTable("client_payments", "payment_date");

  if (parents.isLoading) {
    return (
      <Page>
        <Empty>Loading client…</Empty>
      </Page>
    );
  }

  const client = (parents.data ?? []).find((parent) => parent.id === id);
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
  const clientPayments = (payments.data ?? []).filter((item) => item.parent_id === id);
  const outstanding = clientInvoices
    .filter((invoice) => invoice.status !== "paid")
    .reduce((sum, invoice) => sum + num(invoice.total), 0);
  const collected = clientPayments
    .filter((payment) => payment.status === "received")
    .reduce((sum, payment) => sum + num(payment.amount), 0);

  return (
    <Page className="space-y-5">
      <PageHeader
        breadcrumb={
          <Link to="/admin/payments" className="hover:text-primary">
            Payments
          </Link>
        }
        title={fullName(client)}
        subtitle="Client account and billing record"
        actions={
          <Button asChild variant="secondary">
            <Link to="/admin/parents" aria-label="Edit client">
              <Pencil className="h-4 w-4" /> Edit client
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Children" value={String(children.length)} tone="blue" />
        <StatCard
          label="Active subscriptions"
          value={String(clientSubscriptions.filter((item) => item.status === "active").length)}
          tone="purple"
        />
        <StatCard label="Outstanding" value={money(outstanding)} tone="amber" />
        <StatCard label="Collected" value={money(collected)} tone="green" />
      </div>

      <Section id="client-contact" title="Contact details">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="font-semibold">{client.email ?? "Not recorded"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Phone</dt>
            <dd className="font-semibold">{client.phone ?? "Not recorded"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Account status</dt>
            <dd className="mt-1">
              <Pill tone={client.status === "active" ? "green" : "neutral"}>{client.status}</Pill>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Billing status</dt>
            <dd className="mt-1">
              <Pill tone={client.billing_status === "active" ? "green" : "amber"}>
                {client.billing_status}
              </Pill>
            </dd>
          </div>
        </dl>
      </Section>

      <Section id="client-children" title="Students" subtitle={`${children.length} linked`}>
        {children.length === 0 ? (
          <Empty>No students are linked to this client.</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {children.map((student) => (
              <li key={student.id}>
                <Link
                  to="/admin/students/$id"
                  params={{ id: student.id }}
                  className="flex items-center gap-3 py-3 font-bold hover:text-primary"
                >
                  <Avatar
                    initials={initialsOf(fullName(student))}
                    tone={avatarTone(fullName(student))}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1 truncate">{fullName(student)}</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {student.year_group ?? "View record"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="client-subscriptions" title="Subscriptions">
        {clientSubscriptions.length === 0 ? (
          <Empty>No subscriptions for this client.</Empty>
        ) : (
          <div className="divide-y divide-border">
            {clientSubscriptions.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-bold">{item.plan_name ?? "Subscription"}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.next_due_date
                      ? `Next due ${prettyDate(item.next_due_date)}`
                      : "No due date"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold">{money(item.amount)}</p>
                  <Pill tone={item.status === "active" ? "green" : "neutral"}>{item.status}</Pill>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section id="client-invoices" title="Invoices" subtitle={`${clientInvoices.length} total`}>
        {clientInvoices.length === 0 ? (
          <Empty>No invoices for this client.</Empty>
        ) : (
          <div className="divide-y divide-border">
            {clientInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="font-bold text-primary">{invoice.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {prettyDate(String(invoice.created_at).slice(0, 10))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold">{money(invoice.total)}</p>
                  <Pill tone={invoice.status === "paid" ? "green" : "amber"}>{invoice.status}</Pill>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </Page>
  );
}
