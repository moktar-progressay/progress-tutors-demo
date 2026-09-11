alter table public.classes
  add column if not exists card_colour text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'classes_card_colour_check'
      and conrelid = 'public.classes'::regclass
  ) then
    alter table public.classes
      add constraint classes_card_colour_check
      check (card_colour is null or card_colour in ('pink', 'blue', 'green', 'amber', 'violet', 'teal'));
  end if;
end
$$;
