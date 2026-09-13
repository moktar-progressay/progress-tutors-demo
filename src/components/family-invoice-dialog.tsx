import { Plus, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FormDialog, SelectField, TextAreaField, TextField } from "@/components/form-kit";
import { Pill } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  DEMO_DATE,
  fullName,
  money,
  num,
  useInvalidate,
  type ParentRow,
  type Row,
  type StudentRow,
} from "@/lib/db";

type ParentStudentRow = Row<"parent_students">;
type BillingPlanRow = Row<"billing_plans">;

interface DraftLine {
  key: string;
  student_id: string;
  billing_plan_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount_amount: string;
}

const monthStart = `${DEMO_DATE.slice(0, 7)}-01`;
const monthEnd = `${DEMO_DATE.slice(0, 7)}-30`;

const newLine = (studentId = ""): DraftLine => ({
  key: crypto.randomUUID(),
  student_id: studentId,
  billing_plan_id: "",
  description: "",
  quantity: "1",
  unit_price: "",
  discount_amount: "0",
});

export function FamilyInvoiceDialog({
  open,
  onOpenChange,
  parents,
  students,
  links,
  plans,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parents: ParentRow[];
  students: StudentRow[];
  links: ParentStudentRow[];
  plans: BillingPlanRow[];
}) {
  const invalidate = useInvalidate();
  const [saving, setSaving] = useState(false);
  const [parentId, setParentId] = useState("");
  const [periodStart, setPeriodStart] = useState(monthStart);
  const [periodEnd, setPeriodEnd] = useState(monthEnd);
  const [dueDate, setDueDate] = useState(monthEnd);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);

  const children = useMemo(() => {
    const ids = new Set(
      links.filter((link) => link.parent_id === parentId).map((link) => link.student_id),
    );
    return students.filter((student) => ids.has(student.id));
  }, [links, parentId, students]);

  const eligibleParents = useMemo(
    () =>
      parents
        .map((parent) => ({
          parent,
          childCount: links.filter((link) => link.parent_id === parent.id).length,
        }))
        .filter(({ childCount }) => childCount > 0),
    [links, parents],
  );

  const subtotal = lines.reduce(
    (total, line) => total + num(line.quantity) * num(line.unit_price),
    0,
  );
  const discount = lines.reduce((total, line) => total + num(line.discount_amount), 0);
  const total = Math.max(0, subtotal - discount);

  function chooseParent(value: string) {
    setParentId(value);
    const childIds = links
      .filter((link) => link.parent_id === value)
      .map((link) => link.student_id);
    setLines(childIds.map((studentId) => newLine(studentId)));
  }

  function updateLine(key: string, values: Partial<DraftLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...values } : line)),
    );
  }

  function choosePlan(line: DraftLine, planId: string) {
    const plan = plans.find((item) => item.id === planId);
    updateLine(line.key, {
      billing_plan_id: planId,
      description: plan?.name ?? line.description,
      unit_price: plan ? String(plan.unit_amount) : line.unit_price,
    });
  }

  async function saveDraft() {
    if (!parentId) {
      toast.error("Choose a parent");
      return;
    }
    if (lines.length === 0) {
      toast.error("Add at least one child line");
      return;
    }
    if (
      lines.some(
        (line) =>
          !line.student_id ||
          !line.description.trim() ||
          !line.unit_price ||
          num(line.quantity) <= 0 ||
          num(line.unit_price) < 0,
      )
    ) {
      toast.error("Complete the child, plan and amount for every line");
      return;
    }

    setSaving(true);
    const { data, error } = await supabase.rpc("create_draft_invoice", {
      p_parent_id: parentId,
      p_due_date: dueDate,
      p_period_start: periodStart,
      p_period_end: periodEnd,
      p_notes: notes,
      p_items: lines.map((line) => ({
        student_id: line.student_id,
        billing_plan_id: line.billing_plan_id || null,
        description: line.description.trim(),
        quantity: num(line.quantity),
        unit_price: num(line.unit_price),
        discount_amount: num(line.discount_amount),
        tax_rate: 0,
      })),
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    await invalidate("billing_invoices", "billing_invoice_items");
    toast.success(`${data.invoice_number} saved as a draft. Nothing was emailed.`);
    setParentId("");
    setLines([]);
    setNotes("");
    onOpenChange(false);
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create family invoice draft"
      description="Choose a parent once, then bill one or more linked children on the same invoice. Saving does not email or charge anyone."
      submitLabel="Save draft"
      busy={saving}
      onSubmit={saveDraft}
      wide
    >
      <SelectField
        label="Parent or guardian"
        value={parentId}
        onChange={chooseParent}
        options={[
          { value: "", label: "Choose parent" },
          ...eligibleParents.map(({ parent, childCount }) => ({
            value: parent.id,
            label: `${fullName(parent)} · ${childCount} ${childCount === 1 ? "child" : "children"}`,
          })),
        ]}
        full
      />

      {parentId ? (
        <div className="rounded-2xl bg-secondary/60 p-3 sm:col-span-2">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Users className="h-4 w-4 text-primary" />
            {children.length} linked {children.length === 1 ? "child" : "children"}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {children.map((child) => (
              <Pill key={child.id} tone={child.contact_type === "client" ? "green" : "amber"}>
                {fullName(child)} · {child.contact_type}
              </Pill>
            ))}
          </div>
        </div>
      ) : null}

      <TextField label="Service start" type="date" value={periodStart} onChange={setPeriodStart} />
      <TextField label="Service end" type="date" value={periodEnd} onChange={setPeriodEnd} />
      <TextField label="Payment due" type="date" value={dueDate} onChange={setDueDate} />
      <div className="hidden sm:block" />

      <div className="space-y-3 sm:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Children and charges</p>
            <p className="text-xs text-muted-foreground">
              One line per child. Add another line if a child has more than one service.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={children.length === 0}
            onClick={() => setLines((current) => [...current, newLine(children[0]?.id)])}
          >
            <Plus className="h-4 w-4" /> Add line
          </Button>
        </div>

        {lines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            Choose a parent to load their children.
          </div>
        ) : (
          lines.map((line, index) => {
            const selectedPlan = plans.find((plan) => plan.id === line.billing_plan_id);
            return (
              <div
                key={line.key}
                className="grid gap-2 rounded-2xl border border-border p-3 sm:grid-cols-2 lg:grid-cols-[1.1fr_1.5fr_.65fr_.65fr_auto]"
              >
                <SelectField
                  label={`Child ${index + 1}`}
                  value={line.student_id}
                  onChange={(value) => updateLine(line.key, { student_id: value })}
                  options={children.map((child) => ({ value: child.id, label: fullName(child) }))}
                />
                <SelectField
                  label="Zoho plan"
                  value={line.billing_plan_id}
                  onChange={(value) => choosePlan(line, value)}
                  options={[
                    { value: "", label: "Custom charge" },
                    ...plans.map((plan) => ({
                      value: plan.id,
                      label: `${plan.name} · ${money(plan.unit_amount)}${plan.needs_review ? " · review" : ""}`,
                    })),
                  ]}
                />
                <TextField
                  label="Quantity"
                  type="number"
                  value={line.quantity}
                  onChange={(value) => updateLine(line.key, { quantity: value })}
                />
                <TextField
                  label="Unit price (£)"
                  type="number"
                  value={line.unit_price}
                  onChange={(value) => updateLine(line.key, { unit_price: value })}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="self-end text-muted-foreground"
                  aria-label={`Remove line ${index + 1}`}
                  onClick={() =>
                    setLines((current) => current.filter((item) => item.key !== line.key))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted-foreground sm:col-span-2 lg:col-span-2">
                  Description
                  <input
                    value={line.description}
                    onChange={(event) => updateLine(line.key, { description: event.target.value })}
                    placeholder="Tuition or training service"
                    className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-foreground"
                  />
                </label>
                <TextField
                  label="Discount (£)"
                  type="number"
                  value={line.discount_amount}
                  onChange={(value) => updateLine(line.key, { discount_amount: value })}
                />
                <div className="self-end pb-2 text-right text-sm font-extrabold lg:col-span-2">
                  {money(num(line.quantity) * num(line.unit_price) - num(line.discount_amount))}
                  {selectedPlan?.needs_review ? (
                    <p className="text-[11px] font-semibold text-amber-700">
                      Check cadence before approval
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <TextAreaField
        label="Internal notes"
        value={notes}
        onChange={setNotes}
        placeholder="Optional. Not sent to the parent."
      />

      <div className="rounded-2xl bg-muted p-4 sm:col-span-2">
        <div className="ml-auto grid max-w-sm grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-right font-semibold">{money(subtotal)}</span>
          <span className="text-muted-foreground">Discounts</span>
          <span className="text-right font-semibold">-{money(discount)}</span>
          <span className="border-t border-border pt-2 font-bold">Draft total</span>
          <span className="border-t border-border pt-2 text-right text-lg font-extrabold">
            {money(total)}
          </span>
        </div>
      </div>
    </FormDialog>
  );
}
