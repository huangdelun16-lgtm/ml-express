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
import ScanInputBar from '../components/ScanInputBar';
import HubReceiveOrdersModal from '../components/HubReceiveOrdersModal';
import { useAuth } from '../contexts/AuthContext';
import {
  deliverHubOrderInboundAtStation,
  importInboundPackToLocal,
  maybeAutoReleaseTransitAfterAllInbound,
} from '../services/inventoryService';
import {
  isHubTransportFeePaid,
  markHubTransportFeePaid,
  formatTransportFeeDisplay,
} from '../services/hubTransportFeeService';
import { isSupabaseConfigured, getSupabaseConfigHint } from '../services/supabase';
import {
  confirmOrderHubReceived,
  confirmOrderInPackById,
  confirmPkgHubReceived,
  formatOrderNotFoundHint,
  formatPkgNotFoundHint,
  getOrderTrackingByBarcode,
  getPkgTrackingDetail,
} from '../services/trackingService';
import type { PkgTrackingDetail } from '../types/tracking';
import { ORDER_STATUS_LABEL, PKG_STATUS_LABEL } from '../types/tracking';
import { resolveStoreHubCode } from '../utils/storeZone';
import { showTaskSuccess } from '../utils/taskSuccessAlert';

export default function HubReceiveScreen() {
  const { store, operatorName } = useAuth();
  const hubCode = store ? resolveStoreHubCode(store) : '';
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

  const applyOrderSuccess = useCallback(
    async (pkg: PkgTrackingDetail) => {
      setActivePack(pkg);
      await refreshTransportFeePaid(pkg.pack_barcode);
      if (store && pkg.status !== 'in_transit') {
        try {
          await importInboundPackToLocal(pkg, store, operatorName ?? '工作人员');
        } catch (e: unknown) {
          const syncErr = e instanceof Error ? e.message : '同步打包列表失败';
          setError(`订单已确认，但写入打包列表失败：${syncErr}`);
        }
      }
      const total = pkg.item_count;

      if (pkg.status === 'split_at_hub') {
        const released = pkg.orders.filter((o) => o.status === 'released_at_hub').length;
        setMessage(
          `分拨完成，${released} 个中转订单已加入「快递明细」待重新打包。请支付车费后完成`,
        );
        showTaskSuccess('分拨完成', '请至「快递明细」重新打包中转订单');
        return;
      }

      if (pkg.status === 'completed' && store) {
        setMessage(`全部订单已处理，请支付车费后完成`);
        showTaskSuccess('收货完成', `请支付本段车费后关闭窗口`);
        return;
      }

      setMessage(`已处理 ${pkg.received_order_count}/${total} 个订单，请在弹窗中继续分拨`);
    },
    [store, operatorName, refreshTransportFeePaid],
  );

  const finishInboundFlow = useCallback(
    async (pkg: PkgTrackingDetail) => {
      await applyOrderSuccess(pkg);
      if (!store) return;

      const { releasedCount } = await maybeAutoReleaseTransitAfterAllInbound({
        packBarcode: pkg.pack_barcode,
        store,
        hubCode,
        operator: operatorName ?? '工作人员',
      });
      if (releasedCount > 0) {
        const updated = await getPkgTrackingDetail(pkg.pack_barcode);
        if (updated) {
          setActivePack(updated);
          setMessage(
            `全部订单已入库，${releasedCount} 个中转订单已加入「快递明细」待重新打包`,
          );
          showTaskSuccess('分拨完成', '请至「快递明细」重新打包中转订单');
        }
      }
    },
    [applyOrderSuccess, store, hubCode, operatorName],
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
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        setError(getSupabaseConfigHint() || '本机未配置 Supabase，无法查询云端追踪');
        setActivePack(null);
        setOrdersModalVisible(false);
        return;
      }

      const detail = await getPkgTrackingDetail(code);
      if (!detail) {
        setError(formatPkgNotFoundHint(code, hubCode));
        setActivePack(null);
        setOrdersModalVisible(false);
        return;
      }

      openPackOrdersModal(detail);

      if (detail.status === 'in_transit') {
        const leg = detail.leg_destination_code || detail.destination_code;
        setMessage(
          `已识别快递包 ${detail.pack_barcode}，请在弹窗中确认到站并分拨 ${detail.item_count} 个订单`,
        );
      } else {
        setMessage(`已打开快递包 ${detail.pack_barcode}，内含 ${detail.item_count} 个订单待分拨`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '查询失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPack = async () => {
    if (!store || !activePack) return;
    setLoading(true);
    setError('');
    try {
      const updated = await confirmPkgHubReceived(activePack.pack_barcode, store, hubCode);
      try {
        await importInboundPackToLocal(updated, store, operatorName ?? '工作人员');
      } catch (e: unknown) {
        const syncErr = e instanceof Error ? e.message : '同步打包列表失败';
        setError(`到站已确认，但写入打包列表失败：${syncErr}`);
      }
      setActivePack(updated);
      setMessage(
        `✓ 快递包 ${updated.pack_barcode} 已确认到站并同步至「打包」列表。请逐单点「入库」完成分拨`,
      );
      showTaskSuccess(
        '到站收货成功',
        `请在弹窗中为每个订单（含中转订单）点「入库」`,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '确认失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderLookupScan = async (code: string) => {
    if (!store) return;
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        setError(getSupabaseConfigHint() || '本机未配置 Supabase，无法查询云端追踪');
        setActivePack(null);
        setOrdersModalVisible(false);
        return;
      }

      const order = await getOrderTrackingByBarcode(code, hubCode);
      if (!order) {
        setError(formatOrderNotFoundHint(code, hubCode));
        setActivePack(null);
        setOrdersModalVisible(false);
        return;
      }

      const detail = await getPkgTrackingDetail(order.pack_barcode);
      if (!detail) {
        setError(
          `已找到入库单 ${order.order_barcode}，但关联快递包 ${order.pack_barcode} 未同步云端。\n\n请确认发站已在「装车出库」完成并提示「已同步云端」。`,
        );
        setActivePack(null);
        setOrdersModalVisible(false);
        return;
      }

      openPackOrdersModal(detail);

      if (detail.status === 'in_transit') {
        setMessage(
          `已识别入库单 ${order.order_barcode}，所属包裹 ${detail.pack_barcode}。\n请先点「确认到站收货」，再在弹窗中点「入库」`,
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
          operator: operatorName ?? '工作人员',
        });
        showTaskSuccess('入库成功', `订单 ${confirmed.order_barcode} 已确认入库`);
        await finishInboundFlow(pkg);
        setScan('');
        return;
      }

      setMessage(
        `入库单 ${order.order_barcode} 已处理（${ORDER_STATUS_LABEL[order.status]}）`,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '查询失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderScan = async (code: string) => {
    if (!store) return;
    setError('');
    setLoading(true);
    try {
      const { order, pkg } = await confirmOrderHubReceived(code, store, hubCode);
      await deliverHubOrderInboundAtStation({
        order,
        pkg,
        store,
        hubCode,
        operator: operatorName ?? '工作人员',
      });
      showTaskSuccess('入库成功', `订单 ${order.order_barcode} 已确认入库`);
      await finishInboundFlow(pkg);
      setScan('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '确认失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    if (!store) return;
    setError('');
    setConfirmingOrderId(orderId);
    try {
      const { order, pkg } = await confirmOrderInPackById(orderId, store, hubCode);
      await deliverHubOrderInboundAtStation({
        order,
        pkg,
        store,
        hubCode,
        operator: operatorName ?? '工作人员',
      });
      showTaskSuccess('入库成功', `订单 ${order.order_barcode} 已确认入库`);
      await finishInboundFlow(pkg);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '确认失败');
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handlePayTransportFee = () => {
    if (!store || !activePack) return;
    const feeDisplay = formatTransportFeeDisplay(activePack.transport_fee);
    const legDest = activePack.leg_destination_code || activePack.destination_code || hubCode;

    Alert.alert(
      '确认支付车费',
      `快递包 ${activePack.pack_barcode}\n路线 ${activePack.origin_store_code} → ${legDest}\n车费 ${feeDisplay}\n\n确认已向发站支付本段车费？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认支付',
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
                  operator: operatorName ?? '工作人员',
                  store,
                });
                setTransportFeePaid(true);
                showTaskSuccess('支付成功', `已登记车费 ${feeDisplay}`);
                setMessage(`✓ ${activePack.pack_barcode} 车费已支付`);
                setOrdersModalVisible(false);
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : '支付失败');
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
        <Text style={styles.hint}>请先登录中转站账号</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.zoneCard}>
        <Text style={styles.zoneTitle}>本站服务区域 · {hubCode || '未设置'}</Text>
        <Text style={styles.zoneSub}>
          {store.storeCode} · {store.storeName}
        </Text>
        <Text style={styles.zoneHint}>
          先扫快递包 PKG 确认到站；包内每个订单（含经本站中转的）均点「入库」。全部入库后中转订单自动进入「快递明细」待重新打包
        </Text>
      </View>

      <ScanInputBar
        value={scan}
        onChangeText={setScan}
        onSubmit={onSubmit}
        busy={loading}
        cameraScan={{
          title: '扫包裹或入库单',
          subtitle: 'PKG 包装号，或包内入库单/快递单条码',
        }}
        placeholder="扫描 PKG 或入库单条码"
        label="📦 扫描快递包 / 入库单"
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
            {PKG_STATUS_LABEL[activePack.status]} · 进度{' '}
            {activePack.received_order_count}/{activePack.item_count} · 点击继续分拨
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
