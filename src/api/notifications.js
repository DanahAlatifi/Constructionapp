// ═══════════════════════════════════════════════════════════════
//  إدارة الإشعارات الحقيقية (Push Notifications)
// ═══════════════════════════════════════════════════════════════
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const ENABLED_KEY = 'notifications_enabled';
const TOKEN_KEY = 'notifications_push_token';

// كيف تظهر الإشعارات عند وصولها والتطبيق مفتوح
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// هل فعّل المستخدم الإشعارات؟ (محفوظ محلياً)
export async function areNotificationsEnabled() {
  try {
    const v = await AsyncStorage.getItem(ENABLED_KEY);
    _notifEnabled = (v === 'true');
    return _notifEnabled;
  } catch (e) {
    return false;
  }
}

// اضبط حالة التفعيل
// ── حالة الإشعارات في الذاكرة + مستمعون للتحديث الفوري ──
let _notifEnabled = false;
const _notifListeners = new Set();

// اشترك في تغيّرات حالة الإشعارات (يُستدعى المستمع فوراً عند أي تغيير)
export function onNotificationsChange(listener) {
  _notifListeners.add(listener);
  return () => _notifListeners.delete(listener);
}
function notifyNotificationsChange() {
  _notifListeners.forEach((fn) => { try { fn(_notifEnabled); } catch (e) {} });
}

// القيمة الحالية من الذاكرة (فورية، بدون انتظار التخزين)
export function getNotificationsEnabledSync() {
  return _notifEnabled;
}

export async function setNotificationsEnabled(enabled) {
  _notifEnabled = !!enabled;
  try {
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (e) {}
  notifyNotificationsChange();   // بلّغ كل الشاشات فوراً
}

// اطلب الإذن وسجّل التوكن — يُستدعى عند تفعيل المستخدم للإشعارات
export async function registerForPushNotifications() {
  try {
    // أذونات
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      await setNotificationsEnabled(false);
      return { ok: false, error: 'لم يتم منح إذن الإشعارات.' };
    }

    // قناة أندرويد
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'الإشعارات',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    // احصل على توكن Expo Push (يحتاج projectId من مشروع EAS)
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId
      || Constants?.easConfig?.projectId;

    // بدون projectId (مثلاً في Expo Go قبل ربط EAS) — فعّل بدون توكن
    if (!projectId) {
      await setNotificationsEnabled(true);
      return {
        ok: true,
        token: null,
        note: 'الإشعارات مفعّلة. رمز الجهاز يتطلب بناء نسخة عبر EAS للاختبار الفعلي.',
      };
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    await AsyncStorage.setItem(TOKEN_KEY, token);
    await setNotificationsEnabled(true);
    // أرسل التوكن لـ Odoo ليتمكّن من إرسال الإشعارات (يفشل بصمت لو الـ endpoint غير جاهز)
    try { await registerTokenWithOdoo(token); } catch (e) {}
    return { ok: true, token };
  } catch (e) {
    await setNotificationsEnabled(false);
    return { ok: false, error: e.message || 'تعذّر تفعيل الإشعارات.' };
  }
}

// يرسل رمز الجهاز لـ Odoo عبر endpoint المخصّص
export async function registerTokenWithOdoo(token) {
  try {
    const { rpcCall } = require('./odoo');
    if (typeof rpcCall === 'function') {
      await rpcCall('/construction/register_push', { token });
    }
  } catch (e) {
    // الـ endpoint قد لا يكون جاهزاً بعد في Odoo — يُتجاهل بصمت
  }
}

// أوقف الإشعارات
export async function disableNotifications() {
  await setNotificationsEnabled(false);
}

// التوكن المحفوظ (يُرسل لـ Odoo لاحقاً لإرسال الإشعارات)
export async function getPushToken() {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
}
