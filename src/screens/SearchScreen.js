import React, { useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T, L, H, Icon, Card } from '../components';
import { colors, space, radius, fonts, shadow, makeStyles, useThemeRedraw} from '../theme';
import { globalSearch } from '../api/services';
import { useProject } from '../ProjectContext';

// خريطة الوجهة → شاشة
const TARGET_SCREEN = {
  project: 'ProjectDetails',
  claim: 'Main',        // تبويب المستخلصات
  report: 'Main',       // تبويب الموقع
  guarantee: 'Guarantees',
  subcontract: 'Subcontractors',
  vo: 'VariationOrders',
  purchase: 'PurchaseOrders',
};

export default function SearchScreen({ navigation }) {
  useThemeRedraw();
  const { projects, setPid } = useProject();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const timer = useRef(null);

  // افتح النتيجة: بدّل للمشروع الصح ثم انتقل للشاشة المناسبة
  const openResult = (r) => {
    // بدّل المشروع إن كان للنتيجة مشروع
    if (r.projectId != null) {
      const idx = projects.findIndex((p) => p && p._raw && p._raw.id === r.projectId);
      if (idx >= 0) setPid(idx);
    }
    if (r.target === 'claim') {
      navigation.navigate('Main', { screen: 'ClaimsTab' });
    } else if (r.target === 'report') {
      navigation.navigate('Main', { screen: 'SiteTab' });
    } else if (r.target === 'project') {
      navigation.navigate('ProjectDetails');
    } else {
      const screen = TARGET_SCREEN[r.target];
      if (screen) navigation.navigate(screen);
    }
  };

  const runSearch = (text) => {
    setQuery(text);
    if (timer.current) clearTimeout(timer.current);
    if (!text.trim()) { setResults([]); setSearched(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true); setSearched(true);
      try {
        const res = await globalSearch(text);
        setResults(res);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  // جمّع النتائج حسب الفئة
  const grouped = results.reduce((acc, r) => {
    (acc[r.category] = acc[r.category] || []).push(r);
    return acc;
  }, {});
  const categories = Object.keys(grouped);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-right" size={20} color={colors.neutral700} />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <Icon name="search" size={18} color={colors.neutral500} />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث في كل البيانات…"
            placeholderTextColor={colors.neutral400}
            value={query} onChangeText={runSearch}
            textAlign="right" autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => runSearch('')}>
              <Icon name="x" size={16} color={colors.neutral500} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {loading && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator color={colors.accent2_800} />
            <T style={{ color: colors.neutral600, marginTop: 10, fontSize: 13 }}>جارٍ البحث…</T>
          </View>
        )}

        {!loading && !searched && (
          <View style={{ alignItems: 'center', paddingVertical: 50, gap: 10 }}>
            <Icon name="search" size={32} color={colors.neutral400} />
            <T style={{ color: colors.neutral600, fontSize: 14 }}>ابحث في المشاريع، المستخلصات، التقارير،</T>
            <T style={{ color: colors.neutral600, fontSize: 14 }}>الضمانات، الباطن، أوامر التغيير والشراء</T>
          </View>
        )}

        {!loading && searched && results.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 50, gap: 10 }}>
            <Icon name="inbox" size={30} color={colors.neutral400} />
            <T style={{ color: colors.neutral600, fontSize: 14 }}>لا توجد نتائج لـ "{query}"</T>
          </View>
        )}

        {!loading && categories.map((cat) => (
          <View key={cat} style={{ marginBottom: 8 }}>
            <T style={styles.catLabel}>{cat} ({grouped[cat].length})</T>
            <Card style={{ gap: 0 }}>
              {grouped[cat].map((r, i) => (
                <View key={i}>
                  <TouchableOpacity style={styles.resultRow} activeOpacity={0.7} onPress={() => openResult(r)}>
                    <View style={styles.resultIcon}>
                      <Icon name={r.icon} size={17} color={colors.accent2_800} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <T weight="medium" style={styles.resultTitle}>{r.title}</T>
                      {!!r.sub && <T style={styles.resultSub}>{r.sub}</T>}
                    </View>
                    <Icon name="chevron-left" size={18} color={colors.neutral400} />
                  </TouchableOpacity>
                  {i < grouped[cat].length - 1 && <View style={styles.sep} />}
                </View>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = makeStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 11, ...shadow.sm },
  searchInput: { flex: 1, fontSize: 13.5, color: colors.text, fontFamily: fonts.arabic, textAlign: 'right' },
  scroll: { paddingHorizontal: 20, paddingBottom: 30, gap: 4 },
  catLabel: { fontSize: 13, color: colors.neutral600, marginBottom: 8, marginTop: 8, paddingHorizontal: 4, textAlign: 'right' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  resultIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accent2_100, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 14, color: colors.text, textAlign: 'right' },
  resultSub: { fontSize: 12, color: colors.neutral600, textAlign: 'right', marginTop: 2 },
  sep: { height: 1, backgroundColor: colors.divider8 },
}));
