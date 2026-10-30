import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { useTranslation } from '../i18n';
import { colors } from '../theme';

export type ItemsListMode = 'normal' | 'pack' | 'sign';

type Props = {
  listMode: ItemsListMode;
  selectedCount: number;
  onEnterPack: () => void;
  onEnterSign: () => void;
  onCancel: () => void;
  onOpenPack: () => void;
  onOpenInvoice: () => void;
};

export default function ItemsModeBar({
  listMode,
  selectedCount,
  onEnterPack,
  onEnterSign,
  onCancel,
  onOpenPack,
  onOpenInvoice,
}: Props) {
  const { t, fmt } = useTranslation();

  return (
    <View style={styles.actionRow}>
      {listMode === 'normal' ? (
        <>
          <Pressable
            style={[styles.packBtn, styles.pairBtn]}
            onPress={onEnterPack}
            accessibilityRole="button"
            accessibilityLabel={t.items.packBtn}
          >
            <Text style={styles.packBtnText} myanmarWeight="bold">
              {t.items.packBtn}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.signSelectBtn, styles.pairBtn]}
            onPress={onEnterSign}
            accessibilityRole="button"
            accessibilityLabel={t.items.batchSignBtn}
          >
            <Text style={styles.signSelectBtnText} myanmarWeight="bold">
              {t.items.batchSignBtn}
            </Text>
          </Pressable>
        </>
      ) : listMode === 'pack' ? (
        <>
          <Pressable
            style={styles.ghostBtn}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={t.items.cancelSelect}
          >
            <Text style={styles.ghostBtnText}>{t.items.cancelSelect}</Text>
          </Pressable>
          <Text style={styles.packHint} myanmarWeight="regular">
            {t.items.packHint}
          </Text>
          <Pressable
            style={[styles.packBtn, selectedCount === 0 && styles.packBtnDisabled]}
            onPress={onOpenPack}
            disabled={selectedCount === 0}
            accessibilityRole="button"
            accessibilityLabel={fmt(t.items.nextStep, { count: selectedCount })}
          >
            <Text style={styles.packBtnText} myanmarWeight="bold">
              {fmt(t.items.nextStep, { count: selectedCount })}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable
            style={styles.ghostBtn}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={t.items.cancelSelect}
          >
            <Text style={styles.ghostBtnText}>{t.items.cancelSelect}</Text>
          </Pressable>
          <Text style={styles.packHint} myanmarWeight="regular">
            {t.items.signSelectHint}
          </Text>
          <Pressable
            style={[styles.invoiceBtn, selectedCount === 0 && styles.packBtnDisabled]}
            onPress={onOpenInvoice}
            disabled={selectedCount === 0}
            accessibilityRole="button"
            accessibilityLabel={t.items.invoiceBtn}
          >
            <Text style={styles.invoiceBtnText} myanmarWeight="bold">
              {t.items.invoiceBtn}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 2,
    paddingBottom: 12,
  },
  pairBtn: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packBtn: {
    backgroundColor: colors.purple,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  packBtnDisabled: { opacity: 0.5 },
  packBtnText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  signSelectBtn: {
    backgroundColor: 'rgba(5,150,105,0.16)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: colors.successBorder,
  },
  signSelectBtnText: { color: colors.successText, fontWeight: '800', fontSize: 14 },
  invoiceBtn: {
    backgroundColor: '#0369a1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  invoiceBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  ghostBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  ghostBtnText: { color: colors.slateSoft, fontWeight: '700' },
  packHint: { flex: 1, color: colors.muted, fontSize: 12, minWidth: 120 },
});
