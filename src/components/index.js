import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, space, radius, fonts, shadow, makeStyles } from '../theme';

const ICON_MAP = {
  'notifications-outline': 'bell', 'bell': 'bell', 'chevron-back': 'chevron-right',
  'chevron-forward': 'chevron-left', 'arrow-back': 'arrow-right', 'arrow-forward': 'arrow-left',
  'checkmark-circle': 'check-circle', 'document-text-outline': 'file-text',
  'calendar-outline': 'calendar', 'person-outline': 'user', 'people-outline': 'users',
  'shield-checkmark-outline': 'shield', 'business-outline': 'briefcase', 'map-outline': 'map-pin',
  'folder-outline': 'folder', 'log-out-outline': 'log-out', 'create-outline': 'edit-2',
  'search': 'search', 'home': 'home', 'menu': 'menu',
};
export function Icon({ name, ...props }) {
  const mapped = ICON_MAP[name] || name || 'circle';
  return <Feather name={mapped} {...props} />;
}

// نص عربي — IBM Plex Sans Arabic حسب الوزن
export function T({ style, weight, children, ...props }) {
  const family = weight === 'bold' || weight === 'semibold' ? fonts.arabicBold
    : weight === 'medium' ? fonts.arabicSemi : fonts.arabic;
  return <Text style={[styles.t, { fontFamily: family }, style]} {...props}>{children}</Text>;
}

// نص لاتيني/أرقام — Figtree
export function L({ style, weight, children, ...props }) {
  return <Text style={[styles.l, style]} {...props}>{children}</Text>;
}

// عنوان — Caprasimo
export function H({ style, children, ...props }) {
  return <Text style={[styles.h, style]} {...props}>{children}</Text>;
}

// كرت — سطح بحواف مدوّرة (radius.md = 16، pill للعناصر الصغيرة)
export function Card({ style, children, onPress, elevated, ...props }) {
  const W = onPress ? TouchableOpacity : View;
  return (
    <W activeOpacity={0.85} onPress={onPress} style={[styles.card, elevated && shadow.md, style]} {...props}>
      {children}
    </W>
  );
}

// وسم/شارة (tag) — بنفس أنواع التصميم
export function Tag({ label, kind = 'neutral' }) {
  const map = {
    accent: { bg: colors.accent100, fg: colors.accent800 },
    accent2: { bg: colors.accent2_100, fg: colors.accent2_800 },
    neutral: { bg: colors.neutral100, fg: colors.neutral800 },
    outline: { bg: 'transparent', fg: colors.accent, border: colors.accent },
  };
  const t = map[kind] || map.neutral;
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }, t.border && { borderWidth: 1, borderColor: t.border }]}>
      <T weight="medium" style={[styles.tagText, { color: t.fg }]}>{label}</T>
    </View>
  );
}

// وسم حسب الحالة النصية
export function StatusTag({ status }) {
  const kindByStatus = {
    'قائم': 'accent2', 'نشط': 'accent2', 'مكتمل': 'neutral', 'محصّل': 'accent2',
    'ساري': 'accent2', 'معتمد': 'accent2', 'مقدّم': 'accent', 'مسودة': 'neutral',
    'قرب الاكتمال': 'accent', 'قرب الانتهاء': 'accent', 'مفوتر': 'accent',
    'قيد الاعتماد': 'accent', 'بانتظار التحصيل': 'accent',
  };
  return <Tag label={status} kind={kindByStatus[status] || 'neutral'} />;
}

// شريط تقدّم
export function Bar({ value, color = colors.accent, height = 6, track = colors.neutral200 }) {
  return (
    <View style={{ height, borderRadius: radius.pill, backgroundColor: track, overflow: 'hidden', width: '100%' }}>
      <View style={{ width: `${Math.min(100, value)}%`, height, borderRadius: radius.pill, backgroundColor: color }} />
    </View>
  );
}

// زر أساسي pill
export function Btn({ title, onPress, icon, kind = 'primary', style }) {
  const map = {
    primary: { bg: colors.accent, fg: colors.bg },
    dark: { bg: colors.accent2_800, fg: colors.white },
    light: { bg: colors.white, fg: colors.ink },
    secondary: { bg: 'transparent', fg: colors.text, border: colors.divider },
    ghost: { bg: 'transparent', fg: colors.accent },
  };
  const b = map[kind] || map.primary;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}
      style={[styles.btn, { backgroundColor: b.bg }, b.border && { borderWidth: 1, borderColor: b.border }, style]}>
      {icon && <Icon name={icon} size={17} color={b.fg} />}
      <T weight="medium" style={[styles.btnText, { color: b.fg }]}>{title}</T>
    </TouchableOpacity>
  );
}

// دائرة أيقونة
export function IconDot({ name, size = 18, bg = colors.neutral100, color = colors.neutral800, dim = 42 }) {
  return (
    <View style={{ width: dim, height: dim, borderRadius: radius.pill, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={size} color={color} />
    </View>
  );
}

// شعار Contracting Lite
export function BrandMark({ size = 48, color = colors.white, showText = true, sub }) {
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="bar-chart-2" size={size * 0.8} color={color} />
      </View>
      {showText && <L style={{ fontSize: size * 0.22, color, letterSpacing: 1, fontWeight: '600' }}>Contracting Lite</L>}
      {sub && <T style={{ fontSize: 11.5, color, opacity: 0.8 }}>{sub}</T>}
    </View>
  );
}

const styles = makeStyles(() => ({
  t: { color: colors.text, textAlign: 'right', writingDirection: 'rtl', fontSize: 14, fontFamily: fonts.arabic },
  l: { color: colors.text, fontFamily: fonts.latin, fontSize: 14 },
  h: { fontFamily: fonts.heading, color: colors.text, textAlign: 'right', writingDirection: 'rtl', fontSize: 25, lineHeight: 30 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.s3 },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  tagText: { fontSize: 11, letterSpacing: 0.2 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.pill },
  btnText: { fontSize: 14 },
}));
