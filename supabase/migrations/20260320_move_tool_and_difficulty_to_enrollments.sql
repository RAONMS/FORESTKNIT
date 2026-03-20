alter table public.enrollments
add column if not exists tool_type text,
add column if not exists difficulty text;

update public.enrollments as e
set
  tool_type = coalesce(e.tool_type, c.type),
  difficulty = coalesce(e.difficulty, c.difficulty)
from public.classes as c
where e.class_id = c.id;

alter table public.enrollments
alter column tool_type set default '코바늘',
alter column difficulty set default '입문과';
