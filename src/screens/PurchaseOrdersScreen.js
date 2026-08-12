import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T, L, H, Icon, Card } from '../components';
import { colors, space, radius, fonts, shadow, makeStyles, useThemeRedraw} from '../theme';
import { getPurchaseOrders, getSuppliers, createPurchaseOrder, purchaseOrderAction, nextPurchaseActions } from '../api/services';
import { useProject, useProjectId, useCan } from '../ProjectContext';
import { useAsync } from '../api/useAsync';
import { Loading, ErrorBox } from '../components/Async';

const nf = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0));

export default function PurchaseOrdersScreen({ navigation }) {
  useThemeRedraw();
  const { projects } = useProject();
  const { pid, realId } = useProjectId();
  const canCreate = useCan('purchase', 'create');
  const p = projects[pid] || projects[0];
  const { data, loading, error, reload } = useAsync(() => getPurchaseOrders(realId), [realId]);
  const orders = data || [];
  const [creating, setCreating] = useState(false);

  if (creating) {
    return <CreatePurchaseOrder realId={realId} project={p} onBack={() => setCreating(false)} onCreated={() => { setCreating(false); reload(); }} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-right" size={20} color={colors.neutral700} />
          </TouchableOpacity>
          <View style={{ gap: 2, flex: 1 }}>
            <H style={styles.title}>أوامر الشراء</H>
            <T style={styles.sub}>{p ? p.name : ''} · {orders.length} أوامر</T>
          </View>
          {canCreate && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setCreating(true)}>
              <Icon name="plus" size={18} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>

        {loading && <Loading label="جارٍ تحميل أوامر الشراء…" />}
        {error && <ErrorBox message={error} onRetry={reload} />}
        {!loading && !error && orders.length === 0 && (
          <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
            <Icon name="shopping-cart" size={26} color={colors.neutral500} />
            <T style={{ color: colors.neutral600, marginTop: 8 }}>لا توجد أوامر شراء على هذا المشروع.</T>
            {canCreate && (
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setCreating(true)}>
                <T weight="medium" style={{ color: colors.white, fontSize: 13 }}>إنشاء أمر شراء</T>
              </TouchableOpacity>
            )}
          </Card>
        )}

        {orders.map((o, i) => (
          <PoCard key={i} order={o} onDone={reload} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function PoCard({ order, onDone }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const oid = order._raw && order._raw.id ? order._raw.id : null;
  const actions = nextPurchaseActions(order.state);

  const run = async (action) => {
    if (!oid) return;
    setBusy(true); setMsg(null);
    try {
      await purchaseOrderAction(oid, action);
      setMsg({ ok: true, text: 'تم في النظام.' });
      setTimeout(() => { if (onDone) onDone(); }, 900);
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'تعذّر التنفيذ.' });
    } finally { setBusy(false); }
  };

  const tone = order.state === 'purchase' ? { bg: colors.accent2_100, fg: colors.accent2_800 }
    : order.state === 'cancel' ? { bg: colors.neutral100, fg: colors.neutral700 }
    : order.state === 'done' ? { bg: colors.accent2_200, fg: colors.accent2_800 }
    : { bg: colors.accent100, fg: colors.accent700 };

  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T weight="semibold" style={styles.poNo}>{order.no || 'أمر شراء'}</T>
          <L style={styles.poPartner}>{order.partner || 'بدون مورّد'}</L>
        </View>
        <View style={[styles.pill, { backgroundColor: tone.bg }]}>
          <T weight="medium" style={[styles.pillText, { color: tone.fg }]}>{order.stateLabel}</T>
        </View>
      </View>

      <View style={styles.sep} />
      <View style={styles.poMeta}>
        <View style={{ flex: 1 }}>
          <T style={styles.poMetaLbl}>القيمة</T>
          <L style={styles.poMetaVal}>{nf(order.amount)} ر.س</L>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T style={styles.poMetaLbl}>التاريخ</T>
          <L style={styles.poMetaDate}>{order.date}</L>
        </View>
      </View>

      {msg && (
        <View style={[styles.msgBox, { backgroundColor: msg.ok ? colors.accent2_100 : colors.accent100 }]}>
          <Icon name={msg.ok ? 'check-circle' : 'alert-circle'} size={15} color={msg.ok ? colors.accent2_800 : colors.accent700} />
          <T style={{ flex: 1, fontSize: 12, color: msg.ok ? colors.accent2_800 : colors.accent700, textAlign: 'right' }}>{msg.text}</T>
        </View>
      )}

      {actions.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {actions.map((a, i) => (
            <TouchableOpacity key={i} onPress={busy ? undefined : () => run(a.action)}
              style={[styles.actionBtn, a.kind === 'danger' ? styles.actionDanger : styles.actionPrimary]}>
              <T weight="medium" style={[styles.actionText, a.kind === 'danger' && { color: colors.accent700 }]}>{busy ? '…' : a.label}</T>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Card>
  );
}

// شاشة إنشاء أمر شراء
function CreatePurchaseOrder({ realId, project, onBack, onCreated }) {
  const suppliers = useAsync(() => getSuppliers(), []);
  const supplierList = suppliers.data || [];
  const [supplierId, setSupplierId] = useState(null);
  const [supplierName, setSupplierName] = useState('');
  const [lines, setLines] = useState([{ name: '', qty: '1', price: '' }]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const addLine = () => setLines([...lines, { name: '', qty: '1', price: '' }]);
  const removeLine = (i) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i, key, val) => setLines(lines.map((ln, idx) => idx === i ? { ...ln, [key]: val } : ln));

  const total = lines.reduce((s, ln) => s + (parseFloat(ln.qty || 0) * parseFloat(ln.price || 0)), 0);

  const create = async () => {
    if (!supplierId) { setMsg({ ok: false, text: 'اختر المورّد أولاً.' }); return; }
    const validLines = lines.filter((ln) => ln.name.trim());
    if (validLines.length === 0) { setMsg({ ok: false, text: 'أضف بنداً واحداً على الأقل بوصف.' }); return; }
    setBusy(true); setMsg(null);
    try {
      await createPurchaseOrder(realId, supplierId, validLines.map((ln) => ({
        name: ln.name, qty: parseFloat(ln.qty || 1), price: parseFloat(ln.price || 0),
      })));
      setMsg({ ok: true, text: 'تم إنشاء أمر الشراء كمسودة في النظام.' });
      setTimeout(() => { if (onCreated) onCreated(); }, 1100);
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'تعذّر إنشاء أمر الشراء.' });
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.head}>
          <TouchableOpacity style={styles.circleBtn} onPress={onBack}>
            <Icon name="arrow-right" size={20} color={colors.neutral700} />
          </TouchableOpacity>
          <View style={{ gap: 2, flex: 1 }}>
            <H style={styles.title}>أمر شراء جديد</H>
            <T style={styles.sub}>{project ? project.name : ''}</T>
          </View>
        </View>

        {/* المورّد */}
        <T style={styles.fieldLbl}>المورّد</T>
        {suppliers.loading && <Loading label="جارٍ تحميل الموردين…" />}
        <View style={styles.supplierWrap}>
          {supplierList.map((s) => {
            const on = supplierId === s.id;
            return (
              <TouchableOpacity key={s.id} onPress={() => { setSupplierId(s.id); setSupplierName(s.name); }}
                style={[styles.supplierChip, on && styles.supplierChipOn]}>
                <T weight={on ? 'medium' : 'regular'} style={[styles.supplierText, on && { color: colors.white }]}>{s.name}</T>
              </TouchableOpacity>
            );
          })}
          {!suppliers.loading && supplierList.length === 0 && (
            <T style={{ fontSize: 12.5, color: colors.neutral600, textAlign: 'right' }}>لا يوجد موردون في النظام. أضف مورّداً من Odoo أولاً.</T>
          )}
        </View>

        {/* البنود */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <T style={[styles.fieldLbl, { flex: 1 }]}>البنود</T>
          <TouchableOpacity onPress={addLine} style={styles.addLineBtn}>
            <Icon name="plus" size={14} color={colors.accent2_800} />
            <T weight="medium" style={{ fontSize: 12, color: colors.accent2_800 }}>إضافة بند</T>
          </TouchableOpacity>
        </View>

        {lines.map((ln, i) => (
          <Card key={i} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <T weight="medium" style={{ fontSize: 12.5, color: colors.neutral700, flex: 1, textAlign: 'right' }}>بند {i + 1}</T>
              {lines.length > 1 && (
                <TouchableOpacity onPress={() => removeLine(i)}>
                  <Icon name="trash-2" size={15} color={colors.accent700} />
                </TouchableOpacity>
              )}
            </View>
            <TextInput style={styles.input} placeholder="وصف البند" placeholderTextColor={colors.neutral400}
              textAlign="right" value={ln.name} onChangeText={(t) => updateLine(i, 'name', t)} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <T style={styles.miniLbl}>الكمية</T>
                <TextInput style={styles.inputSm} keyboardType="numeric" placeholder="1" placeholderTextColor={colors.neutral400}
                  textAlign="center" value={ln.qty} onChangeText={(t) => updateLine(i, 'qty', t)} />
              </View>
              <View style={{ flex: 1 }}>
                <T style={styles.miniLbl}>سعر الوحدة</T>
                <TextInput style={styles.inputSm} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.neutral400}
                  textAlign="center" value={ln.price} onChangeText={(t) => updateLine(i, 'price', t)} />
              </View>
              <View style={{ flex: 1 }}>
                <T style={styles.miniLbl}>الإجمالي</T>
                <View style={styles.lineTotal}><L style={styles.lineTotalText}>{nf(parseFloat(ln.qty || 0) * parseFloat(ln.price || 0))}</L></View>
              </View>
            </View>
          </Card>
        ))}

        {/* الإجمالي */}
        <Card style={styles.totalCard}>
          <T weight="semibold" style={{ fontSize: 14, color: colors.text }}>الإجمالي</T>
          <L style={styles.totalVal}>{nf(total)} <T style={{ fontSize: 12, color: colors.neutral600 }}>ر.س</T></L>
        </Card>

        {msg && (
          <View style={[styles.msgBox, { backgroundColor: msg.ok ? colors.accent2_200 : colors.accent100 }]}>
            <Icon name={msg.ok ? 'check-circle' : 'alert-circle'} size={16} color={msg.ok ? colors.accent2_800 : colors.accent700} />
            <T style={{ flex: 1, fontSize: 12.5, color: msg.ok ? colors.accent2_800 : colors.accent700, textAlign: 'right' }}>{msg.text}</T>
          </View>
        )}

        <TouchableOpacity style={[styles.createBtn, busy && { opacity: 0.6 }]} onPress={busy ? undefined : create}>
          <T weight="medium" style={{ fontSize: 14, color: colors.white }}>{busy ? 'جارٍ الإنشاء…' : 'إنشاء أمر الشراء'}</T>
        </TouchableOpacity>
        <T style={styles.note}>يُنشأ الأمر كمسودة، ثم تؤكّدينه من القائمة.</T>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = makeStyles(() => ({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 24, paddingBottom: 30, gap: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  title: { fontSize: 22 },
  sub: { fontSize: 12.5, color: colors.neutral600 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent2_800, alignItems: 'center', justifyContent: 'center' },
  emptyBtn: { marginTop: 14, backgroundColor: colors.accent2_800, borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 11 },
  poNo: { fontSize: 15, color: colors.text, textAlign: 'right' },
  poPartner: { fontSize: 12.5, color: colors.neutral600, textAlign: 'right' },
  pill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill },
  pillText: { fontSize: 11 },
  sep: { height: 1, backgroundColor: colors.divider8 },
  poMeta: { flexDirection: 'row', alignItems: 'center' },
  poMetaLbl: { fontSize: 11, color: colors.neutral600, textAlign: 'right' },
  poMetaVal: { fontSize: 15, fontWeight: '600', color: colors.text },
  poMetaDate: { fontSize: 13, color: colors.neutral700 },
  msgBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.sm, padding: 10 },
  actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: radius.md },
  actionPrimary: { backgroundColor: colors.accent2_800 },
  actionDanger: { backgroundColor: colors.accent100 },
  actionText: { fontSize: 13, color: colors.white },
  fieldLbl: { fontSize: 13, color: colors.neutral700, textAlign: 'right', paddingHorizontal: 4 },
  supplierWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  supplierChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.neutral300 },
  supplierChipOn: { backgroundColor: colors.accent2_800, borderColor: colors.accent2_800 },
  supplierText: { fontSize: 12.5, color: colors.neutral700 },
  addLineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accent2_100, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  input: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral300, paddingHorizontal: 14, paddingVertical: 11, fontSize: 13.5, color: colors.text, fontFamily: fonts.arabic, textAlign: 'right' },
  inputSm: { backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.neutral300, paddingVertical: 9, fontSize: 13.5, color: colors.text, fontFamily: fonts.latin, marginTop: 4 },
  miniLbl: { fontSize: 11, color: colors.neutral600, textAlign: 'center' },
  lineTotal: { backgroundColor: colors.card, borderRadius: radius.sm, paddingVertical: 10, marginTop: 4, alignItems: 'center', ...shadow.sm },
  lineTotalText: { fontSize: 13, fontWeight: '600', color: colors.accent2_800 },
  totalCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalVal: { fontSize: 20, fontWeight: '600', color: colors.text },
  createBtn: { backgroundColor: colors.accent2_800, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  note: { fontSize: 11.5, color: colors.neutral600, textAlign: 'center' },
  miniLbl2: { fontSize: 11, color: colors.neutral600 },
}));
