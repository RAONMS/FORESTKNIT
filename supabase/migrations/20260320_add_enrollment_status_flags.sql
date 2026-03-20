alter table public.enrollments
add column if not exists is_graduated boolean not null default false,
add column if not exists is_final_class boolean not null default false;
