create or replace function public.create_draft_invoice(
  p_parent_id uuid,
  p_due_date date,
  p_period_start date,
  p_period_end date,
  p_notes text,
  p_items jsonb
)
returns public.billing_invoices
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_invoice public.billing_invoices;
  v_item jsonb;
  v_student_id uuid;
  v_plan_id uuid;
  v_description text;
  v_quantity numeric;
  v_unit_price numeric;
  v_discount numeric;
  v_tax_rate numeric;
  v_sort_order integer := 0;
begin
  if not exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Only admins can create invoice drafts';
  end if;
  if p_parent_id is null or not exists (select 1 from public.parents where id = p_parent_id) then
    raise exception 'Choose a valid parent';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one child line';
  end if;
  if p_period_start is not null and p_period_end is not null and p_period_end < p_period_start then
    raise exception 'Service end date cannot be before the start date';
  end if;

  insert into public.billing_invoices
    (parent_id, due_date, period_start, period_end, notes, status, source, created_by)
  values
    (p_parent_id, p_due_date, p_period_start, p_period_end, nullif(btrim(p_notes), ''),
      'draft', 'progress_tutors', auth.uid())
  returning * into v_invoice;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_student_id := nullif(v_item->>'student_id', '')::uuid;
    v_plan_id := nullif(v_item->>'billing_plan_id', '')::uuid;
    v_description := btrim(coalesce(v_item->>'description', ''));
    v_quantity := coalesce((v_item->>'quantity')::numeric, 1);
    v_unit_price := coalesce((v_item->>'unit_price')::numeric, 0);
    v_discount := coalesce((v_item->>'discount_amount')::numeric, 0);
    v_tax_rate := coalesce((v_item->>'tax_rate')::numeric, 0);

    if v_student_id is null or not exists (
      select 1 from public.parent_students
      where parent_id = p_parent_id and student_id = v_student_id
    ) then
      raise exception 'Every invoice line must use a child linked to the selected parent';
    end if;
    if v_plan_id is not null and not exists (
      select 1 from public.billing_plans where id = v_plan_id and active
    ) then
      raise exception 'Choose an active billing plan';
    end if;
    if v_description = '' then raise exception 'Every invoice line needs a description'; end if;
    if v_quantity <= 0 or v_unit_price < 0 or v_discount < 0 or v_tax_rate < 0 then
      raise exception 'Invoice line amounts cannot be negative';
    end if;

    insert into public.billing_invoice_items
      (invoice_id, student_id, billing_plan_id, description, quantity, unit_price,
        discount_amount, tax_rate, service_start, service_end, sort_order)
    values
      (v_invoice.id, v_student_id, v_plan_id, v_description, v_quantity, v_unit_price,
        v_discount, v_tax_rate, p_period_start, p_period_end, v_sort_order);
    v_sort_order := v_sort_order + 1;
  end loop;

  select * into v_invoice from public.billing_invoices where id = v_invoice.id;
  return v_invoice;
end;
$$;

revoke all on function public.create_draft_invoice(uuid, date, date, date, text, jsonb) from public;
grant execute on function public.create_draft_invoice(uuid, date, date, date, text, jsonb) to authenticated;
