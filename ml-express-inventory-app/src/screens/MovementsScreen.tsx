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
import {
  formatTimeAgo,
  getLedgerCategoryLabel,
  LEDGER_CATEGORY_STYLE,
  useTranslation,
} from '../i18n';
import { requestAutoCloudSync } from '../services/cloudAutoSync';
import { listFinanceLedger } from '../services/financeLedgerService';
import { syncPlatformInventoryFromCloud } from '../services/inventoryCloudSync';
import { isSupabaseConfigured } from '../services/supabase';
import type { FinanceLedgerEntry, FinanceLedgerResult } from '../types/financeLedger';

type TabKey = 'all' | 'income' | 'transport' | 'ops';

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
  const { t } = useTranslation();
  const style = LEDGER_CATEGORY_STYLE[item.category];
  const when = formatTimeAgo(item.occurredAt, t);

  return (
    <View style={[styles.ledgerRow, { borderLeftColor: style.accent }]}>
      <View style={[styles.iconCircle, { backgroundColor: style.tint }]}>
        <Text style={styles.iconEmoji}>{style.icon}</Text>
      </View>

      <View style={styles.ledgerBody}>
        <View style={styles.ledgerTitleRow}>
          <Text style={styles.ledgerName} numberOfLines={1}>
            {item.itemName || item.barcode}
          </Text>
          <View style={[styles.amountPill, { backgroundColor: style.pillBg }]}>
            <Text style={[styles.amountText, { color: style.accent }]} numberOfLines={1}>
              {item.amountDisplay}
            </Text>
          </View>
        </View>

        <View style={styles.tagRow}>
          <Text style={[styles.typeTag, { color: style.accent, backgroundColor: style.tint }]}>
            {getLedgerCategoryLabel(t, item.category)}
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

function EmptyState({ tab }: { tab: TabKey }) {
  const { t } = useTranslation();
  const hints: Record<TabKey, string> = {
    all: t.movements.emptyAll,
    income: t.movements.emptyIncome,
    transport: t.movements.emptyTransport,
    ops: t.movements.emptyOps,
  };
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>{t.movements.emptyTitle}</Text>
      <Text style={styles.emptyHint}>{hints[tab]}</Text>
    </View>
  );
}

export default function MovementsScreen() {
  const { t } = useTranslation();
  const { store, hubCode } = useAuth();
  const [tab, setTab] = useState<TabKey>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<FinanceLedgerEntry[]>([]);

  const tabs = useMemo(
    (): { key: TabKey; label: string }[] => [
      { key: 'all', label: t.movements.tabAll },
      { key: 'income', label: t.movements.tabIncome },
      { key: 'transport', label: t.movements.tabTransport },
      { key: 'ops', label: t.movements.tabOps },
    ],
    [t],
  );

  const applyLedgerResult = useCallback((result: FinanceLedgerResult) => {
    setEntries(result.entries);
  }, []);

  const load = useCallback(
    async (options?: { awaitSync?: boolean }) => {
      if (!store || !hubCode) {
        setEntries([]);
        setLoading(false);
        return;
      }

      requestAutoCloudSync(store, hubCode, options?.awaitSync ? { force: true } : undefined);

      try {
        const result = await listFinanceLedger(store, hubCode);
        applyLedgerResult(result);
      } finally {
        setLoading(false);
        if (!options?.awaitSync) setRefreshing(false);
      }

      if (!isSupabaseConfigured()) {
        if (options?.awaitSync) setRefreshing(false);
        return;
      }

      const syncAndRefresh = async () => {
        try {
          await syncPlatformInventoryFromCloud(store, hubCode);
          const result = await listFinanceLedger(store, hubCode);
          applyLedgerResult(result);
        } catch {
          // 离线时保留本地流水
        } finally {
          if (options?.awaitSync) setRefreshing(false);
        }
      };

      if (options?.awaitSync) {
        await syncAndRefresh();
      } else {
        void syncAndRefresh();
      }
    },
    [store, hubCode, applyLedgerResult],
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    void load({ awaitSync: true });
  };

  const displayed = useMemo(() => filterByTab(entries, tab), [entries, tab]);

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
        <Text style={styles.emptyTitle}>{t.common.loginStoreFirst}</Text>
      </View>
    );
  }

  const listHeader = (
    <View style={styles.headerBlock}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabScroll}
      >
        {tabs.map((tabItem) => {
          const active = tab === tabItem.key;
          const count = tabCounts[tabItem.key];
          return (
            <Pressable
              key={tabItem.key}
              style={[styles.tab, active && styles.tabOn]}
              onPress={() => setTab(tabItem.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextOn]}>{tabItem.label}</Text>
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
          {tabs.find((tabItem) => tabItem.key === tab)?.label} · {displayed.length}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      {loading && entries.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color="#a78bfa" size="large" />
          <Text style={styles.loadingText}>{t.movements.loading}</Text>
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
