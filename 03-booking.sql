-- ============================================
-- عقار محارب — طلبات الحجز والتقويم
-- ============================================
create type public.request_status as enum ('pending', 'accepted', 'rejected');

create table public.booking_requests (
  id bigint generated always as identity primary key,
  chalet_id uuid not null references public.chalets(id) on delete cascade,
  kind text not null default 'rent' check (kind in ('rent', 'viewing')),
  name text not null check (char_length(name) between 2 and 80),
  phone text not null check (phone ~ '^[0-9+ ]{8,20}$'),
  check_in date,
  check_out date,
  guests int check (guests between 1 and 30),
  notes text check (char_length(notes) <= 500),
  total numeric,
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  check (kind = 'viewing' or (check_in is not null and check_out > check_in))
);
create index booking_requests_chalet_idx on public.booking_requests(chalet_id);
create index booking_requests_status_idx on public.booking_requests(status, created_at desc);

-- الأيام المقفولة (محجوزة أو مقفولة من الأدمن)
create table public.blocked_dates (
  chalet_id uuid not null references public.chalets(id) on delete cascade,
  day date not null,
  request_id bigint references public.booking_requests(id) on delete set null,
  primary key (chalet_id, day)
);
create index blocked_dates_request_idx on public.blocked_dates(request_id);

alter table public.booking_requests enable row level security;
alter table public.blocked_dates enable row level security;

create policy "public read blocked days" on public.blocked_dates for select to anon, authenticated using (true);
create policy "admin insert blocked days" on public.blocked_dates for insert to authenticated with check ((select public.is_admin()));
create policy "admin delete blocked days" on public.blocked_dates for delete to authenticated using ((select public.is_admin()));

create policy "admin read requests" on public.booking_requests for select to authenticated using ((select public.is_admin()));
create policy "admin update requests" on public.booking_requests for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete requests" on public.booking_requests for delete to authenticated using ((select public.is_admin()));

-- العميل يبعت طلب (مع التأكد إن الأيام فاضية)
create or replace function public.request_booking(
  p_chalet uuid, p_kind text, p_name text, p_phone text,
  p_in date default null, p_out date default null, p_guests int default null, p_notes text default null
) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  c public.chalets%rowtype;
  v_id bigint;
  v_total numeric;
begin
  select * into c from public.chalets where id = p_chalet and is_visible;
  if not found then raise exception 'chalet_not_found'; end if;
  if p_kind = 'rent' then
    if c.offer_type <> 'rent' then raise exception 'not_for_rent'; end if;
    if p_in is null or p_out is null or p_in < current_date or p_out <= p_in or p_out - p_in > 60 then
      raise exception 'invalid_dates';
    end if;
    if exists (select 1 from public.blocked_dates b where b.chalet_id = p_chalet and b.day >= p_in and b.day < p_out) then
      raise exception 'dates_not_available';
    end if;
    v_total := c.price_night * (p_out - p_in);
  elsif p_kind <> 'viewing' then
    raise exception 'invalid_kind';
  end if;
  insert into public.booking_requests (chalet_id, kind, name, phone, check_in, check_out, guests, notes, total)
  values (p_chalet, p_kind, trim(p_name), regexp_replace(p_phone, '[^0-9+]', '', 'g'),
          case when p_kind = 'rent' then p_in end, case when p_kind = 'rent' then p_out end,
          p_guests, nullif(trim(coalesce(p_notes, '')), ''), v_total)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.request_booking(uuid, text, text, text, date, date, int, text) to anon, authenticated;

-- الأدمن يقبل الطلب: الأيام تتقفل تلقائي
create or replace function public.accept_request(p_id bigint) returns void
language plpgsql security definer set search_path = ''
as $$
declare r public.booking_requests%rowtype;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select * into r from public.booking_requests where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if r.kind = 'rent' then
    if exists (select 1 from public.blocked_dates b where b.chalet_id = r.chalet_id and b.day >= r.check_in and b.day < r.check_out and b.request_id is distinct from r.id) then
      raise exception 'dates_conflict';
    end if;
    insert into public.blocked_dates (chalet_id, day, request_id)
    select r.chalet_id, d::date, r.id from generate_series(r.check_in, r.check_out - 1, interval '1 day') d
    on conflict do nothing;
  end if;
  update public.booking_requests set status = 'accepted' where id = p_id;
end;
$$;

create or replace function public.reject_request(p_id bigint) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  delete from public.blocked_dates where request_id = p_id;
  update public.booking_requests set status = 'rejected' where id = p_id;
end;
$$;
revoke execute on function public.accept_request(bigint) from public, anon;
revoke execute on function public.reject_request(bigint) from public, anon;
grant execute on function public.accept_request(bigint) to authenticated;
grant execute on function public.reject_request(bigint) to authenticated;

-- بيانات تجربة: أيام محجوزة
insert into public.blocked_dates (chalet_id, day)
select c.id, d::date from public.chalets c,
  generate_series(current_date + 3, current_date + 6, interval '1 day') d
where c.code in ('A-12', 'W-05')
on conflict do nothing;
insert into public.blocked_dates (chalet_id, day)
select c.id, d::date from public.chalets c,
  generate_series(current_date + 15, current_date + 17, interval '1 day') d
where c.code in ('A-12', 'L-08', 'M-03')
on conflict do nothing;

select (select count(*) from public.blocked_dates) as blocked, (select count(*) from pg_policies where tablename in ('booking_requests','blocked_dates')) as policies;
