-- شكل الموقع (ألوان، مقاسات، نصوص، إظهار/إخفاء) اللي الأدمن بيتحكم فيه
alter table public.site_settings add column if not exists theme jsonb not null default '{}'::jsonb;
