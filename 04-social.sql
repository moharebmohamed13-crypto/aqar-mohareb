-- روابط السوشيال ميديا (الأدمن بيحددها من الإعدادات)
alter table public.site_settings add column if not exists facebook text;
alter table public.site_settings add column if not exists instagram text;
alter table public.site_settings add column if not exists tiktok text;
update public.site_settings set hero_title = 'اختار شاليهك على البحر', hero_subtitle = 'بيع وإيجار شاليهات في مكان واحد.' where id = 1;
