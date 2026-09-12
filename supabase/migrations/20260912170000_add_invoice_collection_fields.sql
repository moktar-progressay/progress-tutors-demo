alter table public.client_payments
  add column if not exists due_date date,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_link text;

comment on column public.client_payments.due_date is
  'Invoice due date, separate from the date payment was received.';
comment on column public.client_payments.paid_at is
  'Timestamp when the invoice was marked paid.';
comment on column public.client_payments.payment_link is
  'Optional hosted payment URL, for example a Stripe Payment Link.';
