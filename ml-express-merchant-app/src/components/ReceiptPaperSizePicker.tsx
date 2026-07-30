import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  getReceiptPaperLabel,
  RECEIPT_PAPER_WIDTH_OPTIONS,
  type ReceiptPaperWidthMm,
} from '../constants/receiptPaper';

type Props = {
  language: string;
  value: ReceiptPaperWidthMm;
  onChange: (width: ReceiptPaperWidthMm) => void;
  sectionLabel: string;
  hint?: string;
  compact?: boolean;
};

export default function ReceiptPaperSizePicker({
  language,
  value,
  onChange,
  sectionLabel,
  hint,
  compact = false,
}: Props) {
  return (
    <View style={[styles.section, compact && styles.sectionCompact]}>
      <Text style={styles.label}>{sectionLabel}</Text>
      <View style={styles.row}>
        {RECEIPT_PAPER_WIDTH_OPTIONS.map((width) => {
          const active = value === width;
          return (
            <Pressable
              key={width}
              style={[styles.chip, active && styles.chipActive, compact && styles.chipCompact]}
              onPress={() => onChange(width)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {getReceiptPaperLabel(width, language)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 12,
    gap: 8,
  },
  sectionCompact: {
    marginBottom: 10,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#0f172a',
  },
  chipCompact: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chipActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#0c4a6e',
  },
  chipText: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 11,
  },
  chipTextActive: {
    color: '#e0f2fe',
  },
  hint: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
