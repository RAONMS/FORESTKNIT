alter table public.enrollments
add column if not exists schedule_days text[];

update public.enrollments as e
set schedule_days = coalesce(e.schedule_days, c.schedule_days)
from public.classes as c
where e.class_id = c.id;
