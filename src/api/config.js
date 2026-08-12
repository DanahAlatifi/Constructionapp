// ═══════════════════════════════════════════════════════════════
//  إعدادات الربط مع Odoo — موديول pt_construction_lite (19.0)
// ═══════════════════════════════════════════════════════════════
//  الرابط والقاعدة يُقرآن من الباركود (QR) الذي يمسحه المستخدم.
//  القيم أدناه مجرد "افتراضي احتياطي" يُستخدم قبل مسح أي باركود.
// ═══════════════════════════════════════════════════════════════

// إعدادات الاتصال — قابلة للتحديث من الباركود وقت التشغيل
// إعدادات الاتصال — تأتي بالكامل من الباركود (QR) الذي يمسحه المستخدم
// لا توجد أي قيم ثابتة — بدون باركود لا يوجد اتصال.
const runtimeConfig = {
  url: '',
  db: '',
};

// getters — تُستخدم في كل مكان بدل الثوابت
export function getOdooUrl() { return runtimeConfig.url; }
export function getOdooDb() { return runtimeConfig.db; }

// ضبط الإعدادات من الباركود (يُستدعى بعد المسح)
export function setOdooConfig({ url, db }) {
  if (url && typeof url === 'string') runtimeConfig.url = url.trim().replace(/\/+$/, '');
  if (db && typeof db === 'string') runtimeConfig.db = db.trim();
}

// الربط الحقيقي: true = يقرأ من Odoo | false = بيانات وهمية
export const USE_API = true;

// ═══════════════════════════════════════════════════════════════
//  الموديلات والحقول — مستخرجة فعلياً من موديول pt_construction_lite
// ═══════════════════════════════════════════════════════════════
export const MODELS = {
  project: {
    model: 'project.project',
    domain: [['is_construction', '=', true]],
    fields: {
      name: 'name',
      contractAmount: 'contract_amount',
      retentionPercent: 'retention_percent',
      advancePercent: 'advance_percent',
      certifiedTotal: 'certified_total',
      retentionHeld: 'retention_held',
      retentionReleased: 'retention_released',
      retentionBalance: 'retention_balance',
      advanceRecovered: 'advance_recovered',
      contractDate: 'contract_date',
      endDate: 'construction_end_date',
      durationDays: 'construction_duration_days',
      claimCount: 'claim_count',
      guaranteeCount: 'guarantee_count',
      dailyReportCount: 'daily_report_count',
      saleOrderId: 'sale_order_id',
      image: 'project_image',
    },
  },

  claim: {
    model: 'construction.progress.claim',
    fields: {
      number: 'name',
      project: 'project_id',
      date: 'date',
      period: 'period_label',
      state: 'state',
      amountCertified: 'amount_certified',
      amountPeriod: 'amount_period',
      retention: 'retention_amount',
      advance: 'advance_recovery_amount',
      net: 'net_amount',
      daysPending: 'days_pending',
    },
    // خريطة الحالة → فهرس المراحل في التطبيق
    stateMap: { draft: 0, submitted: 1, certified: 2, invoiced: 3, collected: 4, cancelled: 0 },
  },

  dailyReport: {
    model: 'construction.daily.report',
    fields: {
      project: 'project_id',
      date: 'date',
      engineer: 'engineer_id',
      manpower: 'manpower_count',
      works: 'work_done',
      obstacles: 'obstacles',
      hasObstacles: 'has_obstacles',
      progress: 'snapshot_progress',
      daysElapsed: 'snapshot_days_elapsed',
      daysRemaining: 'snapshot_days_remaining',
      timePercent: 'snapshot_time_percent',
      scheduleFlag: 'snapshot_schedule_flag',
      executedUnclaimed: 'snapshot_executed_unclaimed',
    },
  },

  guarantee: {
    model: 'construction.guarantee',
    fields: {
      title: 'name',
      type: 'guarantee_type',
      project: 'project_id',
      bank: 'bank_name',
      number: 'guarantee_number',
      amount: 'amount',
      issueDate: 'issue_date',
      expiry: 'expiry_date',
      state: 'state',
    },
    stateMap: { active: 'ساري', released: 'مُفرج', expired: 'منتهٍ' },
  },

  subcontract: {
    model: 'construction.subcontract',
    fields: {
      name: 'name',
      project: 'project_id',
      partner: 'partner_id',
      date: 'date',
      state: 'state',
      total: 'amount_total',
      executed: 'amount_executed',
      certified: 'certified_total',
      retentionHeld: 'retention_held',
      retentionBalance: 'retention_balance',
      advanceRecovered: 'advance_recovered',
    },
    stateMap: { draft: 'مسودة', confirmed: 'ساري', closed: 'مغلق' },
  },

  subClaim: {
    model: 'construction.sub.claim',
    fields: {
      number: 'name',
      subcontract: 'subcontract_id',
      project: 'project_id',
      partner: 'partner_id',
      date: 'date',
      period: 'period_label',
      state: 'state',
      amountPeriod: 'amount_period',
      amountCertified: 'amount_certified',
      retention: 'retention_amount',
      advance: 'advance_recovery_amount',
      net: 'net_amount',
    },
    stateMap: { draft: 0, submitted: 1, certified: 2, billed: 3, paid: 4, cancelled: 0 },
  },

  claimLine: {
    model: 'construction.claim.line',
    fields: {
      claim: 'claim_id',
      itemNo: 'item_no',
      name: 'name',
      qtyContract: 'qty_contract',
      qtyPrevious: 'qty_previous',
      qtyPeriod: 'qty_period',
      qtyCertified: 'qty_certified',
      amountCertified: 'amount_certified',
    },
  },

  variationOrder: {
    model: 'construction.variation.order',
    fields: {
      number: 'name',
      project: 'project_id',
      boq: 'boq_id',
      date: 'date',
      description: 'description',
      instructionRef: 'instruction_ref',
      timeExtension: 'time_extension_days',
      billable: 'billable',
      state: 'state',
      amount: 'amount_total',
    },
    stateMap: { draft: 0, submitted: 1, approved: 2, rejected: 3 },
  },

  purchaseOrder: {
    model: 'purchase.order',
    fields: {
      name: 'name',
      project: 'construction_project_id',
      partner: 'partner_id',
      date: 'date_order',
      amount: 'amount_total',
      state: 'state',
    },
    stateMap: { draft: 0, sent: 1, purchase: 2, done: 3, cancel: 4 },
  },

  subClaimLine: {
    model: 'construction.sub.claim.line',
    fields: {
      claim: 'claim_id',
      itemNo: 'item_no',
      name: 'name',
      qtyPeriod: 'qty_period',
      qtyCertified: 'qty_certified',
      amountCertified: 'amount_certified',
    },
  },

  subRetention: {
    model: 'construction.sub.retention.release',
    fields: {
      name: 'name',
      subcontract: 'subcontract_id',
      project: 'project_id',
      date: 'date',
      percent: 'release_percent',
      amount: 'amount',
      balance: 'retention_balance',
      state: 'state',
    },
  },

  boq: {
    model: 'construction.boq',
    fields: {
      name: 'name',
      project: 'project_id',
      progress: 'progress',
      amountTotal: 'amount_total',
      amountExecuted: 'amount_executed',
      marginPercent: 'margin_percent',
      state: 'state',
    },
  },

  boqLine: {
    model: 'construction.boq.line',
    fields: {
      boq: 'boq_id',
      itemNo: 'item_no',
      name: 'name',
      uom: 'uom_id',
      qtyContract: 'qty_contract',
      qtyExecuted: 'qty_executed',
      progress: 'progress',
    },
  },

  retentionRelease: {
    model: 'construction.retention.release',
    fields: {
      name: 'name',
      project: 'project_id',
      date: 'date',
      type: 'release_type',
      percent: 'release_percent',
      amount: 'amount',
      balance: 'retention_balance',
      state: 'state',
    },
  },
};
