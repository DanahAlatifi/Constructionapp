// نظام تصميم Organic — القيم الدقيقة مستخرجة من ملف تصميم Contracting Lite
import * as _React from 'react';
import { StyleSheet } from 'react-native';
export const colors = {
  // الرموز الأساسية
  bg: '#f7f8fa',          // --color-bg خلفية الصفحة (أبيض مائل لرمادي فاتح جداً)
  surface: '#eef0f3',     // --color-surface السطح
  card: '#ffffff',        // كرت الشاشة الأبيض
  text: '#1a1a2e',        // --color-text
  accent: '#4947ae',      // --color-accent (أزرق الشعار)
  accent2: '#4947ae',     // --color-accent-2 (أزرق الشعار)

  // سلّم الحياد (رمادي محايد — بدون بيج)
  neutral100: '#e1e1e3',
  neutral200: '#cfcfd2',
  neutral300: '#bababe',
  neutral400: '#a2a2a7',
  neutral500: '#8e8e93',
  neutral600: '#757578',
  neutral700: '#5a5a5d',
  neutral800: '#3f3f41',
  neutral900: '#2a2a2b',

  // سلّم الأزرق (accent ramp)
  accent100: '#ececf6',
  accent200: '#cccbe8',
  accent300: '#a4a3d6',
  accent400: '#7876c3',
  accent500: '#5250b2',
  accent600: '#3e3c93',
  accent700: '#2f2e71',
  accent800: '#232253',
  accent900: '#171637',

  // سلّم الأزرق (accent-2 ramp)
  accent2_100: '#ececf6',
  accent2_200: '#cccbe8',
  accent2_300: '#a4a3d6',
  accent2_400: '#7876c3',
  accent2_500: '#5250b2',
  accent2_600: '#3e3c93',
  accent2_700: '#2f2e71',
  accent2_800: '#232253',   // الأزرق الداكن الأساسي للأزرار/الأفتار
  accent2_900: '#171637',

  white: '#ffffff',
  ink: '#232253',           // أزرق مسود للنصوص فوق الفاتح
  divider: 'rgba(26,26,46,0.16)',   // --color-divider
  divider8: 'rgba(26,26,46,0.08)',
};

// ألوان ثابتة لشاشات الدخول — لا تتأثر بلون الشركة أبداً
export const authColors = {
  blue: '#4947ae',          // لون اللوقو الأساسي (بنفسجي/أزرق)
  blueDark: '#2f2e71',      // غامق
  blueLight: '#7675c2',     // فاتح
  ink: '#363582',           // نص داكن
  accent: '#5b59b6',        // بديل accent
  accent2_100: '#e9e8f5',
  accent2_500: '#5b59b6',
  accent2_700: '#4947ae',
  accent2_800: '#3a388b',
  accent2_900: '#2b2a68',
  accent100: '#ececf6',
  accent400: '#9190ce',
  accent700: '#4947ae',
};

// ═══════════════════════════════════════════════════════════════
//  تطبيق ألوان الشركة (من Odoo) على التطبيق ديناميكياً
// ═══════════════════════════════════════════════════════════════

// حوّل hex إلى {r,g,b}
function hexToRgb(hex) {
  if (!hex) return null;
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
// امزج لوناً مع الأبيض (نسبة t نحو الأبيض) أو الأسود (t سالب)
function tint(rgb, t) {
  if (t >= 0) return { r: rgb.r + (255 - rgb.r) * t, g: rgb.g + (255 - rgb.g) * t, b: rgb.b + (255 - rgb.b) * t };
  const k = 1 + t; // t سالب → نحو الأسود
  return { r: rgb.r * k, g: rgb.g * k, b: rgb.b * k };
}
// ولّد سلّم كامل من لون أساسي
function ramp(hex, prefix, target) {
  const rgb = hexToRgb(hex);
  if (!rgb) return;
  const steps = { 100: 0.9, 200: 0.72, 300: 0.5, 400: 0.26, 500: 0.05, 600: -0.15, 700: -0.35, 800: -0.52, 900: -0.68 };
  Object.entries(steps).forEach(([k, t]) => {
    const c = tint(rgb, t);
    target[`${prefix}${k}`] = rgbToHex(c.r, c.g, c.b);
  });
}

// خريطة ألوان Odoo القياسية (color integer index → hex)
// مطابقة للوحة ألوان Odoo (o_colorlist)
const ODOO_COLOR_MAP = {
  0: '#7C7BAD', // افتراضي (أرجواني Odoo)
  1: '#F06050', // أحمر
  2: '#F4A460', // برتقالي
  3: '#F7CD1F', // أصفر
  4: '#6CC1ED', // سماوي / أزرق فاتح
  5: '#814968', // بنفسجي
  6: '#EB7E7F', // وردي فاتح
  7: '#2C8397', // تركوازي
  8: '#475577', // أزرق داكن
  9: '#D6145F', // وردي غامق
  10: '#30C381', // أخضر
  11: '#7C7BAD', // أرجواني
};

// طبّق ألوان الشركة على كائن colors (mutate — تنعكس على كل الشاشات)
// primary/secondary: نصوص hex اختيارية | colorIndex: رقم فهرس Odoo اختياري
export function applyCompanyColors(primary, secondary, colorIndex) {
  // يستخدم اللونين المستخرجين من شعار الشركة فقط (primary + secondary)
  const prim = hexToRgb(primary);
  const sec = hexToRgb(secondary);

  if (prim) {
    colors.accent = primary;
    ramp(primary, 'accent', colors);
  }
  if (sec) {
    colors.accent2 = secondary;
    ramp(secondary, 'accent2_', colors);
    // ramp يولّد accent2_800 صحيحاً؛ نضبط ink ليطابقه
    colors.ink = colors.accent2_800;
  }
  notifyThemeChange();
}

// أعد الألوان الافتراضية (عند الخروج)
const DEFAULTS = { ...colors };
export function resetColors() {
  Object.assign(colors, DEFAULTS);
  notifyThemeChange();
}

// ═══════════════════════════════════════════════════════════════
//  نظام إشعار تغيّر الثيم — يجبر التطبيق على إعادة الرسم بالكامل
// ═══════════════════════════════════════════════════════════════
let _themeListeners = [];
export function onThemeChange(fn) {
  _themeListeners.push(fn);
  return () => { _themeListeners = _themeListeners.filter((f) => f !== fn); };
}
export function notifyThemeChange() {
  _themeListeners.forEach((fn) => { try { fn(); } catch (e) {} });
}

// خطّاف يعيد رسم المكوّن فوراً عند تغيّر لون الشركة (لتتحدّث الألوان تلقائياً)
export function useThemeRedraw() {
  const [, setTick] = _React.useState(0);
  _React.useEffect(() => {
    const off = onThemeChange(() => setTick((t) => t + 1));
    return off;
  }, []);
}

// ═══════════════════════════════════════════════════════════════
//  makeStyles — أنماط ديناميكية تُعاد بناؤها عند تغيّر لون الشركة
//  الاستخدام: const styles = makeStyles(() => ({ ... }))
//  ثم داخل المكوّن تُقرأ styles مباشرة (الكائن يُحدّث نفسه mutate)
// ═══════════════════════════════════════════════════════════════
export function makeStyles(builder) {
  let obj;
  try {
    obj = StyleSheet.create(builder());
  } catch (e) {
    obj = {};
  }
  // أعد البناء عند تغيّر الثيم (mutate نفس الكائن ليبقى المرجع صالحاً)
  onThemeChange(() => {
    try {
      const fresh = StyleSheet.create(builder());
      Object.keys(obj).forEach((k) => { delete obj[k]; });
      Object.assign(obj, fresh);
    } catch (e) {}
  });
  return obj;
}

// المسافات الدقيقة من التصميم
export const space = { s1: 4.4, s2: 8.8, s3: 13.2, s4: 17.6, s6: 26.4, s8: 35.2 };

// نصف الأقطار
export const radius = { sm: 8, md: 16, lg: 28, card: 32, pill: 999 };

// الخطوط
export const fonts = {
  heading: 'Caprasimo',            // العناوين h1..h4
  arabic: 'IBMPlexArabic',         // النص العربي
  arabicSemi: 'IBMPlexArabic-Medium',
  arabicBold: 'IBMPlexArabic-Bold',
  latin: 'Figtree',                // اللاتيني/الأرقام
  latinSemi: 'Figtree-SemiBold',
  latinBold: 'Figtree-Bold',
};

export const shadow = {
  sm: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  md: { shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 3 },
  lg: { shadowColor: '#000000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 32, elevation: 8 },
  card: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 2 },
};

export default { colors, space, radius, fonts, shadow };
