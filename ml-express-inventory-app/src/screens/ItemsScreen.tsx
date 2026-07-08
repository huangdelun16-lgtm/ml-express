import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import ItemActionModal from '../components/ItemActionModal';
import ItemViewModal from '../components/ItemViewModal';
import PaidStampWatermark from '../components/PaidStampWatermark';
import OrderBarcodeModal, { type OrderBarcodeData } from '../components/OrderBarcodeModal';
import PackExpressModal from '../components/PackExpressModal';
import RegionFilterBar from '../components/RegionFilterBar';
import { useAuth } from '../contexts/AuthContext';
import type { BatchPrintEntry, LabelPrintPayload } from '../services/printerService';
import { printBatchLabels } from '../services/printerService';
import { requestAutoCloudSync } from '../services/cloudAutoSync';
import {
  createPackedShipment,
  canEditItemCustomerProfileForStore,
  listItems,
  listPackableItems,
  syncInboundHubPacksToLocal,
} from '../services/inventoryService';
import { canMarkCustomerSigned } from '../utils/customerSign';
import { confirmAndMarkCustomerSigned } from '../utils/customerSignConfirm';
import {
  canEditItemCustomerProfile,
} from '../utils/itemCustomerProfileEdit';
import type { InventoryItem, InventoryItemListRow } from '../types/inventory';
import {
  isCustomerSignedItem,
  resolveItemCardQty,
  stockUnitLabel,
} from '../utils/itemFieldFormat';
import {
  collectItemDestinationCodes,
  formatMixedRegionPackConfirmMessage,
  resolveItemDestinationCode,
} from '../utils/itemDestination';
import { isExpressPackItem } from '../utils/packItem';
import { inboundOrderBarcodeData, packOrderBarcodeData } from '../utils/orderBarcodeData';
import { packDestinationFromBarcode } from '../utils/packageNumber';
import { regionDisplayLabel } from '../constants/destinationOptions';
import { showTaskSuccess } from '../utils/taskSuccessAlert';
import { resolveAppError, resolvePrintError, useTranslation, getItemCustomerProfileEditDeniedMessage } from '../i18n';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = {
  navigate: (name: keyof RootStackParamList, params?: object) => void;
};

type ItemsRoute = RouteProp<RootStackParamList, 'Items'>;

type ListMode = 'normal' | 'pack' | 'print';

export default function ItemsScreen({ navigation }: { navigation: Nav }) {
  const route = useRoute<ItemsRoute>();
  const incompleteOnly = route.params?.incompleteOnly ?? false;
  const { operatorName, store, hubCode } = useAuth();
  const { t, fmt } = useTranslation();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<InventoryItemListRow[]>([]);
  const [listMode, setListMode] = useState<ListMode>('normal');
  const [filterRegion, setFilterRegion] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchPrinting, setBatchPrinting] = useState(false);
  const [packModalVisible, setPackModalVisible] = useState(false);
  const [actionItem, setActionItem] = useState<InventoryItemListRow | null>(null);
  const [actionCanEdit, setActionCanEdit] = useState(false);
  const [viewItemId, setViewItemId] = useState<string | null>(null);
  const [orderBarcodeRequireDone, setOrderBarcodeRequireDone] = useState(false);
  const [packSuccessInfo, setPackSuccessInfo] = useState<{
    name: string;
    barcode: string;
    count: number;
  } | null>(null);
  const [orderBarcodeData, setOrderBarcodeData] = useState<OrderBarcodeData | null>(null);

  const load = useCallback(async () => {
    const scope = store && hubCode ? { store, hubCode } : undefined;
    setItems(
      listMode === 'pack'
        ? await listPackableItems(search, scope)
        : await listItems(search, scope),
    );

    if (store && hubCode) {
      requestAutoCloudSync(store, hubCode);
      void (async () => {
        try {
          await syncInboundHubPacksToLocal(store, hubCode, operatorName ?? t.common.operator);
          setItems(
            listMode === 'pack'
              ? await listPackableItems(search, scope)
              : await listItems(search, scope),
          );
        } catch {
          // 弱网/离线：保留已展示的本地列表
        }
      })();
    }
  }, [search, listMode, store, hubCode, operatorName, t.common.operator]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    void load();
  }, [listMode]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [listMode, filterRegion]);

  useEffect(() => {
    if (!actionItem || !store) {
      setActionCanEdit(false);
      return;
    }
    if (isExpressPackItem(actionItem)) {
      setActionCanEdit(false);
      return;
    }
    const syncOk = canEditItemCustomerProfile(store, actionItem, hubCode ?? undefined);
    if (!syncOk) {
      setActionCanEdit(false);
      return;
    }
    void (async () => {
      const ok = await canEditItemCustomerProfileForStore(store, actionItem.id, hubCode ?? undefined);
      setActionCanEdit(ok);
    })();
  }, [actionItem, store, hubCode]);

  const displayedItems = useMemo(() => {
    let list = items.filter((i) => !isExpressPackItem(i));
    if (filterRegion) list = list.filter((i) => resolveItemDestinationCode(i) === filterRegion);
    if (incompleteOnly) {
      list = list.filter((item) => {
        if (isCustomerSignedItem(item)) return false;
        const name = item.customer_name?.trim() || item.recipient_name?.trim();
        const dest = (item.final_destination || item.destination || '').trim();
        return !name || !dest;
      });
    }
    return [...list].sort((a, b) => {
      const aSigned = isCustomerSignedItem(a) ? 1 : 0;
      const bSigned = isCustomerSignedItem(b) ? 1 : 0;
      if (aSigned !== bSigned) return aSigned - bSigned;
      if (aSigned === 1) {
        const aTs = a.customer_signed_at?.trim() || a.updated_at;
        const bTs = b.customer_signed_at?.trim() || b.updated_at;
        return new Date(aTs).getTime() - new Date(bTs).getTime();
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [items, filterRegion, incompleteOnly]);

  const selectedItems = useMemo(
    () => displayedItems.filter((i) => selectedIds.has(i.id)),
    [displayedItems, selectedIds],
  );

  const selectActive = listMode !== 'normal';
  const selectAccent = listMode === 'pack' ? '#7c3aed' : '#0ea5e9';

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setListMode('normal');
    setSelectedIds(new Set());
    setPackModalVisible(false);
  };

  const toBatchPrintEntry = (item: InventoryItemListRow): BatchPrintEntry => {
    if (isExpressPackItem(item)) {
      const dest = packDestinationFromBarcode(item.barcode) || item.destination;
      return {
        kind: 'pack',
        barcode: item.barcode,
        label: {
          name: item.name,
          barcode: item.barcode,
          spec: item.spec,
          unit: item.unit,
          weight: item.weight,
          destination: dest || undefined,
          customerName: item.customer_name,
        },
      };
    }
    return {
      kind: 'inbound',
      barcode: item.barcode,
      inputBarcode: item.input_barcode || undefined,
      label: {
        name: item.name,
        barcode: item.barcode,
        inputBarcode: item.input_barcode || undefined,
        destination: item.destination || undefined,
        customerName: item.customer_name,
      },
    };
  };

  const handleBatchPrint = async () => {
    if (selectedIds.size === 0) {
      Alert.alert(t.common.tip, t.items.alertSelectPrint);
      return;
    }
    setBatchPrinting(true);
    try {
      const entries = selectedItems.map(toBatchPrintEntry);
      const ok = await printBatchLabels(entries);
      if (!ok) {
        Alert.alert(t.common.tip, t.settings.printDisabled);
        return;
      }
      Alert.alert(t.settings.printSentTitle, t.settings.printSentBody, [
        { text: t.common.ok, onPress: exitSelectMode },
      ]);
    } catch (e: unknown) {
      Alert.alert(t.settings.printFailed, resolvePrintError(t, e));
    } finally {
      setBatchPrinting(false);
    }
  };

  const openPackModal = () => {
    if (selectedIds.size === 0) {
      Alert.alert(t.common.tip, t.items.alertSelectPack);
      return;
    }

    const regionCodes = collectItemDestinationCodes(selectedItems);
    const confirmMessage = formatMixedRegionPackConfirmMessage(regionCodes);
    if (confirmMessage) {
      Alert.alert(t.items.alertMixedRegion, t.items.alertMixedRegionBody, [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.common.confirm, onPress: () => setPackModalVisible(true) },
      ]);
      return;
    }

    setPackModalVisible(true);
  };

  const handlePackSubmit = async (bundle: {
    barcode: string;
    name: string;
    spec: string;
    unit: string;
    weight: string;
    note: string;
  }) => {
    const packedCount = selectedIds.size;
    if (!store) throw new Error(t.common.notLoggedIn);
    const { bundleItem } = await createPackedShipment({
      operator: operatorName ?? t.common.operator,
      originStore: {
        id: store.id,
        storeCode: store.storeCode,
        storeName: store.storeName,
      },
      itemIds: [...selectedIds],
      bundle,
    });
    setPackSuccessInfo({
      name: bundleItem.name,
      barcode: bundleItem.barcode,
      count: packedCount,
    });
    showTaskSuccess(
      t.items.packSuccess,
      `${bundleItem.name}\n${bundleItem.barcode}`,
    );
    setSelectedIds(new Set());
    await load();
    openPackBarcode(
      {
        name: bundleItem.name,
        barcode: bundleItem.barcode,
        spec: bundle.spec,
        unit: bundle.unit,
        weight: bundle.weight,
      },
      true,
    );
  };

  const openPackBarcode = (payload: LabelPrintPayload, requireDone = false) => {
    setOrderBarcodeData(packOrderBarcodeData(payload));
    setOrderBarcodeRequireDone(requireDone);
  };

  const openPackItemPrint = (item: InventoryItem) => {
    const dest = packDestinationFromBarcode(item.barcode) || item.destination;
    setActionItem(null);
    openPackBarcode({
      name: item.name,
      barcode: item.barcode,
      spec: item.spec,
      unit: item.unit,
      weight: item.weight,
      destination: dest || undefined,
      customerName: item.customer_name,
    });
  };

  const openOrderItemPrint = (item: InventoryItem) => {
    setActionItem(null);
    setOrderBarcodeData(inboundOrderBarcodeData(item));
    setOrderBarcodeRequireDone(false);
  };

  const handleItemPrint = (item: InventoryItem) => {
    if (isExpressPackItem(item)) openPackItemPrint(item);
    else openOrderItemPrint(item);
  };

  const closeOrderBarcode = () => {
    const wasPackFlow = orderBarcodeRequireDone;
    setOrderBarcodeData(null);
    setOrderBarcodeRequireDone(false);
    if (wasPackFlow) setPackSuccessInfo(null);
  };

  const handlePackPrintDone = () => {
    setOrderBarcodeData(null);
    setOrderBarcodeRequireDone(false);
    setPackSuccessInfo(null);
    exitSelectMode();
    void load();
  };

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <TextInput
          style={styles.search}
          placeholder={
            listMode === 'pack' ? t.items.searchPack : t.items.searchList
          }
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => load()}
          returnKeyType="search"
        />
        {listMode === 'normal' ? (
          <Pressable style={styles.addBtn} onPress={() => navigation.navigate('ItemForm')}>
            <Text style={styles.addText}>{t.items.newBtn}</Text>
          </Pressable>
        ) : null}
      </View>

      {incompleteOnly ? (
        <View style={styles.incompleteBanner}>
          <Text style={styles.incompleteBannerText}>{t.items.incompleteFilterBanner}</Text>
        </View>
      ) : null}

      <RegionFilterBar value={filterRegion} onChange={setFilterRegion} />

      <View style={styles.actionRow}>
        {listMode === 'normal' ? (
          <>
            <Pressable
              style={styles.packBtn}
              onPress={() => {
                setFilterRegion('');
                setListMode('pack');
              }}
            >
              <Text style={styles.packBtnText}>{t.items.packBtn}</Text>
            </Pressable>
            <Pressable style={styles.printSelectBtn} onPress={() => setListMode('print')}>
              <Text style={styles.printSelectBtnText}>{t.items.multiSelect}</Text>
            </Pressable>
          </>
        ) : listMode === 'pack' ? (
          <>
            <Pressable style={styles.ghostBtn} onPress={exitSelectMode}>
              <Text style={styles.ghostBtnText}>{t.items.cancelSelect}</Text>
            </Pressable>
            <Text style={styles.packHint}>{t.items.packHint}</Text>
            <Pressable
              style={[styles.packBtn, selectedIds.size === 0 && styles.packBtnDisabled]}
              onPress={openPackModal}
            >
              <Text style={styles.packBtnText}>{fmt(t.items.nextStep, { count: selectedIds.size })}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable style={styles.ghostBtn} onPress={exitSelectMode}>
              <Text style={styles.ghostBtnText}>{t.items.cancelSelect}</Text>
            </Pressable>
            <Text style={styles.packHint}>{t.items.printHint}</Text>
            <Pressable
              style={[
                styles.printBtn,
                (selectedIds.size === 0 || batchPrinting) && styles.packBtnDisabled,
              ]}
              onPress={() => void handleBatchPrint()}
              disabled={batchPrinting}
            >
              <Text style={styles.printBtnText}>
                {batchPrinting
                  ? t.items.printing
                  : fmt(t.items.printLabels, { count: selectedIds.size })}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <FlatList
        data={displayedItems}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {listMode === 'pack'
              ? t.items.noPackable
              : filterRegion
                ? fmt(t.items.noRegion, { region: regionDisplayLabel(filterRegion) })
                : t.items.empty}
          </Text>
        }
        renderItem={({ item }) => {
          const selected = selectedIds.has(item.id);
          const cardQty = resolveItemCardQty(item);
          const meta = [item.spec, item.unit, item.weight].filter(Boolean).join(' · ');
          const regionCode = resolveItemDestinationCode(item);
          const transitShipped = item.hub_transit_shipped;
          const transitReleased = item.hub_transit_released && !transitShipped;
          const transitPendingAtHub =
            item.packed &&
            !transitReleased &&
            !transitShipped &&
            !item.hub_arrived &&
            regionCode &&
            hubCode &&
            regionCode.toUpperCase() !== hubCode.toUpperCase();
          const packBarcode =
            item.packed && !transitReleased ? item.parent_pack_barcode?.trim() : '';
          const signedDone = isCustomerSignedItem(item);

          return (
            <Pressable
              style={[
                styles.row,
                selectActive && selected && { borderColor: selectAccent, backgroundColor: '#1a2332' },
              ]}
              onPress={() => {
                if (selectActive) toggleSelect(item.id);
                else setActionItem(item);
              }}
            >
              {selectActive ? (
                <SelectCheck selected={selected} accent={selectAccent} />
              ) : null}
              <View style={styles.cardBody}>
                {signedDone ? <PaidStampWatermark /> : null}
                <View style={styles.cardTop}>
                  <View style={styles.cardMain}>
                    <Text style={styles.topLine} numberOfLines={1}>
                      <Text style={styles.customer}>
                        {item.customer_name?.trim() || item.recipient_name?.trim() || t.items.noCustomer}
                      </Text>
                      {regionCode ? (
                        <Text style={styles.destination}> · {regionDisplayLabel(regionCode)}</Text>
                      ) : item.destination ? (
                        <Text style={styles.destination}> · {item.destination}</Text>
                      ) : null}
                    </Text>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.statusBadge,
                          isCustomerSignedItem(item)
                            ? styles.statusSignedDone
                            : transitShipped
                              ? styles.statusTransitShipped
                              : transitReleased
                                ? styles.statusTransitReleased
                                : transitPendingAtHub
                                  ? styles.statusTransitReleased
                                  : item.hub_arrived
                                  ? styles.statusHubArrived
                                  : item.stocked_in
                                    ? styles.statusInDone
                                    : styles.statusInPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            isCustomerSignedItem(item)
                              ? styles.statusSignedDoneText
                              : transitShipped
                                ? styles.statusTransitShippedText
                                : transitReleased
                                  ? styles.statusTransitReleasedText
                                  : transitPendingAtHub
                                    ? styles.statusTransitReleasedText
                                    : item.hub_arrived
                                    ? styles.statusHubArrivedText
                                    : item.stocked_in
                                      ? styles.statusInDoneText
                                      : styles.statusInPendingText,
                          ]}
                        >
                          {isCustomerSignedItem(item)
                            ? t.items.statusSigned
                            : transitShipped
                              ? t.items.statusTransferred
                              : transitReleased
                                ? t.items.statusPendingOut
                                : transitPendingAtHub
                                  ? t.items.statusPendingTransit
                                  : item.hub_arrived
                                  ? t.items.statusArrived
                                  : item.stocked_in
                                    ? t.items.statusInbound
                                    : t.items.statusNotInbound}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          item.packed && !transitReleased
                            ? styles.statusPackDone
                            : styles.statusPackPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            item.packed && !transitReleased
                              ? styles.statusPackDoneText
                              : styles.statusPackPendingText,
                          ]}
                        >
                          {item.packed && !transitReleased ? t.items.statusPacked : t.items.statusNotPacked}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.qtyBox}>
                    <Text style={styles.qty}>{cardQty}</Text>
                    <Text style={styles.unit}>{stockUnitLabel()}</Text>
                  </View>
                </View>

                <View style={styles.tagRow}>
                  {packBarcode ? (
                    <View style={styles.tagPurple}>
                      <Text style={styles.tagPurpleLabel}>{t.items.packNo}</Text>
                      <Text style={styles.tagPurpleValue} numberOfLines={1}>
                        {packBarcode}
                      </Text>
                    </View>
                  ) : null}
                  {item.input_barcode ? (
                    <View style={styles.tagBlue}>
                      <Text style={styles.tagBlueLabel}>{t.items.expressNo}</Text>
                      <Text style={styles.tagBlueValue} numberOfLines={1}>
                        {item.input_barcode}
                      </Text>
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.tagYellow,
                      !item.input_barcode && !packBarcode && styles.tagYellowFull,
                    ]}
                  >
                    <Text style={styles.tagYellowLabel}>{t.items.inbound}</Text>
                    <Text style={styles.tagYellowValue} numberOfLines={1}>
                      {item.barcode}
                    </Text>
                  </View>
                </View>

                {meta ? (
                  <Text style={styles.meta} numberOfLines={1}>
                    {meta}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />

      <ItemActionModal
        visible={!!actionItem}
        item={actionItem}
        variant={actionItem && isExpressPackItem(actionItem) ? 'pack' : 'item'}
        onClose={() => setActionItem(null)}
        onView={() => {
          if (!actionItem) return;
          setViewItemId(actionItem.id);
          setActionItem(null);
        }}
        canEdit={!!actionItem && actionCanEdit}
        onEdit={() => {
          if (!actionItem || !store) return;
          if (!actionCanEdit) {
            Alert.alert(
              t.items.cannotEdit,
              getItemCustomerProfileEditDeniedMessage(t, actionItem, store, hubCode ?? undefined),
            );
            return;
          }
          const id = actionItem.id;
          setActionItem(null);
          navigation.navigate('ItemForm', { itemId: id });
        }}
        onPrint={actionItem ? () => handleItemPrint(actionItem) : undefined}
        canSignDelivered={
          !!actionItem &&
          !!store &&
          !isExpressPackItem(actionItem) &&
          canMarkCustomerSigned(store, actionItem)
        }
        onSignDelivered={
          actionItem && store
            ? () => {
                const item = actionItem;
                confirmAndMarkCustomerSigned({
                  itemId: item.id,
                  operator: operatorName ?? t.common.operator,
                  store,
                  resolveError: (e) => resolveAppError(t, e),
                  onSuccess: () => {
                    setActionItem(null);
                    showTaskSuccess(
                      t.common.signSuccess,
                      fmt(t.common.signMarked, { name: item.name }),
                    );
                    void load();
                  },
                  onError: (message) => Alert.alert(t.common.signFailed, message),
                });
              }
            : undefined
        }
      />

      <ItemViewModal
        visible={!!viewItemId}
        itemId={viewItemId}
        onClose={() => setViewItemId(null)}
        onSigned={() => void load()}
      />

      <PackExpressModal
        visible={packModalVisible}
        selectedItems={selectedItems}
        operatorName={operatorName ?? t.common.operator}
        store={store}
        onClose={() => setPackModalVisible(false)}
        onSubmit={handlePackSubmit}
      />

      <OrderBarcodeModal
        visible={!!orderBarcodeData}
        data={orderBarcodeData}
        onClose={closeOrderBarcode}
        onDone={orderBarcodeRequireDone ? handlePackPrintDone : undefined}
      />
    </View>
  );
}

function SelectCheck({ selected, accent }: { selected: boolean; accent: string }) {
  return (
    <View
      style={[
        styles.check,
        selected && { backgroundColor: accent, borderColor: accent },
      ]}
    >
      <Text style={styles.checkMark}>{selected ? '✓' : ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  toolbar: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 8 },
  incompleteBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
  },
  incompleteBannerText: { color: '#fde68a', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  search: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  addBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  addText: { color: '#fff', fontWeight: '800' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  packBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  packBtnDisabled: { opacity: 0.5 },
  packBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  printSelectBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  printSelectBtnText: { color: '#38bdf8', fontWeight: '800', fontSize: 14 },
  printBtn: {
    backgroundColor: '#0ea5e9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  printBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  ghostBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#475569',
  },
  ghostBtnText: { color: '#94a3b8', fontWeight: '700' },
  packHint: { flex: 1, color: '#64748b', fontSize: 12, minWidth: 120 },
  list: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 24 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 40, lineHeight: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginBottom: 7,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    marginRight: 8,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontWeight: '900', fontSize: 12 },
  cardBody: { flex: 1, minWidth: 0, position: 'relative' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardMain: { flex: 1, minWidth: 0 },
  topLine: { fontSize: 12, lineHeight: 16 },
  customer: { color: '#7dd3fc', fontWeight: '800' },
  destination: { color: '#a5b4fc', fontWeight: '700' },
  productName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
    lineHeight: 24,
    paddingVertical: 2,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  statusInDone: { backgroundColor: 'rgba(34,197,94,0.15)' },
  statusInPending: { backgroundColor: 'rgba(100,116,139,0.2)' },
  statusHubArrived: { backgroundColor: 'rgba(14,165,233,0.15)' },
  statusTransitReleased: { backgroundColor: 'rgba(168,85,247,0.15)' },
  statusTransitShipped: { backgroundColor: 'rgba(56,189,248,0.15)' },
  statusSignedDone: { backgroundColor: 'rgba(34,197,94,0.2)' },
  statusPackDone: { backgroundColor: 'rgba(168,85,247,0.15)' },
  statusPackPending: { backgroundColor: 'rgba(100,116,139,0.2)' },
  statusText: { fontSize: 10, fontWeight: '900' },
  statusInDoneText: { color: '#4ade80' },
  statusInPendingText: { color: '#94a3b8' },
  statusHubArrivedText: { color: '#38bdf8' },
  statusTransitReleasedText: { color: '#c4b5fd' },
  statusTransitShippedText: { color: '#38bdf8' },
  statusSignedDoneText: { color: '#4ade80' },
  statusPackDoneText: { color: '#c4b5fd' },
  statusPackPendingText: { color: '#94a3b8' },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 5,
  },
  tagBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    maxWidth: '100%',
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
  },
  tagBlueLabel: { color: '#38bdf8', fontSize: 10, fontWeight: '800' },
  tagBlueValue: {
    color: '#7dd3fc',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  tagYellow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    maxWidth: '100%',
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  tagYellowFull: { flex: 1 },
  tagYellowLabel: { color: '#fbbf24', fontSize: 10, fontWeight: '800' },
  tagYellowValue: {
    color: '#fde68a',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  tagPurple: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    maxWidth: '100%',
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.28)',
  },
  tagPurpleLabel: { color: '#c4b5fd', fontSize: 10, fontWeight: '800' },
  tagPurpleValue: {
    color: '#d8b4fe',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  meta: { color: '#64748b', fontSize: 11, marginTop: 4, fontFamily: 'monospace' },
  qtyBox: { alignItems: 'flex-end', minWidth: 34 },
  qty: { color: '#fbbf24', fontSize: 17, fontWeight: '900', lineHeight: 19 },
  unit: { color: '#94a3b8', fontSize: 10, marginTop: 0 },
});
