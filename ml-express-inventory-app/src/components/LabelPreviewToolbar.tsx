import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  LABEL_LAYOUT_STEP_DOTS,
  type LabelLayoutAlignH,
  type LabelLayoutAlignV,
} from '../constants/labelBarcodeLayout';
import { useTranslation } from '../i18n';
import type { LabelLayoutTarget } from './LabelPrintPreviewEditor';

type Direction = 'up' | 'down' | 'left' | 'right';

const TARGETS: LabelLayoutTarget[] = ['expressNo', 'barcode', 'inboundCode'];

const TARGET_COLORS: Record<LabelLayoutTarget, string> = {
  expressNo: '#2563eb',
  barcode: '#059669',
  inboundCode: '#d97706',
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

type Props = {
  selectedTarget: LabelLayoutTarget;
  disabled?: boolean;
  onSelectTarget: (target: LabelLayoutTarget) => void;
  onMove: (direction: Direction, deltaDots: number) => void;
  onAlign: (alignment: { horizontal?: LabelLayoutAlignH; vertical?: LabelLayoutAlignV }) => void;
};

export default function LabelPreviewToolbar({
  selectedTarget,
  disabled,
  onSelectTarget,
  onMove,
  onAlign,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const targetLabel = (target: LabelLayoutTarget) =>
    target === 'expressNo'
      ? t.settings.printPreviewExpressNo
      : target === 'barcode'
        ? t.settings.printPreviewBarcode
        : t.settings.printPreviewInboundCode;

  const activeColor = TARGET_COLORS[selectedTarget];

  const press = (direction: Direction) => {
    if (disabled) return;
    onMove(direction, LABEL_LAYOUT_STEP_DOTS);
  };

  return (
    <View style={styles.row}>
      <View style={styles.dropdownWrap}>
        <Pressable
          style={({ pressed }) => [
            styles.trigger,
            { borderColor: activeColor },
            pressed && !disabled && styles.triggerPressed,
            disabled && styles.btnDisabled,
          ]}
          onPress={() => !disabled && setOpen((value) => !value)}
          disabled={disabled}
          accessibilityLabel={targetLabel(selectedTarget)}
        >
          <View style={[styles.triggerDot, { backgroundColor: activeColor }]} />
          <Text style={styles.triggerText} numberOfLines={1}>
            {targetLabel(selectedTarget)}
          </Text>
          <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
        </Pressable>
        {open ? (
          <View style={styles.panel}>
            {TARGETS.map((target) => {
              const active = selectedTarget === target;
              const color = TARGET_COLORS[target];
              return (
                <Pressable
                  key={target}
                  style={[styles.option, active && { backgroundColor: `${color}22` }]}
                  onPress={() => {
                    onSelectTarget(target);
                    setOpen(false);
                  }}
                >
                  <View style={[styles.optionDot, { backgroundColor: color }]} />
                  <Text style={[styles.optionText, active && { color: '#f8fafc' }]}>
                    {targetLabel(target)}
                  </Text>
                  {active ? <Text style={[styles.check, { color }]}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={styles.toolsWrap}>
        <View style={styles.alignGrid}>
          {ALIGN_BUTTONS.map((button) => (
            <Pressable
              key={button.key}
              style={({ pressed }) => [
                styles.alignBtn,
                pressed && !disabled && styles.btnPressed,
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

        <View style={styles.nudgeWrap}>
          <Pressable
            style={({ pressed }) => [
              styles.nudgeBtn,
              pressed && !disabled && styles.btnPressed,
              disabled && styles.btnDisabled,
            ]}
            onPress={() => press('up')}
            disabled={disabled}
            accessibilityLabel={t.settings.printPreviewMoveUp}
          >
            <Text style={styles.nudgeBtnText}>↑</Text>
          </Pressable>
          <View style={styles.nudgeMidRow}>
            <Pressable
              style={({ pressed }) => [
                styles.nudgeBtn,
                pressed && !disabled && styles.btnPressed,
                disabled && styles.btnDisabled,
              ]}
              onPress={() => press('left')}
              disabled={disabled}
              accessibilityLabel={t.settings.printPreviewMoveLeft}
            >
              <Text style={styles.nudgeBtnText}>←</Text>
            </Pressable>
            <View style={styles.centerDot} />
            <Pressable
              style={({ pressed }) => [
                styles.nudgeBtn,
                pressed && !disabled && styles.btnPressed,
                disabled && styles.btnDisabled,
              ]}
              onPress={() => press('right')}
              disabled={disabled}
              accessibilityLabel={t.settings.printPreviewMoveRight}
            >
              <Text style={styles.nudgeBtnText}>→</Text>
            </Pressable>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.nudgeBtn,
              pressed && !disabled && styles.btnPressed,
              disabled && styles.btnDisabled,
            ]}
            onPress={() => press('down')}
            disabled={disabled}
            accessibilityLabel={t.settings.printPreviewMoveDown}
          >
            <Text style={styles.nudgeBtnText}>↓</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const BTN = 24;
const NUDGE = 24;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    gap: 8,
    marginBottom: 8,
  },
  dropdownWrap: {
    width: '38%',
    maxWidth: 148,
    flexShrink: 0,
    zIndex: 2,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    borderRadius: 9,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  triggerPressed: {
    backgroundColor: '#1e293b',
  },
  triggerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  triggerText: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '800',
  },
  chevron: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '900',
  },
  panel: {
    marginTop: 4,
    backgroundColor: '#0f172a',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
  },
  optionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  optionText: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  check: {
    fontSize: 11,
    fontWeight: '900',
  },
  toolsWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    minWidth: 0,
  },
  alignGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    width: BTN * 3 + 6,
    justifyContent: 'center',
  },
  alignBtn: {
    width: BTN,
    height: BTN,
    borderRadius: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alignIcon: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  nudgeWrap: {
    alignItems: 'center',
    gap: 2,
  },
  nudgeMidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  nudgeBtn: {
    width: NUDGE,
    height: NUDGE,
    borderRadius: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    backgroundColor: '#1e293b',
    borderColor: '#475569',
  },
  nudgeBtnText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 14,
  },
  centerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#64748b',
  },
  btnDisabled: { opacity: 0.45 },
});
