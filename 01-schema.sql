-- ============================================
-- عقار محارب — قاعدة البيانات
-- ============================================

-- ---------- أنواع ----------
create type public.offer_type as enum ('sale', 'rent');
create type public.chalet_status as enum ('available', 'reserved', 'sold');
create type public.feature_scope as enum ('village', 'chalet');

-- ---------- الأدمن ----------
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- تحديث updated_at تلقائي ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- المميزات ----------
create table public.features (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text,
  scope public.feature_scope not null default 'village',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (name, scope)
);

-- ---------- القرى ----------
create table public.villages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  tagline text,
  description text,
  cover_image text,
  gallery text[] not null default '{}',
  map_url text,
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger villages_updated_at before update on public.villages
  for each row execute function public.set_updated_at();

create table public.village_features (
  village_id uuid not null references public.villages(id) on delete cascade,
  feature_id uuid not null references public.features(id) on delete cascade,
  primary key (village_id, feature_id)
);
create index village_features_feature_idx on public.village_features(feature_id);

-- ---------- الشاليهات ----------
create table public.chalets (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references public.villages(id) on delete cascade,
  code text not null,
  title text not null,
  offer_type public.offer_type not null,
  rooms int check (rooms >= 0),
  bathrooms int check (bathrooms >= 0),
  area_m2 numeric check (area_m2 > 0),
  floor text,
  view text,
  max_guests int check (max_guests > 0),
  -- إيجار
  price_night numeric check (price_night >= 0),
  price_week numeric check (price_week >= 0),
  -- بيع
  price_total numeric check (price_total >= 0),
  down_payment numeric check (down_payment >= 0),
  installment_period text,
  description text,
  cover_image text,
  gallery text[] not null default '{}',
  status public.chalet_status not null default 'available',
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (village_id, code)
);
create index chalets_village_idx on public.chalets(village_id);
create index chalets_filter_idx on public.chalets(offer_type, rooms, status);
create trigger chalets_updated_at before update on public.chalets
  for each row execute function public.set_updated_at();

create table public.chalet_features (
  chalet_id uuid not null references public.chalets(id) on delete cascade,
  feature_id uuid not null references public.features(id) on delete cascade,
  primary key (chalet_id, feature_id)
);
create index chalet_features_feature_idx on public.chalet_features(feature_id);

-- ---------- إعدادات الموقع (صف واحد) ----------
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  hero_image text,
  hero_images text[] not null default '{}',
  hero_eyebrow text default 'شاليهات للبيع والإيجار',
  hero_title text default 'شاليهك على البحر، باختيار أسهل',
  hero_subtitle text default 'قرى مختارة بعناية، وشاليهات بتقسيمات تناسب كل عيلة. اختار القرية، وشوف المتاح فيها للبيع أو للإيجار.',
  phone text,
  whatsapp text,
  address text,
  whatsapp_message text default 'أهلًا، أنا مهتم بشاليه {code} في قرية {village}',
  updated_at timestamptz not null default now()
);
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();
insert into public.site_settings (id) values (1);

-- ============================================
-- الصلاحيات (RLS)
-- ============================================
alter table public.admins enable row level security;
alter table public.features enable row level security;
alter table public.villages enable row level security;
alter table public.village_features enable row level security;
alter table public.chalets enable row level security;
alter table public.chalet_features enable row level security;
alter table public.site_settings enable row level security;

-- الأدمن يشوف نفسه بس
create policy "admins read self" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

-- الزوار: قراءة المعروض فقط
create policy "public read features" on public.features
  for select to anon, authenticated using (true);
create policy "public read visible villages" on public.villages
  for select to anon, authenticated using (is_visible or (select public.is_admin()));
create policy "public read village_features" on public.village_features
  for select to anon, authenticated using (true);
create policy "public read visible chalets" on public.chalets
  for select to anon, authenticated using (
    (is_visible and exists (select 1 from public.villages v where v.id = village_id and v.is_visible))
    or (select public.is_admin())
  );
create policy "public read chalet_features" on public.chalet_features
  for select to anon, authenticated using (true);
create policy "public read settings" on public.site_settings
  for select to anon, authenticated using (true);

-- الأدمن: إضافة وتعديل وحذف
create policy "admin insert features" on public.features for insert to authenticated with check ((select public.is_admin()));
create policy "admin update features" on public.features for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete features" on public.features for delete to authenticated using ((select public.is_admin()));
create policy "admin insert villages" on public.villages for insert to authenticated with check ((select public.is_admin()));
create policy "admin update villages" on public.villages for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete villages" on public.villages for delete to authenticated using ((select public.is_admin()));
create policy "admin insert village_features" on public.village_features for insert to authenticated with check ((select public.is_admin()));
create policy "admin delete village_features" on public.village_features for delete to authenticated using ((select public.is_admin()));
create policy "admin insert chalets" on public.chalets for insert to authenticated with check ((select public.is_admin()));
create policy "admin update chalets" on public.chalets for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin delete chalets" on public.chalets for delete to authenticated using ((select public.is_admin()));
create policy "admin insert chalet_features" on public.chalet_features for insert to authenticated with check ((select public.is_admin()));
create policy "admin delete chalet_features" on public.chalet_features for delete to authenticated using ((select public.is_admin()));
create policy "admin update settings" on public.site_settings for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ============================================
-- تخزين الصور
-- ============================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "admin upload images" on storage.objects
  for insert to authenticated with check (bucket_id = 'images' and (select public.is_admin()));
create policy "admin update images" on storage.objects
  for update to authenticated using (bucket_id = 'images' and (select public.is_admin()));
create policy "admin delete images" on storage.objects
  for delete to authenticated using (bucket_id = 'images' and (select public.is_admin()));

-- ============================================
-- المميزات الافتراضية
-- ============================================
insert into public.features (name, icon, scope, sort_order) values
  ('شاطئ رملي', 'beach', 'village', 1),
  ('لاجون', 'lagoon', 'village', 2),
  ('حمامات سباحة', 'pool', 'village', 3),
  ('أكوا بارك', 'aqua', 'village', 4),
  ('مطاعم وكافيهات', 'food', 'village', 5),
  ('أمن ٢٤ ساعة', 'security', 'village', 6),
  ('ملاعب', 'sports', 'village', 7),
  ('منطقة أطفال', 'kids', 'village', 8),
  ('جيم', 'gym', 'village', 9),
  ('سوبر ماركت', 'market', 'village', 10),
  ('عيادة', 'clinic', 'village', 11),
  ('ممشى', 'walk', 'village', 12),
  ('مفروش بالكامل', 'sofa', 'chalet', 1),
  ('تكييف', 'ac', 'chalet', 2),
  ('جاردن خاص', 'garden', 'chalet', 3),
  ('روف خاص', 'roof', 'chalet', 4),
  ('مطبخ مجهز', 'kitchen', 'chalet', 5),
  ('واي فاي', 'wifi', 'chalet', 6),
  ('غسالة', 'washer', 'chalet', 7),
  ('باركينج', 'parking', 'chalet', 8);
