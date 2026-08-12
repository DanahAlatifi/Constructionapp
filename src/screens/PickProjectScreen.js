import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ImageBackground, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { T, L, H, Icon } from '../components';
import { colors, space, radius, fonts, makeStyles } from '../theme';
import { PROJECT_IMAGES, DEFAULT_PROJECT_IMAGE } from '../data/mock';
import { useProject } from '../ProjectContext';

export default function PickProjectScreen({ navigation }) {
  const { setPid, projects, loading, reloadProjects } = useProject();
  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => { setRefreshing(true); try { await reloadProjects(); } catch (e) {} setRefreshing(false); };
  const choose = (id) => { setPid(id); navigation.replace('Main'); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent2_800} colors={[colors.accent2_800]} />}>
        {/* العنوان */}
        <View style={styles.head}>
          <H style={styles.title}>اختر المشروع</H>
          <T style={styles.sub}>يمكنك تبديله لاحقاً من أعلى الشاشة الرئيسية</T>
        </View>

        {/* بطاقات المشاريع بصور كاملة */}
        <View style={styles.list}>
          {projects.map((p, idx) => (
            <TouchableOpacity key={p.id} activeOpacity={0.9} onPress={() => choose(idx)} style={styles.projCard}>
              <ImageBackground source={p.image ? { uri: p.image } : DEFAULT_PROJECT_IMAGE} style={styles.projImg} resizeMode="cover">
                <LinearGradient
                  colors={['rgba(32,30,29,0.18)', 'rgba(32,30,29,0.12)', 'rgba(32,30,29,0.62)']}
                  locations={[0, 0.42, 1]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.badge}><T style={styles.badgeText}>{p.status}</T></View>
                <View style={styles.projCircle}>
                  <Icon name="arrow-left" size={16} color={colors.white} />
                </View>
                <View style={styles.projBottom}>
                  <T weight="semibold" style={styles.projName}>{p.name}</T>
                  <L style={styles.projPct}>{p.progress}%</L>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = makeStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { paddingHorizontal: 22, paddingTop: 4, gap: 6 },
  title: { fontSize: 24 },
  sub: { fontSize: 13, color: colors.neutral600, lineHeight: 22 },
  list: { paddingHorizontal: 22, paddingTop: 16, gap: 14 },
  projCard: { borderRadius: 22, overflow: 'hidden', height: 168, backgroundColor: colors.neutral200 },
  projImg: { flex: 1 },
  badge: { position: 'absolute', top: 14, insetInlineStart: 16, left: 16, backgroundColor: 'rgba(253,252,250,0.9)', borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 6 },
  badgeText: { fontSize: 11, color: colors.text },
  projCircle: { position: 'absolute', top: 12, insetInlineEnd: 14, right: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(253,252,250,0.28)', alignItems: 'center', justifyContent: 'center' },
  projBottom: { position: 'absolute', bottom: 10, insetInlineStart: 18, insetInlineEnd: 18, left: 18, right: 18, flexDirection: 'row', alignItems: 'flex-end' },
  projName: { fontSize: 26, color: colors.white, flex: 1, textAlign: 'right' },
  projPct: { fontSize: 13, color: colors.white, opacity: 0.9, marginInlineStart: 'auto', paddingBottom: 6 },
}));
