import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { getStats, listPackedShipmentRows } from '../services/inventoryService';
import { requestAutoCloudSync } from '../services/cloudAutoSync';
import { getCloudSyncQueueSnapshot } from '../services/inventoryCloudQueue';
import type { PackedShipmentListRow } from '../types/inventory';
import { PACK_DISPLAY_LABEL, packStatusStyle } from '../utils/packDisplayStatus';

type Nav = { navigate: (name: string) => void };

export default function HomeScreen({ navigation }: { navigation: Nav }) {
  const { operatorName, storeCode, hubCode, store, logout } = useAuth();
  const [stats, setStats] = useState({
    itemCount: 0,
    totalQty: 0,
    lowStockCount: 0,
    todayIn: 0,
    todayOut: 0,
    packCount: 0,
  });
  const [recentPacks, setRecentPacks] = useState<PackedShipmentListRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncPending, setSyncPending] = useState(0);

  const load = useCallback(async () => {
    const scope = store && hubCode ? { store, hubCode } : undefined;
    if (store && hubCode) {
      requestAutoCloudSync(store, hubCode);
      const snapshot = await getCloudSyncQueueSnapshot(store.storeCode);
      setSyncPending(snapshot.pending);
    } else {
      setSyncPending(0);
    }
    const [s, packsAfter] = await Promise.all([
      getStats(scope),
      listPackedShipmentRows(undefined, scope),
    ]);
    setStats(s);
    setRecentPacks(packsAfter.slice(0, 3));
  }, [store, hubCode]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const tiles = [
    { title: '入库', icon: '📥', screen: 'StockIn', color: '#059669' },
    { title: '快递明细', icon: '📋', screen: 'Items', color: '#2563eb' },
    { title: '打包', icon: '📦', screen: 'Pkg', color: '#a855f7' },
    { title: '装车出库', icon: '🚚', screen: 'StockOut', color: '#dc2626' },
    { title: '到站收货', icon: '✅', screen: 'HubReceive', color: '#0d9488' },
    { title: '在途追踪', icon: '🛰️', screen: 'ShipmentTrack', color: '#0284c7' },
    { title: '流水', icon: '📜', screen: 'Movements', color: '#7c3aed' },
    { title: '通用扫码', icon: '📷', screen: 'CameraScan', color: '#0891b2' },
    { title: '设置', icon: '⚙️', screen: 'Settings', color: '#64748b' },
  ];

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={async () => {
          setRefreshing(true);
          await load();
          setRefreshing(false);
        }} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>你好，{operatorName}</Text>
          <Text style={styles.hint}>
            {storeCode ? `${storeCode}` : '中转站'}
            {hubCode ? ` · 区域 ${hubCode}` : ''} · 本地库存 + 云端在途
          </Text>
        </View>
        <Pressable onPress={() => logout()}>
          <Text style={styles.logout}>退出</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="SKU" value={String(stats.itemCount)} />
        <StatCard label="总库存" value={String(stats.totalQty)} />
        <StatCard label="打包" value={String(stats.packCount)} />
        <StatCard label="今日入" value={String(stats.todayIn)} />
        <StatCard label="今日出" value={String(stats.todayOut)} />
      </View>
      {stats.lowStockCount > 0 ? (
        <Text style={styles.warn}>⚠️ {stats.lowStockCount} 个 SKU 低于安全库存</Text>
      ) : null}
      {syncPending > 0 ? (
        <Text style={styles.syncWarn}>
          ⏳ {syncPending} 项待上传云端 · 设置页可「立即同步」
        </Text>
      ) : null}

      <Pressable style={styles.pkgCard} onPress={() => navigation.navigate('Pkg')}>
        <View style={styles.pkgCardHeader}>
          <Text style={styles.pkgCardTitle}>📦 打包</Text>
          <Text style={styles.pkgCardMore}>
            {stats.packCount > 0 ? `共 ${stats.packCount} 个包裹 →` : '查看全部 →'}
          </Text>
        </View>
        {recentPacks.length === 0 ? (
          <Text style={styles.pkgEmpty}>快递明细「打包快递」确认打包后，包裹会出现在这里</Text>
        ) : (
          recentPacks.map((pack) => {
            const statusStyle = packStatusStyle(pack.display_status);
            return (
            <View key={pack.id} style={styles.pkgRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pkgName} numberOfLines={1}>
                  {pack.bundle_name}
                </Text>
                <Text style={styles.pkgBarcode} numberOfLines={1}>
                  {pack.bundle_barcode}
                </Text>
              </View>
              <View style={styles.pkgRowRight}>
                <View style={[styles.loadBadge, { backgroundColor: statusStyle.badgeBg }]}>
                  <Text style={[styles.loadBadgeText, { color: statusStyle.badgeText }]}>
                    {PACK_DISPLAY_LABEL[pack.display_status]}
                  </Text>
                </View>
                <Text style={styles.pkgQty}>{pack.items.length} 件</Text>
              </View>
            </View>
            );
          })
        )}
      </Pressable>

      <View style={styles.grid}>
        {tiles.map((t) => (
          <Pressable
            key={t.screen}
            style={[styles.tile, { borderLeftColor: t.color }]}
            onPress={() => navigation.navigate(t.screen)}
          >
            <Text style={styles.tileIcon}>{t.icon}</Text>
            <Text style={styles.tileTitle}>{t.title}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  hello: { color: '#f8fafc', fontSize: 22, fontWeight: '800' },
  hint: { color: '#94a3b8', marginTop: 4, fontSize: 13 },
  logout: { color: '#f87171', fontWeight: '700' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  stat: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { color: '#fbbf24', fontSize: 20, fontWeight: '900' },
  statLabel: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  warn: { color: '#fbbf24', marginBottom: 16, fontSize: 13 },
  syncWarn: { color: '#a78bfa', marginBottom: 16, fontSize: 13, fontWeight: '700' },
  pkgCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#a855f7',
  },
  pkgCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pkgCardTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  pkgCardMore: { color: '#c4b5fd', fontSize: 13, fontWeight: '700' },
  pkgEmpty: { color: '#64748b', fontSize: 13, lineHeight: 20 },
  pkgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    gap: 10,
  },
  pkgName: { color: '#e2e8f0', fontSize: 14, fontWeight: '800' },
  pkgBarcode: { color: '#d8b4fe', fontSize: 12, fontFamily: 'monospace', marginTop: 2 },
  pkgRowRight: { alignItems: 'flex-end', gap: 6 },
  loadBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  loadBadgeDone: { backgroundColor: 'rgba(34,197,94,0.15)' },
  loadBadgePending: { backgroundColor: 'rgba(251,146,60,0.15)' },
  loadBadgeText: { fontSize: 10, fontWeight: '900' },
  loadBadgeTextDone: { color: '#4ade80' },
  loadBadgeTextPending: { color: '#fb923c' },
  pkgQty: { color: '#c4b5fd', fontSize: 13, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47%',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 18,
    borderLeftWidth: 4,
  },
  tileIcon: { fontSize: 28, marginBottom: 8 },
  tileTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '800' },
});
