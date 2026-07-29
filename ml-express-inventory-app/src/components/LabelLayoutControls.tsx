import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  LABEL_LAYOUT_STEP_DOTS,
  type LabelLayoutAlignH,
  type LabelLayoutAlignV,
} from '../constants/labelBarcodeLayout';
import { useTranslation } from '../i18n';
import type { LabelLayoutTarget } from './LabelPrintPreviewEditor';

type Direction = 'up' | 'down' | 'left' | 'right';

type Props = {
  selectedTarget: LabelLayoutTarget;
  disabled?: boolean;
  onMove: (direction: Direction, deltaDots: number) => void;
  onAlign: (alignment: { horizontal?: LabelLayoutAlignH; vertical?: LabelLayoutAlignV }) => void;
  onCenterText: () => void;
  onMergeCenter: () => void;
};

type AlignButton = {
  key: string;
  icon: string;
  labelKey:
    | 'printPreviewAlignTop'
    | 'printPreviewAlignMiddle'
    | 'printPreviewAlignBottom'
    | 'printPreviewAlignLeft'
    | 'printPreviewAlignCenter'
    | 'printPreviewAlignRight';
  horizontal?: LabelLayoutAlignH;
  vertical?: LabelLayoutAlignV;
};

const ALIGN_BUTTONS: AlignButton[] = [
  { key: 'top', icon: '⤒', labelKey: 'printPreviewAlignTop', vertical: 'top' },
  { key: 'middle', icon: '☰', labelKey: 'printPreviewAlignMiddle', vertical: 'middle' },
  { key: 'bottom', icon: '⤓', labelKey: 'printPreviewAlignBottom', vertical: 'bottom' },
  { key: 'left', icon: '⤉', labelKey: 'printPreviewAlignLeft', horizontal: 'left' },
  { key: 'center', icon: '◎', labelKey: 'printPreviewAlignCenter', horizontal: 'center' },
  { key: 'right', icon: '⤈', labelKey: 'printPreviewAlignRight', horizontal: 'right' },
];

export default function LabelLayoutControls({
  selectedTarget,
  disabled,
  onMove,
  onAlign,
  onCenterText,
  onMergeCenter,
}: Props) {
  const { t } = useTranslation();

  const targetLabel =
    selectedTarget === 'expressNo'
      ? t.settings.printPreviewExpressNo
      : selectedTarget === 'barcode'
        ? t.settings.printPreviewBarcode
        : t.settings.printPreviewInboundCode;

  const press = (direction: Direction) => {
    if (disabled) return;
    onMove(direction, LABEL_LAYOUT_STEP_DOTS);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.targetBadge}>
          <Text style={styles.targetBadgeText}>{targetLabel}</Text>
        </View>
        <View style={styles.quickActions}>
          <Pressable
            style={[styles.actionChip, disabled && styles.btnDisabled]}
            onPress={onCenterText}
            disabled={disabled}
            accessibilityLabel={t.settings.printPreviewCenterText}
          >
            <Text style={styles.actionChipText}>{t.settings.printPreviewCenterText}</Text>
          </Pressable>
          <Pressable
            style={[styles.actionChip, styles.actionChipPrimary, disabled && styles.btnDisabled]}
            onPress={onMergeCenter}
            disabled={disabled}
            accessibilityLabel={t.settings.printPreviewMergeCenter}
          >
            <Text style={[styles.actionChipText, styles.actionChipPrimaryText]}>
              {t.settings.printPreviewMergeCenter}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.toolStrip}>
        <View style={styles.block}>
          <Text style={styles.microLabel}>{t.settings.printPreviewAlignTitle}</Text>
          <View style={styles.alignGrid}>
            {ALIGN_BUTTONS.map((button) => (
              <Pressable
                key={button.key}
                style={({ pressed }) => [
                  styles.toolBtn,
                  pressed && !disabled && styles.toolBtnPressed,
                  disabled && styles.btnDisabled,
                ]}
                onPress={() => onAlign({ horizontal: button.horizontal, vertical: button.vertical })}
                disabled={disabled}
                accessibilityLabel={t.settings[button.labelKey]}
              >
                <Text style={styles.alignIcon}>{button.icon}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.block}>
          <Text style={styles.microLabel}>{t.settings.printPreviewMovePadCaption}</Text>
          <View style={styles.pad}>
            <Pressable
              style={({ pressed }) => [
                styles.toolBtn,
                pressed && !disabled && styles.toolBtnPressed,
                disabled && styles.btnDisabled,
              ]}
              onPress={() => press('up')}
              disabled={disabled}
              accessibilityLabel={t.settings.printPreviewMoveUp}
            >
              <Text style={styles.padBtnText}>↑</Text>
            </Pressable>
            <View style={styles.midRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.toolBtn,
                  pressed && !disabled && styles.toolBtnPressed,
                  disabled && styles.btnDisabled,
                ]}
                onPress={() => press('left')}
                disabled={disabled}
                accessibilityLabel={t.settings.printPreviewMoveLeft}
              >
                <Text style={styles.padBtnText}>←</Text>
              </Pressable>
              <View style={styles.centerDot} />
              <Pressable
                style={({ pressed }) => [
                  styles.toolBtn,
                  pressed && !disabled && styles.toolBtnPressed,
                  disabled && styles.btnDisabled,
                ]}
                onPress={() => press('right')}
                disabled={disabled}
                accessibilityLabel={t.settings.printPreviewMoveRight}
              >
                <Text style={styles.padBtnText}>→</Text>
              </Pressable>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.toolBtn,
                pressed && !disabled && styles.toolBtnPressed,
                disabled && styles.btnDisabled,
              ]}
              onPress={() => press('down')}
              disabled={disabled}
              accessibilityLabel={t.settings.printPreviewMoveDown}
            >
              <Text style={styles.padBtnText}>↓</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const BTN = 34;

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  quickActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
  },
  targetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 2,
  },
  targetBadgeText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '800',
  },
  actionChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#151f31',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionChipPrimary: {
    backgroundColor: 'rgba(2,132,199,0.12)',
    borderColor: 'rgba(56,189,248,0.35)',
  },
  actionChipText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  actionChipPrimaryText: {
    color: '#7dd3fc',
  },
  toolStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1220',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  block: {
    alignItems: 'center',
    minWidth: 112,
  },
  microLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  alignGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    width: BTN * 3 + 8,
    justifyContent: 'center',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  pad: {
    alignItems: 'center',
    gap: 3,
  },
  midRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toolBtn: {
    width: BTN,
    height: BTN,
    borderRadius: 8,
    backgroundColor: '#151f31',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnPressed: {
    backgroundColor: '#1e293b',
    borderColor: '#475569',
  },
  btnDisabled: { opacity: 0.45 },
  alignIcon: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  padBtnText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  centerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#475569',
  },
});
