import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '../i18n';

export type ItemsListMode = 'normal' | 'pack' | 'sign';

type Props = {
  listMode: ItemsListMode;
  selectedCount: number;
  onEnterPack: () => void;
  onEnterSign: () => void;
  onCancel: () => void;
  onOpenPack: () => void;
  onBatchSign: () => void;
};

export default function ItemsModeBar({
  listMode,
  selectedCount,
  onEnterPack,
  onEnterSign,
  onCancel,
  onOpenPack,
  onBatchSign,
}: Props) {
  const { t, fmt } = useTranslation();

  return (
    <View style={styles.actionRow}>
      {listMode === 'normal' ? (
        <>
          <Pressable
            style={styles.packBtn}
            onPress={onEnterPack}
            accessibilityRole="button"
            accessibilityLabel={t.items.packBtn}
          >
            <Text style={styles.packBtnText}>{t.items.packBtn}</Text>
          </Pressable>
          <Pressable
            style={styles.signSelectBtn}
            onPress={onEnterSign}
            accessibilityRole="button"
            accessibilityLabel={t.items.batchSignBtn}
          >
            <Text style={styles.signSelectBtnText}>{t.items.batchSignBtn}</Text>
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
          <Text style={styles.packHint}>{t.items.packHint}</Text>
          <Pressable
            style={[styles.packBtn, selectedCount === 0 && styles.packBtnDisabled]}
            onPress={onOpenPack}
            disabled={selectedCount === 0}
            accessibilityRole="button"
            accessibilityLabel={fmt(t.items.nextStep, { count: selectedCount })}
          >
            <Text style={styles.packBtnText}>{fmt(t.items.nextStep, { count: selectedCount })}</Text>
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
          <Text style={styles.packHint}>{t.items.signSelectHint}</Text>
          <Pressable
            style={[styles.signActionBtn, selectedCount === 0 && styles.packBtnDisabled]}
            onPress={onBatchSign}
            disabled={selectedCount === 0}
            accessibilityRole="button"
            accessibilityLabel={fmt(t.items.batchSignConfirm, { count: selectedCount })}
          >
            <Text style={styles.signActionBtnText}>
              {fmt(t.items.batchSignConfirm, { count: selectedCount })}
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
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  packBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  packBtnDisabled: { opacity: 0.5 },
  packBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  signSelectBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#059669',
  },
  signSelectBtnText: { color: '#6ee7b7', fontWeight: '800', fontSize: 14 },
  signActionBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  signActionBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  ghostBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#475569',
  },
  ghostBtnText: { color: '#94a3b8', fontWeight: '700' },
  packHint: { flex: 1, color: '#64748b', fontSize: 12, minWidth: 120 },
});
