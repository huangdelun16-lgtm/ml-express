import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import {
  formatTimeAgo,
  getCrossBorderCategoryLabel,
  getLedgerAmountDisplay,
  LEDGER_CATEGORY_STYLE,
  useTranslation,
} from '../../i18n';
import type { FinanceLedgerEntry } from '../../types/financeLedger';
import { formatCnyAmount, formatMmkAmount, isCustomerLedgerCategory, mmkToCny } from '../../utils/crossBorderFx';
import { displayRateForCustomerCategory } from '../../utils/crossBorderFxLock';
import { regionDisplayLabel } from '../../constants/destinationOptions';
import { colors, radius, space } from '../../theme';
import AppText from '../AppText';

export default function FinanceLedgerRow({
  item,
  deleting,
  onDelete,
  mmkPerCny,
}: {
  item: FinanceLedgerEntry;
  deleting: boolean;
  onDelete?: () => void;
  mmkPerCny?: number | null;
}) {
  const { t } = useTranslation();
  const style = LEDGER_CATEGORY_STYLE[item.category];
  const when = formatTimeAgo(item.occurredAt, t);
  const fallback = getLedgerAmountDisplay(t, item);
  const displayRate = displayRateForCustomerCategory(
    item.category,
    item.fxMmkPerCny,
    mmkPerCny ?? null,
  );
  const cny =
    isCustomerLedgerCategory(item.category) && item.amount != null
      ? mmkToCny(item.amount, displayRate)
      : null;
  const amountPrimary = cny != null ? `¥${formatCnyAmount(cny)}` : fallback;
  const amountSecondary =
    cny != null && item.amount != null ? `${formatMmkAmount(item.amount)} MMK` : null;

  return (
    <View style={styles.ledgerRow}>
      <View style={[styles.accent, { backgroundColor: style.accent }]} />
      <View style={styles.ledgerBody}>
        <View style={styles.ledgerTitleRow}>
          <AppText style={styles.ledgerName} numberOfLines={1} myanmarWeight="bold">
            {item.itemName || item.barcode || item.title}
          </AppText>
          <View style={styles.amountCol}>
            <AppText
              style={[styles.amountText, { color: style.accent }]}
              numberOfLines={1}
              myanmarWeight="bold"
            >
              {amountPrimary}
            </AppText>
            {amountSecondary ? (
              <AppText style={styles.amountSub} numberOfLines={1} myanmarWeight="semibold">
                {amountSecondary}
              </AppText>
            ) : null}
          </View>
        </View>
        <View style={styles.tagRow}>
          <View style={[styles.catDot, { backgroundColor: style.accent }]} />
          <AppText style={styles.catLabel} myanmarWeight="semibold">
            {getCrossBorderCategoryLabel(t, item.category)}
          </AppText>
          {item.destination ? (
            <AppText style={styles.destTag} myanmarWeight="semibold">
              → {regionDisplayLabel(item.destination)}
            </AppText>
          ) : null}
        </View>
        {item.subtitle ? (
          <AppText style={styles.ledgerSubtitle} numberOfLines={2} myanmarWeight="regular">
            {item.subtitle}
          </AppText>
        ) : null}
        <View style={styles.metaRow}>
          <AppText style={styles.metaTime} myanmarWeight="regular">
            {when.primary}
          </AppText>
          {item.barcode ? (
            <>
              <AppText style={styles.metaDot}>·</AppText>
              <AppText style={styles.metaBarcode} numberOfLines={1} myanmarWeight="regular">
                {item.barcode}
              </AppText>
            </>
          ) : null}
          {item.deletable && onDelete ? (
            <Pressable
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
              disabled={deleting}
              onPress={onDelete}
            >
              {deleting ? (
                <ActivityIndicator color={colors.danger} size="small" />
              ) : (
                <AppText style={styles.deleteText} myanmarWeight="bold">
                  {t.manualEntry.delete}
                </AppText>
              )}
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  accent: { width: 3 },
  ledgerBody: { flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 12 },
  ledgerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  ledgerName: { color: colors.text, fontSize: 15, fontWeight: '700', flex: 1, lineHeight: 20 },
  amountCol: { maxWidth: '46%', alignItems: 'flex-end' },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  amountSub: {
    color: colors.muted2,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  catDot: { width: 6, height: 6, borderRadius: 3 },
  catLabel: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  destTag: { color: colors.accentSkyBright, fontSize: 11, fontWeight: '600' },
  ledgerSubtitle: { color: colors.muted, fontSize: 12, marginTop: 6, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: space.xs },
  metaTime: { color: colors.muted2, fontSize: 11, fontWeight: '500' },
  metaDot: { color: colors.borderMuted, fontSize: 11 },
  metaBarcode: { color: colors.muted2, fontSize: 11, fontWeight: '500', flex: 1 },
  deleteBtn: {
    marginLeft: 'auto',
    minWidth: 42,
    minHeight: 28,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(248,113,113,0.1)',
  },
  deleteBtnPressed: { opacity: 0.8 },
  deleteText: { color: colors.danger, fontSize: 11, fontWeight: '800' },
});
