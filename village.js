import { sb, img, esc, money, icon, qs, mountChrome, waLink, chaletCard, showError, lightbox, carousel } from './lib.js?v=14';

const settings = await mountChrome('villages');
const page = document.getElementById('page');
const key = qs('v') || qs('id');

try {
  const isUuid = /^[0-9a-f-]{36}$/i.test(key || '');
  const { data: v, error } = await sb
    .from('villages')
    .select('*, village_features(features(name, icon, sort_order))')
    .eq(isUuid ? 'id' : 'slug', key)
    .maybeSingle();
  if (error) throw error;
  if (!v) {
    page.innerHTML = '<div class="empty" style="margin-top:48px">القرية دي مش موجودة. <a href="index.html">ارجع للرئيسية</a></div>';
  } else {
    const { data: chalets, error: e2 } = await sb.from('chalets').select('*').eq('village_id', v.id).order('status').order('created_at', { ascending: false });
    if (e2) throw e2;
    render(v, chalets);
  }
} catch (e) { showError(page, e); }

function render(v, chalets) {
  document.title = `${v.name} | عقار محارب`;
  const pics = [v.cover_image, ...(v.gallery || [])].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i);
  const feats = (v.village_features || []).map((x) => x.features).filter(Boolean).sort((a, b) => a.sort_order - b.sort_order);
  const sale = chalets.filter((c) => c.offer_type === 'sale');
  const rent = chalets.filter((c) => c.offer_type === 'rent');
  const rentMin = Math.min(...rent.filter((c) => c.price_night).map((c) => c.price_night));
  const saleMin = Math.min(...sale.filter((c) => c.price_total).map((c) => c.price_total));

  page.innerHTML = `
    <nav class="crumbs" aria-label="مسار الصفحة"><a href="index.html">الرئيسية</a><span>/</span><a href="index.html#villages">القرى</a><span>/</span><strong>${esc(v.name)}</strong></nav>
    <div class="gallery">
      ${pics.map((p, i) => `<img src="${esc(img(p))}" alt="${esc(v.name)} – صورة ${i + 1}" data-full="${esc(img(p))}">`).join('') || '<div class="ph"></div>'}
    </div>
    <div class="two-col" style="margin-top:40px">
      <div class="main">
        <div>
          <h1 class="page-title">${esc(v.name)}</h1>
          ${v.tagline ? `<p class="lead">${esc(v.tagline)}</p>` : ''}
        </div>
        ${v.description ? `<p class="prose">${esc(v.description)}</p>` : ''}
        ${feats.length ? `<div><h2 class="h2">مميزات القرية</h2><div class="feature-grid">${feats.map((f) => `<div class="feature">${icon(f.icon)}<span>${esc(f.name)}</span></div>`).join('')}</div></div>` : ''}
      </div>
      <aside>
        <div class="panel-dark">
          <span class="label">المتاح في القرية</span>
          <div class="stat-2">
            <div class="stat"><b>${sale.length}</b><span>شاليه للبيع</span></div>
            <div class="stat"><b>${rent.length}</b><span>شاليه للإيجار</span></div>
          </div>
          ${isFinite(rentMin) ? `<div><span style="color:#CFC9BC;font-size:14px">الإيجار يبدأ من</span><div style="font-size:22px;font-weight:700">${money(rentMin)} / الليلة</div></div>` : ''}
          ${isFinite(saleMin) ? `<div><span style="color:#CFC9BC;font-size:14px">البيع يبدأ من</span><div style="font-size:22px;font-weight:700">${money(saleMin)}</div></div>` : ''}
          <a class="btn btn-gold btn-block" href="#chalets">شوف الشاليهات المتاحة</a>
          <a class="btn btn-outline-light btn-block" href="${waLink(settings, `أهلًا، عايز أستفسر عن قرية ${v.name}`)}" target="_blank" rel="noopener">${icon('whatsapp')} اسأل عن القرية</a>
          ${v.map_url ? `<a href="${esc(v.map_url)}" target="_blank" rel="noopener" style="color:var(--gold);display:flex;gap:8px;align-items:center">${icon('pin')} الموقع على الخريطة</a>` : ''}
        </div>
      </aside>
    </div>

    <section id="chalets" style="margin-top:80px">
      <div class="toolbar">
        <div><h2 class="page-title" style="font-size:clamp(28px,3vw,40px)">الشاليهات المتاحة</h2><p class="lead" style="font-size:16px">اختار نوع العرض والتقسيم اللي يناسبك</p></div>
        <div class="tabs" role="tablist" aria-label="نوع العرض">
          <button role="tab" data-tab="rent" aria-selected="true">للإيجار (${rent.length})</button>
          <button role="tab" data-tab="sale" aria-selected="false">للبيع (${sale.length})</button>
        </div>
      </div>
      <div class="filter-chips" id="chips"></div>
      <div class="grid-3" id="grid"></div>
    </section>`;

  const open = lightbox();
  page.querySelectorAll('.gallery img').forEach((im) => im.addEventListener('click', () => open(im.dataset.full)));
  carousel(page.querySelector('.gallery'));

  const CHIPS = [
    ['all', 'الكل', () => true],
    ['r1', 'غرفة', (c) => c.rooms === 1],
    ['r2', 'غرفتين', (c) => c.rooms === 2],
    ['r3', '٣ غرف +', (c) => c.rooms >= 3],
    ['garden', 'أرضي بجاردن', (c) => (c.floor || '').includes('جاردن')],
    ['roof', 'روف', (c) => (c.floor || '').includes('روف')],
    ['sea', 'فيو بحر', (c) => c.view === 'بحر'],
    ['lagoon', 'فيو لاجون', (c) => c.view === 'لاجون'],
  ];
  let tab = rent.length || !sale.length ? 'rent' : 'sale';
  let chip = 'all';
  const chipsEl = page.querySelector('#chips');
  const grid = page.querySelector('#grid');

  function draw() {
    page.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
    const pool = tab === 'rent' ? rent : sale;
    chipsEl.innerHTML = CHIPS.filter(([, , f], i) => i === 0 || pool.some(f))
      .map(([k, t]) => `<button type="button" data-chip="${k}" aria-pressed="${k === chip}">${t}</button>`).join('');
    const f = (CHIPS.find(([k]) => k === chip) || CHIPS[0])[2];
    const list = pool.filter(f);
    grid.innerHTML = list.length ? list.map((c) => chaletCard(c)).join('') : `<div class="empty">مفيش شاليهات ${tab === 'rent' ? 'للإيجار' : 'للبيع'} بالمواصفات دي دلوقتي. <a href="${waLink(settings, `أهلًا، بدور على شاليه في ${v.name}`)}" target="_blank" rel="noopener">كلمنا ونرشحلك</a></div>`;
    carousel(grid);
    grid.scrollTo({ left: 0 });
  }
  page.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; chip = 'all'; draw(); }));
  chipsEl.addEventListener('click', (e) => { const b = e.target.closest('[data-chip]'); if (b) { chip = b.dataset.chip; draw(); } });
  draw();
}
