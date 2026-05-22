import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type OrderWizardStepIndex = 0 | 1 | 2 | 3;

type Props = {
  currentStep: OrderWizardStepIndex;
  labels: string[];
  language: 'zh' | 'en' | 'my';
};

const STEP_COUNT = 4;

export default function OrderWizardProgress({ currentStep, labels, language }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {labels.map((label, index) => {
        const done = index < currentStep;
        const active = index === currentStep;
        return (
          <View key={label} style={styles.stepItem}>
            <View style={styles.stepTop}>
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  active && styles.dotActive,
                ]}
              >
                <Text style={[styles.dotText, (done || active) && styles.dotTextOn]}>
                  {done ? '✓' : index + 1}
                </Text>
              </View>
              {index < STEP_COUNT - 1 && (
                <View style={[styles.line, index < currentStep && styles.lineDone]} />
              )}
            </View>
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
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 4,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  dotActive: {
    backgroundColor: '#fbbf24',
    borderColor: '#fbbf24',
  },
  dotText: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
  },
  dotTextOn: {
    color: '#0f172a',
  },
  line: {
    position: 'absolute',
    left: '58%',
    right: '-42%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    top: 13,
    zIndex: -1,
  },
  lineDone: {
    backgroundColor: '#10b981',
  },
  label: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  labelActive: {
    color: '#fbbf24',
    fontWeight: '800',
  },
});
