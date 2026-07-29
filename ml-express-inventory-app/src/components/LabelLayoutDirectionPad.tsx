import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LABEL_LAYOUT_STEP_DOTS } from '../constants/labelBarcodeLayout';
import { useTranslation } from '../i18n';
import type { LabelLayoutTarget } from './LabelPrintPreviewEditor';

type Direction = 'up' | 'down' | 'left' | 'right';

type Props = {
  selectedTarget: LabelLayoutTarget;
  disabled?: boolean;
  onMove: (direction: Direction, deltaDots: number) => void;
};

export default function LabelLayoutDirectionPad({
  selectedTarget,
  disabled,
  onMove,
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
      <Text style={styles.caption}>
        {t.settings.printPreviewMovePadCaption}: {targetLabel}
      </Text>
      <View style={styles.pad}>
        <Pressable
          style={[styles.btn, styles.btnTop, disabled && styles.btnDisabled]}
          onPress={() => press('up')}
          disabled={disabled}
          accessibilityLabel={t.settings.printPreviewMoveUp}
        >
          <Text style={styles.btnText}>↑</Text>
        </Pressable>
        <View style={styles.midRow}>
          <Pressable
            style={[styles.btn, disabled && styles.btnDisabled]}
            onPress={() => press('left')}
            disabled={disabled}
            accessibilityLabel={t.settings.printPreviewMoveLeft}
          >
            <Text style={styles.btnText}>←</Text>
          </Pressable>
          <View style={styles.centerDot} />
          <Pressable
            style={[styles.btn, disabled && styles.btnDisabled]}
            onPress={() => press('right')}
            disabled={disabled}
            accessibilityLabel={t.settings.printPreviewMoveRight}
          >
            <Text style={styles.btnText}>→</Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.btn, styles.btnBottom, disabled && styles.btnDisabled]}
          onPress={() => press('down')}
          disabled={disabled}
          accessibilityLabel={t.settings.printPreviewMoveDown}
        >
          <Text style={styles.btnText}>↓</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    alignItems: 'center',
  },
  caption: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  pad: {
    alignItems: 'center',
    gap: 6,
  },
  midRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  btn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTop: { marginBottom: 2 },
  btnBottom: { marginTop: 2 },
  btnDisabled: { opacity: 0.45 },
  btnText: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  centerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#334155',
  },
});
