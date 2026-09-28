import { sb, img, esc, num, money, icon, waLink, waMessage } from './lib.js';
import { $, $$, params, bar, footer, sheet, calendarSheet, fmtRange, nightsBetween, statusBadge, calIcon, x } from './ui.js';

const p = params();
const page = $('#page');
const fromSite = document.referrer && new URL(document.referrer).host === location.host;
const s = await bar({ back: fromSite ? 'javascript:history.back()' : 'index.html', title: 'تفاصيل الشاليه' });
document.body.classList.add('has-dock');
footer(s);

const { data: c } = /^[0-9a-f-]{36}$/i.test(p.id || '')
  ? await sb.from('chalets').select('*, villages(id, name, slug, cover_image, village_features(features(name, sort_order))), chalet_features(features(name, icon, sort_order))').eq('id', p.id).maybeSingle()
  : { data: null };

if (!c) {
  page.innerHTML = '<div class="wrap" style="padding-top:24px"><div class="empty">الشاليه ده مش موجود أو اتشال. <a href="index.html">ارجع للرئيسية</a></div></div>';
} else {
  const v = c.villages || {};
  const rent = c.offer_type === 'rent';
  const can = c.status === 'available';
  const pics = [c.cover_image, ...(c.gallery || [])].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i);
  const feats = (c.chalet_features || []).map((x) => x.features).filter(Boolean).sort((a, b) => a.sort_order - b.sort_order);
  let stay = rent && p.from && p.to && nightsBetween(p.from, p.to) > 0 ? { from: p.from, to: p.to, guests: Number(p.g) || 2 } : null;
  let cur = 0;
  document.title = `${c.title} – ${v.name || ''} | عقار محارب`;

  const specs = [
    ['bed', c.rooms === 0 ? 'استوديو' : c.rooms != null ? num(c.rooms) : null, c.rooms === 0 ? 'النوع' : 'غرف'],
    ['bath', c.bathrooms != null ? num(c.bathrooms) : null, 'حمام'],
    ['area', c.area_m2 ? `${num(c.area_m2)} م²` : null, 'المساحة'],
    ['floor', c.floor, 'الدور'],
    ['eye', c.view, 'الفيو'],
    ['users', c.max_guests ? num(c.max_guests) : null, 'أفراد'],
  ].filter((x) => x[1]);

  function render() {
    const n = stay ? nightsBetween(stay.from, stay.to) : 0;
    page.innerHTML = `
    <div class="wrap c-layout">
      <div>
        <div class="gal" style="margin-inline:-16px">
          <img class="am-zoom" id="main" src="${esc(img(pics[cur] || ''))}" alt="${esc(c.title)}">
          ${pics.length > 1 ? `<span class="count-pill" id="cnt">${num(cur + 1)} / ${num(pics.length)}</span>` : ''}
        </div>
        ${pics.length > 1 ? `<div class="thumbs" style="padding-inline:0">${pics.map((q, i) => `<button type="button" data-i="${i}" aria-label="صورة ${i + 1}" aria-current="${i === cur}"><img src="${esc(img(q))}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
        <div class="c-head am-up">
          <div style="display:flex;gap:6px;align-items:center">${statusBadge(c.status)}<span class="tag code" style="padding:2px 9px">${esc(c.code)}</span></div>
          <h1>${esc(c.title)}</h1>
          <a href="village.html?v=${encodeURIComponent(v.slug || v.id)}" style="display:flex;gap:6px;align-items:center;font-size:14px">${icon('pin')} قرية ${esc(v.name || '')}</a>
        </div>
        ${rent && can ? `<div class="stay am-up am-d1"><span class="ic">${calIcon()}</span>
          <span>${stay ? `<b>${fmtRange(stay.from, stay.to)} · ${num(n)} ليالي</b><small>${num(stay.guests)} أفراد · الإجمالي ${money(n * (c.price_night || 0))}</small>` : `<b>اختار تواريخ الإقامة</b><small>شوف الأيام المتاحة في التقويم</small>`}</span>
          <button class="btn btn-sm" type="button" data-cal style="background:transparent;border-color:#5A554B;color:var(--gold)">${stay ? 'تغيير' : 'التقويم'}</button></div>` : ''}
        <div class="spec-grid am-list">${specs.map(([ic, val, l]) => `<div class="spec">${icon(ic)}<b>${esc(val)}</b><small>${l}</small></div>`).join('')}</div>
        ${feats.length ? `<div class="block"><h2 class="h3">مميزات الشاليه</h2><div class="feat-grid am-list">${feats.map((f) => `<div class="feat" style="background:#fff;border:1px solid var(--line)">${icon(f.icon)}${esc(f.name)}</div>`).join('')}</div></div>` : ''}
        ${c.description ? `<div class="block"><h2 class="h3">عن الشاليه</h2><p class="prose">${esc(c.description)}</p></div>` : ''}
      </div>
      <div class="c-side">
        <div class="block" style="margin-top:22px">
          <h2 class="h3">${rent ? 'تفاصيل السعر' : 'السعر'}</h2>
          <div class="rows">
            ${rent ? `
              <div><span>سعر الليلة</span><b>${money(c.price_night)}</b></div>
              ${c.price_week ? `<div><span>سعر الأسبوع</span><b>${money(c.price_week)}</b></div>` : ''}
              ${n ? `<div><span>${money(c.price_night)} × ${num(n)} ليالي</span><b>${money(n * (c.price_night || 0))}</b></div><div class="tot"><span>الإجمالي</span><b>${money(n * (c.price_night || 0))}</b></div>` : ''}`
            : `
              <div class="tot"><span>السعر الإجمالي</span><b>${money(c.price_total)}</b></div>
              ${c.down_payment ? `<div><span>المقدم</span><b>${money(c.down_payment)}</b></div>` : ''}
              ${c.installment_period ? `<div><span>مدة التقسيط</span><b>${esc(c.installment_period)}</b></div>` : ''}`}
          </div>
        </div>
        <div class="dock"><div class="wrap">
          <div class="p">${rent ? `<b>${n ? money(n * (c.price_night || 0)) : money(c.price_night)}</b><small>${n ? `${num(n)} ليالي` : '/ الليلة'}</small>` : `<b>${money(c.price_total)}</b><small>${c.down_payment ? `مقدم ${money(c.down_payment)}` : 'السعر الإجمالي'}</small>`}</div>
          ${can ? `<button class="btn btn-dark am-cta" type="button" data-req>${rent ? 'اطلب الحجز' : 'اطلب معاينة'}</button>` : `<span class="badge b-off" style="padding:8px 12px">${c.status === 'sold' ? 'تم البيع' : 'غير متاح حاليًا'}</span>`}
          <a class="btn btn-soft" href="${waLink(s, waMessage(s, c, v) + (stay ? `\nمن ${stay.from} لـ ${stay.to} · ${stay.guests} أفراد` : ''))}" target="_blank" rel="noopener" aria-label="تواصل عبر واتساب">${icon('whatsapp')}</a>
        </div></div>
      </div>
    </div>`;
  }

  const openCal = () => calendarSheet(c, {
    from: stay?.from, to: stay?.to, guests: stay?.guests, villageName: v.name,
    onDone: (r) => {
      stay = r;
      history.replaceState(null, '', `chalet.html?id=${c.id}&from=${r.from}&to=${r.to}&g=${r.guests}`);
      render();
    },
  });

  function openRequest() {
    if (rent && !stay) return openCal();
    const n = stay ? nightsBetween(stay.from, stay.to) : 0;
    const sh = sheet(`<div class="sheet-handle"></div>
      <div class="sheet-top"><h2>${rent ? 'طلب الحجز' : 'طلب معاينة'}</h2><button class="x-btn" type="button" data-close aria-label="إغلاق" style="background:var(--chip)">${x()}</button></div>
      <form class="sheet-pad" id="rq" style="display:flex;flex-direction:column;gap:12px" novalidate>
        <div class="sum"><img src="${esc(img(c.cover_image))}" alt=""><div><b>${esc(c.title)}</b><span>${esc(v.name || '')} · ${esc(c.code)}</span>
          ${stay ? `<span style="color:var(--ink)">${fmtRange(stay.from, stay.to)} · ${num(n)} ليالي · ${num(stay.guests)} أفراد</span><b>${money(n * (c.price_night || 0))}</b>` : `<b>${money(c.price_total)}</b>`}</div></div>
        <label class="field">الاسم<input name="name" autocomplete="name" required minlength="2" maxlength="80" placeholder="اسمك بالكامل"></label>
        <label class="field">رقم الموبايل<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required dir="ltr" style="text-align:right" placeholder="01xxxxxxxxx"></label>
        <label class="field">ملاحظات (اختياري)<textarea name="notes" rows="2" maxlength="500" placeholder="${rent ? 'أي طلب خاص؟' : 'أنسب معاد للمعاينة؟'}"></textarea></label>
        <p class="note-box" style="margin:0;display:block;line-height:1.7">مفيش دفع دلوقتي. هنتواصل معاك نأكد ${rent ? 'الحجز' : 'المعاد'} والتفاصيل.</p>
        <p class="err" id="rq-err" hidden></p>
        <button class="btn btn-dark btn-block" type="submit">${rent ? 'ابعت طلب الحجز' : 'ابعت الطلب'}</button>
        <a class="btn btn-soft btn-block" href="${waLink(s, waMessage(s, c, v) + (stay ? `\nمن ${stay.from} لـ ${stay.to} · ${stay.guests} أفراد` : ''))}" target="_blank" rel="noopener">${icon('whatsapp')} أو كمّل على واتساب</a>
      </form>`, { label: 'طلب الحجز' });
    const f = $('#rq', sh.el);
    const err = $('#rq-err', sh.el);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.hidden = true;
      const name = f.name.value.trim();
      const phone = f.phone.value.replace(/[^\d+]/g, '');
      if (name.length < 2) { err.textContent = 'اكتب اسمك'; err.hidden = false; return f.name.focus(); }
      if (phone.length < 8) { err.textContent = 'اكتب رقم موبايل صحيح'; err.hidden = false; return f.phone.focus(); }
      const btn = f.querySelector('[type=submit]');
      btn.disabled = true; btn.textContent = 'بيتبعت...';
      const { data: id, error } = await sb.rpc('request_booking', {
        p_chalet: c.id, p_kind: rent ? 'rent' : 'viewing', p_name: name, p_phone: phone,
        p_in: stay?.from || null, p_out: stay?.to || null, p_guests: stay?.guests || null, p_notes: f.notes.value,
      });
      if (error) {
        btn.disabled = false; btn.textContent = rent ? 'ابعت طلب الحجز' : 'ابعت الطلب';
        err.textContent = error.message.includes('dates_not_available') ? 'للأسف الأيام دي اتحجزت دلوقتي — اختار تواريخ تانية.' : 'حصلت مشكلة، جرّب تاني أو كلمنا واتساب.';
        err.hidden = false;
        return;
      }
      sh.el.innerHTML = `<div class="done">
        <span class="ok am-pop">${icon('check')}</span>
        <h2>طلبك وصل</h2>
        <p>رقم الطلب <b style="color:var(--ink)">#${esc(id)}</b><br>هنكلمك قريب على ${esc(phone)} نأكد ${rent ? 'الحجز' : 'المعاد'}.</p>
        <a class="btn btn-gold" href="index.html" style="margin-top:8px">رجوع للرئيسية</a>
        <button class="btn btn-soft" type="button" data-close>إغلاق</button>
      </div>`;
    });
  }

  page.addEventListener('click', (e) => {
    const t = e.target.closest('[data-i]');
    if (t) {
      cur = Number(t.dataset.i);
      const m = $('#main');
      m.classList.remove('am-zoom'); m.style.transition = 'opacity .25s ease'; m.style.opacity = '0';
      setTimeout(() => { m.src = img(pics[cur]); m.style.opacity = '1'; }, 150);
      const cnt = $('#cnt'); if (cnt) cnt.textContent = `${num(cur + 1)} / ${num(pics.length)}`;
      $$('.thumbs button', page).forEach((b) => b.setAttribute('aria-current', b === t));
    }
    if (e.target.closest('[data-cal]')) openCal();
    if (e.target.closest('[data-req]')) openRequest();
  });
  render();
  if (p.book === '1') openRequest();
}
