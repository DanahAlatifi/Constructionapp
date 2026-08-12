// ═══════════════════════════════════════════════════════════════
//  تخزين دائم بسيط على الجهاز (AsyncStorage)
//  يُستخدم لتذكّر أن المستخدم مسح الباركود مرة واحدة
// ═══════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCANNED_KEY = 'pt_has_scanned';
const VERSION_KEY = 'pt_auth_version';
const CURRENT_VERSION = '2'; // زِد هذا الرقم لإجبار مسح الذاكرة القديمة

// مسح الذاكرة القديمة مرة واحدة عند ترقية منطق الدخول
export async function migrateAuthIfNeeded() {
  try {
    const v = await AsyncStorage.getItem(VERSION_KEY);
    if (v !== CURRENT_VERSION) {
      await AsyncStorage.removeItem(SCANNED_KEY); // ابدأ نظيفاً: أول دخول سيطلب باركود
      await AsyncStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    }
  } catch (e) {}
}

// هل سبق للمستخدم أن سجّل دخولاً بنجاح (على هذا الجهاز)؟
export async function hasScannedBefore() {
  try {
    const v = await AsyncStorage.getItem(SCANNED_KEY);
    return v === 'true';
  } catch (e) {
    return false;
  }
}

// تسجيل أن المستخدم مسح الباركود بنجاح
export async function markScanned() {
  try {
    await AsyncStorage.setItem(SCANNED_KEY, 'true');
  } catch (e) {}
}

// مسح العلامة (يستخدم فقط عند "تسجيل جديد" — يجبر المسح من جديد)
export async function clearScanned() {
  try {
    await AsyncStorage.removeItem(SCANNED_KEY);
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════
//  تخزين لون الشركة (يُطبّق عند بداية التطبيق قبل بناء الأنماط)
// ═══════════════════════════════════════════════════════════════
const COMPANY_COLOR_KEY = 'pt_company_color';

export async function saveCompanyColor(colorIndex, primary, secondary) {
  try {
    await AsyncStorage.setItem(COMPANY_COLOR_KEY, JSON.stringify({ colorIndex, primary, secondary }));
  } catch (e) {}
}

export async function loadCompanyColor() {
  try {
    const v = await AsyncStorage.getItem(COMPANY_COLOR_KEY);
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
}

export async function clearCompanyColor() {
  try {
    await AsyncStorage.removeItem(COMPANY_COLOR_KEY);
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════
//  الشركة المُتحقّقة من الباركود (لربطها بالدخول)
// ═══════════════════════════════════════════════════════════════
const SCANNED_COMPANY_KEY = 'pt_scanned_company';

export async function saveScannedCompany(companyId, companyName) {
  try {
    await AsyncStorage.setItem(SCANNED_COMPANY_KEY, JSON.stringify({ companyId, companyName }));
  } catch (e) {}
}

export async function loadScannedCompany() {
  try {
    const v = await AsyncStorage.getItem(SCANNED_COMPANY_KEY);
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
}

export async function clearScannedCompany() {
  try {
    await AsyncStorage.removeItem(SCANNED_COMPANY_KEY);
  } catch (e) {}
}

// قيمة الباركود الممسوحة (نص) — يتحقق منها بعد الدخول
const SCANNED_BARCODE_KEY = 'pt_scanned_barcode';

export async function saveScannedBarcode(barcode) {
  try {
    await AsyncStorage.setItem(SCANNED_BARCODE_KEY, barcode);
  } catch (e) {}
}

export async function loadScannedBarcode() {
  try {
    return await AsyncStorage.getItem(SCANNED_BARCODE_KEY);
  } catch (e) {
    return null;
  }
}

export async function clearScannedBarcode() {
  try {
    await AsyncStorage.removeItem(SCANNED_BARCODE_KEY);
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════
//  إعدادات الاتصال (الرابط + القاعدة) من الباركود
// ═══════════════════════════════════════════════════════════════
const CONN_KEY = 'odoo_connection_config';

export async function saveConnectionConfig({ url, db }) {
  try {
    await AsyncStorage.setItem(CONN_KEY, JSON.stringify({ url, db }));
  } catch (e) {}
}

export async function loadConnectionConfig() {
  try {
    const raw = await AsyncStorage.getItem(CONN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function clearConnectionConfig() {
  try { await AsyncStorage.removeItem(CONN_KEY); } catch (e) {}
}
