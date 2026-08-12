# ربط التطبيق بموديول pt_construction_lite (Odoo 19)

الأسماء الحقيقية للموديلات والحقول مضبوطة مسبقاً من الموديول. الباقي إعدادات الاتصال فقط.

## 1) إعدادات الاتصال — `src/api/config.js`
```js
export const ODOO_URL = 'https://lite.odoo.com';  // رابط instance الفعلي
export const ODOO_DB  = 'lite';                    // ← تأكد من الاسم الصحيح
export const USE_API  = true;
```

### مهم — اسم قاعدة البيانات
`lite.odoo.com` قد يكون رابط عام. للتأكد من اسم قاعدة البيانات الفعلي:
- افتح: `https://lite.odoo.com/web/database/manager` — يظهر اسم القاعدة.
- أو بعد تسجيل الدخول في Odoo: Settings ▸ Activate Developer Mode، ثم أسفل الصفحة يظهر اسم القاعدة.
- لو الرابط الفعلي مختلف (مثل `https://xxxx.odoo.com`)، حط الرابط واسم القاعدة الصحيحين.

## 2) شغّل
```bash
npm install
npx expo start
```
سجّل دخول ببريدك وكلمة مرورك في Odoo.

## الموديلات المربوطة (كلها من الموديول)
| الشاشة | الموديل | 
|--------|---------|
| المشاريع | `project.project` (is_construction=true) |
| المستخلصات | `construction.progress.claim` |
| التقارير اليومية | `construction.daily.report` |
| الضمانات | `construction.guarantee` |
| مقاولو الباطن | `construction.subcontract` |
| بنود الأعمال | `construction.boq` / `construction.boq.line` |
| المحتجزات | حقول `retention_*` في `project.project` |

## كيف يعمل
- **الدخول**: `/web/session/authenticate` (JSON-RPC).
- **القراءة**: `search_read` على كل موديل، مع تحويل الحقول لشكل التطبيق في `src/api/services.js`.
- **التقدّم**: يُحسب من متوسط `progress` في `construction.boq` للمشروع.
- **الحالة**: تُشتق من نسبة الإنجاز ومن `state` في كل سجل.
- كل شاشة تستخدم `useAsync` لإظهار تحميل/خطأ/إعادة محاولة.

## تشخيص الأخطاء
- **"HTML بدل JSON"**: الرابط أو اسم القاعدة غير صحيح.
- **"فشل تسجيل الدخول"**: البريد/كلمة المرور، أو الحساب غير مفعّل.
- **قوائم فارغة**: تأكد أن المشاريع عليها `is_construction=true`، وأن للمستخدم صلاحية قراءة الموديلات.
- **خطأ حقل غير موجود**: عدّل اسم الحقل في `src/api/config.js ▸ MODELS`.

## التبديل للوضع التجريبي
`USE_API=false` في config.js يرجّع للبيانات الوهمية (بدون سيرفر).
