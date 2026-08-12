import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T, L, H, Icon, Card } from '../components';
import { colors, space, radius, fonts, shadow, makeStyles } from '../theme';
import { getTenders, getTenderDetail, getWorkCategories } from '../api/services';
import { useAsync } from '../api/useAsync';
import { Loading, ErrorBox } from '../components/Async';

const nf = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0));

export default function TendersScreen({ navigation }) {
  const { data: tenders, loading, error, reload } = useAsync(() => getTenders(), [], []);
  const [selected, setSelected] = useState(null);

  if (selected) {
    return <TenderDetail tender={selected} onBack={() => setSelected(null)} navigation={navigation} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-right" size={20} color={colors.neutral700} />
          </TouchableOpacity>
          <View style={{ gap: 2, flex: 1 }}>
            <H style={styles.title}>العطاءات والتسعير</H>
            <T style={styles.sub}>{tenders ? tenders.length : 0} عطاء</T>
          </View>
        </View>

        {loading && <Loading label="جارٍ تحميل العطاءات…" />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {!loading && !error && (!tenders || tenders.length === 0) && (
          <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
            <Icon name="clipboard" size={26} color={colors.neutral500} />
            <T style={{ color: colors.neutral600, marginTop: 8, textAlign: 'center' }}>لا توجد عطاءات لها جدول كميات تقديري.</T>
          </Card>
        )}

        {!loading && !error && (tenders || []).map((t) => (
          <TouchableOpacity key={t.id} activeOpacity={0.85} onPress={() => setSelected(t)}>
            <Card style={styles.tenderCard}>
              <View style={styles.rowBetween}>
                <T weight="semibold" style={styles.tenderName}>{t.name}</T>
                {!!t.stage && <View style={styles.stageBadge}><T style={styles.stageText}>{t.stage}</T></View>}
              </View>
              {!!t.partner && <T style={styles.tenderPartner}>{t.partner}</T>}
              <View style={styles.sep} />
              <View style={styles.metricsRow}>
                <Metric label="التكلفة المباشرة" value={`${nf(t.directCost)} ر.س`} />
                <Metric label="سعر البيع" value={`${nf(t.sellingTotal)} ر.س`} accent />
              </View>
              <View style={styles.metricsRow}>
                <Metric label="هامش الربح" value={`${t.margin}%`} />
                <Metric label="غير مباشرة" value={`${t.indirectPercent}%`} />
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// تفاصيل العطاء
function TenderDetail({ tender, onBack, navigation }) {
  const { data: detail, loading } = useAsync(() => getTenderDetail(tender.id), [tender.id], null);

  // جمّع البنود حسب الفئة
  const grouped = {};
  if (detail && detail.lines) {
    detail.lines.forEach((ln) => {
      const cat = ln.category || 'بدون تصنيف';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(ln);
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <TouchableOpacity style={styles.circleBtn} onPress={onBack}>
            <Icon name="arrow-right" size={20} color={colors.neutral700} />
          </TouchableOpacity>
          <View style={{ gap: 2, flex: 1 }}>
            <H style={styles.title}>{tender.name}</H>
            {!!tender.partner && <T style={styles.sub}>{tender.partner}</T>}
          </View>
        </View>

        {loading && <Loading label="جارٍ تحميل تفاصيل العطاء…" />}

        {detail && (
          <>
            {/* ملخص التسعير */}
            <Card style={styles.summaryCard}>
              <T style={styles.sectionLbl}>ملخص التسعير</T>
              <SummaryRow label="إجمالي التكلفة المباشرة" value={`${nf(detail.directCost)} ر.س`} />
              <SummaryRow label="نسبة التكاليف غير المباشرة" value={`${detail.indirectPercent}%`} />
              <SummaryRow label="هامش الربح" value={`${detail.margin}%`} />
              <View style={styles.sep} />
              <SummaryRow label="سعر البيع النهائي" value={`${nf(detail.sellingTotal)} ر.س`} big />
            </Card>

            {/* التكاليف غير المباشرة */}
            {detail.indirects.length > 0 && (
              <>
                <T style={styles.sectionLbl}>التكاليف غير المباشرة</T>
                <Card style={styles.listCard}>
                  {detail.indirects.map((c, i) => (
                    <View key={c.id}>
                      {i > 0 && <View style={styles.sep} />}
                      <View style={styles.indirectRow}>
                        <View style={{ flex: 1 }}>
                          <T style={styles.indirectName}>{c.name}</T>
                          {!!c.note && <T style={styles.indirectNote}>{c.note}</T>}
                        </View>
                        <View style={{ alignItems: 'flex-start' }}>
                          <L style={styles.indirectVal}>{c.typeRaw === 'percent' ? `${c.value}%` : `${nf(c.value)} ر.س`}</L>
                          <T style={styles.indirectType}>{c.type}</T>
                        </View>
                      </View>
                    </View>
                  ))}
                </Card>
              </>
            )}

            {/* بنود جدول الكميات التقديري — مجمّعة حسب الفئة */}
            {Object.keys(grouped).length > 0 && (
              <>
                <T style={styles.sectionLbl}>بنود التسعير (حسب فئة العمل)</T>
                {Object.entries(grouped).map(([cat, lines]) => (
                  <Card key={cat} style={styles.listCard}>
                    <View style={styles.catHeader}>
                      <Icon name="folder" size={14} color={colors.accent2_800} />
                      <T weight="semibold" style={styles.catName}>{cat}</T>
                      <T style={styles.catCount}>{lines.length} بند</T>
                    </View>
                    {lines.map((ln) => (
                      <View key={ln.id} style={styles.boqLine}>
                        <View style={{ flex: 1 }}>
                          <T style={styles.boqName}>{ln.name}</T>
                          <T style={styles.boqMeta}>{nf(ln.qty)} {ln.unit} · تكلفة {nf(ln.costUnit)} · سعر {nf(ln.priceUnit)}</T>
                        </View>
                        <L style={styles.boqAmount}>{nf(ln.amount)}</L>
                      </View>
                    ))}
                  </Card>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, accent }) {
  return (
    <View style={{ flex: 1 }}>
      <T style={styles.metricLbl}>{label}</T>
      <L style={[styles.metricVal, accent && { color: colors.accent2_800 }]}>{value}</L>
    </View>
  );
}
function SummaryRow({ label, value, big }) {
  return (
    <View style={styles.summaryRow}>
      <T style={[styles.summaryLbl, big && { fontSize: 14, color: colors.text }]}>{label}</T>
      <L style={[styles.summaryVal, big && { fontSize: 18, color: colors.accent2_800 }]}>{value}</L>
    </View>
  );
}

const styles = makeStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingBottom: 30, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.neutral100, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  title: { fontSize: 21 },
  sub: { fontSize: 12.5, color: colors.neutral600, textAlign: 'right' },
  tenderCard: { gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  tenderName: { fontSize: 15, flex: 1, textAlign: 'right' },
  tenderPartner: { fontSize: 12.5, color: colors.neutral600, textAlign: 'right' },
  stageBadge: { backgroundColor: colors.accent2_100, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  stageText: { fontSize: 11, color: colors.accent2_800 },
  sep: { height: 1, backgroundColor: colors.divider8, marginVertical: 4 },
  metricsRow: { flexDirection: 'row', gap: 12 },
  metricLbl: { fontSize: 11, color: colors.neutral600, textAlign: 'right' },
  metricVal: { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right' },
  summaryCard: { gap: 4 },
  sectionLbl: { fontSize: 12.5, color: colors.neutral600, paddingHorizontal: 4, textAlign: 'right', marginBottom: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  summaryLbl: { fontSize: 12.5, color: colors.neutral600, textAlign: 'right' },
  summaryVal: { fontSize: 13.5, fontWeight: '600', color: colors.text },
  listCard: { gap: 2 },
  indirectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, gap: 12 },
  indirectName: { fontSize: 13, color: colors.text, textAlign: 'right' },
  indirectNote: { fontSize: 11, color: colors.neutral600, textAlign: 'right' },
  indirectVal: { fontSize: 13.5, fontWeight: '600', color: colors.accent2_800 },
  indirectType: { fontSize: 10.5, color: colors.neutral600 },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider8 },
  catName: { fontSize: 13.5, flex: 1, textAlign: 'right', color: colors.accent2_800 },
  catCount: { fontSize: 11, color: colors.neutral600 },
  boqLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.divider8 },
  boqName: { fontSize: 12.5, color: colors.text, textAlign: 'right' },
  boqMeta: { fontSize: 10.5, color: colors.neutral600, textAlign: 'right' },
  boqAmount: { fontSize: 13, fontWeight: '600', color: colors.accent700 },
}));
