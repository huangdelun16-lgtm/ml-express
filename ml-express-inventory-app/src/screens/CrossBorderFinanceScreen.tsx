import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  getCrossBorderCategoryLabel,
  getLedgerAmountDisplay,
  resolveAppError,
  useTranslation,
} from '../i18n';
import { deleteCrossBorderManualEntry } from '../services/crossBorderManualEntryService';
import { feedbackService } from '../services/FeedbackService';
import { listCrossBorderFinance } from '../services/financeLedgerService';
import { shareFinanceCsvFile } from '../services/shareFinanceCsv';
import {
  fetchStationSettlement,
  isPeriodReadOnly,
  submitStationSettlement,
  type StationSettlementRow,
} from '../services/settlementService';
import { createAgencyRemittance } from '../services/agencyRemittanceService';
import type { FinanceLedgerEntry, FinanceLedgerResult } from '../types/financeLedger';
import { ownershipKeyFromStoreCode } from '../utils/storeOwnership';
import { resolveFinancePeriod } from '../utils/yangonFinancePeriod';
import AppText from '../components/AppText';
import CrossBorderManualEntryModal from '../components/CrossBorderManualEntryModal';
import FinanceLedgerRow from '../components/finance/FinanceLedgerRow';
import FinanceSummaryHero from '../components/finance/FinanceSummaryHero';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { colors, space } from '../theme';
import { regionDisplayLabel } from '../constants/destinationOptions';
import { filterByTab, type FinanceTabKey } from '../utils/crossBorderFinanceTabs';
import {
  buildFinanceExportCsv,
  buildFinanceExportFilename,
  financeExportLabelsFromT,
  formatFinanceExportDateTime,
} from '../utils/financeLedgerExport';

type FinanceRoute = RouteProp<RootStackParamList, 'CrossBorderFinance'>;

export default function CrossBorderFinanceScreen() {
  const { t, fmt } = useTranslation();
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
    agencyRemittedTotal: 0,
    manualIncomeTotal: 0,
    manualExpenseTotal: 0,
  });
  const [periodKind, setPeriodKind] = useState<'all' | 'day' | 'month'>('all');
  const [settlement, setSettlement] = useState<StationSettlementRow | null>(null);
  const [submittingClose, setSubmittingClose] = useState(false);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [exporting, setExporting] = useState(false);

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
      agencyRemittedTotal: result.summary.agencyRemittedTotal ?? 0,
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
        const range =
          periodKind === 'all' ? null : resolveFinancePeriod(periodKind);
        const result = await listCrossBorderFinance(store, hubCode, range);
        applyFinanceResult(result);
        if (range && (periodKind === 'day' || periodKind === 'month')) {
          const row = await fetchStationSettlement(store, hubCode, periodKind, range);
          setSettlement(row);
        } else {
          setSettlement(null);
        }
      } catch (e: unknown) {
        setError(resolveAppError(t, e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [store, hubCode, applyFinanceResult, t, periodKind],
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

  const periodLocked = isPeriodReadOnly(settlement);

  const agencyOutstanding = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of entries) {
      const originKey = String(entry.originKey || '').trim();
      if (entry.category === 'agency_remit' && entry.remitDirection === 'out') {
        map.set(originKey, (map.get(originKey) || 0) - (entry.amount || 0));
        continue;
      }
      if (!originKey || originKey === currentKey) continue;
      if (entry.category !== 'order_collected' && entry.category !== 'order_prepaid') continue;
      map.set(originKey, (map.get(originKey) || 0) + (entry.amount || 0));
    }
    return [...map.entries()]
      .filter(([, amount]) => amount > 0)
      .map(([key, amount]) => ({ key, amount }));
  }, [entries, currentKey]);

  const onSubmitClose = useCallback(() => {
    if (!store || !hubCode || (periodKind !== 'day' && periodKind !== 'month') || submittingClose) {
      return;
    }
    setSubmittingClose(true);
    void submitStationSettlement({
      store,
      hubCode,
      kind: periodKind,
      operatorName: operatorName ?? '',
      summary: {
        codPendingTotal: summary.pendingInflowTotal,
        collectedTotal: summary.collectedTotal,
        transportCostTotal: summary.transportUnpaidTotal,
        transportPaidTotal: summary.transportPaidTotal,
        transportUnpaidTotal: summary.transportUnpaidTotal,
        pendingInflowTotal: summary.pendingInflowTotal,
        agencyPayableTotal: summary.agencyPayableTotal,
        agencyRemittedTotal: summary.agencyRemittedTotal ?? 0,
        manualIncomeTotal: summary.manualIncomeTotal,
        manualExpenseTotal: summary.manualExpenseTotal,
      },
      entries,
    })
      .then(() => {
        feedbackService.success(t.crossBorderFinance.settlementSubmitOk);
        return load();
      })
      .catch((e: unknown) => setError(resolveAppError(t, e)))
      .finally(() => setSubmittingClose(false));
  }, [
    store,
    hubCode,
    periodKind,
    submittingClose,
    operatorName,
    summary,
    entries,
    t,
    load,
  ]);

  const onRemit = useCallback(
    (originKey: string, remaining: number) => {
      if (!store || !hubCode || periodLocked) return;
      const run = (raw: string) => {
        const amount = Math.round(Number(String(raw).replace(/[^\d.]/g, '')) || 0);
        if (amount <= 0) {
          setError(t.serviceErrors.remitAmountInvalid);
          return;
        }
        void createAgencyRemittance({
          store,
          hubCode,
          toOriginKey: originKey,
          amount,
          createdBy: `${store.storeCode} · ${operatorName || t.common.operator}`,
        })
          .then(() => load())
          .catch((e: unknown) => setError(resolveAppError(t, e)));
      };
      if (typeof Alert.prompt === 'function') {
        Alert.prompt(
          t.crossBorderFinance.remitToOrigin,
          originKey,
          [
            { text: t.common.cancel, style: 'cancel' },
            { text: t.crossBorderFinance.remitConfirm, onPress: (value?: string) => run(value || '') },
          ],
          'plain-text',
          String(remaining),
        );
        return;
      }
      Alert.alert(t.crossBorderFinance.remitToOrigin, `${originKey} · ${remaining} MMK`, [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.crossBorderFinance.remitConfirm, onPress: () => run(String(remaining)) },
      ]);
    },
    [store, hubCode, periodLocked, operatorName, t, load],
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

  const onExportCsv = useCallback(async () => {
    if (exporting) return;
    if (displayed.length === 0) {
      feedbackService.warning(t.crossBorderFinance.exportEmpty);
      return;
    }
    if (!store || !hubCode) return;
    setExporting(true);
    try {
      const csv = buildFinanceExportCsv({
        entries: displayed,
        summary,
        netBalance,
        meta: {
          hub: regionDisplayLabel(hubCode),
          store: store.storeCode,
          tab: tabs.find((item) => item.key === tab)?.label ?? tab,
          exportedAt: formatFinanceExportDateTime(new Date().toISOString()),
        },
        labels: financeExportLabelsFromT(t),
        categoryLabel: (entry) => getCrossBorderCategoryLabel(t, entry.category),
        amountDisplay: (entry) => getLedgerAmountDisplay(t, entry),
      });
      const filename = buildFinanceExportFilename({ hub: hubCode, tab, at: new Date() });
      const method = await shareFinanceCsvFile({
        csv,
        filename,
        dialogTitle: t.crossBorderFinance.exportCsv,
      });
      if (method === 'copied') {
        feedbackService.success(t.crossBorderFinance.exportCopied);
      }
    } catch {
      feedbackService.error(t.crossBorderFinance.exportFailed);
    } finally {
      setExporting(false);
    }
  }, [displayed, exporting, hubCode, netBalance, store, summary, t, tab, tabs]);

  if (!store || !hubCode) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyMark}>
          <View style={styles.emptyMarkLine} />
          <View style={[styles.emptyMarkLine, styles.emptyMarkLineMid]} />
          <View style={[styles.emptyMarkLine, styles.emptyMarkLineShort]} />
        </View>
        <AppText style={styles.emptyTitle} myanmarWeight="bold">
          {t.common.loginStoreFirst}
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {loading && entries.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.slateSoft} size="large" />
          <AppText style={styles.loadingText} myanmarWeight="semibold">
            {t.crossBorderFinance.loading}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              <View style={styles.periodRow}>
                {(['all', 'day', 'month'] as const).map((kind) => (
                  <Pressable
                    key={kind}
                    style={[styles.periodChip, periodKind === kind && styles.periodChipOn]}
                    onPress={() => setPeriodKind(kind)}
                  >
                    <AppText
                      style={[styles.periodChipText, periodKind === kind && styles.periodChipTextOn]}
                      myanmarWeight="bold"
                    >
                      {kind === 'all'
                        ? t.crossBorderFinance.periodAll
                        : kind === 'day'
                          ? t.crossBorderFinance.periodDay
                          : t.crossBorderFinance.periodMonth}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              <AppText style={styles.periodTz} myanmarWeight="regular">
                {t.crossBorderFinance.periodTz}
              </AppText>
              {periodKind !== 'all' ? (
                <View style={styles.closeBox}>
                  <AppText style={styles.closeStatus} myanmarWeight="semibold">
                    {settlement?.status === 'submitted'
                      ? t.crossBorderFinance.settlementSubmitted
                      : settlement?.status === 'confirmed'
                        ? t.crossBorderFinance.settlementConfirmed
                        : settlement?.status === 'rejected'
                          ? fmt(t.crossBorderFinance.settlementRejected, {
                              reason: settlement.rejected_reason || '',
                            })
                          : periodLocked
                            ? t.crossBorderFinance.periodLocked
                            : ''}
                  </AppText>
                  {!periodLocked ? (
                    <Pressable
                      style={[styles.closeBtn, submittingClose && styles.closeBtnDisabled]}
                      disabled={submittingClose}
                      onPress={onSubmitClose}
                    >
                      <AppText style={styles.closeBtnText} myanmarWeight="bold">
                        {periodKind === 'day'
                          ? t.crossBorderFinance.submitDayClose
                          : t.crossBorderFinance.submitMonthClose}
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
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
                onAddManual={() => {
                  if (!periodLocked) setManualModalVisible(true);
                }}
                onExport={() => void onExportCsv()}
                exporting={exporting}
                onTabChange={setTab}
                onRetry={() => void load()}
              />
              {tab === 'agency' && agencyOutstanding.length > 0 && !periodLocked ? (
                <View style={styles.remitBox}>
                  {agencyOutstanding.map((item) => (
                    <Pressable
                      key={item.key}
                      style={styles.remitBtn}
                      onPress={() => onRemit(item.key, item.amount)}
                    >
                      <AppText style={styles.remitBtnText} myanmarWeight="bold">
                        {t.crossBorderFinance.remitToOrigin} {item.key} · {item.amount}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyBox}>
                <View style={styles.emptyMark}>
                  <View style={styles.emptyMarkLine} />
                  <View style={[styles.emptyMarkLine, styles.emptyMarkLineMid]} />
                  <View style={[styles.emptyMarkLine, styles.emptyMarkLineShort]} />
                </View>
                <AppText style={styles.emptyTitle} myanmarWeight="bold">
                  {t.crossBorderFinance.emptyTitle}
                </AppText>
                <AppText style={styles.emptyHint} myanmarWeight="regular">
                  {t.crossBorderFinance.emptyHint}
                </AppText>
                {tab === 'all' || tab === 'manual' ? (
                  <Pressable
                    style={({ pressed }) => [styles.emptyCta, pressed && styles.emptyCtaPressed]}
                    onPress={() => {
                      if (!periodLocked) setManualModalVisible(true);
                    }}
                  >
                    <AppText style={styles.emptyCtaText} myanmarWeight="bold">
                      {t.crossBorderFinance.addManual}
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.slateSoft}
              colors={[colors.accent]}
            />
          }
          renderItem={({ item }) => (
            <FinanceLedgerRow
              item={item}
              deleting={deletingId === item.manualEntryId}
              onDelete={item.deletable && !periodLocked ? () => confirmDelete(item) : undefined}
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
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: space.lg,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyMark: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: space.md,
    paddingHorizontal: 10,
  },
  emptyMarkLine: {
    height: 2,
    width: '100%',
    borderRadius: 1,
    backgroundColor: colors.borderMuted,
  },
  emptyMarkLineMid: { width: '72%' },
  emptyMarkLineShort: { width: '46%' },
  emptyTitle: { color: colors.textSecondary, fontSize: 16, fontWeight: '800' },
  emptyHint: {
    color: colors.muted2,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    fontWeight: '500',
  },
  emptyCta: {
    marginTop: 16,
    backgroundColor: colors.purple,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaPressed: { opacity: 0.85 },
  emptyCtaText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  periodChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  periodChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  periodChipText: { color: colors.slateSoft, fontSize: 12, fontWeight: '800' },
  periodChipTextOn: { color: colors.white },
  periodTz: { color: colors.muted2, fontSize: 11, marginBottom: 10 },
  closeBox: { marginBottom: 12, gap: 8 },
  closeStatus: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  closeBtn: {
    backgroundColor: colors.purple,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  closeBtnDisabled: { opacity: 0.6 },
  closeBtnText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  remitBox: { gap: 8, marginBottom: 12 },
  remitBtn: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  remitBtnText: { color: colors.slateSoft, fontSize: 12, fontWeight: '700' },
});
