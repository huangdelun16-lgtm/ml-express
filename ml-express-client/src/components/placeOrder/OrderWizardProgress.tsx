import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type OrderWizardStepIndex = 0 | 1 | 2 | 3;

type Props = {
  currentStep: OrderWizardStepIndex;
  labels: string[];
  language: 'zh' | 'en' | 'my';
  compact?: boolean;
};

const STEP_COUNT = 4;
const TEAL = '#2C98A6';
const NAVY = '#0f172a';

export default function OrderWizardProgress({ currentStep, labels, language, compact = false }: Props) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]} accessibilityRole="tablist">
      {labels.map((label, index) => {
        const done = index < currentStep;
        const active = index === currentStep;
        return (
          <View key={label} style={styles.stepItem}>
            <View style={styles.stepTop}>
              <View
                style={[
                  styles.dot,
                  compact && styles.dotCompact,
                  done && styles.dotDone,
                  active && styles.dotActive,
                ]}
              >
                <Text style={[styles.dotText, compact && styles.dotTextCompact, (done || active) && styles.dotTextOn]}>
                  {done ? '✓' : index + 1}
                </Text>
              </View>
              {index < STEP_COUNT - 1 && (
                <View style={[styles.line, index < currentStep && styles.lineDone]} />
              )}
            </View>
            {!compact && (
              <Text
                style={[styles.label, active && styles.labelActive]}
                numberOfLines={1}
                accessibilityLabel={
                  language === 'zh'
                    ? `步骤 ${index + 1}：${label}`
                    : `Step ${index + 1}: ${label}`
                }
              >
                {label}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  wrapCompact: {
    marginBottom: 6,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e8edf2',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCompact: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  dotDone: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  dotActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  dotText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
  },
  dotTextCompact: {
    fontSize: 10,
  },
  dotTextOn: {
    color: '#fff',
  },
  line: {
    position: 'absolute',
    left: '58%',
    right: '-42%',
    height: 2,
    backgroundColor: '#e2e8f0',
    top: 13,
    zIndex: -1,
  },
  lineDone: {
    backgroundColor: TEAL,
  },
  label: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  labelActive: {
    color: NAVY,
    fontWeight: '800',
  },
});
