alter table public.enrollments
add column if not exists renew_on_completion boolean not null default false;
