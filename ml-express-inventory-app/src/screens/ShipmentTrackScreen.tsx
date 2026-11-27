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
import CollapsingHomeHeader, { useCollapsingHomeScroll } from '../components/CollapsingHomeHeader';
import ScrollPositionRail from '../components/ScrollPositionRail';
import TripPackagesModal from '../components/TripPackagesModal';
import { useAuth } from '../contexts/AuthContext';
import { getPkgStatusLabel, resolveAppError, useTranslation } from '../i18n';
import {
  listInboundPackages,
  listOutboundPackagesFromOrigin,
} from '../services/trackingService';
import type { PkgTrackingDetail } from '../types/tracking';
import { regionDisplayLabel } from '../constants/destinationOptions';
import { formatDisplayDate } from '../utils/dateFormat';
import { resolveStoreHubCode } from '../utils/storeZone';
import {
  effectivePkgTrackingStatus,
  isActiveInboundTrackingPack,
  isActiveOutboundTrackingPack,
  slowestTripStatus,
} from '../utils/shipmentTrackVisibility';
import { parseTripTransportFee } from '../utils/tripTransportFee';
import { outboundTrackRowCount, splitOutboundByTrip, type TruckTripSummary } from '../utils/truckTripGroups';

type Tab = 'inbound' | 'outbound';

type Nav = {
  navigate: (name: string, params?: { presetCode?: string }) => void;
  goBack: () => void;
};

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
        <Text style={styles.status}>{getPkgStatusLabel(t, effectivePkgTrackingStatus(item))}</Text>
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
      {parseTripTransportFee(item.transport_fee) <= 0 ? (
        <Text style={styles.feeMissing}>{t.shipmentTrack.feeMissing}</Text>
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
          <Text style={styles.status}>{getPkgStatusLabel(t, slowestTripStatus(trip.packages))}</Text>
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
          {parseTripTransportFee(trip.transportFee) > 0
            ? `${trip.outboundDate ? ' · ' : ''}${fmt(t.shipmentTrack.tripCardFee, { fee: trip.transportFee })}`
            : ''}
        </Text>
        {parseTripTransportFee(trip.transportFee) <= 0 ? (
          <Text style={styles.feeMissing}>{t.shipmentTrack.feeMissing}</Text>
        ) : null}
        <Text style={styles.tripHint}>{t.shipmentTrack.tripCardHint}</Text>
      </View>
    </Pressable>
  );
}

export default function ShipmentTrackScreen({ navigation }: { navigation: Nav }) {
  const { t, fmt } = useTranslation();
  const { scrollY, onScroll } = useCollapsingHomeScroll();
  const [listViewport, setListViewport] = useState(0);
  const [listContent, setListContent] = useState(0);
  const { store } = useAuth();
  const hubCode = store ? resolveStoreHubCode(store) : '';
  const [tab, setTab] = useState<Tab>('inbound');
  const [inbound, setInbound] = useState<PkgTrackingDetail[]>([]);
  const [outbound, setOutbound] = useState<PkgTrackingDetail[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<TruckTripSummary | null>(null);

  const load = useCallback(async () => {
    if (!store) return;
    try {
      const [inList, outList] = await Promise.all([
        listInboundPackages(hubCode),
        listOutboundPackagesFromOrigin(store.storeCode),
      ]);
      setInbound(inList.filter((pack) => isActiveInboundTrackingPack(pack, hubCode)));
      setOutbound(outList.filter((pack) => isActiveOutboundTrackingPack(pack)));
      setLoadError('');
    } catch (error) {
      setLoadError(resolveAppError(t, error) || t.shipmentTrack.loadFailed);
    }
  }, [store, hubCode, t]);

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
  const outboundCount = outboundTrackRowCount(outbound);

  return (
    <View style={styles.root}>
      <CollapsingHomeHeader title={t.nav.shipmentTrack} onHome={() => navigation.goBack()} scrollY={scrollY} />
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

      <View style={styles.listView} onLayout={(event) => setListViewport(event.nativeEvent.layout.height)}>
      <FlatList<OutboundListItem | PkgTrackingDetail>
        style={styles.listView}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onContentSizeChange={(_, height) => setListContent(height)}
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
              try {
                await load();
              } finally {
                setRefreshing(false);
              }
            }}
          />
        }
        ListHeaderComponent={
          loadError ? (
            <View style={styles.inlineError}>
              <Text style={styles.errorText}>{loadError}</Text>
              <Pressable
                style={styles.retryBtn}
                onPress={() => void load()}
                accessibilityRole="button"
                accessibilityLabel={t.common.retry}
              >
                <Text style={styles.retryBtnText}>{t.common.retry}</Text>
              </Pressable>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loadError ? null : (
            <Text style={styles.empty}>
              {tab === 'inbound'
                ? fmt(t.shipmentTrack.emptyInbound, { hub: regionDisplayLabel(hubCode) })
                : t.shipmentTrack.emptyOutbound}
            </Text>
          )
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
      <ScrollPositionRail scrollY={scrollY} viewportHeight={listViewport} contentHeight={listContent} />
      </View>

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
  listView: { flex: 1 },
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
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.28)',
  },
  errorText: { color: '#fca5a5', flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  retryBtn: {
    backgroundColor: '#7f1d1d',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  retryBtnText: { color: '#fecaca', fontSize: 12, fontWeight: '800' },
  feeMissing: { color: '#fcd34d', fontSize: 12, marginTop: 6, fontWeight: '800' },
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
