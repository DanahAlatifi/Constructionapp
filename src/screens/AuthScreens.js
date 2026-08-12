import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, TextInput, TouchableOpacity, ImageBackground, Image, KeyboardAvoidingView, Platform, Animated, Easing, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { T, L, H, Icon, Btn } from '../components';
import { colors, space, radius, fonts, applyCompanyColors, makeStyles, authColors, useThemeRedraw} from '../theme';
import { SITE_IMG } from '../data/mock';
import { login, logout, getCurrentUser } from '../api/odoo';
import { verifyCompanyBarcode, verifyUserCompany } from '../api/services';
import { useProject } from '../ProjectContext';
import { hasScannedBefore, markScanned, migrateAuthIfNeeded, saveCompanyColor, saveScannedBarcode, loadScannedBarcode, saveConnectionConfig } from '../api/storage';
import { USE_API, setOdooConfig } from '../api/config';

// خلفية الموقع مع تدرّج داكن
function SiteHeader({ height, children, gradient }) {
  return (
    <View style={{ height, overflow: 'hidden' }}>
      <ImageBackground source={SITE_IMG} style={{ flex: 1 }} resizeMode="cover">
        <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
        {children}
      </ImageBackground>
    </View>
  );
}

// شعار Contracting Lite — صورة اللوقو الفعلية
function Logo({ size = 48 }) {
  return (
    <Image
      source={require('../../assets/logo.png')}
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
      resizeMode="contain"
    />
  );
}

// ===== 01 الترحيب =====
export function WelcomeScreen({ navigation }) {
  useThemeRedraw();
  const [scannedBefore, setScannedBefore] = useState(null); // null = يفحص

  useEffect(() => {
    (async () => {
      try {
        await migrateAuthIfNeeded();
        const v = await hasScannedBefore();
        setScannedBefore(v);
      } catch (e) {
        setScannedBefore(false);
      }
    })();
  }, []);

  // زر الدخول: لو مسح قبل → مباشرة لـ Login، غير كذا → Scan
  const onLogin = () => {
    if (scannedBefore) navigation.navigate('Login');
    else navigation.navigate('Scan');
  };

  return (
    <View style={styles.welcomeRoot}>
      <ImageBackground source={SITE_IMG} style={{ flex: 1 }} resizeMode="cover">
        <LinearGradient
          colors={['rgba(91,89,182,0.82)', 'rgba(73,71,174,0.94)', 'rgba(47,46,113,0.99)']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.welcomeSafe}>
          <View style={styles.welcomeCenter}>
            <Logo size={96} />
            <View style={{ alignItems: 'center', gap: 8, marginTop: 18 }}>
              <L style={styles.brandBig}>Contracting Lite</L>
              <View style={styles.brandLine} />
              <T style={styles.brandSub}>نظام إدارة المقاولات</T>
            </View>
          </View>

          <View style={styles.welcomeBottom}>
            <T style={styles.welcomeTagline}>مشاريعك ومستخلصاتك ومحتجزاتك في مكان واحد.</T>

            {/* الزر الأساسي — يعتمد على إن كان مسح قبل */}
            <TouchableOpacity style={styles.welcomeBtn} onPress={onLogin} activeOpacity={0.9}>
              <Icon name={scannedBefore ? 'log-in' : 'maximize'} size={18} color={authColors.ink} />
              <T weight="semibold" style={styles.welcomeBtnText}>
                {scannedBefore ? 'تسجيل الدخول' : 'تسجيل الدخول بالباركود'}
              </T>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

// ===== شاشة مسح الباركود (محاكاة) =====
export function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const lineY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // اطلب صلاحية الكاميرا عند الفتح
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(lineY, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(lineY, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = lineY.interpolate({ inputRange: [0, 1], outputRange: [8, 232] });

  const [verifying, setVerifying] = useState(false);
  const [scanError, setScanError] = useState(null);

  // عند التقاط باركود — احفظ القيمة (التحقق يتم بعد الدخول لأن القراءة تحتاج جلسة)
  const onBarcode = async ({ data }) => {
    if (scanned || verifying) return;
    if (!data || !data.trim()) return;
    setVerifying(true);
    setScanError(null);
    try {
      setScanned(true);
      const raw = data.trim();
      // حاول قراءة الباركود كـ JSON فيه (url + db + company)
      let companyBarcode = raw;
      let conn = null;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.url || parsed.db)) {
          conn = { url: parsed.url || '', db: parsed.db || '' };
          companyBarcode = parsed.company || parsed.barcode || '';
        }
      } catch (e) {
        // ليس JSON — باركود بسيط (معرّف شركة فقط)، نُبقي الإعدادات الافتراضية
      }
      // إذا حمل الباركود إعدادات الاتصال، طبّقها واحفظها
      if (conn && (conn.url || conn.db)) {
        setOdooConfig(conn);
        await saveConnectionConfig(conn);
      }
      // احفظ معرّف الشركة (يُتحقق منه بعد الدخول)
      await saveScannedBarcode(companyBarcode);
      setTimeout(() => navigation.replace('Login'), 400);
    } catch (e) {
      setScanError(e.message || 'تعذّر قراءة الباركود.');
      setTimeout(() => { setScanError(null); setVerifying(false); setScanned(false); }, 2500);
    }
  };

  // حالة عدم منح الصلاحية
  const denied = permission && !permission.granted && !permission.canAskAgain;

  return (
    <View style={styles.scanRoot}>
      {/* الكاميرا الفعلية */}
      {permission && permission.granted && !scanned && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'pdf417', 'datamatrix'] }}
          onBarcodeScanned={onBarcode}
        />
      )}
      {/* خلفية داكنة عند عدم توفر الكاميرا */}
      {(!permission || !permission.granted || scanned) && (
        <ImageBackground source={SITE_IMG} style={StyleSheet.absoluteFill} resizeMode="cover">
          <LinearGradient colors={['rgba(73,71,174,0.95)', 'rgba(43,42,104,0.99)']} style={StyleSheet.absoluteFill} />
        </ImageBackground>
      )}

      {/* طبقة تعتيم فوق الكاميرا */}
      <View style={styles.scanOverlay} pointerEvents="box-none">
        <SafeAreaView style={{ flex: 1 }}>
          <TouchableOpacity style={styles.scanBack} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={20} color={colors.white} />
          </TouchableOpacity>

          <View style={styles.scanContent}>
            <View style={{ alignItems: 'center', gap: 8, marginBottom: 40 }}>
              <Logo size={72} />
              <L style={styles.scanBrand}>Contracting Lite</L>
            </View>

            {/* إطار المسح */}
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              {/* خط المسح المتحرك */}
              {!scanned && permission && permission.granted && (
                <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]}>
                  <LinearGradient
                    colors={['rgba(73,71,174,0)', authColors.blue, 'rgba(73,71,174,0)']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ flex: 1, height: 3 }}
                  />
                </Animated.View>
              )}

              {/* علامة النجاح */}
              {scanned && (
                <View style={styles.scanSuccess}>
                  <View style={styles.successCircle}>
                    <Icon name="check" size={40} color={colors.white} />
                  </View>
                </View>
              )}
            </View>

            {/* النصوص حسب الحالة */}
            {scanned ? (
              <T style={styles.scanHint}>تم التحقق من الشركة بنجاح</T>
            ) : scanError ? (
              <View style={styles.scanErrorBox}>
                <Icon name="alert-circle" size={18} color="#fff" />
                <T style={styles.scanErrorText}>{scanError}</T>
              </View>
            ) : verifying ? (
              <T style={styles.scanHint}>جارٍ التحقق من الباركود…</T>
            ) : denied ? (
              <>
                <T style={styles.scanHint}>الكاميرا غير مُصرّح لها</T>
                <TouchableOpacity style={styles.permBtn} onPress={() => navigation.replace('Login')}>
                  <T weight="semibold" style={styles.permBtnText}>تسجيل الدخول يدوياً</T>
                </TouchableOpacity>
              </>
            ) : !permission || !permission.granted ? (
              <>
                <T style={styles.scanHint}>يحتاج التطبيق إذن الكاميرا لمسح الباركود</T>
                <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                  <T weight="semibold" style={styles.permBtnText}>السماح بالكاميرا</T>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <T style={styles.scanHint}>وجّه الكاميرا نحو باركود الشركة</T>
                <T style={styles.scanSub}>جارٍ المسح…</T>
              </>
            )}
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

// حقل underline (مُتحكَّم من الأب)
function UnderlineField({ label, value, onChangeText, secure, keyboardType, icon }) {
  return (
    <View style={{ gap: 7 }}>
      <T style={styles.fieldLabel}>{label}</T>
      <View style={styles.fieldRow}>
        {icon && <Icon name={icon} size={16} color={colors.neutral500} />}
        <TextInput
          style={styles.underlineInput}
          value={value} onChangeText={onChangeText}
          secureTextEntry={secure} keyboardType={keyboardType}
          autoCapitalize="none" autoCorrect={false}
          placeholderTextColor={colors.neutral400}
          textAlign="right"
        />
      </View>
    </View>
  );
}

// ===== 02 تسجيل الدخول (بعد المسح) =====
export function LoginScreen({ navigation }) {
  const { reloadProjects } = useProject();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onLogin = async () => {
    setError(null);
    if (USE_API) {
      if (!email || !password) { setError('أدخل البريد وكلمة المرور.'); return; }
      setLoading(true);
      try {
        await login(email, password);
        // بعد الدخول (توجد جلسة الآن): تحقّق من الباركود الممسوح والشركة (اختياري فقط —
        // لو ما فيه حقل company_barcode مخصص بأودو، هذا التحقق يُتجاهل بدون ما يوقف الدخول)
        let barcodeColors = null;
        try {
          const scannedBarcode = await loadScannedBarcode();
          if (scannedBarcode) {
            const co = await verifyCompanyBarcode(scannedBarcode);
            if (co.valid) {
              barcodeColors = { primary: co.primaryColor || '', secondary: co.secondaryColor || '' };
              // تحقّق أن المستخدم تابع لنفس الشركة — لو فشل، تجاهل فقط (ما نوقف الدخول)
              try {
                const check = await verifyUserCompany(co.companyId);
                if (!check.ok) barcodeColors = null;
              } catch (e) {}
            }
            // لو الباركود غير صالح (مثلاً الحقل company_barcode غير موجود بأودو)
            // نتجاهل بصمت — الألوان الحقيقية رح تجي من شركة المستخدم مباشرة أدناه.
          }
        } catch (e) {}
        await markScanned();
        // المصدر الأساسي للألوان: شركة المستخدم الحقيقية من أودو (Document Layout —
        // primary_color/secondary_color على res.company)، اللي تُقرأ أصلاً داخل login().
        // ألوان الباركود (لو صحّت) تُستخدم فقط كأولوية إضافية إن وُجدت.
        const cu = getCurrentUser();
        const prim = (barcodeColors && barcodeColors.primary) || (cu && cu.companyPrimary) || '';
        const sec = (barcodeColors && barcodeColors.secondary) || (cu && cu.companySecondary) || '';
        try {
          if (prim || sec) {
            applyCompanyColors(prim, sec, null);
            await saveCompanyColor(null, prim, sec);
          }
        } catch (e) {}
        await reloadProjects();
        navigation.replace('PickProject');
      } catch (e) {
        setError(e.message || 'تعذّر تسجيل الدخول.');
      } finally {
        setLoading(false);
      }
    } else {
      await markScanned();        // وضع العرض: احفظ العلامة أيضاً
      navigation.replace('PickProject');
    }
  };

  return (
    <View style={styles.authRoot}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
          <SiteHeader height={270} gradient={['rgba(91,89,182,0.85)', 'rgba(58,56,139,0.95)', '#ffffff']}>
            <SafeAreaView style={{ flex: 1 }}>
              <TouchableOpacity style={styles.backToScan} onPress={() => navigation.replace('Scan')}>
                <Icon name="maximize" size={15} color={colors.white} />
                <T weight="medium" style={styles.backToScanText}>مسح باركود آخر</T>
              </TouchableOpacity>
              <View style={styles.headerBrand}>
                <Logo size={64} />
                <L style={styles.brandMid}>Contracting Lite</L>
                <T style={styles.brandSubDark}>إدارة المقاولات</T>
              </View>
            </SafeAreaView>
          </SiteHeader>

          <View style={styles.authBody}>
            {/* شارة تأكيد المسح */}
            <View style={styles.scannedBadge}>
              <View style={styles.scannedIcon}><Icon name="check" size={14} color={colors.white} /></View>
              <View style={{ flex: 1 }}>
                <T weight="semibold" style={styles.scannedTitle}>تم مسح الباركود</T>
                <T style={styles.scannedSub}>تأكيد بيانات الحساب لإتمام الدخول</T>
              </View>
            </View>

            <View style={{ gap: 20, marginTop: 22 }}>
              <UnderlineField label="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" icon="mail" />
              <UnderlineField label="كلمة المرور" value={password} onChangeText={setPassword} secure icon="lock" />

              {error && (
                <View style={styles.errorBox}>
                  <Icon name="alert-circle" size={15} color={authColors.accent700} />
                  <T style={styles.errorText}>{error}</T>
                </View>
              )}

              <TouchableOpacity activeOpacity={0.85} onPress={loading ? undefined : onLogin} style={styles.loginBtn}>
                <T weight="semibold" style={styles.loginBtnText}>{loading ? 'جارٍ الدخول…' : 'دخول'}</T>
              </TouchableOpacity>
              {!USE_API && (
                <T style={styles.demoNote}>وضع العرض التجريبي · لتفعيل الربط الحقيقي عدّل USE_API في src/api/config.js</T>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = makeStyles(() => ({
  welcomeRoot: { flex: 1, backgroundColor: authColors.accent2_900 },
  welcomeSafe: { flex: 1, paddingHorizontal: 34, paddingBottom: 40, alignItems: 'center' },
  welcomeCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brandBig: { fontSize: 22, color: colors.white, letterSpacing: 1.5, fontWeight: '600' },
  brandLine: { width: 44, height: 1, backgroundColor: 'rgba(253,252,250,0.4)' },
  brandSub: { fontSize: 12.5, color: colors.white, opacity: 0.75, letterSpacing: 1 },
  welcomeBottom: { width: '100%', alignItems: 'center', gap: 26 },
  welcomeTagline: { fontSize: 13, color: colors.white, opacity: 0.82, textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },
  welcomeBtn: { width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderRadius: radius.pill, paddingVertical: 17 },
  welcomeBtnText: { color: authColors.ink, fontSize: 13.5, letterSpacing: 0.5 },
  loginBtn: { width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: authColors.blue, borderRadius: radius.pill, paddingVertical: 16 },
  loginBtnText: { color: '#fdfcfa', fontSize: 15, letterSpacing: 0.3 },

  // شاشة المسح
  scanRoot: { flex: 1, backgroundColor: authColors.accent2_900 },
  scanOverlay: { ...StyleSheet.absoluteFillObject },
  permBtn: { marginTop: 20, backgroundColor: colors.white, borderRadius: radius.pill, paddingVertical: 14, paddingHorizontal: 30 },
  permBtnText: { color: authColors.ink, fontSize: 13.5 },
  scanBack: { margin: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(253,252,250,0.18)', alignItems: 'center', justifyContent: 'center' },
  backToScan: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', margin: 16, paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.18)' },
  backToScanText: { fontSize: 12.5, color: colors.white },
  scanContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  scanBrand: { fontSize: 16, color: colors.white, letterSpacing: 1, fontWeight: '600' },
  scanFrame: { width: 260, height: 260, borderRadius: 28, backgroundColor: 'rgba(253,252,250,0.06)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: authColors.accent },
  cornerTL: { top: 14, left: 14, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
  cornerTR: { top: 14, right: 14, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
  cornerBL: { bottom: 14, left: 14, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 14, right: 14, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 },
  qrMock: { width: 117, height: 117, alignItems: 'center', justifyContent: 'center', opacity: 0.9 },
  qrGrid: { width: 117, height: 117, position: 'relative' },
  qrCell: { position: 'absolute', width: 11, height: 11, borderRadius: 2, backgroundColor: colors.white },
  scanLine: { position: 'absolute', left: 16, right: 16, height: 3 },
  scanSuccess: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(29,34,22,0.7)' },
  successCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: authColors.accent2_500, alignItems: 'center', justifyContent: 'center' },
  scanHint: { fontSize: 14, color: colors.white, textAlign: 'center', marginTop: 34, paddingHorizontal: 40, lineHeight: 22 },
  scanErrorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(220,60,50,0.92)', borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 18, marginTop: 30, marginHorizontal: 30 },
  scanErrorText: { flex: 1, fontSize: 13, color: '#fff', textAlign: 'right', lineHeight: 20 },
  scanSub: { fontSize: 12.5, color: authColors.accent400, marginTop: 8, opacity: 0.9 },

  // شاشة الدخول
  authRoot: { flex: 1, backgroundColor: colors.card },
  backCircle: { position: 'absolute', top: 12, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(253,252,250,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerBrand: { position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center', gap: 8 },
  brandMid: { fontSize: 15, color: colors.white, letterSpacing: 1, fontWeight: '600' },
  brandSubDark: { fontSize: 11.5, color: colors.white, opacity: 0.8 },
  authBody: { paddingHorizontal: 30, paddingTop: 20, paddingBottom: 30 },
  scannedBadge: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: authColors.accent2_100, borderRadius: radius.md, padding: 14 },
  scannedIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: authColors.accent2_500, alignItems: 'center', justifyContent: 'center' },
  scannedTitle: { fontSize: 13.5, color: authColors.accent2_800, textAlign: 'right' },
  scannedSub: { fontSize: 11.5, color: authColors.accent2_700, textAlign: 'right', marginTop: 1 },
  fieldLabel: { fontSize: 11.5, color: colors.neutral700 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral300 },
  underlineInput: { flex: 1, paddingVertical: 8, paddingHorizontal: 2, fontSize: 13.5, color: colors.text, fontFamily: fonts.arabic, textAlign: 'right' },
  forgot: { fontSize: 12.5, color: authColors.accent },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: authColors.accent100, borderRadius: radius.sm, padding: 12 },
  errorText: { flex: 1, fontSize: 12.5, color: authColors.accent700, textAlign: 'right' },
  demoNote: { fontSize: 11, color: colors.neutral500, textAlign: 'center', lineHeight: 18, marginTop: 4 },
}));
