import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import PkgActionModal from '../components/PkgActionModal';
import PkgEditModal from '../components/PkgEditModal';
import PkgOrdersModal from '../components/PkgOrdersModal';
import OrderBarcodeModal, { type OrderBarcodeData } from '../components/OrderBarcodeModal';
import OnlineRequiredBanner from '../components/OnlineRequiredBanner';
import {
  cancelPackedShipment,
  listPackedShipmentRows,
} from '../services/inventoryService';
import { packOrderBarcodeData } from '../utils/orderBarcodeData';
import type { PackedShipmentListRow } from '../types/inventory';
import { fmt, getPackStatusLabel, resolveAppError, useTranslation } from '../i18n';
import { packStatusStyle, canEditPackedShipment } from '../utils/packDisplayStatus';
import { resolvePackOrderCount, stockUnitLabel } from '../utils/itemFieldFormat';
import { packDestinationFromBarcode } from '../utils/packageNumber';
import { regionDisplayLabel } from '../constants/destinationOptions';
import { showTaskSuccess } from '../utils/taskSuccessAlert';
import { canEditOwnedRecord, resolveOwnerKeyForListItem } from '../utils/storeOwnership';

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PkgScreen() {
  const { store, hubCode, operatorName } = useAuth();
  const { t, fmt, language } = useTranslation();
  const [search, setSearch] = useState('');
  const [packs, setPacks] = useState<PackedShipmentListRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [actionPack, setActionPack] = useState<PackedShipmentListRow | null>(null);
  const [editPack, setEditPack] = useState<PackedShipmentListRow | null>(null);
  const [ordersPack, setOrdersPack] = useState<PackedShipmentListRow | null>(null);
  const [orderBarcodeData, setOrderBarcodeData] = useState<OrderBarcodeData | null>(null);
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

  const openPrint = (pack: PackedShipmentListRow) => {
    const dest = packDestinationFromBarcode(pack.bundle_barcode);
    setOrderBarcodeData(
      packOrderBarcodeData({
        name: pack.bundle_name,
        barcode: pack.bundle_barcode,
        spec: pack.spec,
        unit: pack.unit,
        weight: pack.weight,
        destination: dest || undefined,
      }),
    );
    setActionPack(null);
  };

  return (
    <View style={styles.root}>
      <View style={styles.onlineBannerWrap}>
        <OnlineRequiredBanner />
      </View>
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

      <FlatList
        data={packs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={packs.length === 0 ? styles.emptyList : styles.list}
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
          <Text style={styles.empty}>{t.pkg.empty}</Text>
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
                      Alert.alert(
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
        onPrint={() => {
          if (!actionPack) return;
          openPrint(actionPack);
        }}
        onViewOrders={() => {
          if (!actionPack) return;
          setOrdersPack(actionPack);
          setActionPack(null);
        }}
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

      <OrderBarcodeModal
        visible={!!orderBarcodeData}
        data={orderBarcodeData}
        onClose={() => setOrderBarcodeData(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  onlineBannerWrap: { marginHorizontal: 16, marginTop: 16, marginBottom: -6 },
  search: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
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
