import { sb, img, esc, money, icon, mountChrome, waLink, chaletCard, showError } from './lib.js';

const settings = await mountChrome('home');

// ---------- الواجهة ----------
if (settings.hero_image) document.getElementById('hero-bg').src = img(settings.hero_image);
if (settings.hero_eyebrow) document.getElementById('hero-eyebrow').textContent = settings.hero_eyebrow;
if (settings.hero_title) document.getElementById('hero-title').textContent = settings.hero_title;
if (settings.hero_subtitle) document.getElementById('hero-sub').textContent = settings.hero_subtitle;
document.getElementById('hero-wa').href = waLink(settings);
document.getElementById('cta-actions').innerHTML = `
  <a class="btn btn-gold" href="${waLink(settings, 'أهلًا، محتاج ترشيح شاليه مناسب')}" target="_blank" rel="noopener">${icon('whatsapp')} تواصل عبر واتساب</a>
  ${settings.phone ? `<a class="btn btn-outline-light" href="tel:${esc(settings.phone)}">${icon('phone')} <span dir="ltr">${esc(settings.phone)}</span></a>` : ''}`;

// ---------- القرى ----------
const grid = document.getElementById('villages-grid');
const villageSelect = document.querySelector('select[name="village"]');
let villages = [];
try {
  const { data, error } = await sb
    .from('villages')
    .select('id, name, slug, tagline, cover_image, sort_order, village_features(features(name, sort_order)), chalets(offer_type, price_night, price_total, status)')
    .eq('is_visible', true)
    .order('sort_order')
    .order('created_at');
  if (error) throw error;
  villages = data;
  renderVillages();
} catch (e) { showError(grid, e); }

function renderVillages() {
  if (!villages.length) { grid.innerHTML = '<div class="empty">لسه مفيش قرى متضافة.</div>'; return; }
  grid.innerHTML = villages.map((v) => {
    const cs = v.chalets || [];
    const hasSale = cs.some((c) => c.offer_type === 'sale');
    const hasRent = cs.some((c) => c.offer_type === 'rent');
    const rentMin = Math.min(...cs.filter((c) => c.offer_type === 'rent' && c.price_night).map((c) => c.price_night));
    const saleMin = Math.min(...cs.filter((c) => c.offer_type === 'sale' && c.price_total).map((c) => c.price_total));
    const feats = (v.village_features || []).map((x) => x.features).filter(Boolean).sort((a, b) => a.sort_order - b.sort_order).slice(0, 3);
    const priceLine = isFinite(rentMin)
      ? `<div><div class="price-note">الإيجار يبدأ من</div><div class="price">${money(rentMin)} <small>/ الليلة</small></div></div>`
      : isFinite(saleMin)
        ? `<div><div class="price-note">البيع يبدأ من</div><div class="price">${money(saleMin)}</div></div>`
        : `<div class="price-note">${cs.length ? '' : 'قريبًا'}</div>`;
    return `
    <a class="card" href="village.html?v=${encodeURIComponent(v.slug || v.id)}">
      <div class="card-media">
        ${v.cover_image ? `<img src="${esc(img(v.cover_image))}" alt="${esc(v.name)}" loading="lazy">` : ''}
        <div class="badges">${hasSale ? '<span class="badge badge-dark">للبيع</span>' : ''}${hasRent ? '<span class="badge badge-gold">للإيجار</span>' : ''}</div>
      </div>
      <div class="card-body">
        <h3 class="card-title-lg">${esc(v.name)}</h3>
        ${v.tagline ? `<div class="card-sub">${esc(v.tagline)}</div>` : ''}
        <div class="chips">${feats.map((f) => `<span class="chip">${esc(f.name)}</span>`).join('')}</div>
        <div class="card-foot">${priceLine}<span class="more">${cs.length ? `${cs.length} شاليه` : 'شوف القرية'} ${icon('arrow')}</span></div>
      </div>
    </a>`;
  }).join('');
  villageSelect.innerHTML = '<option value="">كل القرى</option>' + villages.map((v) => `<option value="${v.id}">${esc(v.name)}</option>`).join('');
}

// ---------- البحث ----------
const form = document.getElementById('search');
let offer = '';
form.querySelectorAll('[data-offer]').forEach((b) => b.addEventListener('click', () => {
  offer = b.dataset.offer;
  form.querySelectorAll('[data-offer]').forEach((x) => x.setAttribute('aria-pressed', x === b));
}));

const results = document.getElementById('results');
const rgrid = document.getElementById('results-grid');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  results.hidden = false;
  rgrid.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
  results.scrollIntoView({ behavior: 'smooth' });
  let q = sb.from('chalets').select('*, villages(name)').order('status').order('created_at', { ascending: false });
  if (offer) q = q.eq('offer_type', offer);
  if (fd.get('village')) q = q.eq('village_id', fd.get('village'));
  const rooms = fd.get('rooms');
  if (rooms === '4') q = q.gte('rooms', 4); else if (rooms) q = q.eq('rooms', Number(rooms));
  if (fd.get('view')) q = q.eq('view', fd.get('view'));
  const { data, error } = await q;
  if (error) return showError(rgrid, error);
  document.getElementById('results-title').textContent = data.length ? `لقينا ${data.length} شاليه` : 'مفيش شاليهات مطابقة';
  rgrid.innerHTML = data.length
    ? data.map((c) => chaletCard(c, c.villages?.name)).join('')
    : '<div class="empty">جرّب تغيّر الفلاتر، أو كلمنا على واتساب ونرشحلك.</div>';
});
document.getElementById('clear-search').addEventListener('click', () => {
  form.reset(); offer = '';
  form.querySelectorAll('[data-offer]').forEach((x, i) => x.setAttribute('aria-pressed', i === 0));
  results.hidden = true;
  document.getElementById('villages').scrollIntoView({ behavior: 'smooth' });
});
if (location.hash === '#results') form.requestSubmit();
