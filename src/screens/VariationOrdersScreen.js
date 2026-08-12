import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T, L, H, Icon, Card } from '../components';
import { colors, space, radius, fonts, shadow, makeStyles, useThemeRedraw} from '../theme';
import { getVariationOrders, voAction, nextVoAction, getReportUrl, downloadReport } from '../api/services';
import { useProject, useProjectId, useCan } from '../ProjectContext';
import { useAsync } from '../api/useAsync';
import { Loading, ErrorBox } from '../components/Async';

const nf = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0));

export default function VariationOrdersScreen({ navigation }) {
  useThemeRedraw();
  const { projects } = useProject();
  const { pid, realId } = useProjectId();
  const p = projects[pid] || projects[0];
  const { data, loading, error, reload } = useAsync(() => getVariationOrders(realId), [realId]);
  const list = data || [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-right" size={20} color={colors.neutral700} />
          </TouchableOpacity>
          <View style={{ gap: 2, flex: 1 }}>
            <H style={styles.title}>أوامر التغيير</H>
            <T style={styles.sub}>{p ? p.name : ''} · {list.length} أوامر</T>
          </View>
        </View>

        {loading && <Loading label="جارٍ تحميل أوامر التغيير…" />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {!loading && !error && list.length === 0 && (
          <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
            <Icon name="file-plus" size={26} color={colors.neutral500} />
            <T style={{ color: colors.neutral600, marginTop: 8 }}>لا توجد أوامر تغيير على هذا المشروع.</T>
          </Card>
        )}

        {list.map((vo, i) => (
          <VoCard key={i} vo={vo} onDone={reload} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function VoCard({ vo, onDone }) {
  const canWriteVo = useCan('vo', 'write');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const vid = vo._raw && vo._raw.id ? vo._raw.id : null;
  const actions = nextVoAction(vo.state);

  const run = async (action) => {
    if (!vid) { setMsg({ ok: false, text: 'تعذّر تحديد الأمر.' }); return; }
    setBusy(true); setMsg(null);
    try {
      await voAction(vid, action);
      setMsg({ ok: true, text: 'تم في النظام.' });
      setTimeout(() => { if (onDone) onDone(); }, 900);
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'تعذّر التنفيذ.' });
    } finally { setBusy(false); }
  };

  const pdf = () => { if (vid) downloadReport('pt_construction_lite.report_vo', vid, 'vo'); };

  const stateTone = vo.state === 'approved' ? { bg: colors.accent2_100, fg: colors.accent2_800 }
    : vo.state === 'rejected' ? { bg: colors.neutral100, fg: colors.neutral700 }
    : vo.state === 'submitted' ? { bg: colors.accent100, fg: colors.accent700 }
    : { bg: colors.neutral100, fg: colors.neutral700 };

  return (
    <Card style={{ gap: 12 }}>
      <View style={styles.voHead}>
        <View style={{ flex: 1, gap: 2 }}>
          <T weight="semibold" style={styles.voNo}>أمر تغيير {vo.no}</T>
          <L style={styles.voDate}>{vo.date}</L>
        </View>
        <View style={[styles.pill, { backgroundColor: stateTone.bg }]}>
          <T weight="medium" style={[styles.pillText, { color: stateTone.fg }]}>{vo.stateLabel}</T>
        </View>
      </View>

      <T style={styles.voDesc}>{vo.desc}</T>

      <View style={styles.sep} />
      <View style={styles.voMeta}>
        <View style={{ flex: 1, gap: 3 }}>
          <T style={styles.voMetaLbl}>القيمة</T>
          <L style={styles.voMetaVal}>{nf(vo.amount)} ر.س</L>
        </View>
        <View style={{ flex: 1, gap: 3, alignItems: 'center' }}>
          <T style={styles.voMetaLbl}>تمديد المدة</T>
          <L style={styles.voMetaVal}>{vo.timeExtension} يوم</L>
        </View>
        <View style={{ flex: 1, gap: 3, alignItems: 'flex-end' }}>
          <T style={styles.voMetaLbl}>الفوترة</T>
          <T weight="medium" style={styles.voBillable}>{vo.billableLabel}</T>
        </View>
      </View>

      {vo.instructionRef ? (
        <T style={styles.voRef}>مرجع التعليمات: {vo.instructionRef}</T>
      ) : (
        <T style={styles.voRefWarn}>⚠ بدون مرجع تعليمات — قد لا يُعتمد للدفع</T>
      )}

      {msg && (
        <View style={[styles.msgBox, { backgroundColor: msg.ok ? colors.accent2_100 : colors.accent100 }]}>
          <Icon name={msg.ok ? 'check-circle' : 'alert-circle'} size={15} color={msg.ok ? colors.accent2_800 : colors.accent700} />
          <T style={{ flex: 1, fontSize: 12, color: msg.ok ? colors.accent2_800 : colors.accent700, textAlign: 'right' }}>{msg.text}</T>
        </View>
      )}

      {/* الإجراءات */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {canWriteVo && actions.map((a, i) => (
          <TouchableOpacity key={i} onPress={busy ? undefined : () => run(a.action)}
            style={[styles.actionBtn, a.kind === 'danger' ? styles.actionDanger : styles.actionPrimary]}>
            <T weight="medium" style={[styles.actionText, a.kind === 'danger' && { color: colors.accent700 }]}>{busy ? '…' : a.label}</T>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={pdf} style={styles.pdfBtn}>
          <Icon name="download" size={16} color={colors.neutral700} />
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = makeStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingBottom: 30, gap: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  title: { fontSize: 22 },
  sub: { fontSize: 12.5, color: colors.neutral600 },
  voHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  voNo: { fontSize: 16, color: colors.text, textAlign: 'right' },
  voDate: { fontSize: 12, color: colors.neutral600 },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill },
  pillText: { fontSize: 11 },
  voDesc: { fontSize: 13.5, lineHeight: 22, color: colors.neutral700, textAlign: 'right' },
  sep: { height: 1, backgroundColor: colors.divider8 },
  voMeta: { flexDirection: 'row' },
  voMetaLbl: { fontSize: 11, color: colors.neutral600, textAlign: 'right' },
  voMetaVal: { fontSize: 14, fontWeight: '600', color: colors.text },
  voBillable: { fontSize: 12.5, color: colors.accent2_800 },
  voRef: { fontSize: 11.5, color: colors.neutral600, textAlign: 'right' },
  voRefWarn: { fontSize: 11.5, color: colors.accent700, textAlign: 'right' },
  msgBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.sm, padding: 10 },
  actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: radius.md },
  actionPrimary: { backgroundColor: colors.accent2_800 },
  actionDanger: { backgroundColor: colors.accent100 },
  actionText: { fontSize: 13, color: colors.white },
  pdfBtn: { width: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.neutral300, borderRadius: radius.md },
}));
