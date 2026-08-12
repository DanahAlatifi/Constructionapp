import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ImageBackground, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { T, L, H, Icon } from '../components';
import { colors, space, radius, fonts, shadow, makeStyles } from '../theme';
import { PROJECT_IMAGES, DEFAULT_PROJECT_IMAGE, nf } from '../data/mock';
import { useProject } from '../ProjectContext';
import { getAlerts } from '../api/services';
import { useAsync } from '../api/useAsync';

// اختصار مربّع
function Quick({ icon, label, dark, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}
      style={[styles.quick, dark ? styles.quickDark : styles.quickLight]}>
      <Icon name={icon} size={20} color={dark ? colors.white : colors.neutral800} />
      <T style={[styles.quickLabel, { color: dark ? colors.white : colors.neutral800 }]}>{label}</T>
    </TouchableOpacity>
  );
}

// صف تنبيه
function AlertRow({ icon, bg, fg, title, sub, onPress, sep }) {
  return (
    <>
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.alertRow}>
        <View style={[styles.alertIcon, { backgroundColor: bg }]}>
          <Icon name={icon} size={19} color={fg} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T weight="semibold" style={styles.alertTitle}>{title}</T>
          <T style={styles.alertSub}>{sub}</T>
        </View>
        <Icon name="chevron-left" size={18} color={colors.neutral500} />
      </TouchableOpacity>
      {sep && <View style={styles.sep} />}
    </>
  );
}

export default function HomeScreen({ navigation }) {
  const { pid, setPid, projects, user, reloadProjects } = useProject();
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try { await reloadProjects(); } catch (e) {}
    setRefreshing(false);
  };
  const firstName = (user && user.name) ? user.name.split(' ')[0] : '';
  const p = projects[pid] || projects[0];
  const realId = p && p._raw ? p._raw.id : pid;
  // صورة المشروع من Odoo، أو صورة افتراضية موحّدة إن لم توجد
  const projImg = (p && p.image) ? { uri: p.image } : DEFAULT_PROJECT_IMAGE;
  const { data: alerts } = useAsync(() => getAlerts(realId, p ? p.name : ''), [realId]);

  const portfolioTotal = projects.reduce((s, pr) => s + (pr.value || 0), 0);
  const certifiedTotal = projects.reduce((s, pr) => s + (pr.certified || 0), 0);
  const short = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(0) + 'K' : String(Math.round(n)));
  const portfolioShort = short(portfolioTotal);
  const certifiedShort = short(certifiedTotal);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent2_800} colors={[colors.accent2_800]} />
        }>
        {/* الهيدر */}
        <View style={styles.header}>
          <View style={{ gap: 2 }}>
            <T style={styles.hi}>{firstName ? `مرحباً ${firstName}` : 'مرحباً'} 👷</T>
            <H style={styles.hiTitle}>تابع مشروعك اليوم</H>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.bell} onPress={() => navigation.navigate('Notifications')}>
              <Icon name="bell" size={18} color={colors.neutral800} />
              <View style={styles.bellDot} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
              <T weight="semibold" style={styles.avatarText}>{firstName ? firstName.charAt(0) : 'م'}</T>
            </TouchableOpacity>
          </View>
        </View>

        {/* البحث + قائمة */}
        <View style={styles.searchRow}>
          <TouchableOpacity style={styles.search} onPress={() => navigation.navigate('Search')} activeOpacity={0.7}>
            <Icon name="search" size={18} color={colors.neutral600} />
            <T style={styles.searchText}>ابحث في كل البيانات</T>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('AllProjects')}>
            <Icon name="menu" size={18} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* الاختصارات الأربعة */}
        <View style={styles.quickGrid}>
          <Quick icon="file-text" label="مستخلصات" dark onPress={() => navigation.navigate('Main', { screen: 'ClaimsTab' })} />
          <Quick icon="map-pin" label="الموقع" onPress={() => navigation.navigate('Main', { screen: 'SiteTab' })} />
          <Quick icon="users" label="الباطن" onPress={() => navigation.navigate('Subcontractors')} />
          <Quick icon="folder" label="مستندات" onPress={() => navigation.navigate('Documents')} />
        </View>

        {/* بطاقة المشروع المختار بصورة */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('ProjectDetails')} style={styles.projCard}>
          <ImageBackground source={projImg} style={styles.projImg} resizeMode="cover">
            <LinearGradient
              colors={['rgba(32,30,29,0)', 'rgba(32,30,29,0.35)', 'rgba(32,30,29,0.82)']}
              locations={[0.3, 0.58, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.projBadge}><T style={styles.projBadgeText}>المشروع المختار</T></View>
            <View style={styles.projInfo}>
              <View style={styles.projTopRow}>
                <T weight="semibold" style={styles.projName}>{p.name}</T>
                <L style={styles.projLoc}>{p.code}</L>
              </View>
              <View style={styles.projStats}>
                <L style={styles.projStat}>الإنجاز {p.progress}%</L>
                <L style={styles.projStat}>الهامش {p.margin}</L>
                <L style={styles.projStat}>الجدول {p.daysLeft > 0 ? `${p.daysLeft} يوم` : 'مُسلّم'}</L>
              </View>
              <L style={styles.projValue}>{p.valueShort} ر.س</L>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        {/* يحتاج انتباهك */}
        <View style={styles.attnHead}>
          <H style={styles.attnTitle}>يحتاج انتباهك</H>
          <TouchableOpacity onPress={() => navigation.navigate('Dashboard')} style={{ marginInlineStart: 'auto' }}>
            <T style={styles.attnLink}>على مستوى الشركة</T>
          </TouchableOpacity>
        </View>

        {(!alerts || alerts.length === 0) ? (
          <View style={styles.attnCard}>
            <View style={styles.alertRow}>
              <View style={[styles.alertIcon, { backgroundColor: colors.accent2_200 }]}>
                <Icon name="check" size={19} color={colors.accent2_800} />
              </View>
              <View style={{ flex: 1 }}>
                <T weight="semibold" style={styles.alertTitle}>لا توجد تنبيهات</T>
                <T style={styles.alertSub}>كل شيء على ما يرام في هذا المشروع</T>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.attnCard}>
            {alerts.map((a, i) => {
              const tone = a.kind === 'accent' ? { bg: colors.accent100, fg: colors.accent700 }
                : a.kind === 'accent2' ? { bg: colors.accent2_200, fg: colors.accent2_800 }
                : { bg: colors.neutral100, fg: colors.neutral700 };
              return (
                <AlertRow key={i} icon={a.icon} bg={tone.bg} fg={tone.fg}
                  title={a.title} sub={a.sub}
                  onPress={() => {
                    const tabs = ['HomeTab', 'ClaimsTab', 'SiteTab', 'MoreTab'];
                    if (tabs.includes(a.target)) navigation.navigate('Main', { screen: a.target });
                    else navigation.navigate(a.target);
                  }}
                  sep={i < alerts.length - 1} />
              );
            })}
          </View>
        )}

        {/* أعمال منفّذة ولم تُطالب بها */}
        {p && (
          <TouchableOpacity style={styles.unclaimedCard} activeOpacity={0.9} onPress={() => navigation.navigate('Main', { screen: 'ClaimsTab' })}>
            <View style={styles.unclaimedCircle}>
              <Icon name="chevron-left" size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <T style={styles.unclaimedLbl}>أعمال منفّذة ولم تُطالب بها</T>
              <L style={styles.unclaimedVal}>{nf(p.unclaimed || 0)} <T style={styles.unclaimedUnit}>ر.س</T></L>
            </View>
          </TouchableOpacity>
        )}

        {/* محفظة المشاريع */}
        <View style={styles.portfolioRow}>
          <PortStat label="محفظة المشاريع" value={portfolioShort} />
          <View style={styles.portDivider} />
          <PortStat label="المُطالَب به" value={certifiedShort} />
          <View style={styles.portDivider} />
          <PortStat label="عدد المشاريع" value={String(projects.length)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PortStat({ label, value }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <L style={styles.portVal}>{value}</L>
      <T style={styles.portLbl}>{label}</T>
    </View>
  );
}

const styles = makeStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 22, paddingBottom: 110, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  hi: { fontSize: 13, color: colors.neutral700 },
  hiTitle: { fontSize: 21, marginTop: 2 },
  headerIcons: { marginInlineStart: 'auto', flexDirection: 'row', alignItems: 'center', gap: 10 },
  bell: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.neutral100, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 10, right: 12, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.accent2_800, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 14 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.neutral100, borderRadius: radius.pill, paddingVertical: 13, paddingHorizontal: 18 },
  searchText: { fontSize: 13.5, color: colors.neutral700 },
  menuBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent2_800, alignItems: 'center', justifyContent: 'center' },
  quickGrid: { flexDirection: 'row', gap: 10 },
  quick: { flex: 1, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', gap: 8 },
  quickDark: { backgroundColor: colors.accent2_800 },
  quickLight: { backgroundColor: colors.neutral100 },
  quickLabel: { fontSize: 11.5 },
  projCard: { borderRadius: 24, overflow: 'hidden', height: 230, backgroundColor: colors.neutral200 },
  projImg: { flex: 1 },
  projBadge: { position: 'absolute', top: 14, insetInlineStart: 14, left: 14, backgroundColor: 'rgba(253,252,250,0.92)', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6 },
  projBadgeText: { fontSize: 11.5, color: colors.text },
  projInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, gap: 8 },
  projTopRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  projName: { fontSize: 19, color: colors.white, textAlign: 'right' },
  projLoc: { fontSize: 12, color: colors.white, opacity: 0.8, textAlign: 'right' },
  projValue: { fontSize: 17, color: colors.white, fontWeight: '600', textAlign: 'right' },
  projStats: { flexDirection: 'row', gap: 16 },
  projStat: { fontSize: 11.5, color: colors.white, opacity: 0.85 },
  attnHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  attnTitle: { fontSize: 16 },
  attnLink: { fontSize: 12.5, color: colors.neutral600 },
  attnCard: { backgroundColor: colors.card, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 6, ...shadow.card },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  alertIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: 14, color: colors.text, textAlign: 'right' },
  alertSub: { fontSize: 12, color: colors.neutral600, textAlign: 'right' },
  sep: { height: 1, backgroundColor: colors.divider8 },
  unclaimedCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.accent2_800, borderRadius: 24, padding: 20 },
  unclaimedCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(253,252,250,0.18)', alignItems: 'center', justifyContent: 'center' },
  unclaimedLbl: { fontSize: 12.5, color: 'rgba(253,252,250,0.8)', textAlign: 'right' },
  unclaimedVal: { fontSize: 26, color: colors.white, fontWeight: '600', marginTop: 4 },
  unclaimedUnit: { fontSize: 13, color: 'rgba(253,252,250,0.8)' },
  portfolioRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 24, paddingVertical: 18, ...shadow.card },
  portDivider: { width: 1, height: 32, backgroundColor: colors.divider8 },
  portVal: { fontSize: 18, color: colors.text, fontWeight: '600' },
  portLbl: { fontSize: 11, color: colors.neutral600 },
}));
