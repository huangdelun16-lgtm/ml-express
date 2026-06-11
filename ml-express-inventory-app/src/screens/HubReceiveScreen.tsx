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
import { useAuth } from '../contexts/AuthContext';
import { importHubReceivedPackToLocal, releaseHubTransitOrders } from '../services/inventoryService';
import { isSupabaseConfigured, getSupabaseConfigHint } from '../services/supabase';
import {
  confirmOrderHubReceived,
  confirmOrderInPackById,
  confirmPkgHubReceived,
  formatPkgNotFoundHint,
  getPkgTrackingDetail,
} from '../services/trackingService';
import type { PkgTrackingDetail } from '../types/tracking';
import { ORDER_STATUS_LABEL, PKG_STATUS_LABEL } from '../types/tracking';
import { resolveOrderDestinationCode } from '../utils/orderDestination';
import { resolveStoreHubCode } from '../utils/storeZone';

type ScanMode = 'pack' | 'order';

export default function HubReceiveScreen() {
  const { store, operatorName } = useAuth();
  const hubCode = store ? resolveStoreHubCode(store) : '';
  const [scan, setScan] = useState('');
  const [scanMode, setScanMode] = useState<ScanMode>('pack');
  const [activePack, setActivePack] = useState<PkgTrackingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const applyOrderSuccess = useCallback(
    async (pkg: PkgTrackingDetail) => {
      setActivePack(pkg);
      const done = pkg.received_order_count;
      const total = pkg.item_count;

      if (pkg.status === 'split_at_hub') {
        const released = pkg.orders.filter((o) => o.status === 'released_at_hub').length;
        setMessage(
          `🎉 分拨完成！本站订单已交付，${released} 个待转出订单已释放，请至「快递明细」重新打包`,
        );
        Alert.alert(
          '分拨完成',
          `快递包 ${pkg.pack_barcode} 已完成分拨。\n待转出订单请至「快递明细」勾选后重新打包发往下一站。`,
        );
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
            setMessage(`🎉 全部完成！${pkg.pack_barcode} 内 ${total} 个订单均已确认收货${syncHint}`);
            Alert.alert('完成', `快递包 ${pkg.pack_barcode} 全部订单已确认收货${syncHint}`);
          } catch (e: unknown) {
            const syncErr = e instanceof Error ? e.message : '同步打包列表失败';
            setMessage(`🎉 全部完成！${pkg.pack_barcode} 内 ${total} 个订单均已确认收货（⚠️ ${syncErr}）`);
            Alert.alert('完成', `订单已全部确认，但写入打包列表失败：${syncErr}`);
          }
        } else {
          setMessage(`🎉 全部完成！${pkg.pack_barcode} 内订单已处理完毕`);
        }
        return;
      }

      setMessage(`已处理 ${done}/${total} 个订单，请继续分拨剩余订单`);
    },
    [store, operatorName],
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
        return;
      }

      const detail = await getPkgTrackingDetail(code);
      if (!detail) {
        setError(formatPkgNotFoundHint(code, hubCode));
        setActivePack(null);
        return;
      }
      setActivePack(detail);
      if (detail.status === 'in_transit') {
        setScanMode('pack');
        const leg = detail.leg_destination_code || detail.destination_code;
        setMessage(
          `包裹 ${detail.pack_barcode} 运输中，${detail.origin_store_code} → 本段 ${leg}（标注 ${detail.destination_code}）`,
        );
      } else {
        setScanMode('order');
        setMessage(`包裹已到站，请继续扫描内含 ${detail.item_count} 个订单`);
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
      setScanMode('order');
      setMessage(`✓ 快递包 ${updated.pack_barcode} 已确认到站，请逐单扫码或点击「确认」核实订单`);
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
      const { pkg } = await confirmOrderHubReceived(code, store, hubCode);
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
    const transitCount = activePack.orders.filter(
      (o) => o.status === 'in_transit' && resolveOrderDestinationCode(o) !== hubCode,
    ).length;
    if (transitCount === 0) {
      Alert.alert('提示', '没有待释放的中转订单');
      return;
    }

    Alert.alert(
      '释放待转出订单',
      `将把 ${transitCount} 个非 ${hubCode} 订单从包裹中释放，并写入本地库存供重新打包。是否继续？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认释放',
          onPress: () => {
            setReleasing(true);
            setError('');
            void (async () => {
              try {
                const { releasedCount } = await releaseHubTransitOrders({
                  packBarcode: activePack.pack_barcode,
                  store,
                  hubCode,
                  operator: operatorName ?? '工作人员',
                });
                const updated = await getPkgTrackingDetail(activePack.pack_barcode);
                if (updated) await applyOrderSuccess(updated);
                else setMessage(`已释放 ${releasedCount} 个待转出订单`);
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : '释放失败');
              } finally {
                setReleasing(false);
              }
            })();
          },
        },
      ],
    );
  };

  const handleConfirmOrder = async (orderId: string) => {
    if (!store) return;
    setError('');
    setConfirmingOrderId(orderId);
    try {
      const { pkg } = await confirmOrderInPackById(orderId, store, hubCode);
      await applyOrderSuccess(pkg);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '确认失败');
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const onSubmit = (code: string) => {
    setScan(code);
    if (scanMode === 'pack' && activePack?.status === 'in_transit') {
      void handlePackScan(code);
      return;
    }
    if (scanMode === 'order' || activePack?.status === 'hub_received') {
      void handleOrderScan(code);
      return;
    }
    void handlePackScan(code);
  };

  if (!store) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>请先登录中转站账号</Text>
      </View>
    );
  }

  const packDone =
    activePack?.status === 'completed' || activePack?.status === 'split_at_hub';
  const packReceived =
    activePack?.status === 'hub_received' ||
    activePack?.status === 'completed' ||
    activePack?.status === 'split_at_hub';
  const transitPendingCount = activePack
    ? activePack.orders.filter(
        (o) => o.status === 'in_transit' && resolveOrderDestinationCode(o) !== hubCode,
      ).length
    : 0;
  const showPackConfirm =
    activePack?.status === 'in_transit' && scanMode === 'pack';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.zoneCard}>
        <Text style={styles.zoneTitle}>本站服务区域 · {hubCode || '未设置'}</Text>
        <Text style={styles.zoneSub}>
          {store.storeCode} · {store.storeName}
        </Text>
        <Text style={styles.zoneHint}>
          ① 扫包确认到站 → ② 本站订单点「确认」交付 → ③ 非本站订单点「释放待转出」后至「快递明细」重新打包
        </Text>
      </View>

      <View style={styles.stepRow}>
        <View style={[styles.step, !packReceived && styles.stepActive]}>
          <Text style={styles.stepNum}>1</Text>
          <Text style={styles.stepText}>收包</Text>
        </View>
        <Text style={styles.stepArrow}>→</Text>
        <View style={[styles.step, packReceived && !packDone && styles.stepActive]}>
          <Text style={styles.stepNum}>2</Text>
          <Text style={styles.stepText}>收单</Text>
        </View>
      </View>

      <ScanInputBar
        value={scan}
        onChangeText={setScan}
        onSubmit={onSubmit}
        busy={loading}
        cameraScan={{
          title: showPackConfirm || !packReceived ? '扫快递包' : '扫订单',
          subtitle:
            showPackConfirm || !packReceived
              ? '扫描 PKG 包装号确认到站'
              : '扫描快递单或入库条码确认收货',
        }}
        placeholder={
          showPackConfirm || !activePack
            ? '扫描快递包条码 PKG...'
            : '扫描快递单 / 入库条码'
        }
        label={showPackConfirm || !packReceived ? '📦 扫描快递包' : '📋 扫描订单'}
      />

      {loading ? (
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

      {showPackConfirm ? (
        <Pressable style={styles.confirmBtn} onPress={() => void handleConfirmPack()}>
          <Text style={styles.confirmBtnText}>确认快递包到站收货</Text>
        </Pressable>
      ) : null}

      {activePack ? (
        <View style={styles.packCard}>
          <View style={styles.packHeader}>
            <Text style={styles.packBarcode}>{activePack.pack_barcode}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{PKG_STATUS_LABEL[activePack.status]}</Text>
            </View>
          </View>
          <Text style={styles.packMeta}>
            {activePack.origin_store_code} → 本段{' '}
            {activePack.leg_destination_code || activePack.destination_code}
            {activePack.leg_destination_code &&
            activePack.leg_destination_code !== activePack.destination_code
              ? ` · 标注 ${activePack.destination_code}`
              : ''}{' '}
            · {activePack.item_count} 件
          </Text>
          <Text style={styles.packProgress}>
            订单进度 {activePack.received_order_count}/{activePack.item_count}
          </Text>

          {transitPendingCount > 0 && activePack.status === 'hub_received' ? (
            <Pressable
              style={[styles.releaseBtn, releasing && styles.releaseBtnBusy]}
              onPress={() => void handleReleaseTransit()}
              disabled={releasing || loading}
            >
              <Text style={styles.releaseBtnText}>
                {releasing ? '释放中…' : `释放 ${transitPendingCount} 个待转出订单`}
              </Text>
            </Pressable>
          ) : null}

          {activePack.orders.map((line) => {
            const orderDest = resolveOrderDestinationCode(line);
            const isLocalOrder = orderDest === hubCode;
            const canConfirm =
              packReceived &&
              activePack.status === 'hub_received' &&
              line.status === 'in_transit' &&
              isLocalOrder;
            const isConfirming = confirmingOrderId === line.id;
            const isDone = line.status === 'hub_received' || line.status === 'released_at_hub';

            return (
              <View key={line.id} style={[styles.orderRow, isDone && styles.orderRowDone]}>
                <View style={styles.orderMain}>
                  <View style={styles.orderTitleRow}>
                    <Text style={styles.orderName} numberOfLines={1}>
                      {line.order_name}
                    </Text>
                    {orderDest ? (
                      <View
                        style={[
                          styles.destBadge,
                          isLocalOrder ? styles.destBadgeLocal : styles.destBadgeTransit,
                        ]}
                      >
                        <Text
                          style={[
                            styles.destBadgeText,
                            isLocalOrder ? styles.destBadgeTextLocal : styles.destBadgeTextTransit,
                          ]}
                        >
                          {orderDest}
                          {isLocalOrder ? ' 本站' : ' 转出'}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {line.express_barcode ? (
                    <Text style={styles.orderCode}>快递单 {line.express_barcode}</Text>
                  ) : null}
                  <Text style={styles.orderCode}>入库 {line.order_barcode}</Text>
                  <Text style={[styles.orderStatus, isDone && styles.orderStatusDone]}>
                    {ORDER_STATUS_LABEL[line.status]}
                  </Text>
                </View>
                {canConfirm ? (
                  <Pressable
                    style={[styles.orderConfirmBtn, isConfirming && styles.orderConfirmBtnBusy]}
                    onPress={() => void handleConfirmOrder(line.id)}
                    disabled={isConfirming || loading}
                  >
                    <Text style={styles.orderConfirmBtnText}>
                      {isConfirming ? '…' : '确认'}
                    </Text>
                  </Pressable>
                ) : isDone ? (
                  <View style={styles.orderDoneMark}>
                    <Text style={styles.orderDoneMarkText}>✓</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

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
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  step: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 10,
    opacity: 0.6,
  },
  stepActive: { opacity: 1, borderWidth: 1, borderColor: '#38bdf8' },
  stepNum: { color: '#38bdf8', fontWeight: '900', fontSize: 16 },
  stepText: { color: '#e2e8f0', fontWeight: '800', fontSize: 13 },
  stepArrow: { color: '#64748b', fontWeight: '900' },
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
  confirmBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  confirmBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  packCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  packHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  packBarcode: { color: '#d8b4fe', fontSize: 15, fontWeight: '900', fontFamily: 'monospace', flex: 1 },
  statusBadge: {
    backgroundColor: 'rgba(14,165,233,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: { color: '#7dd3fc', fontSize: 11, fontWeight: '900' },
  packMeta: { color: '#94a3b8', fontSize: 12, marginTop: 6 },
  packProgress: { color: '#fbbf24', fontSize: 13, fontWeight: '800', marginTop: 4, marginBottom: 10 },
  releaseBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  releaseBtnBusy: { opacity: 0.6 },
  releaseBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  orderRowDone: { borderColor: 'rgba(34,197,94,0.4)' },
  orderMain: { flex: 1, minWidth: 0 },
  orderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  orderName: { color: '#f8fafc', fontSize: 14, fontWeight: '800', flexShrink: 1 },
  destBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  destBadgeLocal: { backgroundColor: 'rgba(34,197,94,0.15)' },
  destBadgeTransit: { backgroundColor: 'rgba(168,85,247,0.15)' },
  destBadgeText: { fontSize: 10, fontWeight: '900' },
  destBadgeTextLocal: { color: '#4ade80' },
  destBadgeTextTransit: { color: '#c4b5fd' },
  orderCode: { color: '#fde68a', fontSize: 11, fontFamily: 'monospace', marginTop: 2 },
  orderStatus: { color: '#fb923c', fontSize: 11, fontWeight: '900', marginTop: 4 },
  orderStatusDone: { color: '#4ade80' },
  orderConfirmBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 56,
    alignItems: 'center',
  },
  orderConfirmBtnBusy: { opacity: 0.6 },
  orderConfirmBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  orderDoneMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderDoneMarkText: { color: '#4ade80', fontSize: 18, fontWeight: '900' },
});
