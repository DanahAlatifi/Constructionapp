import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ImageBackground, Linking, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { T, L, H, Icon, Card, Bar, Btn } from '../components';
import { colors, space, radius, fonts, shadow, makeStyles } from '../theme';
import { PROJECT_IMAGES, DEFAULT_PROJECT_IMAGE, ROLES, nf } from '../data/mock';
import { useProject, useProjectId, useCan } from '../ProjectContext';
import { getSubcontractors, getGuarantees, getRetention, getProjectDetail, releaseRetention, getReportUrl, REPORTS_LIST, createGuarantee, GUARANTEE_TYPES, getNotifications, getSubClaims, subClaimAction, nextSubClaimAction, subClaimStatusLabel, guaranteeReleaseAction, getRetentionReleases, retentionReleaseAction, nextRetentionAction, getSubRetentions, createSubRetention, subRetentionAction, nextSubRetentionAction, getSubClaimLines, downloadReport } from '../api/services';
import { useAsync } from '../api/useAsync';
import { Loading, ErrorBox } from '../components/Async';

// شريط علوي بزر رجوع دائري
function BackHeader({ title, subtitle, navigation }) {
  return (
    <View style={styles.backHead}>
      <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
        <Icon name="arrow-right" size={20} color={colors.neutral700} />
      </TouchableOpacity>
      <View style={{ gap: 2, flex: 1 }}>
        <H style={styles.backTitle}>{title}</H>
        {subtitle ? <T style={styles.backSub}>{subtitle}</T> : null}
      </View>
    </View>
  );
}

function pill(tone) {
  if (tone === 'accent2' || tone === 'success') return { bg: colors.accent2_100, fg: colors.accent2_800 };
  if (tone === 'accent') return { bg: colors.accent100, fg: colors.accent700 };
  return { bg: colors.neutral100, fg: colors.neutral700 };
}
function Pill({ label, tone }) {
  const p = pill(tone);
  return <View style={[st.pill, { backgroundColor: p.bg }]}><T weight="medium" style={[st.pillText, { color: p.fg }]}>{label}</T></View>;
}

// ===== 13 كل المشاريع =====
export function AllProjectsScreen({ navigation, route }) {
  const { setPid, projects, pid: currentPid } = useProject();
  const [query, setQuery] = useState('');
  const totalValue = projects.reduce((sum, p) => sum + (p.value || 0), 0);
  const totalShort = totalValue >= 1e6 ? (totalValue/1e6).toFixed(1) + 'M' : nf(totalValue);
  const q = query.trim();
  const list = projects.filter((p) => {
    return !q || (p.name && p.name.includes(q)) || (p.code && p.code.includes(q));
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackHeader title="كل المشاريع" subtitle={`${projects.length} مشاريع · ${totalShort} ر.س`} navigation={navigation} />

        {/* البحث */}
        <View style={apSearchStyles.searchBox}>
          <Icon name="search" size={18} color={colors.neutral500} />
          <TextInput
            style={apSearchStyles.searchInput}
            placeholder="ابحث باسم المشروع أو الكود"
            placeholderTextColor={colors.neutral400}
            value={query} onChangeText={setQuery}
            textAlign="right"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Icon name="x" size={16} color={colors.neutral500} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ gap: 14 }}>
          {list.map((p, idx) => {
            const realIdx = projects.indexOf(p);
            const isSelected = realIdx === currentPid;
            return (
              <TouchableOpacity key={idx} activeOpacity={0.9}
                onPress={() => { setPid(realIdx); navigation.navigate('Main', { screen: 'HomeTab' }); }}
                style={[apCardStyles.projCard, isSelected && { borderWidth: 2, borderColor: colors.accent2_800 }]}>
                <ImageBackground source={p.image ? { uri: p.image } : DEFAULT_PROJECT_IMAGE} style={apCardStyles.projImg} resizeMode="cover">
                  <LinearGradient
                    colors={['rgba(32,30,29,0.18)', 'rgba(32,30,29,0.12)', 'rgba(32,30,29,0.62)']}
                    locations={[0, 0.42, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={apCardStyles.badge}>
                    <T style={apCardStyles.badgeText}>{isSelected ? 'المختار' : p.status}</T>
                  </View>
                  <View style={apCardStyles.projCircle}>
                    <Icon name="arrow-left" size={16} color={colors.white} />
                  </View>
                  <View style={apCardStyles.projBottom}>
                    <T weight="semibold" style={apCardStyles.projName}>{p.name}</T>
                    <L style={apCardStyles.projPct}>{p.progress}%</L>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ===== 06 تفاصيل المشروع =====
export function ProjectDetailsScreen({ navigation }) {
  const { projects } = useProject();
  const { pid, realId } = useProjectId();
  const p = projects[pid] || projects[0];
  const detail = useAsync(() => getProjectDetail(realId), [realId], { boq: [], meta: null, loc: '' });
  const boq = (detail.data && detail.data.boq) ? detail.data.boq : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        {/* صورة كبيرة مع زر رجوع */}
        <View style={styles.heroImg}>
          <ImageBackground source={p && p.image ? { uri: p.image } : DEFAULT_PROJECT_IMAGE} style={{ flex: 1 }} resizeMode="cover">
            <LinearGradient colors={['rgba(32,30,29,0.35)', 'rgba(32,30,29,0)', 'rgba(32,30,29,0.75)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
              <TouchableOpacity style={styles.heroBack} onPress={() => navigation.goBack()}>
                <Icon name="arrow-right" size={20} color={colors.white} />
              </TouchableOpacity>
              <View style={styles.heroInfo}>
                <View style={styles.heroBadge}><T style={styles.heroBadgeText}>{p.status}</T></View>
                <H style={styles.heroName}>{p.name}</H>
                <L style={styles.heroLoc}>{p.location || p.code}</L>
              </View>
            </SafeAreaView>
          </ImageBackground>
        </View>

        <View style={styles.body}>
          {/* الإنجاز */}
          <Card style={{ gap: 12 }}>
            <View style={styles.rowBetween}>
              <T style={styles.cardLbl}>نسبة الإنجاز</T>
              <L style={styles.bigPct}>{p.progress}%</L>
            </View>
            <Bar value={p.progress} height={10} />
          </Card>

          <H style={styles.h5}>مركز المشروع</H>
          <Card style={{ gap: 0 }}>
            <Row label="قيمة العقد" value={`${nf(p.value)} ر.س`} />
            <Row label="المُطالَب به" value={`${p.claimed} ر.س`} accent />
            <Row label="هامش الربح" value={p.margin} />
            <Row label="نسبة المحتجزات" value={`${p.retentionPercent || 5}%`} />
            <Row label="استرداد الدفعة" value={`${p.advancePercent || 10}%`} />
            <Row label="تاريخ العقد" value={p.contractDate || '—'} />
            <Row label="الانتهاء المتوقع" value={p.endDate || '—'} last />
          </Card>

          <H style={styles.h5}>التقدّم بالتخصص</H>
          <Card style={{ gap: 0 }}>
            {boq.map((b, i) => (
              <View key={i} style={[styles.boqItem, i === boq.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.rowBetween}>
                  <T weight="semibold" style={styles.boqName}>{b.n}</T>
                  <L style={styles.boqPct}>{b.p}%</L>
                </View>
                <T style={styles.boqQty}>{b.q}</T>
                <Bar value={b.p} color={b.p === 100 ? colors.accent2_500 : colors.accent} />
              </View>
            ))}
          </Card>

          <Btn title="فتح مستخلصات المشروع" kind="primary" icon="file-text" style={{ marginTop: 16 }}
            onPress={() => navigation.navigate('Main', { screen: 'ClaimsTab' })} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ===== 11 مقاولو الباطن =====
export function SubcontractorsScreen({ navigation }) {
  const { projects } = useProject();
  const { pid, realId } = useProjectId();
  const p = projects[pid] || projects[0];
  const { data, loading, error, reload } = useAsync(() => getSubcontractors(realId), [realId]);
  const subs = data || [];
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackHeader title="مقاولو الباطن" subtitle={`${p.name} · ${subs.length} عقود`} navigation={navigation} />

        {loading && <Loading label="جارٍ تحميل عقود الباطن…" />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {subs.map((s, i) => (
          <SubcontractCard key={i} sub={s} />
        ))}

        {!loading && subs.length === 0 && (
          <Card style={styles.empty}><T style={styles.emptyText}>لا توجد عقود باطن على هذا المشروع.</T></Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// عقد باطن — قابل للتوسّع لعرض مستخلصاته
function SubcontractCard({ sub }) {
  const canReleaseSub = useCan('subRetention', 'create');
  const [open, setOpen] = useState(false);
  const subId = sub._raw && sub._raw.id ? sub._raw.id : null;
  const claims = useAsync(() => (open && subId ? getSubClaims(subId) : Promise.resolve([])), [open, subId]);
  const rets = useAsync(() => (open && subId ? getSubRetentions(subId) : Promise.resolve([])), [open, subId]);
  const list = claims.data || [];
  const retList = rets.data || [];
  const [relMsg, setRelMsg] = useState(null);

  const releaseRet = async (percent) => {
    if (!subId) return;
    setRelMsg(null);
    try {
      await createSubRetention(subId, percent);
      setRelMsg({ ok: true, text: `تم إنشاء إفراج ${percent}% لمحتجزات الباطن.` });
      rets.reload();
    } catch (e) {
      setRelMsg({ ok: false, text: e.message || 'تعذّر الإفراج.' });
    }
  };

  return (
    <Card style={{ gap: 16 }}>
      <TouchableOpacity style={styles.subHead} activeOpacity={0.7} onPress={() => setOpen(!open)}>
        <View style={{ gap: 2, flex: 1 }}>
          <T weight="semibold" style={styles.subName}>{sub.name}</T>
          <L style={styles.subCode}>{sub.code}</L>
        </View>
        <Pill label={sub.status} tone={sub.status === 'ساري' ? 'accent2' : 'neutral'} />
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.neutral500} />
      </TouchableOpacity>
      <View style={styles.sep} />
      <View style={styles.sub3}>
        <Metric3 label="قيمة العقد" value={sub.v} />
        <Metric3 label="معتمد" value={sub.a} />
        <Metric3 label="محتجز" value={sub.r} />
      </View>

      {/* عند الفتح */}
      {open && (
        <View style={{ gap: 10 }}>
          <View style={styles.sep} />
          <T weight="medium" style={{ fontSize: 13, color: colors.text, textAlign: 'right' }}>مستخلصات الباطن</T>
          {claims.loading && <Loading label="جارٍ التحميل…" />}
          {!claims.loading && list.length === 0 && (
            <T style={{ fontSize: 12.5, color: colors.neutral600, textAlign: 'right' }}>لا توجد مستخلصات على هذا العقد.</T>
          )}
          {list.map((c, i) => (
            <SubClaimRow key={i} claim={c} onDone={() => claims.reload()} />
          ))}

          {/* محتجزات الباطن */}
          <View style={styles.sep} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <T weight="medium" style={{ fontSize: 13, color: colors.text, textAlign: 'right', flex: 1 }}>محتجزات الباطن</T>
          </View>
          {rets.loading && <Loading label="جارٍ التحميل…" />}
          {retList.map((r, i) => (
            <SubRetentionRow key={i} release={r} onDone={() => rets.reload()} />
          ))}
          {relMsg && (
            <T style={{ fontSize: 11.5, color: relMsg.ok ? colors.accent2_800 : colors.accent700, textAlign: 'right' }}>{relMsg.text}</T>
          )}
          {canReleaseSub && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => releaseRet(50)}
              style={{ flex: 1, alignItems: 'center', backgroundColor: colors.accent2_800, borderRadius: radius.md, paddingVertical: 10 }}>
              <T weight="medium" style={{ fontSize: 12.5, color: colors.white }}>إفراج 50%</T>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => releaseRet(100)}
              style={{ flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.neutral300, borderRadius: radius.md, paddingVertical: 10 }}>
              <T weight="medium" style={{ fontSize: 12.5, color: colors.text }}>إفراج 100%</T>
            </TouchableOpacity>
          </View>
          )}
        </View>
      )}
    </Card>
  );
}

// صف محتجز باطن
function SubRetentionRow({ release, onDone }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const rid = release._raw && release._raw.id ? release._raw.id : null;
  const next = nextSubRetentionAction(release.state);

  const run = async () => {
    if (!next || !rid) return;
    setBusy(true); setMsg(null);
    try {
      await subRetentionAction(rid, next.action);
      setMsg({ ok: true, text: 'تم في النظام.' });
      setTimeout(() => { if (onDone) onDone(); }, 900);
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'تعذّر التنفيذ.' });
    } finally { setBusy(false); }
  };

  const tone = release.state === 'paid' ? 'accent2' : release.state === 'billed' ? 'accent' : 'neutral';
  return (
    <View style={styles.subClaimRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <T weight="medium" style={{ fontSize: 12.5, color: colors.text, textAlign: 'right' }}>إفراج {release.no}</T>
          <L style={{ fontSize: 11, color: colors.neutral600, textAlign: 'right' }}>{nf(release.amount)} ر.س · {release.percent}%</L>
        </View>
        <Pill label={release.stateLabel} tone={tone} />
      </View>
      {msg && <T style={{ fontSize: 11, color: msg.ok ? colors.accent2_800 : colors.accent700, textAlign: 'right' }}>{msg.text}</T>}
      {next && (
        <TouchableOpacity onPress={busy ? undefined : run}
          style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent2_800, borderRadius: radius.md, paddingVertical: 9 }}>
          <T weight="medium" style={{ fontSize: 12, color: colors.white }}>{busy ? 'جارٍ…' : next.label}</T>
        </TouchableOpacity>
      )}
    </View>
  );
}

// صف مستخلص باطن مع إجراء
function SubClaimRow({ claim, onDone }) {
  const canWrite = useCan('subclaim', 'write');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showLines, setShowLines] = useState(false);
  const cid = claim._raw && claim._raw.id ? claim._raw.id : null;
  const next = nextSubClaimAction(claim.stateRaw);
  const linesAsync = useAsync(() => (showLines && cid ? getSubClaimLines(cid) : Promise.resolve([])), [showLines, cid]);
  const lines = linesAsync.data || [];

  const doAction = async () => {
    if (!next || !cid) { setMsg({ ok: false, text: 'تعذّر تحديد المستخلص.' }); return; }
    setBusy(true); setMsg(null);
    try {
      await subClaimAction(cid, next.action);
      setMsg({ ok: true, text: 'تم في النظام.' });
      setTimeout(() => { if (onDone) onDone(); }, 900);
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'تعذّر التنفيذ.' });
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.subClaimRow}>
      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} activeOpacity={0.7} onPress={() => setShowLines(!showLines)}>
        <Icon name={showLines ? 'chevron-up' : 'chevron-down'} size={15} color={colors.neutral500} />
        <View style={{ flex: 1 }}>
          <T weight="medium" style={{ fontSize: 13, color: colors.text, textAlign: 'right' }}>مستخلص {claim.no}</T>
          <L style={{ fontSize: 11.5, color: colors.neutral600, textAlign: 'right' }}>{nf(claim.net)} ر.س · {claim.date}</L>
        </View>
        <Pill label={subClaimStatusLabel(claim.st)} tone={claim.st >= 2 ? 'accent2' : claim.st === 1 ? 'accent' : 'neutral'} />
      </TouchableOpacity>

      {/* بنود المستخلص */}
      {showLines && (
        <View style={{ gap: 6, paddingVertical: 4 }}>
          {linesAsync.loading && <T style={{ fontSize: 11, color: colors.neutral600, textAlign: 'right' }}>جارٍ التحميل…</T>}
          {!linesAsync.loading && lines.length === 0 && (
            <T style={{ fontSize: 11, color: colors.neutral600, textAlign: 'right' }}>لا توجد بنود.</T>
          )}
          {lines.map((ln, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.divider8 }}>
              <L style={{ fontSize: 11, fontWeight: '600', color: colors.accent700 }}>{nf(ln.amount)}</L>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 11.5, color: colors.text, textAlign: 'right' }}>{ln.itemNo ? `[${ln.itemNo}] ` : ''}{ln.name}</T>
                <L style={{ fontSize: 10, color: colors.neutral600, textAlign: 'right' }}>فترة {nf(ln.qtyPeriod)} · معتمد {nf(ln.qtyCertified)}</L>
              </View>
            </View>
          ))}
        </View>
      )}

      {msg && (
        <T style={{ fontSize: 11.5, color: msg.ok ? colors.accent2_800 : colors.accent700, textAlign: 'right' }}>{msg.text}</T>
      )}
      {next && canWrite && (
        <TouchableOpacity onPress={busy ? undefined : doAction}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.accent2_800, borderRadius: radius.md, paddingVertical: 9 }}>
          <T weight="medium" style={{ fontSize: 12, color: colors.white }}>{busy ? 'جارٍ…' : next.label}</T>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ===== 12 المحتجزات والضمانات =====
// متابعة الإفراجات عن المحتجزات (فوترة/تحصيل)
function RetentionReleases({ realId }) {
  const { data, loading, reload } = useAsync(() => getRetentionReleases(realId), [realId]);
  const releases = data || [];
  if (!loading && releases.length === 0) return null;

  return (
    <>
      <H style={[styles.h5, { paddingHorizontal: 4 }]}>متابعة الإفراجات</H>
      {loading && <Loading label="جارٍ التحميل…" />}
      {releases.map((r, i) => (
        <RetentionReleaseRow key={i} release={r} onDone={reload} />
      ))}
    </>
  );
}

function RetentionReleaseRow({ release, onDone }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const rid = release._raw && release._raw.id ? release._raw.id : null;
  const next = nextRetentionAction(release.state);

  const run = async () => {
    if (!next || !rid) return;
    setBusy(true); setMsg(null);
    try {
      await retentionReleaseAction(rid, next.action);
      setMsg({ ok: true, text: 'تم في النظام.' });
      setTimeout(() => { if (onDone) onDone(); }, 900);
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'تعذّر التنفيذ.' });
    } finally { setBusy(false); }
  };

  const tone = release.state === 'collected' ? 'accent2' : release.state === 'invoiced' ? 'accent' : 'neutral';

  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <T weight="semibold" style={{ fontSize: 14, color: colors.text, textAlign: 'right' }}>إفراج {release.no}</T>
          <L style={{ fontSize: 11.5, color: colors.neutral600, textAlign: 'right' }}>{nf(release.amount)} ر.س · {release.percent}% · {release.date}</L>
        </View>
        <Pill label={release.stateLabel} tone={tone} />
      </View>
      {msg && (
        <T style={{ fontSize: 11.5, color: msg.ok ? colors.accent2_800 : colors.accent700, textAlign: 'right' }}>{msg.text}</T>
      )}
      {next && (
        <TouchableOpacity onPress={busy ? undefined : run}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.accent2_800, borderRadius: radius.md, paddingVertical: 11 }}>
          <T weight="medium" style={{ fontSize: 13, color: colors.white }}>{busy ? 'جارٍ…' : next.label}</T>
        </TouchableOpacity>
      )}
    </Card>
  );
}

export function GuaranteesScreen({ navigation }) {
  const canReleaseRet = useCan('retention', 'create');
  const { projects } = useProject();
  const { pid, realId } = useProjectId();
  const p = projects[pid] || projects[0];
  const ret = useAsync(() => getRetention(realId, p), [realId], { total: 0, released: 0, balance: 0 });
  const gs = useAsync(() => getGuarantees(), []);
  const total = (ret.data && ret.data.total) || 0;
  const released = (ret.data && ret.data.released) || Math.round(total * 0.5);
  const remaining = (ret.data && ret.data.balance) != null ? ret.data.balance : (total - released);
  const guarantees = gs.data || [];
  const [relMsg, setRelMsg] = useState(null);
  const [openG, setOpenG] = useState(null);
  const doRelease = async (percent) => {
    if (!realId) return;
    setRelMsg(null);
    try {
      await releaseRetention(realId, percent);
      setRelMsg({ ok: true, text: `تم إنشاء إفراج ${percent}% في النظام.` });
      ret.reload();
    } catch (e) {
      setRelMsg({ ok: false, text: e.message || 'تعذّر الإفراج.' });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackHeader title="المحتجزات والضمانات" navigation={navigation} />

        {/* محتجزات المشروع */}
        <Card style={{ gap: 16 }}>
          <View style={styles.rowBetween}>
            <T style={styles.cardLbl}>محتجزات {p.name}</T>
            <L style={styles.retTotal}>{nf(total)}</L>
          </View>
          <View style={styles.retBar}>
            <View style={[styles.retBarFill, { width: `${total > 0 ? 50 : 0}%` }]} />
          </View>
          <View style={styles.rowBetween}>
            <L style={styles.retMeta}>مُفرج {nf(released)}</L>
            <L style={styles.retMeta}>متبقٍ {nf(remaining)}</L>
          </View>
          <View style={styles.sep} />
          {canReleaseRet && (
          <View style={styles.retActions}>
            <TouchableOpacity style={styles.rel50} onPress={() => doRelease(50)}><T weight="medium" style={styles.rel50Text}>إفراج 50%</T></TouchableOpacity>
            <TouchableOpacity style={styles.rel100} onPress={() => doRelease(100)}><T weight="medium" style={styles.rel100Text}>إفراج 100%</T></TouchableOpacity>
          </View>
          )}
          {relMsg && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Icon name={relMsg.ok ? 'check-circle' : 'alert-circle'} size={15} color={relMsg.ok ? colors.accent2_800 : colors.accent700} />
              <T style={{ flex: 1, fontSize: 12.5, color: relMsg.ok ? colors.accent2_800 : colors.accent700, textAlign: 'right' }}>{relMsg.text}</T>
            </View>
          )}
          <T style={styles.retHint}>الإفراج عن المحتجزات يُصدر فاتورة عاكسة على الحساب المخصص.</T>
        </Card>

        {/* متابعة الإفراجات */}
        <RetentionReleases realId={realId} />

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}>
          <H style={styles.h5}>الضمانات البنكية</H>
        </View>
        {gs.loading ? <Loading label="جارٍ تحميل الضمانات…" /> : guarantees.map((g, i) => {
          const gid = g._raw && g._raw.id ? g._raw.id : null;
          return (
          <Card key={i} style={{ gap: 12 }} onPress={() => setOpenG(openG === i ? null : i)}>
            <View style={styles.subHead}>
              <T weight="semibold" style={styles.gTitle}>{g.title}</T>
              <Pill label={g.status} tone={g.daysLeft <= 30 ? 'accent' : 'accent2'} />
            </View>
            <L style={styles.gBank}>{g.bank}</L>
            <View style={styles.sep} />
            <View style={styles.gExpiry}>
              <Icon name="clock" size={14} color={g.daysLeft <= 30 ? colors.accent700 : colors.neutral600} />
              <L style={[styles.gDays, g.daysLeft <= 30 && { color: colors.accent700 }]}>{g.daysLeft} يوماً على انتهاء الصلاحية</L>
            </View>

            {/* تفاصيل وإجراءات عند الفتح */}
            {openG === i && (
              <View style={{ gap: 10, marginTop: 4 }}>
                <View style={styles.sep} />
                {g._raw && g._raw.guarantee_number && (
                  <View style={styles.rowBetween}><L style={{ fontSize: 13, color: colors.text }}>{g._raw.guarantee_number}</L><T style={{ fontSize: 12, color: colors.neutral600 }}>رقم الضمان</T></View>
                )}
                <View style={styles.rowBetween}>
                  <L style={{ fontSize: 13, color: colors.text }}>{nf(g.amount)} ر.س</L>
                  <T style={{ fontSize: 12, color: colors.neutral600 }}>المبلغ</T>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.neutral100, borderRadius: radius.md, paddingVertical: 12 }}
                    onPress={() => { if (gid) downloadReport('pt_construction_lite.report_guarantee', gid, 'guarantee'); }}>
                    <Icon name="download" size={16} color={colors.accent2_800} />
                    <T weight="medium" style={{ fontSize: 13, color: colors.accent2_800 }}>تصدير PDF</T>
                  </TouchableOpacity>
                  {g.status === 'ساري' ? (
                    <TouchableOpacity
                      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent2_800, borderRadius: radius.md, paddingVertical: 12 }}
                      onPress={async () => { if (gid) { try { await guaranteeReleaseAction(gid, 'release'); gs.reload(); } catch (e) {} } }}>
                      <T weight="medium" style={{ fontSize: 13, color: colors.white }}>إفراج الضمان</T>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.neutral300, borderRadius: radius.md, paddingVertical: 12 }}
                      onPress={async () => { if (gid) { try { await guaranteeReleaseAction(gid, 'reactivate'); gs.reload(); } catch (e) {} } }}>
                      <T weight="medium" style={{ fontSize: 13, color: colors.text }}>إعادة تفعيل</T>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ===== المستندات =====
export function DocumentsScreen({ navigation }) {
  const { projects } = useProject();
  const { pid, realId, project } = useProjectId();
  const p = project || projects[pid] || projects[0];

  // تقارير على مستوى المشروع (تُنزّل مباشرة بمعرّف المشروع)
  const projectReports = REPORTS_LIST.filter((r) => r.model === 'project');

  const download = async (report) => {
    if (!realId) return;
    await downloadReport(report.report, realId, report.key || 'report');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackHeader title="المستندات" subtitle={p ? p.name : ''} navigation={navigation} />

        {/* تقارير المشروع — تنزيل مباشر */}
        <T style={{ fontSize: 13, color: colors.neutral600, textAlign: 'right', paddingHorizontal: 4 }}>
          تقارير المشروع الحالي (PDF من النظام)
        </T>
        {projectReports.map((r, i) => (
          <Card key={i} style={styles.docCard} onPress={() => download(r)}>
            <View style={styles.docIcon}><Icon name="download" size={18} color={colors.accent700} /></View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.docTop}>
                <T weight="semibold" style={styles.docTitle}>{r.name}</T>
                <View style={styles.docCat}><T style={styles.docCatText}>{r.cat}</T></View>
              </View>
              <T style={styles.docNote}>اضغط للتنزيل من النظام</T>
            </View>
          </Card>
        ))}

        {/* أنواع مستندات أخرى — تُنزّل من شاشاتها */}
        <T style={{ fontSize: 13, color: colors.neutral600, textAlign: 'right', paddingHorizontal: 4, marginTop: 8 }}>
          مستندات تُصدَّر من شاشاتها
        </T>
        <Card style={styles.docCard} onPress={() => navigation.navigate('Main', { screen: 'ClaimsTab' })}>
          <View style={styles.docIcon}><Icon name="file-text" size={18} color={colors.neutral700} /></View>
          <View style={{ flex: 1, gap: 4 }}>
            <T weight="semibold" style={styles.docTitle}>مستخلص أعمال</T>
            <T style={styles.docNote}>افتح مستخلصاً ثم صدّره PDF</T>
          </View>
          <Icon name="chevron-left" size={18} color={colors.neutral500} />
        </Card>
        <Card style={styles.docCard} onPress={() => navigation.navigate('Guarantees')}>
          <View style={styles.docIcon}><Icon name="shield" size={18} color={colors.neutral700} /></View>
          <View style={{ flex: 1, gap: 4 }}>
            <T weight="semibold" style={styles.docTitle}>ضمان بنكي</T>
            <T style={styles.docNote}>من شاشة المحتجزات والضمانات</T>
          </View>
          <Icon name="chevron-left" size={18} color={colors.neutral500} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// ===== 15 معاينة مستند / الصلاحيات =====
export function ShareScreen({ navigation }) {
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const { realId, project } = useProjectId();
  const p = project || {};

  // المستندات المتاحة على مستوى المشروع (كل واحد تقرير حقيقي مختلف)
  const projectDocs = REPORTS_LIST.filter((r) => r.model === 'project');

  const exportDoc = async (doc) => {
    if (!realId) { setMsg({ ok: false, text: 'اختر مشروعاً أولاً.' }); return; }
    setBusy(doc.key); setMsg(null);
    try {
      const res = await downloadReport(doc.report, realId, doc.key);
      if (!res.ok) setMsg({ ok: false, text: res.error || 'تعذّر التصدير.' });
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'تعذّر التصدير.' });
    } finally { setBusy(null); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackHeader title="مستندات المشروع" navigation={navigation} />
        <T style={styles.shareHint}>{p.name ? p.name : 'المشروع المختار'} — اختر المستند لتصديره ومشاركته</T>

        {msg && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name={msg.ok ? 'check-circle' : 'alert-circle'} size={15} color={msg.ok ? colors.accent2_800 : colors.accent700} />
            <T style={{ flex: 1, fontSize: 12.5, color: msg.ok ? colors.accent2_800 : colors.accent700, textAlign: 'right' }}>{msg.text}</T>
          </View>
        )}

        {projectDocs.map((doc) => (
          <Card key={doc.key} style={styles.docExportCard} onPress={busy ? undefined : () => exportDoc(doc)}>
            <View style={styles.docIcon}><Icon name="file-text" size={20} color={colors.accent2_800} /></View>
            <View style={{ flex: 1, gap: 2 }}>
              <T weight="medium" style={styles.docExportName}>{doc.name}</T>
              <T style={styles.docExportCat}>{doc.cat}</T>
            </View>
            {busy === doc.key
              ? <ActivityIndicator color={colors.accent2_800} />
              : <Icon name="download" size={18} color={colors.neutral600} />}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, accent, last }) {
  return (
    <View style={[styles.dataRow, last && { borderBottomWidth: 0 }]}>
      <T style={styles.dataLabel}>{label}</T>
      <L style={[styles.dataValue, accent && { color: colors.accent700 }]}>{value}</L>
    </View>
  );
}
function Metric3({ label, value }) {
  return <View style={{ flex: 1, gap: 4 }}><T style={styles.m3lbl}>{label}</T><L style={styles.m3val}>{value}</L></View>;
}

const st = makeStyles(() => ({
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, alignSelf: 'flex-start' },
  pillText: { fontSize: 11 },
}));

const styles = makeStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingBottom: 24, gap: 16 },
  backHead: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.neutral100, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  backTitle: { fontSize: 22 },
  backSub: { fontSize: 12.5, color: colors.neutral600 },
  filterRow: { flexDirection: 'row', gap: 8 },
  projCard: { gap: 14 },
  projTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  projH5: { fontSize: 17, flex: 1, textAlign: 'right' },
  projValRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  projVal: { fontSize: 19, fontWeight: '600', color: colors.text },
  projValUnit: { fontSize: 12, color: colors.neutral600 },
  projMargin: { fontSize: 12, color: colors.neutral600, marginInlineStart: 'auto' },
  projFoot: { flexDirection: 'row', justifyContent: 'space-between' },
  projFootPct: { fontSize: 12, color: colors.accent700 },
  projFootClaim: { fontSize: 12, color: colors.neutral600 },

  heroImg: { height: 280, backgroundColor: colors.neutral200 },
  heroBack: { margin: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(253,252,250,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroInfo: { position: 'absolute', bottom: 20, insetInlineStart: 24, insetInlineEnd: 24, left: 24, right: 24, gap: 6 },
  heroBadge: { backgroundColor: 'rgba(253,252,250,0.9)', borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 5, alignSelf: 'flex-start' },
  heroBadgeText: { fontSize: 11, color: colors.text },
  heroName: { fontSize: 28, color: colors.white },
  heroLoc: { fontSize: 12.5, color: colors.white, opacity: 0.85 },
  body: { paddingHorizontal: 24, paddingTop: 18, gap: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLbl: { fontSize: 12.5, color: colors.neutral600, textAlign: 'right' },
  bigPct: { fontSize: 20, fontWeight: '600', color: colors.accent700 },
  h5: { fontSize: 16, paddingHorizontal: 4 },
  desc: { fontSize: 14, lineHeight: 24, color: colors.neutral700, textAlign: 'right' },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.divider8 },
  dataLabel: { fontSize: 13, color: colors.neutral600 },
  dataValue: { fontSize: 13.5, fontWeight: '600', color: colors.text },
  boqItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider8, gap: 6 },
  boqName: { fontSize: 14, color: colors.text },
  boqPct: { fontSize: 13, color: colors.accent700, fontWeight: '600' },
  boqQty: { fontSize: 11, color: colors.neutral600, textAlign: 'right' },
  sep: { height: 1, backgroundColor: colors.divider8 },
  subHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subName: { fontSize: 16, color: colors.text, textAlign: 'right' },
  subCode: { fontSize: 12, color: colors.neutral600 },
  sub3: { flexDirection: 'row' },
  m3lbl: { fontSize: 12, color: colors.neutral600, textAlign: 'right' },
  m3val: { fontSize: 17, fontWeight: '600', color: colors.text, textAlign: 'right' },
  empty: { alignItems: 'center', paddingVertical: 28 },
  emptyText: { color: colors.neutral600 },
  infoText: { fontSize: 13, lineHeight: 22, color: colors.neutral600, textAlign: 'right' },
  subClaimRow: { gap: 8, backgroundColor: colors.neutral100, borderRadius: radius.md, padding: 12 },
  retTotal: { fontSize: 24, fontWeight: '600', color: colors.text },
  retBar: { height: 8, borderRadius: radius.pill, backgroundColor: colors.neutral200, overflow: 'hidden' },
  retBarFill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.accent2_500 },
  retMeta: { fontSize: 12, color: colors.neutral600 },
  retActions: { flexDirection: 'row', gap: 12 },
  rel50: { flex: 1, backgroundColor: colors.accent2_800, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  rel50Text: { color: colors.white, fontSize: 14 },
  rel100: { flex: 1, borderWidth: 1, borderColor: colors.neutral300, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  rel100Text: { color: colors.text, fontSize: 14 },
  retHint: { fontSize: 12, color: colors.neutral600, textAlign: 'right' },
  gTitle: { fontSize: 14, color: colors.text, flex: 1, textAlign: 'right' },
  gBank: { fontSize: 12.5, color: colors.neutral600, textAlign: 'right' },
  gExpiry: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gDays: { fontSize: 12, color: colors.neutral600 },
  docCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  docIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.accent100, alignItems: 'center', justifyContent: 'center' },
  docTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  docTitle: { fontSize: 14, color: colors.text, flex: 1, textAlign: 'right' },
  docCat: { backgroundColor: colors.neutral100, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  docCatText: { fontSize: 10, color: colors.neutral700 },
  docNote: { fontSize: 12, lineHeight: 20, color: colors.neutral600, textAlign: 'right' },
  shareHint: { fontSize: 13, color: colors.neutral600, textAlign: 'right' },
  docExportCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  docIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.accent2_100, alignItems: 'center', justifyContent: 'center' },
  docExportName: { fontSize: 14, color: colors.text, textAlign: 'right' },
  docExportCat: { fontSize: 11.5, color: colors.neutral600, textAlign: 'right' },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleChip: { flex: 1, paddingVertical: 11, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.neutral300, alignItems: 'center' },
  roleChipOn: { backgroundColor: colors.accent2_800, borderColor: colors.accent2_800 },
  roleText: { fontSize: 13, color: colors.neutral700 },
  roleTextOn: { color: colors.white },
  preview: { alignItems: 'center', paddingVertical: 28, gap: 4 },
  previewBrand: { fontSize: 20, color: colors.accent, letterSpacing: 2, fontWeight: '600' },
  previewTitle: { fontSize: 20, marginTop: 8 },
  previewSub: { fontSize: 13, color: colors.neutral600 },
  previewLine: { height: 1, backgroundColor: colors.divider8, alignSelf: 'stretch', marginVertical: 16 },
  previewText: { fontSize: 13, lineHeight: 22, color: colors.neutral600, textAlign: 'center', paddingHorizontal: 12 },
}));

// ═══════════════════════════════════════════════════════════════
//  شاشة إضافة ضمان جديد
// ═══════════════════════════════════════════════════════════════
export function AddGuaranteeScreen({ navigation }) {
  const { pid, realId, project } = useProjectId();
  const [type, setType] = useState('performance');
  const [bank, setBank] = useState('');
  const [number, setNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [expiry, setExpiry] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const valid = bank && number && amount && /^\d{4}-\d{2}-\d{2}$/.test(expiry);

  const save = async () => {
    if (!valid) { setMsg({ ok: false, text: 'أكمل الحقول: البنك، الرقم، المبلغ، وتاريخ الانتهاء (YYYY-MM-DD).' }); return; }
    setBusy(true); setMsg(null);
    try {
      await createGuarantee(realId, { type, bank, number, amount: parseFloat(amount), expiry });
      setMsg({ ok: true, text: 'تم إنشاء الضمان في النظام.' });
      setTimeout(() => navigation.goBack(), 1100);
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'تعذّر إنشاء الضمان.' });
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <BackHeader title="ضمان جديد" subtitle={project ? project.name : ''} navigation={navigation} />

        {/* النوع */}
        <T style={afStyles.label}>نوع الضمان</T>
        <View style={afStyles.typeRow}>
          {GUARANTEE_TYPES.map((t) => {
            const on = type === t.key;
            return (
              <TouchableOpacity key={t.key} onPress={() => setType(t.key)}
                style={[afStyles.typeChip, on && afStyles.typeChipOn]}>
                <T weight={on ? 'semibold' : 'regular'} style={[afStyles.typeText, on && afStyles.typeTextOn]}>{t.label}</T>
              </TouchableOpacity>
            );
          })}
        </View>

        <Field label="البنك" value={bank} onChangeText={setBank} placeholder="اسم البنك" />
        <Field label="رقم الضمان" value={number} onChangeText={setNumber} placeholder="G-XXXXXX" />
        <Field label="المبلغ (ر.س)" value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" />
        <Field label="تاريخ الانتهاء" value={expiry} onChangeText={setExpiry} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />

        {msg && (
          <View style={[afStyles.msg, { backgroundColor: msg.ok ? colors.accent2_200 : colors.accent100 }]}>
            <Icon name={msg.ok ? 'check-circle' : 'alert-circle'} size={16} color={msg.ok ? colors.accent2_800 : colors.accent700} />
            <T style={{ flex: 1, fontSize: 12.5, color: msg.ok ? colors.accent2_800 : colors.accent700, textAlign: 'right' }}>{msg.text}</T>
          </View>
        )}

        <Btn title={busy ? 'جارٍ الحفظ…' : 'حفظ الضمان'} kind="primary" icon="check" style={{ marginTop: 8 }} onPress={busy ? undefined : save} />
      </ScrollView>
    </SafeAreaView>
  );
}

// حقل إدخال بسيط
function Field({ label, value, onChangeText, placeholder, keyboardType }) {
  return (
    <View style={{ gap: 6 }}>
      <T style={afStyles.label}>{label}</T>
      <View style={afStyles.inputWrap}>
        <TextInput style={afStyles.input} value={value} onChangeText={onChangeText}
          placeholder={placeholder} placeholderTextColor={colors.neutral400}
          keyboardType={keyboardType} textAlign="right" />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  شاشة الإشعارات
// ═══════════════════════════════════════════════════════════════
export function NotificationsScreen({ navigation }) {
  const { data, loading, error, reload } = useAsync(() => getNotifications(), []);
  const items = data || [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <BackHeader title="الإشعارات" navigation={navigation} />
        {loading && <Loading label="جارٍ تحميل الإشعارات…" />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {!loading && !error && items.length === 0 && (
          <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
            <Icon name="bell-off" size={26} color={colors.neutral500} />
            <T style={{ color: colors.neutral600, marginTop: 8 }}>لا توجد إشعارات حالياً</T>
          </Card>
        )}
        {items.map((n, i) => (
          <Card key={i} style={afStyles.notif} onPress={n.target ? () => {
            const tabs = ['HomeTab', 'ClaimsTab', 'SiteTab', 'MapTab', 'MoreTab'];
            if (tabs.includes(n.target)) {
              navigation.navigate('Main', { screen: n.target });
            } else {
              // شاشة مكدّسة (مثل الضمانات، أوامر التغيير…)
              navigation.navigate(n.target);
            }
          } : undefined}>
            <View style={afStyles.notifIcon}><Icon name={n.icon || 'bell'} size={18} color={colors.accent700} /></View>
            <View style={{ flex: 1, gap: 3 }}>
              <T weight="semibold" style={{ fontSize: 14, color: colors.text, textAlign: 'right' }}>{n.title}</T>
              <T style={{ fontSize: 12, color: colors.neutral600, textAlign: 'right' }}>{n.body}</T>
            </View>
            {n.target && <Icon name="chevron-left" size={18} color={colors.neutral400} />}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const apSearchStyles = makeStyles(() => ({
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.neutral100, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 12 },
  searchInput: { flex: 1, fontSize: 13.5, color: colors.text, fontFamily: fonts.arabic, textAlign: 'right' },
}));

const apCardStyles = makeStyles(() => ({
  projCard: { borderRadius: 22, overflow: 'hidden', height: 168, backgroundColor: colors.neutral200 },
  projImg: { flex: 1 },
  badge: { position: 'absolute', top: 14, insetInlineStart: 16, left: 16, backgroundColor: 'rgba(253,252,250,0.9)', borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 6 },
  badgeText: { fontSize: 11, color: colors.text },
  projCircle: { position: 'absolute', top: 12, insetInlineEnd: 14, right: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(253,252,250,0.28)', alignItems: 'center', justifyContent: 'center' },
  projBottom: { position: 'absolute', bottom: 10, insetInlineStart: 18, insetInlineEnd: 18, left: 18, right: 18, flexDirection: 'row', alignItems: 'flex-end' },
  projName: { fontSize: 26, color: colors.white, flex: 1, textAlign: 'right' },
  projPct: { fontSize: 13, color: colors.white, opacity: 0.9, marginInlineStart: 'auto', paddingBottom: 6 },
}));

const afStyles = makeStyles(() => ({
  label: { fontSize: 12.5, color: colors.neutral700, textAlign: 'right' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.neutral300 },
  typeChipOn: { backgroundColor: colors.accent2_800, borderColor: colors.accent2_800 },
  typeText: { fontSize: 12.5, color: colors.neutral700 },
  typeTextOn: { color: colors.white },
  inputWrap: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral300, paddingHorizontal: 14 },
  input: { paddingVertical: 13, fontSize: 14, color: colors.text, fontFamily: fonts.arabic, textAlign: 'right' },
  msg: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.sm, padding: 12 },
  notif: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accent100, alignItems: 'center', justifyContent: 'center' },
}));
