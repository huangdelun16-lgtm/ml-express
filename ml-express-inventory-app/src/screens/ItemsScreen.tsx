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
import { useFocusEffect } from '@react-navigation/native';
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
  listItems,
  listPackableItems,
  syncInboundHubPacksToLocal,
} from '../services/inventoryService';
import { canMarkCustomerSigned } from '../utils/customerSign';
import { confirmAndMarkCustomerSigned } from '../utils/customerSignConfirm';
import { canEditOwnedRecord, resolveOwnerKeyForListItem } from '../utils/storeOwnership';
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
import { showTaskSuccess } from '../utils/taskSuccessAlert';

type Nav = {
  navigate: (name: string, params?: { itemId?: string }) => void;
};

type ListMode = 'normal' | 'pack' | 'print';

export default function ItemsScreen({ navigation }: { navigation: Nav }) {
  const { operatorName, store, hubCode } = useAuth();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<InventoryItemListRow[]>([]);
  const [listMode, setListMode] = useState<ListMode>('normal');
  const [filterRegion, setFilterRegion] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchPrinting, setBatchPrinting] = useState(false);
  const [packModalVisible, setPackModalVisible] = useState(false);
  const [actionItem, setActionItem] = useState<InventoryItemListRow | null>(null);
  const [viewItemId, setViewItemId] = useState<string | null>(null);
  const [orderBarcodeRequireDone, setOrderBarcodeRequireDone] = useState(false);
  const [packSuccessInfo, setPackSuccessInfo] = useState<{
    name: string;
    barcode: string;
    count: number;
  } | null>(null);
  const [orderBarcodeData, setOrderBarcodeData] = useState<OrderBarcodeData | null>(null);

  const load = useCallback(async () => {
    if (store && hubCode) {
      requestAutoCloudSync(store, hubCode);
      try {
        await syncInboundHubPacksToLocal(store, hubCode, operatorName ?? '工作人员');
      } catch {
        // 云端未配置或离线时仍显示本地列表
      }
    }
    const scope = store && hubCode ? { store, hubCode } : undefined;
    setItems(
      listMode === 'pack'
        ? await listPackableItems(search, scope)
        : await listItems(search, scope),
    );
  }, [search, listMode, store, hubCode, operatorName]);

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

  const displayedItems = useMemo(() => {
    let list = items.filter((i) => !isExpressPackItem(i));
    if (filterRegion) list = list.filter((i) => resolveItemDestinationCode(i) === filterRegion);
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
  }, [items, filterRegion]);

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
    };
  };

  const handleBatchPrint = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('提示', '请先勾选要打印标签的商品');
      return;
    }
    setBatchPrinting(true);
    try {
      const entries = selectedItems.map(toBatchPrintEntry);
      const ok = await printBatchLabels(entries);
      if (!ok) {
        Alert.alert('提示', '打印已关闭，请在设置中启用打印');
        return;
      }
      Alert.alert('已发送打印', `共 ${entries.length} 个标签已发送到打印机`, [
        { text: '好的', onPress: exitSelectMode },
      ]);
    } catch (e: unknown) {
      Alert.alert('打印失败', e instanceof Error ? e.message : '请重试');
    } finally {
      setBatchPrinting(false);
    }
  };

  const openPackModal = () => {
    if (selectedIds.size === 0) {
      Alert.alert('提示', '请先勾选要打包的入库商品');
      return;
    }

    const regionCodes = collectItemDestinationCodes(selectedItems);
    const confirmMessage = formatMixedRegionPackConfirmMessage(regionCodes);
    if (confirmMessage) {
      Alert.alert('跨地区打包', confirmMessage, [
        { text: '取消', style: 'cancel' },
        { text: '确认打包', onPress: () => setPackModalVisible(true) },
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
    if (!store) throw new Error('未登录，无法打包');
    const { bundleItem } = await createPackedShipment({
      operator: operatorName ?? '工作人员',
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
      '打包成功',
      `快递包：${bundleItem.name}\n包装号：${bundleItem.barcode}\n已合并 ${packedCount} 个商品`,
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
          placeholder={listMode === 'pack' ? '搜索客户名 / 目的地 / 商品' : '搜索客户名 / 目的地 / 商品名'}
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => load()}
          returnKeyType="search"
        />
        {listMode === 'normal' ? (
          <Pressable style={styles.addBtn} onPress={() => navigation.navigate('ItemForm')}>
            <Text style={styles.addText}>+ 新建</Text>
          </Pressable>
        ) : null}
      </View>

      <RegionFilterBar value={filterRegion} onChange={setFilterRegion} />

      <View style={styles.actionRow}>
        {listMode === 'normal' ? (
          <>
            <Pressable style={styles.packBtn} onPress={() => setListMode('pack')}>
              <Text style={styles.packBtnText}>📦 打包快递</Text>
            </Pressable>
            <Pressable style={styles.printSelectBtn} onPress={() => setListMode('print')}>
              <Text style={styles.printSelectBtnText}>☑ 多选</Text>
            </Pressable>
          </>
        ) : listMode === 'pack' ? (
          <>
            <Pressable style={styles.ghostBtn} onPress={exitSelectMode}>
              <Text style={styles.ghostBtnText}>取消</Text>
            </Pressable>
            <Text style={styles.packHint}>勾选曾入库的商品，合并为一个快递包</Text>
            <Pressable
              style={[styles.packBtn, selectedIds.size === 0 && styles.packBtnDisabled]}
              onPress={openPackModal}
            >
              <Text style={styles.packBtnText}>下一步 ({selectedIds.size})</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable style={styles.ghostBtn} onPress={exitSelectMode}>
              <Text style={styles.ghostBtnText}>取消</Text>
            </Pressable>
            <Text style={styles.packHint}>勾选要打印标签的商品</Text>
            <Pressable
              style={[
                styles.printBtn,
                (selectedIds.size === 0 || batchPrinting) && styles.packBtnDisabled,
              ]}
              onPress={() => void handleBatchPrint()}
              disabled={batchPrinting}
            >
              <Text style={styles.printBtnText}>
                {batchPrinting ? '发送中…' : `🖨 打印标签 (${selectedIds.size})`}
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
              ? '暂无可打包商品（需曾入库且库存 > 0）'
              : filterRegion
                ? `暂无 ${filterRegion} 地区的商品`
                : '暂无商品，可扫码入库自动建档或点「新建」'}
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
                        {item.customer_name?.trim() || item.recipient_name?.trim() || '未登记客户'}
                      </Text>
                      {regionCode ? (
                        <Text style={styles.destination}> · {regionCode}</Text>
                      ) : item.destination ? (
                        <Text style={styles.destination}> · {item.destination}</Text>
                      ) : null}
                    </Text>
                    <Text style={styles.productName} numberOfLines={1}>
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
                            ? '已签收'
                            : transitShipped
                              ? '已中转'
                              : transitReleased
                                ? '待转出'
                                : transitPendingAtHub
                                  ? '待中转'
                                  : item.hub_arrived
                                  ? '已到站'
                                  : item.stocked_in
                                    ? '已入库'
                                    : '未入库'}
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
                          {item.packed && !transitReleased ? '已打包' : '未打包'}
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
                      <Text style={styles.tagPurpleLabel}>包装号</Text>
                      <Text style={styles.tagPurpleValue} numberOfLines={1}>
                        {packBarcode}
                      </Text>
                    </View>
                  ) : null}
                  {item.input_barcode ? (
                    <View style={styles.tagBlue}>
                      <Text style={styles.tagBlueLabel}>快递单</Text>
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
                    <Text style={styles.tagYellowLabel}>入库</Text>
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
        canEdit={
          !!actionItem &&
          !!store &&
          canEditOwnedRecord(store, resolveOwnerKeyForListItem(actionItem))
        }
        onEdit={() => {
          if (!actionItem || !store) return;
          const ownerKey = resolveOwnerKeyForListItem(actionItem);
          if (!canEditOwnedRecord(store, ownerKey)) {
            Alert.alert('无法编辑', '该订单仅可由入库登记区域或 Admin 账号编辑');
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
                  operator: operatorName ?? '工作人员',
                  store,
                  onSuccess: () => {
                    setActionItem(null);
                    showTaskSuccess('签收成功', `${item.name} 已标记为客户已签收`);
                    void load();
                  },
                  onError: (message) => Alert.alert('签收失败', message),
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
        operatorName={operatorName ?? '工作人员'}
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
  productName: { color: '#f8fafc', fontSize: 15, fontWeight: '800', marginTop: 1, lineHeight: 19 },
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
