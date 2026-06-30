import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { fmt, resolveAppError, useTranslation } from '../i18n';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { repairCustomerNamesFromCloud, scanOpsHealth } from '../services/opsHealthService';
import type { OpsAnomaly, OrderDataIssue, OrderDataIssueCode } from '../types/opsHealth';
import { navTargetForAnomaly } from '../utils/opsHealthNav';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OpsHealth'>;

function severityColor(severity: OpsAnomaly['severity']): string {
  if (severity === 'critical') return '#f87171';
  if (severity === 'warn') return '#fcd34d';
  return '#93c5fd';
}

function issueLabel(t: ReturnType<typeof useTranslation>['t'], code: OrderDataIssueCode): string {
  if (code === 'missing_customer') return t.opsHealth.issueMissingCustomer;
  if (code === 'missing_phone') return t.opsHealth.issueMissingPhone;
  return t.opsHealth.issueMissingDestination;
}

export default function OpsHealthScreen({ navigation }: { navigation: Nav }) {
  const { t } = useTranslation();
  const { store, hubCode, operatorName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [report, setReport] = useState<Awaited<ReturnType<typeof scanOpsHealth>> | null>(null);

  const load = useCallback(async () => {
    if (!store || !hubCode) {
      setReport(null);
      setLoading(false);
      return;
    }
    const next = await scanOpsHealth(store, hubCode);
    setReport(next);
    setLoading(false);
  }, [store, hubCode]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const openAnomaly = (item: OpsAnomaly) => {
    const target = navTargetForAnomaly(item.code);
    if (target.screen === 'CrossBorderFinance') {
      navigation.navigate('CrossBorderFinance', { initialTab: target.tab });
      return;
    }
    if (target.screen === 'Items') {
      navigation.navigate('Items', { incompleteOnly: target.incompleteOnly });
      return;
    }
    navigation.navigate(target.screen);
  };

  const openDataIssue = (issue: OrderDataIssue) => {
    navigation.navigate('ItemForm', { itemId: issue.itemId });
  };

  const onRepairNames = () => {
    void (async () => {
      setRepairing(true);
      try {
        const fixed = await repairCustomerNamesFromCloud(operatorName ?? t.common.operator);
        await load();
        Alert.alert(
          t.common.success,
          fixed > 0 ? fmt(t.opsHealth.repairNamesDone, { count: fixed }) : t.opsHealth.repairNamesNone,
        );
      } catch (e: unknown) {
        Alert.alert(t.common.fail, resolveAppError(t, e));
      } finally {
        setRepairing(false);
      }
    })();
  };

  if (!store || !hubCode) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>{t.common.loginStoreFirst}</Text>
      </View>
    );
  }

  if (loading && !report) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#38bdf8" />
        <Text style={styles.hint}>{t.opsHealth.scanning}</Text>
      </View>
    );
  }

  const anomalies = report?.anomalies ?? [];
  const dataIssues = report?.dataIssues ?? [];
  const totalOpen = report?.totalOpen ?? 0;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor="#38bdf8"
          onRefresh={() => {
            setRefreshing(true);
            void load().finally(() => setRefreshing(false));
          }}
        />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{t.opsHealth.title}</Text>
        <Text style={styles.heroSub}>{t.opsHealth.subtitle}</Text>
        <Text style={[styles.heroCount, totalOpen > 0 ? styles.heroCountWarn : styles.heroCountOk]}>
          {totalOpen > 0 ? fmt(t.opsHealth.openCount, { count: totalOpen }) : t.opsHealth.allClear}
        </Text>
      </View>

      <Text style={styles.sectionLabel}>{t.opsHealth.sectionReconciliation}</Text>
      {anomalies.length === 0 ? (
        <Text style={styles.emptySection}>{t.opsHealth.noAnomalies}</Text>
      ) : (
        anomalies.map((item) => (
          <Pressable
            key={item.code}
            style={styles.card}
            onPress={() => openAnomaly(item)}
          >
            <View style={[styles.dot, { backgroundColor: severityColor(item.severity) }]} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{t.opsHealth.anomaly[item.code]}</Text>
              <Text style={styles.cardMeta}>
                {fmt(t.opsHealth.anomalyCount, { count: item.count })}
                {item.sampleLabel ? ` · ${item.sampleLabel}` : ''}
              </Text>
              <Text style={styles.cardAction}>{t.opsHealth.tapToResolve}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))
      )}

      <Text style={styles.sectionLabel}>{t.opsHealth.sectionDataQuality}</Text>
      {dataIssues.length === 0 ? (
        <Text style={styles.emptySection}>{t.opsHealth.noDataIssues}</Text>
      ) : (
        <>
          {dataIssues.slice(0, 20).map((issue) => (
            <Pressable key={issue.itemId} style={styles.card} onPress={() => openDataIssue(issue)}>
              <View style={[styles.dot, { backgroundColor: '#fbbf24' }]} />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {issue.name || issue.barcode}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {issue.barcode}
                </Text>
                <Text style={styles.cardMeta}>
                  {issue.issues.map((code) => issueLabel(t, code)).join(' · ')}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
          {dataIssues.length > 20 ? (
            <Pressable
              style={styles.linkBtn}
              onPress={() => navigation.navigate('Items', { incompleteOnly: true })}
            >
              <Text style={styles.linkBtnText}>
                {fmt(t.opsHealth.viewAllIssues, { count: dataIssues.length })}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}

      <Pressable
        style={[styles.primaryBtn, repairing && styles.btnDisabled]}
        disabled={repairing}
        onPress={onRepairNames}
      >
        <Text style={styles.primaryBtnText}>
          {repairing ? t.common.processing : t.opsHealth.repairNamesBtn}
        </Text>
      </Pressable>
      <Text style={styles.footerHint}>{t.opsHealth.repairNamesHint}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617', gap: 10 },
  hint: { color: '#94a3b8', fontWeight: '600' },
  hero: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  heroTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  heroSub: { color: '#94a3b8', fontSize: 13, lineHeight: 20, marginTop: 6 },
  heroCount: { marginTop: 12, fontSize: 15, fontWeight: '800' },
  heroCountOk: { color: '#6ee7b7' },
  heroCountWarn: { color: '#fcd34d' },
  sectionLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  emptySection: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { color: '#f1f5f9', fontWeight: '800', fontSize: 14 },
  cardMeta: { color: '#94a3b8', fontSize: 12, marginTop: 4, lineHeight: 18 },
  cardAction: { color: '#38bdf8', fontSize: 11, fontWeight: '700', marginTop: 6 },
  chevron: { color: '#475569', fontSize: 22, fontWeight: '300' },
  linkBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: 8 },
  linkBtnText: { color: '#38bdf8', fontWeight: '800', fontSize: 13 },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  btnDisabled: { opacity: 0.55 },
  footerHint: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 10, textAlign: 'center' },
});
