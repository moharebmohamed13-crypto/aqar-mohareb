import { sb, img, esc, num } from './lib.js?v=11';
import { $, bar, footer } from './ui.js?v=11';

const s = await bar({ float: true });
footer(s);
if (s.hero_image) $('#hero-bg').src = img(s.hero_image);
if (s.hero_title) $('#h').textContent = s.hero_title;
if (s.hero_subtitle) $('#hero-sub').textContent = s.hero_subtitle;

const { data: villages, error } = await sb.from('villages')
  .select('id, name, slug, cover_image, chalets(id)')
  .eq('is_visible', true).order('sort_order').order('created_at');
const row = $('#villages');
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const count = (n) => n === 0 ? 'قريبًا' : n === 1 ? 'شاليه واحد' : n === 2 ? 'شاليهين' : n < 11 ? `${num(n)} شاليهات` : `${num(n)} شاليه`;
if (error || !villages) {
  row.innerHTML = '<div class="empty" style="grid-column:1/-1">حصلت مشكلة في التحميل، جرّب تعمل تحديث.</div>';
} else {
  row.innerHTML = villages.map((v, i) => `
    <a class="vcard${i >= 4 ? ' extra' : ''}" href="book.html?v=${v.id}&step=2">
      <img src="${esc(img(v.cover_image))}" alt="" loading="lazy">
      <span class="vtxt"><b>${esc(v.name)}</b><small>${count((v.chalets || []).length)}</small></span>
      <span class="varrow">${arrow}</span>
    </a>`).join('') || '<div class="empty" style="grid-column:1/-1">لسه مفيش قرى.</div>';
  const more = $('#more');
  if (villages.length > 4) {
    more.hidden = false;
    more.addEventListener('click', () => { row.classList.add('all'); more.hidden = true; });
  }
  const sel = $('#search select[name="v"]');
  sel.insertAdjacentHTML('beforeend', villages.map((v) => `<option value="${v.id}">${esc(v.name)}</option>`).join(''));
}

$('#search').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = e.target.v.value;
  const o = e.target.o.value;
  const p = new URLSearchParams();
  if (v) p.set('v', v);
  if (o) p.set('o', o);
  p.set('step', !v ? 1 : !o ? 2 : 3);
  location.href = `book.html?${p}`;
});
