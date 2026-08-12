import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T, L, H, Icon, Card } from '../components';
import { colors, space, radius, fonts, shadow, makeStyles, useThemeRedraw} from '../theme';
import { useProject } from '../ProjectContext';
import { currentUser as fallbackUser } from '../data/mock';
import { getUserStats, updateUserProfile } from '../api/services';
import { useAsync } from '../api/useAsync';

export default function ProfileScreen({ navigation }) {
  useThemeRedraw();
  const { user: ctxUser, reloadProjects } = useProject();
  const currentUser = ctxUser || fallbackUser;
  const roleLabel = currentUser.roleKey === 'officer' ? 'مسؤول — يعتمد المستخلصات' : 'عرض فقط';
  const { data: stats } = useAsync(() => getUserStats(), [], { projects: '—', reports: '—', claims: '—' });

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  const openEdit = () => {
    setName(currentUser.name || '');
    setEmail(currentUser.email || '');
    setPassword('');
    setCurrentPassword('');
    setEditError(null);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setEditError(null);
    setSaving(true);
    try {
      const res = await updateUserProfile({ name, email, password, currentPassword });
      if (res.ok) {
        setEditOpen(false);
        try { await reloadProjects(); } catch (e) {}
        Alert.alert('تم', 'تم حفظ التعديلات بنجاح.');
      } else {
        setEditError(res.error || 'تعذّر الحفظ.');
      }
    } catch (e) {
      setEditError(e.message || 'تعذّر الحفظ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-right" size={20} color={colors.neutral700} />
          </TouchableOpacity>
          <H style={styles.title}>ملفي الشخصي</H>
          <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
            <Icon name="edit-2" size={16} color={colors.accent2_800} />
            <T weight="medium" style={styles.editBtnText}>تعديل</T>
          </TouchableOpacity>
        </View>

        <Card style={styles.userCard}>
          <View style={styles.avatar}><T weight="semibold" style={styles.avatarText}>{(currentUser.name || 'م').charAt(0)}</T></View>
          <View style={{ gap: 4, flex: 1 }}>
            <H style={styles.name}>{currentUser.name || '—'}</H>
            <T style={styles.role}>{currentUser.jobTitle || currentUser.company || currentUser.role}</T>
          </View>
        </Card>

        <T style={styles.sectionLbl}>معلومات الاتصال</T>
        <Card style={styles.infoCard}>
          <InfoRow label="بريد العمل" value={currentUser.email || '—'} sep />
          <InfoRow label="الجوال" value={currentUser.phone || '—'} sep />
          <InfoRow label="الشركة" value={currentUser.company || '—'} sep />
          {!!currentUser.jobTitle && <InfoRow label="المسمى الوظيفي" value={currentUser.jobTitle} sep />}
          <InfoRow label="الصلاحية" value={roleLabel} />
        </Card>

        {(currentUser.city || currentUser.country || currentUser.lang || currentUser.lastLogin) && (
          <>
            <T style={styles.sectionLbl}>معلومات إضافية</T>
            <Card style={styles.infoCard}>
              {!!currentUser.city && <InfoRow label="المدينة" value={currentUser.city} sep />}
              {!!currentUser.country && <InfoRow label="الدولة" value={currentUser.country} sep />}
              {!!currentUser.lang && <InfoRow label="اللغة" value={currentUser.lang} sep />}
              {!!currentUser.lastLogin && <InfoRow label="آخر دخول" value={currentUser.lastLogin} />}
            </Card>
          </>
        )}

        <T style={styles.sectionLbl}>النشاط في النظام</T>
        <View style={styles.statsRow}>
          <StatBox value={stats.projects} label="إجمالي المشاريع" />
          <StatBox value={stats.reports} label="التقارير اليومية" />
          <StatBox value={stats.claims} label="المستخلصات" />
        </View>
      </ScrollView>

      <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <H style={styles.modalTitle}>تعديل البيانات</H>
              <TouchableOpacity onPress={() => setEditOpen(false)}>
                <Icon name="x" size={22} color={colors.neutral600} />
              </TouchableOpacity>
            </View>

            <T style={styles.fieldLabel}>الاسم</T>
            <TextInput style={styles.input} value={name} onChangeText={setName}
              placeholder="الاسم الكامل" placeholderTextColor={colors.neutral400} textAlign="right" />

            <T style={styles.fieldLabel}>البريد الإلكتروني</T>
            <TextInput style={styles.input} value={email} onChangeText={setEmail}
              placeholder="البريد الإلكتروني" placeholderTextColor={colors.neutral400}
              textAlign="right" keyboardType="email-address" autoCapitalize="none" />

            <T style={styles.fieldLabel}>كلمة السر الجديدة</T>
            <TextInput style={styles.input} value={password} onChangeText={setPassword}
              placeholder="اتركها فارغة لعدم التغيير" placeholderTextColor={colors.neutral400}
              textAlign="right" secureTextEntry autoCapitalize="none" />

            {password.length > 0 && (
              <>
                <T style={styles.fieldLabel}>كلمة السر الحالية (للتأكيد)</T>
                <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword}
                  placeholder="أدخل كلمة سرك الحالية" placeholderTextColor={colors.neutral400}
                  textAlign="right" secureTextEntry autoCapitalize="none" />
                <View style={styles.securityRow}>
                  <Icon name="shield" size={13} color={colors.neutral600} />
                  <T style={styles.securityHint}>لأمانك، نطلب كلمة السر الحالية قبل تغييرها.</T>
                </View>
              </>
            )}

            {!!editError && (
              <View style={styles.errRow}>
                <Icon name="alert-circle" size={15} color={colors.accent700} />
                <T style={styles.errText}>{editError}</T>
              </View>
            )}

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={saving ? undefined : saveEdit} activeOpacity={0.85}>
              {saving
                ? <ActivityIndicator color={colors.white} />
                : <T weight="semibold" style={styles.saveBtnText}>حفظ التعديلات</T>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, sep }) {
  return (
    <>
      <View style={styles.infoRow}>
        <T style={styles.infoLabel}>{label}</T>
        <L style={styles.infoValue}>{value}</L>
      </View>
      {sep && <View style={styles.sep} />}
    </>
  );
}
function StatBox({ value, label }) {
  return (
    <Card style={styles.statBox}>
      <L style={styles.statVal}>{value}</L>
      <T style={styles.statLbl}>{label}</T>
    </Card>
  );
}

const styles = makeStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingBottom: 24, gap: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  title: { fontSize: 22 },
  editBtn: { marginInlineStart: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent2_100, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14 },
  editBtnText: { fontSize: 13, color: colors.accent2_800 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.accent2_800, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 20 },
  name: { fontSize: 19 },
  role: { fontSize: 12.5, color: colors.neutral600, textAlign: 'right' },
  infoCard: { paddingVertical: 6, paddingHorizontal: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, gap: 12 },
  infoLabel: { fontSize: 13, color: colors.neutral600 },
  infoValue: { fontSize: 13.5, color: colors.text, textAlign: 'left', flex: 1, marginInlineStart: 'auto' },
  sep: { height: 1, backgroundColor: colors.divider8 },
  sectionLbl: { fontSize: 12.5, color: colors.neutral600, paddingHorizontal: 4, textAlign: 'right' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 18 },
  statVal: { fontSize: 22, fontWeight: '600', color: colors.accent700 },
  statLbl: { fontSize: 10.5, color: colors.neutral600, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 34, gap: 4 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitle: { fontSize: 19 },
  fieldLabel: { fontSize: 13, color: colors.neutral700, textAlign: 'right', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 13, fontSize: 14, color: colors.text, fontFamily: fonts.arabic, textAlign: 'right', ...shadow.sm },
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, justifyContent: 'flex-end' },
  securityHint: { fontSize: 11.5, color: colors.neutral600, textAlign: 'right' },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accent100, borderRadius: radius.sm, padding: 11, marginTop: 12 },
  errText: { flex: 1, fontSize: 12.5, color: colors.accent700, textAlign: 'right' },
  saveBtn: { backgroundColor: colors.accent2_800, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveBtnText: { fontSize: 15, color: colors.white },
}));
