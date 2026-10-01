import { sb, img, esc, num, money, icon } from './lib.js?v=13';
import { $, params, bar, footer, chaletPreview, calendarSheet, unitName, statusBadge } from './ui.js?v=13';

const p = params();
const s = await bar({ back: `book.html?v=${p.v || ''}&o=${p.o || ''}&step=3`, title: 'النتائج' });
footer(s);
$('#edit').href = `book.html?v=${p.v || ''}&o=${p.o || ''}&step=1`;

let q = sb.from('chalets').select('*, villages(id, name, slug), chalet_features(features(name, icon, sort_order))');
if (p.v) q = q.eq('village_id', p.v);
if (p.o) q = q.eq('offer_type', p.o);
if (p.r !== undefined && p.r !== '') q = Number(p.r) >= 4 ? q.gte('rooms', 4) : q.eq('rooms', Number(p.r));
const { data, error } = await q;
const list = $('#list');
let items = data || [];

const vName = items[0]?.villages?.name || '';
if (p.v && !vName) {
  const { data: v } = await sb.from('villages').select('name').eq('id', p.v).maybeSingle();
  if (v) $('#tags').dataset.v = v.name;
}
$('#tags').innerHTML = [vName || $('#tags').dataset.v, p.o === 'rent' ? 'إيجار' : p.o === 'sale' ? 'بيع' : '', p.r !== undefined && p.r !== '' ? unitName(p.r) : 'كل الأنواع']
  .filter(Boolean).map((t) => `<span class="tag">${esc(t)}</span>`).join('');

const priceOf = (c) => (c.offer_type === 'rent' ? c.price_night : c.price_total) ?? Infinity;
function draw() {
  const sort = $('#sort').value;
  const arr = [...items].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'available' ? -1 : b.status === 'available' ? 1 : 0;
    if (sort === 'new') return new Date(b.created_at) - new Date(a.created_at);
    return sort === 'price' ? priceOf(a) - priceOf(b) : priceOf(b) - priceOf(a);
  });
  const n = arr.length;
  $('#count').textContent = error ? 'حصلت مشكلة' : n === 1 ? 'لقينا شاليه واحد مناسب ليك' : n === 2 ? 'لقينا شاليهين مناسبين ليك' : n > 2 && n < 11 ? `لقينا ${num(n)} شاليهات مناسبة ليك` : n ? `لقينا ${num(n)} شاليه مناسب ليك` : 'مفيش نتائج مطابقة';
  if (error) { list.innerHTML = '<div class="empty">حصلت مشكلة في التحميل، جرّب تعمل تحديث.</div>'; return; }
  if (!arr.length) { list.innerHTML = `<div class="empty">مفيش شاليهات بالمواصفات دي دلوقتي. <a href="book.html?v=${p.v || ''}&o=${p.o || ''}&step=3">غيّر نوع الوحدة</a></div>`; return; }
  list.innerHTML = arr.map((c) => {
    const feats = (c.chalet_features || []).map((x) => x.features).filter(Boolean).sort((a, b) => a.sort_order - b.sort_order).slice(0, 2);
    const rent = c.offer_type === 'rent';
    const can = c.status === 'available';
    return `<article class="rcard">
      <div class="media">
        <img src="${esc(img(c.cover_image))}" alt="" loading="lazy">
        <button class="peek" type="button" data-peek="${c.id}" aria-label="معاينة شاليه ${esc(c.code)}">${icon('eye')}معاينة</button>
      </div>
      <div class="info">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px"><span class="code">${esc(c.code)}</span>${statusBadge(c.status)}</div>
        <span class="ttl">${esc(c.title)}</span>
        <span class="sub">${esc(c.villages?.name || '')}${c.floor ? ` · ${esc(c.floor)}` : ''}</span>
        <div class="specs">
          <span>${icon('bed')}${c.rooms === 0 ? 'استوديو' : `${num(c.rooms ?? 0)} غرف`}</span>
          ${c.bathrooms != null ? `<span>${icon('bath')}${num(c.bathrooms)}</span>` : ''}
          ${c.max_guests ? `<span>${icon('users')}${num(c.max_guests)}</span>` : ''}
        </div>
        ${feats.length || c.view ? `<div class="mini-tags">${c.view ? `<span>فيو ${esc(c.view)}</span>` : ''}${feats.map((f) => `<span>${esc(f.name)}</span>`).join('')}</div>` : ''}
        <div class="bottom">
          <div class="price">${rent ? `<b>${money(c.price_night)}</b><small>/ الليلة</small>` : `<b>${money(c.price_total)}</b><small>${c.installment_period ? `تقسيط ${esc(c.installment_period)}` : 'السعر الإجمالي'}</small>`}</div>
          ${rent && can ? `<button class="btn btn-gold btn-sm" type="button" data-dates="${c.id}">اختار التواريخ</button>` : `<a class="btn btn-soft btn-sm" href="chalet.html?id=${c.id}">التفاصيل</a>`}
        </div>
      </div>
    </article>`;
  }).join('');
}
$('#sort').addEventListener('change', draw);
draw();

const openDates = (c) => calendarSheet(c, {
  villageName: c.villages?.name,
  onDone: ({ from, to, guests }) => { location.href = `chalet.html?id=${c.id}&from=${from}&to=${to}&g=${guests}`; },
});
list.addEventListener('click', (e) => {
  const peek = e.target.closest('[data-peek]');
  const dates = e.target.closest('[data-dates]');
  const id = peek?.dataset.peek || dates?.dataset.dates;
  const c = items.find((x) => x.id === id);
  if (!c) return;
  if (peek) chaletPreview(c, { villageName: c.villages?.name, detailsHref: `chalet.html?id=${c.id}`, onDates: c.status === 'available' ? openDates : null });
  if (dates) openDates(c);
});
