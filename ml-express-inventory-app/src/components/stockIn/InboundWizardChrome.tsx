import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../../theme';

export type WizardStep = 1 | 2 | 3;
export type WizardAccent = 'emerald' | 'amber';

const ACCENT = {
  emerald: {
    stepDotActive: colors.success,
    stepLabelActive: colors.successText,
    nextBg: colors.success,
    nextText: colors.white,
    nextFlex: 1.4 as const,
    nextRadius: radius.md,
    nextFontSize: 15,
    nextFontWeight: '800' as const,
    footerBorder: colors.border,
    footerPadBottom: Platform.OS === 'ios' ? 28 : space.lg,
    cancelText: colors.muted,
    cancelRadius: radius.md,
    disabledOpacity: 0.6,
  },
  amber: {
    stepDotActive: colors.amber,
    stepLabelActive: colors.amberSoft,
    nextBg: colors.amber,
    nextText: colors.bg,
    nextFlex: 2 as const,
    nextRadius: radius.lg,
    nextFontSize: 16,
    nextFontWeight: '900' as const,
    footerBorder: colors.card,
    footerPadBottom: space.md,
    cancelText: colors.slateSoft,
    cancelRadius: radius.lg,
    disabledOpacity: 0.55,
  },
};

export function InboundWizardHeader({
  title,
  step,
  stepLabels,
  accent = 'emerald',
}: {
  title: string;
  step: WizardStep;
  stepLabels: Record<WizardStep, string>;
  accent?: WizardAccent;
}) {
  const palette = ACCENT[accent];
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.stepRow}>
        {([1, 2, 3] as WizardStep[]).map((n) => (
          <View key={n} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                step >= n && { backgroundColor: palette.stepDotActive },
              ]}
            >
              <Text style={[styles.stepDotText, step >= n && styles.stepDotTextActive]}>{n}</Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                step === n && { color: palette.stepLabelActive },
              ]}
            >
              {stepLabels[n]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function InboundWizardFooter({
  cancelLabel,
  primaryLabel,
  loading,
  onCancel,
  onPrimary,
  accent = 'emerald',
}: {
  cancelLabel: string;
  primaryLabel: string;
  loading?: boolean;
  onCancel: () => void;
  onPrimary: () => void;
  accent?: WizardAccent;
}) {
  const palette = ACCENT[accent];
  return (
    <View
      style={[
        styles.footer,
        {
          borderTopColor: palette.footerBorder,
          paddingBottom: palette.footerPadBottom,
        },
      ]}
    >
      <Pressable
        style={[
          styles.cancelBtn,
          { borderRadius: palette.cancelRadius },
          loading && { opacity: palette.disabledOpacity },
        ]}
        onPress={onCancel}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={cancelLabel}
      >
        <Text style={[styles.cancelBtnText, { color: palette.cancelText }]}>{cancelLabel}</Text>
      </Pressable>
      <Pressable
        style={[
          styles.nextBtn,
          {
            backgroundColor: palette.nextBg,
            flex: palette.nextFlex,
            borderRadius: palette.nextRadius,
          },
          loading && { opacity: palette.disabledOpacity },
        ]}
        onPress={onPrimary}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
      >
        <Text
          style={[
            styles.nextBtnText,
            {
              color: palette.nextText,
              fontSize: palette.nextFontSize,
              fontWeight: palette.nextFontWeight,
            },
          ]}
        >
          {primaryLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md },
  title: { color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: space.md },
  stepRow: { flexDirection: 'row', gap: space.sm },
  stepItem: { flex: 1, alignItems: 'center', gap: space.xs },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotText: { color: colors.muted, fontWeight: '900', fontSize: 13 },
  stepDotTextActive: { color: colors.white },
  stepLabel: { color: colors.muted2, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: 1,
    backgroundColor: colors.bg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  cancelBtnText: { fontWeight: '800', fontSize: 15 },
  nextBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnText: { fontWeight: '800' },
});
