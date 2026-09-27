-- بيانات مبدئية (للتجربة — تتغير من لوحة الأدمن)
insert into public.villages (name, slug, tagline, description, cover_image, gallery, map_url, sort_order) values
('لا هاسيندا', 'la-hacienda', 'على البحر مباشرة', 'قرية هادية على البحر مباشرة، فيها شاطئ رملي ولاجونات وحمامات سباحة كبيرة. مناسبة للعائلات اللي بتدور على راحة وخصوصية.', 'assets/samples/p7.jpg', array['assets/samples/p7.jpg','assets/samples/p2.jpg','assets/samples/p3.jpg','assets/samples/p6.jpg','assets/samples/p4.jpg'], null, 1),
('موسى كوست', 'moses-coast', 'هدوء ومساحات خضراء', 'مساحات خضراء واسعة وحمامات سباحة ومطاعم، مع أمن على مدار اليوم.', 'assets/samples/p2.jpg', array['assets/samples/p2.jpg','assets/samples/p4.jpg','assets/samples/p1.jpg'], null, 2),
('جولدن بيتش', 'golden-beach', 'مناسبة للعائلات', 'شاطئ رملي ومنطقة أطفال وملاعب، مكان مناسب للعائلات والأطفال.', 'assets/samples/p3.jpg', array['assets/samples/p3.jpg','assets/samples/p8.jpg','assets/samples/p5.jpg'], null, 3),
('وايت باي', 'white-bay', 'فيو بحر مفتوح', 'لاجونات وأكوا بارك وكافيهات، وفيو بحر مفتوح من أغلب الشاليهات.', 'assets/samples/p4.jpg', array['assets/samples/p4.jpg','assets/samples/p6.jpg','assets/samples/p9.jpg'], null, 4),
('بلو لاجون', 'blue-lagoon', 'لاجونات صافية', 'لاجونات صافية وحمامات سباحة وملاعب، بتشطيبات حديثة.', 'assets/samples/p6.jpg', array['assets/samples/p6.jpg','assets/samples/p9.jpg','assets/samples/p2.jpg'], null, 5);

insert into public.village_features (village_id, feature_id)
select v.id, f.id from (values
  ('la-hacienda','شاطئ رملي'),('la-hacienda','لاجون'),('la-hacienda','حمامات سباحة'),('la-hacienda','أمن ٢٤ ساعة'),('la-hacienda','مطاعم وكافيهات'),('la-hacienda','منطقة أطفال'),
  ('moses-coast','حمامات سباحة'),('moses-coast','مطاعم وكافيهات'),('moses-coast','أمن ٢٤ ساعة'),('moses-coast','ملاعب'),
  ('golden-beach','شاطئ رملي'),('golden-beach','منطقة أطفال'),('golden-beach','ملاعب'),('golden-beach','سوبر ماركت'),
  ('white-bay','لاجون'),('white-bay','أكوا بارك'),('white-bay','مطاعم وكافيهات'),('white-bay','ممشى'),
  ('blue-lagoon','لاجون'),('blue-lagoon','حمامات سباحة'),('blue-lagoon','ملاعب'),('blue-lagoon','جيم')
) as x(slug, fname)
join public.villages v on v.slug = x.slug
join public.features f on f.name = x.fname and f.scope = 'village';

insert into public.chalets (village_id, code, title, offer_type, rooms, bathrooms, area_m2, floor, view, max_guests, price_night, price_week, price_total, down_payment, installment_period, description, cover_image, gallery, status)
select v.id, x.code, x.title, x.offer::public.offer_type, x.rooms, x.baths, x.area, x.floor, x.view, x.guests, x.pn, x.pw, x.pt, x.dp, x.inst, x.descr, x.cover, x.gal, x.st::public.chalet_status
from (values
  ('la-hacienda','A-12','شاليه غرفتين · أرضي بجاردن','rent',2,1,90,'أرضي بجاردن','لاجون',6,2500,15000,null::numeric,null::numeric,null::text,'شاليه مفروش بالكامل بجاردن خاص، خطوات من اللاجون.','assets/samples/p1.jpg',array['assets/samples/p1.jpg','assets/samples/p4.jpg','assets/samples/p7.jpg'],'available'),
  ('la-hacienda','B-07','شاليه ٣ غرف · دور أول','sale',3,2,130,'أول','بحر',8,null,null,3500000,700000,'٥ سنين','شاليه ٣ غرف بفيو بحر مباشر وتشطيب سوبر لوكس.','assets/samples/p8.jpg',array['assets/samples/p8.jpg','assets/samples/p3.jpg'],'available'),
  ('la-hacienda','C-21','شاليه غرفة · روف','rent',1,1,65,'روف','حمام سباحة',4,1800,11000,null,null,null,'شاليه غرفة بروف خاص يطل على حمام السباحة.','assets/samples/p9.jpg',array['assets/samples/p9.jpg','assets/samples/p2.jpg'],'reserved'),
  ('moses-coast','M-03','شاليه غرفتين · دور أول','rent',2,1,85,'أول','جاردن',6,2200,13500,null,null,null,'شاليه هادي وسط المساحات الخضراء.','assets/samples/p5.jpg',array['assets/samples/p5.jpg','assets/samples/p1.jpg'],'available'),
  ('moses-coast','M-14','شاليه ٣ غرف · أرضي بجاردن','sale',3,2,140,'أرضي بجاردن','حمام سباحة',8,null,null,4200000,1000000,'٤ سنين','شاليه أرضي بجاردن كبير قريب من حمام السباحة.','assets/samples/p2.jpg',array['assets/samples/p2.jpg','assets/samples/p4.jpg'],'available'),
  ('golden-beach','G-02','شاليه غرفتين · أرضي','rent',2,1,80,'أرضي','بحر',5,2000,12500,null,null,null,'على بعد خطوات من الشاطئ الرملي.','assets/samples/p3.jpg',array['assets/samples/p3.jpg','assets/samples/p8.jpg'],'available'),
  ('golden-beach','G-09','شاليه غرفة · دور تاني','sale',1,1,60,'تاني','جاردن',4,null,null,1900000,400000,'٣ سنين','شاليه غرفة مناسب للاستثمار والإيجار.','assets/samples/p5.jpg',array['assets/samples/p5.jpg'],'sold'),
  ('white-bay','W-11','شاليه ٣ غرف · روف','sale',3,2,150,'روف','بحر',8,null,null,5000000,1250000,'٥ سنين','روف خاص بفيو بحر مفتوح.','assets/samples/p4.jpg',array['assets/samples/p4.jpg','assets/samples/p6.jpg'],'available'),
  ('white-bay','W-05','شاليه غرفتين · دور أول','rent',2,2,95,'أول','لاجون',6,2800,17000,null,null,null,'فيو لاجون مباشر وقريب من الأكوا بارك.','assets/samples/p6.jpg',array['assets/samples/p6.jpg','assets/samples/p9.jpg'],'available'),
  ('blue-lagoon','L-08','شاليه غرفتين · أرضي بجاردن','rent',2,1,88,'أرضي بجاردن','لاجون',6,2400,14500,null,null,null,'جاردن خاص على اللاجون مباشرة.','assets/samples/p9.jpg',array['assets/samples/p9.jpg','assets/samples/p6.jpg'],'available'),
  ('blue-lagoon','L-16','شاليه ٣ غرف · دور أول','sale',3,2,135,'أول','حمام سباحة',8,null,null,3900000,800000,'٥ سنين','تشطيب حديث وفيو حمام سباحة.','assets/samples/p2.jpg',array['assets/samples/p2.jpg','assets/samples/p7.jpg'],'available')
) as x(slug, code, title, offer, rooms, baths, area, floor, view, guests, pn, pw, pt, dp, inst, descr, cover, gal, st)
join public.villages v on v.slug = x.slug;

insert into public.chalet_features (chalet_id, feature_id)
select c.id, f.id from public.chalets c
join public.features f on f.scope = 'chalet' and f.name in ('مفروش بالكامل','تكييف','مطبخ مجهز','باركينج');
insert into public.chalet_features (chalet_id, feature_id)
select c.id, f.id from public.chalets c join public.features f on f.scope='chalet' and f.name='جاردن خاص'
where c.floor = 'أرضي بجاردن';
insert into public.chalet_features (chalet_id, feature_id)
select c.id, f.id from public.chalets c join public.features f on f.scope='chalet' and f.name='روف خاص'
where c.floor = 'روف';

update public.site_settings set
  hero_image = 'assets/samples/hero.jpg',
  hero_images = array['assets/samples/hero.jpg','assets/samples/p8.jpg','assets/samples/p3.jpg'],
  phone = '01000000000',
  whatsapp = '01000000000',
  address = 'العنوان هنا'
where id = 1;

