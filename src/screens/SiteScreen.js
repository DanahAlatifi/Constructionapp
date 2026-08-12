import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T, L, H, Icon, Card, Bar } from '../components';
import { colors, space, radius, fonts, shadow, makeStyles } from '../theme';
// البيانات كلها من Odoo عبر الخدمات
import { useProject, useProjectId, useCan } from '../ProjectContext';
import { getDailyReports, getProjectDetail, createDailyReport, updateDailyReport, uploadAttachment, WEATHER_OPTIONS } from '../api/services';
import * as ImagePicker from 'expo-image-picker';
import { useAsync } from '../api/useAsync';
import { Loading, ErrorBox } from '../components/Async';

export default function SiteScreen() {
  const { projects } = useProject();
  const { pid, realId } = useProjectId();
  const p = projects[pid] || projects[0];
  const rep = useAsync(() => getDailyReports(realId), [realId]);
  const det = useAsync(() => getProjectDetail(realId), [realId], { boq: [], meta: null, loc: '' });
  const reports = rep.data || [];
  const boq = (det.data && det.data.boq) ? det.data.boq : [];
  // عدد المعوقات: من التقارير التي فيها معوقات
  const obs = String((reports || []).filter(r => r.hasObstacles).length);
  const [report, setReport] = useState(false);

  const latestManpower = (reports && reports[0]) ? String(reports[0].manpower) : '—';
  if (report !== false) return <DailyReport project={p} realId={realId} labour={latestManpower} existing={report} onBack={() => setReport(false)} onSaved={() => rep.reload()} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ paddingVertical: 4 }}>
          <H style={styles.title}>الموقع</H>
          <T style={styles.sub}>{p.name}{p.location ? ` · ${p.location}` : ''}</T>
        </View>

        {/* موقعي اليوم */}
        <Card style={styles.card}>
          <View style={styles.todayHead}>
            <T weight="semibold" style={styles.todayTtl}>{p.name}</T>
            <View style={styles.todayPill}><T weight="medium" style={styles.todayPillText}>موقعي اليوم</T></View>
          </View>
          <View style={styles.sep} />
          <View style={styles.today3}>
            <Metric label="الإنجاز" value={`${p.progress}%`} />
            <Metric label="العمالة أمس" value={latestManpower} />
            <Metric label="الجدول" value={p.daysLeft > 0 ? `${p.daysLeft} يوم` : 'مُسلّم'} accent />
          </View>
        </Card>

        {/* زر كتابة التقرير */}
        <TouchableOpacity style={styles.reportBtn} onPress={() => setReport(null)} activeOpacity={0.9}>
          <T weight="medium" style={styles.reportBtnText}>كتابة تقرير اليوم</T>
        </TouchableOpacity>

        {/* التقارير الأخيرة */}
        <H style={styles.h5}>التقارير الأخيرة</H>
        <Card style={styles.listCard}>
          {rep.loading && <Loading label="جارٍ تحميل التقارير…" />}
          {!rep.loading && reports.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
              <Icon name="file-text" size={24} color={colors.neutral500} />
              <T style={{ color: colors.neutral600, fontSize: 13 }}>لا توجد تقارير على هذا المشروع بعد.</T>
            </View>
          )}
          {reports.map((r, i) => (
            <View key={i}>
              <TouchableOpacity style={styles.repRow} onPress={() => setReport(r)} activeOpacity={0.8}>
                <View style={styles.repIcon}><Icon name="file-text" size={16} color={colors.neutral700} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <T weight="semibold" style={styles.repDay}>{r.day || 'بدون تاريخ'}</T>
                  <T style={styles.repNote}>{r.note}</T>
                </View>
                {r.submitted && <View style={styles.stateBadge}><T style={styles.stateBadgeText}>مُرسل</T></View>}
                {r.hasObstacles && <View style={styles.obsBadge}><Icon name="alert-triangle" size={12} color={colors.accent700} /></View>}
                <Icon name="chevron-left" size={16} color={colors.neutral500} />
              </TouchableOpacity>
              {i < reports.length - 1 && <View style={styles.sep} />}
            </View>
          ))}
        </Card>

        {/* سجل المعوقات */}
        <H style={styles.h5}>سجل المعوقات</H>
        <Card style={styles.obsCard}>
          <View style={[styles.obsIcon, { backgroundColor: obs === '٠' ? colors.neutral100 : colors.accent100 }]}>
            <Icon name="alert-triangle" size={19} color={obs === '٠' ? colors.neutral600 : colors.accent700} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            {obs === '٠' ? (
              <T style={styles.obsEmpty}>لا توجد معوقات مسجلة على هذا المشروع.</T>
            ) : (
              <>
                <T weight="semibold" style={styles.obsTtl}>{obs} معوقات مؤرخة</T>
                <T style={styles.obsSub}>ملف مطالبة تمديد المدة · جاهز للتصدير</T>
              </>
            )}
          </View>
        </Card>

        {/* التقدّم بالتخصص */}
        <H style={styles.h5}>التقدّم بالتخصص</H>
        <Card style={{ gap: 0 }}>
          {boq.map((b, i) => (
            <View key={i} style={[styles.boqItem, i === boq.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.boqTop}>
                <T weight="semibold" style={styles.boqName}>{b.n}</T>
                <L style={styles.boqPct}>{b.p}%</L>
              </View>
              <T style={styles.boqQty}>{b.q}</T>
              <Bar value={b.p} color={b.p === 100 ? colors.accent2_500 : colors.accent} />
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, accent }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <T style={styles.metricLbl}>{label}</T>
      <L style={[styles.metricVal, accent && { color: colors.accent700 }]}>{value}</L>
    </View>
  );
}

// ===== 10 تقرير اليوم =====
function DailyReport({ project, realId, labour, existing, onBack, onSaved }) {
  const isSubmitted = existing && existing.submitted;      // مُرسل → قراءة فقط
  const isEdit = existing && existing._raw && existing._raw.id; // تعديل تقرير موجود
  const reportId = isEdit ? existing._raw.id : null;
  const canCreateReport = useCan('dailyReport', 'create');
  const canWriteReport = useCan('dailyReport', 'write');
  const noPermission = isEdit ? !canWriteReport : !canCreateReport;
  const readOnly = isSubmitted || noPermission;

  const [count, setCount] = useState(existing ? (existing.manpower || 0) : (parseInt(labour) || 0));
  const [works, setWorks] = useState(existing ? (existing.works || '') : '');
  const [obstacles, setObstacles] = useState(existing ? (existing.obstacles || '') : '');
  const [weather, setWeather] = useState(existing ? (existing.weather || 'sunny') : 'sunny');
  const [equipment, setEquipment] = useState(existing ? (existing.equipment || '') : '');
  const [visitors, setVisitors] = useState(existing ? (existing.visitors || '') : '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [photos, setPhotos] = useState([]); // {uri, base64}

  const pickFrom = async (fromCamera) => {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('صلاحية مطلوبة', 'يرجى السماح بالوصول للكاميرا/المعرض.'); return; }
      const res = fromCamera
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 })
        : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      if (!res.canceled && res.assets && res.assets[0]) {
        const a = res.assets[0];
        setPhotos((prev) => [...prev, { uri: a.uri, base64: a.base64 }]);
      }
    } catch (e) { Alert.alert('خطأ', e.message || 'تعذّر اختيار الصورة'); }
  };

  const removePhoto = (idx) => setPhotos((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    if (readOnly) return;
    // تحقق قبل الإرسال
    if (!works || !works.trim()) {
      setMsg({ ok: false, text: 'اكتب "الأعمال المنفّذة" أولاً — الحقل إلزامي.' });
      return;
    }
    if (!realId) {
      setMsg({ ok: false, text: 'تعذّر تحديد المشروع. ارجع واختر المشروع مجدداً.' });
      return;
    }
    setBusy(true); setMsg(null);
    try {
      let rid;
      if (isEdit) {
        // تعديل نفس السجل — مو نسخة جديدة
        await updateDailyReport(reportId, { manpower: count, works, obstacles, weather, equipment, visitors });
        rid = reportId;
      } else {
        // تقرير جديد
        rid = await createDailyReport(realId, { manpower: count, works, obstacles, weather, equipment, visitors });
      }
      // ارفع الصور كمرفقات مربوطة بالتقرير
      let uploadedOk = 0;
      for (let i = 0; i < photos.length; i++) {
        if (photos[i].base64) {
          try { await uploadAttachment('dailyReport', rid, photos[i].base64, `report_${rid}_${i + 1}.jpg`); uploadedOk++; } catch (e) {}
        }
      }
      setMsg({ ok: true, text: isEdit ? `✓ حُفظت التعديلات على نفس التقرير (رقم ${reportId}).` : (uploadedOk ? `✓ تقرير جديد + ${uploadedOk} صور.` : '✓ حُفظ تقرير جديد في النظام.') });
      setTimeout(() => { if (onSaved) onSaved(); onBack(); }, 1200);
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'تعذّر حفظ التقرير.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.repHead}>
          <TouchableOpacity style={styles.circleBtn} onPress={onBack}>
            <Icon name="arrow-right" size={20} color={colors.neutral700} />
          </TouchableOpacity>
          <View style={{ gap: 2, flex: 1 }}>
            <H style={styles.repTitle}>{isEdit ? (readOnly ? 'عرض التقرير' : 'تعديل التقرير') : 'تقرير اليوم'}</H>
            <T style={styles.sub}>{project.name}{existing && existing.day ? ` · ${existing.day}` : ' · مهندس الموقع'}</T>
          </View>
          {readOnly && <View style={styles.roBadge}><Icon name="lock" size={12} color={colors.neutral700} /><T style={styles.roBadgeText}>مُرسل</T></View>}
        </View>

        {readOnly && (
          <View style={styles.roNotice}>
            <Icon name="info" size={15} color={colors.accent2_800} />
            <T style={styles.roNoticeText}>هذا التقرير مُرسل — للعرض فقط ولا يمكن تعديله.</T>
          </View>
        )}

        <Card style={styles.card}>
          <View style={styles.grid2}>
            <Metric2 label="نسبة الإنجاز" value={`${project.progress}%`} />
            <Metric2 label="حالة الجدول" value={project.daysLeft > 0 ? `${project.daysLeft} يوم متبقٍ` : 'مُسلّم'} accent />
          </View>
        </Card>

        {msg && (
          <View style={[styles.msgBox, { backgroundColor: msg.ok ? colors.accent2_200 : colors.accent100 }]}>
            <Icon name={msg.ok ? 'check-circle' : 'alert-circle'} size={16} color={msg.ok ? colors.accent2_800 : colors.accent700} />
            <T style={[styles.msgText, { color: msg.ok ? colors.accent2_800 : colors.accent700 }]}>{msg.text}</T>
          </View>
        )}

        {/* عدّاد العمالة */}
        <Card style={styles.card}>
          <T style={styles.metricLbl}>عدد العمالة اليوم</T>
          <View style={styles.counter}>
            <TouchableOpacity style={[styles.counterBtn, readOnly && { opacity: 0.4 }]} onPress={readOnly ? undefined : () => setCount(Math.max(0, count - 1))}>
              <Icon name="minus" size={18} color={colors.neutral700} />
            </TouchableOpacity>
            <L style={styles.counterVal}>{count}</L>
            <TouchableOpacity style={[styles.counterBtn, readOnly && { opacity: 0.4 }]} onPress={readOnly ? undefined : () => setCount(count + 1)}>
              <Icon name="plus" size={18} color={colors.neutral700} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* الأعمال المنفّذة — إلزامي */}
        <Card style={[styles.card, !readOnly && !works.trim() && styles.cardRequired]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <T style={styles.req}>*</T>
            <T style={styles.metricLbl}>الأعمال المنفّذة (إلزامي)</T>
          </View>
          <TextInput
            style={[styles.input, readOnly && styles.inputRO]} multiline placeholder="اكتب ما نُفّذ اليوم…"
            placeholderTextColor={colors.neutral400} textAlign="right"
            value={works} onChangeText={setWorks} editable={!readOnly}
          />
          {!readOnly && !works.trim() && <T style={styles.reqHint}>لا يمكن حفظ التقرير بدون هذا الحقل</T>}
        </Card>

        {/* المعوقات */}
        <Card style={styles.card}>
          <T style={styles.metricLbl}>المعوقات (إن وُجدت)</T>
          <TextInput
            style={[styles.input, readOnly && styles.inputRO]} multiline placeholder="اكتب أي معوقات لملف تمديد المدة…"
            placeholderTextColor={colors.neutral400} textAlign="right"
            value={obstacles} onChangeText={setObstacles} editable={!readOnly}
          />
        </Card>

        {/* الطقس */}
        <Card style={styles.card}>
          <T style={styles.metricLbl}>حالة الطقس</T>
          <View style={styles.weatherRow}>
            {WEATHER_OPTIONS.map((w) => {
              const on = weather === w.key;
              return (
                <TouchableOpacity key={w.key} onPress={readOnly ? undefined : () => setWeather(w.key)}
                  style={[styles.weatherChip, on && styles.weatherChipOn, readOnly && { opacity: 0.7 }]}>
                  <T weight={on ? 'medium' : 'regular'} style={[styles.weatherText, on && { color: colors.white }]}>{w.label}</T>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* المعدات والزوار */}
        <Card style={styles.card}>
          <T style={styles.metricLbl}>المعدات في الموقع</T>
          <TextInput
            style={[styles.input, readOnly && styles.inputRO]} multiline placeholder="حفّار، رافعة، خلاطة…"
            placeholderTextColor={colors.neutral400} textAlign="right"
            value={equipment} onChangeText={setEquipment} editable={!readOnly}
          />
        </Card>
        <Card style={styles.card}>
          <T style={styles.metricLbl}>الزوار (إن وُجدوا)</T>
          <TextInput
            style={[styles.input, readOnly && styles.inputRO]} multiline placeholder="استشاري، مالك، جهة رقابية…"
            placeholderTextColor={colors.neutral400} textAlign="right"
            value={visitors} onChangeText={setVisitors} editable={!readOnly}
          />
        </Card>

        {/* الصور */}
        {!readOnly && (
        <Card style={styles.card}>
          <T style={styles.metricLbl}>صور الموقع</T>
          <View style={styles.photoBtns}>
            <TouchableOpacity style={styles.photoBtn} onPress={() => pickFrom(true)}>
              <Icon name="camera" size={18} color={colors.accent2_800} />
              <T weight="medium" style={styles.photoBtnText}>كاميرا</T>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={() => pickFrom(false)}>
              <Icon name="image" size={18} color={colors.accent2_800} />
              <T weight="medium" style={styles.photoBtnText}>المعرض</T>
            </TouchableOpacity>
          </View>
          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {photos.map((ph, i) => (
                  <View key={i} style={styles.thumbWrap}>
                    <Image source={{ uri: ph.uri }} style={styles.thumb} />
                    <TouchableOpacity style={styles.thumbX} onPress={() => removePhoto(i)}>
                      <Icon name="x" size={13} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </Card>
        )}

        {msg && (
          <View style={[styles.msgBox, { backgroundColor: msg.ok ? colors.accent2_200 : colors.accent100 }]}>
            <Icon name={msg.ok ? 'check-circle' : 'alert-circle'} size={16} color={msg.ok ? colors.accent2_800 : colors.accent700} />
            <T style={[styles.msgText, { color: msg.ok ? colors.accent2_800 : colors.accent700 }]}>{msg.text}</T>
          </View>
        )}

        {!readOnly && (
          <TouchableOpacity style={[styles.reportBtn, (busy || !works.trim()) && { opacity: 0.5 }]} onPress={(busy || !works.trim()) ? undefined : save} activeOpacity={0.9}>
            <T weight="medium" style={styles.reportBtnText}>{busy ? 'جارٍ الحفظ…' : (isEdit ? 'حفظ التعديلات' : 'حفظ التقرير')}</T>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric2({ label, value, accent }) {
  return (
    <View style={styles.grid2Item}>
      <T style={styles.metricLbl}>{label}</T>
      <L style={[styles.metric2Val, accent && { color: colors.accent700 }]}>{value}</L>
    </View>
  );
}

const styles = makeStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingBottom: 110, gap: 16 },
  title: { fontSize: 26 },
  sub: { fontSize: 13, color: colors.neutral600, marginTop: 2 },
  card: { gap: 16 },
  todayHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayTtl: { fontSize: 17, color: colors.text },
  todayPill: { marginInlineStart: 'auto', backgroundColor: colors.accent100, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  todayPillText: { fontSize: 11, color: colors.accent700 },
  sep: { height: 1, backgroundColor: colors.divider8 },
  today3: { flexDirection: 'row' },
  metricLbl: { fontSize: 12, color: colors.neutral600, textAlign: 'right' },
  metricVal: { fontSize: 17, fontWeight: '600', color: colors.text, textAlign: 'right' },
  reportBtn: { backgroundColor: colors.accent2_800, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  reportBtnText: { fontSize: 15, color: colors.white },
  h5: { fontSize: 16, paddingHorizontal: 4, marginTop: 4 },
  listCard: { paddingVertical: 6, paddingHorizontal: 20, gap: 0 },
  repRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  repIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.neutral200, alignItems: 'center', justifyContent: 'center' },
  repDay: { fontSize: 14, color: colors.text, textAlign: 'right' },
  repNote: { fontSize: 12, color: colors.neutral600, textAlign: 'right' },
  obsCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  obsIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  obsTtl: { fontSize: 14, color: colors.text, textAlign: 'right' },
  obsSub: { fontSize: 12, color: colors.neutral600, textAlign: 'right' },
  obsEmpty: { fontSize: 13, color: colors.neutral600, textAlign: 'right' },
  boqItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider8, gap: 6 },
  boqTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  boqName: { fontSize: 14, color: colors.text },
  boqPct: { fontSize: 13, color: colors.accent700, fontWeight: '600' },
  boqQty: { fontSize: 11, color: colors.neutral600, textAlign: 'right' },

  repHead: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.neutral100, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  repTitle: { fontSize: 22 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap' },
  grid2Item: { width: '50%', gap: 4, paddingVertical: 9 },
  metric2Val: { fontSize: 19, fontWeight: '600', color: colors.text, textAlign: 'right' },
  savedCard: { backgroundColor: colors.accent2_200 },
  savedText: { fontSize: 13, lineHeight: 22, color: colors.accent2_800, textAlign: 'right' },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counterBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.neutral100, alignItems: 'center', justifyContent: 'center' },
  counterVal: { fontSize: 26, fontWeight: '600', color: colors.text, minWidth: 40, textAlign: 'center' },
  counterHint: { fontSize: 12, color: colors.neutral600, marginInlineStart: 'auto', textAlign: 'right', flex: 1 },
  repBody: { fontSize: 13, lineHeight: 22, color: colors.neutral700, textAlign: 'right' },
  input: { minHeight: 70, fontSize: 13.5, color: colors.text, fontFamily: fonts.arabic, textAlign: 'right', textAlignVertical: 'top', paddingTop: 4 },
  msgBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.sm, padding: 12 },
  msgText: { flex: 1, fontSize: 12.5, textAlign: 'right' },
  photoBtns: { flexDirection: 'row', gap: 10 },
  photoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent2_100, borderRadius: radius.md, paddingVertical: 13 },
  photoBtnText: { fontSize: 13, color: colors.accent2_800 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: colors.neutral200 },
  thumbX: { position: 'absolute', top: -6, insetInlineEnd: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent700, alignItems: 'center', justifyContent: 'center' },
  weatherRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weatherChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.neutral300 },
  weatherChipOn: { backgroundColor: colors.accent2_800, borderColor: colors.accent2_800 },
  weatherText: { fontSize: 12.5, color: colors.neutral700 },
  obsBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent100, alignItems: 'center', justifyContent: 'center' },
  stateBadge: { backgroundColor: colors.accent2_200, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  stateBadgeText: { fontSize: 10.5, color: colors.accent2_800 },
  req: { fontSize: 15, color: colors.accent700, fontWeight: '700' },
  reqHint: { fontSize: 11, color: colors.accent700, textAlign: 'right', marginTop: 2 },
  cardRequired: { borderWidth: 1, borderColor: colors.accent },
  inputRO: { color: colors.neutral700 },
  roBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.neutral100, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  roBadgeText: { fontSize: 11, color: colors.neutral700 },
  roNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accent2_100, borderRadius: radius.md, padding: 12 },
  roNoticeText: { flex: 1, fontSize: 12.5, color: colors.accent2_800, textAlign: 'right' },
  msgBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.sm, padding: 12 },
  msgText: { flex: 1, fontSize: 12.5, textAlign: 'right' },
}));
