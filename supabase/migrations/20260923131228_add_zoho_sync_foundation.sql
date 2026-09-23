-- Read-only Zoho Billing synchronisation foundation.
-- Zoho remains the financial ledger; this schema stores identifiers, raw snapshots
-- and an auditable record of each synchronisation attempt.

alter table public.parents
  add column if not exists external_provider text,
  add column if not exists external_customer_id text,
  add column if not exists billing_last_synced_at timestamptz;

alter table public.client_subscriptions
  add column if not exists external_provider text,
  add column if not exists external_customer_id text,
  add column if not exists external_subscription_id text,
  add column if not exists billing_last_synced_at timestamptz;

alter table public.billing_invoices
  add column if not exists billing_last_synced_at timestamptz;

alter table public.client_payments
  add column if not exists external_customer_id text,
  add column if not exists billing_last_synced_at timestamptz;

create unique index if not exists parents_external_customer_id_key
  on public.parents(external_customer_id);
create unique index if not exists client_subscriptions_external_subscription_id_key
  on public.client_subscriptions(external_subscription_id);
create unique index if not exists billing_invoices_external_invoice_id_key
  on public.billing_invoices(external_invoice_id);
create unique index if not exists client_payments_external_payment_id_key
  on public.client_payments(external_payment_id);

-- Recover the approved Zoho-to-parent mappings already present in imported invoices.
with unambiguous_links as (
  select external_customer_id, min(parent_id::text)::uuid as parent_id
  from public.billing_invoices
  where external_provider = 'zoho' and external_customer_id is not null
  group by external_customer_id
  having count(distinct parent_id) = 1
)
update public.parents p
set external_provider = 'zoho',
    external_customer_id = links.external_customer_id
from unambiguous_links links
where p.id = links.parent_id
  and p.external_customer_id is null;

create table if not exists public.zoho_sync_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_source text not null default 'manual'
    check (trigger_source in ('manual', 'scheduled', 'webhook')),
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'failed', 'partial')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  counts jsonb not null default '{}'::jsonb,
  error_message text,
  requested_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.zoho_external_records (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null
    check (entity_type in ('customer', 'plan', 'subscription', 'invoice', 'payment')),
  external_id text not null,
  external_customer_id text,
  parent_id uuid references public.parents(id) on delete set null,
  sync_status text not null default 'unmatched'
    check (sync_status in ('matched', 'unmatched', 'needs_review', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_error text,
  unique(entity_type, external_id)
);

create index if not exists zoho_external_records_customer_idx
  on public.zoho_external_records(external_customer_id);
create index if not exists zoho_external_records_status_idx
  on public.zoho_external_records(sync_status);
create index if not exists zoho_sync_runs_started_idx
  on public.zoho_sync_runs(started_at desc);

alter table public.zoho_sync_runs enable row level security;
alter table public.zoho_external_records enable row level security;

revoke all on public.zoho_sync_runs, public.zoho_external_records from anon;
grant select on public.zoho_sync_runs, public.zoho_external_records to authenticated;
grant all on public.zoho_sync_runs, public.zoho_external_records to service_role;

drop policy if exists "admins can read Zoho sync runs" on public.zoho_sync_runs;
create policy "admins can read Zoho sync runs"
on public.zoho_sync_runs for select to authenticated
using (exists (
  select 1 from public.user_roles
  where user_id = (select auth.uid()) and role = 'admin'
));

drop policy if exists "admins can read Zoho external records" on public.zoho_external_records;
create policy "admins can read Zoho external records"
on public.zoho_external_records for select to authenticated
using (exists (
  select 1 from public.user_roles
  where user_id = (select auth.uid()) and role = 'admin'
));
