import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '../../i18n';
import { colors, radius } from '../../theme';
import { formatCnyAmount } from '../../utils/crossBorderFx';

export default function CrossBorderQuotePreview({
  quoteCny,
  hint,
  showQuote,
}: {
  quoteCny: number;
  hint: string;
  showQuote: boolean;
}) {
  const { t } = useTranslation();
  if (!showQuote || !Number.isFinite(quoteCny) || quoteCny < 0) return null;

  const isFree = quoteCny === 0;

  return (
    <View style={styles.box}>
      <Text style={styles.label}>{t.stockIn.quoteCny}</Text>
      <Text style={styles.cny}>¥{formatCnyAmount(quoteCny)}</Text>
      {isFree ? <Text style={styles.promo}>{t.stockIn.freePromo}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  cny: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  mmk: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  booked: {
    color: colors.slateSoft,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  promo: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
  },
  hint: {
    color: colors.muted2,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
});
