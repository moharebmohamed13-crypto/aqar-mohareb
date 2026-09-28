import { sb, img, esc, num, waLink } from './lib.js';
import { $, bar, footer } from './ui.js';

const s = await bar();
footer(s);
if (s.hero_image) $('#hero-bg').src = img(s.hero_image);
if (s.hero_eyebrow) $('#hero-eyebrow').textContent = s.hero_eyebrow;
if (s.hero_title) $('#h').textContent = s.hero_title;
if (s.hero_subtitle) $('#hero-sub').textContent = s.hero_subtitle;
$('#help-wa').href = waLink(s, 'أهلًا، محتاج ترشيح شاليه مناسب');

const { data: villages, error } = await sb.from('villages')
  .select('id, name, slug, cover_image, chalets(id)')
  .eq('is_visible', true).order('sort_order').order('created_at');
const row = $('#villages');
if (error || !villages) {
  row.innerHTML = '<div class="empty" style="flex:1">حصلت مشكلة في التحميل، جرّب تعمل تحديث.</div>';
} else {
  row.innerHTML = villages.map((v) => `
    <a class="vtile" href="book.html?v=${v.id}&step=2">
      <img src="${esc(img(v.cover_image))}" alt="" loading="lazy">
      <b>${esc(v.name)}</b><small>${num((v.chalets || []).length)} شاليه</small>
    </a>`).join('') || '<div class="empty" style="flex:1">لسه مفيش قرى.</div>';
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
