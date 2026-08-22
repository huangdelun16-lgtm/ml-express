import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { resolveAppError, useTranslation } from '../i18n';
import { listCrossBorderFinance } from '../services/financeLedgerService';
import { deleteCrossBorderManualEntry } from '../services/crossBorderManualEntryService';
import type { FinanceLedgerEntry, FinanceLedgerResult } from '../types/financeLedger';
import { ownershipKeyFromStoreCode } from '../utils/storeOwnership';
import CrossBorderManualEntryModal from '../components/CrossBorderManualEntryModal';
import FinanceLedgerRow from '../components/finance/FinanceLedgerRow';
import FinanceSummaryHero from '../components/finance/FinanceSummaryHero';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { colors, space } from '../theme';
import { filterByTab, type FinanceTabKey } from '../utils/crossBorderFinanceTabs';

type FinanceRoute = RouteProp<RootStackParamList, 'CrossBorderFinance'>;

export default function CrossBorderFinanceScreen() {
  const { t } = useTranslation();
  const route = useRoute<FinanceRoute>();
  const { store, hubCode, operatorName } = useAuth();
  const [tab, setTab] = useState<FinanceTabKey>('all');
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
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const tabs = useMemo(
    (): { key: FinanceTabKey; label: string }[] => [
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

      try {
        setError('');
        const result = await listCrossBorderFinance(store, hubCode);
        applyFinanceResult(result);
      } catch (e: unknown) {
        setError(resolveAppError(t, e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [store, hubCode, applyFinanceResult, t],
  );

  const confirmDelete = useCallback(
    (entry: FinanceLedgerEntry) => {
      if (!entry.manualEntryId || deletingId || !store || !hubCode) return;
      const currentStore = store;
      const currentHubCode = hubCode;
      Alert.alert(t.manualEntry.deleteTitle, t.manualEntry.deleteConfirm, [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.manualEntry.delete,
          style: 'destructive',
          onPress: () => {
            const id = entry.manualEntryId;
            if (!id) return;
            setDeletingId(id);
            setError('');
            void deleteCrossBorderManualEntry(currentStore, currentHubCode, id)
              .then(() => load())
              .catch((e: unknown) => setError(resolveAppError(t, e)))
              .finally(() => setDeletingId(''));
          },
        },
      ]);
    },
    [deletingId, hubCode, load, store, t],
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

  return (
    <View style={styles.root}>
      {loading && entries.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.purpleSoft} size="large" />
          <Text style={styles.loadingText}>{t.crossBorderFinance.loading}</Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <FinanceSummaryHero
              operatorName={operatorName ?? t.common.thisStation}
              hubCode={hubCode}
              displayedCount={displayed.length}
              netBalance={netBalance}
              summary={summary}
              tabs={tabs}
              tab={tab}
              tabCounts={tabCounts}
              error={error}
              loading={loading}
              displayedLength={displayed.length}
              onAddManual={() => setManualModalVisible(true)}
              onTabChange={setTab}
              onRetry={() => void load()}
            />
          }
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
              tintColor={colors.purpleSoft}
              colors={[colors.purple]}
            />
          }
          renderItem={({ item }) => (
            <FinanceLedgerRow
              item={item}
              deleting={deletingId === item.manualEntryId}
              onDelete={item.deletable ? () => confirmDelete(item) : undefined}
            />
          )}
        />
      )}

      <CrossBorderManualEntryModal
        visible={manualModalVisible}
        store={store}
        hubCode={hubCode}
        operatorName={operatorName ?? t.common.operator}
        onClose={() => setManualModalVisible(false)}
        onSaved={() => void load()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { color: colors.muted, marginTop: 14, fontSize: 14, fontWeight: '600' },
  list: { paddingHorizontal: space.lg, paddingBottom: 32 },
  emptyBox: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: space.xl },
  emptyIcon: { fontSize: 40, marginBottom: space.md },
  emptyTitle: { color: colors.textSecondary, fontSize: 16, fontWeight: '800' },
  emptyHint: {
    color: colors.muted2,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    fontWeight: '600',
  },
});
