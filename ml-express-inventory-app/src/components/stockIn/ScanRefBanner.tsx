import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '../../i18n';
import { colors, radius, space } from '../../theme';

export default function ScanRefBanner({ code, hint }: { code: string; hint?: string }) {
  const { t } = useTranslation();
  const trimmed = code.trim();
  if (!trimmed) {
    return (
      <View style={styles.scanBannerEmpty}>
        <Text style={styles.scanBannerEmptyText}>{t.stockIn.noBarcodeBanner}</Text>
      </View>
    );
  }
  return (
    <View style={styles.scanBanner}>
      <Text style={styles.scanBannerLabel}>{hint ?? t.stockIn.linkedBarcode}</Text>
      <Text style={styles.scanBannerValue} selectable>
        {trimmed}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scanBanner: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.accentBlue,
  },
  scanBannerEmpty: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scanBannerEmptyText: { color: colors.muted2, fontSize: 12 },
  scanBannerLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  scanBannerValue: {
    color: colors.accentSkyBright,
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
});
