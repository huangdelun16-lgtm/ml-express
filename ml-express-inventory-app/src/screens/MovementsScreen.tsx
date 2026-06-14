import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { listFinanceLedger } from '../services/financeLedgerService';
import type { FinanceLedgerCategory, FinanceLedgerEntry } from '../types/financeLedger';

type TabKey = 'all' | 'income' | 'transport' | 'ops';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'income', label: '订单收入' },
  { key: 'transport', label: '运输成本' },
  { key: 'ops', label: '操作记录' },
];

type CategoryMeta = {
  icon: string;
  accent: string;
  tint: string;
  pillBg: string;
  shortLabel: string;
};

const CATEGORY_META: Record<FinanceLedgerCategory, CategoryMeta> = {
  order_income_cod: {
    icon: '💵',
    accent: '#34d399',
    tint: 'rgba(52,211,153,0.12)',
    pillBg: 'rgba(52,211,153,0.18)',
    shortLabel: '到付待收',
  },
  order_prepaid: {
    icon: '✓',
    accent: '#60a5fa',
    tint: 'rgba(96,165,250,0.12)',
    pillBg: 'rgba(96,165,250,0.18)',
    shortLabel: '已付款',
  },
  order_collected: {
    icon: '✅',
    accent: '#2dd4bf',
    tint: 'rgba(45,212,191,0.12)',
    pillBg: 'rgba(45,212,191,0.18)',
    shortLabel: '已签收',
  },
  transport_cost: {
    icon: '🚚',
    accent: '#f87171',
    tint: 'rgba(248,113,113,0.12)',
    pillBg: 'rgba(248,113,113,0.18)',
    shortLabel: '车费',
  },
  stock_op: {
    icon: '📋',
    accent: '#94a3b8',
    tint: 'rgba(148,163,184,0.1)',
    pillBg: 'rgba(148,163,184,0.15)',
    shortLabel: '操作',
  },
};

function formatMmk(n: number): string {
  if (n <= 0) return '0';
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function formatMmkWithUnit(n: number): string {
  return `${formatMmk(n)} MMK`;
}

function formatWhen(iso: string): { primary: string; secondary: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { primary: iso, secondary: '' };
  }
  const now = new Date();
  const pad = (x: number) => String(x).padStart(2, '0');
  const full = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return { primary: '刚刚', secondary: full };
  if (diffMin < 60) return { primary: `${diffMin} 分钟前`, secondary: full };
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return { primary: `${diffHr} 小时前`, secondary: full };
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return { primary: `${diffDay} 天前`, secondary: full };
  return { primary: full, secondary: '' };
}

function filterByTab(entries: FinanceLedgerEntry[], tab: TabKey): FinanceLedgerEntry[] {
  if (tab === 'all') return entries;
  if (tab === 'income') {
    return entries.filter(
      (e) =>
        e.category === 'order_income_cod' ||
        e.category === 'order_prepaid' ||
        e.category === 'order_collected',
    );
  }
  if (tab === 'transport') {
    return entries.filter((e) => e.category === 'transport_cost');
  }
  return entries.filter((e) => e.category === 'stock_op');
}

function countForTab(entries: FinanceLedgerEntry[], tab: TabKey): number {
  return filterByTab(entries, tab).length;
}

function LedgerRow({ item }: { item: FinanceLedgerEntry }) {
  const meta = CATEGORY_META[item.category];
  const when = formatWhen(item.occurredAt);

  return (
    <View style={[styles.ledgerRow, { borderLeftColor: meta.accent }]}>
      <View style={[styles.iconCircle, { backgroundColor: meta.tint }]}>
        <Text style={styles.iconEmoji}>{meta.icon}</Text>
      </View>

      <View style={styles.ledgerBody}>
        <View style={styles.ledgerTitleRow}>
          <Text style={styles.ledgerName} numberOfLines={1}>
            {item.itemName || item.barcode}
          </Text>
          <View style={[styles.amountPill, { backgroundColor: meta.pillBg }]}>
            <Text style={[styles.amountText, { color: meta.accent }]} numberOfLines={1}>
              {item.amountDisplay}
            </Text>
          </View>
        </View>

        <View style={styles.tagRow}>
          <Text style={[styles.typeTag, { color: meta.accent, backgroundColor: meta.tint }]}>
            {meta.shortLabel}
          </Text>
          {item.destination ? (
            <Text style={styles.destTag}>→ {item.destination}</Text>
          ) : null}
        </View>

        {item.subtitle ? (
          <Text style={styles.ledgerSubtitle} numberOfLines={2}>{item.subtitle}</Text>
        ) : null}

        <View style={styles.metaRow}>
          <Text style={styles.metaTime}>{when.primary}</Text>
          {when.secondary ? <Text style={styles.metaDot}>·</Text> : null}
          <Text style={styles.metaBarcode} numberOfLines={1}>{item.barcode}</Text>
        </View>
      </View>
    </View>
  );
}

function SummaryStat({
  label,
  value,
  prefix,
  accent,
  icon,
}: {
  label: string;
  value: string;
  prefix?: string;
  accent: string;
  icon: string;
}) {
  return (
    <View style={[styles.statCard, { borderColor: accent }]}>
      <View style={styles.statTop}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={[styles.statLabel, { color: accent }]}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: accent }]}>
        {prefix}{value}
      </Text>
    </View>
  );
}

function EmptyState({ tab }: { tab: TabKey }) {
  const hints: Record<TabKey, string> = {
    all: '入库、装车、到站后会产生财务与操作记录',
    income: '外站发往本站的到付/预付订单会显示在这里',
    transport: '发往本站的装车车费会记为运输成本',
    ops: '入库、出库等库存操作记录',
  };
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>暂无记录</Text>
      <Text style={styles.emptyHint}>{hints[tab]}</Text>
    </View>
  );
}

export default function MovementsScreen() {
  const { store, hubCode, operatorName } = useAuth();
  const [tab, setTab] = useState<TabKey>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<FinanceLedgerEntry[]>([]);
  const [summary, setSummary] = useState({
    codPendingTotal: 0,
    collectedTotal: 0,
    transportCostTotal: 0,
  });

  const load = useCallback(async () => {
    if (!store || !hubCode) {
      setEntries([]);
      setLoading(false);
      return;
    }
    try {
      const result = await listFinanceLedger(store, hubCode);
      setEntries(result.entries);
      setSummary(result.summary);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [store, hubCode]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const displayed = useMemo(() => filterByTab(entries, tab), [entries, tab]);

  const netEstimate = useMemo(
    () => summary.codPendingTotal + summary.collectedTotal - summary.transportCostTotal,
    [summary],
  );

  const tabCounts = useMemo(
    () => ({
      all: countForTab(entries, 'all'),
      income: countForTab(entries, 'income'),
      transport: countForTab(entries, 'transport'),
      ops: countForTab(entries, 'ops'),
    }),
    [entries],
  );

  if (!store || !hubCode) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🔐</Text>
        <Text style={styles.emptyTitle}>请先登录店铺账号</Text>
      </View>
    );
  }

  const listHeader = (
    <View style={styles.headerBlock}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>财务流水</Text>
            <Text style={styles.heroHub}>
              {operatorName ?? '本站'} · 区域 {hubCode}
            </Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{displayed.length} 条</Text>
          </View>
        </View>

        <View style={styles.netRow}>
          <Text style={styles.netLabel}>预估结余</Text>
          <Text
            style={[
              styles.netValue,
              netEstimate >= 0 ? styles.netPositive : styles.netNegative,
            ]}
          >
            {netEstimate >= 0 ? '+' : '−'}{formatMmkWithUnit(Math.abs(netEstimate))}
          </Text>
          <Text style={styles.netHint}>待收 + 已收 − 运输成本</Text>
        </View>

        <View style={styles.statsGrid}>
          <SummaryStat
            label="到付待收"
            value={formatMmk(summary.codPendingTotal)}
            prefix="+"
            accent="#34d399"
            icon="💵"
          />
          <SummaryStat
            label="已付款/已收"
            value={formatMmk(summary.collectedTotal)}
            accent="#60a5fa"
            icon="✓"
          />
          <SummaryStat
            label="运输成本"
            value={formatMmk(summary.transportCostTotal)}
            prefix="−"
            accent="#f87171"
            icon="🚚"
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabScroll}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          const count = tabCounts[t.key];
          return (
            <Pressable
              key={t.key}
              style={[styles.tab, active && styles.tabOn]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextOn]}>{t.label}</Text>
              {count > 0 ? (
                <View style={[styles.tabCount, active && styles.tabCountOn]}>
                  <Text style={[styles.tabCountText, active && styles.tabCountTextOn]}>
                    {count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {!loading && displayed.length > 0 ? (
        <Text style={styles.sectionTitle}>
          {TABS.find((t) => t.key === tab)?.label} · {displayed.length}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      {loading && entries.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color="#a78bfa" size="large" />
          <Text style={styles.loadingText}>正在汇总流水…</Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={!loading ? <EmptyState tab={tab} /> : null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#a78bfa"
              colors={['#7c3aed']}
            />
          }
          renderItem={({ item }) => <LedgerRow item={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { color: '#94a3b8', marginTop: 14, fontSize: 14, fontWeight: '600' },
  headerBlock: { paddingTop: 4 },
  heroCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(124,58,237,0.22)',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heroLabel: { color: '#f8fafc', fontSize: 20, fontWeight: '900' },
  heroHub: { color: '#94a3b8', fontSize: 13, marginTop: 4, fontWeight: '600' },
  heroBadge: {
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)',
  },
  heroBadgeText: { color: '#c4b5fd', fontSize: 12, fontWeight: '800' },
  netRow: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  netLabel: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  netValue: { fontSize: 26, fontWeight: '900', marginTop: 4 },
  netPositive: { color: '#fbbf24' },
  netNegative: { color: '#f87171' },
  netHint: { color: '#475569', fontSize: 11, marginTop: 6 },
  statsGrid: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  statIcon: { fontSize: 12 },
  statLabel: { fontSize: 10, fontWeight: '800' },
  statValue: { fontSize: 15, fontWeight: '900' },
  tabScroll: {
    paddingBottom: 10,
    gap: 8,
    flexDirection: 'row',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabOn: {
    backgroundColor: '#5b21b6',
    borderColor: '#7c3aed',
  },
  tabText: { color: '#94a3b8', fontSize: 13, fontWeight: '800' },
  tabTextOn: { color: '#f8fafc' },
  tabCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabCountOn: { backgroundColor: 'rgba(255,255,255,0.22)' },
  tabCountText: { color: '#94a3b8', fontSize: 11, fontWeight: '900' },
  tabCountTextOn: { color: '#fff' },
  sectionTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 2,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    borderLeftWidth: 4,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 18 },
  ledgerBody: { flex: 1, minWidth: 0 },
  ledgerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  ledgerName: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  amountPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '48%',
  },
  amountText: { fontSize: 12, fontWeight: '900' },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  typeTag: {
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  destTag: { color: '#38bdf8', fontSize: 11, fontWeight: '700' },
  ledgerSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  metaTime: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  metaDot: { color: '#475569', fontSize: 11 },
  metaBarcode: {
    flex: 1,
    color: '#475569',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { color: '#e2e8f0', fontSize: 17, fontWeight: '800' },
  emptyHint: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
});
