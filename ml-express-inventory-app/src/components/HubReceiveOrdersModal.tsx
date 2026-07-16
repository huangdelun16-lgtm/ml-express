import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { InventoryStoreSession } from '../services/authService';
import type { PkgTrackingDetail } from '../types/tracking';
import { getOrderStatusLabel, getPkgStatusLabel, getTransportFeeDisplay, useTranslation } from '../i18n';
import { resolveOrderDestinationCode } from '../utils/orderDestination';
import { parseTransportFeeAmount } from '../services/hubTransportFeeService';
import { canReleaseTransitManually } from '../utils/inventoryReliability';

function hubOrderStatusLabel(
  line: PkgTrackingDetail['orders'][number],
  hubCode: string,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  const orderDest = resolveOrderDestinationCode(line);
  const isLocal = orderDest === hubCode;
  if (line.status === 'hub_received' && !isLocal) return t.tracking.hubInboundDone;
  return getOrderStatusLabel(t, line.status);
}

type Props = {
  visible: boolean;
  pack: PkgTrackingDetail | null;
  hubCode: string;
  store: InventoryStoreSession | null;
  loading: boolean;
  confirmingOrderId: string | null;
  payingTransportFee: boolean;
  transportFeePaid: boolean;
  releasingTransit: boolean;
  onClose: () => void;
  onConfirmPack: () => void;
  onConfirmOrder: (orderId: string) => void;
  onPayTransportFee: () => void;
  onReleaseTransit: () => void;
};

export default function HubReceiveOrdersModal({
  visible,
  pack,
  hubCode,
  store,
  loading,
  confirmingOrderId,
  payingTransportFee,
  transportFeePaid,
  releasingTransit,
  onClose,
  onConfirmPack,
  onConfirmOrder,
  onPayTransportFee,
  onReleaseTransit,
}: Props) {
  const { t, fmt } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();

  const layout = useMemo(() => {
    const cardMax = windowHeight * 0.92;
    const headerEstimate = needsPackConfirmEstimate(pack);
    const footerEstimate = 148;
    const orderListMax = Math.max(180, cardMax - headerEstimate - footerEstimate);
    return { cardMax, orderListMax };
  }, [windowHeight, pack?.status, pack?.orders.length]);

  if (!pack || !store) return null;

  const packReceived =
    pack.status === 'hub_received' ||
    pack.status === 'completed' ||
    pack.status === 'split_at_hub';
  const packDone = pack.status === 'completed' || pack.status === 'split_at_hub';
  const needsPackConfirm = pack.status === 'in_transit';

  const ordersAllProcessed = pack.orders.every((o) => o.status !== 'in_transit');
  const legDest = pack.leg_destination_code || pack.destination_code || hubCode;
  const feeDisplay = getTransportFeeDisplay(t, pack.transport_fee);
  const feeAmount = parseTransportFeeAmount(pack.transport_fee);
  const canPayTransportFee =
    packReceived &&
    ordersAllProcessed &&
    !transportFeePaid &&
    feeAmount > 0 &&
    !needsPackConfirm;
  const needsFeePayment =
    ordersAllProcessed && feeAmount > 0 && !transportFeePaid && !needsPackConfirm;
  const canDismiss = !needsFeePayment;
  const transitOrders = pack.orders.filter((line) => resolveOrderDestinationCode(line) !== hubCode);
  const canReleaseTransit = canReleaseTransitManually({
    packageStatus: pack.status,
    hasTransitOrders: transitOrders.length > 0,
    hasUnreleasedTransitOrders: transitOrders.some((line) => line.status === 'hub_received'),
  });

  const handleDismiss = () => {
    if (canDismiss) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.overlay}>
        {canDismiss ? (
          <Pressable style={styles.backdrop} onPress={handleDismiss} accessibilityLabel={t.common.close} />
        ) : (
          <View style={styles.backdrop} />
        )}
        <View style={[styles.card, { maxHeight: layout.cardMax }]}>
          <View style={styles.headerBlock}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{t.hubReceive.modalTitle}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{getPkgStatusLabel(t, pack.status)}</Text>
              </View>
              <Text style={styles.progress}>
                {pack.received_order_count}/{pack.item_count}
              </Text>
            </View>
            <Text style={styles.packageNo} selectable>{pack.pack_barcode}</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.routeMeta} numberOfLines={1}>
                {pack.origin_store_code} → {legDest}
              </Text>
              <Text style={styles.feeInline}>{feeDisplay}</Text>
              {transportFeePaid ? (
                <Text style={styles.feePaidChip}>{t.common.paid}</Text>
              ) : null}
            </View>

            {needsPackConfirm ? (
              <Pressable
                style={[styles.packConfirmBtn, loading && styles.btnBusy]}
                onPress={onConfirmPack}
                disabled={loading}
              >
                <Text style={styles.packConfirmBtnText}>
                  {loading ? t.common.processing : t.hubReceive.modalConfirmPack}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            style={[styles.orderScroll, { maxHeight: layout.orderListMax }]}
            contentContainerStyle={styles.listContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
          >
            {pack.orders.map((line, index) => {
              const orderDest = resolveOrderDestinationCode(line);
              const isLocal = orderDest === hubCode;
              const isDone =
                line.status === 'hub_received' || line.status === 'released_at_hub';
              const canInbound =
                packReceived &&
                pack.status === 'hub_received' &&
                line.status === 'in_transit';
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
                          </Text>
                        </View>
                      ) : null}
                      <Text
                        style={[styles.orderStatus, isDone && styles.orderStatusDone]}
                        numberOfLines={1}
                      >
                        {hubOrderStatusLabel(line, hubCode, t)}
                      </Text>
                    </View>
                    {line.recipient_name?.trim() ? (
                      <Text style={styles.customerName} numberOfLines={1}>
                        {line.recipient_name.trim()}
                      </Text>
                    ) : null}
                    <View style={styles.codeRow}>
                      {line.express_barcode ? (
                        <Text style={styles.codeMono} numberOfLines={1} selectable>
                          {line.express_barcode}
                        </Text>
                      ) : null}
                      <Text style={styles.codeMonoMuted} numberOfLines={1} selectable>
                        {line.order_barcode}
                      </Text>
                    </View>
                  </View>
                  {canInbound ? (
                    <Pressable
                      style={[styles.inboundBtn, isConfirming && styles.btnBusy]}
                      onPress={() => onConfirmOrder(line.id)}
                      disabled={isConfirming || loading}
                    >
                      <Text style={styles.inboundBtnText}>
                        {isConfirming ? '…' : t.hubReceive.modalInbound}
                      </Text>
                    </Pressable>
                  ) : isDone ? (
                    <View style={styles.doneMark}>
                      <Text style={styles.doneMarkText}>✓</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.footerBlock}>
            {canReleaseTransit ? (
              <Pressable
                style={[styles.transitBtn, (releasingTransit || loading) && styles.btnBusy]}
                onPress={onReleaseTransit}
                disabled={releasingTransit || loading}
              >
                <Text style={styles.transitBtnText}>
                  {releasingTransit ? t.common.processing : t.hubReceive.modalReleaseTransit}
                </Text>
              </Pressable>
            ) : null}
            {canPayTransportFee ? (
              <Pressable
                style={[styles.payFeeBtn, (payingTransportFee || loading) && styles.btnBusy]}
                onPress={onPayTransportFee}
                disabled={payingTransportFee || loading}
              >
                <Text style={styles.payFeeBtnText}>
                  {payingTransportFee
                    ? t.common.processing
                    : fmt(t.hubReceive.modalPayFee, { fee: feeDisplay })}
                </Text>
              </Pressable>
            ) : transportFeePaid ? (
              <View style={styles.feePaidRow}>
                <Text style={styles.feePaidText}>{t.common.feePaid}</Text>
              </View>
            ) : null}

            {loading && !confirmingOrderId && !payingTransportFee ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#38bdf8" size="small" />
              </View>
            ) : null}

            <Pressable
              style={[styles.closeBtn, !canDismiss && styles.closeBtnDisabled]}
              onPress={handleDismiss}
              disabled={!canDismiss}
            >
              <Text style={styles.closeBtnText}>
                {needsFeePayment
                  ? t.common.payFeeFirst
                  : packDone || transportFeePaid
                    ? t.common.done
                    : t.common.close}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function needsPackConfirmEstimate(pack: PkgTrackingDetail | null): number {
  if (!pack) return 120;
  return pack.status === 'in_transit' ? 168 : 108;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.82)',
  },
  card: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    zIndex: 1,
  },
  headerBlock: {
    flexShrink: 0,
  },
  footerBlock: {
    flexShrink: 0,
    marginTop: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },
  packageNo: {
    color: '#d8b4fe',
    fontSize: 17,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: 'rgba(14,165,233,0.15)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusBadgeText: { color: '#7dd3fc', fontSize: 10, fontWeight: '900' },
  progress: { color: '#fbbf24', fontSize: 12, fontWeight: '800', marginLeft: 'auto' },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  routeMeta: { color: '#94a3b8', fontSize: 12, flex: 1 },
  feeInline: { color: '#fde68a', fontSize: 13, fontWeight: '900' },
  feePaidChip: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  packConfirmBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 10,
  },
  packConfirmBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  orderScroll: {
    marginTop: 6,
  },
  listContent: {
    gap: 6,
    paddingBottom: 4,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  orderRowDone: { borderColor: 'rgba(34,197,94,0.35)' },
  orderIndex: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '900',
    width: 16,
    textAlign: 'center',
  },
  orderBody: { flex: 1, minWidth: 0 },
  orderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  orderName: { color: '#f8fafc', fontSize: 13, fontWeight: '800', flexShrink: 1 },
  customerName: { color: '#7dd3fc', fontSize: 11, fontWeight: '700', marginTop: 1 },
  destBadge: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  destBadgeLocal: { backgroundColor: 'rgba(34,197,94,0.15)' },
  destBadgeTransit: { backgroundColor: 'rgba(168,85,247,0.15)' },
  destBadgeText: { fontSize: 9, fontWeight: '900' },
  destBadgeTextLocal: { color: '#4ade80' },
  destBadgeTextTransit: { color: '#c4b5fd' },
  codeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 3,
  },
  codeMono: {
    color: '#7dd3fc',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  codeMonoMuted: {
    color: '#fde68a',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  orderStatus: { color: '#fb923c', fontSize: 10, fontWeight: '800' },
  orderStatusDone: { color: '#4ade80' },
  inboundBtn: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minWidth: 52,
    alignItems: 'center',
  },
  inboundBtnText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  doneMark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneMarkText: { color: '#4ade80', fontSize: 16, fontWeight: '900' },
  transitMark: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 5,
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.35)',
  },
  transitMarkText: { color: '#c4b5fd', fontSize: 9, fontWeight: '900' },
  transitBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 8,
  },
  transitBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  feePaidRow: {
    marginTop: 8,
    alignItems: 'center',
  },
  feePaidText: { color: '#4ade80', fontSize: 12, fontWeight: '800' },
  payFeeBtn: {
    backgroundColor: '#d97706',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 8,
  },
  payFeeBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  loadingRow: { alignItems: 'center', paddingVertical: 6 },
  btnBusy: { opacity: 0.6 },
  closeBtn: {
    marginTop: 8,
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  closeBtnDisabled: {
    opacity: 0.45,
  },
  closeBtnText: { color: '#e2e8f0', fontWeight: '800', fontSize: 14 },
});
