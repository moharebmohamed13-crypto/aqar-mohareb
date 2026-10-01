-- سعر الويك إند (خميس/جمعة) + هاوس كيبنج + تأمين مسترد — لشاليهات الإيجار
alter table public.chalets add column if not exists weekend_price numeric check (weekend_price is null or weekend_price >= 0);
alter table public.chalets add column if not exists housekeeping_fee numeric check (housekeeping_fee is null or housekeeping_fee >= 0);
alter table public.chalets add column if not exists security_deposit numeric check (security_deposit is null or security_deposit >= 0);
alter table public.booking_requests add column if not exists deposit numeric;
alter table public.booking_requests add column if not exists housekeeping numeric;

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
  v_hk numeric;
  v_dep numeric;
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
    -- ليلة الخميس (4) والجمعة (5) بسعر الويك إند
    select coalesce(sum(case when extract(isodow from d) in (4, 5) then coalesce(c.weekend_price, c.price_night) else c.price_night end), 0)
      into v_total
      from generate_series(p_in, p_out - 1, interval '1 day') d;
    v_hk := coalesce(c.housekeeping_fee, 0);
    v_dep := c.security_deposit;
    v_total := v_total + v_hk;
  elsif p_kind <> 'viewing' then
    raise exception 'invalid_kind';
  end if;
  insert into public.booking_requests (chalet_id, kind, name, phone, check_in, check_out, guests, notes, total, housekeeping, deposit)
  values (p_chalet, p_kind, trim(p_name), regexp_replace(p_phone, '[^0-9+]', '', 'g'),
          case when p_kind = 'rent' then p_in end, case when p_kind = 'rent' then p_out end,
          p_guests, nullif(trim(coalesce(p_notes, '')), ''), v_total, nullif(v_hk, 0), v_dep)
  returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.request_booking(uuid, text, text, text, date, date, int, text) to anon, authenticated;
