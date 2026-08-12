import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { T, L, H, Icon, Card } from '../components';
import { colors, space, radius, fonts, shadow, makeStyles, useThemeRedraw} from '../theme';
import { getDashboard } from '../api/services';
import { useAsync } from '../api/useAsync';
import { Loading, ErrorBox } from '../components/Async';

const nf = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0));
const short = (n) => {
  const v = Math.abs(n || 0);
  if (v >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(Math.round(n || 0));
};

export default function DashboardScreen({ navigation }) {
  useThemeRedraw();
  const [period, setPeriod] = useState('all');
  const { data, loading, error, reload } = useAsync(() => getDashboard(period), [period], null);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* رأس */}
        <View style={styles.head}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-right" size={20} color={colors.neutral700} />
          </TouchableOpacity>
          <View style={{ gap: 2, flex: 1 }}>
            <H style={styles.title}>لوحة المعلومات</H>
            <T style={styles.sub}>على مستوى الشركة</T>
          </View>
        </View>

        {/* الفترة */}
        <View style={styles.periodRow}>
          {[['all', 'الكل'], ['year', 'هذه السنة']].map(([k, label]) => {
            const on = period === k;
            return (
              <TouchableOpacity key={k} onPress={() => setPeriod(k)}
                style={[styles.periodChip, on && styles.periodChipOn]}>
                <T weight={on ? 'semibold' : 'regular'} style={[styles.periodText, on && styles.periodTextOn]}>{label}</T>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading && <Loading label="جارٍ تحميل المؤشرات…" />}
        {error && <ErrorBox message={error} onRetry={reload} />}

        {!loading && !error && data && (
          <>
            {/* محفظة الشركة */}
            <Card style={styles.kpiCard}>
              <View style={styles.kpiRow}>
                <Kpi label="محفظة العقود" value={short((data.kpis || {}).contract_total)} />
                <View style={styles.kpiDivider} />
                <Kpi label="المعتمد" value={short((data.kpis || {}).certified_total)} />
                <View style={styles.kpiDivider} />
                <Kpi label="المشاريع" value={String((data.kpis || {}).projects_count || 0)} />
              </View>
              <View style={styles.sep} />
              <View style={styles.kpiRow}>
                <Kpi label="الربح" value={short((data.kpis || {}).profit)} accent />
                <View style={styles.kpiDivider} />
                <Kpi label="الهامش" value={`${(data.kpis || {}).margin_percent || 0}%`} accent />
                <View style={styles.kpiDivider} />
                <Kpi label="التكلفة" value={short((data.kpis || {}).cost_total)} />
              </View>
            </Card>

            {/* الرسم البياني: الإيراد مقابل التكلفة */}
            {data.trend && data.trend.labels && data.trend.labels.length > 0 && (
              <Card style={{ gap: 14 }}>
                <View style={styles.rowBetween}>
                  <H style={styles.h5}>الإيراد مقابل التكلفة</H>
                  <T style={styles.miniLbl}>{data.trend.labels.length} شهراً</T>
                </View>
                <TrendChart trend={data.trend} />
                <View style={styles.legendRow}>
                  <Legend color={colors.accent2_800} label="إيراد معتمد" />
                  <Legend color={colors.accent} label="تكلفة فعلية" />
                  <Legend color={colors.neutral400} label="محصّل" />
                </View>
              </Card>
            )}

            {/* النقدية والذمم */}
            {data.cash && (
              <>
                <H style={styles.h5}>النقدية والذمم</H>
                <Card style={{ gap: 0 }}>
                  <Row label="المفوتر (إجمالي)" value={`${nf(data.cash.invoiced_total)} ر.س`} />
                  <Row label="الذمم المدينة (لنا)" value={`${nf(data.cash.receivable_outstanding)} ر.س`} accent />
                  <Row label="الذمم الدائنة (علينا)" value={`${nf(data.cash.payable_outstanding)} ر.س`} />
                  <Row label="صافي المركز" value={`${nf(data.cash.net_position)} ر.س`} accent2 />
                  <Row label="محصّل هذا الشهر" value={`${nf(data.cash.collected_this_month)} ر.س`} last />
                </Card>
              </>
            )}

            {/* المستخلصات */}
            {data.claims && (
              <>
                <H style={styles.h5}>المستخلصات</H>
                <Card style={styles.miniGrid}>
                  <MiniStat label="مقدّمة" value={data.claims.submitted_count} sub={`${short(data.claims.submitted_value)} ر.س`} />
                  <MiniStat label="بانتظار التحصيل" value={data.claims.awaiting_collection_count} sub={`${short(data.claims.awaiting_collection_value)} ر.س`} />
                  <MiniStat label="محصّلة" value="" sub={`${short(data.claims.collected_value)} ر.س`} />
                </Card>
              </>
            )}

            {/* أعمال غير مطالب بها */}
            {data.pipeline_money && (
              <Card style={styles.unclaimedCard}>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <T style={styles.unclaimedLbl}>أعمال منفّذة ولم تُطالب بها</T>
                  <L style={styles.unclaimedVal}>{nf(data.pipeline_money.executed_unclaimed)} <T style={styles.unclaimedUnit}>ر.س</T></L>
                </View>
                <View style={styles.unclaimedCircle}><Icon name="trending-up" size={22} color={colors.white} /></View>
              </Card>
            )}

            {/* المحتجزات والدفعات */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {data.retention && (
                <Card style={{ flex: 1, gap: 8 }}>
                  <T style={styles.miniLbl}>المحتجزات</T>
                  <L style={styles.miniBig}>{short(data.retention.balance)}</L>
                  <T style={styles.miniSub}>مُفرج {short(data.retention.released)}</T>
                </Card>
              )}
              {data.advances && (
                <Card style={{ flex: 1, gap: 8 }}>
                  <T style={styles.miniLbl}>الدفعات المقدمة</T>
                  <L style={styles.miniBig}>{short(data.advances.total)}</L>
                  <T style={styles.miniSub}>مسترد {short(data.advances.recovered)}</T>
                </Card>
              )}
            </View>

            {/* الكفاءة */}
            {data.efficiency && (
              <>
                <H style={styles.h5}>الكفاءة</H>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Card style={{ flex: 1, gap: 6, alignItems: 'center' }}>
                    <L style={styles.effVal}>{data.efficiency.avg_certification_days}</L>
                    <T style={styles.miniSub}>يوم متوسط الاعتماد</T>
                  </Card>
                  <Card style={{ flex: 1, gap: 6, alignItems: 'center' }}>
                    <L style={styles.effVal}>{data.efficiency.avg_collection_days}</L>
                    <T style={styles.miniSub}>يوم متوسط التحصيل</T>
                  </Card>
                </View>
              </>
            )}

            {/* نبض الموقع اليوم */}
            {data.site_today && (
              <Card style={styles.siteCard}>
                <View style={styles.siteItem}>
                  <L style={styles.siteVal}>{data.site_today.manpower}</L>
                  <T style={styles.miniSub}>عمالة اليوم</T>
                </View>
                <View style={styles.kpiDivider} />
                <View style={styles.siteItem}>
                  <L style={styles.siteVal}>{data.site_today.reports}</L>
                  <T style={styles.miniSub}>تقارير اليوم</T>
                </View>
                <View style={styles.kpiDivider} />
                <View style={styles.siteItem}>
                  <L style={[styles.siteVal, data.site_today.silent_projects > 0 && { color: colors.accent700 }]}>{data.site_today.silent_projects}</L>
                  <T style={styles.miniSub}>مشاريع صامتة</T>
                </View>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// الرسم البياني الخطي
function TrendChart({ trend }) {
  const W = Dimensions.get('window').width - 88;
  const H = 150;
  const pad = 8;
  const series = [
    { data: trend.revenue || [], color: colors.accent2_800 },
    { data: trend.cost || [], color: colors.accent },
    { data: trend.collected || [], color: colors.neutral400 },
  ];
  const allVals = series.flatMap((s) => s.data);
  const max = Math.max(1, ...allVals);
  const n = trend.labels.length;
  const x = (i) => pad + (i * (W - 2 * pad)) / Math.max(1, n - 1);
  const y = (v) => H - pad - ((v / max) * (H - 2 * pad));

  return (
    <Svg width={W} height={H}>
      {/* خطوط أفقية خفيفة */}
      {[0.25, 0.5, 0.75].map((f, i) => (
        <Line key={i} x1={pad} y1={H - pad - f * (H - 2 * pad)} x2={W - pad} y2={H - pad - f * (H - 2 * pad)}
          stroke={colors.divider8} strokeWidth={1} />
      ))}
      {series.map((s, si) => s.data.length > 1 && (
        <Polyline key={si}
          points={s.data.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
          fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      ))}
    </Svg>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <L style={[styles.kpiVal, accent && { color: colors.accent700 }]}>{value}</L>
      <T style={styles.kpiLbl}>{label}</T>
    </View>
  );
}
function Row({ label, value, accent, accent2, last }) {
  return (
    <View style={[styles.dataRow, last && { borderBottomWidth: 0 }]}>
      <T style={styles.dataLabel}>{label}</T>
      <L style={[styles.dataValue, accent && { color: colors.accent700 }, accent2 && { color: colors.accent2_800 }]}>{value}</L>
    </View>
  );
}
function MiniStat({ label, value, sub }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
      {value !== '' && <L style={styles.miniStatVal}>{value}</L>}
      <T style={styles.miniStatLbl}>{label}</T>
      <T style={styles.miniStatSub}>{sub}</T>
    </View>
  );
}
function Legend({ color, label }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <T style={styles.legendText}>{label}</T>
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
  periodRow: { flexDirection: 'row', gap: 8 },
  periodChip: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.neutral300 },
  periodChipOn: { backgroundColor: colors.accent2_800, borderColor: colors.accent2_800 },
  periodText: { fontSize: 13, color: colors.neutral700 },
  periodTextOn: { color: colors.white },
  kpiCard: { gap: 14 },
  kpiRow: { flexDirection: 'row', alignItems: 'center' },
  kpiDivider: { width: 1, height: 30, backgroundColor: colors.divider8 },
  kpiVal: { fontSize: 18, fontWeight: '600', color: colors.text },
  kpiLbl: { fontSize: 10.5, color: colors.neutral600, textAlign: 'center' },
  sep: { height: 1, backgroundColor: colors.divider8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h5: { fontSize: 16, paddingHorizontal: 4 },
  miniLbl: { fontSize: 12, color: colors.neutral600 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 18, flexWrap: 'wrap' },
  legendText: { fontSize: 11, color: colors.neutral700 },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.divider8 },
  dataLabel: { fontSize: 13, color: colors.neutral700 },
  dataValue: { fontSize: 13.5, fontWeight: '600', color: colors.text },
  miniGrid: { flexDirection: 'row' },
  miniStatVal: { fontSize: 20, fontWeight: '600', color: colors.text },
  miniStatLbl: { fontSize: 11, color: colors.neutral600 },
  miniStatSub: { fontSize: 11, color: colors.accent700 },
  unclaimedCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.accent2_800 },
  unclaimedLbl: { fontSize: 12.5, color: 'rgba(253,252,250,0.8)', textAlign: 'right' },
  unclaimedVal: { fontSize: 24, color: colors.white, fontWeight: '600', marginTop: 4 },
  unclaimedUnit: { fontSize: 12, color: 'rgba(253,252,250,0.8)' },
  unclaimedCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(253,252,250,0.18)', alignItems: 'center', justifyContent: 'center' },
  miniBig: { fontSize: 20, fontWeight: '600', color: colors.text },
  miniSub: { fontSize: 11, color: colors.neutral600, textAlign: 'center' },
  effVal: { fontSize: 26, fontWeight: '600', color: colors.accent2_800 },
  siteCard: { flexDirection: 'row', alignItems: 'center' },
  siteItem: { flex: 1, alignItems: 'center', gap: 4 },
  siteVal: { fontSize: 20, fontWeight: '600', color: colors.text },
}));
