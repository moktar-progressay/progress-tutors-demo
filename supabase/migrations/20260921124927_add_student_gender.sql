alter table public.students
  add column if not exists gender text;

comment on column public.students.gender is
  'Self-described student gender used for equality monitoring; null means not recorded.';

update public.students
set gender = case lower(trim(source_data::jsonb ->> 'gender'))
  when 'male' then 'Male'
  when 'female' then 'Female'
  else gender
end
where gender is null
  and lower(trim(source_data::jsonb ->> 'gender')) in ('male', 'female');
