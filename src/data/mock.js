// بيانات مستخرجة مباشرةً من ملف تصميم Contracting Lite
export const company = { name: 'Contracting Lite', fullName: 'Contracting Lite', logo: 'PT' };

export const currentUser = {
  name: 'مشعل الحربي',
  role: 'مدير المشروع',
  roleKey: 'officer',
  email: 'm.alharbi@plustech.sa',
  phone: '+966 55 214 8890',
  branch: 'الرياض — المكتب الرئيسي',
  projectsAssigned: 6,
  reportsThisMonth: 12,
  claimsSubmitted: 21,
};

export const STAGES = ['مسودة', 'مقدّم', 'معتمد', 'مفوتر', 'محصّل'];
export const ACTIONS = ['تقديم للاستشاري', 'اعتماد الاستشاري', 'إصدار فاتورة العميل', 'تسجيل التحصيل', 'مكتمل — محصّل'];
export const RETENTION_PCT = 5;
export const ADVANCE_PCT = 10;

export const PROJECTS = [
  { id: 0, name: 'فيلا النرجس', code: 'عقد BOQ-0007', value: 2000000, valueShort: '2.00M', claimed: '1.24M', margin: '21.4%', progress: 62, daysLeft: 6, status: 'قائم' },
  { id: 1, name: 'البرج التجاري', code: 'عقد BOQ-0011', value: 8500000, valueShort: '8.50M', claimed: '5.52M', margin: '17.8%', progress: 65, daysLeft: 3, status: 'قائم' },
  { id: 2, name: 'الفندق', code: 'عقد BOQ-0004', value: 15000000, valueShort: '15.0M', claimed: '13.5M', margin: '19.2%', progress: 90, daysLeft: 0, status: 'قرب الاكتمال' },
  { id: 3, name: 'المستودعات الصناعية', code: 'عقد BOQ-0015', value: 4200000, valueShort: '4.20M', claimed: '0.63M', margin: '14.6%', progress: 15, daysLeft: 11, status: 'قائم' },
  { id: 4, name: 'الطريق (بلدية)', code: 'عقد BOQ-0009', value: 6800000, valueShort: '6.80M', claimed: '2.72M', margin: '9.6%', progress: 40, daysLeft: 18, status: 'قائم' },
  { id: 5, name: 'المدرسة الحكومية', code: 'عقد BOQ-0002', value: 3200000, valueShort: '3.20M', claimed: '3.20M', margin: '12.1%', progress: 100, daysLeft: 0, status: 'مكتمل' },
];

export const CLAIMS = [
  [{ no: '٠٤', st: 1, gross: 412500, date: '2026-07-31' }, { no: '٠٣', st: 4, gross: 388000, date: '2026-06-30' }, { no: '٠٢', st: 4, gross: 342000, date: '2026-05-31' }],
  [{ no: '١١', st: 2, gross: 986000, date: '2026-07-28' }, { no: '١٠', st: 4, gross: 910000, date: '2026-06-27' }, { no: '٠٩', st: 4, gross: 875000, date: '2026-05-29' }],
  [{ no: '٠٩', st: 3, gross: 1540000, date: '2026-07-15' }, { no: '٠٨', st: 4, gross: 1320000, date: '2026-06-14' }],
  [{ no: '٠٢', st: 0, gross: 318000, date: '2026-08-02' }],
  [{ no: '٠٥', st: 4, gross: 612000, date: '2026-06-22' }, { no: '٠٤', st: 4, gross: 588000, date: '2026-05-20' }],
  [{ no: '٠٦', st: 4, gross: 402000, date: '2026-03-18' }],
];

export const REPORTS = [
  [{ day: 'السبت ٣ أغسطس', note: '٢١ عاملاً · صب أعمدة الدور الأول' }, { day: 'الخميس ١ أغسطس', note: '١٨ عاملاً · تمديدات كهرباء' }, { day: 'الأربعاء ٣١ يوليو', note: '٢٤ عاملاً · أعمال عزل' }],
  [{ day: 'السبت ٣ أغسطس', note: '٦٤ عاملاً · تشطيبات الدور الثامن' }, { day: 'الجمعة ٢ أغسطس', note: '٥٨ عاملاً · تركيب واجهات' }, { day: 'الخميس ١ أغسطس', note: '٦١ عاملاً · أعمال ميكانيكا' }],
  [{ day: 'السبت ٣ أغسطس', note: '٤٢ عاملاً · تسليم الأدوار العليا' }, { day: 'الخميس ١ أغسطس', note: '٣٦ عاملاً · تشغيل تجريبي للتكييف' }],
  [{ day: 'السبت ٣ أغسطس', note: '١٢ عاملاً · أعمال حفر وإحلال' }, { day: 'الثلاثاء ٣٠ يوليو', note: '٩ عمال · قواعد خرسانية' }],
  [{ day: 'السبت ٣ أغسطس', note: '٣١ عاملاً · طبقة الأساس كم ٣+٤٠٠' }, { day: 'الأربعاء ٣١ يوليو', note: '٢٨ عاملاً · تصريف مطري' }],
  [{ day: 'الاثنين ١٧ مارس', note: 'تقرير الإقفال · تسليم نهائي' }],
];

export const LABOUR = ['21', '58', '42', '12', '31', '—'];
export const UNCLAIMED = ['1,240,000', '2,180,000', '640,000', '312,000', '1,860,000', '0'];
export const RET = [61900, 248000, 412000, 18600, 96400, 0];
export const VO = ['1 · +84,000', '2 · +310,000', '3 · +520,000', 'لا يوجد', '1 · +140,000', 'لا يوجد'];
export const OBS = ['٤', '٢', '٠', '٦', '٩', '٠'];
export const LOCS = ['حي النرجس، الرياض', 'طريق الملك فهد، الرياض', 'الكورنيش، جدة', 'المدينة الصناعية الثانية', 'مخرج ١٨ — بلدية العزيزية', 'حي الياسمين، الرياض'];

export const BOQP = [
  [{ n: 'حفر وردم', q: '1,200 / 1,200 م³', p: 100 }, { n: 'خرسانة مسلحة', q: '640 / 860 م³', p: 74 }, { n: 'أعمال كهرباء', q: '310 / 900 م.ط', p: 34 }, { n: 'تشطيبات داخلية', q: '0 / 1,450 م²', p: 2 }],
  [{ n: 'خرسانة الأدوار', q: '4,180 / 5,900 م³', p: 71 }, { n: 'واجهات زجاجية', q: '2,640 / 4,100 م²', p: 64 }, { n: 'تكييف مركزي', q: '1,120 / 2,400 م.ط', p: 47 }, { n: 'تشطيبات', q: '0 / 9,800 م²', p: 3 }],
  [{ n: 'تشطيبات الغرف', q: '8,900 / 9,600 م²', p: 93 }, { n: 'أعمال ميكانيكا', q: '3,450 / 3,600 م.ط', p: 96 }, { n: 'أثاث مثبّت', q: '410 / 520 وحدة', p: 79 }, { n: 'تنسيق موقع', q: '1,100 / 1,800 م²', p: 61 }],
  [{ n: 'حفر وإحلال', q: '3,600 / 12,000 م³', p: 30 }, { n: 'قواعد خرسانية', q: '180 / 1,400 م³', p: 13 }, { n: 'هياكل حديدية', q: '0 / 640 طن', p: 0 }],
  [{ n: 'طبقة الأساس', q: '18,400 / 42,000 م³', p: 44 }, { n: 'تصريف مطري', q: '1,260 / 3,800 م.ط', p: 33 }, { n: 'أعمال أسفلت', q: '6,800 / 21,000 م²', p: 32 }],
  [{ n: 'خرسانة المباني', q: '2,100 / 2,100 م³', p: 100 }, { n: 'تشطيبات', q: '4,600 / 4,600 م²', p: 100 }, { n: 'أعمال خارجية', q: '1,900 / 1,900 م²', p: 100 }],
];

export const SUBS = [
  [{ name: 'مؤسسة النور للكهرباء', code: 'SUB-0003 · كهرباء', status: 'ساري', v: '320,000', a: '148,000', r: '7,400' }, { name: 'شركة البناء المتين', code: 'SUB-0004 · مدني', status: 'مسودة', v: '540,000', a: '0', r: '0' }],
  [{ name: 'الواجهات الحديثة', code: 'SUB-0021 · واجهات', status: 'ساري', v: '1,850,000', a: '1,120,000', r: '56,000' }, { name: 'تكييف الخليج', code: 'SUB-0024 · ميكانيكا', status: 'ساري', v: '960,000', a: '410,000', r: '20,500' }],
  [{ name: 'أثاث الرواد', code: 'SUB-0032 · أثاث', status: 'ساري', v: '2,400,000', a: '2,180,000', r: '109,000' }],
  [{ name: 'حديد الشرق', code: 'SUB-0044 · هياكل', status: 'مسودة', v: '780,000', a: '0', r: '0' }],
  [{ name: 'أسفلت الوسطى', code: 'SUB-0051 · أسفلت', status: 'ساري', v: '2,100,000', a: '860,000', r: '43,000' }],
  [],
];

export const GUARANTEES = [
  { title: 'ضمان نهائي — الفندق', bank: 'بنك الرياض · 750,000 ر.س', amount: 750000, status: 'ساري', daysLeft: 28 },
  { title: 'ضمان دفعة مقدمة — فيلا النرجس', bank: 'البنك الأهلي · 200,000 ر.س', amount: 200000, status: 'ساري', daysLeft: 120 },
  { title: 'ضمان حسن تنفيذ — البرج', bank: 'مصرف الراجحي · 96,000 ر.س', amount: 96000, status: 'قرب الانتهاء', daysLeft: 12 },
];

export const META = [
  { start: '1 يناير 2026', span: '8 أشهر', end: '31 أغسطس 2026', labour: '32', equip: '15', tasks: '64', desc: 'إنشاء فيلا سكنية من دورين وملحق على مساحة 750 م²، تشمل أعمال البناء والتشطيب الكامل وتنسيق الموقع الخارجي.' },
  { start: '1 مارس 2025', span: '22 شهراً', end: '31 ديسمبر 2026', labour: '148', equip: '34', tasks: '212', desc: 'برج تجاري بعشرة أدوار ومواقف سفلية، يشمل الهيكل الخرساني والواجهات الزجاجية والتكييف المركزي والتشطيبات.' },
  { start: '1 يونيو 2024', span: '28 شهراً', end: '30 سبتمبر 2026', labour: '96', equip: '21', tasks: '318', desc: 'فندق من ١٤٠ غرفة على الكورنيش، المرحلة الحالية تشطيبات الغرف والتشغيل التجريبي للأنظمة الميكانيكية.' },
  { start: '15 مايو 2026', span: '14 شهراً', end: '15 يوليو 2027', labour: '24', equip: '9', tasks: '58', desc: 'أربعة مستودعات صناعية بهياكل حديدية على مساحة 12,000 م²، تشمل الأعمال الترابية والقواعد والسياج المحيطي.' },
  { start: '10 فبراير 2026', span: '18 شهراً', end: '10 أغسطس 2027', labour: '58', equip: '27', tasks: '104', desc: 'سفلتة وتطوير طريق بطول 6.4 كم لصالح البلدية، يشمل طبقات الأساس وشبكة التصريف المطري والإنارة.' },
  { start: '1 سبتمبر 2024', span: '18 شهراً', end: '17 مارس 2026', labour: '0', equip: '0', tasks: '96', desc: 'مدرسة حكومية بثمانية عشر فصلاً، سُلّمت نهائياً وأُغلقت ضماناتها البنكية ومحتجزاتها.' },
];

export const DOCS = [
  { t: 'مستخلص أعمال', cat: 'مالية', note: 'يُطبع بترويسة الشركة وخانات توقيع المقاول والاستشاري والمالك.' },
  { t: 'كشف حساب المشروع', cat: 'مالية', note: 'كل المستخلصات والمحتجزات والإفراجات في ورقة واحدة.' },
  { t: 'كشف حساب مقاول باطن', cat: 'باطن', note: 'مستخلصات الباطن ومحتجزاته والمُفرج عنه ورصيده.' },
  { t: 'أمر تغيير', cat: 'تعاقدية', note: 'يعدّل نفس عقد البيع ويضيف بنوده — عقد واحد لا فوضى عقود.' },
  { t: 'تقرير يومي', cat: 'الموقع', note: 'يحمل قراءات النظام الحية لحظة كتابة التقرير.' },
  { t: 'سجل المعوقات (EOT)', cat: 'الموقع', note: 'معوقات مؤرخة ومنسوبة — ملف مطالبة تمديد المدة.' },
  { t: 'ضمان بنكي', cat: 'مالية', note: 'تنبيه تلقائي قبل انتهاء الصلاحية بثلاثين يوماً.' },
  { t: 'إفراج عن محتجزات', cat: 'مالية', note: 'يُصدر فاتورة عاكسة على حساب المحتجزات المخصص.' },
];

export const ROLES = [
  { key: 'contractor', label: 'المقاول' },
  { key: 'consultant', label: 'الاستشاري' },
  { key: 'owner', label: 'المالك' },
];

export function computeClaim(gross, reduced = false) {
  const g = reduced ? Math.round(gross * 0.9367) : gross;
  const ret = Math.round((g * RETENTION_PCT) / 100);
  const adv = Math.round((g * ADVANCE_PCT) / 100);
  const net = g - ret - adv;
  return { gross: g, ret, adv, net };
}

export function claimStatusInfo(st) {
  if (st === 4) return { label: 'محصّل', tone: 'success' };
  if (st >= 2) return { label: STAGES[st], tone: 'accent' };
  if (st === 1) return { label: 'مقدّم', tone: 'accent' };
  return { label: 'مسودة', tone: 'muted' };
}

export const nf = (n) => new Intl.NumberFormat('en-US').format(Math.round(n));
export const PORTFOLIO_TOTAL = '39.7M';

// صور المواقع (من التصميم الأصلي)
export const SITE_IMG = require('../../assets/img/site1.webp');
export const SITE_IMG2 = require('../../assets/img/site2.webp');
export const SITE_IMG3 = require('../../assets/img/site3.webp');
// صور المشاريع الستة (نوزّع الصور المتاحة)
export const PROJECT_IMAGES = [
  require('../../assets/img/site1.webp'),
  require('../../assets/img/site2.webp'),
  require('../../assets/img/site3.webp'),
  require('../../assets/img/site1.webp'),
  require('../../assets/img/site2.webp'),
  require('../../assets/img/site3.webp'),
];

// صورة افتراضية موحّدة — تظهر للمشاريع التي ليس لها صورة في Odoo
export const DEFAULT_PROJECT_IMAGE = require('../../assets/img/site1.webp');
