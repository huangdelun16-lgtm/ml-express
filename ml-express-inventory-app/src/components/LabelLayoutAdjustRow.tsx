import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatLayoutMm, LABEL_LAYOUT_COARSE_STEP_DOTS, LABEL_LAYOUT_STEP_DOTS } from '../constants/labelBarcodeLayout';

type Props = {
  label: string;
  xDots: number;
  yDots: number;
  heightDots?: number;
  disabled?: boolean;
  onAdjust: (axis: 'x' | 'y' | 'height', deltaDots: number) => void;
};

function AxisStepper({
  axisLabel,
  valueMm,
  disabled,
  onDecrease,
  onIncrease,
  onDecreaseCoarse,
  onIncreaseCoarse,
}: {
  axisLabel: string;
  valueMm: string;
  disabled?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onDecreaseCoarse?: () => void;
  onIncreaseCoarse?: () => void;
}) {
  return (
    <View style={styles.axisRow}>
      <Text style={styles.axisLabel}>{axisLabel}</Text>
      <View style={styles.stepper}>
        {onDecreaseCoarse ? (
          <Pressable
            style={[styles.stepBtnMini, disabled && styles.stepBtnDisabled]}
            onPress={onDecreaseCoarse}
            disabled={disabled}
          >
            <Text style={styles.stepBtnMiniText}>−−</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.stepBtn, disabled && styles.stepBtnDisabled]}
          onPress={onDecrease}
          disabled={disabled}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.axisValue}>{valueMm}</Text>
        <Pressable
          style={[styles.stepBtn, styles.stepBtnPrimary, disabled && styles.stepBtnDisabled]}
          onPress={onIncrease}
          disabled={disabled}
        >
          <Text style={[styles.stepBtnText, styles.stepBtnPrimaryText]}>+</Text>
        </Pressable>
        {onIncreaseCoarse ? (
          <Pressable
            style={[styles.stepBtnMini, styles.stepBtnMiniPrimary, disabled && styles.stepBtnDisabled]}
            onPress={onIncreaseCoarse}
            disabled={disabled}
          >
            <Text style={[styles.stepBtnMiniText, styles.stepBtnPrimaryText]}>++</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function LabelLayoutAdjustRow({
  label,
  xDots,
  yDots,
  heightDots,
  disabled,
  onAdjust,
}: Props) {
  const step = (axis: 'x' | 'y' | 'height', delta: number) => onAdjust(axis, delta);
  const coarse = (axis: 'x' | 'y' | 'height', delta: number) =>
    onAdjust(axis, delta);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <AxisStepper
        axisLabel="X"
        valueMm={formatLayoutMm(xDots)}
        disabled={disabled}
        onDecrease={() => step('x', -LABEL_LAYOUT_STEP_DOTS)}
        onIncrease={() => step('x', LABEL_LAYOUT_STEP_DOTS)}
        onDecreaseCoarse={() => coarse('x', -LABEL_LAYOUT_COARSE_STEP_DOTS)}
        onIncreaseCoarse={() => coarse('x', LABEL_LAYOUT_COARSE_STEP_DOTS)}
      />
      <AxisStepper
        axisLabel="Y"
        valueMm={formatLayoutMm(yDots)}
        disabled={disabled}
        onDecrease={() => step('y', -LABEL_LAYOUT_STEP_DOTS)}
        onIncrease={() => step('y', LABEL_LAYOUT_STEP_DOTS)}
        onDecreaseCoarse={() => coarse('y', -LABEL_LAYOUT_COARSE_STEP_DOTS)}
        onIncreaseCoarse={() => coarse('y', LABEL_LAYOUT_COARSE_STEP_DOTS)}
      />
      {heightDots != null ? (
        <AxisStepper
          axisLabel="H"
          valueMm={formatLayoutMm(heightDots)}
          disabled={disabled}
          onDecrease={() => step('height', -LABEL_LAYOUT_STEP_DOTS)}
          onIncrease={() => step('height', LABEL_LAYOUT_STEP_DOTS)}
          onDecreaseCoarse={() => coarse('height', -LABEL_LAYOUT_COARSE_STEP_DOTS)}
          onIncreaseCoarse={() => coarse('height', LABEL_LAYOUT_COARSE_STEP_DOTS)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  label: { color: '#38bdf8', fontSize: 13, fontWeight: '900', marginBottom: 2 },
  axisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  axisLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '800', width: 18 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#475569',
  },
  stepBtnPrimary: { backgroundColor: '#0c4a6e', borderColor: '#0284c7' },
  stepBtnDisabled: { opacity: 0.45 },
  stepBtnText: { color: '#e2e8f0', fontSize: 18, fontWeight: '900', lineHeight: 20 },
  stepBtnPrimaryText: { color: '#7dd3fc' },
  stepBtnMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#475569',
  },
  stepBtnMiniPrimary: { backgroundColor: '#0c4a6e', borderColor: '#0284c7' },
  stepBtnMiniText: { color: '#94a3b8', fontSize: 11, fontWeight: '900' },
  axisValue: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
    minWidth: 68,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
