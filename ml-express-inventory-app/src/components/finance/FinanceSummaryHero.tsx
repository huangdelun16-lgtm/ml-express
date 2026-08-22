import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '../../i18n';
import { regionDisplayLabel } from '../../constants/destinationOptions';
import { colors, radius, space } from '../../theme';
import {
  formatMmk,
  formatMmkWithUnit,
  type FinanceTabKey,
} from '../../utils/crossBorderFinanceTabs';

type Summary = {
  collectedTotal: number;
  transportUnpaidTotal: number;
  transportPaidTotal: number;
  pendingInflowTotal: number;
  agencyPayableTotal: number;
  manualIncomeTotal: number;
  manualExpenseTotal: number;
};

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
        {prefix}
        {value}
        <Text style={styles.statBarUnit}> MMK</Text>
      </Text>
    </View>
  );
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
  onTabChange,
  onRetry,
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
  onTabChange: (next: FinanceTabKey) => void;
  onRetry: () => void;
}) {
  const { t, fmt } = useTranslation();

  return (
    <View style={styles.headerBlock}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View style={styles.heroTitleBlock}>
            <Text style={styles.heroLabel}>{t.crossBorderFinance.title}</Text>
            <Text style={styles.heroHub}>
              {fmt(t.crossBorderFinance.heroHub, {
                name: operatorName,
                hub: regionDisplayLabel(hubCode),
              })}
            </Text>
          </View>
          <View style={styles.heroActions}>
            <Pressable style={styles.addManualBtn} onPress={onAddManual}>
              <Text style={styles.addManualBtnText}>{t.crossBorderFinance.addManual}</Text>
            </Pressable>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {fmt(t.common.recordsCount, { count: displayedCount })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.netRow}>
          <Text style={styles.netLabel}>{t.crossBorderFinance.balance}</Text>
          <Text
            style={[styles.netValue, netBalance >= 0 ? styles.netPositive : styles.netNegative]}
          >
            {netBalance >= 0 ? '+' : '−'}
            {formatMmkWithUnit(Math.abs(netBalance))}
          </Text>
          <Text style={styles.netHint}>{t.crossBorderFinance.balanceFormula}</Text>
        </View>

        <View style={styles.statsStack}>
          <SummaryBar
            label={t.crossBorderFinance.collected}
            value={formatMmk(summary.collectedTotal)}
            prefix="+"
            accent={colors.financeBlue}
            icon="✓"
            tint="rgba(96,165,250,0.08)"
          />
          <SummaryBar
            label={t.crossBorderFinance.transportUnpaid}
            value={formatMmk(summary.transportUnpaidTotal)}
            prefix="−"
            accent={colors.danger}
            icon="🚚"
            tint="rgba(248,113,113,0.08)"
          />
          <SummaryBar
            label={t.crossBorderFinance.transportPaid}
            value={formatMmk(summary.transportPaidTotal)}
            accent={colors.purpleSoft}
            icon="✅"
            tint="rgba(167,139,250,0.1)"
          />
          <SummaryBar
            label={t.crossBorderFinance.pendingInflow}
            value={formatMmk(summary.pendingInflowTotal)}
            prefix="+"
            accent={colors.financeGreen}
            icon="💵"
            tint="rgba(52,211,153,0.08)"
          />
        </View>

        <View style={styles.statsStack}>
          <SummaryBar
            label={t.crossBorderFinance.manualIncome}
            value={formatMmk(summary.manualIncomeTotal)}
            prefix="+"
            accent={colors.financeGreen}
            icon="📈"
            tint="rgba(52,211,153,0.08)"
          />
          <SummaryBar
            label={t.crossBorderFinance.manualExpense}
            value={formatMmk(summary.manualExpenseTotal)}
            prefix="−"
            accent={colors.danger}
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
              onPress={() => onTabChange(tabItem.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextOn]}>{tabItem.label}</Text>
              {count > 0 ? (
                <View style={[styles.tabCount, active && styles.tabCountOn]}>
                  <Text style={[styles.tabCountText, active && styles.tabCountTextOn]}>{count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {error ? (
        <Pressable style={styles.errorBanner} onPress={onRetry}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <Text style={styles.errorRetry}>{t.common.retry}</Text>
        </Pressable>
      ) : null}

      {!loading && displayedLength > 0 ? (
        <Text style={styles.sectionTitle}>
          {tabs.find((tabItem) => tabItem.key === tab)?.label} · {displayedLength}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerBlock: { paddingTop: 4 },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xxl,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.purple,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.5)',
  },
  addManualBtnText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  heroLabel: { color: colors.text, fontSize: 20, fontWeight: '900' },
  heroHub: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 4 },
  heroBadge: {
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)',
  },
  heroBadgeText: { color: colors.purpleMuted, fontSize: 12, fontWeight: '800' },
  netRow: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  netLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  netValue: { fontSize: 26, fontWeight: '900', marginTop: 4 },
  netPositive: { color: colors.warning },
  netNegative: { color: colors.danger },
  netHint: { color: colors.muted2, fontSize: 11, marginTop: 6, fontWeight: '600' },
  statsStack: { gap: 8, marginBottom: 8 },
  statBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.md,
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
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  statBarValue: { fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
  statBarUnit: { fontSize: 11, fontWeight: '700', color: colors.muted2 },
  agencyHint: {
    color: colors.warning,
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
    lineHeight: 16,
  },
  syncHint: {
    color: colors.muted2,
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
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabOn: { backgroundColor: colors.purple, borderColor: colors.purple },
  tabText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  tabTextOn: { color: colors.white },
  tabCount: {
    backgroundColor: 'rgba(148,163,184,0.2)',
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabCountOn: { backgroundColor: 'rgba(255,255,255,0.22)' },
  tabCountText: { color: colors.muted, fontSize: 11, fontWeight: '900' },
  tabCountTextOn: { color: colors.white },
  sectionTitle: {
    color: colors.muted2,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderColor: 'rgba(248,113,113,0.5)',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: 10,
  },
  errorBannerText: { color: '#fecaca', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  errorRetry: { color: colors.danger, fontSize: 12, fontWeight: '900', marginTop: 5 },
});
