import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatLayoutMm, LABEL_LAYOUT_STEP_DOTS } from '../constants/labelBarcodeLayout';

type Props = {
  label: string;
  valueDots: number;
  disabled?: boolean;
  onAdjust: (deltaDots: number) => void;
};

export default function LabelLayoutHeightAdjustRow({
  label,
  valueDots,
  disabled,
  onAdjust,
}: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          style={[styles.stepBtn, disabled && styles.stepBtnDisabled]}
          onPress={() => onAdjust(-LABEL_LAYOUT_STEP_DOTS)}
          disabled={disabled}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.axisValue}>{formatLayoutMm(valueDots)}</Text>
        <Pressable
          style={[styles.stepBtn, styles.stepBtnPrimary, disabled && styles.stepBtnDisabled]}
          onPress={() => onAdjust(LABEL_LAYOUT_STEP_DOTS)}
          disabled={disabled}
        >
          <Text style={[styles.stepBtnText, styles.stepBtnPrimaryText]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  label: { color: '#38bdf8', fontSize: 13, fontWeight: '900', flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#475569',
  },
  stepBtnPrimary: { backgroundColor: '#0c4a6e', borderColor: '#0284c7' },
  stepBtnDisabled: { opacity: 0.45 },
  stepBtnText: { color: '#e2e8f0', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  stepBtnPrimaryText: { color: '#7dd3fc' },
  axisValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
    minWidth: 72,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
