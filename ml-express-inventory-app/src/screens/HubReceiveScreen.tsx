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
  importHubReceivedPackToLocal,
  releaseHubTransitOrders,
  deliverLocalHubOrderToInventory,
} from '../services/inventoryService';
import { isSupabaseConfigured, getSupabaseConfigHint } from '../services/supabase';
import {
  confirmOrderHubReceived,
  confirmOrderInPackById,
  confirmPkgHubReceived,
  formatPkgNotFoundHint,
  getPkgTrackingDetail,
} from '../services/trackingService';
import type { PkgTrackingDetail } from '../types/tracking';
import { PKG_STATUS_LABEL } from '../types/tracking';
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
  const [releasing, setReleasing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const applyOrderSuccess = useCallback(
    async (pkg: PkgTrackingDetail) => {
      setActivePack(pkg);
      const total = pkg.item_count;

      if (pkg.status === 'split_at_hub') {
        const released = pkg.orders.filter((o) => o.status === 'released_at_hub').length;
        setMessage(
          `🎉 分拨完成！本站订单已入库，${released} 个中转订单已释放，请至「快递明细」重新打包`,
        );
        showTaskSuccess(
          '分拨完成',
          `快递包 ${pkg.pack_barcode} 已完成分拨。\n中转订单请至「快递明细」勾选后重新打包发往下一站。`,
        );
        setOrdersModalVisible(false);
        return;
      }

      if (pkg.status === 'completed' && store) {
        if (pkg.orders.every((o) => o.status === 'hub_received')) {
          try {
            const imported = await importHubReceivedPackToLocal(
              pkg,
              store,
              operatorName ?? '工作人员',
            );
            const syncHint = imported ? '，已同步至「打包」列表可继续中转' : '';
            setMessage(`🎉 全部完成！${pkg.pack_barcode} 内 ${total} 个订单均已确认入库${syncHint}`);
            showTaskSuccess('收货完成', `快递包 ${pkg.pack_barcode} 全部订单已确认入库${syncHint}`);
          } catch (e: unknown) {
            const syncErr = e instanceof Error ? e.message : '同步打包列表失败';
            setMessage(`🎉 全部完成！${pkg.pack_barcode} 内 ${total} 个订单均已确认入库（⚠️ ${syncErr}）`);
            Alert.alert('完成', `订单已全部确认，但写入打包列表失败：${syncErr}`);
          }
        } else {
          setMessage(`🎉 全部完成！${pkg.pack_barcode} 内订单已处理完毕`);
        }
        setOrdersModalVisible(false);
        return;
      }

      setMessage(`已处理 ${pkg.received_order_count}/${total} 个订单，请在弹窗中继续分拨`);
    },
    [store, operatorName],
  );

  const openPackOrdersModal = useCallback((detail: PkgTrackingDetail) => {
    setActivePack(detail);
    setOrdersModalVisible(true);
  }, []);

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
      setActivePack(updated);
      setMessage(
        `✓ 快递包 ${updated.pack_barcode} 已确认到站，请在本站订单上点「确认入库」，中转订单点「释放中转」`,
      );
      showTaskSuccess('到站收货成功', `请在订单列表中分拨 ${updated.item_count} 个订单`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '确认失败');
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
      await deliverLocalHubOrderToInventory({
        order,
        pkg,
        store,
        hubCode,
        operator: operatorName ?? '工作人员',
      });
      showTaskSuccess('入库成功', `订单 ${order.order_barcode} 已确认入库`);
      await applyOrderSuccess(pkg);
      setScan('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '确认失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseTransit = async () => {
    if (!store || !activePack) return;
    setReleasing(true);
    setError('');
    try {
      const { releasedCount } = await releaseHubTransitOrders({
        packBarcode: activePack.pack_barcode,
        store,
        hubCode,
        operator: operatorName ?? '工作人员',
      });
      showTaskSuccess(
        '中转释放成功',
        `已释放 ${releasedCount} 个中转订单，请至「快递明细」重新打包`,
      );
      const updated = await getPkgTrackingDetail(activePack.pack_barcode);
      if (updated) await applyOrderSuccess(updated);
      else setMessage(`已释放 ${releasedCount} 个中转订单`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '释放失败');
    } finally {
      setReleasing(false);
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    if (!store) return;
    setError('');
    setConfirmingOrderId(orderId);
    try {
      const { order, pkg } = await confirmOrderInPackById(orderId, store, hubCode);
      await deliverLocalHubOrderToInventory({
        order,
        pkg,
        store,
        hubCode,
        operator: operatorName ?? '工作人员',
      });
      showTaskSuccess('入库成功', `订单 ${order.order_barcode} 已确认入库`);
      await applyOrderSuccess(pkg);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '确认失败');
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const onSubmit = (code: string) => {
    setScan(code);
    const trimmed = code.trim().toUpperCase();
    if (trimmed.startsWith('PKG') || !activePack || activePack.status === 'in_transit') {
      void handlePackScan(code);
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
          扫描快递包后弹出订单列表：本站订单点「确认入库」，需中转的订单点「释放中转订单」
        </Text>
      </View>

      <ScanInputBar
        value={scan}
        onChangeText={setScan}
        onSubmit={onSubmit}
        busy={loading}
        cameraScan={{
          title: '扫快递包',
          subtitle: '扫描 PKG 包装号，弹出内含全部订单',
        }}
        placeholder="扫描快递包条码 PKG..."
        label="📦 扫描快递包"
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
        releasing={releasing}
        onClose={() => setOrdersModalVisible(false)}
        onConfirmPack={() => void handleConfirmPack()}
        onConfirmOrder={(orderId) => void handleConfirmOrder(orderId)}
        onReleaseTransit={() => void handleReleaseTransit()}
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
