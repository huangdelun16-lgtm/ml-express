import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  formatTimeAgo,
  getCrossBorderCategoryLabel,
  getLedgerAmountDisplay,
  LEDGER_CATEGORY_STYLE,
  useTranslation,
} from '../i18n';
import { requestAutoCloudSync } from '../services/cloudAutoSync';
import { listCrossBorderFinance } from '../services/financeLedgerService';
import { syncPlatformInventoryFromCloud } from '../services/inventoryCloudSync';
import { isSupabaseConfigured } from '../services/supabase';
import type { FinanceLedgerCategory, FinanceLedgerEntry, FinanceLedgerResult } from '../types/financeLedger';
import { ownershipKeyFromStoreCode } from '../utils/storeOwnership';
import { regionDisplayLabel } from '../constants/destinationOptions';
import CrossBorderManualEntryModal from '../components/CrossBorderManualEntryModal';
import type { RootStackParamList } from '../navigation/AppNavigator';

type TabKey = 'all' | 'transport' | 'agency' | 'pending' | 'manual';
type FinanceRoute = RouteProp<RootStackParamList, 'CrossBorderFinance'>;

function formatMmk(n: number): string {
  if (n <= 0) return '0';
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function formatMmkWithUnit(n: number): string {
  return `${formatMmk(n)} MMK`;
}

function isAgencyEntry(entry: FinanceLedgerEntry, currentKey: string): boolean {
  const originKey = String(entry.originKey || '').trim();
  if (!originKey || originKey === currentKey) return false;
  return entry.category === 'order_collected' || entry.category === 'order_prepaid';
}

function isCrossStationCodPending(entry: FinanceLedgerEntry, currentKey: string): boolean {
  if (entry.category !== 'order_income_cod') return false;
  const originKey = String(entry.originKey || '').trim();
  return Boolean(originKey && originKey !== currentKey);
}

function filterByTab(
  entries: FinanceLedgerEntry[],
  tab: TabKey,
  currentKey: string,
): FinanceLedgerEntry[] {
  if (tab === 'all') return entries;
  if (tab === 'transport') {
    return entries.filter(
      (e) => e.category === 'transport_cost' && e.transportDirection !== 'outbound',
    );
  }
  if (tab === 'agency') return entries.filter((e) => isAgencyEntry(e, currentKey));
  if (tab === 'pending') {
    return entries.filter((e) => isCrossStationCodPending(e, currentKey));
  }
  return entries.filter(
    (e) => e.category === 'manual_income' || e.category === 'manual_expense',
  );
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
            {item.itemName || item.barcode || item.title}
          </Text>
          <View style={[styles.amountPill, { backgroundColor: style.pillBg }]}>
            <Text style={[styles.amountText, { color: style.accent }]} numberOfLines={1}>
              {getLedgerAmountDisplay(t, item)}
            </Text>
          </View>
        </View>
        <View style={styles.tagRow}>
          <Text style={[styles.typeTag, { color: style.accent, backgroundColor: style.tint }]}>
            {getCrossBorderCategoryLabel(t, item.category)}
          </Text>
          {item.destination ? <Text style={styles.destTag}>→ {regionDisplayLabel(item.destination)}</Text> : null}
        </View>
        {item.subtitle ? (
          <Text style={styles.ledgerSubtitle} numberOfLines={2}>{item.subtitle}</Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={styles.metaTime}>{when.primary}</Text>
          {item.barcode ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaBarcode} numberOfLines={1}>{item.barcode}</Text>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function SummaryBar({
  label,
  value,
  prefix,
  accent,
  icon,
  tint,
}: {
  label: string;
  value: string;
  prefix?: string;
  accent: string;
  icon: string;
  tint: string;
}) {
  return (
    <View style={[styles.statBar, { borderColor: accent, backgroundColor: tint }]}>
      <View style={[styles.statBarIconWrap, { backgroundColor: `${accent}22` }]}>
        <Text style={styles.statBarIcon}>{icon}</Text>
      </View>
      <Text style={styles.statBarLabel}>{label}</Text>
      <Text style={[styles.statBarValue, { color: accent }]} numberOfLines={1}>
        {prefix}{value}
        <Text style={styles.statBarUnit}> MMK</Text>
      </Text>
    </View>
  );
}

export default function CrossBorderFinanceScreen() {
  const { t, fmt } = useTranslation();
  const route = useRoute<FinanceRoute>();
  const { store, hubCode, operatorName } = useAuth();
  const [tab, setTab] = useState<TabKey>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<FinanceLedgerEntry[]>([]);
  const [summary, setSummary] = useState({
    collectedTotal: 0,
    transportUnpaidTotal: 0,
    transportPaidTotal: 0,
    pendingInflowTotal: 0,
    agencyPayableTotal: 0,
    manualIncomeTotal: 0,
    manualExpenseTotal: 0,
  });
  const [manualModalVisible, setManualModalVisible] = useState(false);

  const tabs = useMemo(
    (): { key: TabKey; label: string }[] => [
      { key: 'all', label: t.crossBorderFinance.tabAll },
      { key: 'transport', label: t.crossBorderFinance.tabTransport },
      { key: 'agency', label: t.crossBorderFinance.tabAgency },
      { key: 'pending', label: t.crossBorderFinance.tabPending },
      { key: 'manual', label: t.crossBorderFinance.tabManual },
    ],
    [t],
  );

  const currentKey = store ? ownershipKeyFromStoreCode(store.storeCode) : '';

  useEffect(() => {
    const initial = route.params?.initialTab;
    if (initial) setTab(initial);
  }, [route.params?.initialTab]);

  const applyFinanceResult = useCallback((result: FinanceLedgerResult) => {
    setEntries(result.entries);
    setSummary({
      collectedTotal: result.summary.collectedTotal,
      transportUnpaidTotal: result.summary.transportUnpaidTotal,
      transportPaidTotal: result.summary.transportPaidTotal,
      pendingInflowTotal: result.summary.pendingInflowTotal,
      agencyPayableTotal: result.summary.agencyPayableTotal,
      manualIncomeTotal: result.summary.manualIncomeTotal ?? 0,
      manualExpenseTotal: result.summary.manualExpenseTotal ?? 0,
    });
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
        const result = await listCrossBorderFinance(store, hubCode);
        applyFinanceResult(result);
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
          const result = await listCrossBorderFinance(store, hubCode);
          applyFinanceResult(result);
        } catch {
          // offline: keep local data
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
    [store, hubCode, applyFinanceResult],
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

  const displayed = useMemo(
    () => filterByTab(entries, tab, currentKey),
    [entries, tab, currentKey],
  );

  const netBalance = useMemo(
    () =>
      summary.collectedTotal +
      summary.manualIncomeTotal -
      summary.transportPaidTotal -
      summary.manualExpenseTotal,
    [summary],
  );

  const tabCounts = useMemo(
    () => ({
      all: entries.length,
      transport: filterByTab(entries, 'transport', currentKey).length,
      agency: filterByTab(entries, 'agency', currentKey).length,
      pending: filterByTab(entries, 'pending', currentKey).length,
      manual: filterByTab(entries, 'manual', currentKey).length,
    }),
    [entries, currentKey],
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
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroTitleBlock}>
            <Text style={styles.heroLabel}>{t.crossBorderFinance.title}</Text>
            <Text style={styles.heroHub}>
              {fmt(t.crossBorderFinance.heroHub, {
                name: operatorName ?? t.common.thisStation,
                hub: regionDisplayLabel(hubCode),
              })}
            </Text>
          </View>
          <View style={styles.heroActions}>
            <Pressable
              style={styles.addManualBtn}
              onPress={() => setManualModalVisible(true)}
            >
              <Text style={styles.addManualBtnText}>{t.crossBorderFinance.addManual}</Text>
            </Pressable>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {fmt(t.common.recordsCount, { count: displayed.length })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.netRow}>
          <Text style={styles.netLabel}>{t.crossBorderFinance.balance}</Text>
          <Text
            style={[
              styles.netValue,
              netBalance >= 0 ? styles.netPositive : styles.netNegative,
            ]}
          >
            {netBalance >= 0 ? '+' : '−'}{formatMmkWithUnit(Math.abs(netBalance))}
          </Text>
          <Text style={styles.netHint}>{t.crossBorderFinance.balanceFormula}</Text>
        </View>

        <View style={styles.statsStack}>
          <SummaryBar
            label={t.crossBorderFinance.collected}
            value={formatMmk(summary.collectedTotal)}
            prefix="+"
            accent="#60a5fa"
            icon="✓"
            tint="rgba(96,165,250,0.08)"
          />
          <SummaryBar
            label={t.crossBorderFinance.transportUnpaid}
            value={formatMmk(summary.transportUnpaidTotal)}
            prefix="−"
            accent="#f87171"
            icon="🚚"
            tint="rgba(248,113,113,0.08)"
          />
          <SummaryBar
            label={t.crossBorderFinance.transportPaid}
            value={formatMmk(summary.transportPaidTotal)}
            accent="#a78bfa"
            icon="✅"
            tint="rgba(167,139,250,0.1)"
          />
          <SummaryBar
            label={t.crossBorderFinance.pendingInflow}
            value={formatMmk(summary.pendingInflowTotal)}
            prefix="+"
            accent="#34d399"
            icon="💵"
            tint="rgba(52,211,153,0.08)"
          />
        </View>

        <View style={styles.statsStack}>
          <SummaryBar
            label={t.crossBorderFinance.manualIncome}
            value={formatMmk(summary.manualIncomeTotal)}
            prefix="+"
            accent="#34d399"
            icon="📈"
            tint="rgba(52,211,153,0.08)"
          />
          <SummaryBar
            label={t.crossBorderFinance.manualExpense}
            value={formatMmk(summary.manualExpenseTotal)}
            prefix="−"
            accent="#f87171"
            icon="📉"
            tint="rgba(248,113,113,0.08)"
          />
        </View>

        {summary.agencyPayableTotal > 0 ? (
          <Text style={styles.agencyHint}>
            {fmt(t.crossBorderFinance.agencyHint, {
              amount: formatMmkWithUnit(summary.agencyPayableTotal),
            })}
          </Text>
        ) : null}
        <Text style={styles.syncHint}>{t.crossBorderFinance.syncHint}</Text>
      </View>

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
          <Text style={styles.loadingText}>{t.crossBorderFinance.loading}</Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyTitle}>{t.crossBorderFinance.emptyTitle}</Text>
                <Text style={styles.emptyHint}>{t.crossBorderFinance.emptyHint}</Text>
              </View>
            ) : null
          }
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

      <CrossBorderManualEntryModal
        visible={manualModalVisible}
        storeCode={store.storeCode}
        operatorName={operatorName ?? t.common.operator}
        onClose={() => setManualModalVisible(false)}
        onSaved={() => void load()}
      />
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
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(124,58,237,0.15)',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 10,
  },
  heroTitleBlock: { flex: 1, minWidth: 0 },
  heroActions: { alignItems: 'flex-end', gap: 8 },
  addManualBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.5)',
  },
  addManualBtnText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  heroLabel: { color: '#f8fafc', fontSize: 20, fontWeight: '900' },
  heroHub: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginTop: 4 },
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  netLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  netValue: { fontSize: 26, fontWeight: '900', marginTop: 4 },
  netPositive: { color: '#fbbf24' },
  netNegative: { color: '#f87171' },
  netHint: { color: '#64748b', fontSize: 11, marginTop: 6, fontWeight: '600' },
  statsStack: { gap: 8, marginBottom: 8 },
  statBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statBarIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBarIcon: { fontSize: 16 },
  statBarLabel: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  statBarValue: { fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statBarUnit: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  agencyHint: {
    color: '#fbbf24',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
    lineHeight: 16,
  },
  syncHint: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 8,
    fontWeight: '600',
  },
  tabScroll: { gap: 8, paddingBottom: 8 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabOn: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  tabText: { color: '#94a3b8', fontSize: 13, fontWeight: '800' },
  tabTextOn: { color: '#fff' },
  tabCount: {
    backgroundColor: 'rgba(148,163,184,0.2)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
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
    borderRadius: 12,
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
  ledgerName: { color: '#f8fafc', fontSize: 15, fontWeight: '800', flex: 1 },
  amountPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  amountText: { fontSize: 12, fontWeight: '900' },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  typeTag: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  destTag: { color: '#38bdf8', fontSize: 11, fontWeight: '700' },
  ledgerSubtitle: { color: '#94a3b8', fontSize: 12, marginTop: 6, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  metaTime: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  metaDot: { color: '#475569', fontSize: 11 },
  metaBarcode: { color: '#64748b', fontSize: 11, fontWeight: '600', flex: 1 },
  emptyBox: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: '800' },
  emptyHint: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    fontWeight: '600',
  },
});
