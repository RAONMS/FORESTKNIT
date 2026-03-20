alter table public.students
add column if not exists registered_at timestamptz;
