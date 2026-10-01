import { sb, img, esc, num, money, icon, getSettings, waLink } from './lib.js?v=16';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const params = () => Object.fromEntries(new URLSearchParams(location.search));
export const logo = new URL('./logo-icon.png', import.meta.url).href;

// ---------- التواريخ ----------
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parse = (s) => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const nightsBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export const fmtDay = (s) => { const d = parse(s); return `${num(d.getDate())} ${MONTHS[d.getMonth()]}`; };
export const fmtRange = (a, b) => `${fmtDay(a)} ← ${fmtDay(b)}`;

export const UNITS = [
  { rooms: 0, n: 'S', name: 'استوديو', guests: 'من ١ لـ ٢ أفراد' },
  { rooms: 1, n: '١', name: 'غرفة', guests: 'من ٢ لـ ٤ أفراد' },
  { rooms: 2, n: '٢', name: 'غرفتين', guests: 'من ٤ لـ ٦ أفراد' },
  { rooms: 3, n: '٣', name: '٣ غرف', guests: 'من ٦ لـ ٨ أفراد' },
  { rooms: 4, n: '٤', name: '٤ غرف أو أكتر', guests: 'من ٨ لـ ١٠ أفراد' },
];
export const unitName = (r) => (UNITS.find((u) => u.rooms === Number(r)) || {}).name || '';

// ---------- حساب سعر الإقامة (الخميس والجمعة بسعر الويك إند + هاوس كيبنج) ----------
export const isWeekendNight = (d) => d.getDay() === 4 || d.getDay() === 5;
export function stayPrice(c, from, to) {
  const base = Number(c.price_night) || 0;
  const wk = c.weekend_price != null && c.weekend_price !== '' ? Number(c.weekend_price) : base;
  let nights = 0; let wkN = 0; let rent = 0;
  if (from && to) for (let d = parse(from); d < parse(to); d = addDays(d, 1)) { nights++; if (isWeekendNight(d)) { wkN++; rent += wk; } else rent += base; }
  const hk = nights ? Number(c.housekeeping_fee) || 0 : 0;
  return { nights, wkN, normN: nights - wkN, base, wk, rent, hk, total: rent + hk, deposit: Number(c.security_deposit) || 0 };
}
export const CHECKIN = 'الدخول من الساعة ١١ لـ ١٢';
export const CHECKOUT = 'المغادرة من الساعة ١ لـ ٢';
export const DEPOSIT_NOTE = 'تأمين مسترد بالكامل عند تسليم الشاليه لو مفيش أي تلف.';
export const SEASON_NOTE = 'سعر ليلة الخميس والجمعة أعلى من باقي الأيام، والسعر اليومي ممكن يختلف في الأعياد والمناسبات.';
// صفوف تفاصيل السعر
export function priceRowsHtml(c, p) {
  const r = [];
  if (p.nights) {
    if (p.normN) r.push(`<div><span>${money(p.base)} × ${num(p.normN)} ${p.normN === 1 ? 'ليلة' : 'ليالي'}${p.wkN ? ' (أيام عادية)' : ''}</span><b>${money(p.base * p.normN)}</b></div>`);
    if (p.wkN) r.push(`<div><span>${money(p.wk)} × ${num(p.wkN)} ${p.wkN === 1 ? 'ليلة' : 'ليالي'} (خميس/جمعة)</span><b>${money(p.wk * p.wkN)}</b></div>`);
    if (p.hk) r.push(`<div><span>هاوس كيبنج</span><b>${money(p.hk)}</b></div>`);
    r.push(`<div class="tot"><span>الإجمالي</span><b>${money(p.total)}</b></div>`);
  } else {
    r.push(`<div><span>سعر الليلة (أيام الأسبوع)</span><b>${money(p.base)}</b></div>`);
    if (p.wk !== p.base) r.push(`<div><span>ليلة الخميس والجمعة</span><b>${money(p.wk)}</b></div>`);
    if (c.housekeeping_fee) r.push(`<div><span>هاوس كيبنج (مرة واحدة للحجز)</span><b>${money(c.housekeeping_fee)}</b></div>`);
  }
  if (p.deposit) r.push(`<div class="dep"><span>تأمين مسترد<small>${DEPOSIT_NOTE}</small></span><b>${money(p.deposit)}</b></div>`);
  return r.join('');
}

// ---------- الهيدر ----------
export async function bar({ back, close, title, float } = {}) {
  const s = await getSettings();
  const el = $('#bar');
  el.className = float ? 'bar bar-float' : 'bar';
  if (float) {
    const onScroll = () => el.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
  const left = close ? `<a class="bar-btn" href="${close}" aria-label="إغلاق">${x()}</a>` : (back ? '<span class="bar-sp"></span>' : '');
  el.innerHTML = `<div class="wrap">
    ${back ? `<a class="bar-btn" href="${back}" aria-label="رجوع">${arrowBack()}</a>` : ''}
    ${title && back ? `<span class="bar-title">${esc(title)}</span>` : `<a class="brand" href="index.html"><img src="${logo}" alt=""><span><b>عقار محارب</b><small>AQAR MOHAREB</small></span></a>`}
    <nav class="bar-links" aria-label="القائمة"><a href="index.html">الرئيسية</a><a href="book.html">احجز شاليه</a><a href="#contact">تواصل معنا</a></nav>
    ${left}
  </div>`;
  return s;
}
export const x = () => '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
export const arrowBack = () => '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
export const arrowNext = () => '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
export const calIcon = () => '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';

const SOCIAL = {
  facebook: ['فيسبوك', '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>'],
  instagram: ['إنستجرام', '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor"/>'],
  tiktok: ['تيك توك', '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.8 2.3 4.6 5 5"/>'],
  whatsapp: ['واتساب', '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1-1.2 1.8.8c-.2 1-1 1.6-2 1.6-3 0-6-3-6-6 0-1 .6-1.8 1.6-2l.8 1.8z"/>'],
  phone: ['اتصال', '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'],
};
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
export function footer(s) {
  const el = $('#contact');
  if (!el) return;
  el.className = 'foot';
  const links = {
    facebook: safeUrl(s.facebook), instagram: safeUrl(s.instagram), tiktok: safeUrl(s.tiktok),
    whatsapp: s.whatsapp ? waLink(s) : '', phone: s.phone ? `tel:${String(s.phone).replace(/[^\d+]/g, '')}` : '',
  };
  const btns = Object.entries(SOCIAL).filter(([k]) => links[k]).map(([k, [label, path]]) =>
    `<a href="${esc(links[k])}" aria-label="${label}" title="${label}"${k === 'phone' ? '' : ' target="_blank" rel="noopener"'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg></a>`).join('');
  el.innerHTML = `<div class="wrap">
    ${btns ? `<div class="foot-h"><b>تابعنا وكلمنا</b><span></span></div><div class="socials">${btns}</div>` : ''}
    <div class="foot-b"><span>© ${new Date().getFullYear()} عقار محارب</span><span class="en">AQAR MOHAREB</span></div></div>`;
}

// ---------- اللوحة السفلية ----------
export function sheet(html, { label = '', onClose } = {}) {
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}">${html}</div>`;
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const close = () => {
    scrim.remove();
    document.body.style.overflow = prevOverflow;
    document.removeEventListener('keydown', onKey);
    onClose && onClose();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  scrim.addEventListener('click', (e) => { if (e.target === scrim || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(scrim);
  const first = scrim.querySelector('button, a, input');
  first && first.focus({ preventScroll: true });
  return { el: scrim.firstElementChild, close };
}

// ---------- معرض صور يتحرك لوحده ويتسحب يمين وشمال ----------
export function slidesHtml(pics, alt, cls = 'sheet-img', extra = '') {
  return `<div class="${cls} slider" data-slider>
    <div class="slides">${pics.map((p, i) => `<img src="${esc(img(p))}" alt="${i === 0 ? esc(alt) : ''}" ${i ? 'loading="lazy"' : ''} draggable="false">`).join('') || '<img alt="">'}</div>
    ${extra}
    ${pics.length > 1 ? `<span class="count-pill" data-count>${num(1)} / ${num(pics.length)}</span>
      <div class="sdots">${pics.map((_, i) => `<i${i === 0 ? ' class="on"' : ''}></i>`).join('')}</div>` : ''}
  </div>`;
}
function thumbsHtml(pics) {
  return pics.length > 1 ? `<div class="thumbs">${pics.map((p, i) => `<button type="button" data-i="${i}" aria-label="صورة ${i + 1}" aria-current="${i === 0}"><img src="${esc(img(p))}" alt="" loading="lazy"></button>`).join('')}</div>` : '';
}
export function wireSlider(root, { interval = 3500 } = {}) {
  const box = $('[data-slider]', root);
  if (!box) return;
  const track = $('.slides', box);
  const n = track.children.length;
  const count = $('[data-count]', box);
  const dots = $$('.sdots i', box);
  const thumbs = $$('.thumbs button', root);
  let cur = 0; let hold = 0; let t;
  const w = () => track.clientWidth || 1;
  const mark = (i) => {
    if (i === cur) return;
    cur = i;
    if (count) count.textContent = `${num(i + 1)} / ${num(n)}`;
    dots.forEach((d, j) => d.classList.toggle('on', j === i));
    thumbs.forEach((b, j) => b.setAttribute('aria-current', j === i));
  };
  const go = (i, smooth = true) => {
    const k = (i + n) % n;
    mark(k);
    const left = k * w();
    try { track.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' }); } catch { track.scrollLeft = left; }
    setTimeout(() => { if (Math.abs(track.scrollLeft - left) > 4 && dragX === null) track.scrollLeft = left; }, 900);
  };
  track.addEventListener('scroll', () => mark(Math.min(n - 1, Math.max(0, Math.round(track.scrollLeft / w())))), { passive: true });
  thumbs.forEach((b) => b.addEventListener('click', () => { go(Number(b.dataset.i)); pause(); }));
  const pause = () => { hold = Date.now() + 6000; };
  ['pointerdown', 'touchstart', 'wheel'].forEach((ev) => track.addEventListener(ev, pause, { passive: true }));
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    box.addEventListener('mouseenter', () => { hold = Infinity; });
    box.addEventListener('mouseleave', () => { hold = Date.now() + 1500; });
  }
  // سحب بالماوس على الكمبيوتر
  let dragX = null; let startLeft = 0; let startIdx = 0;
  // الضغط على الصورة يفتحها بمقاسها الكامل
  let downX = 0; let moved = false;
  track.addEventListener('pointerdown', (e) => { downX = e.clientX; moved = false; });
  track.addEventListener('pointermove', (e) => { if (Math.abs(e.clientX - downX) > 8) moved = true; });
  track.addEventListener('click', (e) => {
    const im = e.target.closest('img');
    if (!im || moved) return;
    hold = Date.now() + 8000;
    lightbox([...track.querySelectorAll('img')].map((i) => i.currentSrc || i.src), [...track.children].indexOf(im));
  });
  track.addEventListener('mousedown', (e) => { dragX = e.clientX; startLeft = track.scrollLeft; startIdx = cur; track.classList.add('drag'); e.preventDefault(); });
  window.addEventListener('mousemove', (e) => { if (dragX !== null) track.scrollLeft = startLeft - (e.clientX - dragX); });
  window.addEventListener('mouseup', (e) => {
    if (dragX === null) return;
    const d = e.clientX - dragX; dragX = null; track.classList.remove('drag');
    go(Math.abs(d) > 40 ? Math.min(n - 1, Math.max(0, startIdx + (d < 0 ? 1 : -1))) : startIdx);
  });
  if (n < 2) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  t = setInterval(() => {
    if (!box.isConnected) return clearInterval(t);
    if (document.hidden || Date.now() < hold || dragX !== null) return;
    go(cur + 1, !reduce);
  }, interval);
}

// ---------- عرض الصورة بمقاسها الكامل ----------
export function lightbox(srcs, start = 0) {
  const n = srcs.length;
  const el = document.createElement('div');
  el.className = 'lb';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'عرض الصور');
  el.innerHTML = `<div class="lb-track">${srcs.map((u) => `<div class="lb-slide"><img src="${esc(u)}" alt="" draggable="false"></div>`).join('')}</div>
    <button class="lb-x" type="button" aria-label="إغلاق">${x()}</button>
    ${n > 1 ? `<span class="lb-count"></span>
      <button class="lb-nav lb-prev" type="button" aria-label="الصورة اللي قبل"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button>
      <button class="lb-nav lb-next" type="button" aria-label="الصورة اللي بعد"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>` : ''}`;
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  document.body.appendChild(el);
  const track = $('.lb-track', el);
  const count = $('.lb-count', el);
  const w = () => track.clientWidth || 1;
  let cur = start;
  const show = () => { if (count) count.textContent = `${num(cur + 1)} / ${num(n)}`; };
  const go = (i, smooth = true) => { cur = (i + n) % n; track.scrollTo({ left: cur * w(), behavior: smooth ? 'smooth' : 'auto' }); show(); };
  track.addEventListener('scroll', () => { cur = Math.min(n - 1, Math.max(0, Math.round(track.scrollLeft / w()))); show(); }, { passive: true });
  requestAnimationFrame(() => go(start, false));
  const close = () => { el.remove(); document.body.style.overflow = prevOverflow; document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(cur + 1); if (e.key === 'ArrowLeft') go(cur - 1); };
  document.addEventListener('keydown', onKey);
  $('.lb-x', el).addEventListener('click', close);
  $('.lb-prev', el)?.addEventListener('click', () => go(cur - 1));
  $('.lb-next', el)?.addEventListener('click', () => go(cur + 1));
  el.addEventListener('click', (e) => { if (e.target.classList.contains('lb-slide')) close(); });
  $('.lb-x', el).focus({ preventScroll: true });
}
function galleryHtml(pics, alt) {
  return slidesHtml(pics, alt, 'sheet-img', `<button class="x-btn" type="button" data-close aria-label="إغلاق">${x()}</button>`) + thumbsHtml(pics);
}
const wireGallery = (root) => wireSlider(root);
const uniq = (a) => a.filter(Boolean).filter((x, i, arr) => arr.indexOf(x) === i);

// معاينة القرية
export function villagePreview(v, { onChoose, chooseLabel = 'اختار القرية دي' } = {}) {
  const pics = uniq([v.cover_image, ...(v.gallery || [])]);
  const feats = (v.village_features || []).map((x) => x.features).filter(Boolean).sort((a, b) => a.sort_order - b.sort_order).slice(0, 8);
  const cs = v.chalets || [];
  const rentMin = Math.min(...cs.filter((c) => c.offer_type === 'rent' && c.price_night).map((c) => c.price_night));
  const s = sheet(`${galleryHtml(pics, v.name)}
    <div class="sheet-pad">
      <h2 class="h2" style="margin:0">${esc(v.name)}</h2>
      ${v.tagline ? `<div class="sub" style="font-size:13px">${esc(v.tagline)}</div>` : ''}
      ${v.description ? `<p class="prose" style="margin-top:8px">${esc(v.description)}</p>` : ''}
    </div>
    ${feats.length ? `<div class="sheet-pad" style="padding-top:0"><div class="feat-grid">${feats.map((f) => `<div class="feat">${icon(f.icon)}${esc(f.name)}</div>`).join('')}</div></div>` : ''}
    <div class="sheet-pad" style="padding-top:0"><div class="note-box"><span>${num(cs.length)} شاليه متاح</span>${isFinite(rentMin) ? `<b>يبدأ من ${money(rentMin)} / الليلة</b>` : ''}</div></div>
    <div class="sheet-actions">
      <button class="btn btn-dark" style="flex:1" type="button" data-choose>${chooseLabel}</button>
      <button class="btn btn-soft" type="button" data-close>رجوع</button>
    </div>`, { label: `معاينة ${v.name}` });
  wireGallery(s.el, pics);
  $('[data-choose]', s.el).addEventListener('click', () => { s.close(); onChoose && onChoose(v); });
  return s;
}

// معاينة الشاليه
export function chaletPreview(c, { onDates, detailsHref, villageName } = {}) {
  const pics = uniq([c.cover_image, ...(c.gallery || [])]);
  const feats = (c.chalet_features || []).map((x) => x.features).filter(Boolean).sort((a, b) => a.sort_order - b.sort_order);
  const isRent = c.offer_type === 'rent';
  const s = sheet(`${galleryHtml(pics, c.title)}
    <div class="sheet-pad">
      <span class="code">${esc(c.code)}</span>
      <h2 style="margin:2px 0 0;font-size:18px;font-weight:600">${esc(c.title)}</h2>
      <div class="sub">${esc(villageName || '')}${c.floor ? ` · ${esc(c.floor)}` : ''}</div>
      <div class="feat-grid" style="margin-top:12px">
        <div class="feat">${icon('bed')}${c.rooms != null ? (c.rooms === 0 ? 'استوديو' : `${num(c.rooms)} غرف`) : '—'}</div>
        <div class="feat">${icon('bath')}${c.bathrooms != null ? `${num(c.bathrooms)} حمام` : '—'}</div>
        <div class="feat">${icon('users')}${c.max_guests ? `${num(c.max_guests)} أفراد` : '—'}</div>
        <div class="feat">${icon('eye')}${esc(c.view || '—')}</div>
      </div>
      ${feats.length ? `<div class="mini-tags" style="margin-top:10px">${feats.map((f) => `<span>${esc(f.name)}</span>`).join('')}</div>` : ''}
    </div>
    <div class="sheet-actions" style="flex-direction:column">
      <div class="price">${isRent ? `<b>${money(c.price_night)}</b><small>/ الليلة</small>` : `<b>${money(c.price_total)}</b>${c.down_payment ? `<small>مقدم ${money(c.down_payment)}</small>` : ''}`}</div>
      <div style="display:flex;gap:8px">
        ${isRent && onDates ? `<button class="btn btn-dark" style="flex:1" type="button" data-dates>اختار التواريخ</button>` : ''}
        <a class="btn ${isRent && onDates ? 'btn-soft' : 'btn-dark'}" style="${isRent && onDates ? '' : 'flex:1'}" href="${detailsHref}">كل التفاصيل</a>
      </div>
    </div>`, { label: `معاينة شاليه ${c.code}` });
  wireGallery(s.el, pics);
  const d = $('[data-dates]', s.el);
  d && d.addEventListener('click', () => { s.close(); onDates(c); });
  return s;
}

// ---------- تقويم الحجز ----------
export async function calendarSheet(c, { from, to, guests = 2, onDone, villageName = '' } = {}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const max = addDays(today, 365);
  const { data } = await sb.from('blocked_dates').select('day').eq('chalet_id', c.id).gte('day', iso(today)).lte('day', iso(max));
  const booked = new Set((data || []).map((r) => r.day));
  const maxG = c.max_guests || 10;
  let st = { from: from || null, to: to || null, guests: Math.min(guests, maxG) };
  let view = st.from ? parse(st.from) : new Date(today);
  view.setDate(1);

  const s = sheet(`<div class="sheet-handle"></div>
    <div class="sheet-top"><div><h2>اختار تواريخ الإقامة</h2><div class="sub">شاليه ${esc(c.code)}${villageName ? ` · ${esc(villageName)}` : ''} · ${money(c.price_night)} / الليلة${c.weekend_price && Number(c.weekend_price) !== Number(c.price_night) ? ` · الخميس والجمعة ${money(c.weekend_price)}` : ''}</div></div>
      <button class="x-btn" type="button" data-close aria-label="إغلاق" style="background:var(--chip)">${x()}</button></div>
    <div class="cal-nav"><button type="button" data-prev aria-label="الشهر اللي فات"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button><b data-month></b><button type="button" data-next aria-label="الشهر الجاي"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button></div>
    <p class="cal-hint" data-hint></p>
    <p class="cal-times">${CHECKIN} · ${CHECKOUT}</p>
    <div class="cal" data-grid></div>
    <div class="legend"><span><i style="background:var(--chip);border:1px solid var(--line)"></i>محجوز</span><span><i style="background:var(--ink);border-radius:50%"></i>اختيارك</span><span><i style="border:1px solid var(--line-2)"></i>متاح</span><span><i class="wk-dot"></i>خميس/جمعة</span></div>
    <div class="cal-msg" data-msg aria-live="polite"></div>
    <p class="price-note-box" data-pnote hidden></p>
    <div class="stepper"><span><b style="font-size:14px">عدد الأفراد</b><br><small class="sub">أقصى عدد ${num(maxG)}</small></span>
      <div><button type="button" data-plus aria-label="زيادة">+</button><b data-g></b><button type="button" data-minus aria-label="تقليل">−</button></div></div>
    <div class="sheet-actions" style="margin-top:14px;align-items:center">
      <div style="flex:1"><b data-total style="font-size:17px;font-weight:600;display:block"></b><small class="sub" data-sum></small></div>
      <button class="btn btn-dark" type="button" data-go>كمّل ${arrowNext()}</button>
    </div>`, { label: 'تقويم الحجز' });

  const grid = $('[data-grid]', s.el);
  const msg = $('[data-msg]', s.el);
  const free = (a, b) => { for (let d = parse(a); d < parse(b); d = addDays(d, 1)) if (booked.has(iso(d))) return false; return true; };

  function draw() {
    $('[data-month]', s.el).textContent = `${MONTHS[view.getMonth()]} ${num(view.getFullYear())}`;
    const first = new Date(view);
    const offset = (first.getDay() + 1) % 7;
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    let h = ['سبت', 'أحد', 'إتنين', 'تلات', 'أربع', 'خميس', 'جمعة'].map((w) => `<span class="wd">${w}</span>`).join('');
    for (let i = 0; i < offset; i++) h += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const date = new Date(view.getFullYear(), view.getMonth(), d);
      const k = iso(date);
      const past = date < today;
      const isB = booked.has(k);
      const edge = k === st.from || k === st.to;
      const inR = st.from && st.to && k > st.from && k < st.to;
      const cls = ['d', isWeekendNight(date) && 'wk', past && 'past', isB && 'booked', edge && 'edge', edge && !st.to && 'only', inR && 'in'].filter(Boolean).join(' ');
      h += `<button type="button" class="${cls}" data-day="${k}" ${past || isB ? 'disabled' : ''} aria-label="${fmtDay(k)}${isB ? ' – محجوز' : ''}" ${edge ? 'aria-pressed="true"' : ''}>${edge ? `<span>${num(d)}</span>` : num(d)}</button>`;
    }
    grid.innerHTML = h;
    $('[data-prev]', s.el).disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
    $('[data-next]', s.el).disabled = view >= new Date(max.getFullYear(), max.getMonth(), 1);
    $('[data-g]', s.el).textContent = num(st.guests);
    $('[data-minus]', s.el).disabled = st.guests <= 1;
    $('[data-plus]', s.el).disabled = st.guests >= maxG;
    const n = st.from && st.to ? nightsBetween(st.from, st.to) : 0;
    const pr = n ? stayPrice(c, st.from, st.to) : null;
    $('[data-total]', s.el).textContent = n ? money(pr.total) : (st.from ? 'اختار يوم المغادرة' : 'اختار يوم الوصول');
    $('[data-sum]', s.el).textContent = n ? `${fmtRange(st.from, st.to)} · ${num(n)} ليالي${pr.hk ? ' · شامل هاوس كيبنج' : ''}` : (st.from ? `الوصول ${fmtDay(st.from)}` : '');
    const note = $('[data-pnote]', s.el);
    const parts = [];
    if (pr && pr.wkN) parts.push(SEASON_NOTE);
    if (pr && pr.deposit) parts.push(`+ ${money(pr.deposit)} تأمين مسترد عند الاستلام.`);
    note.textContent = parts.join(' '); note.hidden = !parts.length;
    $('[data-go]', s.el).disabled = !n;
    $('[data-hint]', s.el).innerHTML = !st.from
      ? '<b>١</b> اضغط على يوم الوصول'
      : !st.to ? `الوصول <b>${fmtDay(st.from)}</b> — دلوقتي اضغط على يوم المغادرة، والأيام اللي بينهم هتتحدد لوحدها`
        : `<span class="nights">${num(n)} ${n === 1 ? 'ليلة' : n === 2 ? 'ليلتين' : 'ليالي'}</span> الوصول <b>${fmtDay(st.from)}</b> · المغادرة <b>${fmtDay(st.to)}</b> <button type="button" class="cal-reset" data-reset>مسح</button>`;
  }
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-day]');
    if (!b || b.disabled) return;
    const k = b.dataset.day;
    msg.textContent = '';
    // اختيار فترة: يوم الوصول وبعدين يوم المغادرة، والأيام اللي بينهم بتتحدد لوحدها
    if (!st.from || k <= st.from) { st.from = k; st.to = null; }
    else if (!free(st.from, k)) { msg.textContent = 'فيه أيام محجوزة في الفترة دي — اختار يوم مغادرة أقرب أو فترة تانية'; }
    else st.to = k;
    draw();
  });
  $('[data-hint]', s.el).addEventListener('click', (e) => { if (e.target.closest('[data-reset]')) { st.from = null; st.to = null; msg.textContent = ''; draw(); } });
  $('[data-prev]', s.el).addEventListener('click', () => { view.setMonth(view.getMonth() - 1); draw(); });
  $('[data-next]', s.el).addEventListener('click', () => { view.setMonth(view.getMonth() + 1); draw(); });
  $('[data-plus]', s.el).addEventListener('click', () => { st.guests = Math.min(maxG, st.guests + 1); draw(); });
  $('[data-minus]', s.el).addEventListener('click', () => { st.guests = Math.max(1, st.guests - 1); draw(); });
  $('[data-go]', s.el).addEventListener('click', () => { s.close(); onDone && onDone({ ...st }); });
  if (st.from && st.to && !free(st.from, st.to)) { st.to = null; msg.textContent = 'التواريخ اللي كنت مختارها بقت محجوزة — اختار تاني'; }
  draw();
  return s;
}

export function statusBadge(s) {
  return { available: '<span class="badge b-ok">متاح</span>', reserved: '<span class="badge b-warn">محجوز</span>', sold: '<span class="badge b-off">تم البيع</span>' }[s] || '';
}
