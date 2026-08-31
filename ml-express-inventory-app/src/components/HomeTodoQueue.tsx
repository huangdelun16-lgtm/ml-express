import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';
import type { TranslationDict } from '../i18n/translations';
import { fmt } from '../i18n/format';
import type { HomeTodoItem, HomeTodoKey } from '../utils/homeTodoQueue';
import { sumHomeTodoCounts } from '../utils/homeTodoQueue';

const TODO_VISUAL: Record<
  HomeTodoKey,
  { icon: string; accent: string; bg: string; border: string }
> = {
  hubArrive: {
    icon: '🚛',
    accent: '#38bdf8',
    bg: 'rgba(14,165,233,0.12)',
    border: 'rgba(56,189,248,0.28)',
  },
  transportFee: {
    icon: '💵',
    accent: '#fbbf24',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(251,191,36,0.28)',
  },
  hubInbound: {
    icon: '📥',
    accent: '#34d399',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(52,211,153,0.28)',
  },
  exceptions: {
    icon: '⚠️',
    accent: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.32)',
  },
  notify: {
    icon: '📲',
    accent: '#4ade80',
    bg: 'rgba(22,163,74,0.12)',
    border: 'rgba(74,222,128,0.28)',
  },
  sign: {
    icon: '✍️',
    accent: '#34d399',
    bg: 'rgba(5,150,105,0.12)',
    border: 'rgba(52,211,153,0.28)',
  },
  pack: {
    icon: '📦',
    accent: '#c4b5fd',
    bg: 'rgba(168,85,247,0.12)',
    border: 'rgba(168,85,247,0.28)',
  },
  truckLoad: {
    icon: '🚚',
    accent: '#f87171',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(248,113,113,0.28)',
  },
};

function todoLabel(t: TranslationDict, key: HomeTodoKey): string {
  switch (key) {
    case 'hubArrive':
      return t.home.todoHubArrive;
    case 'transportFee':
      return t.home.todoTransportFee;
    case 'hubInbound':
      return t.home.todoHubInbound;
    case 'exceptions':
      return t.home.todoExceptions;
    case 'notify':
      return t.home.todoNotify;
    case 'sign':
      return t.home.todoSign;
    case 'pack':
      return t.home.todoPack;
    case 'truckLoad':
      return t.home.todoTruckLoad;
    default:
      return key;
  }
}

type Props = {
  t: TranslationDict;
  items: HomeTodoItem[];
  onOpen: (item: HomeTodoItem) => void;
};

export default function HomeTodoQueue({ t, items, onOpen }: Props) {
  const total = sumHomeTodoCounts(items);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>
            <Text style={styles.headerIcon}>🗂️</Text>
          </View>
          <View style={styles.titleText}>
            <Text style={styles.title}>{t.home.todoTitle}</Text>
            <Text style={styles.hint}>{t.home.todoHint}</Text>
          </View>
        </View>
        {total > 0 ? (
          <View style={styles.totalPill}>
            <Text style={styles.totalText}>{fmt(t.home.todoCount, { count: total })}</Text>
          </View>
        ) : null}
      </View>

      {items.length === 0 ? (
        <Text style={styles.empty}>{t.home.todoEmpty}</Text>
      ) : (
        items.map((item, index) => {
          const visual = TODO_VISUAL[item.key];
          const label = todoLabel(t, item.key);
          return (
            <Pressable
              key={item.key}
              style={({ pressed }) => [
                styles.row,
                index > 0 && styles.rowBorder,
                pressed && styles.rowPressed,
              ]}
              onPress={() => onOpen(item)}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${item.count}`}
            >
              <View style={[styles.rowIcon, { backgroundColor: visual.bg, borderColor: visual.border }]}>
                <Text style={styles.rowEmoji}>{visual.icon}</Text>
              </View>
              <Text style={styles.rowLabel} numberOfLines={1}>
                {label}
              </Text>
              <View style={[styles.countPill, { backgroundColor: visual.bg }]}>
                <Text style={[styles.countText, { color: visual.accent }]}>{item.count}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.22)',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: { fontSize: 18 },
  titleText: { flex: 1 },
  title: { color: '#f8fafc', fontSize: 17, fontWeight: '900' },
  hint: { color: '#64748b', fontSize: 12, marginTop: 2 },
  totalPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.16)',
  },
  totalText: { color: '#fbbf24', fontSize: 12, fontWeight: '900' },
  empty: { color: '#64748b', fontSize: 13, lineHeight: 20, marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  rowPressed: { opacity: 0.82 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rowEmoji: { fontSize: 16 },
  rowLabel: { flex: 1, color: '#e2e8f0', fontSize: 15, fontWeight: '800' },
  countPill: {
    minWidth: 32,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  countText: { fontSize: 14, fontWeight: '900' },
  chevron: { color: '#64748b', fontSize: 22, fontWeight: '600', marginTop: -2 },
});
