insert into public.pricing_plans
  (programme_id, name, amount, currency, pricing_unit, inclusion_notes, active, sort_order)
select
  programme.id,
  plan.name,
  plan.amount,
  'GBP',
  'per hour',
  'Usually billed by monthly subscription',
  true,
  plan.sort_order
from public.programmes as programme
cross join (
  values
    ('Pro - Group classes', 30::numeric, 10),
    ('Premium - One-to-one', 55::numeric, 11)
) as plan(name, amount, sort_order)
where programme.programme_type = 'tuition'
  and not exists (
    select 1
    from public.pricing_plans as existing
    where existing.programme_id = programme.id
      and existing.name = plan.name
  );
