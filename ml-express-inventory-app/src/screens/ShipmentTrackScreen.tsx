import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  listInboundPackages,
  listOutboundPackagesFromOrigin,
} from '../services/trackingService';
import type { PkgTrackingDetail } from '../types/tracking';
import { PKG_STATUS_LABEL } from '../types/tracking';
import { resolveStoreHubCode } from '../utils/storeZone';

type Tab = 'inbound' | 'outbound';

type Nav = { navigate: (name: string, params?: { presetCode?: string }) => void };

function PackTrackCard({ item, onPress }: { item: PkgTrackingDetail; onPress?: () => void }) {
  const content = (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.barcode} numberOfLines={1}>
          {item.pack_barcode}
        </Text>
        <Text style={styles.status}>{PKG_STATUS_LABEL[item.status]}</Text>
      </View>
      <Text style={styles.route}>
        {item.origin_store_code} → {item.destination_code}
      </Text>
      <Text style={styles.meta}>
        {item.item_count} 件
        {item.received_order_count > 0
          ? ` · 已确认 ${item.received_order_count}/${item.item_count} 单`
          : ''}
      </Text>
      {item.hub_received_by_store_code ? (
        <Text style={styles.meta}>到站：{item.hub_received_by_store_code}</Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

export default function ShipmentTrackScreen({ navigation }: { navigation: Nav }) {
  const { store } = useAuth();
  const hubCode = store ? resolveStoreHubCode(store) : '';
  const [tab, setTab] = useState<Tab>('inbound');
  const [inbound, setInbound] = useState<PkgTrackingDetail[]>([]);
  const [outbound, setOutbound] = useState<PkgTrackingDetail[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!store) return;
    const [inList, outList] = await Promise.all([
      listInboundPackages(hubCode),
      listOutboundPackagesFromOrigin(store.storeCode),
    ]);
    setInbound(inList);
    setOutbound(outList);
  }, [store, hubCode]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const data = tab === 'inbound' ? inbound : outbound;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {store?.storeCode} · 区域 {hubCode}
        </Text>
        <Text style={styles.headerSub}>云端实时追踪装车发出与到站进度</Text>
      </View>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'inbound' && styles.tabOn]}
          onPress={() => setTab('inbound')}
        >
          <Text style={[styles.tabText, tab === 'inbound' && styles.tabTextOn]}>
            本站待收 ({inbound.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'outbound' && styles.tabOn]}
          onPress={() => setTab('outbound')}
        >
          <Text style={[styles.tabText, tab === 'outbound' && styles.tabTextOn]}>
            本站发出 ({outbound.length})
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={data.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {tab === 'inbound'
              ? `暂无发往 ${hubCode} 的在途包裹`
              : '暂无本站发出的在途包裹'}
          </Text>
        }
        renderItem={({ item }) => (
          <PackTrackCard
            item={item}
            onPress={() => navigation.navigate('TrackExpress', { presetCode: item.pack_barcode })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '900' },
  headerSub: { color: '#64748b', fontSize: 12, marginTop: 4 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  tab: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabOn: { borderColor: '#0ea5e9', backgroundColor: 'rgba(14,165,233,0.12)' },
  tabText: { color: '#94a3b8', fontWeight: '800', fontSize: 13 },
  tabTextOn: { color: '#7dd3fc' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyList: { flexGrow: 1, paddingHorizontal: 16 },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 48, lineHeight: 22 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  barcode: { color: '#d8b4fe', fontSize: 14, fontWeight: '900', fontFamily: 'monospace', flex: 1 },
  status: { color: '#7dd3fc', fontSize: 11, fontWeight: '900' },
  route: { color: '#94a3b8', fontSize: 12, marginTop: 6 },
  meta: { color: '#64748b', fontSize: 11, marginTop: 4 },
});
