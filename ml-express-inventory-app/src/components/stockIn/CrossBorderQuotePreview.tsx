import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '../../i18n';
import { colors, radius } from '../../theme';
import { formatCnyAmount, formatMmkAmount, mmkToCny } from '../../utils/crossBorderFx';

export default function CrossBorderQuotePreview({
  totalFeeMmk,
  hint,
  mmkPerCny,
}: {
  totalFeeMmk: number;
  hint: string;
  mmkPerCny: number | null;
}) {
  const { t, fmt } = useTranslation();
  if (!Number.isFinite(totalFeeMmk) || totalFeeMmk <= 0) return null;

  const cny = mmkToCny(totalFeeMmk, mmkPerCny);
  const booked = fmt(t.stockIn.bookedMmk, { amount: formatMmkAmount(totalFeeMmk) });

  return (
    <View style={styles.box}>
      <Text style={styles.label}>{cny != null ? t.stockIn.quoteCny : t.stockIn.totalFee}</Text>
      {cny != null ? (
        <>
          <Text style={styles.cny}>¥{formatCnyAmount(cny)}</Text>
          <Text style={styles.booked}>{booked}</Text>
        </>
      ) : (
        <Text style={styles.mmk}>{formatMmkAmount(totalFeeMmk)} MMK</Text>
      )}
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
  hint: {
    color: colors.muted2,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
});
