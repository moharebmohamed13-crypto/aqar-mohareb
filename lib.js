import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js?v=16';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// جذر الموقع (عشان مسارات الصور تشتغل من أي صفحة)
export const ROOT = new URL('./', import.meta.url).href;

export const img = (src) => !src ? '' : /^(https?:|data:|blob:)/.test(src) ? src : ROOT + src.replace(/^\//, '').replace(/^assets\/(samples|img)\//, '');

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const nf = new Intl.NumberFormat('ar-EG');
export const num = (n) => (n == null || n === '' ? '—' : nf.format(Number(n)));
export const money = (n) => (n == null || n === '' ? 'السعر عند التواصل' : `${nf.format(Number(n))} ج.م`);

export const qs = (k) => new URLSearchParams(location.search).get(k);

export const STATUS = {
  available: { label: 'متاح', cls: 'badge-ok' },
  reserved: { label: 'محجوز', cls: 'badge-warn' },
  sold: { label: 'تم البيع', cls: 'badge-off' },
};
export const OFFER = { sale: 'للبيع', rent: 'للإيجار' };

// ---------- أيقونات ----------
const P = {
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  whatsapp: '<path d="M3 21l1.65-4.8A8.5 8.5 0 1 1 7.8 19.4L3 21z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8c-1-.5-1.8-1.3-2.3-2.3l.8-1-1-2L9 9.5z"/>',
  arrow: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  bed: '<path d="M3 18V7M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="1.5"/>',
  bath: '<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3zM6 12V5a2 2 0 0 1 3.5-1.3M7 19l-1 2M17 19l1 2"/>',
  area: '<path d="M3 3h7M3 3v7M21 21h-7M21 21v-7M3 3l7 7M21 21l-7-7"/>',
  floor: '<path d="M3 20h5v-5h5v-5h5V5h3"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-3-1.8-5.3-4.5-5.9"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  beach: '<circle cx="12" cy="9" r="3.5"/><path d="M12 2v1.5M5 9H3.5M20.5 9H19M6.8 3.8l1 1M17.2 3.8l-1 1"/><path d="M2 17c2 0 2-1.5 4-1.5S8 17 10 17s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M2 21c2 0 2-1.5 4-1.5S8 21 10 21s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/>',
  lagoon: '<path d="M2 8c2 0 2-1.5 4-1.5S8 8 10 8s2-1.5 4-1.5S16 8 18 8s2-1.5 4-1.5M2 13c2 0 2-1.5 4-1.5S8 13 10 13s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M2 18c2 0 2-1.5 4-1.5S8 18 10 18s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/>',
  pool: '<path d="M8 15V5a2 2 0 0 1 2-2M16 15V5a2 2 0 0 1 2-2M8 8h8M8 12h8"/><path d="M2 19c2 0 2-1.5 4-1.5S8 19 10 19s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/>',
  aqua: '<path d="M4 4v16M4 7h4c5 0 6 13 12 13M20 20v-4"/>',
  food: '<path d="M5 3v6a2 2 0 0 0 4 0V3M7 3v18M17 21V3c-2 2-3 5-3 8h3"/>',
  security: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
  sports: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  kids: '<path d="M12 3a5 5 0 0 1 5 5c0 3.5-3 6-5 6s-5-2.5-5-6a5 5 0 0 1 5-5z"/><path d="M11 16h2l-1-2-1 2zM12 16c0 2 2 3 0 5"/>',
  gym: '<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>',
  market: '<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="17" cy="20" r="1"/>',
  clinic: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 8v8M8 12h8"/>',
  walk: '<circle cx="13" cy="4" r="2"/><path d="M9 21l2-6-2-3 1-5 4 2 2 4M11 15l3 6"/>',
  sofa: '<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M3 11h18v5H3zM5 16v3M19 16v3"/>',
  ac: '<rect x="3" y="4" width="18" height="8" rx="2"/><path d="M7 16v3M12 16v4M17 16v3M7 9h10"/>',
  garden: '<path d="M12 21v-8M12 13c-4 0-6-3-6-7 4 0 6 3 6 7zM12 13c4 0 6-3 6-7-4 0-6 3-6 7zM4 21h16"/>',
  roof: '<path d="M3 11l9-7 9 7M5 10v10h14V10"/>',
  kitchen: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 10h16M8 6h.01M12 6h.01M8 14v3"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/>',
  washer: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4.5"/><path d="M8 6.5h.01M11 6.5h.01"/>',
  parking: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M10 16V8h3a2.5 2.5 0 0 1 0 5h-3"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>',
};
export const icon = (name, cls = 'icon') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.star}</svg>`;

// ---------- إعدادات الموقع ----------
let _settings;
export async function getSettings() {
  if (_settings) return _settings;
  const { data } = await sb.from('site_settings').select('*').eq('id', 1).maybeSingle();
  _settings = data || {};
  return _settings;
}

export function waNumber(n) {
  let d = String(n || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '2' + d; // رقم مصري محلي
  return d;
}
export function waLink(settings, text) {
  const n = waNumber(settings.whatsapp || settings.phone);
  return `https://wa.me/${n}?text=${encodeURIComponent(text || 'أهلًا، عايز أستفسر عن الشاليهات المتاحة')}`;
}
export function waMessage(settings, chalet, village) {
  const t = settings.whatsapp_message || 'أهلًا، أنا مهتم بشاليه {code} في قرية {village}';
  return t.replace('{code}', chalet?.code || '').replace('{village}', village?.name || '');
}

// ---------- الهيدر والفوتر ----------
export async function mountChrome(active) {
  const s = await getSettings();
  const nav = [
    ['home', 'index.html', 'الرئيسية'],
    ['villages', 'index.html#villages', 'القرى'],
    ['chalets', 'index.html#results', 'الشاليهات'],
    ['contact', '#contact', 'تواصل معنا'],
  ];
  const links = nav.map(([k, href, t]) => `<a href="${href.startsWith('#') ? href : ROOT + href}" class="${k === active ? 'active' : ''}">${t}</a>`).join('');
  const header = document.getElementById('site-header');
  header.className = 'site-header';
  header.innerHTML = `
    <div class="container">
      <a class="brand" href="${ROOT}index.html" aria-label="عقار محارب – الرئيسية">
        <img src="${ROOT}logo-icon.png" alt="">
        <span><span class="brand-name">عقار محارب</span><span class="brand-latin">AQAR MOHAREB</span></span>
      </a>
      <nav class="nav" aria-label="القائمة الرئيسية">${links}</nav>
      <div class="header-actions">
        ${s.phone ? `<a class="btn btn-outline-light btn-call" href="tel:${esc(s.phone)}">${icon('phone')}<span class="btn-text">اتصل بنا</span></a>` : ''}
        <a class="btn btn-gold" href="${waLink(s)}" target="_blank" rel="noopener">${icon('whatsapp')}<span class="btn-text">واتساب</span></a>
        <button class="menu-btn" type="button" aria-label="القائمة" aria-expanded="false">${icon('menu')}</button>
      </div>
    </div>
    <nav class="mobile-nav" aria-label="القائمة">${links}</nav>`;
  const btn = header.querySelector('.menu-btn');
  const mnav = header.querySelector('.mobile-nav');
  btn.addEventListener('click', () => {
    const open = mnav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
  mnav.addEventListener('click', (e) => { if (e.target.tagName === 'A') mnav.classList.remove('open'); });

  const footer = document.getElementById('site-footer');
  footer.className = 'site-footer';
  footer.id = 'contact';
  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div style="max-width:360px">
          <a class="brand" href="${ROOT}index.html"><img src="${ROOT}logo-icon.png" alt=""><span><span class="brand-name">عقار محارب</span><span class="brand-latin">AQAR MOHAREB</span></span></a>
          <p style="margin:16px 0 0">شاليهات للبيع والإيجار في قرى سياحية مختارة.</p>
        </div>
        <div><h4>روابط</h4><a href="${ROOT}index.html#villages">القرى</a><a href="${ROOT}index.html#results">الشاليهات</a></div>
        <div><h4>تواصل معنا</h4>
          ${s.phone ? `<a href="tel:${esc(s.phone)}">تليفون: <span dir="ltr" style="display:inline">${esc(s.phone)}</span></a>` : ''}
          ${s.whatsapp ? `<a href="${waLink(s)}" target="_blank" rel="noopener">واتساب: <span dir="ltr" style="display:inline">${esc(s.whatsapp)}</span></a>` : ''}
          ${s.address ? `<span>العنوان: ${esc(s.address)}</span>` : ''}
        </div>
      </div>
      <div class="footer-bottom">© ${new Date().getFullYear()} عقار محارب. جميع الحقوق محفوظة.</div>
    </div>`;

  if (!document.querySelector('.wa-float')) {
    const a = document.createElement('a');
    a.className = 'wa-float';
    a.href = waLink(s);
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', 'تواصل عبر واتساب');
    a.innerHTML = icon('whatsapp');
    document.body.appendChild(a);
  }

  return s;
}

// ---------- عرض بالسحب يمين وشمال (موبايل وتابلت) ----------
export function carousel(el) {
  if (!el) return;
  el.classList.add('carousel');
  let dots = el.nextElementSibling;
  if (!dots || !dots.classList.contains('dots')) {
    dots = document.createElement('div');
    dots.className = 'dots';
    el.after(dots);
  }
  const items = [...el.children].filter((c) => !c.classList.contains('empty') && !c.classList.contains('skeleton'));
  if (items.length < 2) { dots.innerHTML = ''; return; }
  dots.innerHTML = items.map((_, i) => `<button type="button" aria-label="عنصر ${i + 1}" ${i === 0 ? 'aria-current="true"' : ''}></button>`).join('')
    + `<span class="dots-count">${num(1)} / ${num(items.length)}</span>`;
  const btns = [...dots.querySelectorAll('button')];
  const count = dots.querySelector('.dots-count');
  btns.forEach((b, i) => b.addEventListener('click', () => items[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })));
  if (el._io) el._io.disconnect();
  el._io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const i = items.indexOf(e.target);
      btns.forEach((b, j) => b.toggleAttribute('aria-current', j === i));
      count.textContent = `${num(i + 1)} / ${num(items.length)}`;
    });
  }, { root: el, threshold: 0.6 });
  items.forEach((it) => el._io.observe(it));
}

// ---------- كارت الشاليه ----------
export function chaletCard(c, villageName) {
  const st = STATUS[c.status] || STATUS.available;
  const price = c.offer_type === 'rent'
    ? `<div class="price">${money(c.price_night)} <small>/ الليلة</small></div>`
    : `<div><div class="price">${money(c.price_total)}</div>${c.down_payment ? `<div class="price-note">مقدم ${money(c.down_payment)}${c.installment_period ? ` · تقسيط ${esc(c.installment_period)}` : ''}</div>` : ''}</div>`;
  return `
  <a class="card" href="${ROOT}chalet.html?id=${c.id}">
    <div class="card-media">
      ${c.cover_image ? `<img src="${esc(img(c.cover_image))}" alt="${esc(c.title)}" loading="lazy">` : ''}
      <div class="badges"><span class="badge ${st.cls}">${st.label}</span><span class="badge ${c.offer_type === 'rent' ? 'badge-gold' : 'badge-dark'}">${OFFER[c.offer_type]}</span></div>
      <span class="code-tag">${esc(c.code)}</span>
    </div>
    <div class="card-body">
      <h3>${esc(c.title)}</h3>
      ${villageName ? `<div class="card-sub">${icon('pin', 'icon')} ${esc(villageName)}</div>` : ''}
      <div class="specs">
        ${c.rooms != null ? `<span>${icon('bed')}${num(c.rooms)} غرف</span>` : ''}
        ${c.bathrooms != null ? `<span>${icon('bath')}${num(c.bathrooms)} حمام</span>` : ''}
        ${c.floor ? `<span>${icon('floor')}${esc(c.floor)}</span>` : ''}
        ${c.view ? `<span>${icon('eye')}${esc(c.view)}</span>` : ''}
      </div>
      <div class="card-foot">${price}<span class="more">التفاصيل ${icon('arrow')}</span></div>
    </div>
  </a>`;
}

export function showError(el, err) {
  console.error(err);
  el.innerHTML = `<div class="error-box">حصلت مشكلة في تحميل البيانات. جرّب تعمل تحديث للصفحة.</div>`;
}

export function lightbox() {
  let lb = document.querySelector('.lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = '<button type="button" aria-label="إغلاق">×</button><img alt="">';
    lb.addEventListener('click', (e) => { if (e.target !== lb.querySelector('img')) lb.classList.remove('open'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lb.classList.remove('open'); });
    document.body.appendChild(lb);
  }
  return (src) => { lb.querySelector('img').src = src; lb.classList.add('open'); };
}
