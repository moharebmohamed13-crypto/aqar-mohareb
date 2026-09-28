# موقع عقار محارب

موقع شاليهات وقرى سياحية + لوحة تحكم للأدمن، متوصّل بـ Supabase.

## الصفحات
- `book.html` — اختيار القرية ← بيع أو إيجار ← نوع الوحدة
- `results.html` — النتائج + المعاينة + تقويم الحجز
- لوحة التحكم فيها «طلبات الحجز» و«تقويم الحجوزات»
- قاعدة البيانات: `03-booking.sql` (طلبات الحجز والأيام المقفولة)

- `index.html` — الرئيسية (القرى + البحث)
- `village.html?v=<slug>` — صفحة القرية وشاليهاتها
- `chalet.html?id=<id>` — صفحة الشاليه والحجز عبر واتساب
- `admin.html` — لوحة التحكم (تسجيل دخول بحساب الأدمن)

## النشر
الموقع ملفات ثابتة (HTML/CSS/JS) — ينفع يترفع على أي استضافة:
- **Netlify**: ادخل app.netlify.com/drop واسحب الفولدر كله.
- **Vercel** أو **GitHub Pages** أو **Cloudflare Pages**: نفس الفكرة.

> لازم يتفتح من سيرفر (مش بالضغط مرتين على الملف)، عشان الـ JavaScript modules.
> للتجربة على الكمبيوتر: `npx serve .` أو `python -m http.server` جوه الفولدر.

## الإعدادات
- بيانات الاتصال بـ Supabase في `config.js`.
- قاعدة البيانات: `01-schema.sql` (الجداول والصلاحيات) و`02-sample-data.sql` (بيانات تجربة).
- الصور المبدئية (hero.jpg و p1…p9.jpg) — أي صورة يرفعها الأدمن بتتخزن في Supabase Storage (bucket اسمه `images`).

## إضافة أدمن جديد
1. Supabase ← Authentication ← Users ← Add user.
2. SQL Editor:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'الإيميل هنا';
   ```
