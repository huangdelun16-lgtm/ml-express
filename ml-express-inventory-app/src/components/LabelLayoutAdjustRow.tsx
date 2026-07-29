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
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '800', flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#475569',
  },
  stepBtnPrimary: { backgroundColor: '#0c4a6e', borderColor: '#0284c7' },
  stepBtnDisabled: { opacity: 0.45 },
  stepBtnText: { color: '#e2e8f0', fontSize: 17, fontWeight: '900', lineHeight: 18 },
  stepBtnPrimaryText: { color: '#7dd3fc' },
  axisValue: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
    minWidth: 64,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
