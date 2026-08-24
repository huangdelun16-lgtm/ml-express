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
import type { PkgTrackingDetail } from '../types/tracking';
import {
  isDestinationHubPack,
  listPendingPackInboundOrders,
} from '../utils/hubReceivePack';
import { resolveStoreHubCode } from '../utils/storeZone';
import { isPackageBarcode } from '../utils/packageNumber';
import { showTaskSuccess } from '../utils/taskSuccessAlert';

export function useHubReceiveFlow(openPackBarcode: string) {
  const { t, fmt } = useTranslation();
  const openedFromRouteRef = useRef('');
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

  const refreshTransportFeePaid = useCallback(async (packBarcode: string) => {
    const packCode = packBarcode.trim().toUpperCase();
    const siblings = await resolveTripSiblingBarcodes(packCode);
    const groupKey = await resolveTripGroupKey(packCode);
    const anchor = claimTripFeeAnchorIfUnset(groupKey, packCode);
    setTripPackCount(siblings.length);
    setTripFeeAnchorPack(anchor === packCode);
    setTransportFeePaid(await isHubTransportFeePaid(packCode));
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

      const refreshed = await getPkgTrackingDetail(pkg.pack_barcode);
      const latest = refreshed ?? pkg;
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
      await finishInboundFlow(pkg);
      return pkg;
    },
    [store, activePack, hubCode, operator, finishInboundFlow],
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
      await finishInboundFlow(pkg);
      setScan('');
    } catch (e: unknown) {
      setError(resolveAppError(t, e));
    } finally {
      setLoading(false);
    }
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
      await finishInboundFlow(latest);
      const refreshed = await getPkgTrackingDetail(latest.pack_barcode);
      if (refreshed) setActivePack(refreshed);
      const successMsg = fmt(t.hubReceive.batchInboundSuccessMsg, { count: pendingOrders.length });
      setModalSuccess(successMsg);
      showTaskSuccess(t.hubReceive.batchInboundSuccess, successMsg);
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
      if (updated) setActivePack(updated);
      setMessage(fmt(t.hubReceive.manualReleaseDone, { count: releasedCount }));
    } catch (e: unknown) {
      setError(resolveAppError(t, e));
    } finally {
      setReleasingTransit(false);
    }
  };

  const onSubmit = (code: string) => {
    setScan(code);
    const trimmed = code.trim().toUpperCase();
    if (isPackageBarcode(trimmed)) {
      void handlePackScan(code);
      return;
    }
    if (!activePack || activePack.status === 'in_transit') {
      void handleOrderLookupScan(code);
      return;
    }
    void handleOrderScan(code);
  };

  const closeOrdersModal = () => {
    setOrdersModalVisible(false);
    setModalSuccess('');
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
  };
}
