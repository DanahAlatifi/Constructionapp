import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ImageBackground, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { T, L, H, Icon, Card, Btn } from '../components';
import { colors, space, radius, fonts, shadow, makeStyles, useThemeRedraw} from '../theme';
import { STAGES, ACTIONS, PROJECT_IMAGES, claimStatusInfo, nf } from '../data/mock';
import { useProject, useProjectId, useCan } from '../ProjectContext';
import { getClaims, claimAction, nextClaimAction, getReportUrl, loadClaimLines, getClaimLines, downloadReport } from '../api/services';
import { useAsync } from '../api/useAsync';
import { Loading, ErrorBox } from '../components/Async';

function pillStyle(tone) {
  if (tone === 'success') return { bg: colors.accent2_100, fg: colors.accent2_800 };
  if (tone === 'accent') return { bg: colors.accent100, fg: colors.accent800 };
  return { bg: colors.neutral100, fg: colors.neutral800 };
}

// يفضّل قيم Odoo الحقيقية، ويحسب فقط كبديل
function claimAmounts(c) {
  const gross = c.gross || 0;
  const ret = c.ret != null ? c.ret : Math.round(gross * 0.05);
  const adv = c.adv != null ? c.adv : Math.round(gross * 0.10);
  const net = c.net != null && c.net !== 0 ? c.net : (gross - ret - adv);
  return { gross, ret, adv, net };
}

export default function ClaimsScreen({ navigation }) {
  useThemeRedraw();
  const { projects } = useProject();
  const { pid, realId } = useProjectId();
  const p = projects[pid] || projects[0];
  const { data: claims, loading, error, reload } = useAsync(() => getClaims(realId), [realId]);
  const [sel, setSel] = useState(null);

  const list = claims || [];
  if (sel !== null && list[sel]) return <ClaimDetail claim={list[sel]} project={p} pid={pid} onBack={() => { setSel(null); reload(); }} navigation={navigation} />;

  const cntPending = list.filter((c) => c.st <= 1).length;
  const cntInvoiced = list.filter((c) => c.st === 2 || c.st === 3).length;
  const cntPaid = list.filter((c) => c.st === 4).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={{ paddingVertical: 4 }}>
          <H style={styles.title}>المستخلصات</H>
          <T style={styles.sub}>{p.name} · {list.length} مستخلصات</T>
        </View>

        {/* كرت الإحصائيات */}
        <Card style={styles.statCard}>
          <View style={styles.statGrid}>
            <View style={styles.statCol}>
              <T style={styles.statLbl}>قيد الاعتماد</T>
              <L style={[styles.statNum, { color: colors.accent700 }]}>{cntPending}</L>
            </View>
            <View style={styles.statCol}>
              <T style={styles.statLbl}>بانتظار التحصيل</T>
              <L style={styles.statNum}>{cntInvoiced}</L>
            </View>
            <View style={styles.statCol}>
              <T style={styles.statLbl}>محصّل</T>
              <L style={styles.statNum}>{cntPaid}</L>
            </View>
          </View>
        </Card>

        {/* كروت المستخلصات */}
        {loading && <Loading label="جارٍ تحميل المستخلصات…" />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {!loading && !error && list.length === 0 && (
          <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
            <T style={{ color: colors.neutral600 }}>لا توجد مستخلصات على هذا المشروع.</T>
          </Card>
        )}

        {list.map((c, i) => {
          const info = claimStatusInfo(c.st);
          const ps = pillStyle(info.tone);
          const calc = claimAmounts(c);
          return (
            <Card key={i} onPress={() => setSel(i)} style={styles.claimCard}>
              <View style={styles.claimTop}>
                <T weight="semibold" style={styles.claimTtl}>مستخلص {c.no}</T>
                <View style={[styles.pill, { backgroundColor: ps.bg }]}>
                  <T weight="medium" style={[styles.pillText, { color: ps.fg }]}>{info.label}</T>
                </View>
              </View>
              <View style={styles.claimSep} />
              <View style={styles.claimBody}>
                <View style={{ gap: 3 }}>
                  <T style={styles.claimLbl}>القيمة الصافية</T>
                  <L style={styles.claimAmt}>{nf(calc.net)}</L>
                </View>
                <View style={{ marginInlineStart: 'auto', gap: 3, alignItems: 'flex-end' }}>
                  <T style={styles.claimLbl}>التاريخ</T>
                  <L style={styles.claimDate}>{c.date}</L>
                </View>
              </View>
            </Card>
          );
        })}

        <T style={styles.note}>تُعرض مستخلصات المشروع المختار فقط · بدّل المشروع من الشاشة الرئيسية.</T>
      </ScrollView>
    </SafeAreaView>
  );
}

// ===== 08 تفاصيل المستخلص =====
function ClaimDetail({ claim, project, pid, onBack, navigation }) {
  const canWriteClaim = useCan('claim', 'write');
  const info = claimStatusInfo(claim.st);
  const calc = claimAmounts(claim);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState(null);

  const stateKeys = ['draft', 'submitted', 'certified', 'invoiced', 'collected'];
  const currentState = stateKeys[claim.st] || 'draft';
  const next = nextClaimAction(currentState);
  const claimId = (claim._raw && claim._raw.id) ? claim._raw.id : null;

  const doAction = async () => {
    if (!next) return;
    if (!claimId) { setMsg({ ok: false, text: 'تعذّر تحديد رقم المستخلص في النظام. حدّث القائمة وحاول مجدداً.' }); return; }
    setBusy(true); setMsg(null);
    try {
      await claimAction(claimId, next.action);
      setMsg({ ok: true, text: 'تم تنفيذ الإجراء وتحديثه في النظام.' });
      setTimeout(onBack, 1200);
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'تعذّر تنفيذ الإجراء.' });
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    if (!claimId) { setMsg({ ok: false, text: 'تعذّر تحديد رقم المستخلص لتصدير الـ PDF.' }); return; }
    setMsg({ ok: true, text: 'جارٍ تنزيل الملف…' });
    try {
      const res = await downloadReport('pt_construction_lite.report_progress_claim', claimId, 'claim');
      if (!res.ok) setMsg({ ok: false, text: res.error || 'تعذّر تنزيل الملف.' });
      else setMsg(null);
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'تعذّر فتح التصدير.' });
    }
  };

  // بنود المستخلص
  const linesAsync = useAsync(() => (claimId ? getClaimLines(claimId) : Promise.resolve([])), [claimId]);
  const lines = linesAsync.data || [];

  // تحميل السطور من BOQ (إلزامي قبل التقديم للمسودة)
  const loadLines = async () => {
    if (!claimId) { setMsg({ ok: false, text: 'تعذّر تحديد المستخلص.' }); return; }
    setBusy(true); setMsg(null);
    try {
      await loadClaimLines(claimId);
      await linesAsync.reload();
      setMsg({ ok: true, text: 'تم تحميل السطور من جدول الكميات.' });
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'تعذّر تحميل السطور.' });
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
        {/* شريط علوي: رجوع + مشاركة/تصدير */}
        <View style={styles.detailBar}>
          <TouchableOpacity style={styles.circleBtn} onPress={onBack}>
            <Icon name="arrow-right" size={20} color={colors.neutral800} />
          </TouchableOpacity>
          <View style={{ marginInlineStart: 'auto', flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.circleBtn} onPress={downloadPdf}><Icon name="download" size={18} color={colors.neutral800} /></TouchableOpacity>
          </View>
        </View>

        {/* صورة + pill المرحلة */}
        <View style={styles.detailImg}>
          <ImageBackground source={PROJECT_IMAGES[pid % PROJECT_IMAGES.length]} style={{ flex: 1 }} resizeMode="cover">
            <LinearGradient colors={['rgba(32,30,29,0)', 'rgba(32,30,29,0.55)']} locations={[0.38, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.detailStagePill}><T style={styles.detailStageText}>{info.label}</T></View>
          </ImageBackground>
        </View>

        {/* العنوان والوصف */}
        <View style={{ gap: 10 }}>
          <H style={styles.detailTitle}>مستخلص {claim.no}</H>
          <L style={styles.detailProj}>{project.name} · دورية شهرية</L>
          <T style={styles.detailDesc}>مطالبة بالأعمال المنفَّذة خلال الفترة، بعد خصم المحتجزات واسترداد الدفعة المقدمة، وفق جدول الكميات المعتمد.</T>
        </View>

        {/* بنود المستخلص — أولاً */}
        {lines.length > 0 && (
          <Card style={{ gap: 0 }}>
            <T weight="semibold" style={{ fontSize: 14, color: colors.text, textAlign: 'right', marginBottom: 8 }}>بنود المستخلص ({lines.length})</T>
            {lines.map((ln, i) => (
              <View key={i} style={styles.lineRow}>
                <View style={{ flex: 1 }}>
                  <T weight="medium" style={styles.lineName}>{ln.itemNo ? `[${ln.itemNo}] ` : ''}{ln.name}</T>
                  <L style={styles.lineQty}>هذه الفترة: {nf(ln.qtyPeriod)} · معتمد: {nf(ln.qtyCertified)}</L>
                </View>
                <L style={styles.lineAmt}>{nf(ln.amount)}</L>
              </View>
            ))}
          </Card>
        )}

        {/* المراحل العمودية المرقّمة — الحالة */}
        <View style={{ marginTop: 4 }}>
          {STAGES.map((s, i) => {
            const done = claim.st >= i;
            const current = claim.st === i;
            return (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepGutter}>
                  <View style={[styles.stepDot, done && styles.stepDotDone, current && styles.stepDotCurrent]}>
                    <L style={[styles.stepNum, done && { color: colors.white }]}>{i + 1}</L>
                  </View>
                  {i < STAGES.length - 1 && <View style={[styles.stepLine, claim.st > i && styles.stepLineDone]} />}
                </View>
                <View style={styles.stepContent}>
                  <T weight={current ? 'semibold' : 'regular'} style={[styles.stepLabel, done && { color: colors.text }]}>{s}</T>
                  <T style={styles.stepAction}>{ACTIONS[i]}</T>
                </View>
              </View>
            );
          })}
        </View>

        {/* التفصيل المالي — الإجمالي */}
        <Card style={styles.finCard}>
          <FinRow label="إجمالي الأعمال" value={nf(calc.gross)} />
          <FinRow label="المحتجزات" value={`- ${nf(calc.ret)}`} accent />
          <FinRow label="استرداد الدفعة المقدمة" value={`- ${nf(calc.adv)}`} accent />
          <View style={styles.finSep} />
          <View style={styles.netRow}>
            <T weight="semibold" style={styles.netLabel}>القيمة الصافية</T>
            <L style={styles.netValue}>{nf(calc.net)} <T style={styles.netUnit}>ر.س</T></L>
          </View>
        </Card>

        {msg && (
          <View style={[styles.msgBox, { backgroundColor: msg.ok ? colors.accent2_100 : colors.accent100 }]}>
            <Icon name={msg.ok ? 'check-circle' : 'alert-circle'} size={16} color={msg.ok ? colors.accent2_800 : colors.accent700} />
            <T style={[styles.msgText, { color: msg.ok ? colors.accent2_800 : colors.accent700 }]}>{msg.text}</T>
          </View>
        )}

        {/* زر تحميل السطور — يظهر للمسودة أو إذا لا توجد بنود */}
        {claim.st === 0 && (
          <Btn title={busy ? 'جارٍ…' : (lines.length ? 'إعادة تحميل السطور من الكميات' : 'تحميل السطور من جدول الكميات')}
            kind="secondary" icon="download-cloud" style={{ marginTop: 4 }} onPress={busy ? undefined : loadLines} />
        )}

        {next && canWriteClaim && (
          <Btn title={busy ? 'جارٍ التنفيذ…' : next.label} kind="primary" icon="check"
            style={{ marginTop: 10 }} onPress={busy ? undefined : doAction} />
        )}
        <Btn title="تصدير PDF" kind="secondary" icon="download" style={{ marginTop: 10 }} onPress={downloadPdf} />
      </ScrollView>
    </SafeAreaView>
  );
}

function FinRow({ label, value, accent }) {
  return (
    <View style={styles.finRow}>
      <T style={styles.finLabel}>{label}</T>
      <L style={[styles.finValue, accent && { color: colors.accent700 }]}>{value}</L>
    </View>
  );
}

const styles = makeStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingBottom: 110, gap: 16 },
  title: { fontSize: 26 },
  sub: { fontSize: 13, color: colors.neutral600, marginTop: 2 },
  statCard: { borderRadius: radius.lg },
  statGrid: { flexDirection: 'row' },
  statCol: { flex: 1, gap: 4 },
  statLbl: { fontSize: 12, color: colors.neutral600, textAlign: 'right' },
  statNum: { fontSize: 17, fontWeight: '600', color: colors.text, textAlign: 'right' },
  claimCard: { borderRadius: radius.lg, gap: 14 },
  claimTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  claimTtl: { fontSize: 17, color: colors.text },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill },
  pillText: { fontSize: 11 },
  claimSep: { height: 1, backgroundColor: colors.divider8 },
  claimBody: { flexDirection: 'row', alignItems: 'baseline', gap: 14 },
  claimLbl: { fontSize: 12, color: colors.neutral600, textAlign: 'right' },
  claimAmt: { fontSize: 19, fontWeight: '600', color: colors.text },
  claimDate: { fontSize: 13, color: colors.neutral600 },
  note: { fontSize: 12, color: colors.neutral500, textAlign: 'center', lineHeight: 20 },

  detailScroll: { paddingHorizontal: 22, paddingBottom: 28, gap: 18 },
  detailBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  circleBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  detailImg: { borderRadius: 24, overflow: 'hidden', height: 190, backgroundColor: colors.neutral200 },
  detailStagePill: { position: 'absolute', bottom: 14, insetInlineStart: 16, left: 16, backgroundColor: 'rgba(253,252,250,0.94)', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6 },
  detailStageText: { fontSize: 11.5, color: colors.text },
  detailTitle: { fontSize: 27 },
  detailProj: { fontSize: 13.5, color: colors.accent2_800 },
  detailDesc: { fontSize: 13.5, lineHeight: 24, color: colors.neutral700, textAlign: 'right' },
  stepRow: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  stepGutter: { alignItems: 'center', width: 28 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.neutral200, alignItems: 'center', justifyContent: 'center' },
  stepDotDone: { backgroundColor: colors.accent },
  stepDotCurrent: { backgroundColor: colors.accent },
  stepNum: { fontSize: 12, color: colors.neutral600, fontWeight: '600' },
  stepLine: { width: 2, flex: 1, backgroundColor: colors.neutral200, minHeight: 20 },
  stepLineDone: { backgroundColor: colors.accent },
  stepContent: { flex: 1, paddingBottom: 18, gap: 2 },
  stepLabel: { fontSize: 14, color: colors.neutral600, textAlign: 'right' },
  stepAction: { fontSize: 12, color: colors.neutral500, textAlign: 'right' },
  finCard: { borderRadius: radius.lg, gap: 0 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11 },
  finLabel: { fontSize: 13, color: colors.neutral700 },
  finValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  finSep: { height: 1, backgroundColor: colors.divider8, marginVertical: 6 },
  netRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 },
  netLabel: { fontSize: 14, color: colors.text },
  netValue: { fontSize: 20, fontWeight: '600', color: colors.accent700 },
  netUnit: { fontSize: 12, color: colors.neutral600 },
  msgBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.sm, padding: 12, marginTop: 8 },
  msgText: { flex: 1, fontSize: 12.5, textAlign: 'right' },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider8 },
  lineName: { fontSize: 13, color: colors.text, textAlign: 'right' },
  lineQty: { fontSize: 11, color: colors.neutral600, textAlign: 'right' },
  lineAmt: { fontSize: 13, fontWeight: '600', color: colors.accent700 },
}));
