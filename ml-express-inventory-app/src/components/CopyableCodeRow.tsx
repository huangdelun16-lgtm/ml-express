import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import PackagingStockInBarcodeText from './PackagingStockInBarcodeText';
import { isPackagingStockInLineBarcode } from '../utils/inboundBarcode';

type Props = {
  label: string;
  value: string;
  copiedLabel: string;
  tapHint?: string;
  variant?: 'dark' | 'light';
  monospace?: boolean;
  compact?: boolean;
};

export default function CopyableCodeRow({
  label,
  value,
  copiedLabel,
  tapHint,
  variant = 'dark',
  monospace = true,
  compact = false,
}: Props) {
  const [copied, setCopied] = useState(false);
  const trimmed = value.trim();
  if (!trimmed) return null;

  const onCopy = useCallback(async () => {
    await Clipboard.setStringAsync(trimmed);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }, [trimmed]);

  const isDark = variant === 'dark';

  return (
    <Pressable
      style={[
        styles.row,
        isDark ? styles.rowDark : styles.rowLight,
        compact && styles.rowCompact,
      ]}
      onPress={() => void onCopy()}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${trimmed}`}
    >
      <Text style={[styles.label, isDark ? styles.labelDark : styles.labelLight]}>{label}</Text>
      <View style={styles.valueRow}>
        {isPackagingStockInLineBarcode(trimmed) ? (
          <PackagingStockInBarcodeText
            barcode={trimmed}
            variant={isDark ? 'dark' : 'light'}
            style={[styles.value, styles.packagingValue, monospace && styles.mono]}
            numberOfLines={2}
            selectable
          />
        ) : (
          <Text
            style={[
              styles.value,
              isDark ? styles.valueDark : styles.valueLight,
              monospace && styles.mono,
              compact && styles.valueCompact,
            ]}
            selectable
            numberOfLines={2}
          >
            {trimmed}
          </Text>
        )}
        <Text style={[styles.action, copied && styles.actionCopied]}>
          {copied ? copiedLabel : '📋'}
        </Text>
      </View>
      {tapHint && !copied && !compact ? (
        <Text style={[styles.hint, isDark ? styles.hintDark : styles.hintLight]}>{tapHint}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  rowCompact: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 5,
    borderRadius: 9,
  },
  rowDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  rowLight: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  labelDark: { color: '#64748b' },
  labelLight: { color: '#64748b' },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  valueDark: { color: '#e2e8f0' },
  valueLight: { color: '#0f172a' },
  valueCompact: { fontSize: 13, lineHeight: 18 },
  mono: { fontFamily: 'monospace' },
  packagingValue: {
    fontSize: 15,
  },
  action: {
    fontSize: 16,
    minWidth: 28,
    textAlign: 'center',
  },
  actionCopied: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34d399',
  },
  hint: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
  },
  hintDark: { color: '#475569' },
  hintLight: { color: '#94a3b8' },
});
