alter table public.classes
add column if not exists is_graduation_class boolean not null default false;

alter table public.enrollments
add column if not exists class_end_date timestamptz,
add column if not exists graduation_date timestamptz;
