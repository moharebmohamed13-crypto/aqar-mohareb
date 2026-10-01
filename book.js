import { sb, img, esc, num, icon } from './lib.js?v=15';
import { $, $$, params, bar, villagePreview, UNITS, arrowNext, calIcon } from './ui.js?v=15';

const p = params();
const st = { v: p.v || '', o: p.o || '', r: p.r ?? '', step: Number(p.step) || 1 };

const { data: villages } = await sb.from('villages')
  .select('id, name, slug, tagline, description, cover_image, gallery, village_features(features(name, icon, sort_order)), chalets(id, offer_type, rooms, price_night, status)')
  .eq('is_visible', true).order('sort_order').order('created_at');
const V = villages || [];
if (st.v && !V.some((x) => x.id === st.v)) { st.v = ''; st.step = 1; }
if (st.step > 1 && !st.v) st.step = 1;
if (st.step > 2 && !st.o) st.step = 2;

const body = $('#body');
const next = $('#next');

async function render() {
  const back = st.step === 1 ? 'index.html' : null;
  await bar({ back: back || '#', title: 'احجز شاليه', close: 'index.html' });
  const backBtn = $('#bar .bar-btn');
  if (st.step > 1) backBtn.addEventListener('click', (e) => { e.preventDefault(); go(st.step - 1); });

  $$('.steps span').forEach((s, i) => s.classList.toggle('on', i < st.step));
  const village = V.find((x) => x.id === st.v);
  $('#note').textContent = [`الخطوة ${num(st.step)} من ٣`, st.step > 1 && village?.name, st.step > 2 && (st.o === 'rent' ? 'إيجار' : 'بيع')].filter(Boolean).join(' · ');
  const t = $('#title');
  t.classList.remove('am-up'); void t.offsetWidth; t.classList.add('am-up');

  if (st.step === 1) {
    t.textContent = 'اختار القرية';
    body.innerHTML = `<div class="opts am-list" role="radiogroup" aria-label="القرية">${V.map((v) => `
      <div class="opt-row">
        <button type="button" class="opt" role="radio" aria-checked="${v.id === st.v}" data-v="${v.id}">
          <img src="${esc(img(v.cover_image))}" alt="">
          <span class="t"><b>${esc(v.name)}</b><small>${num((v.chalets || []).length)} شاليه متاح</small></span>
          <span class="radio"></span>
        </button>
        <button type="button" class="eye-btn" data-peek="${v.id}" aria-label="معاينة ${esc(v.name)}">${icon('eye')}معاينة</button>
      </div>`).join('') || '<div class="empty">لسه مفيش قرى.</div>'}</div>`;
    next.innerHTML = `التالي ${arrowNext()}`;
    next.disabled = !st.v;
  }

  if (st.step === 2) {
    t.textContent = 'اختار نوع العملية';
    const cs = village?.chalets || [];
    const nRent = cs.filter((c) => c.offer_type === 'rent').length;
    const nSale = cs.filter((c) => c.offer_type === 'sale').length;
    body.innerHTML = `<div class="big-opts am-list" role="radiogroup" aria-label="نوع العملية">
      <button type="button" class="opt big-opt" role="radio" aria-checked="${st.o === 'rent'}" data-o="rent">
        <span class="circle">${calIcon()}</span>
        <span><b>إيجار</b><small>شاليهات بالليلة أو بالأسبوع · ${num(nRent)} متاح</small></span>
        <span class="tick">${icon('check')}</span>
      </button>
      <button type="button" class="opt big-opt" role="radio" aria-checked="${st.o === 'sale'}" data-o="sale">
        <span class="circle">${icon('home')}</span>
        <span><b>بيع</b><small>وحدات للبيع كاش أو تقسيط · ${num(nSale)} متاح</small></span>
        <span class="tick">${icon('check')}</span>
      </button>
    </div>`;
    next.innerHTML = `التالي ${arrowNext()}`;
    next.disabled = !st.o;
  }

  if (st.step === 3) {
    t.textContent = 'اختار نوع الوحدة';
    const cs = (village?.chalets || []).filter((c) => c.offer_type === st.o);
    const count = (r) => cs.filter((c) => (r === 4 ? c.rooms >= 4 : c.rooms === r)).length;
    body.innerHTML = `<div class="opts am-list" role="radiogroup" aria-label="نوع الوحدة">
      <button type="button" class="opt" role="radio" aria-checked="${st.r === 'all'}" data-r="all">
        <span class="unit-badge">${icon('grid')}</span><span class="t"><b>كل الأنواع</b><small>${num(cs.length)} وحدة</small></span><span class="radio"></span>
      </button>
      ${UNITS.map((u) => `
      <button type="button" class="opt" role="radio" aria-checked="${String(st.r) === String(u.rooms)}" data-r="${u.rooms}">
        <span class="unit-badge">${u.n}</span><span class="t"><b>${u.name}</b><small>${u.guests} · ${count(u.rooms) ? `${num(count(u.rooms))} متاح` : 'مفيش دلوقتي'}</small></span><span class="radio"></span>
      </button>`).join('')}
    </div>`;
    next.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg> اعرض النتائج`;
    next.disabled = st.r === '';
  }
}

function go(step) {
  st.step = step;
  const q = new URLSearchParams({ step: String(step) });
  if (st.v) q.set('v', st.v);
  if (st.o) q.set('o', st.o);
  if (st.r !== '') q.set('r', st.r);
  history.replaceState(null, '', `book.html?${q}`);
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

body.addEventListener('click', (e) => {
  const peek = e.target.closest('[data-peek]');
  if (peek) {
    const v = V.find((x) => x.id === peek.dataset.peek);
    villagePreview(v, { onChoose: () => { st.v = v.id; go(2); } });
    return;
  }
  const b = e.target.closest('.opt');
  if (!b) return;
  if (b.dataset.v) { if (st.v !== b.dataset.v) { st.o = ''; st.r = ''; } st.v = b.dataset.v; }
  if (b.dataset.o) { if (st.o !== b.dataset.o) st.r = ''; st.o = b.dataset.o; }
  if (b.dataset.r) st.r = b.dataset.r;
  $$('.opt', body).forEach((x) => x.setAttribute('aria-checked', x === b));
  next.disabled = false;
});

next.addEventListener('click', () => {
  if (st.step < 3) return go(st.step + 1);
  const q = new URLSearchParams({ v: st.v, o: st.o });
  if (st.r !== 'all') q.set('r', st.r);
  location.href = `results.html?${q}`;
});

render();
