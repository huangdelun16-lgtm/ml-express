import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type SizeRowProps = {
  label: string;
  valueDisplay: string;
  disabled?: boolean;
  tone?: 'dark' | 'light';
  canDecrease?: boolean;
  canIncrease?: boolean;
  onStep: (direction: 1 | -1) => void;
};

function SizeRow({
  label,
  valueDisplay,
  disabled,
  tone = 'dark',
  canDecrease = true,
  canIncrease = true,
  onStep,
}: SizeRowProps) {
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
          onPress={() => onStep(-1)}
          disabled={disabled || !canDecrease}
        >
          <Text style={[styles.stepBtnText, light && styles.stepBtnTextLight]}>−</Text>
        </Pressable>
        <Text style={[styles.axisValue, light && styles.axisValueLight]}>{valueDisplay}</Text>
        <Pressable
          style={[
            styles.stepBtn,
            light ? styles.stepBtnPrimaryLight : styles.stepBtnPrimary,
            (disabled || !canIncrease) && styles.stepBtnDisabled,
          ]}
          onPress={() => onStep(1)}
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

type Props = {
  barcodeWidthLabel: string;
  barcodeHeightLabel: string;
  textScaleLabel: string;
  barcodeWidthDisplay: string;
  barcodeHeightDisplay: string;
  textScaleDisplay: string;
  canDecreaseBarcodeWidth?: boolean;
  canIncreaseBarcodeWidth?: boolean;
  canDecreaseBarcodeHeight?: boolean;
  canIncreaseBarcodeHeight?: boolean;
  canDecreaseTextScale?: boolean;
  canIncreaseTextScale?: boolean;
  disabled?: boolean;
  tone?: 'dark' | 'light';
  onAdjustBarcodeWidth: (direction: 1 | -1) => void;
  onAdjustBarcodeHeight: (direction: 1 | -1) => void;
  onAdjustTextScale: (direction: 1 | -1) => void;
};

export default function LabelLayoutSizeEditor({
  barcodeWidthLabel,
  barcodeHeightLabel,
  textScaleLabel,
  barcodeWidthDisplay,
  barcodeHeightDisplay,
  textScaleDisplay,
  canDecreaseBarcodeWidth = true,
  canIncreaseBarcodeWidth = true,
  canDecreaseBarcodeHeight = true,
  canIncreaseBarcodeHeight = true,
  canDecreaseTextScale = true,
  canIncreaseTextScale = true,
  disabled,
  tone = 'dark',
  onAdjustBarcodeWidth,
  onAdjustBarcodeHeight,
  onAdjustTextScale,
}: Props) {
  return (
    <View style={styles.wrap}>
      <SizeRow
        label={barcodeWidthLabel}
        valueDisplay={barcodeWidthDisplay}
        disabled={disabled}
        tone={tone}
        canDecrease={canDecreaseBarcodeWidth}
        canIncrease={canIncreaseBarcodeWidth}
        onStep={onAdjustBarcodeWidth}
      />
      <SizeRow
        label={barcodeHeightLabel}
        valueDisplay={barcodeHeightDisplay}
        disabled={disabled}
        tone={tone}
        canDecrease={canDecreaseBarcodeHeight}
        canIncrease={canIncreaseBarcodeHeight}
        onStep={onAdjustBarcodeHeight}
      />
      <SizeRow
        label={textScaleLabel}
        valueDisplay={textScaleDisplay}
        disabled={disabled}
        tone={tone}
        canDecrease={canDecreaseTextScale}
        canIncrease={canIncreaseTextScale}
        onStep={onAdjustTextScale}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
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
    minWidth: 72,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  axisValueLight: { color: '#0f172a', minWidth: 64, fontSize: 11 },
});
