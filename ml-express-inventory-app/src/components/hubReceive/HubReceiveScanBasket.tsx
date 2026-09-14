import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../../theme';
import type { TranslationDict } from '../../i18n/translations';
import { fmt } from '../../i18n/format';
import type { HubReceiveScanGroup, HubReceiveScanLine } from '../../utils/hubReceiveScanBasket';

type Props = {
  t: TranslationDict;
  groups: HubReceiveScanGroup[];
  onSignGroup: (group: HubReceiveScanGroup) => void;
  onRemove: (line: HubReceiveScanLine) => void;
  onClear: () => void;
  /** 嵌在相机「已扫」弹层里时去掉外层卡片边距 */
  embedded?: boolean;
};

export function HubReceiveScanBasket({ t, groups, onSignGroup, onRemove, onClear, embedded = false }: Props) {
  const total = groups.reduce((sum, group) => sum + group.lines.length, 0);
  if (total === 0) return null;

  return (
    <View style={[styles.card, embedded && styles.cardEmbedded]}>
      <View style={styles.head}>
        {embedded ? (
          <Text style={[styles.hint, styles.hintEmbedded]}>{t.hubReceive.scanBasketHint}</Text>
        ) : (
          <View>
            <Text style={styles.title}>{t.hubReceive.scanBasketTitle}</Text>
            <Text style={styles.hint}>{t.hubReceive.scanBasketHint}</Text>
          </View>
        )}
        <Pressable onPress={onClear} hitSlop={8} accessibilityRole="button">
          <Text style={styles.clear}>{t.hubReceive.scanBasketClear}</Text>
        </Pressable>
      </View>

      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <View style={styles.groupHead}>
            <View style={styles.groupMeta}>
              <Text style={styles.code}>
                {group.customerCode || t.hubReceive.scanBasketNoCode}
              </Text>
              {group.customerName ? (
                <Text style={styles.name} numberOfLines={1}>
                  {group.customerName}
                </Text>
              ) : null}
            </View>
            {group.signable.length > 0 ? (
              <Pressable
                style={styles.signBtn}
                onPress={() => onSignGroup(group)}
                accessibilityRole="button"
                accessibilityLabel={fmt(t.hubReceive.scanBasketSign, { count: group.signable.length })}
              >
                <Text style={styles.signBtnText}>
                  {fmt(t.hubReceive.scanBasketSign, { count: group.signable.length })}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {group.lines.map((line) => (
            <View key={line.id} style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.barcode} numberOfLines={1}>
                  {line.barcode}
                </Text>
                {line.name ? (
                  <Text style={styles.itemName} numberOfLines={1}>
                    {line.name}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => onRemove(line)} hitSlop={8} accessibilityRole="button">
                <Text style={styles.remove}>{t.hubReceive.scanBasketRemove}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardEmbedded: {
    marginBottom: 0,
    padding: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  title: { color: colors.text, fontSize: 15, fontWeight: '800' },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4, maxWidth: 240 },
  hintEmbedded: { marginTop: 0, maxWidth: undefined, flex: 1 },
  clear: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  group: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 8,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  groupMeta: { flex: 1, minWidth: 0 },
  code: { color: colors.text, fontSize: 15, fontWeight: '800', fontFamily: 'monospace' },
  name: { color: colors.muted, fontSize: 12, marginTop: 2 },
  signBtn: {
    backgroundColor: colors.success,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signBtnText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingVertical: 6,
  },
  rowMain: { flex: 1, minWidth: 0 },
  barcode: { color: colors.accentSkyBright, fontFamily: 'monospace', fontSize: 13, fontWeight: '700' },
  itemName: { color: colors.muted, fontSize: 12, marginTop: 2 },
  remove: { color: colors.dangerSoft, fontWeight: '700', fontSize: 12 },
});
