import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T, L, H, Icon, Card } from '../components';
import { colors, space, radius, fonts, shadow, resetColors, makeStyles } from '../theme';
import { DOCS } from '../data/mock';
import { useProject } from '../ProjectContext';
import { logout } from '../api/odoo';
import { USE_API } from '../api/config';

function LinkRow({ icon, iconBg, iconFg, avatar, title, sub, onPress, sep }) {
  return (
    <>
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
        {avatar ? (
          <View style={styles.avatar}><T weight="semibold" style={styles.avatarText}>{(title || 'م').charAt(0)}</T></View>
        ) : (
          <View style={[styles.rowIcon, { backgroundColor: iconBg }]}><Icon name={icon} size={18} color={iconFg} /></View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <T weight="semibold" style={styles.rowTitle}>{title}</T>
          <T style={styles.rowSub}>{sub}</T>
        </View>
        <Icon name="chevron-left" size={18} color={colors.neutral500} />
      </TouchableOpacity>
      {sep && <View style={styles.sep} />}
    </>
  );
}

export default function MoreScreen({ navigation }) {
  const { user, projects } = useProject();
  const userName = (user && user.name) ? user.name : '';

  const doLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج من حسابك؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: async () => {
          if (USE_API) { try { await logout(); } catch (e) {} }
          try { resetColors(); } catch (e) {}
          try { const { clearCompanyColor, clearScannedCompany, clearScannedBarcode } = require('../api/storage'); clearCompanyColor(); clearScannedCompany(); clearScannedBarcode(); } catch (e) {}
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        } },
    ]);
  };
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ paddingVertical: 4 }}>
          <H style={styles.title}>المزيد</H>
        </View>

        {/* كل المشاريع */}
        <Card style={styles.linkCard}>
          <LinkRow icon="grid" iconBg={colors.accent2_100} iconFg={colors.accent2_800}
            title="كل المشاريع" sub={`${projects.length} مشاريع · افتح تفاصيل أي مشروع`}
            onPress={() => navigation.navigate('AllProjects')} />
        </Card>

        {/* الملف الشخصي */}
        <Card style={styles.linkCard}>
          <LinkRow avatar title={userName || 'ملفي الشخصي'} sub="ملفي الشخصي"
            onPress={() => navigation.navigate('Profile')} />
        </Card>

        {/* الصلاحيات */}
        <T style={styles.sectionLbl}>الصلاحيات والمستندات</T>
        <Card style={styles.linkCard}>
          <LinkRow icon="users" iconBg={colors.accent2_100} iconFg={colors.accent2_800}
            title="مقاولو الباطن" sub="عقود الباطن على المشروع المختار"
            onPress={() => navigation.navigate('Subcontractors')} sep />
          <LinkRow icon="file-plus" iconBg={colors.accent2_100} iconFg={colors.accent2_800}
            title="أوامر التغيير" sub="تعديلات نطاق العمل والقيمة والمدة"
            onPress={() => navigation.navigate('VariationOrders')} sep />
          <LinkRow icon="list" iconBg={colors.accent2_100} iconFg={colors.accent2_800}
            title="جدول الكميات" sub="إدخال كميات الفترة وإنشاء مستخلص"
            onPress={() => navigation.navigate('Boq')} sep />
          <LinkRow icon="shopping-cart" iconBg={colors.accent2_100} iconFg={colors.accent2_800}
            title="أوامر الشراء" sub="إنشاء ومتابعة أوامر الشراء للمورّدين"
            onPress={() => navigation.navigate('PurchaseOrders')} sep />
          <LinkRow icon="shield" iconBg={colors.accent2_100} iconFg={colors.accent2_800}
            title="المحتجزات والضمانات" sub="الإفراج والضمانات البنكية"
            onPress={() => navigation.navigate('Guarantees')} sep />
          <LinkRow icon="folder" iconBg={colors.accent2_100} iconFg={colors.accent2_800}
            title="المستندات" sub={`${DOCS.length} مستندات جاهزة للتصدير`}
            onPress={() => navigation.navigate('Documents')} sep />
          <LinkRow icon="printer" iconBg={colors.accent2_100} iconFg={colors.accent2_800}
            title="معاينة وتصدير مستند" sub="من منظور المقاول/الاستشاري/المالك"
            onPress={() => navigation.navigate('Share')} />
        </Card>

        {/* الإعدادات */}
        <T style={styles.sectionLbl}>الإعدادات</T>
        <Card style={styles.settingsCard}>
          <SettingRow label="نسبة المحتجزات" value="5%" sep />
          <SettingRow label="استرداد الدفعة المقدمة" value="10%" sep />
          <SettingRow label="الإشعارات" value="مُفعّلة" sep />
          <SettingRow label="اللغة" value="العربية" />
        </Card>

        <TouchableOpacity style={styles.logout} onPress={doLogout}>
          <Icon name="log-out" size={18} color={colors.accent700} />
          <T weight="semibold" style={styles.logoutText}>تسجيل الخروج</T>
        </TouchableOpacity>
        <T style={styles.version}>الإصدار 1.0.0 — Contracting Lite</T>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({ label, value, sep }) {
  return (
    <>
      <View style={styles.setRow}>
        <T style={styles.setLabel}>{label}</T>
        <L style={styles.setValue}>{value}</L>
      </View>
      {sep && <View style={styles.sep} />}
    </>
  );
}

const styles = makeStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingBottom: 110, gap: 14 },
  title: { fontSize: 26 },
  linkCard: { paddingVertical: 6, paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent2_800, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 14 },
  rowTitle: { fontSize: 15, color: colors.text, textAlign: 'right' },
  rowSub: { fontSize: 12, color: colors.neutral600, textAlign: 'right' },
  sep: { height: 1, backgroundColor: colors.divider8 },
  sectionLbl: { fontSize: 12.5, color: colors.neutral600, paddingHorizontal: 4, marginTop: 6, textAlign: 'right' },
  settingsCard: { paddingVertical: 6, paddingHorizontal: 20 },
  setRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  setLabel: { fontSize: 14, color: colors.text },
  setValue: { fontSize: 13, color: colors.accent700, fontWeight: '600' },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 6 },
  logoutText: { color: colors.accent700, fontSize: 14 },
  version: { textAlign: 'center', fontSize: 11, color: colors.neutral500 },
}));
