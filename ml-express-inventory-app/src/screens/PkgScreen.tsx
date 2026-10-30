import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { easedScrollSpan } from '../components/CollapsingHomeHeader';
import ScrollPositionRail from '../components/ScrollPositionRail';
import { useAuth } from '../contexts/AuthContext';
import PkgActionModal from '../components/PkgActionModal';
import PkgEditModal from '../components/PkgEditModal';
import PkgOrdersModal from '../components/PkgOrdersModal';
import PhoneBarcodeScanModal from '../components/PhoneBarcodeScanModal';
import { runBarcodeLabelPrintWithAlert } from '../services/labelPrintFlow';
import { packOrderBarcodeData } from '../utils/orderBarcodeData';
import {
  cancelPackedShipment,
  listPackedShipmentRows,
} from '../services/inventoryService';
import type { PackedShipmentListRow } from '../types/inventory';
import { fmt, getPackStatusLabel, resolveAppError, useTranslation } from '../i18n';
import { packStatusStyle, canEditPackedShipment, type PackDisplayStatus } from '../utils/packDisplayStatus';
import { normalizeScanCode } from '../utils/barcodeScan';
import { resolvePackOrderCount, stockUnitLabel } from '../utils/itemFieldFormat';
import { packDestinationFromBarcode } from '../utils/packageNumber';
import { regionDisplayLabel } from '../constants/destinationOptions';
import { showTaskSuccess } from '../utils/taskSuccessAlert';
import { feedbackService } from '../services/FeedbackService';
import { canEditOwnedRecord, resolveOwnerKeyForListItem } from '../utils/storeOwnership';

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PkgScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { store, hubCode, operatorName } = useAuth();
  const { t, fmt, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [listViewport, setListViewport] = useState(0);
  const [listContent, setListContent] = useState(0);
  const headerBodyHeight = easedScrollSpan(scrollY, 56, 48, 0);
  const headerOpacity = easedScrollSpan(scrollY, 56, 1, 0);
  const headerLift = easedScrollSpan(scrollY, 56, 0, -10);
  const onListScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false },
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | PackDisplayStatus>('');
  const [scanVisible, setScanVisible] = useState(false);
  const [packs, setPacks] = useState<PackedShipmentListRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [actionPack, setActionPack] = useState<PackedShipmentListRow | null>(null);
  const [editPack, setEditPack] = useState<PackedShipmentListRow | null>(null);
  const [ordersPack, setOrdersPack] = useState<PackedShipmentListRow | null>(null);
  const [unpacking, setUnpacking] = useState(false);

  const load = useCallback(async () => {
    const scope = store && hubCode ? { store, hubCode } : undefined;
    setPacks(await listPackedShipmentRows(search, scope));
  }, [search, store, hubCode]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    void load();
  }, [search]);

  const visiblePacks = statusFilter
    ? packs.filter((pack) => pack.display_status === statusFilter)
    : packs;
  const statusOptions: PackDisplayStatus[] = ['pending_load', 'loaded', 'arrived', 'completed'];

  const applyScannedCode = (raw: string) => {
    const code = normalizeScanCode(raw);
    setScanVisible(false);
    if (!code) return;
    setStatusFilter('');
    setSearch(code);
    const scope = store && hubCode ? { store, hubCode } : undefined;
    void listPackedShipmentRows(code, scope).then((rows) => {
      setPacks(rows);
      if (rows.length === 1) setActionPack(rows[0]);
    });
  };

  return (
    <View style={styles.root}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#0f172a' }}>
        <Animated.View
          style={[
            styles.navRow,
            { height: headerBodyHeight, opacity: headerOpacity, transform: [{ translateY: headerLift }] },
          ]}
        >
          <Pressable
            style={styles.homeBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Home"
          >
            <Text style={styles.homeChevron}>‹</Text>
            <Text style={styles.homeLabel}>Home</Text>
          </Pressable>
          <Text style={styles.screenTitle} numberOfLines={1}>{t.nav.pkg}</Text>
        </Animated.View>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.search}
            placeholder={t.pkg.search}
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => void load()}
            returnKeyType="search"
            accessibilityLabel={t.common.search}
          />
          <Pressable
            style={styles.scanBtn}
            onPress={() => {
              Keyboard.dismiss();
              setScanVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t.scanInput.scanBtn}
          >
            <Text style={styles.scanBtnText}>{t.scanInput.scanBtn}</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusRow}
        >
          {statusOptions.map((status) => {
            const active = statusFilter === status;
            const tone = packStatusStyle(status);
            return (
              <Pressable
                key={status}
                style={[styles.statusChip, active && { backgroundColor: tone.badgeBg, borderColor: tone.border }]}
                onPress={() => setStatusFilter(active ? '' : status)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.statusChipText, active && { color: tone.badgeText }]}>
                  {getPackStatusLabel(language, status)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.listView} onLayout={(event) => setListViewport(event.nativeEvent.layout.height)}>
      <Animated.FlatList
        data={visiblePacks}
        keyExtractor={(item) => item.id}
        style={styles.listView}
        contentContainerStyle={visiblePacks.length === 0 ? styles.emptyList : styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        decelerationRate="normal"
        onScroll={onListScroll}
        scrollEventThrottle={16}
        onContentSizeChange={(_, height) => setListContent(height)}
        onRefresh={async () => {
          setRefreshing(true);
          try {
            await load();
          } finally {
            setRefreshing(false);
          }
        }}
        refreshing={refreshing}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {packs.length > 0 && visiblePacks.length === 0 ? t.pkg.noStatus : t.pkg.empty}
          </Text>
        }
        renderItem={({ item }) => {
          const statusStyle = packStatusStyle(item.display_status);
          const statusLabel = getPackStatusLabel(language, item.display_status);
          const dest = packDestinationFromBarcode(item.bundle_barcode);
          const orderCount = resolvePackOrderCount(item);

          return (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                { borderLeftColor: statusStyle.border },
                pressed && styles.cardPressed,
              ]}
              onPress={() => setActionPack(item)}
              accessibilityLabel={fmt(t.pkg.a11yPack, {
                barcode: item.bundle_name,
                status: statusLabel,
              })}
              accessibilityRole="button"
            >
              <View style={styles.cardTop}>
                <View style={styles.titleBlock}>
                  <Text style={styles.packName} numberOfLines={1}>
                    {item.bundle_name}
                  </Text>
                  {dest ? (
                    <Text style={styles.destTag} numberOfLines={1}>
                      → {dest}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.badgeBg }]}>
                  <Text style={[styles.statusBadgeText, { color: statusStyle.badgeText }]}>
                    {statusLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.barcodeRow}>
                <View style={styles.barcodePill}>
                  <Text style={styles.barcodeLabel}>{t.pkg.packNo}</Text>
                  <Text style={styles.barcodeValue} numberOfLines={1}>
                    {item.bundle_barcode}
                  </Text>
                </View>
                <View style={styles.countInline}>
                  <Text style={styles.countText}>{orderCount}</Text>
                  <Text style={styles.countUnit}>{stockUnitLabel()}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>

              {(item.spec || item.unit || item.weight) ? (
                <Text style={styles.meta} numberOfLines={1}>
                  {[item.spec, item.unit, item.weight].filter(Boolean).join(' · ')}
                </Text>
              ) : null}

              {item.loaded && item.transport_fee?.trim() ? (
                <View style={styles.feePill}>
                  <Text style={styles.feePillLabel}>{t.pkg.transportFee}</Text>
                  <Text style={styles.feePillValue}>
                    {item.truck_leg_destination
                      ? fmt(t.pkg.legPrefix, { dest: regionDisplayLabel(item.truck_leg_destination) })
                      : ''}
                    {item.transport_fee} MMK
                  </Text>
                </View>
              ) : null}

              <View style={styles.noteRow}>
                <Text style={styles.noteText}>
                  {t.pkg.packer}：{item.operator || '—'}
                </Text>
                <Text style={styles.noteSep}>·</Text>
                <Text style={styles.footer}>{formatTime(item.created_at)}</Text>
              </View>
            </Pressable>
          );
        }}
      />
      <ScrollPositionRail scrollY={scrollY} viewportHeight={listViewport} contentHeight={listContent} />
      </View>

      <PkgActionModal
        visible={!!actionPack}
        pack={actionPack}
        canEdit={
          !!actionPack &&
          !!store &&
          canEditPackedShipment(actionPack) &&
          canEditOwnedRecord(
            store,
            actionPack.owner_store_code || resolveOwnerKeyForListItem({
              owner_store_code: actionPack.owner_store_code,
              barcode: actionPack.bundle_barcode,
              destination: '',
            }),
          )
        }
        canUnpack={
          !!actionPack &&
          !!store &&
          actionPack.display_status === 'pending_load' &&
          !actionPack.loaded &&
          canEditOwnedRecord(
            store,
            actionPack.owner_store_code || resolveOwnerKeyForListItem({
              owner_store_code: actionPack.owner_store_code,
              barcode: actionPack.bundle_barcode,
              destination: '',
            }),
          )
        }
        unpacking={unpacking}
        onUnpack={() => {
          if (!actionPack || !store || unpacking) return;
          Alert.alert(
            t.pkg.unpackTitle,
            fmt(t.pkg.unpackBody, { barcode: actionPack.bundle_barcode }),
            [
              { text: t.common.cancel, style: 'cancel' },
              {
                text: t.common.confirm,
                style: 'destructive',
                onPress: () => {
                  void (async () => {
                    setUnpacking(true);
                    try {
                      const { restoredCount } = await cancelPackedShipment(
                        actionPack.id,
                        operatorName ?? t.common.operator,
                        store,
                      );
                      showTaskSuccess(
                        t.pkg.unpackSuccess,
                        `${actionPack.bundle_barcode} · ${restoredCount}`,
                      );
                      setActionPack(null);
                      await load();
                    } catch (e: unknown) {
                      feedbackService.notify(
                        t.pkg.unpackFailed,
                        resolveAppError(t, e),
                      );
                    } finally {
                      setUnpacking(false);
                    }
                  })();
                },
              },
            ],
          );
        }}
        onClose={() => setActionPack(null)}
        onEdit={() => {
          if (!actionPack) return;
          setEditPack(actionPack);
          setActionPack(null);
        }}
        onViewOrders={() => {
          if (!actionPack) return;
          setOrdersPack(actionPack);
          setActionPack(null);
        }}
        onPrint={
          actionPack
            ? () => {
                const pack = actionPack;
                const dest = packDestinationFromBarcode(pack.bundle_barcode);
                const data = packOrderBarcodeData({
                  name: pack.bundle_name,
                  barcode: pack.bundle_barcode,
                  destination: dest || undefined,
                });
                setActionPack(null);
                runBarcodeLabelPrintWithAlert(data, t);
              }
            : undefined
        }
      />

      <PkgEditModal
        visible={!!editPack}
        pack={editPack}
        onClose={() => setEditPack(null)}
        onSaved={() => void load()}
      />

      <PkgOrdersModal
        visible={!!ordersPack}
        pack={ordersPack}
        onClose={() => setOrdersPack(null)}
      />
      <PhoneBarcodeScanModal
        visible={scanVisible}
        onClose={() => setScanVisible(false)}
        onScanned={applyScannedCode}
        title={t.nav.pkg}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  listView: { flex: 1 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: 16,
    gap: 10,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 18,
    backgroundColor: '#334155',
    gap: 2,
  },
  homeChevron: { color: '#f8fafc', fontSize: 26, lineHeight: 28, marginTop: -2 },
  homeLabel: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  screenTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '800', flexShrink: 1 },
  onlineBannerWrap: { marginBottom: 8 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  search: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 40,
    fontSize: 14,
    color: '#0f172a',
  },
  scanBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 12,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBtnText: { color: '#f8fafc', fontWeight: '800', fontSize: 14 },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#475569',
  },
  statusChipText: { color: '#e2e8f0', fontSize: 13, fontWeight: '800' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyList: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 24 },
  empty: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 48,
    lineHeight: 22,
    fontSize: 14,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(51,65,85,0.6)',
  },
  cardPressed: {
    backgroundColor: '#243044',
    borderColor: '#475569',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  packName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  destTag: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexShrink: 0,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '900' },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  barcodePill: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.28)',
  },
  barcodeLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  barcodeValue: {
    color: '#d8b4fe',
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  countInline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(148,163,184,0.1)',
    borderRadius: 8,
  },
  countText: { color: '#e2e8f0', fontSize: 16, fontWeight: '900', lineHeight: 18 },
  countUnit: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  chevron: {
    color: '#64748b',
    fontSize: 22,
    fontWeight: '300',
    marginLeft: -2,
  },
  meta: { color: '#94a3b8', fontSize: 11, marginTop: 8, fontFamily: 'monospace' },
  feePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(217,119,6,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
  },
  feePillLabel: { color: '#fbbf24', fontSize: 10, fontWeight: '800' },
  feePillValue: { color: '#fde68a', fontSize: 12, fontWeight: '800' },
  noteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  noteText: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  noteSep: { color: '#475569', fontSize: 11 },
  footer: { color: '#64748b', fontSize: 11, fontWeight: '600' },
});
