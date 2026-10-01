-- إشعار واتساب للأدمن عند أي طلب حجز جديد (عن طريق CallMeBot)
create extension if not exists pg_net with schema extensions;

create table if not exists public.admin_notify (
  id int primary key default 1 check (id = 1),
  wa_phone text,
  wa_apikey text,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.admin_notify (id) values (1) on conflict do nothing;
alter table public.admin_notify enable row level security;
drop policy if exists admin_notify_admin on public.admin_notify;
create policy admin_notify_admin on public.admin_notify for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.admin_notify from anon;

create or replace function public.send_admin_wa(p_text text) returns void
language plpgsql security definer set search_path = ''
as $$
declare n public.admin_notify%rowtype;
begin
  select * into n from public.admin_notify where id = 1;
  if not found or not n.enabled or coalesce(n.wa_phone, '') = '' or coalesce(n.wa_apikey, '') = '' then return; end if;
  perform net.http_get(
    url := 'https://api.callmebot.com/whatsapp.php',
    params := jsonb_build_object('phone', n.wa_phone, 'text', p_text, 'apikey', n.wa_apikey)
  );
end;
$$;
revoke execute on function public.send_admin_wa(text) from public, anon, authenticated;

create or replace function public.notify_new_request() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  c record;
  t text;
begin
  select ch.code, ch.title, v.name as village into c
    from public.chalets ch left join public.villages v on v.id = ch.village_id where ch.id = new.chalet_id;
  t := '🔔 طلب ' || case when new.kind = 'rent' then 'حجز' else 'معاينة' end || ' جديد #' || new.id || E'\n'
    || 'الشاليه: ' || coalesce(c.code, '') || ' - ' || coalesce(c.village, '') || E'\n'
    || 'الاسم: ' || new.name || E'\n'
    || 'الموبايل: ' || new.phone || E'\n'
    || case when new.kind = 'rent' then
         'من ' || to_char(new.check_in, 'DD/MM') || ' لـ ' || to_char(new.check_out, 'DD/MM') || ' (' || (new.check_out - new.check_in) || ' ليالي)' || E'\n'
         || 'الأفراد: ' || coalesce(new.guests::text, '-') || E'\n'
         || 'الإجمالي: ' || coalesce(to_char(new.total, 'FM999,999,999'), '-') || ' ج.م' || E'\n'
       else '' end
    || coalesce('ملاحظات: ' || new.notes || E'\n', '')
    || 'https://moharebmohamed13-crypto.github.io/aqar-mohareb/admin.html#/requests';
  begin
    perform public.send_admin_wa(t);
  exception when others then null; -- الإشعار ما يوقفش الطلب أبدًا
  end;
  return new;
end;
$$;
drop trigger if exists trg_notify_new_request on public.booking_requests;
create trigger trg_notify_new_request after insert on public.booking_requests
  for each row execute function public.notify_new_request();

-- زرار "رسالة تجربة" من لوحة الأدمن
create or replace function public.test_admin_wa() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  perform public.send_admin_wa('✅ رسالة تجربة من موقع عقار محارب — الإشعارات شغالة.');
end;
$$;
grant execute on function public.test_admin_wa() to authenticated;
