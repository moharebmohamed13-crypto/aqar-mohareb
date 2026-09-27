import { sb, img, esc, num, money, icon, qs, mountChrome, waLink, waMessage, showError, STATUS, OFFER } from './lib.js';

const settings = await mountChrome('chalets');
const page = document.getElementById('page');
const id = qs('id');

try {
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) throw Object.assign(new Error('bad id'), { notFound: true });
  const { data: c, error } = await sb
    .from('chalets')
    .select('*, villages(id, name, slug, tagline, cover_image, village_features(features(name, sort_order))), chalet_features(features(name, icon, sort_order))')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!c) throw Object.assign(new Error('not found'), { notFound: true });
  render(c);
} catch (e) {
  if (e.notFound) page.innerHTML = '<div class="empty" style="margin-top:48px">الشاليه ده مش موجود أو اتشال. <a href="index.html">ارجع للرئيسية</a></div>';
  else showError(page, e);
}

function render(c) {
  const v = c.villages || {};
  document.title = `${c.title} – ${v.name || ''} | عقار محارب`;
  const pics = [c.cover_image, ...(c.gallery || [])].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i);
  const feats = (c.chalet_features || []).map((x) => x.features).filter(Boolean).sort((a, b) => a.sort_order - b.sort_order);
  const vfeats = (v.village_features || []).map((x) => x.features).filter(Boolean).sort((a, b) => a.sort_order - b.sort_order).slice(0, 3);
  const st = STATUS[c.status] || STATUS.available;
  const isRent = c.offer_type === 'rent';
  const unavailable = c.status !== 'available';

  const specs = [
    ['bed', 'الغرف', c.rooms != null ? num(c.rooms) : null],
    ['bath', 'الحمامات', c.bathrooms != null ? num(c.bathrooms) : null],
    ['area', 'المساحة', c.area_m2 ? `${num(c.area_m2)} م²` : null],
    ['floor', 'الدور', c.floor],
    ['eye', 'الفيو', c.view],
    ['users', 'أقصى عدد أفراد', c.max_guests ? num(c.max_guests) : null],
  ].filter((s) => s[2]);

  const today = new Date().toISOString().slice(0, 10);
  const bookCard = isRent ? `
    <span class="badge badge-gold" style="align-self:flex-start">للإيجار</span>
    <div><span class="big-price">${money(c.price_night)}</span> <span style="color:var(--muted-2)">/ الليلة</span></div>
    ${c.price_week ? `<span style="color:var(--muted)">الأسبوع: ${money(c.price_week)}</span>` : ''}
    <form id="book" style="display:flex;flex-direction:column;gap:14px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <label class="field">الوصول<input type="date" name="from" min="${today}" required></label>
        <label class="field">المغادرة<input type="date" name="to" min="${today}" required></label>
      </div>
      <label class="field">عدد الأفراد
        <select name="guests">${Array.from({ length: Math.max(c.max_guests || 6, 1) }, (_, i) => `<option value="${i + 1}" ${i + 1 === 2 ? 'selected' : ''}>${num(i + 1)}</option>`).join('')}</select>
      </label>
      <p class="note" id="nights"></p>
      <button class="btn btn-gold btn-block" type="submit" ${unavailable ? 'disabled style="opacity:.6;cursor:not-allowed"' : ''}>${icon('whatsapp')} ${unavailable ? 'غير متاح حاليًا' : 'احجز عبر واتساب'}</button>
    </form>
    <p class="note">هتتفتح رسالة واتساب فيها كود الشاليه والتواريخ، وهنأكد معاك التوفر.</p>` : `
    <span class="badge badge-dark" style="align-self:flex-start">للبيع</span>
    <div><div style="color:var(--muted-2);font-size:14px">السعر الإجمالي</div><div class="big-price">${money(c.price_total)}</div></div>
    <div class="rows">
      ${c.down_payment ? `<div><span>المقدم</span><b>${money(c.down_payment)}</b></div>` : ''}
      ${c.installment_period ? `<div><span>مدة التقسيط</span><b>${esc(c.installment_period)}</b></div>` : ''}
      ${c.price_total && c.down_payment ? `<div><span>الباقي بعد المقدم</span><b>${money(c.price_total - c.down_payment)}</b></div>` : ''}
    </div>
    <a class="btn btn-gold btn-block" href="${waLink(settings, waMessage(settings, c, v))}" target="_blank" rel="noopener">${icon('whatsapp')} استفسر عبر واتساب</a>
    <a class="btn btn-outline btn-block" href="${waLink(settings, `${waMessage(settings, c, v)} — وعايز أحدد معاد معاينة`)}" target="_blank" rel="noopener">اطلب معاينة</a>`;

  page.innerHTML = `
    <nav class="crumbs" aria-label="مسار الصفحة"><a href="index.html">الرئيسية</a><span>/</span><a href="village.html?v=${encodeURIComponent(v.slug || v.id)}">${esc(v.name)}</a><span>/</span><strong>شاليه ${esc(c.code)}</strong></nav>
    <div class="two-col" style="margin-top:20px">
      <div class="main">
        <div>
          <div class="chalet-main-img">
            ${pics[0] ? `<img id="main-img" src="${esc(img(pics[0]))}" alt="${esc(c.title)}">` : ''}
            ${pics.length > 1 ? `<span class="count" id="img-count">١ / ${num(pics.length)}</span>` : ''}
          </div>
          ${pics.length > 1 ? `<div class="thumbs">${pics.map((p, i) => `<button type="button" data-i="${i}" aria-label="صورة ${i + 1}" aria-current="${i === 0}"><img src="${esc(img(p))}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="display:flex;gap:8px;align-items:center"><span class="badge ${st.cls}">${st.label}</span><span class="badge" style="background:var(--chip);font-family:var(--latin);font-size:12px;direction:ltr">${esc(c.code)}</span></div>
          <h1 class="page-title" style="font-size:clamp(28px,3.4vw,44px)">${esc(c.title)}</h1>
          <a href="village.html?v=${encodeURIComponent(v.slug || v.id)}" style="display:flex;gap:8px;align-items:center">${icon('pin')} قرية ${esc(v.name)}</a>
        </div>
        ${specs.length ? `<div class="spec-grid">${specs.map(([ic, l, val]) => `<div class="spec">${icon(ic)}<small>${l}</small><b>${esc(val)}</b></div>`).join('')}</div>` : ''}
        ${c.description ? `<div><h2 class="h2">عن الشاليه</h2><p class="prose">${esc(c.description)}</p></div>` : ''}
        ${feats.length ? `<div><h2 class="h2">مميزات الشاليه</h2><div class="check-list">${feats.map((f) => `<span>${icon('check')}${esc(f.name)}</span>`).join('')}</div></div>` : ''}
        <a class="village-link" href="village.html?v=${encodeURIComponent(v.slug || v.id)}">
          <div style="display:flex;gap:16px;align-items:center">
            ${v.cover_image ? `<img src="${esc(img(v.cover_image))}" alt="">` : ''}
            <div><div style="font-size:13px;color:var(--muted-2)">الشاليه ده في قرية</div><div style="font-family:var(--display);font-size:24px;font-weight:700">${esc(v.name)}</div><div style="font-size:14px;color:var(--muted)">${vfeats.map((f) => esc(f.name)).join(' · ')}</div></div>
          </div>
          <span class="more">مميزات القرية ${icon('arrow')}</span>
        </a>
      </div>
      <aside><div class="book-card">${bookCard}
        <hr style="border:0;border-top:1px solid #ECE7DC;margin:0">
        ${settings.phone ? `<a href="tel:${esc(settings.phone)}" style="display:flex;justify-content:center;gap:8px;font-weight:600">${icon('phone')} أو اتصل: <span dir="ltr">${esc(settings.phone)}</span></a>` : ''}
      </div></aside>
    </div>`;

  // معرض الصور
  const main = page.querySelector('#main-img');
  const count = page.querySelector('#img-count');
  page.querySelectorAll('.thumbs button').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.i);
    main.src = img(pics[i]);
    if (count) count.textContent = `${num(i + 1)} / ${num(pics.length)}`;
    page.querySelectorAll('.thumbs button').forEach((x) => x.setAttribute('aria-current', x === b));
  }));

  // الحجز عبر واتساب
  const form = page.querySelector('#book');
  if (form) {
    const nightsEl = page.querySelector('#nights');
    const calc = () => {
      const f = form.from.value, t = form.to.value;
      if (f) form.to.min = f;
      if (f && t) {
        const n = Math.round((new Date(t) - new Date(f)) / 86400000);
        nightsEl.textContent = n > 0 ? `${num(n)} ليلة${c.price_night ? ` · تقريبًا ${money(n * c.price_night)}` : ''}` : 'تاريخ المغادرة لازم يكون بعد الوصول';
        return n;
      }
      nightsEl.textContent = '';
      return 0;
    };
    form.addEventListener('change', calc);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (calc() <= 0) return;
      const msg = `${waMessage(settings, c, v)}\nمن ${form.from.value} لـ ${form.to.value}\nعدد الأفراد: ${form.guests.value}`;
      window.open(waLink(settings, msg), '_blank', 'noopener');
    });
  }
}
