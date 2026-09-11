import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/AppShell";
import { Empty, PageHeader, Pill, Section, StatCard } from "@/components/kit";
import { FormDialog, SelectField, TextAreaField, TextField } from "@/components/form-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEMO_DATE, fullName, money, num, useTable, useUpdateRow, useUpsert } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  head: () => ({
    meta: [
      { title: "Payments — ProgressTutors" },
      {
        name: "description",
        content: "Collect family payments and manage tutor payouts from one money workspace.",
      },
      { property: "og:title", content: "Payments — ProgressTutors" },
      { property: "og:description", content: "Subscriptions and manual payments for families." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Billing,
});

function Billing() {
  const parents = useTable("parents", "first_name");
  const students = useTable("students", "first_name");
  const plans = useTable("pricing_plans", "sort_order");
  const programmes = useTable("programmes");
  const subs = useTable("client_subscriptions");
  const payments = useTable("client_payments", "payment_date");

  const addSub = useUpsert("client_subscriptions");
  const updateSub = useUpdateRow("client_subscriptions");
  const addPayment = useUpsert("client_payments", ["parents"]);

  const [q, setQ] = useState("");
  const [subOpen, setSubOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [sub, setSub] = useState({
    parent_id: "",
    student_id: "",
    pricing_plan_id: "",
    amount: "",
    cadence: "monthly",
    next_due_date: DEMO_DATE,
    notes: "",
  });
  const [pay, setPay] = useState({
    parent_id: "",
    student_id: "",
    amount: "",
    payment_date: DEMO_DATE,
    method: "bank_transfer",
    reference: "",
    note: "",
  });

  const received = (payments.data ?? []).filter((p) => p.status === "received");
  const total = received.reduce((a, p) => a + num(p.amount), 0);
  const dueSoon = (subs.data ?? []).filter((s) => s.status === "active");
  const expected = dueSoon.reduce((a, s) => a + num(s.amount), 0);

  const parentName = (id: string | null) => fullName((parents.data ?? []).find((p) => p.id === id));
  const studentName = (id: string | null) =>
    fullName((students.data ?? []).find((s) => s.id === id));

  const filteredPayments = (payments.data ?? []).filter((p) =>
    q === ""
      ? true
      : `${parentName(p.parent_id)} ${studentName(p.student_id)} ${p.reference ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase()),
  );

  return (
    <Page>
      <PageHeader
        title="Payments"
        subtitle="Collect from families and manage tutor payouts in one place."
        actions={
          <>
            <Button variant="secondary" onClick={() => setSubOpen(true)}>
              Add plan
            </Button>
            <Button onClick={() => setPayOpen(true)}>Record payment</Button>
          </>
        }
      />

      <div className="flex gap-1 rounded-xl bg-muted p-1">
        <span className="flex-1 rounded-lg bg-card px-4 py-2 text-center text-sm font-bold text-primary shadow-sm">
          Client payments
        </span>
        <Link
          to="/admin/payment-requests"
          className="flex-1 rounded-lg px-4 py-2 text-center text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          Tutor payouts
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Received" value={money(total)} tone="green" />
        <StatCard
          label="Payments logged"
          value={String((payments.data ?? []).length)}
          tone="blue"
        />
        <StatCard label="Active plans" value={String(dueSoon.length)} tone="purple" />
        <StatCard label="Expected per cycle" value={money(expected)} tone="pink" />
      </div>

      <Section
        id="billing-plans"
        title="Family plans"
        subtitle="Amounts follow the agreed programme pricing"
      >
        {(subs.data ?? []).length === 0 ? (
          <Empty>No plans set up yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {(subs.data ?? []).map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {parentName(s.parent_id)} · {studentName(s.student_id)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.plan_name ?? "Plan"} · {money(s.amount)} {s.cadence}
                    {s.next_due_date ? ` · next due ${s.next_due_date}` : ""}
                  </p>
                </div>
                <Pill tone={s.status === "active" ? "green" : "neutral"}>{s.status}</Pill>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    updateSub.mutate(
                      { id: s.id, values: { status: s.status === "active" ? "paused" : "active" } },
                      { onSuccess: () => toast.success("Plan updated") },
                    )
                  }
                >
                  {s.status === "active" ? "Pause" : "Resume"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="billing-payments" title="Payments received">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by family, child or reference"
          className="mb-3 h-10 max-w-sm rounded-xl"
        />
        {filteredPayments.length === 0 ? (
          <Empty>No payments recorded yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  {["Date", "Family", "Child", "Method", "Reference", "Amount", "Status"].map(
                    (h) => (
                      <th key={h} className="pb-2 font-semibold">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-3">{p.payment_date}</td>
                    <td className="py-3 font-semibold">{parentName(p.parent_id)}</td>
                    <td className="py-3">{studentName(p.student_id)}</td>
                    <td className="py-3">{p.method ?? "—"}</td>
                    <td className="py-3">{p.reference ?? "—"}</td>
                    <td className="py-3 font-bold">{money(p.amount)}</td>
                    <td className="py-3">
                      <Pill tone={p.status === "received" ? "green" : "amber"}>{p.status}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <FormDialog
        open={subOpen}
        onOpenChange={setSubOpen}
        title="Add a family plan"
        busy={addSub.isPending}
        onSubmit={async () => {
          const plan = (plans.data ?? []).find((p) => p.id === sub.pricing_plan_id);
          await addSub.mutateAsync({
            parent_id: sub.parent_id || null,
            student_id: sub.student_id || null,
            pricing_plan_id: sub.pricing_plan_id || null,
            programme_id: plan?.programme_id ?? null,
            plan_name: plan?.name ?? null,
            amount: sub.amount ? Number(sub.amount) : num(plan?.amount),
            cadence: sub.cadence,
            next_due_date: sub.next_due_date || null,
            notes: sub.notes || null,
            status: "active",
          });
          toast.success("Plan added");
          setSubOpen(false);
        }}
      >
        <SelectField
          label="Family"
          value={sub.parent_id}
          onChange={(v) => setSub({ ...sub, parent_id: v })}
          options={[
            { value: "", label: "Choose" },
            ...(parents.data ?? []).map((p) => ({ value: p.id, label: fullName(p) })),
          ]}
        />
        <SelectField
          label="Child"
          value={sub.student_id}
          onChange={(v) => setSub({ ...sub, student_id: v })}
          options={[
            { value: "", label: "Choose" },
            ...(students.data ?? []).map((s) => ({ value: s.id, label: fullName(s) })),
          ]}
        />
        <SelectField
          label="Plan"
          value={sub.pricing_plan_id}
          onChange={(v) => {
            const plan = (plans.data ?? []).find((p) => p.id === v);
            setSub({ ...sub, pricing_plan_id: v, amount: plan ? String(plan.amount) : sub.amount });
          }}
          options={[
            { value: "", label: "Choose" },
            ...(plans.data ?? []).map((p) => ({
              value: p.id,
              label: `${(programmes.data ?? []).find((g) => g.id === p.programme_id)?.name ?? ""} ${p.name} · ${money(
                p.amount,
              )} ${p.pricing_unit}`,
            })),
          ]}
        />
        <TextField
          label="Amount (£)"
          type="number"
          value={sub.amount}
          onChange={(v) => setSub({ ...sub, amount: v })}
        />
        <SelectField
          label="Billing cycle"
          value={sub.cadence}
          onChange={(v) => setSub({ ...sub, cadence: v })}
          options={[
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
            { value: "termly", label: "Termly" },
            { value: "one_off", label: "One off" },
          ]}
        />
        <TextField
          label="Next due"
          type="date"
          value={sub.next_due_date}
          onChange={(v) => setSub({ ...sub, next_due_date: v })}
        />
        <TextAreaField
          label="Notes"
          value={sub.notes}
          onChange={(v) => setSub({ ...sub, notes: v })}
        />
      </FormDialog>

      <FormDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        title="Record a payment"
        busy={addPayment.isPending}
        onSubmit={async () => {
          await addPayment.mutateAsync({
            parent_id: pay.parent_id || null,
            student_id: pay.student_id || null,
            amount: Number(pay.amount) || 0,
            payment_date: pay.payment_date,
            method: pay.method,
            reference: pay.reference || null,
            note: pay.note || null,
            status: "received",
          });
          toast.success("Payment recorded");
          setPayOpen(false);
        }}
      >
        <SelectField
          label="Family"
          value={pay.parent_id}
          onChange={(v) => setPay({ ...pay, parent_id: v })}
          options={[
            { value: "", label: "Choose" },
            ...(parents.data ?? []).map((p) => ({ value: p.id, label: fullName(p) })),
          ]}
        />
        <SelectField
          label="Child"
          value={pay.student_id}
          onChange={(v) => setPay({ ...pay, student_id: v })}
          options={[
            { value: "", label: "Choose" },
            ...(students.data ?? []).map((s) => ({ value: s.id, label: fullName(s) })),
          ]}
        />
        <TextField
          label="Amount (£)"
          type="number"
          value={pay.amount}
          onChange={(v) => setPay({ ...pay, amount: v })}
          required
        />
        <TextField
          label="Date"
          type="date"
          value={pay.payment_date}
          onChange={(v) => setPay({ ...pay, payment_date: v })}
        />
        <SelectField
          label="Method"
          value={pay.method}
          onChange={(v) => setPay({ ...pay, method: v })}
          options={[
            { value: "bank_transfer", label: "Bank transfer" },
            { value: "cash", label: "Cash" },
            { value: "card", label: "Card machine" },
            { value: "other", label: "Other" },
          ]}
        />
        <TextField
          label="Reference"
          value={pay.reference}
          onChange={(v) => setPay({ ...pay, reference: v })}
        />
        <TextAreaField
          label="Note"
          value={pay.note}
          onChange={(v) => setPay({ ...pay, note: v })}
        />
      </FormDialog>
    </Page>
  );
}
