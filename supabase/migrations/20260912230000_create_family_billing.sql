create sequence if not exists public.billing_invoice_number_seq;

create table if not exists public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid references public.programmes(id),
  pricing_plan_id uuid references public.pricing_plans(id),
  zoho_plan_code text unique,
  name text not null,
  unit_amount numeric(12,2) not null default 0 check (unit_amount >= 0),
  currency text not null default 'GBP',
  billing_frequency text not null default 'manual'
    check (billing_frequency in ('manual', 'monthly', 'weekly', 'per_session', 'one_off')),
  children_included integer not null default 1 check (children_included >= 1),
  description text,
  active boolean not null default true,
  needs_review boolean not null default false,
  source text not null default 'Progress Tutors',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique default
    ('PT-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.billing_invoice_number_seq')::text, 6, '0')),
  parent_id uuid not null references public.parents(id),
  period_start date,
  period_end date,
  issue_date date,
  due_date date,
  currency text not null default 'GBP',
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'issued', 'part_paid', 'paid', 'overdue', 'cancelled')),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  tax_total numeric(12,2) not null default 0 check (tax_total >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  balance_due numeric(12,2) not null default 0 check (balance_due >= 0),
  source text not null default 'Progress Tutors',
  external_provider text,
  external_customer_id text,
  external_invoice_id text,
  notes text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  issued_at timestamptz,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end is null or period_start is null or period_end >= period_start),
  check (due_date is null or issue_date is null or due_date >= issue_date)
);

create table if not exists public.billing_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.billing_invoices(id) on delete cascade,
  student_id uuid references public.students(id),
  subscription_id uuid references public.client_subscriptions(id),
  billing_plan_id uuid references public.billing_plans(id),
  description text not null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  tax_rate numeric(7,4) not null default 0 check (tax_rate >= 0),
  line_subtotal numeric(12,2) generated always as (round(quantity * unit_price, 2)) stored,
  tax_amount numeric(12,2) generated always as (
    round(greatest(quantity * unit_price - discount_amount, 0) * tax_rate / 100, 2)
  ) stored,
  line_total numeric(12,2) generated always as (
    round(greatest(quantity * unit_price - discount_amount, 0) * (1 + tax_rate / 100), 2)
  ) stored,
  service_start date,
  service_end date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (service_end is null or service_start is null or service_end >= service_start),
  check (discount_amount <= quantity * unit_price)
);

alter table public.client_payments
  add column if not exists invoice_id uuid references public.billing_invoices(id),
  add column if not exists currency text not null default 'GBP',
  add column if not exists external_provider text,
  add column if not exists external_payment_id text;

create index if not exists billing_invoices_parent_id_idx on public.billing_invoices(parent_id);
create index if not exists billing_invoice_items_invoice_id_idx on public.billing_invoice_items(invoice_id);
create index if not exists billing_invoice_items_student_id_idx on public.billing_invoice_items(student_id);
create index if not exists client_payments_invoice_id_idx on public.client_payments(invoice_id);

create or replace function public.set_billing_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.recalculate_billing_invoice()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_invoice uuid;
  item_subtotal numeric(12,2);
  item_discount numeric(12,2);
  item_tax numeric(12,2);
  item_total numeric(12,2);
  paid_total numeric(12,2);
begin
  if tg_op = 'DELETE' then target_invoice = old.invoice_id; else target_invoice = new.invoice_id; end if;
  if target_invoice is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  select coalesce(sum(line_subtotal), 0), coalesce(sum(discount_amount), 0),
    coalesce(sum(tax_amount), 0), coalesce(sum(line_total), 0)
  into item_subtotal, item_discount, item_tax, item_total
  from public.billing_invoice_items where invoice_id = target_invoice;
  select coalesce(sum(amount), 0) into paid_total
  from public.client_payments
  where invoice_id = target_invoice and status in ('paid', 'success');
  update public.billing_invoices
  set subtotal = item_subtotal, discount_total = item_discount, tax_total = item_tax,
    total = item_total, amount_paid = paid_total, balance_due = greatest(item_total - paid_total, 0)
  where id = target_invoice;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists billing_plans_updated on public.billing_plans;
create trigger billing_plans_updated before update on public.billing_plans
for each row execute function public.set_billing_updated_at();
drop trigger if exists billing_invoices_updated on public.billing_invoices;
create trigger billing_invoices_updated before update on public.billing_invoices
for each row execute function public.set_billing_updated_at();
drop trigger if exists billing_invoice_items_updated on public.billing_invoice_items;
create trigger billing_invoice_items_updated before update on public.billing_invoice_items
for each row execute function public.set_billing_updated_at();
drop trigger if exists billing_items_recalculate_invoice on public.billing_invoice_items;
create trigger billing_items_recalculate_invoice after insert or update or delete on public.billing_invoice_items
for each row execute function public.recalculate_billing_invoice();
drop trigger if exists billing_payments_recalculate_invoice on public.client_payments;
create trigger billing_payments_recalculate_invoice after insert or update or delete on public.client_payments
for each row execute function public.recalculate_billing_invoice();

alter table public.billing_plans enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.billing_invoice_items enable row level security;

drop policy if exists "billing_plans auth all" on public.billing_plans;
create policy "billing_plans auth all" on public.billing_plans for all to authenticated
using (exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'admin'))
with check (exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'admin'));
drop policy if exists "billing_invoices auth all" on public.billing_invoices;
create policy "billing_invoices auth all" on public.billing_invoices for all to authenticated
using (exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'admin'))
with check (exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'admin'));
drop policy if exists "billing_invoice_items auth all" on public.billing_invoice_items;
create policy "billing_invoice_items auth all" on public.billing_invoice_items for all to authenticated
using (exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'admin'))
with check (exists (select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'admin'));

revoke all on public.billing_plans, public.billing_invoices, public.billing_invoice_items from anon;
grant select, insert, update, delete on public.billing_plans, public.billing_invoices,
  public.billing_invoice_items to authenticated;

create or replace view public.parent_billing_overview
with (security_invoker = true)
as
select p.id as parent_id,
  concat_ws(' ', p.first_name, p.last_name) as parent_name,
  p.email, p.phone, p.billing_status,
  coalesce((select jsonb_agg(jsonb_build_object(
    'student_id', s.id, 'name', concat_ws(' ', s.first_name, s.last_name),
    'contact_type', s.contact_type) order by s.first_name, s.last_name)
    from public.parent_students ps join public.students s on s.id = ps.student_id
    where ps.parent_id = p.id), '[]'::jsonb) as children,
  (select count(*) from public.billing_invoices bi where bi.parent_id = p.id) as invoice_count,
  coalesce((select sum(bi.total) from public.billing_invoices bi where bi.parent_id = p.id), 0) as invoiced_total,
  coalesce((select sum(bi.balance_due) from public.billing_invoices bi
    where bi.parent_id = p.id and bi.status not in ('cancelled', 'draft')), 0) as outstanding_total
from public.parents p;

insert into public.billing_plans
  (zoho_plan_code, name, unit_amount, billing_frequency, children_included, needs_review, source)
values
  ('0', '1:1 Tuition', 220, 'manual', 1, true, 'Zoho Sales by Plan, September 2026'),
  ('Footy01', 'PLAY - Training 1 hour per week', 9, 'weekly', 1, false, 'Zoho Sales by Plan, September 2026'),
  ('Footy02', 'TRAIN - Training 2 hours per week', 29, 'weekly', 1, false, 'Zoho Sales by Plan, September 2026'),
  ('ProMaths1', 'Tuition - Pro - Maths (1 subject)', 120, 'monthly', 1, false, 'Zoho Sales by Plan, September 2026'),
  ('Tuition_double1', 'Tuition Double', 120, 'manual', 1, true, 'Zoho Sales by Plan, September 2026'),
  ('Tuition_double1_2students', 'Tuition Double (2 Students)', 600, 'manual', 2, true, 'Zoho Sales by Plan, September 2026'),
  ('Single_English', 'Tuition English Discounted', 60, 'manual', 1, true, 'Zoho Sales by Plan, September 2026'),
  ('Triple1', 'Tuition Pro - Maths, English & Science', 360, 'monthly', 1, false, 'Zoho Sales by Plan, September 2026')
on conflict (zoho_plan_code) do update set
  name = excluded.name,
  unit_amount = excluded.unit_amount,
  billing_frequency = excluded.billing_frequency,
  children_included = excluded.children_included,
  needs_review = excluded.needs_review,
  source = excluded.source,
  active = true;
