import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  formatOrderNotFoundHint,
  formatPkgNotFoundHint,
  getTransportFeeDisplay,
  resolveAppError,
  useTranslation,
} from '../i18n';
import {
  deliverHubOrderInboundAtStation,
  ensurePackHubReceivedAtStation,
  getItemByBarcode,
  getItemDetail,
  importInboundPackToLocal,
  maybeAutoReleaseTransitAfterAllInbound,
  releaseHubTransitOrders,
} from '../services/inventoryService';
import {
  claimTripFeeAnchorIfUnset,
  isHubTransportFeePaid,
  markHubTransportFeePaid,
  resolveTripGroupKey,
  resolveTripSiblingBarcodes,
} from '../services/hubTransportFeeService';
import { getSupabaseConfigHint, isSupabaseConfigured } from '../services/supabase';
import { ensureHubReceiveCloudReady } from '../services/hubReceiveGate';
import { probeCloudConnection } from '../services/cloudConnection';
import { prefetchInventoryCache } from '../services/inventoryCloudStore';
import { refreshInventoryCloudSession } from '../services/authService';
import {
  confirmOrderHubReceived,
  confirmOrderInPackById,
  getOrderTrackingByBarcode,
  getPkgTrackingDetail,
} from '../services/trackingService';
import type { OrderTrackingRecord, PkgTrackingDetail } from '../types/tracking';
import {
  isDestinationHubPack,
  listPendingPackInboundOrders,
  preferConfirmedHubReceivePack,
} from '../utils/hubReceivePack';
import { collectArrivalNotifyTargets, type ArrivalNotifyTarget } from '../utils/arrivalNotify';
import { resolveStoreHubCode } from '../utils/storeZone';
import { canMarkCustomerSigned } from '../utils/customerSign';
import {
  normalizeCustomerSignCode,
  removeHubReceiveScanIds,
  upsertHubReceiveScanLine,
  type HubReceiveScanLine,
} from '../utils/hubReceiveScanBasket';
import { isPackageBarcode } from '../utils/packageNumber';
import { showTaskSuccess } from '../utils/taskSuccessAlert';

export function useHubReceiveFlow(openPackBarcode: string) {
  const { t, fmt } = useTranslation();
  const openedFromRouteRef = useRef('');
  const scanLockRef = useRef(false);
  const [scanBusy, setScanBusy] = useState(false);
  const { store, hubCode: authHubCode, operatorName } = useAuth();
  const hubCode = authHubCode ?? (store ? resolveStoreHubCode(store) : '');
  const operator = operatorName ?? t.common.operator;
  const [cloudConnected, setCloudConnected] = useState<boolean | null>(null);
  const [scan, setScan] = useState('');
  const [activePack, setActivePack] = useState<PkgTrackingDetail | null>(null);
  const [ordersModalVisible, setOrdersModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [confirmingHubReceive, setConfirmingHubReceive] = useState(false);
  const [batchInbounding, setBatchInbounding] = useState(false);
  const [payingTransportFee, setPayingTransportFee] = useState(false);
  const [transportFeePaid, setTransportFeePaid] = useState(false);
  const [tripPackCount, setTripPackCount] = useState(1);
  const [tripFeeAnchorPack, setTripFeeAnchorPack] = useState(true);
  const [releasingTransit, setReleasingTransit] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [notifyQueue, setNotifyQueue] = useState<ArrivalNotifyTarget[]>([]);
  const [scanBasket, setScanBasket] = useState<HubReceiveScanLine[]>([]);

  const queueArrivalNotify = useCallback(
    (orders: OrderTrackingRecord[]) => {
      if (!hubCode) return;
      const targets = collectArrivalNotifyTargets(orders, hubCode).map((row) => ({
        ...row,
        storeName: store?.storeName,
      }));
      if (targets.length > 0) setNotifyQueue(targets);
    },
    [hubCode, store?.storeName],
  );

  const dismissNotifyQueue = useCallback(() => {
    setNotifyQueue([]);
  }, []);

  const refreshTransportFeePaid = useCallback(async (packBarcode: string) => {
    try {
      const packCode = packBarcode.trim().toUpperCase();
      const siblings = await resolveTripSiblingBarcodes(packCode);
      const groupKey = await resolveTripGroupKey(packCode);
      const anchor = claimTripFeeAnchorIfUnset(groupKey, packCode);
      setTripPackCount(siblings.length);
      setTripFeeAnchorPack(anchor === packCode);
      setTransportFeePaid(await isHubTransportFeePaid(packCode));
    } catch {
      // 车费状态刷新失败不挡到站 / 入库 / 支付
    }
  }, []);

  const refreshCloudStatus = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setCloudConnected(false);
      return;
    }
    const conn = await probeCloudConnection();
    setCloudConnected(conn.authenticated);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshCloudStatus();
      if (store && hubCode) {
        void prefetchInventoryCache(store, hubCode);
      }
    }, [refreshCloudStatus, store, hubCode]),
  );

  const preflightHubReceive = useCallback(async (options?: { forWrite?: boolean }): Promise<boolean> => {
    const gate = await ensureHubReceiveCloudReady(options);
    if (!gate.ok) {
      setError(
        gate.reason === 'notConfigured'
          ? getSupabaseConfigHint() || t.hubReceive.supabaseMissing
          : gate.reason === 'offline' || gate.reason === 'notAuthenticated'
            ? t.hubReceive.cloudOfflineBlock
            : t.hubReceive.cloudOfflineBlock,
      );
      setCloudConnected(false);
      return false;
    }
    setCloudConnected(true);
    return true;
  }, [t]);

  const applyOrderSuccess = useCallback(
    async (pkg: PkgTrackingDetail, options?: { skipPackImport?: boolean }) => {
      setActivePack(pkg);
      void refreshTransportFeePaid(pkg.pack_barcode);
      if (!options?.skipPackImport && store && pkg.status !== 'in_transit') {
        try {
          await importInboundPackToLocal(pkg, store, operator);
        } catch (e: unknown) {
          const syncErr = resolveAppError(t, e);
          setError(fmt(t.hubReceive.orderConfirmedSyncFailed, { err: syncErr }));
        }
      }
      const total = pkg.item_count;

      if (pkg.status === 'split_at_hub') {
        const released = pkg.orders.filter((o) => o.status === 'released_at_hub').length;
        setMessage(fmt(t.hubReceive.splitDoneDetail, { count: released }));
        showTaskSuccess(t.hubReceive.splitDone, t.hubReceive.splitDoneMsg);
        return;
      }

      if (pkg.status === 'completed' && store) {
        setMessage(t.hubReceive.allProcessed);
        showTaskSuccess(t.hubReceive.receiveDone, t.hubReceive.receiveDoneMsg);
        return;
      }

      setMessage(
        fmt(t.hubReceive.processedProgress, {
          done: pkg.received_order_count,
          total,
        }),
      );
    },
    [store, operator, refreshTransportFeePaid, t, fmt],
  );

  const finishInboundFlow = useCallback(
    async (pkg: PkgTrackingDetail) => {
      if (!store) {
        await applyOrderSuccess(pkg, { skipPackImport: true });
        return;
      }

      if (pkg.status !== 'in_transit') {
        try {
          await importInboundPackToLocal(pkg, store, operator);
        } catch (e: unknown) {
          const syncErr = resolveAppError(t, e);
          setError(fmt(t.hubReceive.orderConfirmedSyncFailed, { err: syncErr }));
        }
      }

      const refreshed = await getPkgTrackingDetail(pkg.pack_barcode).catch(() => null);
      const latest = preferConfirmedHubReceivePack(pkg, refreshed);
      setActivePack(latest);
      await applyOrderSuccess(latest, { skipPackImport: true });

      const { releasedCount } = await maybeAutoReleaseTransitAfterAllInbound({
        packBarcode: latest.pack_barcode,
        store,
        hubCode,
        operator,
      });
      if (releasedCount > 0) {
        const updated = await getPkgTrackingDetail(latest.pack_barcode);
        if (updated) {
          setActivePack(updated);
          setMessage(fmt(t.hubReceive.allInboundReleased, { count: releasedCount }));
          showTaskSuccess(t.hubReceive.splitDone, t.hubReceive.splitDoneMsg);
        }
      }
    },
    [applyOrderSuccess, store, hubCode, operator, t, fmt],
  );

  const ensurePackHubReceived = useCallback(
    async (packBarcode: string, knownPkg?: PkgTrackingDetail): Promise<PkgTrackingDetail> => {
      if (!store) throw new Error(t.hubReceive.supabaseMissing);
      return ensurePackHubReceivedAtStation({
        packBarcode,
        store,
        hubCode,
        operator,
        knownPkg,
      });
    },
    [store, hubCode, operator, t],
  );

  const openPackOrdersModal = useCallback(
    async (detail: PkgTrackingDetail): Promise<PkgTrackingDetail> => {
      setError('');
      let pkg = detail;
      if (store && detail.status !== 'in_transit') {
        try {
          if (!(await preflightHubReceive())) {
            setActivePack(detail);
            setOrdersModalVisible(true);
            return detail;
          }
          pkg = await ensurePackHubReceived(pkg.pack_barcode, pkg);
        } catch (e: unknown) {
          setError(resolveAppError(t, e));
        }
      } else if (store) {
        void ensureHubReceiveCloudReady({ forWrite: true });
      }
      setActivePack(pkg);
      setOrdersModalVisible(true);
      setModalSuccess('');
      void refreshTransportFeePaid(pkg.pack_barcode);
      return pkg;
    },
    [store, ensurePackHubReceived, refreshTransportFeePaid, preflightHubReceive, t],
  );

  useEffect(() => {
    if (!openPackBarcode || !store || openedFromRouteRef.current === openPackBarcode) return;
    openedFromRouteRef.current = openPackBarcode;
    void (async () => {
      setError('');
      setMessage('');
      if (!(await preflightHubReceive())) return;
      setLoading(true);
      try {
        const detail = await getPkgTrackingDetail(openPackBarcode);
        if (!detail) {
          setError(formatPkgNotFoundHint(t, openPackBarcode, hubCode));
          return;
        }
        const opened = await openPackOrdersModal(detail);
        setMessage(fmt(t.hubReceive.packIdentified, { barcode: opened.pack_barcode, count: opened.item_count }));
      } catch (e: unknown) {
        setError(resolveAppError(t, e));
      } finally {
        setLoading(false);
      }
    })();
  }, [openPackBarcode, store, hubCode, openPackOrdersModal, preflightHubReceive, t, fmt]);

  const resolvePackForInbound = useCallback(
    async (pkg: PkgTrackingDetail): Promise<PkgTrackingDetail> => {
      if (pkg.status !== 'in_transit') return pkg;
      setConfirmingHubReceive(true);
      try {
        const updated = await ensurePackHubReceived(pkg.pack_barcode, pkg);
        setActivePack(updated);
        return updated;
      } finally {
        setConfirmingHubReceive(false);
      }
    },
    [ensurePackHubReceived],
  );

  const inboundSingleOrder = useCallback(
    async (orderId: string, knownPack?: PkgTrackingDetail | null) => {
      if (!store) return;
      const pack = knownPack ?? activePack;
      if (!pack) return;
      const knownOrder = pack.orders.find((line) => line.id === orderId);
      const { order, pkg } = await confirmOrderInPackById(orderId, store, hubCode, {
        pkg: pack,
        order: knownOrder,
      });
      await deliverHubOrderInboundAtStation({
        order,
        pkg,
        store,
        hubCode,
        operator,
      });
      try {
        await finishInboundFlow(pkg);
      } catch {
        // 入库已成功，刷新列表失败不回滚
      }
      queueArrivalNotify([order]);
      return pkg;
    },
    [store, activePack, hubCode, operator, finishInboundFlow, queueArrivalNotify],
  );

  const handlePackScan = async (code: string) => {
    if (!store || loading) return;
    setError('');
    setMessage('');
    if (!(await preflightHubReceive())) return;
    setLoading(true);
    try {
      let detail = await getPkgTrackingDetail(code);
      if (!detail) {
        setError(formatPkgNotFoundHint(t, code, hubCode));
        setActivePack(null);
        setOrdersModalVisible(false);
        return;
      }

      const opened = await openPackOrdersModal(detail);

      if (isDestinationHubPack(opened, hubCode)) {
        setMessage(fmt(t.hubReceive.destPackOpened, { barcode: opened.pack_barcode, count: opened.item_count }));
      } else if (opened.status === 'hub_received') {
        setMessage(fmt(t.hubReceive.packOpened, { barcode: opened.pack_barcode, count: opened.item_count }));
      } else {
        setMessage(fmt(t.hubReceive.packIdentified, { barcode: opened.pack_barcode, count: opened.item_count }));
      }
    } catch (e: unknown) {
      setError(resolveAppError(t, e));
    } finally {
      setLoading(false);
    }
  };

  const handleOrderLookupScan = async (code: string) => {
    if (!store || loading) return;
    setError('');
    setMessage('');
    if (!(await preflightHubReceive())) return;
    setLoading(true);
    try {
      const order = await getOrderTrackingByBarcode(code, hubCode);
      if (!order) {
        setError(formatOrderNotFoundHint(t, code, hubCode));
        setActivePack(null);
        setOrdersModalVisible(false);
        return;
      }

      let detail = await getPkgTrackingDetail(order.pack_barcode);
      if (!detail) {
        setError(
          fmt(t.hubReceive.orderPackMissing, {
            order: order.order_barcode,
            pack: order.pack_barcode,
          }),
        );
        setActivePack(null);
        setOrdersModalVisible(false);
        return;
      }

      await openPackOrdersModal(detail);
      setMessage(
        fmt(t.hubReceive.orderLookupFound, {
          order: order.order_barcode,
          pack: detail.pack_barcode,
        }),
      );
      return;
    } catch (e: unknown) {
      setError(resolveAppError(t, e));
    } finally {
      setLoading(false);
    }
  };

  const handleOrderScan = async (code: string) => {
    if (!store || loading) return;
    setError('');
    if (!(await preflightHubReceive())) return;
    setLoading(true);
    try {
      const { order, pkg } = await confirmOrderHubReceived(code, store, hubCode, activePack ?? undefined);
      setActivePack(pkg);
      await deliverHubOrderInboundAtStation({
        order,
        pkg,
        store,
        hubCode,
        operator,
      });
      showTaskSuccess(
        t.hubReceive.inboundSuccess,
        fmt(t.hubReceive.inboundSuccessMsg, { barcode: order.order_barcode }),
      );
      try {
        await finishInboundFlow(pkg);
      } catch {
        // 入库已成功
      }
      queueArrivalNotify([order]);
      setScan('');
      void addScannedOrderToBasket(order.order_barcode, { quiet: true });
    } catch (e: unknown) {
      setError(resolveAppError(t, e));
    } finally {
      setLoading(false);
    }
  };

  const addScannedOrderToBasket = async (
    barcode: string,
    options?: { quiet?: boolean },
  ): Promise<boolean> => {
    if (!store) return false;
    const code = barcode.trim().toUpperCase();
    if (!code) return false;

    const item = await getItemByBarcode(code);
    if (!item) {
      if (!options?.quiet) {
        setError(formatOrderNotFoundHint(t, code, hubCode));
        setMessage('');
      }
      return false;
    }

    if (scanBasket.some((row) => row.id === item.id || row.barcode === item.barcode || row.barcode === code)) {
      if (!options?.quiet) {
        setError(fmt(t.hubReceive.scanBasketDuplicate, { barcode: item.barcode }));
        setMessage('');
      }
      return false;
    }

    if (item.customer_signed_at?.trim()) {
      if (!options?.quiet) {
        setError(fmt(t.hubReceive.scanBasketSigned, { barcode: item.barcode }));
        setMessage('');
      }
      return false;
    }

    if (!canMarkCustomerSigned(store, item)) {
      if (!options?.quiet) {
        setError(fmt(t.hubReceive.scanBasketNotReady, { barcode: item.barcode }));
        setMessage('');
      }
      return false;
    }

    const detail = await getItemDetail(item.id).catch(() => null);
    const next: HubReceiveScanLine = {
      id: item.id,
      barcode: item.barcode,
      name: item.name,
      customerCode: normalizeCustomerSignCode(detail?.customer_code),
      customerName:
        item.recipient_name?.trim() ||
        item.customer_name?.trim() ||
        detail?.recipient_name?.trim() ||
        '',
      canSign: true,
      alreadySigned: false,
      hub_arrived_at: item.hub_arrived_at,
      customer_signed_at: item.customer_signed_at,
      final_destination: item.final_destination,
      destination: item.destination,
      owner_store_code: item.owner_store_code,
    };

    let duplicate = false;
    let count = 0;
    setScanBasket((prev) => {
      const preview = upsertHubReceiveScanLine(prev, next);
      duplicate = preview.duplicate;
      count = preview.lines.length;
      return preview.duplicate ? prev : preview.lines;
    });
    if (duplicate) {
      if (!options?.quiet) {
        setError(fmt(t.hubReceive.scanBasketDuplicate, { barcode: item.barcode }));
        setMessage('');
      }
      return false;
    }
    if (!options?.quiet) {
      setError('');
      setMessage(
        fmt(t.hubReceive.scanBasketAdded, {
          barcode: item.barcode,
          count,
        }),
      );
    }
    return true;
  };

  const handleOrderScanIntoBasket = async (code: string) => {
    if (!store || loading) return;
    const trimmed = code.trim().toUpperCase();
    setError('');
    setMessage('');
    if (scanBasket.some((row) => row.barcode === trimmed)) {
      setError(fmt(t.hubReceive.scanBasketDuplicate, { barcode: trimmed }));
      return;
    }
    if (!(await preflightHubReceive())) return;
    setLoading(true);
    try {
      const existing = await getItemByBarcode(trimmed);
      if (existing?.customer_signed_at?.trim()) {
        setError(fmt(t.hubReceive.scanBasketSigned, { barcode: existing.barcode }));
        return;
      }
      if (!existing || !canMarkCustomerSigned(store, existing)) {
        let inboundError: unknown;
        try {
          const tracked = await getOrderTrackingByBarcode(trimmed, hubCode);
          const pkg = tracked ? await getPkgTrackingDetail(tracked.pack_barcode).catch(() => null) : null;
          if (pkg?.status === 'in_transit') {
            setError(fmt(t.hubReceive.scanBasketNeedPack, { barcode: pkg.pack_barcode }));
            return;
          }
          if (pkg) {
            const { order, pkg: latest } = await confirmOrderHubReceived(
              trimmed,
              store,
              hubCode,
              pkg,
            );
            await deliverHubOrderInboundAtStation({
              order,
              pkg: latest,
              store,
              hubCode,
              operator,
            });
          }
        } catch (e: unknown) {
          inboundError = e;
        }
        const after = await getItemByBarcode(trimmed);
        if (!after) {
          setError(
            inboundError
              ? resolveAppError(t, inboundError)
              : formatOrderNotFoundHint(t, trimmed, hubCode),
          );
          return;
        }
      }
      const added = await addScannedOrderToBasket(trimmed);
      if (added) setScan('');
    } catch (e: unknown) {
      setError(resolveAppError(t, e));
    } finally {
      setLoading(false);
    }
  };

  const removeScanBasketIds = (ids: Iterable<string>) => {
    setScanBasket((prev) => removeHubReceiveScanIds(prev, ids));
  };

  const clearScanBasket = () => {
    setScanBasket([]);
  };

  const handleConfirmPack = async () => {
    if (!store || !activePack || confirmingHubReceive || loading || confirmingOrderId || batchInbounding) return;
    if (activePack.status !== 'in_transit') return;
    setError('');
    setModalSuccess('');
    if (!(await preflightHubReceive({ forWrite: true }))) return;
    setConfirmingHubReceive(true);
    try {
      const updated = await ensurePackHubReceived(activePack.pack_barcode, activePack);
      const shown =
        updated.status === 'in_transit'
          ? {
              ...updated,
              status: 'hub_received' as const,
              hub_received_at: updated.hub_received_at || new Date().toISOString(),
              hub_received_by_store_code: store.storeCode,
              hub_received_by_store_name: store.storeName,
            }
          : updated;
      setActivePack(shown);
      void refreshTransportFeePaid(updated.pack_barcode);
      setModalSuccess(t.hubReceive.packConfirmSuccessMsg);
      showTaskSuccess(
        t.hubReceive.packConfirmSuccess,
        fmt(t.hubReceive.packConfirmed, { barcode: updated.pack_barcode }),
      );
    } catch (e: unknown) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const latest = await getPkgTrackingDetail(activePack.pack_barcode).catch(() => null);
      if (latest && latest.status !== 'in_transit') {
        setError('');
        setActivePack(latest);
        void refreshTransportFeePaid(latest.pack_barcode);
        setModalSuccess(t.hubReceive.packConfirmSuccessMsg);
        showTaskSuccess(
          t.hubReceive.packConfirmSuccess,
          fmt(t.hubReceive.packConfirmed, { barcode: latest.pack_barcode }),
        );
        void ensurePackHubReceived(latest.pack_barcode, latest).catch(() => undefined);
        return;
      }
      try {
        await refreshInventoryCloudSession({ force: true });
        const retried = await ensurePackHubReceived(activePack.pack_barcode, latest ?? activePack);
        if (retried.status === 'in_transit') {
          setError(resolveAppError(t, e));
          return;
        }
        setError('');
        setActivePack(retried);
        void refreshTransportFeePaid(retried.pack_barcode);
        setModalSuccess(t.hubReceive.packConfirmSuccessMsg);
        showTaskSuccess(
          t.hubReceive.packConfirmSuccess,
          fmt(t.hubReceive.packConfirmed, { barcode: retried.pack_barcode }),
        );
        return;
      } catch {
        setError(resolveAppError(t, e));
      }
    } finally {
      setConfirmingHubReceive(false);
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    if (!store || !activePack || confirmingOrderId || batchInbounding || loading || confirmingHubReceive) return;
    setError('');
    setModalSuccess('');
    if (!(await preflightHubReceive({ forWrite: true }))) return;
    const orderLine = activePack.orders.find((line) => line.id === orderId);
    const orderBarcode = orderLine?.order_barcode ?? '';
    setConfirmingOrderId(orderId);
    try {
      const pkg = await resolvePackForInbound(activePack);
      await inboundSingleOrder(orderId, pkg);
      const successMsg = orderBarcode
        ? fmt(t.hubReceive.inboundSuccessMsg, { barcode: orderBarcode })
        : t.hubReceive.inboundSuccess;
      setModalSuccess(successMsg);
      showTaskSuccess(t.hubReceive.inboundSuccess, successMsg);
    } catch (e: unknown) {
      setError(resolveAppError(t, e));
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handleBatchInbound = async () => {
    if (!store || !activePack || confirmingOrderId || batchInbounding || loading || confirmingHubReceive) return;
    setError('');
    setModalSuccess('');
    if (!(await preflightHubReceive({ forWrite: true }))) return;
    setBatchInbounding(true);
    try {
      const pkg =
        activePack.status === 'in_transit'
          ? await resolvePackForInbound(activePack)
          : activePack;
      const pendingOrders = listPendingPackInboundOrders(pkg, hubCode);
      if (pendingOrders.length === 0) {
        throw new Error(t.hubReceive.batchInboundNothingPending);
      }
      let latest = pkg;
      for (const order of pendingOrders) {
        const result = await confirmOrderInPackById(order.id, store, hubCode, { pkg: latest, order });
        latest = result.pkg;
        await deliverHubOrderInboundAtStation({
          order: result.order,
          pkg: result.pkg,
          store,
          hubCode,
          operator,
        });
      }
      try {
        await finishInboundFlow(latest);
      } catch {
        // 批量入库已成功，刷新失败仍进入车费步骤
      }
      const refreshed = await getPkgTrackingDetail(latest.pack_barcode).catch(() => null);
      setActivePack(preferConfirmedHubReceivePack(latest, refreshed));
      const successMsg = fmt(t.hubReceive.batchInboundSuccessMsg, { count: pendingOrders.length });
      setModalSuccess(successMsg);
      showTaskSuccess(t.hubReceive.batchInboundSuccess, successMsg);
      queueArrivalNotify(pendingOrders);
    } catch (e: unknown) {
      setError(resolveAppError(t, e));
    } finally {
      setBatchInbounding(false);
    }
  };

  const handlePayTransportFee = () => {
    if (!store || !activePack || payingTransportFee || loading) return;
    const feeDisplay = getTransportFeeDisplay(t, activePack.transport_fee);
    const legDest = activePack.leg_destination_code || activePack.destination_code || hubCode;

    Alert.alert(
      t.common.confirmPayFee,
      fmt(t.hubReceive.payFeeAlertBody, {
        barcode: activePack.pack_barcode,
        origin: activePack.origin_store_code,
        dest: legDest,
        fee: feeDisplay,
      }),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.confirmPay,
          onPress: () => {
            setPayingTransportFee(true);
            setError('');
            void (async () => {
              try {
                if (!(await preflightHubReceive())) return;
                await markHubTransportFeePaid({
                  packBarcode: activePack.pack_barcode,
                  fee: activePack.transport_fee,
                  legDestination: legDest,
                  originStoreCode: activePack.origin_store_code,
                  operator,
                  store,
                });
                setTransportFeePaid(true);
                const paidMsg =
                  tripPackCount > 1
                    ? t.hubReceive.tripFeePaidMsg
                    : fmt(t.hubReceive.feePaidMsg, { barcode: activePack.pack_barcode });
                setModalSuccess(paidMsg);
                showTaskSuccess(t.hubReceive.paySuccess, fmt(t.hubReceive.paySuccessMsg, { fee: feeDisplay }));
                setMessage(paidMsg);
              } catch (e: unknown) {
                setError(resolveAppError(t, e));
              } finally {
                setPayingTransportFee(false);
              }
            })();
          },
        },
      ],
    );
  };

  const handleReleaseTransit = async () => {
    if (!store || !activePack) return;
    if (!(await preflightHubReceive())) return;
    setReleasingTransit(true);
    setError('');
    try {
      const { releasedCount } = await releaseHubTransitOrders({
        packBarcode: activePack.pack_barcode,
        store,
        hubCode,
        operator,
        allowCompleted: true,
      });
      const updated = await getPkgTrackingDetail(activePack.pack_barcode);
      if (updated) setActivePack(preferConfirmedHubReceivePack(activePack, updated));
      setMessage(fmt(t.hubReceive.manualReleaseDone, { count: releasedCount }));
    } catch (e: unknown) {
      setError(resolveAppError(t, e));
    } finally {
      setReleasingTransit(false);
    }
  };

  const onSubmit = (code: string) => {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setScanBusy(true);
    setScan(code);
    const trimmed = code.trim().toUpperCase();
    void (async () => {
      try {
        if (isPackageBarcode(trimmed)) {
          await handlePackScan(code);
          return;
        }
        if (ordersModalVisible && activePack) {
          if (activePack.status === 'in_transit') {
            await handleOrderLookupScan(code);
            return;
          }
          await handleOrderScan(code);
          return;
        }
        await handleOrderScanIntoBasket(code);
      } finally {
        scanLockRef.current = false;
        setScanBusy(false);
      }
    })();
  };

  const closeOrdersModal = () => {
    setOrdersModalVisible(false);
    setModalSuccess('');
    setError('');
  };

  return {
    t,
    fmt,
    store,
    hubCode,
    cloudConnected,
    scan,
    setScan,
    activePack,
    ordersModalVisible,
    loading,
    scanBusy,
    confirmingOrderId,
    confirmingHubReceive,
    batchInbounding,
    payingTransportFee,
    transportFeePaid,
    tripPackCount,
    tripFeeAnchorPack,
    releasingTransit,
    message,
    error,
    modalSuccess,
    onSubmit,
    openPackOrdersModal,
    handleConfirmPack,
    handleConfirmOrder,
    handleBatchInbound,
    handlePayTransportFee,
    handleReleaseTransit,
    closeOrdersModal,
    notifyQueue,
    dismissNotifyQueue,
    queueArrivalNotify,
    scanBasket,
    removeScanBasketIds,
    clearScanBasket,
    operator,
  };
}
