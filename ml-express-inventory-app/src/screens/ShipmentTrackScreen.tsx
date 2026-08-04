import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import TripPackagesModal from '../components/TripPackagesModal';
import { useAuth } from '../contexts/AuthContext';
import { getPkgStatusLabel, useTranslation } from '../i18n';
import {
  listInboundPackages,
  listOutboundPackagesFromOrigin,
} from '../services/trackingService';
import type { PkgTrackingDetail } from '../types/tracking';
import { regionDisplayLabel } from '../constants/destinationOptions';
import { formatDisplayDate } from '../utils/dateFormat';
import { resolveStoreHubCode } from '../utils/storeZone';
import { splitOutboundByTrip, type TruckTripSummary } from '../utils/truckTripGroups';

type Tab = 'inbound' | 'outbound';

function isActiveInboundTrackingPack(pack: PkgTrackingDetail): boolean {
  if (pack.status === 'completed' || pack.status === 'cancelled' || pack.status === 'split_at_hub') {
    return false;
  }
  if (pack.status === 'in_transit') return true;
  return pack.orders.some((order) => order.status === 'in_transit');
}

function isActiveOutboundTrackingPack(pack: PkgTrackingDetail): boolean {
  if (pack.status === 'completed' || pack.status === 'cancelled' || pack.status === 'split_at_hub') {
    return false;
  }
  return pack.status === 'in_transit' || pack.status === 'hub_received';
}

type Nav = { navigate: (name: string, params?: { presetCode?: string }) => void };

type OutboundListItem =
  | { kind: 'trip'; key: string; trip: TruckTripSummary }
  | { kind: 'pack'; key: string; pack: PkgTrackingDetail };

function PackTrackCard({ item, onPress }: { item: PkgTrackingDetail; onPress?: () => void }) {
  const { t, fmt } = useTranslation();
  const content = (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.barcode} numberOfLines={1}>
          {item.pack_barcode}
        </Text>
        <Text style={styles.status}>{getPkgStatusLabel(t, item.status)}</Text>
      </View>
      <Text style={styles.route}>
        {item.origin_store_code} → {regionDisplayLabel(item.destination_code)}
      </Text>
      <Text style={styles.meta}>
        {fmt(t.common.itemsCount, { count: item.item_count })}
        {item.received_order_count > 0
          ? ` · ${fmt(t.common.confirmedOrders, {
              done: item.received_order_count,
              total: item.item_count,
            })}`
          : ''}
      </Text>
      {item.hub_received_by_store_code ? (
        <Text style={styles.meta}>
          {t.common.arrivedAt}
          {item.hub_received_by_store_code}
        </Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

function TripTrackCard({ trip, onPress }: { trip: TruckTripSummary; onPress: () => void }) {
  const { t, fmt } = useTranslation();
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.card, styles.tripCard]}>
        <View style={styles.cardTop}>
          <Text style={styles.tripNumber}>{trip.tripNumber}</Text>
          <Text style={styles.status}>{getPkgStatusLabel(t, trip.packages[0]?.status ?? 'in_transit')}</Text>
        </View>
        <Text style={styles.route}>
          {fmt(t.shipmentTrack.tripCardRoute, {
            dest: regionDisplayLabel(trip.legDestination),
            count: trip.packCount,
          })}
        </Text>
        <Text style={styles.meta}>
          {trip.outboundDate
            ? fmt(t.shipmentTrack.tripCardDate, { date: formatDisplayDate(trip.outboundDate) })
            : ''}
          {trip.transportFee
            ? ` · ${fmt(t.shipmentTrack.tripCardFee, { fee: trip.transportFee })}`
            : ''}
        </Text>
        <Text style={styles.tripHint}>{t.shipmentTrack.tripCardHint}</Text>
      </View>
    </Pressable>
  );
}

export default function ShipmentTrackScreen({ navigation }: { navigation: Nav }) {
  const { t, fmt } = useTranslation();
  const { store } = useAuth();
  const hubCode = store ? resolveStoreHubCode(store) : '';
  const [tab, setTab] = useState<Tab>('inbound');
  const [inbound, setInbound] = useState<PkgTrackingDetail[]>([]);
  const [outbound, setOutbound] = useState<PkgTrackingDetail[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TruckTripSummary | null>(null);

  const load = useCallback(async () => {
    if (!store) return;
    const [inList, outList] = await Promise.all([
      listInboundPackages(hubCode),
      listOutboundPackagesFromOrigin(store.storeCode),
    ]);
    setInbound(inList.filter((pack) => isActiveInboundTrackingPack(pack)));
    setOutbound(outList.filter((pack) => isActiveOutboundTrackingPack(pack)));
  }, [store, hubCode]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const outboundItems = useMemo<OutboundListItem[]>(() => {
    const { trips, legacyPackages } = splitOutboundByTrip(outbound);
    const items: OutboundListItem[] = trips.map((trip) => ({
      kind: 'trip',
      key: `trip:${trip.tripNumber}`,
      trip,
    }));
    for (const pack of legacyPackages) {
      items.push({ kind: 'pack', key: `pack:${pack.id}`, pack });
    }
    return items;
  }, [outbound]);

  const inboundCount = inbound.length;
  const outboundCount = outbound.length;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {fmt(t.crossBorderFinance.heroHub, {
            name: store?.storeCode ?? '',
            hub: regionDisplayLabel(hubCode),
          })}
        </Text>
        <Text style={styles.headerSub}>{t.shipmentTrack.headerSub}</Text>
      </View>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'inbound' && styles.tabOn]}
          onPress={() => setTab('inbound')}
        >
          <Text style={[styles.tabText, tab === 'inbound' && styles.tabTextOn]}>
            {fmt(t.shipmentTrack.tabInbound, { count: inboundCount })}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'outbound' && styles.tabOn]}
          onPress={() => setTab('outbound')}
        >
          <Text style={[styles.tabText, tab === 'outbound' && styles.tabTextOn]}>
            {fmt(t.shipmentTrack.tabOutbound, { count: outboundCount })}
          </Text>
        </Pressable>
      </View>

      <FlatList<OutboundListItem | PkgTrackingDetail>
        data={(tab === 'inbound' ? inbound : outboundItems) as Array<OutboundListItem | PkgTrackingDetail>}
        keyExtractor={(item) =>
          tab === 'inbound'
            ? (item as PkgTrackingDetail).id
            : (item as OutboundListItem).key
        }
        contentContainerStyle={
          (tab === 'inbound' ? inbound.length : outboundItems.length) === 0
            ? styles.emptyList
            : styles.list
        }
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
              ? fmt(t.shipmentTrack.emptyInbound, { hub: regionDisplayLabel(hubCode) })
              : t.shipmentTrack.emptyOutbound}
          </Text>
        }
        renderItem={({ item }) => {
          if (tab === 'inbound') {
            const pack = item as PkgTrackingDetail;
            return (
              <PackTrackCard
                item={pack}
                onPress={() => navigation.navigate('TrackExpress', { presetCode: pack.pack_barcode })}
              />
            );
          }
          const outboundItem = item as OutboundListItem;
          if (outboundItem.kind === 'trip') {
            return (
              <TripTrackCard
                trip={outboundItem.trip}
                onPress={() => setSelectedTrip(outboundItem.trip)}
              />
            );
          }
          return (
            <PackTrackCard
              item={outboundItem.pack}
              onPress={() =>
                navigation.navigate('TrackExpress', { presetCode: outboundItem.pack.pack_barcode })
              }
            />
          );
        }}
      />

      <TripPackagesModal
        visible={!!selectedTrip}
        trip={selectedTrip}
        onClose={() => setSelectedTrip(null)}
        onOpenPackage={(code) => {
          setSelectedTrip(null);
          navigation.navigate('TrackExpress', { presetCode: code });
        }}
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
  tripCard: {
    borderLeftColor: '#f59e0b',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  barcode: { color: '#d8b4fe', fontSize: 14, fontWeight: '900', fontFamily: 'monospace', flex: 1 },
  tripNumber: { color: '#fcd34d', fontSize: 18, fontWeight: '900', fontFamily: 'monospace', flex: 1 },
  status: { color: '#7dd3fc', fontSize: 11, fontWeight: '900' },
  route: { color: '#94a3b8', fontSize: 12, marginTop: 6 },
  meta: { color: '#64748b', fontSize: 11, marginTop: 4 },
  tripHint: { color: '#64748b', fontSize: 11, marginTop: 8, fontStyle: 'italic' },
});
