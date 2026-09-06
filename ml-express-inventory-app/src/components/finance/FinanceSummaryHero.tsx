import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from '../../i18n';
import { regionDisplayLabel } from '../../constants/destinationOptions';
import { colors, radius, space } from '../../theme';
import {
  formatMmk,
  formatMmkWithUnit,
  type FinanceTabKey,
} from '../../utils/crossBorderFinanceTabs';
import { formatCnyAmount, formatMmkAmount, mmkToCny } from '../../utils/crossBorderFx';
import { sumSettledCustomerCny } from '../../utils/crossBorderFxLock';
import type { FinanceLedgerEntry } from '../../types/financeLedger';
import AppText from '../AppText';

type Summary = {
  collectedTotal: number;
  transportUnpaidTotal: number;
  transportPaidTotal: number;
  pendingInflowTotal: number;
  agencyPayableTotal: number;
  manualIncomeTotal: number;
  manualExpenseTotal: number;
};

type MetricTone = 'in' | 'out' | 'neutral';

function toneColor(tone: MetricTone): string {
  if (tone === 'in') return colors.financeGreen;
  if (tone === 'out') return colors.danger;
  return colors.slateSoft;
}

function MetricTile({
  label,
  value,
  subValue,
  prefix,
  tone,
}: {
  label: string;
  value: string;
  subValue?: string | null;
  prefix?: string;
  tone: MetricTone;
}) {
  const color = toneColor(tone);
  return (
    <View style={styles.metricCell}>
      <View style={[styles.metricCard, { borderLeftColor: color }]}>
        <AppText style={styles.metricLabel} numberOfLines={2} myanmarWeight="semibold">
          {label}
        </AppText>
        <AppText style={[styles.metricValue, { color }]} numberOfLines={1} myanmarWeight="bold">
          {`${prefix ?? ''}${value}`}
        </AppText>
        {subValue ? (
          <AppText style={styles.metricSub} numberOfLines={1} myanmarWeight="semibold">
            {subValue}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

function customerMetric(mmk: number, rate: number | null): { value: string; subValue: string | null } {
  const cny = mmkToCny(mmk, rate);
  if (cny == null) {
    return { value: `${formatMmk(mmk)} MMK`, subValue: null };
  }
  return {
    value: `¥${formatCnyAmount(cny)}`,
    subValue: `${formatMmkAmount(mmk)} MMK`,
  };
}

function customerMetricFromCny(mmk: number, cny: number | null): { value: string; subValue: string | null } {
  if (cny == null) {
    return { value: `${formatMmk(mmk)} MMK`, subValue: null };
  }
  return {
    value: `¥${formatCnyAmount(cny)}`,
    subValue: `${formatMmkAmount(mmk)} MMK`,
  };
}

export default function FinanceSummaryHero({
  operatorName,
  hubCode,
  displayedCount,
  netBalance,
  summary,
  tabs,
  tab,
  tabCounts,
  error,
  loading,
  displayedLength,
  onAddManual,
  onExport,
  exporting,
  onTabChange,
  onRetry,
  mmkPerCny,
  entries,
}: {
  operatorName: string;
  hubCode: string;
  displayedCount: number;
  netBalance: number;
  summary: Summary;
  tabs: { key: FinanceTabKey; label: string }[];
  tab: FinanceTabKey;
  tabCounts: Record<FinanceTabKey, number>;
  error: string;
  loading: boolean;
  displayedLength: number;
  onAddManual: () => void;
  onExport: () => void;
  exporting?: boolean;
  onTabChange: (next: FinanceTabKey) => void;
  onRetry: () => void;
  mmkPerCny?: number | null;
  entries?: FinanceLedgerEntry[];
}) {
  const { t, fmt } = useTranslation();
  const rate = mmkPerCny ?? null;
  const customerLedgerMmk =
    summary.collectedTotal + summary.pendingInflowTotal + summary.manualIncomeTotal;
  const myanmarLedgerMmk =
    summary.transportUnpaidTotal + summary.transportPaidTotal + summary.manualExpenseTotal;
  const settledCny = sumSettledCustomerCny(entries ?? []);
  const pendingCny = mmkToCny(summary.pendingInflowTotal, rate);
  const manualCny = mmkToCny(summary.manualIncomeTotal, rate);
  const collectedReady = summary.collectedTotal <= 0 || settledCny != null;
  const floatingReady = summary.pendingInflowTotal + summary.manualIncomeTotal <= 0 || rate != null;
  const customerCny =
    collectedReady && floatingReady
      ? (summary.collectedTotal > 0 ? settledCny ?? 0 : 0) + (pendingCny ?? 0) + (manualCny ?? 0)
      : null;
  const collected = customerMetricFromCny(summary.collectedTotal, settledCny);
  const pending = customerMetric(summary.pendingInflowTotal, rate);
  const manualIncome = customerMetric(summary.manualIncomeTotal, rate);
  const positive = netBalance >= 0;

  return (
    <View style={styles.headerBlock}>
      <View style={styles.heroCard}>
        <View style={styles.heroMeta}>
          <View style={styles.heroTitleBlock}>
            <AppText style={styles.heroEyebrow} myanmarWeight="semibold">
              {fmt(t.crossBorderFinance.heroHub, {
                name: operatorName,
                hub: regionDisplayLabel(hubCode),
              })}
            </AppText>
          </View>
          <View style={styles.countChip}>
            <AppText style={styles.countChipText} myanmarWeight="bold">
              {fmt(t.common.recordsCount, { count: displayedCount })}
            </AppText>
          </View>
        </View>

        {customerCny != null ? (
          <View style={styles.splitLedgers}>
            <View style={styles.splitCol}>
              <AppText style={styles.netLabel} myanmarWeight="semibold">
                {t.crossBorderFinance.customerLedger}
              </AppText>
              <AppText style={[styles.netValue, styles.netValueSplit, styles.netPositive]} myanmarWeight="bold">
                ¥{formatCnyAmount(customerCny)}
              </AppText>
              <AppText style={styles.netHint} myanmarWeight="regular">
                {fmt(t.crossBorderFinance.bookedMmk, { amount: formatMmkAmount(customerLedgerMmk) })}
              </AppText>
            </View>
            <View style={styles.splitCol}>
              <AppText style={styles.netLabel} myanmarWeight="semibold">
                {t.crossBorderFinance.myanmarLedger}
              </AppText>
              <AppText style={[styles.netValue, styles.netValueSplit, styles.netNegative]} myanmarWeight="bold">
                {formatMmkWithUnit(myanmarLedgerMmk)}
              </AppText>
              <AppText style={styles.netHint} myanmarWeight="regular">
                {t.crossBorderFinance.myanmarLedgerHint}
              </AppText>
            </View>
          </View>
        ) : (
          <>
            <AppText style={styles.netLabel} myanmarWeight="semibold">
              {t.crossBorderFinance.balance}
            </AppText>
            <AppText
              style={[styles.netValue, positive ? styles.netPositive : styles.netNegative]}
              myanmarWeight="bold"
            >
              {positive ? '+' : '−'}
              {formatMmkWithUnit(Math.abs(netBalance))}
            </AppText>
            <AppText style={styles.netHint} myanmarWeight="regular">
              {t.crossBorderFinance.balanceFormula}
            </AppText>
          </>
        )}

        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.addManualBtn, pressed && styles.btnPressed]}
            onPress={onAddManual}
          >
            <AppText style={styles.addManualBtnText} myanmarWeight="bold">
              {t.crossBorderFinance.addManual}
            </AppText>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.exportBtn,
              exporting && styles.exportBtnDisabled,
              pressed && !exporting && styles.btnPressed,
            ]}
            onPress={onExport}
            disabled={Boolean(exporting)}
          >
            {exporting ? (
              <ActivityIndicator color={colors.slateSoft} size="small" />
            ) : (
              <AppText style={styles.exportBtnText} myanmarWeight="bold">
                {t.crossBorderFinance.exportCsv}
              </AppText>
            )}
          </Pressable>
        </View>

        <View style={styles.metricsGrid}>
          <MetricTile
            label={t.crossBorderFinance.collected}
            value={collected.value}
            subValue={collected.subValue}
            prefix="+"
            tone="in"
          />
          <MetricTile
            label={t.crossBorderFinance.transportUnpaid}
            value={`${formatMmk(summary.transportUnpaidTotal)} MMK`}
            prefix="−"
            tone="out"
          />
          <MetricTile
            label={t.crossBorderFinance.transportPaid}
            value={`${formatMmk(summary.transportPaidTotal)} MMK`}
            tone="neutral"
          />
          <MetricTile
            label={t.crossBorderFinance.pendingInflow}
            value={pending.value}
            subValue={pending.subValue}
            prefix="+"
            tone="in"
          />
          <MetricTile
            label={t.crossBorderFinance.manualIncome}
            value={manualIncome.value}
            subValue={manualIncome.subValue}
            prefix="+"
            tone="in"
          />
          <MetricTile
            label={t.crossBorderFinance.manualExpense}
            value={`${formatMmk(summary.manualExpenseTotal)} MMK`}
            prefix="−"
            tone="out"
          />
        </View>

        {summary.agencyPayableTotal > 0 ? (
          <View style={styles.agencyBar}>
            <View style={styles.agencyTick} />
            <AppText style={styles.agencyHint} myanmarWeight="semibold">
              {fmt(t.crossBorderFinance.agencyHint, {
                amount: formatMmkWithUnit(summary.agencyPayableTotal),
              })}
            </AppText>
          </View>
        ) : null}
        <AppText style={styles.syncHint} myanmarWeight="regular">
          {t.crossBorderFinance.syncHint}
        </AppText>
      </View>

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabScroll}
      >
        {tabs.map((tabItem) => {
          const active = tab === tabItem.key;
          const count = tabCounts[tabItem.key];
          return (
            <Pressable
              key={tabItem.key}
              style={({ pressed }) => [
                styles.tab,
                active && styles.tabOn,
                pressed && styles.btnPressed,
              ]}
              onPress={() => onTabChange(tabItem.key)}
            >
              <AppText
                style={[styles.tabText, active && styles.tabTextOn]}
                myanmarWeight="bold"
              >
                {tabItem.label}
              </AppText>
              {count > 0 ? (
                <View style={[styles.tabCount, active && styles.tabCountOn]}>
                  <AppText
                    style={[styles.tabCountText, active && styles.tabCountTextOn]}
                    myanmarWeight="bold"
                  >
                    {count}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {error ? (
        <Pressable
          style={({ pressed }) => [styles.errorBanner, pressed && styles.btnPressed]}
          onPress={onRetry}
        >
          <AppText style={styles.errorBannerText} myanmarWeight="semibold">
            {error}
          </AppText>
          <AppText style={styles.errorRetry} myanmarWeight="bold">
            {t.common.retry}
          </AppText>
        </Pressable>
      ) : null}

      {!loading && displayedLength > 0 ? (
        <AppText style={styles.sectionTitle} myanmarWeight="bold">
          {tabs.find((tabItem) => tabItem.key === tab)?.label} · {displayedLength}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerBlock: { paddingTop: 2 },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  heroTitleBlock: { flex: 1, minWidth: 0 },
  heroEyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  countChip: {
    backgroundColor: 'rgba(148,163,184,0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countChipText: { color: colors.slateSoft, fontSize: 11, fontWeight: '700' },
  splitLedgers: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  splitCol: { flex: 1, minWidth: 0 },
  netLabel: {
    color: colors.muted2,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  netValue: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  netValueSplit: { fontSize: 20 },
  netPositive: { color: colors.financeGreen },
  netNegative: { color: colors.danger },
  netHint: {
    color: colors.muted2,
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
    lineHeight: 16,
  },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 14 },
  btnPressed: { opacity: 0.82 },
  addManualBtn: {
    flex: 1,
    backgroundColor: colors.purple,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addManualBtnText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  exportBtn: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  exportBtnDisabled: { opacity: 0.55 },
  exportBtnText: { color: colors.slateSoft, fontSize: 13, fontWeight: '800' },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  metricCell: {
    width: '50%',
    padding: 4,
  },
  metricCard: {
    minHeight: 64,
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    paddingLeft: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  metricSub: {
    color: colors.muted2,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  agencyBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.28)',
  },
  agencyTick: {
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.warning,
    alignSelf: 'stretch',
    minHeight: 16,
  },
  agencyHint: {
    flex: 1,
    color: colors.amberSoft,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  syncHint: {
    color: colors.muted2,
    fontSize: 10,
    marginTop: 10,
    fontWeight: '500',
    lineHeight: 14,
  },
  tabScroll: { gap: 8, paddingBottom: 10, paddingTop: 2 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabOn: {
    backgroundColor: colors.borderMuted,
    borderColor: colors.slateSoft,
  },
  tabText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  tabTextOn: { color: colors.text },
  tabCount: {
    backgroundColor: 'rgba(148,163,184,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  tabCountOn: { backgroundColor: 'rgba(15,23,42,0.45)' },
  tabCountText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  tabCountTextOn: { color: colors.text },
  sectionTitle: {
    color: colors.muted2,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 10,
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderColor: 'rgba(248,113,113,0.4)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: 10,
  },
  errorBannerText: { color: '#fecaca', fontSize: 12, fontWeight: '600', lineHeight: 17 },
  errorRetry: { color: colors.danger, fontSize: 12, fontWeight: '800', marginTop: 5 },
});
