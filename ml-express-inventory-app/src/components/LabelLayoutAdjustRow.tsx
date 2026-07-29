import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LABEL_LAYOUT_STEP_DOTS } from '../constants/labelBarcodeLayout';

type Props = {
  label: string;
  valueText: string;
  step?: number;
  disabled?: boolean;
  tone?: 'dark' | 'light';
  canDecrease?: boolean;
  canIncrease?: boolean;
  onAdjust: (delta: number) => void;
};

export default function LabelLayoutHeightAdjustRow({
  label,
  valueText,
  step = LABEL_LAYOUT_STEP_DOTS,
  disabled,
  tone = 'dark',
  canDecrease = true,
  canIncrease = true,
  onAdjust,
}: Props) {
  const light = tone === 'light';
  return (
    <View style={[styles.row, light && styles.rowLight]}>
      <Text style={[styles.label, light && styles.labelLight]}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          style={[
            styles.stepBtn,
            light && styles.stepBtnLight,
            (disabled || !canDecrease) && styles.stepBtnDisabled,
          ]}
          onPress={() => onAdjust(-step)}
          disabled={disabled || !canDecrease}
        >
          <Text style={[styles.stepBtnText, light && styles.stepBtnTextLight]}>−</Text>
        </Pressable>
        <Text style={[styles.axisValue, light && styles.axisValueLight]}>{valueText}</Text>
        <Pressable
          style={[
            styles.stepBtn,
            light ? styles.stepBtnPrimaryLight : styles.stepBtnPrimary,
            (disabled || !canIncrease) && styles.stepBtnDisabled,
          ]}
          onPress={() => onAdjust(step)}
          disabled={disabled || !canIncrease}
        >
          <Text style={[styles.stepBtnText, light ? styles.stepBtnPrimaryTextLight : styles.stepBtnPrimaryText]}>
            +
          </Text>
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
  rowLight: {
    borderBottomWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '800', flex: 1 },
  labelLight: { color: '#334155', fontSize: 11 },
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
  stepBtnLight: { backgroundColor: '#0f172a', borderColor: '#334155' },
  stepBtnPrimaryLight: { backgroundColor: '#0c4a6e', borderColor: '#0369a1' },
  stepBtnDisabled: { opacity: 0.45 },
  stepBtnText: { color: '#e2e8f0', fontSize: 17, fontWeight: '900', lineHeight: 18 },
  stepBtnTextLight: { color: '#e2e8f0', fontSize: 15 },
  stepBtnPrimaryText: { color: '#7dd3fc' },
  stepBtnPrimaryTextLight: { color: '#bae6fd' },
  axisValue: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
    minWidth: 64,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  axisValueLight: { color: '#0f172a', minWidth: 48, fontSize: 11 },
});
