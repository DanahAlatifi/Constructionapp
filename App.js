import React, { useState, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { I18nManager } from 'react-native';
import * as Font from 'expo-font';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation';
import { colors, onThemeChange, applyCompanyColors } from './src/theme';
import { loadCompanyColor, loadConnectionConfig } from './src/api/storage';
import { setOdooConfig } from './src/api/config';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.card, text: colors.text, primary: colors.primary, border: colors.border },
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [, forceRedraw] = useState(0);

  useEffect(() => {
    // عند تغيّر لون الشركة: الأنماط تتحدّث في makeStyles، ونعيد رسم الجذر
    const off = onThemeChange(() => forceRedraw((v) => v + 1));
    return off;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // طبّق إعدادات الاتصال المحفوظة (الرابط + القاعدة من الباركود) أولاً
        try {
          const conn = await loadConnectionConfig();
          if (conn && (conn.url || conn.db)) setOdooConfig(conn);
        } catch (e) {}
        // طبّق لون الشركة المحفوظ قبل بناء الشاشات (تُبنى الأنماط باللون الصح)
        try {
          const saved = await loadCompanyColor();
          if (saved && (saved.primary || saved.secondary || saved.colorIndex != null)) {
            applyCompanyColors(saved.primary, saved.secondary, saved.colorIndex);
          }
        } catch (e) {}
        await Font.loadAsync({
          'IBMPlexArabic': require('./assets/fonts/IBMPlexSansArabic-Regular.ttf'),
          'IBMPlexArabic-Medium': require('./assets/fonts/IBMPlexSansArabic-Medium.ttf'),
          'IBMPlexArabic-Bold': require('./assets/fonts/IBMPlexSansArabic-Bold.ttf'),
          'Caprasimo': require('./assets/fonts/Caprasimo-Regular.ttf'),
          'Figtree': require('./assets/fonts/Figtree-Variable.ttf'),
        });
      } catch (e) {
        console.warn('font load error', e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
