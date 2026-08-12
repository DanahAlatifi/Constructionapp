// ═══════════════════════════════════════════════════════════════
//  طبقة الاتصال بـ Odoo عبر JSON-RPC
//  ملاحظات مهمة لـ React Native:
//   • لا نعتمد على الكوكيز (RN يحجبها) — نمرّر session_id يدوياً
//   • نستخدم /web/session/authenticate للدخول
//   • نستخدم /web/dataset/call_kw لقراءة/كتابة البيانات
// ═══════════════════════════════════════════════════════════════
import { getOdooUrl, getOdooDb } from './config';

let SESSION_ID = null;   // يُحفظ بعد الدخول
let UID = null;
let USER_CTX = {};
let CURRENT_USER = null;

// نداء JSON-RPC عام
async function rpc(endpoint, params) {
  // بدون رابط سيرفر (لم يُمسح باركود) — رسالة واضحة
  if (!getOdooUrl()) {
    throw new Error('لم يتم تحديد سيرفر. امسح باركود الشركة أولاً.');
  }
  const res = await fetch(`${getOdooUrl()}${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(SESSION_ID ? { 'X-Openerp-Session-Id': SESSION_ID } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params,
      id: Math.floor(Math.random() * 1e9),
    }),
  });

  // حاول التقاط session_id من الهيدر (Odoo يرسله في set-cookie)
  try {
    const setCookie = res.headers.get('set-cookie') || res.headers.get('Set-Cookie');
    if (setCookie) {
      const m = setCookie.match(/session_id=([^;]+)/);
      if (m && m[1]) SESSION_ID = m[1];
    }
  } catch (e) {}

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    // Odoo رجّع HTML بدل JSON — عادةً يعني المسار غلط أو الجلسة منتهية
    throw new Error('استجابة غير متوقعة من الخادم (HTML بدل JSON). تأكد من الرابط واسم قاعدة البيانات.');
  }

  if (data.error) {
    const msg = data.error?.data?.message || data.error?.message || 'خطأ من Odoo';
    throw new Error(msg);
  }
  return data.result;
}

// نداء endpoint مخصّص (type='json') — للمسارات مثل /construction/register_push
export async function rpcCall(endpoint, params = {}) {
  return rpc(endpoint, params);
}

// ── كشف قاعدة البيانات تلقائياً ──
let RESOLVED_DB = null;

export async function resolveDb() {
  const _db = getOdooDb(); if (_db) return _db;          // إذا مكتوب يدوياً، استخدمه
  if (RESOLVED_DB) return RESOLVED_DB;  // إذا سبق اكتشافه

  try {
    const res = await fetch(`${getOdooUrl()}/web/database/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {}, id: 1 }),
    });
    const data = await res.json();
    const list = data.result || [];
    if (list.length === 1) { RESOLVED_DB = list[0]; return RESOLVED_DB; }
    if (list.length > 1) {
      // أكثر من قاعدة: نأخذ الأولى ونحذّر (يمكنك عرض قائمة اختيار لاحقاً)
      RESOLVED_DB = list[0];
      return RESOLVED_DB;
    }
  } catch (e) {
    // list_db معطّل — نحاول اشتقاق الاسم من الرابط (subdomain)
  }

  // احتياطي: خذ الـ subdomain من الرابط (https://NAME.odoo.com → NAME)
  const mm = getOdooUrl().match(/https?:\/\/([^.]+)\./);
  if (mm) { RESOLVED_DB = mm[1]; return RESOLVED_DB; }

  throw new Error('تعذّر تحديد قاعدة البيانات. اكتب ODOO_DB يدوياً في src/api/config.js');
}

// ── تسجيل الدخول ──
export async function login(email, password) {
  const db = await resolveDb();
  const result = await rpc('/web/session/authenticate', {
    db,
    login: email,
    password,
  });

  if (!result || !result.uid) {
    throw new Error('فشل تسجيل الدخول — تحقق من البريد وكلمة المرور.');
  }

  UID = result.uid;
  USER_CTX = result.user_context || {};
  SESSION_ID = result.session_id || SESSION_ID;

  CURRENT_USER = {
    uid: result.uid,
    name: result.name || result.username || email,
    username: result.username || email,
    email: result.username || email,
    companyName: Array.isArray(result.company_id) ? result.company_id[1] : '',
    partnerId: result.partner_id,
  };

  // جلب تفاصيل إضافية (جوال، هاتف) من res.users — حقول آمنة
  let userCompanyId = Array.isArray(result.company_id) ? result.company_id[0] : null;
  try {
    const users = await callKw('res.users', 'read', [[result.uid], ['name', 'login', 'email', 'phone', 'mobile', 'company_id', 'city', 'country_id', 'lang', 'tz', 'login_date']]);
    if (users && users[0]) {
      const u = users[0];
      CURRENT_USER.name = u.name || CURRENT_USER.name;
      CURRENT_USER.email = u.email || u.login || CURRENT_USER.email;
      CURRENT_USER.phone = u.mobile || u.phone || '';
      CURRENT_USER.companyName = Array.isArray(u.company_id) ? u.company_id[1] : CURRENT_USER.companyName;
      CURRENT_USER.city = u.city || '';
      CURRENT_USER.country = Array.isArray(u.country_id) ? u.country_id[1] : '';
      CURRENT_USER.lang = u.lang || '';
      CURRENT_USER.tz = u.tz || '';
      CURRENT_USER.lastLogin = u.login_date ? String(u.login_date).slice(0, 16) : '';
      if (Array.isArray(u.company_id)) userCompanyId = u.company_id[0];
    }
  } catch (e) {}

  // المسمى الوظيفي — قراءة منفصلة (قد لا يوجد الحقل)
  try {
    const jt = await callKw('res.users', 'read', [[result.uid], ['job_title']]);
    if (jt && jt[0] && jt[0].job_title) CURRENT_USER.jobTitle = jt[0].job_title;
  } catch (e) {}

  // ⭐ قراءة لون الشركة — مع مسارات بديلة قوية
  // مسار بديل: لو ما حصلنا companyId، جيبه من search على res.company
  if (!userCompanyId) {
    try {
      const cids = await callKw('res.company', 'search', [[]], { limit: 1 });
      if (Array.isArray(cids) && cids.length) userCompanyId = cids[0];
    } catch (e) {}
  }

  CURRENT_USER.companyColorDiag = 'companyId=' + JSON.stringify(userCompanyId);
  if (userCompanyId) {
    try {
      const comps = await callKw('res.company', 'read', [[userCompanyId], ['name', 'color']]);
      if (comps && comps[0]) {
        const c = comps[0];
        CURRENT_USER.companyColor = (c.color !== undefined && c.color !== false) ? c.color : null;
        CURRENT_USER.companyName = c.name || CURRENT_USER.companyName;
        CURRENT_USER.companyColorDiag = 'color=' + JSON.stringify(c.color) + ' name=' + (c.name || '؟');
      } else {
        CURRENT_USER.companyColorDiag = 'read رجّع فاضي';
      }
    } catch (e) {
      CURRENT_USER.companyColorDiag = 'خطأ read: ' + (e.message || '');
    }
    // ألوان hex من الشركة (primary/secondary — مستخرجة من الشعار في Odoo)
    try {
      const comps2 = await callKw('res.company', 'read', [[userCompanyId], ['primary_color', 'secondary_color']]);
      if (comps2 && comps2[0]) {
        CURRENT_USER.companyPrimary = comps2[0].primary_color || '';
        CURRENT_USER.companySecondary = comps2[0].secondary_color || '';
      }
    } catch (e) {}
  } else {
    CURRENT_USER.companyColorDiag = 'لا يوجد companyId';
  }

  return CURRENT_USER;
}

export function getCurrentUser() { return CURRENT_USER; }

// تحقّق من كلمة سر المستخدم (بدون التأثير على الجلسة الحالية)
export async function verifyPassword(loginEmail, password) {
  try {
    const db = await resolveDb();
    const res = await fetch(`${getOdooUrl()}/web/session/authenticate`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'call',
        params: { db, login: loginEmail, password },
        id: Math.floor(Math.random() * 1e9),
      }),
    });
    const data = await res.json();
    return !!(data && data.result && data.result.uid);
  } catch (e) {
    return false;
  }
}

// ── نداء call_kw العام (القراءة/الكتابة على الموديلات) ──
export async function callKw(model, method, args = [], kwargs = {}) {
  return rpc('/web/dataset/call_kw', {
    model,
    method,
    args,
    kwargs: { context: USER_CTX, ...kwargs },
  });
}

// ── اختصار: قراءة سجلات مع فلترة ──
export async function searchRead(model, domain = [], fields = [], opts = {}) {
  return callKw(model, 'search_read', [domain, fields], {
    limit: opts.limit || 80,
    offset: opts.offset || 0,
    order: opts.order || 'id desc',
  });
}

// ── تسجيل الخروج ──
export async function logout() {
  try { await rpc('/web/session/destroy', {}); } catch (e) {}
  SESSION_ID = null; UID = null; USER_CTX = {}; CURRENT_USER = null;
}

export function isLoggedIn() { return !!UID; }
export function getUid() { return UID; }

// ═══════════════════════════════════════════════════════════════
//  الكتابة والإجراءات (تعديلات تنعكس على Odoo)
// ═══════════════════════════════════════════════════════════════

// تنفيذ أكشن على سجل (مثل action_submit, action_certify)
export async function runAction(model, action, recordId) {
  return callKw(model, action, [[recordId]]);
}

// إنشاء سجل جديد
export async function createRecord(model, values) {
  return callKw(model, 'create', [values]);
}

// تعديل سجل موجود
export async function writeRecord(model, recordId, values) {
  return callKw(model, 'write', [[recordId], values]);
}

// رابط تنزيل تقرير PDF (يفتح في المتصفح مع الجلسة)
export function reportUrl(reportName, recordId) {
  return `${getOdooUrl()}/report/pdf/${reportName}/${recordId}`;
}

// جلب session_id الحالي (لتمريره للروابط)
export function getSessionId() { return SESSION_ID; }
