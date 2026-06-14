import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { InventoryStoreSession } from '../services/authService';
import type { PkgTrackingDetail } from '../types/tracking';
import { ORDER_STATUS_LABEL, PKG_STATUS_LABEL } from '../types/tracking';
import { resolveOrderDestinationCode } from '../utils/orderDestination';

type Props = {
  visible: boolean;
  pack: PkgTrackingDetail | null;
  hubCode: string;
  store: InventoryStoreSession | null;
  loading: boolean;
  confirmingOrderId: string | null;
  releasing: boolean;
  onClose: () => void;
  onConfirmPack: () => void;
  onConfirmOrder: (orderId: string) => void;
  onReleaseTransit: () => void;
};

export default function HubReceiveOrdersModal({
  visible,
  pack,
  hubCode,
  store,
  loading,
  confirmingOrderId,
  releasing,
  onClose,
  onConfirmPack,
  onConfirmOrder,
  onReleaseTransit,
}: Props) {
  if (!pack || !store) return null;

  const packReceived =
    pack.status === 'hub_received' ||
    pack.status === 'completed' ||
    pack.status === 'split_at_hub';
  const packDone = pack.status === 'completed' || pack.status === 'split_at_hub';
  const needsPackConfirm = pack.status === 'in_transit';

  const transitPending = pack.orders.filter(
    (o) => o.status === 'in_transit' && resolveOrderDestinationCode(o) !== hubCode,
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>快递包内含订单</Text>
          <Text style={styles.packageNo} selectable>{pack.pack_barcode}</Text>
          <View style={styles.metaRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{PKG_STATUS_LABEL[pack.status]}</Text>
            </View>
            <Text style={styles.progress}>
              进度 {pack.received_order_count}/{pack.item_count}
            </Text>
          </View>
          <Text style={styles.routeMeta}>
            {pack.origin_store_code} → 本段 {pack.leg_destination_code || pack.destination_code}
            {pack.leg_destination_code && pack.leg_destination_code !== pack.destination_code
              ? ` · 标注 ${pack.destination_code}`
              : ''}
          </Text>

          {needsPackConfirm ? (
            <Pressable
              style={[styles.packConfirmBtn, loading && styles.btnBusy]}
              onPress={onConfirmPack}
              disabled={loading}
            >
              <Text style={styles.packConfirmBtnText}>
                {loading ? '处理中…' : '确认快递包到站收货'}
              </Text>
            </Pressable>
          ) : null}

          {!needsPackConfirm && !packDone ? (
            <Text style={styles.hint}>
              本站订单点「确认入库」；需中转的订单点下方「释放中转订单」后至「快递明细」重新打包
            </Text>
          ) : null}

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {pack.orders.map((line, index) => {
              const orderDest = resolveOrderDestinationCode(line);
              const isLocal = orderDest === hubCode;
              const isDone =
                line.status === 'hub_received' || line.status === 'released_at_hub';
              const canInbound =
                packReceived &&
                pack.status === 'hub_received' &&
                line.status === 'in_transit' &&
                isLocal;
              const isConfirming = confirmingOrderId === line.id;

              return (
                <View
                  key={line.id}
                  style={[styles.orderRow, isDone && styles.orderRowDone]}
                >
                  <Text style={styles.orderIndex}>{index + 1}</Text>
                  <View style={styles.orderBody}>
                    <View style={styles.orderTitleRow}>
                      <Text style={styles.orderName} numberOfLines={1}>
                        {line.order_name}
                      </Text>
                      {orderDest ? (
                        <View
                          style={[
                            styles.destBadge,
                            isLocal ? styles.destBadgeLocal : styles.destBadgeTransit,
                          ]}
                        >
                          <Text
                            style={[
                              styles.destBadgeText,
                              isLocal ? styles.destBadgeTextLocal : styles.destBadgeTextTransit,
                            ]}
                          >
                            {orderDest}
                            {isLocal ? ' 本站' : ' 中转'}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {line.recipient_name?.trim() ? (
                      <Text style={styles.customerName} numberOfLines={1}>
                        {line.recipient_name.trim()}
                      </Text>
                    ) : null}
                    <View style={styles.codeRow}>
                      {line.express_barcode ? (
                        <View style={styles.tagBlue}>
                          <Text style={styles.tagBlueLabel}>快递单</Text>
                          <Text style={styles.tagBlueValue} numberOfLines={1} selectable>
                            {line.express_barcode}
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.tagYellow}>
                        <Text style={styles.tagYellowLabel}>入库单</Text>
                        <Text style={styles.tagYellowValue} numberOfLines={1} selectable>
                          {line.order_barcode}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.orderStatus, isDone && styles.orderStatusDone]}>
                      {ORDER_STATUS_LABEL[line.status]}
                    </Text>
                  </View>
                  {canInbound ? (
                    <Pressable
                      style={[styles.inboundBtn, isConfirming && styles.btnBusy]}
                      onPress={() => onConfirmOrder(line.id)}
                      disabled={isConfirming || loading}
                    >
                      <Text style={styles.inboundBtnText}>
                        {isConfirming ? '…' : '确认入库'}
                      </Text>
                    </Pressable>
                  ) : isDone ? (
                    <View style={styles.doneMark}>
                      <Text style={styles.doneMarkText}>✓</Text>
                    </View>
                  ) : !isLocal && line.status === 'in_transit' && packReceived ? (
                    <View style={styles.transitMark}>
                      <Text style={styles.transitMarkText}>待中转</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>

          {transitPending.length > 0 && pack.status === 'hub_received' ? (
            <Pressable
              style={[styles.transitBtn, (releasing || loading) && styles.btnBusy]}
              onPress={onReleaseTransit}
              disabled={releasing || loading}
            >
              <Text style={styles.transitBtnText}>
                {releasing
                  ? '释放中…'
                  : `释放 ${transitPending.length} 个中转订单（供重新打包）`}
              </Text>
            </Pressable>
          ) : null}

          {loading && !confirmingOrderId && !releasing ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#38bdf8" size="small" />
            </View>
          ) : null}

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>{packDone ? '完成' : '稍后继续'}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.82)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '92%',
  },
  title: { color: '#5eead4', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  packageNo: {
    color: '#d8b4fe',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  statusBadge: {
    backgroundColor: 'rgba(14,165,233,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: { color: '#7dd3fc', fontSize: 11, fontWeight: '900' },
  progress: { color: '#fbbf24', fontSize: 12, fontWeight: '800' },
  routeMeta: { color: '#94a3b8', fontSize: 12, marginTop: 6, lineHeight: 18 },
  hint: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 4,
  },
  packConfirmBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  packConfirmBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  list: { maxHeight: 360, marginTop: 10 },
  listContent: { gap: 8, paddingBottom: 4 },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  orderRowDone: { borderColor: 'rgba(34,197,94,0.4)' },
  orderIndex: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '900',
    width: 18,
    textAlign: 'center',
  },
  orderBody: { flex: 1, minWidth: 0 },
  orderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  orderName: { color: '#f8fafc', fontSize: 14, fontWeight: '800', flexShrink: 1 },
  customerName: { color: '#7dd3fc', fontSize: 12, fontWeight: '700', marginTop: 2 },
  destBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  destBadgeLocal: { backgroundColor: 'rgba(34,197,94,0.15)' },
  destBadgeTransit: { backgroundColor: 'rgba(168,85,247,0.15)' },
  destBadgeText: { fontSize: 10, fontWeight: '900' },
  destBadgeTextLocal: { color: '#4ade80' },
  destBadgeTextTransit: { color: '#c4b5fd' },
  codeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  tagBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  tagYellowLabel: { color: '#fbbf24', fontSize: 10, fontWeight: '800' },
  tagYellowValue: {
    color: '#fde68a',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  orderStatus: { color: '#fb923c', fontSize: 11, fontWeight: '900', marginTop: 4 },
  orderStatusDone: { color: '#4ade80' },
  inboundBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 72,
    alignItems: 'center',
  },
  inboundBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  doneMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneMarkText: { color: '#4ade80', fontSize: 18, fontWeight: '900' },
  transitMark: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.35)',
  },
  transitMarkText: { color: '#c4b5fd', fontSize: 10, fontWeight: '900' },
  transitBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  transitBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  loadingRow: { alignItems: 'center', paddingVertical: 8 },
  btnBusy: { opacity: 0.6 },
  closeBtn: {
    marginTop: 12,
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  closeBtnText: { color: '#e2e8f0', fontWeight: '800', fontSize: 15 },
});
