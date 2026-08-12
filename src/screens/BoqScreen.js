import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T, L, H, Icon, Card, Bar } from '../components';
import { colors, space, radius, fonts, shadow, makeStyles, useThemeRedraw} from '../theme';
import { getBoqs, getBoqLines, setBoqLinePeriodQty, newClaimFromBoq } from '../api/services';
import { useProject, useProjectId, useCan } from '../ProjectContext';
import { useAsync } from '../api/useAsync';
import { Loading, ErrorBox } from '../components/Async';

const nf = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0));

export default function BoqScreen({ navigation }) {
  useThemeRedraw();
  const { projects } = useProject();
  const { pid, realId } = useProjectId();
  const p = projects[pid] || projects[0];
  const { data, loading, error, reload } = useAsync(() => getBoqs(realId), [realId]);
  const boqs = data || [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-right" size={20} color={colors.neutral700} />
          </TouchableOpacity>
          <View style={{ gap: 2, flex: 1 }}>
            <H style={styles.title}>جدول الكميات</H>
            <T style={styles.sub}>{p ? p.name : ''} · {boqs.length} جداول</T>
          </View>
        </View>

        {loading && <Loading label="جارٍ تحميل جداول الكميات…" />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {!loading && !error && boqs.length === 0 && (
          <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
            <Icon name="list" size={26} color={colors.neutral500} />
            <T style={{ color: colors.neutral600, marginTop: 8 }}>لا توجد جداول كميات على هذا المشروع.</T>
          </Card>
        )}

        {boqs.map((boq, i) => (
          <BoqCard key={i} boq={boq} navigation={navigation} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function BoqCard({ boq, navigation }) {
  const canCreateClaim = useCan('claim', 'create');
  const [open, setOpen] = useState(false);
  const linesAsync = useAsync(() => (open ? getBoqLines(boq.id) : Promise.resolve([])), [open, boq.id]);
  const lines = linesAsync.data || [];
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const confirmed = boq.state === 'confirmed';

  const createClaim = async () => {
    if (!confirmed) { setMsg({ ok: false, text: 'يجب اعتماد جدول الكميات (confirmed) قبل إنشاء مستخلص.' }); return; }
    setBusy(true); setMsg(null);
    try {
      await newClaimFromBoq(boq.id);
      setMsg({ ok: true, text: 'تم إنشاء مستخلص جديد محمّل بالكميات. راجعه في شاشة المستخلصات.' });
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'تعذّر إنشاء المستخلص.' });
    } finally { setBusy(false); }
  };

  return (
    <Card style={{ gap: 14 }}>
      <TouchableOpacity style={styles.boqHead} activeOpacity={0.7} onPress={() => setOpen(!open)}>
        <View style={{ flex: 1, gap: 4 }}>
          <T weight="semibold" style={styles.boqName}>{boq.name}</T>
          <L style={styles.boqMeta}>{nf(boq.executed)} / {nf(boq.total)} ر.س</L>
        </View>
        <View style={styles.boqPct}><L style={styles.boqPctText}>{boq.progress}%</L></View>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.neutral500} />
      </TouchableOpacity>
      <Bar value={boq.progress} />

      {open && (
        <View style={{ gap: 12 }}>
          <View style={styles.sep} />
          {linesAsync.loading && <Loading label="جارٍ تحميل البنود…" />}
          {!linesAsync.loading && lines.length === 0 && (
            <T style={{ fontSize: 12.5, color: colors.neutral600, textAlign: 'right' }}>لا توجد بنود في هذا الجدول.</T>
          )}
          {lines.map((ln) => (
            <BoqLineRow key={ln.id} line={ln} onSaved={() => linesAsync.reload()} />
          ))}

          {msg && (
            <View style={[styles.msgBox, { backgroundColor: msg.ok ? colors.accent2_100 : colors.accent100 }]}>
              <Icon name={msg.ok ? 'check-circle' : 'alert-circle'} size={15} color={msg.ok ? colors.accent2_800 : colors.accent700} />
              <T style={{ flex: 1, fontSize: 12, color: msg.ok ? colors.accent2_800 : colors.accent700, textAlign: 'right' }}>{msg.text}</T>
            </View>
          )}

          {lines.length > 0 && canCreateClaim && (
            <TouchableOpacity onPress={busy ? undefined : createClaim}
              style={[styles.claimBtn, !confirmed && { opacity: 0.6 }]}>
              <Icon name="file-plus" size={16} color={colors.white} />
              <T weight="medium" style={styles.claimBtnText}>{busy ? 'جارٍ…' : 'إنشاء مستخلص من هذه الكميات'}</T>
            </TouchableOpacity>
          )}
          {!confirmed && (
            <T style={styles.warnText}>⚠ الجدول غير معتمد — إدخال الكميات متاح، لكن إنشاء المستخلص يتطلب اعتماد الجدول أولاً.</T>
          )}
        </View>
      )}
    </Card>
  );
}

// صف بند BOQ — إدخال كمية الفترة
function BoqLineRow({ line, onSaved }) {
  const [qty, setQty] = useState(String(line.qtyPeriod || ''));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = parseFloat(qty || 0) !== (line.qtyPeriod || 0);

  const save = async () => {
    setSaving(true); setSaved(false);
    try {
      await setBoqLinePeriodQty(line.id, parseFloat(qty || 0));
      setSaved(true);
      if (onSaved) setTimeout(onSaved, 600);
    } catch (e) {
      Alert.alert('خطأ', e.message || 'تعذّر حفظ الكمية');
    } finally { setSaving(false); }
  };

  return (
    <View style={styles.lineRow}>
      <View style={styles.lineTop}>
        <View style={{ flex: 1 }}>
          <T weight="medium" style={styles.lineName}>{line.itemNo ? `[${line.itemNo}] ` : ''}{line.name}</T>
          <L style={styles.lineMeta}>
            تعاقدي {nf(line.qtyContract)} · منفّذ {nf(line.qtyExecuted)} · متبقٍ {nf(line.qtyRemaining)} {line.uom}
          </L>
        </View>
        <View style={styles.linePctWrap}><L style={styles.linePct}>{line.progress}%</L></View>
      </View>
      <View style={styles.qtyRow}>
        <T style={styles.qtyLbl}>كمية هذه الفترة:</T>
        <TextInput
          style={styles.qtyInput} value={qty} onChangeText={(t) => { setQty(t); setSaved(false); }}
          keyboardType="numeric" placeholder="0" placeholderTextColor={colors.neutral400} textAlign="center"
        />
        <TouchableOpacity onPress={dirty && !saving ? save : undefined}
          style={[styles.saveBtn, (!dirty || saving) && { opacity: 0.4 }]}>
          <Icon name={saved ? 'check' : 'save'} size={15} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = makeStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingBottom: 30, gap: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  title: { fontSize: 22 },
  sub: { fontSize: 12.5, color: colors.neutral600 },
  boqHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  boqName: { fontSize: 15, color: colors.text, textAlign: 'right' },
  boqMeta: { fontSize: 12, color: colors.neutral600 },
  boqPct: { backgroundColor: colors.accent2_100, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  boqPctText: { fontSize: 13, fontWeight: '600', color: colors.accent2_800 },
  sep: { height: 1, backgroundColor: colors.divider8 },
  lineRow: { gap: 8, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, ...shadow.sm },
  lineTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  lineName: { fontSize: 13, color: colors.text, textAlign: 'right' },
  lineMeta: { fontSize: 10.5, color: colors.neutral600, textAlign: 'right', marginTop: 2 },
  linePctWrap: { backgroundColor: colors.card, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  linePct: { fontSize: 11, fontWeight: '600', color: colors.accent2_800 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyLbl: { fontSize: 12, color: colors.neutral700, flex: 1, textAlign: 'right' },
  qtyInput: { width: 80, backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.neutral300, paddingVertical: 8, fontSize: 14, color: colors.text, fontFamily: fonts.latin },
  saveBtn: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: colors.accent2_800, alignItems: 'center', justifyContent: 'center' },
  msgBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.sm, padding: 10 },
  claimBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accent2_800, borderRadius: radius.md, paddingVertical: 14 },
  claimBtnText: { fontSize: 14, color: colors.white },
  warnText: { fontSize: 11.5, color: colors.accent700, textAlign: 'right' },
}));
