// ═══════════════════════════════════════════════════════════════
//  طبقة الخدمات — تقرأ من موديول pt_construction_lite وتحوّل للتطبيق
//  USE_API=false ⇒ بيانات وهمية (mock.js)
// ═══════════════════════════════════════════════════════════════
import { USE_API, MODELS } from './config';
import { searchRead, callKw } from './odoo';
import * as mock from '../data/mock';

const m2oName = (v) => (Array.isArray(v) ? v[1] : v || '');
const m2oId = (v) => (Array.isArray(v) ? v[0] : v);
const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0));
const shortNum = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'K' : String(n || 0));
function daysUntil(d) { if (!d) return 0; return Math.max(0, Math.round((new Date(d) - new Date()) / 86400000)); }

// ── المشاريع ──
export async function getProjects() {
  if (!USE_API) return mock.PROJECTS;
  const F = MODELS.project.fields;
  const rows = await searchRead(
    MODELS.project.model,
    MODELS.project.domain || [],
    [F.name, F.contractAmount, F.certifiedTotal, F.retentionPercent, F.advancePercent,
     F.contractDate, F.endDate, F.durationDays, F.retentionBalance, F.saleOrderId,
     F.image, 'boq_ids', 'claim_ids'],
    { order: 'id asc' }
  );

  // احسب التقدّم من متوسط الـ BOQ لكل مشروع
  const projects = [];
  for (const r of rows) {
    let progress = 0;
    try {
      if (r.boq_ids && r.boq_ids.length) {
        const boqs = await callKw(MODELS.boq.model, 'read', [r.boq_ids, ['progress']]);
        const vals = boqs.map((b) => b.progress || 0);
        progress = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      }
    } catch (e) {}
    const contract = r[F.contractAmount] || 0;
    const certified = r[F.certifiedTotal] || 0;
    const unclaimed = Math.max(0, contract - certified);
    projects.push({
      id: r.id,
      name: r[F.name] || '',
      code: r[F.saleOrderId] ? m2oName(r[F.saleOrderId]) : `عقد #${r.id}`,
      value: contract,
      valueShort: shortNum(contract),
      claimed: shortNum(certified),
      margin: contract ? `${Math.round((certified / contract) * 100)}%` : '—',
      progress,
      status: progress >= 100 ? 'مكتمل' : 'قائم',
      daysLeft: daysUntil(r[F.endDate]),
      location: '',
      contractDate: r[F.contractDate] || '',
      endDate: r[F.endDate] || '',
      retentionPercent: r[F.retentionPercent] || 5,
      advancePercent: r[F.advancePercent] || 10,
      unclaimed,
      certified,
      image: r[F.image] ? `data:image/jpeg;base64,${r[F.image]}` : null,
      _raw: r,
    });
  }
  return projects;
}

// ── تفاصيل المشروع (BOQ + meta) ──
export async function getProjectDetail(projectId) {
  if (!USE_API) {
    const idx = projectId;
    return { boq: mock.BOQP[idx] || [], meta: mock.META[idx], loc: mock.LOCS[idx] };
  }
  const F = MODELS.boq.fields;
  const boqs = await searchRead(MODELS.boq.model, [[F.project, '=', projectId]], [F.name, F.progress, F.amountExecuted, F.amountTotal]);
  // بنود التخصص من سطور أول BOQ
  let lines = [];
  if (boqs.length) {
    const LF = MODELS.boqLine.fields;
    const boqLines = await searchRead(MODELS.boqLine.model, [[LF.boq, '=', boqs[0].id]],
      [LF.name, LF.qtyContract, LF.qtyExecuted, LF.progress, LF.uom]);
    lines = boqLines.map((l) => ({
      n: l[LF.name] || '',
      q: `${fmt(l[LF.qtyExecuted])} / ${fmt(l[LF.qtyContract])} ${m2oName(l[LF.uom])}`,
      p: Math.round(l[LF.progress] || 0),
    }));
  }
  return { boq: lines, meta: null, loc: '' };
}

// ── المستخلصات لمشروع ──
export async function getClaims(projectId) {
  if (!USE_API) return mock.CLAIMS[projectId] || [];
  const F = MODELS.claim.fields;
  const SM = MODELS.claim.stateMap;
  const rows = await searchRead(
    MODELS.claim.model,
    [[F.project, '=', projectId]],
    [F.number, F.date, F.state, F.amountCertified, F.amountPeriod, F.retention, F.advance, F.net, F.daysPending]
  );
  return rows.map((r) => ({
    no: r[F.number] || '',
    date: r[F.date] || '',
    st: SM[r[F.state]] ?? 0,
    gross: r[F.amountCertified] || r[F.amountPeriod] || 0,
    ret: r[F.retention] || 0,
    adv: r[F.advance] || 0,
    net: r[F.net] || 0,
    _raw: r,
  }));
}

// ── التقارير اليومية لمشروع ──
export async function getDailyReports(projectId) {
  if (!USE_API) return mock.REPORTS[projectId] || [];
  const F = MODELS.dailyReport.fields;
  const rows = await searchRead(
    MODELS.dailyReport.model,
    [[F.project, '=', projectId]],
    [F.date, F.manpower, F.works, F.obstacles, F.hasObstacles, F.progress, F.daysRemaining, 'state', 'weather', 'equipment_notes', 'visitors']
  );
  return rows.map((r) => {
    const mp = r[F.manpower] || 0;
    const wk = (r[F.works] || '').trim();
    const note = wk ? `${mp} عاملاً · ${wk.slice(0, 40)}` : `${mp} عاملاً`;
    return {
      day: r[F.date] || '',
      note,
      manpower: mp,
      works: wk,
      obstacles: r[F.obstacles] || '',
      weather: r.weather || 'sunny',
      equipment: r.equipment_notes || '',
      visitors: r.visitors || '',
      hasObstacles: r[F.hasObstacles],
      state: r.state || 'draft',
      submitted: r.state === 'submitted',
      _raw: r,
    };
  });
}

// ── الضمانات ──
export async function getGuarantees(projectId = null) {
  if (!USE_API) return mock.GUARANTEES;
  const F = MODELS.guarantee.fields;
  const SM = MODELS.guarantee.stateMap;
  const domain = projectId != null ? [[F.project, '=', projectId]] : [];
  const rows = await searchRead(
    MODELS.guarantee.model, domain,
    [F.title, F.bank, F.number, F.amount, F.expiry, F.state, F.type]
  );
  return rows.map((r) => ({
    title: r[F.title] || '',
    bank: `${r[F.bank] || ''} · ${fmt(r[F.amount])} ر.س`,
    amount: r[F.amount] || 0,
    status: SM[r[F.state]] || 'ساري',
    daysLeft: daysUntil(r[F.expiry]),
    _raw: r,
  }));
}

// ── مقاولو الباطن لمشروع ──
export async function getSubcontractors(projectId) {
  if (!USE_API) return mock.SUBS[projectId] || [];
  const F = MODELS.subcontract.fields;
  const SM = MODELS.subcontract.stateMap;
  const rows = await searchRead(
    MODELS.subcontract.model,
    [[F.project, '=', projectId]],
    [F.name, F.partner, F.total, F.executed, F.certified, F.retentionHeld, F.state]
  );
  return rows.map((r) => ({
    name: m2oName(r[F.partner]) || r[F.name] || '',
    code: r[F.name] || '',
    v: fmt(r[F.total]),
    a: fmt(r[F.certified]),
    r: fmt(r[F.retentionHeld]),
    status: SM[r[F.state]] || 'مسودة',
    _raw: r,
  }));
}

// ── المحتجزات لمشروع ──
export async function getRetention(projectId, project) {
  if (!USE_API) return { total: mock.RET[projectId] || 0 };
  // من بيانات المشروع نفسه
  const F = MODELS.project.fields;
  const rows = await searchRead(MODELS.project.model, [['id', '=', projectId]],
    [F.retentionHeld, F.retentionReleased, F.retentionBalance]);
  const r = rows[0] || {};
  return {
    total: r[F.retentionHeld] || 0,
    released: r[F.retentionReleased] || 0,
    balance: r[F.retentionBalance] || 0,
  };
}

// ── المستخدم الحالي (الحقيقي من Odoo أو الوهمي في وضع العرض) ──
import { getCurrentUser, verifyPassword } from './odoo';
export function getUser() {
  if (!USE_API) return mock.currentUser;
  const u = getCurrentUser();
  if (!u) {
    return { name: '', role: '', roleKey: 'officer', email: '', phone: '—', branch: '—', company: '', jobTitle: '', city: '', country: '', lastLogin: '', projectsAssigned: '—', reportsThisMonth: '—', claimsSubmitted: '—' };
  }
  return {
    name: u.name || '',
    role: u.jobTitle || u.companyName || 'مستخدم',
    roleKey: 'officer',
    email: u.email || '',
    phone: u.phone || '—',
    branch: u.companyName || '—',
    company: u.companyName || '',
    jobTitle: u.jobTitle || '',
    city: u.city || '',
    country: u.country || '',
    lang: u.lang === 'ar_001' || u.lang === 'ar_SA' ? 'العربية' : (u.lang || ''),
    lastLogin: u.lastLogin || '',
    projectsAssigned: '—',
    reportsThisMonth: '—',
    claimsSubmitted: '—',
  };
}

// إحصائيات الملف الشخصي من Odoo (مشاريع/تقارير/مستخلصات)
export async function getUserStats() {
  if (!USE_API) return { projects: '—', reports: '—', claims: '—' };
  try {
    const [projectCount, reportCount, claimCount] = await Promise.all([
      callKw(MODELS.project.model, 'search_count', [[['is_construction', '=', true]]]).catch(() => 0),
      callKw(MODELS.dailyReport.model, 'search_count', [[]]).catch(() => 0),
      callKw(MODELS.claim.model, 'search_count', [[]]).catch(() => 0),
    ]);
    return {
      projects: String(projectCount ?? 0),
      reports: String(reportCount ?? 0),
      claims: String(claimCount ?? 0),
    };
  } catch (e) {
    return { projects: '—', reports: '—', claims: '—' };
  }
}

// ── تنبيهات "يحتاج انتباهك" — من بيانات Odoo الحقيقية ──
export async function getAlerts(projectId, projectName) {
  if (!USE_API) {
    return [];
  }
  const alerts = [];
  try {
    // 1) ضمانات قرب تنتهي (خلال 30 يوم)
    const guarantees = await getGuarantees();
    const soon = guarantees.filter((g) => g.daysLeft > 0 && g.daysLeft <= 30);
    if (soon.length) {
      const g = soon.sort((a, b) => a.daysLeft - b.daysLeft)[0];
      alerts.push({
        icon: 'shield', kind: 'accent',
        title: 'ضمان بنكي ينتهي قريباً',
        sub: `${g.title} · بعد ${g.daysLeft} يوماً`,
        target: 'Guarantees',
      });
    }
  } catch (e) {}

  try {
    // 2) مستخلصات معلّقة (مقدّمة ولم تُعتمد)
    if (projectId != null) {
      const claims = await getClaims(projectId);
      const pending = claims.filter((c) => c.st === 1);
      if (pending.length) {
        alerts.push({
          icon: 'file-text', kind: 'accent2',
          title: 'مستخلص بانتظار الاعتماد',
          sub: `${projectName} · مستخلص ${pending[0].no}`,
          target: 'ClaimsTab',
        });
      }
    }
  } catch (e) {}

  try {
    // 3) معوقات الموقع
    if (projectId != null) {
      const reports = await getDailyReports(projectId);
      const withObs = reports.filter((r) => r.hasObstacles);
      if (withObs.length) {
        alerts.push({
          icon: 'alert-triangle', kind: 'accent',
          title: 'معوقات مؤرخة على الموقع',
          sub: `${withObs.length} معوقات · ملف تمديد المدة`,
          target: 'SiteTab',
        });
      }
    }
  } catch (e) {}

  return alerts;
}

// ═══════════════════════════════════════════════════════════════
//  الإجراءات (كتابة تنعكس على Odoo) + المستندات
// ═══════════════════════════════════════════════════════════════
import { runAction, createRecord, writeRecord, reportUrl } from './odoo';

// ── إجراءات المستخلص ──
export async function claimAction(claimId, action) {
  // action: 'submit' | 'certify' | 'invoice' | 'collect' | 'cancel'
  const map = {
    submit: 'action_submit',
    certify: 'action_certify',
    invoice: 'action_create_invoice',
    collect: 'action_mark_collected',
    cancel: 'action_cancel',
  };
  const method = map[action];
  if (!method) throw new Error('إجراء غير معروف');
  return runAction(MODELS.claim.model, method, claimId);
}

// الإجراء التالي حسب حالة المستخلص
export function nextClaimAction(state) {
  const flow = {
    draft: { action: 'submit', label: 'تقديم للاستشاري' },
    submitted: { action: 'certify', label: 'اعتماد الاستشاري' },
    certified: { action: 'invoice', label: 'إصدار فاتورة العميل' },
    invoiced: { action: 'collect', label: 'تسجيل التحصيل' },
  };
  return flow[state] || null;
}

// ── حفظ تقرير يومي جديد (ينشئه في Odoo) ──
export async function createDailyReport(projectId, values) {
  const F = MODELS.dailyReport.fields;
  // work_done إلزامي في الموديول — تحقق قبل الإرسال
  const workDone = (values.works || '').trim();
  if (!workDone) {
    throw new Error('يجب كتابة "الأعمال المنفّذة" — الحقل إلزامي.');
  }
  const payload = {
    [F.project]: projectId,
    [F.date]: values.date || new Date().toISOString().slice(0, 10),
    [F.manpower]: values.manpower || 0,
    [F.works]: workDone,
    [F.obstacles]: values.obstacles || '',
    weather: values.weather || 'sunny',
    equipment_notes: values.equipment || '',
    visitors: values.visitors || '',
  };
  const id = await createRecord(MODELS.dailyReport.model, payload);
  return id;
}

// تعديل تقرير موجود (نفس السجل — مو نسخة جديدة)
export async function updateDailyReport(reportId, values) {
  const F = MODELS.dailyReport.fields;
  const workDone = (values.works || '').trim();
  if (!workDone) {
    throw new Error('يجب كتابة "الأعمال المنفّذة" — الحقل إلزامي.');
  }
  return writeRecord(MODELS.dailyReport.model, reportId, {
    [F.manpower]: values.manpower || 0,
    [F.works]: workDone,
    [F.obstacles]: values.obstacles || '',
    weather: values.weather || 'sunny',
    equipment_notes: values.equipment || '',
    visitors: values.visitors || '',
  });
}

// تقديم التقرير (يصبح مُرسل — للقراءة فقط بعدها)
export async function submitDailyReport(reportId) {
  return runAction(MODELS.dailyReport.model, 'action_submit', reportId);
}

// ── إفراج عن محتجزات (ينشئ سجل إفراج) ──
export async function releaseRetention(projectId, percent) {
  const F = MODELS.retentionRelease.fields;
  const payload = {
    [F.project]: projectId,
    [F.date]: new Date().toISOString().slice(0, 10),
    [F.percent]: percent,
  };
  return createRecord(MODELS.retentionRelease.model, payload);
}

// ── إجراءات الضمان ──
export async function guaranteeAction(guaranteeId, action) {
  const map = { release: 'action_release', reactivate: 'action_reactivate' };
  return runAction(MODELS.guarantee.model, map[action] || 'action_release', guaranteeId);
}

// ═══════════════════════════════════════════════════════════════
//  المستندات (تقارير PDF من Odoo)
// ═══════════════════════════════════════════════════════════════
export const REPORTS_LIST = [
  { key: 'claim', name: 'مستخلص أعمال', report: 'pt_construction_lite.report_progress_claim', model: 'claim', cat: 'مالية' },
  { key: 'daily', name: 'تقرير يومي', report: 'pt_construction_lite.report_daily', model: 'dailyReport', cat: 'الموقع' },
  { key: 'guarantee', name: 'ضمان بنكي', report: 'pt_construction_lite.report_guarantee', model: 'guarantee', cat: 'مالية' },
  { key: 'client_statement', name: 'كشف حساب العميل', report: 'pt_construction_lite.report_client_statement', model: 'project', cat: 'مالية' },
  { key: 'sub_statement', name: 'كشف حساب باطن', report: 'pt_construction_lite.report_sub_statement', model: 'subcontract', cat: 'باطن' },
  { key: 'eot', name: 'مطالبة تمديد المدة', report: 'pt_construction_lite.report_eot', model: 'project', cat: 'الموقع' },
  { key: 'boq', name: 'جدول الكميات', report: 'pt_construction_lite.report_boq', model: 'boq', cat: 'تعاقدية' },
  { key: 'retention', name: 'إفراج محتجزات', report: 'pt_construction_lite.report_retention_release', model: 'retentionRelease', cat: 'مالية' },
];

// رابط تنزيل تقرير لسجل محدد
export function getReportUrl(reportName, recordId) {
  return reportUrl(reportName, recordId);
}

// ═══════════════════════════════════════════════════════════════
//  إضافات: الضمانات، المرفقات، الإشعارات، البحث
// ═══════════════════════════════════════════════════════════════

// ── إنشاء ضمان جديد ──
export async function createGuarantee(projectId, values) {
  const F = MODELS.guarantee.fields;
  const payload = {
    [F.project]: projectId,
    [F.type]: values.type || 'performance',
    [F.bank]: values.bank || '',
    [F.number]: values.number || '',
    [F.amount]: values.amount || 0,
    [F.expiry]: values.expiry,       // YYYY-MM-DD إلزامي
    issue_date: values.issueDate || new Date().toISOString().slice(0, 10),
  };
  return createRecord(MODELS.guarantee.model, payload);
}

export const GUARANTEE_TYPES = [
  { key: 'bid', label: 'ابتدائي' },
  { key: 'performance', label: 'نهائي' },
  { key: 'advance', label: 'دفعة مقدمة' },
  { key: 'other', label: 'أخرى' },
];

// ── رفع صورة كمرفق مربوط بسجل (ir.attachment) ──
// base64Data: نص base64 بدون بادئة data:
export async function uploadAttachment(model, recordId, base64Data, filename, mimetype = 'image/jpeg') {
  const modelName = MODELS[model] ? MODELS[model].model : model;
  return createRecord('ir.attachment', {
    name: filename || 'photo.jpg',
    datas: base64Data,
    res_model: modelName,
    res_id: recordId,
    mimetype,
  });
}

// ── الإشعارات: من mail.message على سجلات المستخدم، + تنبيهات مشتقة ──
export async function getNotifications() {
  if (!USE_API) return [];
  const items = [];
  // 1) ضمانات قرب تنتهي — توديك لشاشة الضمانات
  try {
    const gs = await getGuarantees();
    gs.filter((g) => g.daysLeft > 0 && g.daysLeft <= 30).forEach((g) => {
      items.push({
        icon: 'shield',
        title: 'ضمان بنكي ينتهي قريباً',
        body: `${g.title} · بعد ${g.daysLeft} يوماً`,
        target: 'Guarantees',
        model: 'construction.guarantee',
        recordId: g.id || null,
      });
    });
  } catch (e) {}
  // 2) رسائل النظام الأخيرة — فقط على موديلات المقاولات
  try {
    // ربط الموديل بالشاشة المقصودة في التطبيق
    const MODEL_TO_SCREEN = {
      'construction.progress.claim': 'ClaimsTab',
      'construction.daily.report': 'SiteTab',
      'construction.guarantee': 'Guarantees',
      'construction.subcontract': 'Subcontractors',
      'construction.sub.claim': 'Subcontractors',
      'construction.variation.order': 'VariationOrders',
      'construction.boq': 'Boq',
      'construction.retention.release': 'Guarantees',
      'construction.sub.retention.release': 'Subcontractors',
      'project.project': 'HomeTab',
    };
    const CONSTRUCTION_MODELS = Object.keys(MODEL_TO_SCREEN);
    const msgs = await searchRead('mail.message',
      [
        ['message_type', '!=', 'notification'],
        ['model', 'in', CONSTRUCTION_MODELS],
      ],
      ['subject', 'date', 'record_name', 'preview', 'model', 'res_id'],
      { limit: 15, order: 'date desc' });
    msgs.forEach((m) => {
      const body = (m.record_name || m.subject || '').toString();
      if (body) items.push({
        icon: 'bell',
        title: m.subject || 'تحديث',
        body: `${m.record_name || ''} · ${m.date || ''}`,
        target: MODEL_TO_SCREEN[m.model] || null,
        model: m.model,
        recordId: m.res_id || null,
      });
    });
  } catch (e) {}
  return items;
}

// ═══════════════════════════════════════════════════════════════
//  مستخلصات الباطن (construction.sub.claim)
// ═══════════════════════════════════════════════════════════════

// جلب مستخلصات باطن لعقد باطن محدد
export async function getSubClaims(subcontractId) {
  if (!USE_API) return [];
  const F = MODELS.subClaim.fields;
  const SM = MODELS.subClaim.stateMap;
  const rows = await searchRead(
    MODELS.subClaim.model,
    [[F.subcontract, '=', subcontractId]],
    [F.number, F.date, F.period, F.state, F.amountCertified, F.amountPeriod, F.retention, F.advance, F.net]
  );
  return rows.map((r) => ({
    no: r[F.number] || '',
    date: r[F.date] || '',
    period: r[F.period] || '',
    st: SM[r[F.state]] ?? 0,
    stateRaw: r[F.state],
    gross: r[F.amountCertified] || r[F.amountPeriod] || 0,
    ret: r[F.retention] || 0,
    adv: r[F.advance] || 0,
    net: r[F.net] || 0,
    _raw: r,
  }));
}

// إجراء على مستخلص باطن
export async function subClaimAction(claimId, action) {
  const map = {
    submit: 'action_submit',
    certify: 'action_certify',
    bill: 'action_create_bill',
    pay: 'action_mark_paid',
    cancel: 'action_cancel',
  };
  const method = map[action];
  if (!method) throw new Error('إجراء غير معروف');
  return runAction(MODELS.subClaim.model, method, claimId);
}

// الإجراء التالي حسب حالة مستخلص الباطن
export function nextSubClaimAction(stateRaw) {
  const flow = {
    draft: { action: 'submit', label: 'تقديم المستخلص' },
    submitted: { action: 'certify', label: 'اعتماد' },
    certified: { action: 'bill', label: 'إصدار فاتورة المورّد' },
    billed: { action: 'pay', label: 'تسجيل الدفع' },
  };
  return flow[stateRaw] || null;
}

// حالة مستخلص الباطن نصياً
export function subClaimStatusLabel(st) {
  return ['مسودة', 'مقدّم', 'معتمد', 'مفوتر', 'مدفوع'][st] || 'مسودة';
}

// ═══════════════════════════════════════════════════════════════
//  الدشبورد المالي (construction.dashboard)
// ═══════════════════════════════════════════════════════════════
export async function getDashboard(period = 'all') {
  if (!USE_API) return null;
  // دالة @api.model — نستدعيها بدون معرّف سجل
  const data = await callKw('construction.dashboard', 'get_dashboard_data', [period]);
  return data;
}

// ═══════════════════════════════════════════════════════════════
//  أوامر التغيير (construction.variation.order)
// ═══════════════════════════════════════════════════════════════
export async function getVariationOrders(projectId) {
  if (!USE_API) return [];
  const F = MODELS.variationOrder.fields;
  const rows = await searchRead(
    MODELS.variationOrder.model,
    [[F.project, '=', projectId]],
    [F.number, F.date, F.description, F.instructionRef, F.timeExtension, F.billable, F.state, F.amount]
  );
  return rows.map((r) => ({
    no: r[F.number] || '',
    date: r[F.date] || '',
    desc: r[F.description] || '',
    instructionRef: r[F.instructionRef] || '',
    timeExtension: r[F.timeExtension] || 0,
    billable: r[F.billable],
    billableLabel: r[F.billable] === 'client' ? 'على العميل' : 'داخلي',
    state: r[F.state],
    stateLabel: { draft: 'مسودة', submitted: 'مقدّم', approved: 'معتمد', rejected: 'مرفوض' }[r[F.state]] || 'مسودة',
    amount: r[F.amount] || 0,
    _raw: r,
  }));
}

export async function voAction(voId, action) {
  const map = { submit: 'action_submit', approve: 'action_approve', reject: 'action_reject' };
  const method = map[action];
  if (!method) throw new Error('إجراء غير معروف');
  return runAction(MODELS.variationOrder.model, method, voId);
}

export function nextVoAction(state) {
  const flow = {
    draft: [{ action: 'submit', label: 'تقديم', kind: 'primary' }],
    submitted: [{ action: 'approve', label: 'اعتماد', kind: 'primary' }, { action: 'reject', label: 'رفض', kind: 'danger' }],
  };
  return flow[state] || [];
}

// ═══════════════════════════════════════════════════════════════
//  بنود المستخلص + تحميل السطور
// ═══════════════════════════════════════════════════════════════
export async function getClaimLines(claimId) {
  if (!USE_API) return [];
  const F = MODELS.claimLine.fields;
  const rows = await searchRead(
    MODELS.claimLine.model,
    [[F.claim, '=', claimId]],
    [F.itemNo, F.name, F.qtyContract, F.qtyPrevious, F.qtyPeriod, F.qtyCertified, F.amountCertified]
  );
  return rows.map((r) => ({
    itemNo: r[F.itemNo] || '',
    name: r[F.name] || '',
    qtyContract: r[F.qtyContract] || 0,
    qtyPrevious: r[F.qtyPrevious] || 0,
    qtyPeriod: r[F.qtyPeriod] || 0,
    qtyCertified: r[F.qtyCertified] || 0,
    amount: r[F.amountCertified] || 0,
  }));
}

// تحميل سطور المستخلص من BOQ (إلزامي قبل التقديم)
export async function loadClaimLines(claimId) {
  return runAction(MODELS.claim.model, 'action_load_lines', claimId);
}

// إجراءات الضمان
export async function guaranteeReleaseAction(guaranteeId, action) {
  const map = { release: 'action_release', reactivate: 'action_reactivate' };
  return runAction(MODELS.guarantee.model, map[action] || 'action_release', guaranteeId);
}

export const WEATHER_OPTIONS = [
  { key: 'sunny', label: 'مشمس' },
  { key: 'cloudy', label: 'غائم' },
  { key: 'rainy', label: 'ممطر' },
  { key: 'dusty', label: 'غبار' },
  { key: 'hot', label: 'حرارة شديدة' },
];

// ═══════════════════════════════════════════════════════════════
//  جدول الكميات (BOQ) — بنود وإدخال كميات الفترة
// ═══════════════════════════════════════════════════════════════

// جلب قوائم BOQ للمشروع
export async function getBoqs(projectId) {
  if (!USE_API) return [];
  const F = MODELS.boq.fields;
  const rows = await searchRead(
    MODELS.boq.model,
    [[F.project, '=', projectId]],
    [F.name, F.progress, F.amountTotal, F.amountExecuted, F.state]
  );
  return rows.map((r) => ({
    id: r.id,
    name: r[F.name] || '',
    progress: Math.round(r[F.progress] || 0),
    total: r[F.amountTotal] || 0,
    executed: r[F.amountExecuted] || 0,
    state: r[F.state],
    _raw: r,
  }));
}

// جلب بنود BOQ محدد
export async function getBoqLines(boqId) {
  if (!USE_API) return [];
  const F = MODELS.boqLine.fields;
  const rows = await searchRead(
    MODELS.boqLine.model,
    [[F.boq, '=', boqId]],
    [F.itemNo, F.name, F.qtyContract, F.qtyExecuted, 'qty_period', 'qty_remaining', F.progress, F.uom, 'price_unit']
  );
  return rows.map((r) => ({
    id: r.id,
    itemNo: r[F.itemNo] || '',
    name: r[F.name] || '',
    qtyContract: r[F.qtyContract] || 0,
    qtyExecuted: r[F.qtyExecuted] || 0,
    qtyPeriod: r.qty_period || 0,
    qtyRemaining: r.qty_remaining || 0,
    progress: Math.round(r[F.progress] || 0),
    uom: Array.isArray(r[F.uom]) ? r[F.uom][1] : '',
    priceUnit: r.price_unit || 0,
    _raw: r,
  }));
}

// تعديل كمية الفترة لبند
export async function setBoqLinePeriodQty(lineId, qty) {
  return writeRecord(MODELS.boqLine.model, lineId, { qty_period: qty });
}

// إنشاء مستخلص جديد من BOQ (يحمّل الكميات تلقائياً)
export async function newClaimFromBoq(boqId) {
  return runAction(MODELS.boq.model, 'action_new_claim', boqId);
}

// ═══════════════════════════════════════════════════════════════
//  متابعة الإفراج عن المحتجزات (فوترة/تحصيل)
// ═══════════════════════════════════════════════════════════════

// جلب سجلات الإفراج للمشروع
export async function getRetentionReleases(projectId) {
  if (!USE_API) return [];
  const F = MODELS.retentionRelease.fields;
  const rows = await searchRead(
    MODELS.retentionRelease.model,
    [[F.project, '=', projectId]],
    [F.name, F.date, F.type, F.percent, F.amount, F.balance, F.state]
  );
  const stateLabels = { draft: 'مسودة', invoiced: 'مفوتر', collected: 'محصّل', cancelled: 'ملغى' };
  return rows.map((r) => ({
    no: r[F.name] || '',
    date: r[F.date] || '',
    percent: r[F.percent] || 0,
    amount: r[F.amount] || 0,
    state: r[F.state],
    stateLabel: stateLabels[r[F.state]] || r[F.state] || 'مسودة',
    _raw: r,
  }));
}

// إجراء على سجل إفراج
export async function retentionReleaseAction(releaseId, action) {
  const map = { invoice: 'action_create_invoice', collect: 'action_mark_collected', cancel: 'action_cancel' };
  const method = map[action];
  if (!method) throw new Error('إجراء غير معروف');
  return runAction(MODELS.retentionRelease.model, method, releaseId);
}

export function nextRetentionAction(state) {
  const flow = {
    draft: { action: 'invoice', label: 'إصدار الفاتورة' },
    invoiced: { action: 'collect', label: 'تسجيل التحصيل' },
  };
  return flow[state] || null;
}

// ═══════════════════════════════════════════════════════════════
//  محتجزات الباطن (construction.sub.retention.release)
// ═══════════════════════════════════════════════════════════════
export async function getSubRetentions(subcontractId) {
  if (!USE_API) return [];
  const F = MODELS.subRetention.fields;
  const stateLabels = { draft: 'مسودة', billed: 'مفوتر', paid: 'مدفوع', cancelled: 'ملغى' };
  const rows = await searchRead(
    MODELS.subRetention.model,
    [[F.subcontract, '=', subcontractId]],
    [F.name, F.date, F.percent, F.amount, F.balance, F.state]
  );
  return rows.map((r) => ({
    no: r[F.name] || '',
    date: r[F.date] || '',
    percent: r[F.percent] || 0,
    amount: r[F.amount] || 0,
    balance: r[F.balance] || 0,
    state: r[F.state],
    stateLabel: stateLabels[r[F.state]] || r[F.state] || 'مسودة',
    _raw: r,
  }));
}

// إنشاء إفراج محتجزات باطن
export async function createSubRetention(subcontractId, percent) {
  const F = MODELS.subRetention.fields;
  return createRecord(MODELS.subRetention.model, {
    [F.subcontract]: subcontractId,
    [F.date]: new Date().toISOString().slice(0, 10),
    [F.percent]: percent,
  });
}

// إجراء على محتجز باطن
export async function subRetentionAction(releaseId, action) {
  const map = { bill: 'action_create_bill', pay: 'action_mark_paid', cancel: 'action_cancel' };
  const method = map[action];
  if (!method) throw new Error('إجراء غير معروف');
  return runAction(MODELS.subRetention.model, method, releaseId);
}

export function nextSubRetentionAction(state) {
  const flow = {
    draft: { action: 'bill', label: 'إصدار فاتورة المورّد' },
    billed: { action: 'pay', label: 'تسجيل الدفع' },
  };
  return flow[state] || null;
}

// بنود مستخلص الباطن
export async function getSubClaimLines(claimId) {
  if (!USE_API) return [];
  const F = MODELS.subClaimLine.fields;
  const rows = await searchRead(
    MODELS.subClaimLine.model,
    [[F.claim, '=', claimId]],
    [F.itemNo, F.name, F.qtyPeriod, F.qtyCertified, F.amountCertified]
  );
  return rows.map((r) => ({
    itemNo: r[F.itemNo] || '',
    name: r[F.name] || '',
    qtyPeriod: r[F.qtyPeriod] || 0,
    qtyCertified: r[F.qtyCertified] || 0,
    amount: r[F.amountCertified] || 0,
  }));
}

// ═══════════════════════════════════════════════════════════════
//  أوامر الشراء (purchase.order)
// ═══════════════════════════════════════════════════════════════
export async function getPurchaseOrders(projectId) {
  if (!USE_API) return [];
  const F = MODELS.purchaseOrder.fields;
  const stateLabels = { draft: 'طلب عرض', sent: 'مُرسل', purchase: 'مؤكّد', done: 'مغلق', cancel: 'ملغى' };
  const rows = await searchRead(
    MODELS.purchaseOrder.model,
    [[F.project, '=', projectId]],
    [F.name, F.partner, F.date, F.amount, F.state]
  );
  return rows.map((r) => ({
    no: r[F.name] || '',
    partner: Array.isArray(r[F.partner]) ? r[F.partner][1] : '',
    date: r[F.date] ? String(r[F.date]).slice(0, 10) : '',
    amount: r[F.amount] || 0,
    state: r[F.state],
    stateLabel: stateLabels[r[F.state]] || r[F.state] || '',
    _raw: r,
  }));
}

// جلب الموردين (partner المورّد)
export async function getSuppliers() {
  if (!USE_API) return [];
  const rows = await searchRead('res.partner',
    [['supplier_rank', '>', 0]],
    ['name'], { limit: 50, order: 'name asc' });
  // لو ما فيه موردين محددين، اجلب كل شركاء الشركات
  if (!rows.length) {
    const all = await searchRead('res.partner', [['is_company', '=', true]], ['name'], { limit: 50 });
    return all.map((r) => ({ id: r.id, name: r.name }));
  }
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

// إنشاء أمر شراء جديد (مسودة) مربوط بالمشروع
export async function createPurchaseOrder(projectId, supplierId, lines) {
  const F = MODELS.purchaseOrder.fields;
  // البنود: [{name, qty, price}]
  const orderLines = (lines || []).map((ln) => [0, 0, {
    name: ln.name || 'بند',
    product_qty: ln.qty || 1,
    price_unit: ln.price || 0,
    date_planned: new Date().toISOString().slice(0, 10) + ' 00:00:00',
  }]);
  const payload = {
    [F.partner]: supplierId,
    [F.project]: projectId,
  };
  if (orderLines.length) payload.order_line = orderLines;
  return createRecord(MODELS.purchaseOrder.model, payload);
}

// إجراء على أمر شراء
export async function purchaseOrderAction(orderId, action) {
  const map = { confirm: 'button_confirm', cancel: 'button_cancel', draft: 'button_draft' };
  const method = map[action];
  if (!method) throw new Error('إجراء غير معروف');
  return runAction(MODELS.purchaseOrder.model, method, orderId);
}

export function nextPurchaseActions(state) {
  const flow = {
    draft: [{ action: 'confirm', label: 'تأكيد الأمر', kind: 'primary' }, { action: 'cancel', label: 'إلغاء', kind: 'danger' }],
    sent: [{ action: 'confirm', label: 'تأكيد الأمر', kind: 'primary' }, { action: 'cancel', label: 'إلغاء', kind: 'danger' }],
    purchase: [{ action: 'cancel', label: 'إلغاء', kind: 'danger' }],
  };
  return flow[state] || [];
}

// ═══════════════════════════════════════════════════════════════
//  البحث الشامل — يبحث في كل الموديلات
// ═══════════════════════════════════════════════════════════════
export async function globalSearch(term) {
  if (!USE_API || !term || !term.trim()) return [];
  const q = term.trim();
  const results = [];

  // helper: بحث آمن في موديل
  const safeSearch = async (model, domain, fields, mapper, category) => {
    try {
      const rows = await searchRead(model, domain, fields, { limit: 15 });
      rows.forEach((r) => results.push({ ...mapper(r), category }));
    } catch (e) {}
  };

  // المشاريع
  await safeSearch(
    MODELS.project.model,
    ['&', ['is_construction', '=', true], '|', ['name', 'ilike', q], ['code', 'ilike', q]],
    ['name', 'code'],
    (r) => ({ id: r.id, title: r.name || '', sub: r.code || '', icon: 'briefcase', target: 'project' }),
    'مشاريع'
  );

  // المستخلصات
  await safeSearch(
    MODELS.claim.model,
    [['name', 'ilike', q]],
    ['name', 'project_id', 'amount_certified'],
    (r) => ({ id: r.id, title: `مستخلص ${r.name || ''}`, sub: Array.isArray(r.project_id) ? r.project_id[1] : '', icon: 'file-text', target: 'claim', projectId: Array.isArray(r.project_id) ? r.project_id[0] : null }),
    'مستخلصات'
  );

  // التقارير اليومية
  await safeSearch(
    MODELS.dailyReport.model,
    ['|', ['name', 'ilike', q], ['work_done', 'ilike', q]],
    ['name', 'date', 'project_id'],
    (r) => ({ id: r.id, title: `تقرير ${r.date || r.name || ''}`, sub: Array.isArray(r.project_id) ? r.project_id[1] : '', icon: 'clipboard', target: 'report', projectId: Array.isArray(r.project_id) ? r.project_id[0] : null }),
    'تقارير يومية'
  );

  // الضمانات
  await safeSearch(
    MODELS.guarantee.model,
    ['|', '|', ['name', 'ilike', q], ['guarantee_number', 'ilike', q], ['bank_name', 'ilike', q]],
    ['name', 'guarantee_number', 'bank_name', 'amount', 'project_id'],
    (r) => ({ id: r.id, title: r.guarantee_number || r.name || 'ضمان', sub: r.bank_name || '', icon: 'shield', target: 'guarantee', projectId: Array.isArray(r.project_id) ? r.project_id[0] : null }),
    'ضمانات'
  );

  // مقاولو الباطن
  await safeSearch(
    MODELS.subcontract.model,
    ['|', ['name', 'ilike', q], ['partner_id', 'ilike', q]],
    ['name', 'partner_id', 'project_id'],
    (r) => ({ id: r.id, title: r.name || 'عقد باطن', sub: Array.isArray(r.partner_id) ? r.partner_id[1] : '', icon: 'users', target: 'subcontract', projectId: Array.isArray(r.project_id) ? r.project_id[0] : null }),
    'مقاولو الباطن'
  );

  // أوامر التغيير
  await safeSearch(
    MODELS.variationOrder.model,
    ['|', ['name', 'ilike', q], ['description', 'ilike', q]],
    ['name', 'description', 'project_id'],
    (r) => ({ id: r.id, title: `أمر تغيير ${r.name || ''}`, sub: (r.description || '').slice(0, 40), icon: 'file-plus', target: 'vo', projectId: Array.isArray(r.project_id) ? r.project_id[0] : null }),
    'أوامر التغيير'
  );

  // أوامر الشراء
  await safeSearch(
    MODELS.purchaseOrder.model,
    ['|', ['name', 'ilike', q], ['partner_id', 'ilike', q]],
    ['name', 'partner_id', 'amount_total', 'construction_project_id'],
    (r) => ({ id: r.id, title: r.name || 'أمر شراء', sub: Array.isArray(r.partner_id) ? r.partner_id[1] : '', icon: 'shopping-cart', target: 'purchase', projectId: Array.isArray(r.construction_project_id) ? r.construction_project_id[0] : null }),
    'أوامر الشراء'
  );

  return results;
}

// ═══════════════════════════════════════════════════════════════
//  التحقق من باركود الشركة
// ═══════════════════════════════════════════════════════════════

// يتحقق أن الباركود يخص شركة موجودة، ويرجّع بياناتها
export async function verifyCompanyBarcode(barcode) {
  if (!USE_API) {
    // وضع العرض: أي باركود يُقبل
    return { valid: true, companyId: null, companyName: 'وضع العرض' };
  }
  if (!barcode || !barcode.trim()) {
    return { valid: false, error: 'الباركود فارغ.' };
  }
  try {
    const rows = await searchRead(
      'res.company',
      [['company_barcode', '=', barcode.trim()]],
      ['name', 'company_barcode'],
      { limit: 1 }
    );
    if (rows && rows.length) {
      return { valid: true, companyId: rows[0].id, companyName: rows[0].name || '' };
    }
    return { valid: false, error: 'الباركود غير مرتبط بأي شركة. تأكد من مسح باركود الشركة الصحيح.' };
  } catch (e) {
    return { valid: false, error: e.message || 'تعذّر التحقق من الباركود.' };
  }
}

// يتحقق أن المستخدم (بعد الدخول) تابع للشركة التي تم مسح باركودها
export async function verifyUserCompany(expectedCompanyId) {
  if (!USE_API || expectedCompanyId == null) return { ok: true };
  try {
    const cu = getCurrentUser();
    // اجلب شركة المستخدم من res.users
    const uid = cu && cu.uid;
    if (!uid) return { ok: true }; // لا نقدر نتحقق، نسمح
    const users = await callKw('res.users', 'read', [[uid], ['company_id', 'company_ids']]);
    if (users && users[0]) {
      const u = users[0];
      const mainCompany = Array.isArray(u.company_id) ? u.company_id[0] : null;
      const allowed = Array.isArray(u.company_ids) ? u.company_ids : [];
      // المستخدم مقبول لو الشركة المتوقعة = شركته الرئيسية أو ضمن شركاته
      if (mainCompany === expectedCompanyId || allowed.includes(expectedCompanyId)) {
        return { ok: true };
      }
      return { ok: false, error: 'هذا الحساب لا ينتمي إلى الشركة التي تم مسح باركودها.' };
    }
    return { ok: true };
  } catch (e) {
    // في حال فشل التحقق، نسمح (عشان ما نعلّق المستخدم)
    return { ok: true };
  }
}

// ═══════════════════════════════════════════════════════════════
//  بيانات الموظف (hr.employee) المرتبط بالمستخدم
// ═══════════════════════════════════════════════════════════════
export async function getEmployeeInfo() {
  if (!USE_API) return null;
  try {
    const cu = getCurrentUser();
    const uid = cu && cu.uid;
    if (!uid) return null;

    // ابحث عن الموظف المرتبط بالمستخدم
    const fields = [
      'name', 'birthday', 'gender', 'marital',
      'identification_id', 'registration_number', 'country_id',
      'job_title', 'job_id', 'department_id', 'work_location_id',
      'parent_id', 'mobile_phone', 'work_phone', 'work_email',
    ];
    let emp = null;
    try {
      const rows = await searchRead('hr.employee', [['user_id', '=', uid]], fields, { limit: 1 });
      if (rows && rows.length) emp = rows[0];
    } catch (e) {}

    // احتياطي: ابحث بالبريد لو ما لقينا بالربط
    if (!emp && cu.email) {
      try {
        const rows = await searchRead('hr.employee', [['work_email', '=', cu.email]], fields, { limit: 1 });
        if (rows && rows.length) emp = rows[0];
      } catch (e) {}
    }

    if (!emp) return null;

    const rel = (v) => (Array.isArray(v) ? v[1] : '');
    const genderMap = { male: 'ذكر', female: 'أنثى', other: 'آخر' };
    const maritalMap = {
      single: 'أعزب', married: 'متزوج', cohabitant: 'شريك',
      widower: 'أرمل', divorced: 'مطلّق',
    };

    // تاريخ المباشرة — من العقد إن وُجد
    let hireDate = '';
    try {
      const contracts = await searchRead(
        'hr.contract',
        [['employee_id', '=', emp.id]],
        ['date_start'],
        { limit: 1, order: 'date_start asc' }
      );
      if (contracts && contracts.length) hireDate = contracts[0].date_start || '';
    } catch (e) {}

    return {
      name: emp.name || '',
      birthday: emp.birthday || '',
      gender: genderMap[emp.gender] || emp.gender || '',
      marital: maritalMap[emp.marital] || emp.marital || '',
      jobNumber: emp.registration_number || emp.identification_id || '',
      idNumber: emp.identification_id || '',
      nationality: rel(emp.country_id),
      jobTitle: emp.job_title || rel(emp.job_id),
      department: rel(emp.department_id),
      location: rel(emp.work_location_id),
      manager: rel(emp.parent_id),
      hireDate,
      mobile: emp.mobile_phone || emp.work_phone || '',
      email: emp.work_email || '',
    };
  } catch (e) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
//  مواقع المشاريع (للخريطة) — من site_latitude/site_longitude
// ═══════════════════════════════════════════════════════════════
export async function getProjectLocations() {
  if (!USE_API) {
    // وضع العرض: مواقع تجريبية بالرياض
    return [
      { id: 1, name: 'مشروع تجريبي', latitude: 24.7136, longitude: 46.6753, customer: 'عميل', city: 'الرياض' },
    ];
  }
  try {
    const rows = await searchRead(
      MODELS.project.model,
      MODELS.project.domain || [],
      ['name', 'site_latitude', 'site_longitude', 'site_partner_id', 'partner_id'],
      { order: 'id asc', limit: 200 }
    );
    return (rows || [])
      .map((r) => ({
        id: r.id,
        name: r.name || '',
        latitude: r.site_latitude || 0,
        longitude: r.site_longitude || 0,
        site: Array.isArray(r.site_partner_id) ? r.site_partner_id[1] : '',
        customer: Array.isArray(r.partner_id) ? r.partner_id[1] : '',
      }))
      // فقط المشاريع اللي لها إحداثيات صحيحة
      .filter((p) => p.latitude && p.longitude && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180);
  } catch (e) {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
//  تعديل بيانات المستخدم (الاسم، الإيميل، كلمة السر) مع أمان
// ═══════════════════════════════════════════════════════════════
export async function updateUserProfile({ name, email, password, currentPassword }) {
  if (!USE_API) return { ok: true };
  try {
    const cu = getCurrentUser();
    const uid = cu && cu.uid;
    if (!uid) return { ok: false, error: 'لا يوجد مستخدم مسجّل.' };

    // أمان: عند تغيير كلمة السر، تحقّق من الحالية أولاً
    if (password && password.trim()) {
      if (!currentPassword || !currentPassword.trim()) {
        return { ok: false, error: 'أدخل كلمة السر الحالية لتغييرها.' };
      }
      const okPass = await verifyPassword(cu.email || cu.username, currentPassword.trim());
      if (!okPass) {
        return { ok: false, error: 'كلمة السر الحالية غير صحيحة.' };
      }
    }

    const vals = {};
    if (name && name.trim()) vals.name = name.trim();
    if (email && email.trim()) {
      vals.email = email.trim();
      vals.login = email.trim();
    }
    if (password && password.trim()) vals.password = password.trim();

    if (Object.keys(vals).length === 0) {
      return { ok: false, error: 'لا يوجد تغيير للحفظ.' };
    }

    await callKw('res.users', 'write', [[uid], vals]);
    if (vals.name) cu.name = vals.name;
    if (vals.email) cu.email = vals.email;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'تعذّر حفظ التعديلات.' };
  }
}

// ═══════════════════════════════════════════════════════════════
//  صلاحيات المستخدم الفعلية من Odoo (تنعكس على واجهة التطبيق)
// ═══════════════════════════════════════════════════════════════
// الموديلات التي نتحقق من صلاحياتها
const PERM_MODELS = {
  project: 'project.project',
  claim: 'construction.progress.claim',
  dailyReport: 'construction.daily.report',
  guarantee: 'construction.guarantee',
  subcontract: 'construction.subcontract',
  subclaim: 'construction.sub.claim',
  vo: 'construction.variation.order',
  purchase: 'purchase.order',
  boq: 'construction.boq',
  retention: 'construction.retention.release',
  subRetention: 'construction.sub.retention.release',
  tender: 'crm.lead',
  workCategory: 'construction.work.category',
  indirectCost: 'construction.indirect.cost',
};

// يقرأ صلاحيات (read/write/create/unlink) لكل موديل من Odoo
export async function getUserPermissions() {
  if (!USE_API) {
    // وضع العرض: اسمح بكل شي
    const allowAll = {};
    Object.keys(PERM_MODELS).forEach((k) => {
      allowAll[k] = { read: true, write: true, create: true, unlink: true };
    });
    return allowAll;
  }

  const perms = {};
  const ops = ['read', 'write', 'create', 'unlink'];
  for (const [key, model] of Object.entries(PERM_MODELS)) {
    perms[key] = {};
    for (const op of ops) {
      // Odoo 19: has_access (الأحدث) — نجرّبه أولاً، ثم البدائل الأقدم
      let result = null;
      // 1) has_access(operation) — Odoo 18/19
      try {
        const ok = await callKw(model, 'has_access', [op]);
        result = !!ok;
      } catch (e1) {
        // 2) check_access_rights(operation, raise_exception=false) — Odoo ≤17
        try {
          const ok = await callKw(model, 'check_access_rights', [op, false]);
          result = !!ok;
        } catch (e2) {
          result = null; // كلاهما فشل
        }
      }
      // fallback آمن: عند فشل التحقق، امنع (read يبقى مسموح لتفادي تعطيل العرض)
      if (result === null) {
        perms[key][op] = (op === 'read');
      } else {
        perms[key][op] = result;
      }
    }
  }
  return perms;
}

// ═══════════════════════════════════════════════════════════════
//  تنزيل تقرير PDF مباشرة (بدون فتح المتصفح)
// ═══════════════════════════════════════════════════════════════
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getSessionId } from './odoo';

export async function downloadReport(reportName, recordId, fileLabel = 'document') {
  const sid = getSessionId();
  let url = reportUrl(reportName, recordId);
  // مرّر الجلسة في الرابط (RN يتجاهل Cookie header)
  if (sid) url += `?session_id=${encodeURIComponent(sid)}`;
  // اسم ملف آمن
  const safe = `${fileLabel}_${recordId}.pdf`.replace(/[^\w.-]/g, '_');
  const target = FileSystem.cacheDirectory + safe;
  try {
    // نزّل الملف (نمرّر الجلسة في الهيدر أيضاً كطبقة إضافية)
    const res = await FileSystem.downloadAsync(url, target, {
      headers: sid ? { Cookie: `session_id=${sid}`, 'X-Openerp-Session-Id': sid } : {},
    });
    if (res && res.status === 200) {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
        return { ok: true };
      }
      return { ok: true, uri: res.uri };
    }
    return { ok: false, error: `تعذّر تنزيل الملف (رمز ${res ? res.status : '؟'}).` };
  } catch (e) {
    return { ok: false, error: e.message || 'تعذّر تنزيل الملف.' };
  }
}

// ═══════════════════════════════════════════════════════════════
//  العطاءات / التسعير (crm.lead) + فئات الأعمال + التكاليف غير المباشرة
// ═══════════════════════════════════════════════════════════════

// قائمة العطاءات (الفرص التي لها BOQ تقديري)
export async function getTenders() {
  if (!USE_API) {
    return [
      { id: 1, name: 'عطاء مبنى إداري', partner: 'وزارة الإسكان', stage: 'تسعير',
        directCost: 850000, margin: 15, indirectPercent: 8, sellingTotal: 1060000 },
    ];
  }
  try {
    const rows = await searchRead('crm.lead',
      [['boq_ids', '!=', false]],
      ['name', 'partner_id', 'stage_id', 'expected_revenue',
       'margin_percent', 'boq_amount_cost', 'boq_amount_total',
       'boq_indirect_percent', 'boq_count'],
      { order: 'id desc', limit: 100 });
    return (rows || []).map((r) => ({
      id: r.id,
      name: r.name || '',
      partner: Array.isArray(r.partner_id) ? r.partner_id[1] : '',
      stage: Array.isArray(r.stage_id) ? r.stage_id[1] : '',
      directCost: r.boq_amount_cost || 0,
      sellingTotal: r.boq_amount_total || 0,
      margin: r.margin_percent || 0,
      indirectPercent: r.boq_indirect_percent || 0,
      boqCount: r.boq_count || 0,
    }));
  } catch (e) {
    return [];
  }
}

// تفاصيل عطاء واحد: بياناته + بنود BOQ التقديري + التكاليف غير المباشرة
export async function getTenderDetail(leadId) {
  if (!USE_API || !leadId) return null;
  try {
    const leads = await callKw('crm.lead', 'read', [[leadId],
      ['name', 'partner_id', 'margin_percent', 'boq_amount_cost',
       'boq_amount_total', 'boq_indirect_percent', 'estimation_boq_id',
       'indirect_cost_ids', 'boq_line_ids',
       'indirect_percent_total', 'indirect_fixed_total']]);
    if (!leads || !leads[0]) return null;
    const l = leads[0];

    // بنود جدول الكميات التقديري
    let lines = [];
    if (Array.isArray(l.boq_line_ids) && l.boq_line_ids.length) {
      const raw = await callKw('construction.boq.line', 'read',
        [l.boq_line_ids, ['name', 'category_id', 'uom_id', 'qty_contract',
          'cost_unit', 'price_unit', 'amount_contract']]);
      lines = (raw || []).map((b) => ({
        id: b.id,
        name: b.name || '',
        category: Array.isArray(b.category_id) ? b.category_id[1] : '',
        unit: Array.isArray(b.uom_id) ? b.uom_id[1] : '',
        qty: b.qty_contract || 0,
        costUnit: b.cost_unit || 0,
        priceUnit: b.price_unit || 0,
        amount: b.amount_contract || 0,
      }));
    }

    // التكاليف غير المباشرة
    let indirects = [];
    if (Array.isArray(l.indirect_cost_ids) && l.indirect_cost_ids.length) {
      const raw = await callKw('construction.indirect.cost', 'read',
        [l.indirect_cost_ids, ['name', 'cost_type', 'value', 'note']]);
      indirects = (raw || []).map((c) => ({
        id: c.id,
        name: c.name || '',
        type: c.cost_type === 'percent' ? 'نسبة' : 'مبلغ ثابت',
        typeRaw: c.cost_type,
        value: c.value || 0,
        note: c.note || '',
      }));
    }

    return {
      id: l.id,
      name: l.name || '',
      partner: Array.isArray(l.partner_id) ? l.partner_id[1] : '',
      margin: l.margin_percent || 0,
      directCost: l.boq_amount_cost || 0,
      sellingTotal: l.boq_amount_total || 0,
      indirectPercent: l.boq_indirect_percent || 0,
      indirectPercentTotal: l.indirect_percent_total || 0,
      indirectFixedTotal: l.indirect_fixed_total || 0,
      lines,
      indirects,
    };
  } catch (e) {
    return null;
  }
}

// فئات الأعمال
export async function getWorkCategories() {
  if (!USE_API) {
    return [
      { id: 1, name: 'أعمال الحفر', code: 'EXC', color: 1 },
      { id: 2, name: 'أعمال الخرسانة', code: 'CON', color: 4 },
      { id: 3, name: 'التشطيبات', code: 'FIN', color: 10 },
    ];
  }
  try {
    const rows = await searchRead('construction.work.category',
      [['active', '=', true]],
      ['name', 'code', 'color', 'sequence'],
      { order: 'sequence, name', limit: 100 });
    return (rows || []).map((r) => ({
      id: r.id,
      name: r.name || '',
      code: r.code || '',
      color: r.color || 0,
    }));
  } catch (e) {
    return [];
  }
}
