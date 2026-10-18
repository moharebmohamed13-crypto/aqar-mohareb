-- قواعد الحجز من إعدادات الأدمن: أيام الويك إند، أقل/أقصى عدد ليالي، أقصى مدة قدام
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
  r jsonb;
  v_wk int[];
  v_min int;
  v_max int;
  v_win int;
begin
  select coalesce(theme->'rules', '{}'::jsonb) into r from public.site_settings where id = 1;
  r := coalesce(r, '{}'::jsonb);
  v_wk := coalesce((select array_agg(x::int) from jsonb_array_elements_text(case when jsonb_typeof(r->'weekend') = 'array' then r->'weekend' else '[4,5]'::jsonb end) x), '{}');
  v_min := greatest(coalesce((r->>'minNights')::int, 1), 1);
  v_max := least(coalesce(nullif((r->>'maxNights')::int, 0), 60), 365);
  v_win := least(coalesce(nullif((r->>'windowDays')::int, 0), 365), 730);

  select * into c from public.chalets where id = p_chalet and is_visible;
  if not found then raise exception 'chalet_not_found'; end if;
  if p_kind = 'rent' then
    if c.offer_type <> 'rent' then raise exception 'not_for_rent'; end if;
    if p_in is null or p_out is null or p_in < current_date or p_out <= p_in
       or p_out - p_in > v_max or p_out - p_in < v_min or p_in > current_date + v_win then
      raise exception 'invalid_dates';
    end if;
    if exists (select 1 from public.blocked_dates b where b.chalet_id = p_chalet and b.day >= p_in and b.day < p_out) then
      raise exception 'dates_not_available';
    end if;
    -- JS: 0=الأحد .. 6=السبت ؛ Postgres dow بنفس الترقيم
    select coalesce(sum(case when extract(dow from d)::int = any(v_wk) then coalesce(c.weekend_price, c.price_night) else c.price_night end), 0)
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
