import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  clampLabelPaperSpec,
  findMatchingPaperPreset,
  formatPaperSpec,
  LABEL_PAPER_PRESETS,
  type LabelPaperSpec,
} from '../constants/labelPaperSpec';
import { useTranslation } from '../i18n';

type Props = {
  paper: LabelPaperSpec;
  disabled?: boolean;
  onChange: (paper: LabelPaperSpec) => void;
};

type FieldKey = 'widthMm' | 'heightMm' | 'gapMm';

const FIELD_STEP: Record<FieldKey, number> = {
  widthMm: 1,
  heightMm: 1,
  gapMm: 0.5,
};

const FIELD_MIN: Record<FieldKey, number> = {
  widthMm: 20,
  heightMm: 10,
  gapMm: 0,
};

const FIELD_MAX: Record<FieldKey, number> = {
  widthMm: 80,
  heightMm: 80,
  gapMm: 10,
};

export default function LabelPaperSpecEditor({ paper, disabled, onChange }: Props) {
  const { t } = useTranslation();
  const activePreset = findMatchingPaperPreset(paper);

  const labels: Record<FieldKey, string> = {
    widthMm: t.settings.printPreviewPaperWidth,
    heightMm: t.settings.printPreviewPaperHeight,
    gapMm: t.settings.printPreviewPaperGap,
  };

  const adjust = (field: FieldKey, delta: number) => {
    if (disabled) return;
    const next = clampLabelPaperSpec({
      ...paper,
      [field]: paper[field] + delta,
    });
    onChange(next);
  };

  const applyPreset = (preset: LabelPaperSpec) => {
    if (disabled) return;
    onChange(clampLabelPaperSpec(preset));
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.summary}>{formatPaperSpec(paper)}</Text>
      <View style={styles.presetRow}>
        {LABEL_PAPER_PRESETS.map((preset) => {
          const active = activePreset === preset.id;
          return (
            <Pressable
              key={preset.id}
              style={[styles.presetChip, active && styles.presetChipActive, disabled && styles.disabled]}
              onPress={() =>
                applyPreset({
                  widthMm: preset.widthMm,
                  heightMm: preset.heightMm,
                  gapMm: preset.gapMm,
                })
              }
              disabled={disabled}
            >
              <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                {preset.widthMm}×{preset.heightMm}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {(['widthMm', 'heightMm', 'gapMm'] as FieldKey[]).map((field) => (
        <View key={field} style={styles.row}>
          <Text style={styles.label}>{labels[field]}</Text>
          <View style={styles.stepper}>
            <Pressable
              style={[styles.stepBtn, disabled && styles.disabled]}
              onPress={() => adjust(field, -FIELD_STEP[field])}
              disabled={disabled || paper[field] <= FIELD_MIN[field]}
            >
              <Text style={styles.stepBtnText}>−</Text>
            </Pressable>
            <Text style={styles.value}>{paper[field].toFixed(field === 'gapMm' ? 1 : 0)}</Text>
            <Pressable
              style={[styles.stepBtn, styles.stepBtnPrimary, disabled && styles.disabled]}
              onPress={() => adjust(field, FIELD_STEP[field])}
              disabled={disabled || paper[field] >= FIELD_MAX[field]}
            >
              <Text style={[styles.stepBtnText, styles.stepBtnPrimaryText]}>+</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  summary: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'monospace',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 10,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#151f31',
  },
  presetChipActive: {
    borderColor: '#0284c7',
    backgroundColor: 'rgba(2,132,199,0.15)',
  },
  presetChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
  },
  presetChipTextActive: {
    color: '#bae6fd',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 6,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
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
  stepBtnPrimary: {
    backgroundColor: '#0c4a6e',
    borderColor: '#0284c7',
  },
  stepBtnText: {
    color: '#e2e8f0',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 18,
  },
  stepBtnPrimaryText: {
    color: '#7dd3fc',
  },
  value: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '900',
    minWidth: 42,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  disabled: { opacity: 0.45 },
});
