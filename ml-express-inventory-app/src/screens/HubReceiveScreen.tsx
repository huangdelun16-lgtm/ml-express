import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScanInputBar from '../components/ScanInputBar';
import HubReceiveOrdersModal from '../components/HubReceiveOrdersModal';
import { useAuth } from '../contexts/AuthContext';
import { getOrderStatusLabel, getPkgStatusLabel, getTransportFeeDisplay, formatOrderNotFoundHint, formatPkgNotFoundHint, resolveAppError, useTranslation } from '../i18n';
import {
  deliverHubOrderInboundAtStation,
  importInboundPackToLocal,
  maybeAutoReleaseTransitAfterAllInbound,
} from '../services/inventoryService';
import {
  isHubTransportFeePaid,
  markHubTransportFeePaid,
} from '../services/hubTransportFeeService';
import { isSupabaseConfigured, getSupabaseConfigHint } from '../services/supabase';
import { ensureHubReceiveCloudReady } from '../services/hubReceiveGate';
import { probeCloudConnection } from '../services/cloudSyncStatus';
import {
  confirmOrderHubReceived,
  confirmOrderInPackById,
  confirmPkgHubReceived,
  getOrderTrackingByBarcode,
  getPkgTrackingDetail,
} from '../services/trackingService';
import type { PkgTrackingDetail } from '../types/tracking';
import { resolveStoreHubCode } from '../utils/storeZone';
import { regionDisplayLabel } from '../constants/destinationOptions';
import { showTaskSuccess } from '../utils/taskSuccessAlert';

export default function HubReceiveScreen() {
  const { t, fmt } = useTranslation();
  const { store, operatorName, hasShiftOperator } = useAuth();
  const hubCode = store ? resolveStoreHubCode(store) : '';
  const operator = operatorName ?? t.common.operator;
  const [cloudConnected, setCloudConnected] = useState<boolean | null>(null);
  const [scan, setScan] = useState('');
  const [activePack, setActivePack] = useState<PkgTrackingDetail | null>(null);
  const [ordersModalVisible, setOrdersModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [payingTransportFee, setPayingTransportFee] = useState(false);
  const [transportFeePaid, setTransportFeePaid] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refreshTransportFeePaid = useCallback(async (packBarcode: string) => {
    setTransportFeePaid(await isHubTransportFeePaid(packBarcode));
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
    }, [refreshCloudStatus]),
  );

  const preflightHubReceive = useCallback(async (): Promise<boolean> => {
    if (!hasShiftOperator) {
      Alert.alert(t.settings.operator.requiredTitle, t.settings.operator.requiredHint);
      return false;
    }
    const gate = await ensureHubReceiveCloudReady();
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
  }, [hasShiftOperator, t]);

  const applyOrderSuccess = useCallback(
    async (pkg: PkgTrackingDetail) => {
      setActivePack(pkg);
      await refreshTransportFeePaid(pkg.pack_barcode);
      if (store && pkg.status !== 'in_transit') {
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
      await applyOrderSuccess(pkg);
      if (!store) return;

      const { releasedCount } = await maybeAutoReleaseTransitAfterAllInbound({
        packBarcode: pkg.pack_barcode,
        store,
        hubCode,
        operator,
      });
      if (releasedCount > 0) {
        const updated = await getPkgTrackingDetail(pkg.pack_barcode);
        if (updated) {
          setActivePack(updated);
          setMessage(fmt(t.hubReceive.allInboundReleased, { count: releasedCount }));
          showTaskSuccess(t.hubReceive.splitDone, t.hubReceive.splitDoneMsg);
        }
      }
    },
    [applyOrderSuccess, store, hubCode, operator, t, fmt],
  );

  const openPackOrdersModal = useCallback(
    (detail: PkgTrackingDetail) => {
      setActivePack(detail);
      setOrdersModalVisible(true);
      void refreshTransportFeePaid(detail.pack_barcode);
    },
    [refreshTransportFeePaid],
  );

  const handlePackScan = async (code: string) => {
    if (!store) return;
    setError('');
    setMessage('');
    if (!(await preflightHubReceive())) return;
    setLoading(true);
    try {
      const detail = await getPkgTrackingDetail(code);
      if (!detail) {
        setError(formatPkgNotFoundHint(t, code, hubCode));
        setActivePack(null);
        setOrdersModalVisible(false);
        return;
      }

      openPackOrdersModal(detail);

      if (detail.status === 'in_transit') {
        setMessage(
          fmt(t.hubReceive.packIdentified, {
            barcode: detail.pack_barcode,
            count: detail.item_count,
          }),
        );
      } else {
        setMessage(
          fmt(t.hubReceive.packOpened, {
            barcode: detail.pack_barcode,
            count: detail.item_count,
          }),
        );
      }
    } catch (e: unknown) {
      setError(resolveAppError(t, e));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPack = async () => {
    if (!store || !activePack) return;
    if (!(await preflightHubReceive())) return;
    setLoading(true);
    setError('');
    try {
      const updated = await confirmPkgHubReceived(activePack.pack_barcode, store, hubCode);
      try {
        await importInboundPackToLocal(updated, store, operator);
      } catch (e: unknown) {
        const syncErr = resolveAppError(t, e);
        setError(fmt(t.hubReceive.packConfirmedSyncFailed, { err: syncErr }));
      }
      setActivePack(updated);
      setMessage(fmt(t.hubReceive.packConfirmed, { barcode: updated.pack_barcode }));
      showTaskSuccess(t.hubReceive.packConfirmSuccess, t.hubReceive.packConfirmSuccessMsg);
    } catch (e: unknown) {
      setError(resolveAppError(t, e));
    } finally {
      setLoading(false);
    }
  };

  const handleOrderLookupScan = async (code: string) => {
    if (!store) return;
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

      const detail = await getPkgTrackingDetail(order.pack_barcode);
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

      openPackOrdersModal(detail);

      if (detail.status === 'in_transit') {
        setMessage(
          fmt(t.hubReceive.orderLookupFound, {
            order: order.order_barcode,
            pack: detail.pack_barcode,
          }),
        );
        return;
      }

      if (order.status === 'in_transit') {
        const { order: confirmed, pkg } = await confirmOrderInPackById(order.id, store, hubCode);
        await deliverHubOrderInboundAtStation({
          order: confirmed,
          pkg,
          store,
          hubCode,
          operator,
        });
        showTaskSuccess(
          t.hubReceive.inboundSuccess,
          fmt(t.hubReceive.inboundSuccessMsg, { barcode: confirmed.order_barcode }),
        );
        await finishInboundFlow(pkg);
        setScan('');
        return;
      }

      setMessage(
        fmt(t.hubReceive.orderProcessed, {
          barcode: order.order_barcode,
          status: getOrderStatusLabel(t, order.status),
        }),
      );
    } catch (e: unknown) {
      setError(resolveAppError(t, e));
    } finally {
      setLoading(false);
    }
  };

  const handleOrderScan = async (code: string) => {
    if (!store) return;
    setError('');
    if (!(await preflightHubReceive())) return;
    setLoading(true);
    try {
      const { order, pkg } = await confirmOrderHubReceived(code, store, hubCode);
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

  const handleConfirmOrder = async (orderId: string) => {
    if (!store) return;
    setError('');
    if (!(await preflightHubReceive())) return;
    setConfirmingOrderId(orderId);
    try {
      const { order, pkg } = await confirmOrderInPackById(orderId, store, hubCode);
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
    } catch (e: unknown) {
      setError(resolveAppError(t, e));
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handlePayTransportFee = () => {
    if (!store || !activePack) return;
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
                await markHubTransportFeePaid({
                  packBarcode: activePack.pack_barcode,
                  fee: activePack.transport_fee,
                  legDestination: legDest,
                  originStoreCode: activePack.origin_store_code,
                  operator,
                  store,
                });
                setTransportFeePaid(true);
                showTaskSuccess(
                  t.hubReceive.paySuccess,
                  fmt(t.hubReceive.paySuccessMsg, { fee: feeDisplay }),
                );
                setMessage(fmt(t.hubReceive.feePaidMsg, { barcode: activePack.pack_barcode }));
                setOrdersModalVisible(false);
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

  const onSubmit = (code: string) => {
    setScan(code);
    const trimmed = code.trim().toUpperCase();
    if (trimmed.startsWith('PKG')) {
      void handlePackScan(code);
      return;
    }
    if (!activePack || activePack.status === 'in_transit') {
      void handleOrderLookupScan(code);
      return;
    }
    void handleOrderScan(code);
  };

  if (!store) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>{t.common.loginHubFirst}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {cloudConnected === false ? (
        <View style={styles.cloudWarnBox}>
          <Text style={styles.cloudWarnTitle}>{t.hubReceive.cloudRequiredTitle}</Text>
          <Text style={styles.cloudWarnText}>{t.hubReceive.cloudRequiredHint}</Text>
        </View>
      ) : null}
      {!hasShiftOperator ? (
        <View style={styles.operatorWarnBox}>
          <Text style={styles.operatorWarnTitle}>{t.settings.operator.requiredTitle}</Text>
          <Text style={styles.operatorWarnText}>{t.settings.operator.requiredHint}</Text>
        </View>
      ) : null}

      <View style={styles.zoneCard}>
        <Text style={styles.zoneTitle}>
          {fmt(t.hubReceive.zoneTitle, { hub: hubCode ? regionDisplayLabel(hubCode) : t.common.notSet })}
        </Text>
        <Text style={styles.zoneSub}>
          {store.storeCode} · {store.storeName}
        </Text>
        <Text style={styles.zoneHint}>{t.hubReceive.zoneHint}</Text>
      </View>

      <ScanInputBar
        value={scan}
        onChangeText={setScan}
        onSubmit={onSubmit}
        busy={loading}
        cameraScan={{
          title: t.hubReceive.cameraTitle,
          subtitle: t.hubReceive.cameraSubtitle,
        }}
        placeholder={t.hubReceive.scanPlaceholder}
        label={t.hubReceive.scanLabel}
      />

      {loading && !ordersModalVisible ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#38bdf8" />
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {message ? (
        <View style={styles.okBox}>
          <Text style={styles.okText}>{message}</Text>
        </View>
      ) : null}

      {activePack && !ordersModalVisible ? (
        <Pressable style={styles.reopenBtn} onPress={() => setOrdersModalVisible(true)}>
          <Text style={styles.reopenBtnTitle}>{activePack.pack_barcode}</Text>
          <Text style={styles.reopenBtnSub}>
            {getPkgStatusLabel(t, activePack.status)} · {t.common.progress}{' '}
            {activePack.received_order_count}/{activePack.item_count} · {t.common.continueDispatch}
          </Text>
        </Pressable>
      ) : null}

      <HubReceiveOrdersModal
        visible={ordersModalVisible}
        pack={activePack}
        hubCode={hubCode}
        store={store}
        loading={loading}
        confirmingOrderId={confirmingOrderId}
        payingTransportFee={payingTransportFee}
        transportFeePaid={transportFeePaid}
        onClose={() => setOrdersModalVisible(false)}
        onConfirmPack={() => void handleConfirmPack()}
        onConfirmOrder={(orderId) => void handleConfirmOrder(orderId)}
        onPayTransportFee={handlePayTransportFee}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' },
  hint: { color: '#94a3b8' },
  zoneCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  zoneTitle: { color: '#7dd3fc', fontSize: 16, fontWeight: '900' },
  zoneSub: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  zoneHint: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 8 },
  cloudWarnBox: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.45)',
  },
  cloudWarnTitle: { color: '#fcd34d', fontWeight: '900', fontSize: 14 },
  cloudWarnText: { color: '#fde68a', fontSize: 12, lineHeight: 18, marginTop: 6 },
  operatorWarnBox: {
    backgroundColor: 'rgba(14,165,233,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.35)',
  },
  operatorWarnTitle: { color: '#7dd3fc', fontWeight: '900', fontSize: 14 },
  operatorWarnText: { color: '#bae6fd', fontSize: 12, lineHeight: 18, marginTop: 6 },
  loadingBox: { alignItems: 'center', paddingVertical: 12 },
  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
  },
  errorText: { color: '#fca5a5', fontSize: 13, lineHeight: 20 },
  okBox: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  okText: { color: '#86efac', fontSize: 13, lineHeight: 20 },
  reopenBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 4,
  },
  reopenBtnTitle: {
    color: '#d8b4fe',
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  reopenBtnSub: { color: '#94a3b8', fontSize: 12, marginTop: 6 },
});
