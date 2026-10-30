import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import ScrollPositionRail from '../components/ScrollPositionRail';
import ExceptionReportModal from '../components/ExceptionReportModal';
import ArrivalNotifySheet from '../components/ArrivalNotifySheet';
import ItemActionModal from '../components/ItemActionModal';
import ItemViewModal from '../components/ItemViewModal';
import ItemsListRow from '../components/ItemsListRow';
import ItemsModeBar, { type ItemsListMode } from '../components/ItemsModeBar';
import OrderBarcodeModal, { type OrderBarcodeData } from '../components/OrderBarcodeModal';
import PackExpressModal from '../components/PackExpressModal';
import RegionFilterBar from '../components/RegionFilterBar';
import PhoneBarcodeScanModal from '../components/PhoneBarcodeScanModal';
import { normalizeScanCode } from '../utils/barcodeScan';
import { itemMatchesKeyword } from '../utils/itemKeywordMatch';
import { useAuth } from '../contexts/AuthContext';
import { packOrderBarcodeData, listItemOrderBarcodeData, type PackBarcodePayload } from '../utils/orderBarcodeData';
import { runBarcodeLabelPrintWithAlert } from '../services/labelPrintFlow';
import {
  createPackedShipment,
  canEditItemCustomerProfileForStore,
  listItems,
  listPackableItems,
} from '../services/inventoryService';
import { canMarkCustomerSigned } from '../utils/customerSign';
import BatchSignInvoiceModal from '../components/BatchSignInvoiceModal';
import CustomerSignFlowModal, { type CustomerSignFlowRequest } from '../components/CustomerSignFlowModal';
import {
  collectSameCustomerPeers,
  resolvePackagingStockInSignIds,
  validateBatchSignSelection,
} from '../utils/customerBatchSign';
import {
  canEditItemCustomerProfile,
} from '../utils/itemCustomerProfileEdit';
import type { InventoryItemListRow } from '../types/inventory';
import { isCustomerSignedItem } from '../utils/itemFieldFormat';
import {
  collectItemDestinationCodes,
  formatMixedRegionPackConfirmMessage,
  resolveItemDestinationCode,
} from '../utils/itemDestination';
import { isExpressPackItem } from '../utils/packItem';
import { regionDisplayLabel } from '../constants/destinationOptions';
import { showTaskSuccess } from '../utils/taskSuccessAlert';
import { feedbackService } from '../services/FeedbackService';
import { listOpenExceptionBarcodes } from '../services/inventoryExceptionService';
import type { ExceptionReportTarget } from '../types/inventoryException';
import { exceptionTargetFromItem } from '../utils/inventoryException';
import { needsArrivalNotify } from '../utils/arrivalNotify';
import type { ArrivalNotifyTarget } from '../utils/arrivalNotify';
import { resolveAppError, useTranslation, getItemCustomerProfileEditDeniedMessage } from '../i18n';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = {
  navigate: (name: keyof RootStackParamList, params?: object) => void;
  setParams: (params: { initialMode?: 'pack' | 'sign' }) => void;
  goBack: () => void;
};

type ItemsRoute = RouteProp<RootStackParamList, 'Items'>;

export default function ItemsScreen({ navigation }: { navigation: Nav }) {
  const route = useRoute<ItemsRoute>();
  const incompleteOnly = false;
  const { operatorName, store, hubCode } = useAuth();
  const { t, fmt } = useTranslation();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [listViewport, setListViewport] = useState(0);
  const [listContent, setListContent] = useState(0);
  const [chromeHeight, setChromeHeight] = useState(0);
  const chromeOpacity = useMemo(() => {
    const travel = chromeHeight > 0 ? chromeHeight : 1000;
    return scrollY.interpolate({
      inputRange: [0, travel * 0.42, travel],
      outputRange: [1, 0.8, 0],
      extrapolate: 'clamp',
    });
  }, [scrollY, chromeHeight]);
  const onListScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY],
  );
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [scanVisible, setScanVisible] = useState(false);
  const [items, setItems] = useState<InventoryItemListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [listMode, setListMode] = useState<ItemsListMode>(() => {
    const mode = route.params?.initialMode;
    return mode === 'pack' || mode === 'sign' ? mode : 'normal';
  });
  const [filterRegion, setFilterRegion] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'unpacked' | 'signed'>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [packModalVisible, setPackModalVisible] = useState(false);
  const [actionItem, setActionItem] = useState<InventoryItemListRow | null>(null);
  const [actionCanEdit, setActionCanEdit] = useState(false);
  const [viewItemId, setViewItemId] = useState<string | null>(null);
  const [exceptionTarget, setExceptionTarget] = useState<ExceptionReportTarget | null>(null);
  const [notifyTargets, setNotifyTargets] = useState<ArrivalNotifyTarget[]>([]);
  const [openExceptionCodes, setOpenExceptionCodes] = useState<Set<string>>(new Set());
  const [orderBarcodeRequireDone, setOrderBarcodeRequireDone] = useState(false);
  const [signRequest, setSignRequest] = useState<CustomerSignFlowRequest | null>(null);
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [packSuccessInfo, setPackSuccessInfo] = useState<{
    name: string;
    barcode: string;
    count: number;
  } | null>(null);
  const [orderBarcodeData, setOrderBarcodeData] = useState<OrderBarcodeData | null>(null);
  const requestIdRef = useRef(0);
  const activeRequestKeyRef = useRef('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const mode = route.params?.initialMode;
    if (mode !== 'pack' && mode !== 'sign') return;
    setListMode(mode);
    navigation.setParams({ initialMode: undefined });
  }, [route.params?.initialMode, navigation]);

  const load = useCallback(async (force = false) => {
    const scope = store && hubCode ? { store, hubCode } : undefined;
    const requestKey = `${listMode}|${debouncedSearch}|${store?.id ?? ''}|${hubCode ?? ''}`;
    if (!force && activeRequestKeyRef.current === requestKey) return;
    const requestId = ++requestIdRef.current;
    activeRequestKeyRef.current = requestKey;
    setLoading(true);
    setLoadError('');
    try {
      const nextItems =
        listMode === 'pack'
          ? await listPackableItems(debouncedSearch, scope, { force })
          : await listItems(debouncedSearch, scope, { force });
      if (requestId === requestIdRef.current) setItems(nextItems);
    } catch (error: unknown) {
      if (requestId === requestIdRef.current) {
        setLoadError(resolveAppError(t, error));
      }
    } finally {
      if (activeRequestKeyRef.current === requestKey) activeRequestKeyRef.current = '';
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [debouncedSearch, listMode, store, hubCode, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
      void listOpenExceptionBarcodes()
        .then(setOpenExceptionCodes)
        .catch(() => setOpenExceptionCodes(new Set()));
    }, [load]),
  );

  useEffect(() => {
    setSelectedIds(new Set());
  }, [listMode, filterRegion, statusFilter]);

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
    if (statusFilter === 'unpacked') {
      list = list.filter((item) => {
        const released = item.hub_transit_released && !item.hub_transit_shipped;
        return !(item.packed && !released);
      });
    } else if (statusFilter === 'signed') {
      list = list.filter((item) => isCustomerSignedItem(item));
    }
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
  }, [items, filterRegion, statusFilter, incompleteOnly]);

  const selectedItems = useMemo(
    () => displayedItems.filter((i) => selectedIds.has(i.id)),
    [displayedItems, selectedIds],
  );

  const selectActive = listMode !== 'normal';
  const selectAccent =
    listMode === 'pack' ? '#7c3aed' : '#059669';

  const toggleSelect = (id: string) => {
    if (listMode === 'sign' && store) {
      const anchor = displayedItems.find((item) => item.id === id);
      if (!anchor) return;
      const peers = collectSameCustomerPeers(displayedItems, anchor, store);
      const peerIds = peers.map((item) => item.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        const allSelected = peerIds.every((peerId) => next.has(peerId));
        if (allSelected) peerIds.forEach((peerId) => next.delete(peerId));
        else peerIds.forEach((peerId) => next.add(peerId));
        return next;
      });
      return;
    }

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

  const openPackBarcode = (payload: PackBarcodePayload, requireDone = false) => {
    setOrderBarcodeData(packOrderBarcodeData(payload));
    setOrderBarcodeRequireDone(requireDone);
  };

  const closeOrderBarcode = () => {
    const wasPackFlow = orderBarcodeRequireDone;
    setOrderBarcodeData(null);
    setOrderBarcodeRequireDone(false);
    if (wasPackFlow) setPackSuccessInfo(null);
  };

  const openCustomerSign = async (anchors: InventoryItemListRow[]) => {
    if (!store || anchors.length === 0) return;
    const scope = hubCode ? { store, hubCode } : undefined;
    const expanded = await resolvePackagingStockInSignIds(
      items,
      anchors,
      store,
      (keyword) => listItems(keyword, scope),
    );
    setSignRequest({
      itemIds: expanded.map((item) => item.id),
      operator: operatorName ?? t.common.operator,
      store,
    });
  };

  const handleOpenInvoice = () => {
    if (!store) return;
    const validationError = validateBatchSignSelection(selectedItems);
    if (validationError) {
      feedbackService.notify(
        t.common.tip,
        validationError === 'batchSignEmpty'
          ? t.items.batchSignEmpty
          : t.items.batchSignMixedCustomer,
      );
      return;
    }
    setInvoiceVisible(true);
  };

  const openPackModal = () => {
    if (selectedIds.size === 0) {
      feedbackService.notify(t.common.tip, t.items.alertSelectPack);
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
      actingStore: store,
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

  const applyScannedCode = (raw: string) => {
    const code = normalizeScanCode(raw);
    setScanVisible(false);
    if (!code) return;
    setSearch(code);
    setDebouncedSearch(code);
    const matches = items.filter((item) => itemMatchesKeyword(item, code));
    if (matches.length === 1) setActionItem(matches[0]);
  };

  const expressNextLabel = (item: InventoryItemListRow | null) => {
    if (!item || !store || isExpressPackItem(item) || isCustomerSignedItem(item)) return null;
    if (canMarkCustomerSigned(store, item)) return t.items.nextSign;
    if (item.stocked_in && !item.packed && item.qty_on_hand > 0) return t.items.nextPack;
    if (!item.stocked_in) return t.items.nextStockIn;
    return null;
  };

  const runExpressNextStep = () => {
    if (!actionItem || !store) return;
    const item = actionItem;
    setActionItem(null);
    if (canMarkCustomerSigned(store, item)) {
      void openCustomerSign([item]);
      return;
    }
    if (item.stocked_in && !item.packed && item.qty_on_hand > 0) {
      setSelectedIds(new Set([item.id]));
      setListMode('pack');
      setPackModalVisible(true);
      return;
    }
    if (!item.stocked_in) {
      navigation.navigate('StockIn', { presetBarcode: item.input_barcode || item.barcode });
    }
  };

  const handlePackBarcodeDone = () => {
    setOrderBarcodeData(null);
    setOrderBarcodeRequireDone(false);
    setPackSuccessInfo(null);
    exitSelectMode();
    void load();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.listView} onLayout={(event) => setListViewport(event.nativeEvent.layout.height)}>
      <Animated.FlatList
        data={displayedItems}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.list}
        style={styles.listView}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        bounces
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={8}
        updateCellsBatchingPeriod={50}
        onScroll={onListScroll}
        scrollEventThrottle={1}
        onContentSizeChange={(_, height) => setListContent(height)}
        ListHeaderComponent={
          <View>
            <Animated.View
              style={{ opacity: chromeOpacity }}
              onLayout={(event) => {
                const next = Math.ceil(event.nativeEvent.layout.height);
                setChromeHeight((current) => (Math.abs(current - next) > 1 ? next : current));
              }}
            >
              <View style={styles.navRow}>
                <Pressable
                  style={styles.homeBtn}
                  onPress={() => navigation.goBack()}
                  accessibilityRole="button"
                  accessibilityLabel="Home"
                >
                  <Text style={styles.homeChevron}>‹</Text>
                  <Text style={styles.homeLabel}>Home</Text>
                </Pressable>
                <Text style={styles.screenTitle} numberOfLines={1}>{t.nav.items}</Text>
              </View>
              <View style={styles.toolbar}>
                <TextInput
                  style={styles.search}
                  placeholder={
                    listMode === 'pack' ? t.items.searchPack : t.items.searchList
                  }
                  placeholderTextColor="#94a3b8"
                  value={search}
                  onChangeText={setSearch}
                  onSubmitEditing={() => {
                    const nextSearch = search.trim();
                    if (nextSearch === debouncedSearch) void load(true);
                    else setDebouncedSearch(nextSearch);
                  }}
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
                {listMode === 'normal' ? (
                  <Pressable
                    style={styles.addBtn}
                    onPress={() => navigation.navigate('ItemForm')}
                    accessibilityRole="button"
                    accessibilityLabel={t.items.newBtn}
                  >
                    <Text style={styles.addText}>{t.items.newBtn}</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.filterDock}>
                <RegionFilterBar
                  value={filterRegion}
                  onChange={setFilterRegion}
                  status={statusFilter}
                  onStatusChange={setStatusFilter}
                  unpackedLabel={t.items.statusNotPacked}
                  signedLabel={t.items.statusSigned}
                  resultCount={displayedItems.length}
                />
                <ItemsModeBar
                  listMode={listMode}
                  selectedCount={selectedIds.size}
                  onEnterPack={() => {
                    setFilterRegion('');
                    setListMode('pack');
                  }}
                  onEnterSign={() => {
                    setFilterRegion('');
                    setListMode('sign');
                  }}
                  onCancel={exitSelectMode}
                  onOpenPack={openPackModal}
                  onOpenInvoice={handleOpenInvoice}
                />
              </View>
            </Animated.View>
            {incompleteOnly ? (
              <View style={styles.incompleteBanner}>
                <Text style={styles.incompleteBannerText}>{t.items.incompleteFilterBanner}</Text>
              </View>
            ) : null}

            {loadError ? (
              <View style={styles.inlineError}>
                <Text style={styles.errorText}>{loadError}</Text>
                <Pressable
                  style={styles.retryBtn}
                  onPress={() => void load(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t.common.retry}
                >
                  <Text style={styles.retryBtnText}>{t.common.retry}</Text>
                </Pressable>
              </View>
            ) : loading && items.length > 0 && !refreshing ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator size="small" color="#38bdf8" />
                <Text style={styles.stateText}>{t.common.loading}</Text>
              </View>
            ) : null}
          </View>
        }
        onRefresh={async () => {
          setRefreshing(true);
          try {
            await load(true);
          } finally {
            setRefreshing(false);
          }
        }}
        refreshing={refreshing}
        ListEmptyComponent={
          loading ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color="#38bdf8" />
              <Text style={styles.stateText}>{t.common.loading}</Text>
            </View>
          ) : (
            <Text style={styles.empty}>
              {listMode === 'pack'
                ? t.items.noPackable
                : statusFilter
                  ? t.items.noStatus
                  : filterRegion
                  ? fmt(t.items.noRegion, { region: regionDisplayLabel(filterRegion) })
                  : t.items.empty}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <ItemsListRow
            item={item}
            hubCode={hubCode ?? undefined}
            selected={selectedIds.has(item.id)}
            selectActive={selectActive}
            selectAccent={selectAccent}
            hasOpenException={
              openExceptionCodes.has(item.barcode.trim().toUpperCase())
              || openExceptionCodes.has((item.input_barcode || '').trim().toUpperCase())
            }
            unnotified={!!store && needsArrivalNotify(store, item)}
            onPress={() => {
              if (selectActive) toggleSelect(item.id);
              else setActionItem(item);
            }}
          />
        )}
      />
      <ScrollPositionRail scrollY={scrollY} viewportHeight={listViewport} contentHeight={listContent} />
      </View>

      <PhoneBarcodeScanModal
        visible={scanVisible}
        onClose={() => setScanVisible(false)}
        onScanned={applyScannedCode}
        title={t.scanInput.scanBtn}
        subtitle={t.items.searchList}
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
        nextLabel={expressNextLabel(actionItem)}
        onNext={expressNextLabel(actionItem) ? runExpressNextStep : undefined}
        onEdit={() => {
          if (!actionItem || !store) return;
          if (!actionCanEdit) {
            feedbackService.notify(
              t.items.cannotEdit,
              getItemCustomerProfileEditDeniedMessage(t, actionItem, store, hubCode ?? undefined),
            );
            return;
          }
          const id = actionItem.id;
          setActionItem(null);
          navigation.navigate('ItemForm', { itemId: id });
        }}
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
                setActionItem(null);
                void openCustomerSign([item]);
              }
            : undefined
        }
        onNotifyCustomer={
          actionItem && store && !isExpressPackItem(actionItem) && canMarkCustomerSigned(store, actionItem)
            ? () => {
                const item = actionItem;
                setActionItem(null);
                setNotifyTargets([
                  {
                    barcode: item.barcode,
                    expressBarcode: item.input_barcode,
                    recipientName: item.recipient_name?.trim() || item.customer_name?.trim() || '',
                    recipientPhone: '',
                    hubCode: hubCode ?? store.hubCode ?? '',
                    storeName: store.storeName,
                  },
                ]);
              }
            : undefined
        }
        onPrint={
          actionItem
            ? () => {
                const item = actionItem;
                const data = listItemOrderBarcodeData(item, isExpressPackItem(item));
                setActionItem(null);
                runBarcodeLabelPrintWithAlert(data, t);
              }
            : undefined
        }
        onReportException={
          actionItem && !isExpressPackItem(actionItem)
            ? () => {
                const item = actionItem;
                setActionItem(null);
                setExceptionTarget(exceptionTargetFromItem(item));
              }
            : undefined
        }
      />

      <ExceptionReportModal
        visible={!!exceptionTarget}
        target={exceptionTarget}
        onClose={() => setExceptionTarget(null)}
        onSubmitted={() => {
          void listOpenExceptionBarcodes()
            .then(setOpenExceptionCodes)
            .catch(() => undefined);
        }}
      />

      <ArrivalNotifySheet
        visible={notifyTargets.length > 0}
        targets={notifyTargets}
        onClose={() => setNotifyTargets([])}
        onNotified={() => void load()}
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
        onDone={orderBarcodeRequireDone ? handlePackBarcodeDone : undefined}
      />

      <BatchSignInvoiceModal
        visible={invoiceVisible}
        selectedItems={selectedItems}
        knownItems={items}
        store={store}
        hubCode={hubCode}
        onClose={() => setInvoiceVisible(false)}
        continueLabel={t.invoice.signAction}
        signedBy={operatorName ?? t.common.operator}
        onContinue={(handoff) => {
          if (!store) return;
          setInvoiceVisible(false);
          setSignRequest({
            itemIds: handoff.itemIds,
            operator: operatorName ?? t.common.operator,
            store,
            frozenInvoice: handoff.document,
          });
        }}
      />

      <CustomerSignFlowModal
        request={signRequest}
        onClose={() => setSignRequest(null)}
        resolveError={(e) => resolveAppError(t, e)}
        onSuccess={(detail, signedCount) => {
          setSelectedIds(new Set());
          exitSelectMode();
          showTaskSuccess(
            t.common.signSuccess,
            signedCount > 1
              ? fmt(t.sign.batchSignedCount, { count: signedCount })
              : fmt(t.common.signMarked, { name: detail.name }),
          );
          void load();
        }}
        onError={(message) => feedbackService.notify(t.common.signFailed, message)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
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
  toolbar: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#0f172a',
  },
  incompleteBanner: {
    marginBottom: 10,
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
    color: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 15,
  },
  addBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
    minWidth: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  scanBtn: {
    backgroundColor: '#0c4a6e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingHorizontal: 12,
    minHeight: 44,
    minWidth: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBtnText: { color: '#f0f9ff', fontWeight: '800', fontSize: 14 },
  filterDock: {
    paddingHorizontal: 16,
    backgroundColor: '#0f172a',
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(248,113,113,0.12)',
  },
  stateBox: { alignItems: 'center', gap: 10, marginTop: 40 },
  stateText: { color: '#94a3b8', fontSize: 13 },
  errorText: { color: '#fca5a5', flex: 1, fontSize: 12, lineHeight: 18 },
  retryBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f87171',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retryBtnText: { color: '#fecaca', fontWeight: '800', fontSize: 12 },
  listView: { flex: 1 },
  list: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 28 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 40, lineHeight: 22 },
});
