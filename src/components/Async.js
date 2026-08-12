import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { T, Icon } from './index';
import { colors, space, makeStyles } from '../theme';

export function Loading({ label = 'جارٍ التحميل…' }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} size="large" />
      <T style={styles.text}>{label}</T>
    </View>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <View style={styles.center}>
      <Icon name="alert-circle" size={28} color={colors.accent700} />
      <T style={styles.errText}>{message}</T>
      {onRetry && (
        <T weight="semibold" style={styles.retry} onPress={onRetry}>إعادة المحاولة</T>
      )}
    </View>
  );
}

const styles = makeStyles(() => ({
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  text: { fontSize: 13, color: colors.neutral600 },
  errText: { fontSize: 13.5, color: colors.neutral700, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
  retry: { fontSize: 14, color: colors.accent, marginTop: 4 },
}));
