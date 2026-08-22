import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  formatTimeAgo,
  getCrossBorderCategoryLabel,
  getLedgerAmountDisplay,
  LEDGER_CATEGORY_STYLE,
  useTranslation,
} from '../../i18n';
import type { FinanceLedgerEntry } from '../../types/financeLedger';
import { regionDisplayLabel } from '../../constants/destinationOptions';
import { colors, radius, space } from '../../theme';

export default function FinanceLedgerRow({
  item,
  deleting,
  onDelete,
}: {
  item: FinanceLedgerEntry;
  deleting: boolean;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const style = LEDGER_CATEGORY_STYLE[item.category];
  const when = formatTimeAgo(item.occurredAt, t);

  return (
    <View style={[styles.ledgerRow, { borderLeftColor: style.accent }]}>
      <View style={[styles.iconCircle, { backgroundColor: style.tint }]}>
        <Text style={styles.iconEmoji}>{style.icon}</Text>
      </View>
      <View style={styles.ledgerBody}>
        <View style={styles.ledgerTitleRow}>
          <Text style={styles.ledgerName} numberOfLines={1}>
            {item.itemName || item.barcode || item.title}
          </Text>
          <View style={[styles.amountPill, { backgroundColor: style.pillBg }]}>
            <Text style={[styles.amountText, { color: style.accent }]} numberOfLines={1}>
              {getLedgerAmountDisplay(t, item)}
            </Text>
          </View>
        </View>
        <View style={styles.tagRow}>
          <Text style={[styles.typeTag, { color: style.accent, backgroundColor: style.tint }]}>
            {getCrossBorderCategoryLabel(t, item.category)}
          </Text>
          {item.destination ? (
            <Text style={styles.destTag}>→ {regionDisplayLabel(item.destination)}</Text>
          ) : null}
        </View>
        {item.subtitle ? (
          <Text style={styles.ledgerSubtitle} numberOfLines={2}>
            {item.subtitle}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={styles.metaTime}>{when.primary}</Text>
          {item.barcode ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaBarcode} numberOfLines={1}>
                {item.barcode}
              </Text>
            </>
          ) : null}
          {item.deletable && onDelete ? (
            <Pressable style={styles.deleteBtn} disabled={deleting} onPress={onDelete}>
              {deleting ? (
                <ActivityIndicator color={colors.danger} size="small" />
              ) : (
                <Text style={styles.deleteText}>{t.manualEntry.delete}</Text>
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
    alignItems: 'flex-start',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 18 },
  ledgerBody: { flex: 1, minWidth: 0 },
  ledgerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  ledgerName: { color: colors.text, fontSize: 15, fontWeight: '800', flex: 1 },
  amountPill: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  amountText: { fontSize: 12, fontWeight: '900' },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 6 },
  typeTag: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  destTag: { color: colors.accentSky, fontSize: 11, fontWeight: '700' },
  ledgerSubtitle: { color: colors.muted, fontSize: 12, marginTop: 6, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: space.xs },
  metaTime: { color: colors.muted2, fontSize: 11, fontWeight: '600' },
  metaDot: { color: colors.borderMuted, fontSize: 11 },
  metaBarcode: { color: colors.muted2, fontSize: 11, fontWeight: '600', flex: 1 },
  deleteBtn: {
    marginLeft: 'auto',
    minWidth: 42,
    minHeight: 26,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: 'rgba(248,113,113,0.1)',
  },
  deleteText: { color: colors.danger, fontSize: 11, fontWeight: '800' },
});
