import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  formatBulkHeadline,
  shouldClaimBulkBarPan,
  shouldCloseBulkBar,
  type BulkSelectionSummary,
} from '../utils/merchantBulkBar';

export type MerchantBulkBarLabels = {
  manage: string;
  selectAll: string;
  unselectAll: string;
  on: string;
  off: string;
  price: string;
  discount: string;
  hide: string;
  itemsUnit: string;
  onSale: string;
  offSale: string;
};

type Props = {
  open: boolean;
  summary: BulkSelectionSummary;
  loading: boolean;
  bottomInset: number;
  labels: MerchantBulkBarLabels;
  onOpen: () => void;
  onClose: () => void;
  onSelectAll: () => void;
  onList: () => void;
  onUnlist: () => void;
  onPrice: () => void;
  onDiscount: () => void;
};

const ACTION_TONES = {
  on: { disc: '#d1fae5', icon: '#047857', wash: '#ecfdf5', border: 'rgba(16,185,129,0.2)' },
  off: { disc: '#e2e8f0', icon: '#475569', wash: '#f8fafc', border: 'rgba(15,23,42,0.08)' },
  price: { disc: '#dbeafe', icon: '#1d4ed8', wash: '#eff6ff', border: 'rgba(37,99,235,0.18)' },
  discount: { disc: '#fde68a', icon: '#b45309', wash: '#fffbeb', border: 'rgba(217,119,6,0.2)' },
} as const;

export default function MerchantBulkBar({
  open,
  summary,
  loading,
  bottomInset,
  labels,
  onOpen,
  onClose,
  onSelectAll,
  onList,
  onUnlist,
  onPrice,
  onDiscount,
}: Props) {
  const translateY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const actions = useMemo(
    () => [
      { key: 'on' as const, label: labels.on, icon: 'storefront-outline' as const, onPress: onList },
      { key: 'off' as const, label: labels.off, icon: 'pause-circle-outline' as const, onPress: onUnlist },
      { key: 'price' as const, label: labels.price, icon: 'pricetag-outline' as const, onPress: onPrice },
      { key: 'discount' as const, label: labels.discount, icon: 'pricetags-outline' as const, onPress: onDiscount },
    ],
    [labels.discount, labels.off, labels.on, labels.price, onDiscount, onList, onPrice, onUnlist],
  );

  useEffect(() => {
    if (!open) {
      translateY.setValue(0);
      return;
    }
    translateY.setValue(36);
    Animated.spring(translateY, {
      toValue: 0,
      damping: 22,
      stiffness: 280,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [open, translateY]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => shouldClaimBulkBarPan(gesture.dx, gesture.dy),
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        shouldClaimBulkBarPan(gesture.dx, gesture.dy, true),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (shouldCloseBulkBar(gesture.dy, gesture.vy)) {
          Animated.timing(translateY, {
            toValue: 240,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onCloseRef.current();
          });
          return;
        }
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 280,
          mass: 0.7,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  const padBottom = Math.max(bottomInset, 12) + 8;
  const actionsOn = summary.actionsEnabled && !loading;

  if (!open) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={labels.manage}
        onPress={onOpen}
        style={({ pressed }) => [
          styles.fabWrap,
          { bottom: Math.max(bottomInset, 10) + 8, opacity: pressed ? 0.88 : 1 },
        ]}
      >
        <LinearGradient colors={['#1e3a8a', '#2563eb']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
          <Ionicons name="layers-outline" size={18} color="#ffffff" />
          <Text style={styles.fabText}>{labels.manage}</Text>
          {summary.selected > 0 ? (
            <View style={styles.fabBadge}>
              <Text style={styles.fabBadgeText}>{summary.selected}</Text>
            </View>
          ) : null}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Animated.View
      style={[styles.sheet, { paddingBottom: padBottom, transform: [{ translateY }] }]}
    >
      <View {...pan.panHandlers}>
        <View style={styles.handleHit}>
          <View style={styles.handle} />
        </View>
        <View style={styles.island}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={summary.allSelected ? labels.unselectAll : labels.selectAll}
            disabled={summary.total === 0}
            onPress={onSelectAll}
            style={({ pressed }) => [
              styles.selectPill,
              summary.allSelected ? styles.selectPillOn : styles.selectPillOff,
              (pressed || summary.total === 0) && { opacity: 0.82 },
            ]}
          >
            <View style={[styles.selectMark, summary.allSelected && styles.selectMarkOn]}>
              {summary.allSelected ? <Ionicons name="checkmark" size={13} color="#ffffff" /> : null}
            </View>
            <Text style={[styles.selectText, summary.allSelected && styles.selectTextOn]} numberOfLines={1}>
              {summary.allSelected ? labels.unselectAll : labels.selectAll}
            </Text>
          </Pressable>

          <View style={styles.countBlock} accessibilityRole="text">
            <Text style={styles.countValue}>{formatBulkHeadline(summary.selected, summary.total)}</Text>
            <Text style={styles.countUnit} numberOfLines={1}>
              {labels.itemsUnit}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={labels.hide}
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="chevron-down" size={18} color="#1d4ed8" />
          </Pressable>
        </View>

        {summary.selected > 0 ? (
          <View style={styles.chipRow}>
            <View style={[styles.chip, styles.chipOn]}>
              <View style={styles.chipDotOn} />
              <Text style={styles.chipTextOn}>
                {summary.availableCount} {labels.onSale}
              </Text>
            </View>
            <View style={[styles.chip, styles.chipOff]}>
              <View style={styles.chipDotOff} />
              <Text style={styles.chipTextOff}>
                {summary.unavailableCount} {labels.offSale}
              </Text>
            </View>
            {loading ? <ActivityIndicator size="small" color="#1d4ed8" /> : null}
          </View>
        ) : (
          <View style={styles.chipRow} />
        )}
      </View>

      <View style={styles.actions}>
        {actions.map((action) => {
          const tone = ACTION_TONES[action.key];
          return (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              accessibilityState={{ disabled: !actionsOn }}
              disabled={!actionsOn}
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.action,
                {
                  backgroundColor: tone.wash,
                  borderColor: tone.border,
                  opacity: actionsOn ? (pressed ? 0.86 : 1) : 0.38,
                },
              ]}
            >
              <View style={[styles.actionDisc, { backgroundColor: tone.disc }]}>
                <Ionicons name={action.icon} size={18} color={tone.icon} />
              </View>
              <Text
                style={[styles.actionLabel, { color: tone.icon }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {action.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    right: 16,
  },
  fab: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  fabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  fabBadgeText: {
    color: '#1e3a8a',
    fontSize: 11,
    fontWeight: '900',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingTop: 4,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(226, 232, 240, 0.95)',
  },
  handleHit: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },
  island: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 18,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 6,
    gap: 8,
  },
  selectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingLeft: 7,
    paddingRight: 12,
    borderRadius: 14,
    maxWidth: 128,
  },
  selectPillOff: {
    backgroundColor: '#1d4ed8',
  },
  selectPillOn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  selectMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectMarkOn: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  selectText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '800',
  },
  selectTextOn: {
    color: '#1d4ed8',
  },
  countBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
    minWidth: 0,
  },
  countValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  countUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 4,
    minHeight: 28,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipOn: {
    backgroundColor: '#ecfdf5',
  },
  chipOff: {
    backgroundColor: '#f1f5f9',
  },
  chipDotOn: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  chipDotOff: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94a3b8',
  },
  chipTextOn: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  chipTextOff: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
  },
  action: {
    flex: 1,
    minHeight: 76,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 6,
  },
  actionDisc: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
});
