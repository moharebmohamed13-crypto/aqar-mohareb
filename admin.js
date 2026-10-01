import { sb, img, esc, num, money, icon, ROOT, STATUS, OFFER } from './lib.js?v=13';

const app = document.getElementById('app');
let session = null;
let isAdmin = false;

// ============ أدوات ============
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const nOrNull = (v) => (v === '' || v == null ? null : Number(v));
const sOrNull = (v) => (v == null || String(v).trim() === '' ? null : String(v).trim());

function toast(msg, err = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), err ? 5000 : 2600);
}
function confirmBox(title, text, yes = 'حذف') {
  const d = $('#confirm');
  $('#confirm-title').textContent = title;
  $('#confirm-text').textContent = text;
  $('#confirm-yes').textContent = yes;
  d.showModal();
  return new Promise((res) => {
    const done = (v) => { d.close(); $('#confirm-yes').onclick = null; $('#confirm-no').onclick = null; res(v); };
    $('#confirm-yes').onclick = () => done(true);
    $('#confirm-no').onclick = () => done(false);
    d.oncancel = () => done(false);
  });
}
function fail(e, msg = 'حصلت مشكلة، جرّب تاني') {
  console.error(e);
  let m = msg;
  if (e?.code === '23505') m = 'فيه عنصر تاني بنفس الكود أو الاسم';
  else if (e?.message?.includes('row-level security')) m = 'مش مسموح — الحساب ده مش أدمن';
  toast(m, true);
}

// ضغط الصورة قبل الرفع (أقصى عرض 1920 بكسل)
async function compress(file, max = 1920) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('نوع الصورة لازم JPG أو PNG أو WebP');
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, 'image/webp', 0.85));
}
async function upload(file, folder) {
  const blob = await compress(file);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const { error } = await sb.storage.from('images').upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000' });
  if (error) throw error;
  return sb.storage.from('images').getPublicUrl(path).data.publicUrl;
}

// مدير الصور: أول صورة = الغلاف (أو صورة "حالية" في الإعدادات)
function imageManager(el, { images = [], folder, current = null, currentLabel = 'الغلاف', pickMode = false }) {
  let list = [...images];
  let cur = current ?? list[0] ?? null;
  const draw = () => {
    if (!pickMode) cur = list[0] ?? null;
    el.innerHTML = `
      <div class="imgs">${list.map((u, i) => `
        <div class="it ${u === cur ? 'current' : ''}">
          <img src="${esc(img(u))}" alt="">
          ${u === cur ? `<span class="cover-tag">${currentLabel}</span>` : ''}
          <div class="tools">
            ${u !== cur ? `<button type="button" data-cover="${i}" title="اجعلها ${currentLabel}" aria-label="اجعلها ${currentLabel}">★</button>` : ''}
            <button type="button" data-del="${i}" title="حذف" aria-label="حذف الصورة">✕</button>
          </div>
        </div>`).join('')}</div>
      <label class="drop">
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden>
        ${icon('image')}<span>اسحب الصور هنا أو اضغط للرفع</span>
        <small>${pickMode ? 'اضغط ★ على الصورة اللي عايزها تظهر' : 'أول صورة بتبقى الغلاف · اضغط ★ عشان تغيّر الغلاف'}</small>
      </label>`;
    const input = $('input', el);
    const drop = $('.drop', el);
    input.onchange = () => add([...input.files]);
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('drag'); };
    drop.ondragleave = () => drop.classList.remove('drag');
    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('drag'); add([...e.dataTransfer.files]); };
  };
  el.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cover]');
    const d = e.target.closest('[data-del]');
    if (c) {
      const i = Number(c.dataset.cover);
      if (pickMode) cur = list[i];
      else list.unshift(list.splice(i, 1)[0]);
      draw();
    }
    if (d) {
      const i = Number(d.dataset.del);
      const [removed] = list.splice(i, 1);
      if (removed === cur) cur = list[0] ?? null;
      draw();
    }
  });
  async function add(files) {
    if (!files.length) return;
    const drop = $('.drop span', el);
    for (const [i, f] of files.entries()) {
      drop.textContent = `بيرفع صورة ${i + 1} من ${files.length}...`;
      try { list.push(await upload(f, folder)); if (!cur) cur = list[0]; }
      catch (e) { fail(e, e.message?.startsWith('نوع') ? e.message : 'الصورة ماترفعتش'); }
    }
    draw();
  }
  draw();
  return { get list() { return list; }, get current() { return cur; } };
}

// ============ الهيكل ============
const NAV = [
  ['requests', '#/requests', 'طلبات الحجز', 'users'],
  ['calendar', '#/calendar', 'تقويم الحجوزات', 'grid'],
  ['villages', '#/villages', 'القرى', 'lagoon'],
  ['chalets', '#/chalets', 'الشاليهات', 'roof'],
  ['settings', '#/settings', 'إعدادات الموقع', 'star'],
];
let pendingCount = 0;
async function refreshPending() {
  const { count } = await sb.from('booking_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending');
  pendingCount = count || 0;
  const b = document.getElementById('pending-badge');
  if (b) { b.textContent = pendingCount; b.hidden = !pendingCount; }
}
function shell(active, inner) {
  app.innerHTML = `
  <div class="mobile-top">
    <a class="brand" href="#/chalets"><img src="${ROOT}logo-icon.png" alt=""><span class="brand-name">لوحة التحكم</span></a>
    <button class="menu-btn" style="display:inline-flex" type="button" aria-label="القائمة" id="open-side">${icon('menu')}</button>
  </div>
  <div class="admin-shell">
    <aside class="side" id="side">
      <a class="brand" href="#/chalets"><img src="${ROOT}logo-icon.png" alt=""><span><span class="brand-name">عقار محارب</span><small>لوحة التحكم</small></span></a>
      <nav aria-label="قائمة الأدمن">
        ${NAV.map(([k, h, t, ic]) => `<a href="${h}" class="${k === active ? 'active' : ''}">${icon(ic)}${t}${k === 'requests' ? `<span id="pending-badge" class="nav-badge" ${pendingCount ? '' : 'hidden'}>${pendingCount}</span>` : ''}</a>`).join('')}
        <a href="${ROOT}index.html" target="_blank" rel="noopener">${icon('eye')}عرض الموقع</a>
      </nav>
      <div class="side-foot">
        <div style="margin-bottom:10px">${esc(session?.user?.email || '')}</div>
        <button class="linklike" type="button" id="logout" style="padding:0">${icon('arrow')} تسجيل الخروج</button>
      </div>
    </aside>
    <main class="admin-main" id="main">${inner}</main>
  </div>`;
  $('#logout').onclick = async () => { await sb.auth.signOut(); };
  $('#open-side').onclick = () => $('#side').classList.toggle('open');
  $$('#side nav a').forEach((a) => a.addEventListener('click', () => $('#side').classList.remove('open')));
  refreshPending();
  return $('#main');
}

// ============ تسجيل الدخول ============
function loginView(msg = '') {
  app.innerHTML = `
  <div class="login">
    <form id="login">
      <div class="brand" style="justify-content:center"><img src="${ROOT}logo-icon.png" alt="" style="filter:none"><span><span class="brand-name">عقار محارب</span><span class="brand-latin" style="color:var(--gold-dark)">لوحة التحكم</span></span></div>
      ${msg ? `<div class="error-box">${esc(msg)}</div>` : ''}
      <label class="field">الإيميل<input type="email" name="email" autocomplete="username" required dir="ltr"></label>
      <label class="field">الباسوورد<input type="password" name="password" autocomplete="current-password" required dir="ltr"></label>
      <button class="btn btn-gold btn-block" type="submit">دخول</button>
      <a href="${ROOT}index.html" class="muted" style="text-align:center">الرجوع للموقع</a>
    </form>
  </div>`;
  $('#login').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    f.classList.add('busy');
    const { error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
    f.classList.remove('busy');
    if (error) loginView('الإيميل أو الباسوورد غلط');
  };
}

// ============ الشاليهات ============
async function chaletsList() {
  const main = shell('chalets', '<div class="skeleton"></div>');
  const [{ data: chalets, error }, { data: villages }] = await Promise.all([
    sb.from('chalets').select('*, villages(name)').order('created_at', { ascending: false }),
    sb.from('villages').select('id, name').order('sort_order'),
  ]);
  if (error) return fail(error);
  const f = { q: '', village: '', type: '', status: '' };
  main.innerHTML = `
    <div class="admin-top">
      <div><h1>الشاليهات</h1><p>كل شاليه بتضيفه هنا بيظهر في صفحة القرية بتاعته</p></div>
      <a class="btn btn-gold" href="#/chalets/new">+ إضافة شاليه</a>
    </div>
    <div class="stats">
      <div><span>كل الشاليهات</span><b>${num(chalets.length)}</b></div>
      <div><span>معروض للبيع</span><b>${num(chalets.filter((c) => c.offer_type === 'sale').length)}</b></div>
      <div><span>معروض للإيجار</span><b>${num(chalets.filter((c) => c.offer_type === 'rent').length)}</b></div>
      <div><span>مخفي من الموقع</span><b>${num(chalets.filter((c) => !c.is_visible).length)}</b></div>
    </div>
    <div class="table-wrap">
      <div class="filters">
        <input type="search" placeholder="ابحث بالكود أو العنوان" aria-label="بحث" data-f="q">
        <select data-f="village" aria-label="القرية"><option value="">كل القرى</option>${(villages || []).map((v) => `<option value="${v.id}">${esc(v.name)}</option>`).join('')}</select>
        <select data-f="type" aria-label="نوع العرض"><option value="">بيع وإيجار</option><option value="sale">بيع</option><option value="rent">إيجار</option></select>
        <select data-f="status" aria-label="الحالة"><option value="">كل الحالات</option><option value="available">متاح</option><option value="reserved">محجوز</option><option value="sold">تم البيع</option></select>
      </div>
      <table><thead><tr><th>الشاليه</th><th class="hide-sm">القرية</th><th>العرض</th><th class="hide-sm">السعر</th><th>الحالة</th><th>ظاهر</th><th style="text-align:left">إجراءات</th></tr></thead><tbody id="rows"></tbody></table>
    </div>`;
  const rows = $('#rows', main);
  const draw = () => {
    const q = f.q.toLowerCase();
    const list = chalets.filter((c) =>
      (!q || c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)) &&
      (!f.village || c.village_id === f.village) && (!f.type || c.offer_type === f.type) && (!f.status || c.status === f.status));
    rows.innerHTML = list.length ? list.map((c) => {
      const st = STATUS[c.status];
      return `<tr data-id="${c.id}">
        <td><div class="row-title">${c.cover_image ? `<img class="thumb" src="${esc(img(c.cover_image))}" alt="">` : '<span class="thumb"></span>'}<div><b>${esc(c.title)}</b><small>${esc(c.code)}</small></div></div></td>
        <td class="hide-sm">${esc(c.villages?.name || '')}</td>
        <td><span class="badge ${c.offer_type === 'rent' ? 'badge-gold' : 'badge-dark'}">${c.offer_type === 'rent' ? 'إيجار' : 'بيع'}</span></td>
        <td class="hide-sm">${c.offer_type === 'rent' ? `${money(c.price_night)} / ليلة` : money(c.price_total)}</td>
        <td><span class="badge ${st.cls}">${st.label}</span></td>
        <td><label class="switch"><span class="sr-only">ظاهر في الموقع</span><input type="checkbox" data-vis ${c.is_visible ? 'checked' : ''}></label></td>
        <td><div class="acts">
          <a class="icon-btn" href="#/chalets/${c.id}" aria-label="تعديل" title="تعديل"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg></a>
          <a class="icon-btn" href="${ROOT}chalet.html?id=${c.id}" target="_blank" rel="noopener" aria-label="معاينة" title="معاينة">${icon('eye')}</a>
          <button class="icon-btn danger" type="button" data-del aria-label="حذف" title="حذف"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button>
        </div></td></tr>`;
    }).join('') : `<tr><td colspan="7"><div class="empty" style="border:0">${chalets.length ? 'مفيش نتائج بالفلاتر دي' : 'لسه مفيش شاليهات — دوس «إضافة شاليه»'}</div></td></tr>`;
  };
  $$('[data-f]', main).forEach((el) => el.addEventListener('input', () => { f[el.dataset.f] = el.value; draw(); }));
  rows.addEventListener('change', async (e) => {
    if (!e.target.matches('[data-vis]')) return;
    const id = e.target.closest('tr').dataset.id;
    const { error } = await sb.from('chalets').update({ is_visible: e.target.checked }).eq('id', id);
    if (error) { e.target.checked = !e.target.checked; return fail(error); }
    chalets.find((c) => c.id === id).is_visible = e.target.checked;
    toast(e.target.checked ? 'الشاليه ظاهر في الموقع' : 'الشاليه اتخفى من الموقع');
  });
  rows.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-del]')) return;
    const id = e.target.closest('tr').dataset.id;
    const c = chalets.find((x) => x.id === id);
    if (!(await confirmBox('حذف الشاليه؟', `هيتمسح «${c.title} – ${c.code}» نهائيًا. لو عايز تخفيه بس، اقفل «ظاهر».`))) return;
    const { error } = await sb.from('chalets').delete().eq('id', id);
    if (error) return fail(error);
    chalets.splice(chalets.indexOf(c), 1);
    draw(); toast('اتمسح الشاليه');
  });
  draw();
}

const FLOORS = ['أرضي', 'أرضي بجاردن', 'أول', 'تاني', 'تالت', 'روف'];
const VIEWS = ['بحر', 'لاجون', 'حمام سباحة', 'جاردن'];
const opt = (list, val) => {
  const all = val && !list.includes(val) ? [...list, val] : list;
  return all.map((x) => `<option ${x === val ? 'selected' : ''}>${esc(x)}</option>`).join('');
};

async function chaletForm(id) {
  const main = shell('chalets', '<div class="skeleton"></div>');
  const [{ data: villages }, { data: feats }, res] = await Promise.all([
    sb.from('villages').select('id, name').order('sort_order'),
    sb.from('features').select('*').eq('scope', 'chalet').order('sort_order'),
    id ? sb.from('chalets').select('*, chalet_features(feature_id)').eq('id', id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const c = res.data || { offer_type: 'rent', status: 'available', is_visible: true, gallery: [], chalet_features: [] };
  if (id && !res.data) { main.innerHTML = '<div class="empty">الشاليه ده مش موجود</div>'; return; }
  if (!villages?.length) { main.innerHTML = '<div class="empty">لازم تضيف قرية الأول. <a href="#/villages/new">إضافة قرية</a></div>'; return; }
  const has = new Set((c.chalet_features || []).map((x) => x.feature_id));
  const v = (k) => esc(c[k] ?? '');

  main.innerHTML = `
  <form id="f" novalidate>
    <div class="admin-top">
      <div><a href="#/chalets" class="muted">الشاليهات /</a><h1>${id ? `تعديل شاليه ${esc(c.code)}` : 'إضافة شاليه جديد'}</h1></div>
    </div>
    <div class="form-cols">
      <div class="col-main">
        <section class="box"><h2>البيانات الأساسية</h2>
          <div class="g2">
            <label class="field">القرية *<select name="village_id" required><option value="">اختار القرية</option>${villages.map((x) => `<option value="${x.id}" ${x.id === c.village_id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
            <label class="field">كود الشاليه *<input name="code" required placeholder="مثال: A-12" value="${v('code')}" dir="ltr" style="text-align:right"></label>
          </div>
          <label class="field">عنوان الشاليه في الموقع *<input name="title" required placeholder="مثال: شاليه غرفتين · أرضي بجاردن" value="${v('title')}"></label>
          <div class="field"><span>نوع العرض</span>
            <div class="radio-cards">
              <label><input type="radio" name="offer_type" value="rent" ${c.offer_type === 'rent' ? 'checked' : ''}> للإيجار</label>
              <label><input type="radio" name="offer_type" value="sale" ${c.offer_type === 'sale' ? 'checked' : ''}> للبيع</label>
            </div>
          </div>
        </section>
        <section class="box"><h2>التقسيم والمواصفات</h2>
          <div class="g3">
            <label class="field">عدد الغرف<input type="number" min="0" name="rooms" value="${v('rooms')}"></label>
            <label class="field">عدد الحمامات<input type="number" min="0" name="bathrooms" value="${v('bathrooms')}"></label>
            <label class="field">المساحة (م²)<input type="number" min="1" name="area_m2" value="${v('area_m2')}"></label>
            <label class="field">الدور<select name="floor"><option value="">—</option>${opt(FLOORS, c.floor)}</select></label>
            <label class="field">الفيو<select name="view"><option value="">—</option>${opt(VIEWS, c.view)}</select></label>
            <label class="field">أقصى عدد أفراد<input type="number" min="1" name="max_guests" value="${v('max_guests')}"></label>
          </div>
        </section>
        <section class="box"><h2>السعر</h2>
          <div data-for="rent">
            <div class="g2">
              <label class="field">سعر الليلة – أيام الأسبوع (ج.م)<input type="number" min="0" name="price_night" value="${v('price_night')}"></label>
              <label class="field">سعر ليلة الخميس والجمعة (ج.م)<input type="number" min="0" name="weekend_price" value="${v('weekend_price')}" placeholder="لو فاضي = نفس السعر العادي"></label>
              <label class="field">هاوس كيبنج (ج.م) – مرة واحدة للحجز<input type="number" min="0" name="housekeeping_fee" value="${v('housekeeping_fee')}" placeholder="اختياري"></label>
              <label class="field">التأمين المسترد (ج.م)<input type="number" min="0" name="security_deposit" value="${v('security_deposit')}" placeholder="اختياري"></label>
              <label class="field">سعر الأسبوع (ج.م) – اختياري<input type="number" min="0" name="price_week" value="${v('price_week')}"></label>
            </div>
            <p class="hint" style="margin:8px 0 0">ليلة الخميس والجمعة بتتحسب تلقائي بالسعر بتاعها. الهاوس كيبنج بيتضاف على إجمالي الحجز، والتأمين بيظهر للعميل إنه مسترد لو مفيش تلف.</p>
          </div>
          <div class="g3" data-for="sale">
            <label class="field">السعر الإجمالي (ج.م)<input type="number" min="0" name="price_total" value="${v('price_total')}"></label>
            <label class="field">المقدم (ج.م)<input type="number" min="0" name="down_payment" value="${v('down_payment')}"></label>
            <label class="field">مدة التقسيط<input name="installment_period" placeholder="مثال: ٥ سنين أو كاش" value="${v('installment_period')}"></label>
          </div>
        </section>
        <section class="box"><h2>مميزات الشاليه</h2>
          <div class="checks">${(feats || []).map((x) => `<label><input type="checkbox" name="feat" value="${x.id}" ${has.has(x.id) ? 'checked' : ''}>${esc(x.name)}</label>`).join('')}</div>
        </section>
        <section class="box"><label class="field" style="font-size:18px;font-weight:700">وصف الشاليه<textarea name="description" rows="5" placeholder="التشطيب، الفرش، القرب من البحر أو اللاجون...">${v('description')}</textarea></label></section>
      </div>
      <div class="col-side">
        <section class="box"><h2>النشر</h2>
          <label class="field">الحالة<select name="status">${Object.entries(STATUS).map(([k, s]) => `<option value="${k}" ${k === c.status ? 'selected' : ''}>${s.label}</option>`).join('')}</select></label>
          <label class="switch"><span>ظاهر في الموقع<small>اقفله لو عايز تخفيه مؤقتًا</small></span><input type="checkbox" name="is_visible" ${c.is_visible ? 'checked' : ''}></label>
          <button class="btn btn-gold btn-block" type="submit">حفظ الشاليه</button>
          <a class="btn btn-outline btn-block" href="#/chalets">إلغاء</a>
        </section>
        <section class="box"><h2>الصور</h2><div id="imgs"></div></section>
      </div>
    </div>
  </form>`;
  const form = $('#f', main);
  const imgs = imageManager($('#imgs', main), { images: [c.cover_image, ...(c.gallery || [])].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i), folder: 'chalets' });
  const syncOffer = () => {
    const t = form.offer_type.value;
    $$('[data-for]', form).forEach((el) => { el.hidden = el.dataset.for !== t; });
  };
  $$('[name="offer_type"]', form).forEach((r) => r.addEventListener('change', syncOffer));
  syncOffer();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    if (!fd.get('village_id') || !sOrNull(fd.get('code')) || !sOrNull(fd.get('title'))) return toast('كمّل القرية والكود والعنوان', true);
    const rent = fd.get('offer_type') === 'rent';
    const list = imgs.list;
    const row = {
      village_id: fd.get('village_id'),
      code: sOrNull(fd.get('code')),
      title: sOrNull(fd.get('title')),
      offer_type: fd.get('offer_type'),
      rooms: nOrNull(fd.get('rooms')),
      bathrooms: nOrNull(fd.get('bathrooms')),
      area_m2: nOrNull(fd.get('area_m2')),
      floor: sOrNull(fd.get('floor')),
      view: sOrNull(fd.get('view')),
      max_guests: nOrNull(fd.get('max_guests')),
      price_night: rent ? nOrNull(fd.get('price_night')) : null,
      price_week: rent ? nOrNull(fd.get('price_week')) : null,
      weekend_price: rent ? nOrNull(fd.get('weekend_price')) : null,
      housekeeping_fee: rent ? nOrNull(fd.get('housekeeping_fee')) : null,
      security_deposit: rent ? nOrNull(fd.get('security_deposit')) : null,
      price_total: rent ? null : nOrNull(fd.get('price_total')),
      down_payment: rent ? null : nOrNull(fd.get('down_payment')),
      installment_period: rent ? null : sOrNull(fd.get('installment_period')),
      description: sOrNull(fd.get('description')),
      status: fd.get('status'),
      is_visible: form.is_visible.checked,
      cover_image: list[0] || null,
      gallery: list,
    };
    form.classList.add('busy');
    try {
      let cid = id;
      if (id) { const { error } = await sb.from('chalets').update(row).eq('id', id); if (error) throw error; }
      else { const { data, error } = await sb.from('chalets').insert(row).select('id').single(); if (error) throw error; cid = data.id; }
      const chosen = fd.getAll('feat');
      const { error: d } = await sb.from('chalet_features').delete().eq('chalet_id', cid); if (d) throw d;
      if (chosen.length) { const { error: i } = await sb.from('chalet_features').insert(chosen.map((f) => ({ chalet_id: cid, feature_id: f }))); if (i) throw i; }
      toast('اتحفظ الشاليه ✓');
      location.hash = '#/chalets';
    } catch (err) { fail(err); } finally { form.classList.remove('busy'); }
  };
}

// ============ القرى ============
async function villagesList() {
  const main = shell('villages', '<div class="skeleton"></div>');
  const { data: villages, error } = await sb.from('villages').select('*, chalets(id)').order('sort_order').order('created_at');
  if (error) return fail(error);
  main.innerHTML = `
    <div class="admin-top"><div><h1>القرى</h1><p>كل قرية بتظهر ككارت في الصفحة الرئيسية بالترتيب ده</p></div><a class="btn btn-gold" href="#/villages/new">+ إضافة قرية</a></div>
    <div class="table-wrap"><table><thead><tr><th>القرية</th><th class="hide-sm">الترتيب</th><th>الشاليهات</th><th>ظاهرة</th><th style="text-align:left">إجراءات</th></tr></thead><tbody id="rows">
    ${villages.length ? villages.map((v) => `<tr data-id="${v.id}">
      <td><div class="row-title">${v.cover_image ? `<img class="thumb" src="${esc(img(v.cover_image))}" alt="">` : '<span class="thumb"></span>'}<div><b>${esc(v.name)}</b><small style="font-family:inherit;direction:rtl">${esc(v.tagline || '')}</small></div></div></td>
      <td class="hide-sm">${num(v.sort_order)}</td>
      <td>${num(v.chalets?.length || 0)}</td>
      <td><label class="switch"><span class="sr-only">ظاهرة في الموقع</span><input type="checkbox" data-vis ${v.is_visible ? 'checked' : ''}></label></td>
      <td><div class="acts">
        <a class="icon-btn" href="#/villages/${v.id}" aria-label="تعديل" title="تعديل"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg></a>
        <a class="icon-btn" href="${ROOT}village.html?v=${encodeURIComponent(v.slug || v.id)}" target="_blank" rel="noopener" aria-label="معاينة" title="معاينة">${icon('eye')}</a>
        <button class="icon-btn danger" type="button" data-del aria-label="حذف" title="حذف"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button>
      </div></td></tr>`).join('') : '<tr><td colspan="5"><div class="empty" style="border:0">لسه مفيش قرى — دوس «إضافة قرية»</div></td></tr>'}
    </tbody></table></div>`;
  const rows = $('#rows', main);
  rows.addEventListener('change', async (e) => {
    if (!e.target.matches('[data-vis]')) return;
    const id = e.target.closest('tr').dataset.id;
    const { error: er } = await sb.from('villages').update({ is_visible: e.target.checked }).eq('id', id);
    if (er) { e.target.checked = !e.target.checked; return fail(er); }
    toast(e.target.checked ? 'القرية ظاهرة في الموقع' : 'القرية وشاليهاتها اتخفوا من الموقع');
  });
  rows.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-del]')) return;
    const id = e.target.closest('tr').dataset.id;
    const v = villages.find((x) => x.id === id);
    if (!(await confirmBox('حذف القرية؟', `هتتمسح «${v.name}» ومعاها ${v.chalets?.length || 0} شاليه نهائيًا. لو عايز تخفيها بس، اقفل «ظاهرة».`))) return;
    const { error: er } = await sb.from('villages').delete().eq('id', id);
    if (er) return fail(er);
    toast('اتمسحت القرية'); villagesList();
  });
}

const slugify = (s) => {
  const latin = String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
  return latin || `v-${Math.random().toString(36).slice(2, 8)}`;
};

async function villageForm(id) {
  const main = shell('villages', '<div class="skeleton"></div>');
  const [{ data: feats }, res] = await Promise.all([
    sb.from('features').select('*').eq('scope', 'village').order('sort_order'),
    id ? sb.from('villages').select('*, village_features(feature_id)').eq('id', id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (id && !res.data) { main.innerHTML = '<div class="empty">القرية دي مش موجودة</div>'; return; }
  const v = res.data || { is_visible: true, sort_order: 0, gallery: [], village_features: [] };
  const has = new Set((v.village_features || []).map((x) => x.feature_id));
  const val = (k) => esc(v[k] ?? '');
  const features = [...(feats || [])];

  main.innerHTML = `
  <form id="f" novalidate>
    <div class="admin-top"><div><a href="#/villages" class="muted">القرى /</a><h1>${id ? `تعديل ${esc(v.name)}` : 'إضافة قرية جديدة'}</h1></div></div>
    <div class="form-cols">
      <div class="col-main">
        <section class="box"><h2>بيانات القرية</h2>
          <div class="g2">
            <label class="field">اسم القرية *<input name="name" required value="${val('name')}" placeholder="مثال: لا هاسيندا"></label>
            <label class="field">سطر تعريفي قصير<input name="tagline" value="${val('tagline')}" placeholder="مثال: على البحر مباشرة"></label>
          </div>
          <label class="field">نبذة عن القرية<textarea name="description" rows="5" placeholder="طبيعة المكان، الشاطئ، الخدمات، ولمين مناسبة...">${val('description')}</textarea></label>
          <div class="g2">
            <label class="field">رابط خرائط جوجل<input type="url" name="map_url" value="${val('map_url')}" dir="ltr" placeholder="https://maps.google.com/..."></label>
            <label class="field">رابط الصفحة (بالإنجليزي – اختياري)<input name="slug" value="${val('slug')}" dir="ltr" placeholder="la-hacienda"></label>
          </div>
        </section>
        <section class="box"><h2>مميزات القرية</h2><p class="hint">اختار اللي موجود في القرية دي بس، وهيظهر في صفحتها بأيقونات</p>
          <div class="checks" id="feats">${features.map((x) => `<label><input type="checkbox" name="feat" value="${x.id}" ${has.has(x.id) ? 'checked' : ''}>${esc(x.name)}</label>`).join('')}</div>
          <div style="display:flex;gap:10px;align-items:flex-end">
            <label class="field">ميزة مش في القائمة؟<input id="newfeat" placeholder="مثال: ممشى على البحر"></label>
            <button class="btn btn-outline" type="button" id="addfeat" style="min-height:46px">+ إضافة</button>
          </div>
        </section>
      </div>
      <div class="col-side">
        <section class="box"><h2>النشر</h2>
          <label class="field">ترتيب الظهور في الرئيسية<input type="number" name="sort_order" value="${val('sort_order')}"></label>
          <label class="switch"><span>ظاهرة في الموقع<small>القرية وكل شاليهاتها</small></span><input type="checkbox" name="is_visible" ${v.is_visible ? 'checked' : ''}></label>
          <button class="btn btn-gold btn-block" type="submit">حفظ القرية</button>
          <a class="btn btn-outline btn-block" href="#/villages">إلغاء</a>
        </section>
        <section class="box"><h2>الصور</h2><p class="hint">أول صورة بتظهر في كارت القرية في الرئيسية</p><div id="imgs"></div></section>
      </div>
    </div>
  </form>`;
  const form = $('#f', main);
  const imgs = imageManager($('#imgs', main), { images: [v.cover_image, ...(v.gallery || [])].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i), folder: 'villages' });
  $('#addfeat', main).onclick = async () => {
    const name = sOrNull($('#newfeat', main).value);
    if (!name) return;
    const { data, error } = await sb.from('features').insert({ name, scope: 'village', icon: 'star', sort_order: features.length + 1 }).select().single();
    if (error) return fail(error);
    features.push(data);
    $('#feats', main).insertAdjacentHTML('beforeend', `<label><input type="checkbox" name="feat" value="${data.id}" checked>${esc(data.name)}</label>`);
    $('#newfeat', main).value = '';
    toast('اتضافت الميزة');
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = sOrNull(fd.get('name'));
    if (!name) return toast('اكتب اسم القرية', true);
    const list = imgs.list;
    const row = {
      name,
      tagline: sOrNull(fd.get('tagline')),
      description: sOrNull(fd.get('description')),
      map_url: sOrNull(fd.get('map_url')),
      slug: sOrNull(fd.get('slug')) ? slugify(fd.get('slug')) : (v.slug || slugify(name)),
      sort_order: nOrNull(fd.get('sort_order')) ?? 0,
      is_visible: form.is_visible.checked,
      cover_image: list[0] || null,
      gallery: list,
    };
    form.classList.add('busy');
    try {
      let vid = id;
      if (id) { const { error } = await sb.from('villages').update(row).eq('id', id); if (error) throw error; }
      else { const { data, error } = await sb.from('villages').insert(row).select('id').single(); if (error) throw error; vid = data.id; }
      const chosen = fd.getAll('feat');
      const { error: d } = await sb.from('village_features').delete().eq('village_id', vid); if (d) throw d;
      if (chosen.length) { const { error: i } = await sb.from('village_features').insert(chosen.map((f) => ({ village_id: vid, feature_id: f }))); if (i) throw i; }
      toast('اتحفظت القرية ✓');
      location.hash = '#/villages';
    } catch (err) { fail(err); } finally { form.classList.remove('busy'); }
  };
}

// ============ إعدادات الموقع ============
async function settingsView() {
  const main = shell('settings', '<div class="skeleton"></div>');
  const { data: s, error } = await sb.from('site_settings').select('*').eq('id', 1).single();
  if (error) return fail(error);
  const val = (k) => esc(s[k] ?? '');
  main.innerHTML = `
  <form id="f">
    <div class="admin-top"><div><h1>إعدادات الموقع</h1><p>أي تعديل هنا بيظهر في الموقع أول ما تضغط حفظ</p></div><button class="btn btn-gold" type="submit">حفظ التغييرات</button></div>
    <div style="display:flex;flex-direction:column;gap:20px">
      <section class="box"><h2>واجهة الصفحة الرئيسية</h2><p class="hint">الصورة والكلام اللي العميل بيشوفهم أول ما يفتح الموقع</p>
        <div class="form-cols">
          <div class="col-main"><div id="imgs"></div></div>
          <div class="col-main">
            <label class="field">العنوان الرئيسي<input name="hero_title" value="${val('hero_title')}"></label>
            <label class="field">النص تحت العنوان<textarea name="hero_subtitle" rows="3">${val('hero_subtitle')}</textarea></label>
          </div>
        </div>
      </section>
      <section class="box"><h2>بيانات التواصل</h2>
        <div class="g3">
          <label class="field">رقم التليفون<input type="tel" name="phone" value="${val('phone')}" dir="ltr" style="text-align:right" placeholder="01xxxxxxxxx"></label>
          <label class="field">رقم الواتساب<input type="tel" name="whatsapp" value="${val('whatsapp')}" dir="ltr" style="text-align:right" placeholder="01xxxxxxxxx"></label>
          <label class="field">عنوان المكتب<input name="address" value="${val('address')}"></label>
        </div>
        <label class="field">رسالة الواتساب الجاهزة<input name="whatsapp_message" value="${val('whatsapp_message')}"></label>
        <p class="hint" style="margin:0">{code} بيتبدل بكود الشاليه، و{village} باسم القرية.</p>
      </section>
      <section class="box"><h2>السوشيال ميديا</h2>
        <p class="hint" style="margin:0">حط لينك كل حساب كامل (بيبدأ بـ https://) — اللي تسيبه فاضي مش هيظهر في الموقع.</p>
        <div class="g3">
          <label class="field">فيسبوك<input type="url" name="facebook" value="${val('facebook')}" dir="ltr" placeholder="https://facebook.com/..."></label>
          <label class="field">إنستجرام<input type="url" name="instagram" value="${val('instagram')}" dir="ltr" placeholder="https://instagram.com/..."></label>
          <label class="field">تيك توك<input type="url" name="tiktok" value="${val('tiktok')}" dir="ltr" placeholder="https://tiktok.com/@..."></label>
        </div>
      </section>
    </div>
  </form>`;
  const heroList = [...new Set([s.hero_image, ...(s.hero_images || [])].filter(Boolean))];
  const imgs = imageManager($('#imgs', main), { images: heroList, folder: 'hero', current: s.hero_image, currentLabel: 'ظاهرة الآن', pickMode: true });
  const form = $('#f', main);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const row = { hero_image: imgs.current, hero_images: imgs.list };
    ['hero_title', 'hero_subtitle', 'phone', 'whatsapp', 'address', 'whatsapp_message', 'facebook', 'instagram', 'tiktok'].forEach((k) => { row[k] = sOrNull(fd.get(k)); });
    form.classList.add('busy');
    const { error: er } = await sb.from('site_settings').update(row).eq('id', 1);
    form.classList.remove('busy');
    if (er) return fail(er);
    toast('اتحفظت الإعدادات ✓');
  };
}


// ============ طلبات الحجز ============
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const dstr = (s) => { if (!s) return ''; const [y, m, d] = s.split('-').map(Number); return `${num(d)} ${MONTHS_AR[m - 1]}`; };
const nights = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const waNum = (n) => { let d = String(n || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '2' + d; return d; };
const RS = { pending: ['جديد', 'badge-warn'], accepted: ['مقبول', 'badge-ok'], rejected: ['مرفوض', 'badge-off'] };

async function requestsView() {
  const main = shell('requests', '<div class="skeleton"></div>');
  let filter = 'pending';
  const load = async () => {
    const { data, error } = await sb.from('booking_requests').select('*, chalets(code, title, villages(name))').order('created_at', { ascending: false }).limit(300);
    if (error) { fail(error); return []; }
    return data;
  };
  let rows = await load();
  const draw = () => {
    const list = filter === 'all' ? rows : rows.filter((r) => r.status === filter);
    const c = (k) => rows.filter((r) => k === 'all' || r.status === k).length;
    main.innerHTML = `
      <div class="admin-top"><div><h1>طلبات الحجز</h1><p>لما تقبل طلب إيجار، أيامه بتتقفل في التقويم تلقائي</p></div></div>
      <div class="tabs" role="tablist" style="margin-bottom:16px;max-width:560px">
        ${[['pending', 'جديدة'], ['accepted', 'مقبولة'], ['rejected', 'مرفوضة'], ['all', 'الكل']].map(([k, t]) => `<button role="tab" type="button" data-f="${k}" aria-selected="${filter === k}">${t} (${num(c(k))})</button>`).join('')}
      </div>
      <div class="req-grid">${list.length ? list.map((r) => {
        const [lbl, cls] = RS[r.status];
        const n = r.check_in ? nights(r.check_in, r.check_out) : 0;
        return `<article class="box req" data-id="${r.id}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:17px">${esc(r.name)}</b><span class="badge ${cls}">${lbl}</span></div>
          <div class="muted" style="font-size:13px">#${r.id} · ${new Date(r.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a class="btn btn-outline" style="min-height:40px;padding:0 12px;font-size:14px" href="tel:${esc(r.phone)}" dir="ltr">${icon('phone')} ${esc(r.phone)}</a>
            <a class="btn btn-outline" style="min-height:40px;padding:0 12px;font-size:14px" href="https://wa.me/${waNum(r.phone)}" target="_blank" rel="noopener">${icon('whatsapp')} واتساب</a>
          </div>
          <div class="rows-mini">
            <div><span>الشاليه</span><b>${esc(r.chalets?.code || '')} · ${esc(r.chalets?.villages?.name || '')}</b></div>
            <div><span>النوع</span><b>${r.kind === 'rent' ? 'حجز إيجار' : 'طلب معاينة (بيع)'}</b></div>
            ${r.kind === 'rent' ? `<div><span>التواريخ</span><b>${dstr(r.check_in)} ← ${dstr(r.check_out)} · ${num(n)} ليالي</b></div>
            <div><span>الأفراد</span><b>${num(r.guests || 0)}</b></div>
            <div><span>الإجمالي${r.housekeeping ? ' (شامل هاوس كيبنج)' : ''}</span><b>${money(r.total)}</b></div>
            ${r.deposit ? `<div><span>تأمين مسترد</span><b>${money(r.deposit)}</b></div>` : ''}` : ''}
            ${r.notes ? `<div><span>ملاحظات</span><b style="font-weight:400">${esc(r.notes)}</b></div>` : ''}
          </div>
          ${r.status === 'pending' ? `<div style="display:flex;gap:8px"><button class="btn btn-dark" style="flex:1;background:#2F5A3A" type="button" data-acc>${r.kind === 'rent' ? 'قبول وقفل الأيام' : 'قبول'}</button><button class="btn btn-outline" type="button" data-rej>رفض</button></div>`
            : r.status === 'accepted' ? `<button class="btn btn-outline" type="button" data-rej>إلغاء الحجز</button>` : ''}
        </article>`;
      }).join('') : '<div class="empty">مفيش طلبات هنا</div>'}</div>`;
  };
  main.addEventListener('click', async (e) => {
    const f = e.target.closest('[data-f]');
    if (f) { filter = f.dataset.f; draw(); return; }
    const card = e.target.closest('[data-id]');
    if (!card) return;
    const id = Number(card.dataset.id);
    if (e.target.closest('[data-acc]')) {
      card.classList.add('busy');
      const { error } = await sb.rpc('accept_request', { p_id: id });
      if (error) { card.classList.remove('busy'); return fail(error, error.message.includes('dates_conflict') ? 'الأيام دي فيها حجز تاني — مينفعش تتقبل' : 'حصلت مشكلة'); }
      toast('اتقبل الطلب ✓');
    } else if (e.target.closest('[data-rej]')) {
      if (!(await confirmBox('رفض / إلغاء الطلب؟', 'لو الطلب كان مقبول، أيامه هترجع متاحة في التقويم.', 'تأكيد'))) return;
      card.classList.add('busy');
      const { error } = await sb.rpc('reject_request', { p_id: id });
      if (error) { card.classList.remove('busy'); return fail(error); }
      toast('اتحدث الطلب');
    } else return;
    rows = await load(); draw(); refreshPending();
  });
  draw();
}

// ============ تقويم الحجوزات ============
async function calendarView() {
  const main = shell('calendar', '<div class="skeleton"></div>');
  const { data: chalets, error } = await sb.from('chalets').select('id, code, title, offer_type, villages(name)').eq('offer_type', 'rent').order('code');
  if (error) return fail(error);
  if (!chalets.length) { main.innerHTML = '<div class="empty">مفيش شاليهات إيجار لسه</div>'; return; }
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  let cid = q.get('c') && chalets.some((c) => c.id === q.get('c')) ? q.get('c') : chalets[0].id;
  const t = new Date(); let view = new Date(t.getFullYear(), t.getMonth(), 1);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let blocked = new Map(); let pending = new Map();

  async function load() {
    const a = iso(view); const b = iso(new Date(view.getFullYear(), view.getMonth() + 1, 0));
    const [{ data: bd }, { data: rq }] = await Promise.all([
      sb.from('blocked_dates').select('day, request_id, booking_requests(name)').eq('chalet_id', cid).gte('day', a).lte('day', b),
      sb.from('booking_requests').select('id, name, check_in, check_out').eq('chalet_id', cid).eq('status', 'pending').eq('kind', 'rent').lte('check_in', b).gte('check_out', a),
    ]);
    blocked = new Map((bd || []).map((r) => [r.day, r]));
    pending = new Map();
    (rq || []).forEach((r) => { for (let d = new Date(r.check_in); d < new Date(r.check_out); d.setDate(d.getDate() + 1)) pending.set(iso(d), r.name); });
  }
  function draw() {
    const today = iso(new Date());
    const offset = (view.getDay() + 1) % 7;
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    let cells = ['سبت', 'أحد', 'إتنين', 'تلات', 'أربع', 'خميس', 'جمعة'].map((w) => `<span class="cal-wd">${w}</span>`).join('');
    for (let i = 0; i < offset; i++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const k = iso(new Date(view.getFullYear(), view.getMonth(), d));
      const b = blocked.get(k); const pn = pending.get(k); const past = k < today;
      const cls = b ? (b.request_id ? 'booked' : 'blocked') : pn ? 'pending' : 'free';
      const label = b ? (b.request_id ? (b.booking_requests?.name || 'محجوز') : 'مقفول') : pn ? `طلب: ${pn}` : '';
      cells += `<button type="button" class="cal-cell ${cls} ${past ? 'past' : ''}" data-day="${k}" ${b?.request_id || past ? 'disabled' : ''}><b>${num(d)}</b><small>${esc(label)}</small></button>`;
    }
    main.innerHTML = `
      <div class="admin-top"><div><h1>تقويم الحجوزات</h1><p>اضغط على أي يوم فاضي عشان تقفله، واضغط تاني عشان تفتحه</p></div>
        <label class="field" style="min-width:260px">الشاليه<select id="ch">${chalets.map((c) => `<option value="${c.id}" ${c.id === cid ? 'selected' : ''}>${esc(c.code)} · ${esc(c.villages?.name || '')}</option>`).join('')}</select></label></div>
      <div class="box">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:10px"><button class="icon-btn" type="button" data-m="-1" aria-label="الشهر اللي فات">›</button><b style="font-size:20px">${MONTHS_AR[view.getMonth()]} ${num(view.getFullYear())}</b><button class="icon-btn" type="button" data-m="1" aria-label="الشهر الجاي">‹</button></div>
          <div class="cal-legend"><span><i style="background:#1A1A1A"></i>محجوز</span><span><i style="background:#DCD6CA"></i>مقفول من الأدمن</span><span><i style="border:2px dashed #C9A96A"></i>طلب مستني الرد</span></div>
        </div>
        <div class="cal-grid">${cells}</div>
      </div>`;
  }
  const reload = async () => { await load(); draw(); };
  main.addEventListener('change', async (e) => { if (e.target.id === 'ch') { cid = e.target.value; await reload(); } });
  main.addEventListener('click', async (e) => {
    const m = e.target.closest('[data-m]');
    if (m) { view = new Date(view.getFullYear(), view.getMonth() + Number(m.dataset.m), 1); return reload(); }
    const c = e.target.closest('[data-day]');
    if (!c || c.disabled) return;
    const k = c.dataset.day;
    c.classList.add('busy');
    const { error: er } = blocked.has(k)
      ? await sb.from('blocked_dates').delete().eq('chalet_id', cid).eq('day', k).is('request_id', null)
      : await sb.from('blocked_dates').insert({ chalet_id: cid, day: k });
    if (er) { c.classList.remove('busy'); return fail(er); }
    await reload();
  });
  await reload();
}

// ============ التوجيه ============
async function route() {
  if (!session) return loginView();
  if (!isAdmin) {
    app.innerHTML = `<div class="login"><div class="box" style="max-width:420px"><h2>الحساب ده مش أدمن</h2><p class="muted">${esc(session.user.email)} مالوش صلاحية على لوحة التحكم.</p><button class="btn btn-dark" id="out">تسجيل الخروج</button></div></div>`;
    $('#out').onclick = () => sb.auth.signOut();
    return;
  }
  const h = location.hash || '#/requests';
  let m;
  if ((m = h.match(/^#\/chalets\/(new|[0-9a-f-]{36})$/))) return chaletForm(m[1] === 'new' ? null : m[1]);
  if ((m = h.match(/^#\/villages\/(new|[0-9a-f-]{36})$/))) return villageForm(m[1] === 'new' ? null : m[1]);
  if (h === '#/villages') return villagesList();
  if (h === '#/settings') return settingsView();
  if (h === '#/requests') return requestsView();
  if (h.startsWith('#/calendar')) return calendarView();
  return chaletsList();
}

async function setSession(s) {
  session = s;
  isAdmin = false;
  if (s) { const { data } = await sb.rpc('is_admin'); isAdmin = !!data; }
  route();
}
window.addEventListener('hashchange', route);
const { data: { session: initial } } = await sb.auth.getSession();
await setSession(initial);
sb.auth.onAuthStateChange((event, s) => {
  if (event === 'SIGNED_IN' && session?.access_token === s?.access_token) return;
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setSession(s);
  else session = s;
});
