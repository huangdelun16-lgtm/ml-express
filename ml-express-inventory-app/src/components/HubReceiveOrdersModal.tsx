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
import {
  areAllPackOrdersProcessed,
  countPendingPackInboundOrders,
  isDestinationHubPack,
  resolvePackLegDestinationCode,
} from '../utils/hubReceivePack';

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
  confirmingHubReceive: boolean;
  batchInbounding: boolean;
  payingTransportFee: boolean;
  transportFeePaid: boolean;
  tripPackCount?: number;
  tripFeeAnchorPack?: boolean;
  releasingTransit: boolean;
  errorText?: string;
  successText?: string;
  onClose: () => void;
  onConfirmOrder: (orderId: string) => void;
  onBatchInbound: () => void;
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
  confirmingHubReceive,
  batchInbounding,
  payingTransportFee,
  transportFeePaid,
  tripPackCount = 1,
  tripFeeAnchorPack = true,
  releasingTransit,
  errorText,
  successText,
  onClose,
  onConfirmOrder,
  onBatchInbound,
  onPayTransportFee,
  onReleaseTransit,
}: Props) {
  const { t, fmt } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();

  const layout = useMemo(() => {
    const cardMax = windowHeight * 0.92;
    const headerEstimate = 108;
    const footerEstimate = 196;
    const orderListMax = Math.max(180, cardMax - headerEstimate - footerEstimate);
    return { cardMax, orderListMax };
  }, [windowHeight, pack?.orders.length]);

  if (!pack || !store) return null;

  const destinationPack = isDestinationHubPack(pack, hubCode);
  const ordersAllProcessed = areAllPackOrdersProcessed(pack);
  const pendingInboundCount = countPendingPackInboundOrders(pack, hubCode);

  const legDest = resolvePackLegDestinationCode(pack) || hubCode;
  const feeDisplay = getTransportFeeDisplay(t, pack.transport_fee);
  const feeAmount = parseTransportFeeAmount(pack.transport_fee);
  const hasPendingInbound = destinationPack && pendingInboundCount > 0;
  const allInboundDone = ordersAllProcessed && !hasPendingInbound;
  const needsFeePayment = allInboundDone && feeAmount > 0 && !transportFeePaid;
  const showPayFeeButton = destinationPack && needsFeePayment && tripFeeAnchorPack;
  const showTripFeeWaitHint =
    destinationPack && allInboundDone && feeAmount > 0 && !transportFeePaid && !tripFeeAnchorPack;
  const transitOrders = pack.orders.filter((line) => resolveOrderDestinationCode(line) !== hubCode);
  const canReleaseTransit = canReleaseTransitManually({
    packageStatus: pack.status,
    hasTransitOrders: transitOrders.length > 0,
    hasUnreleasedTransitOrders: transitOrders.some((line) => line.status !== 'released_at_hub'),
  });
  const showCloseButton =
    !hasPendingInbound && allInboundDone && !needsFeePayment && !canReleaseTransit;
  const canDismiss = showCloseButton;
  const canBatchInbound = destinationPack && pendingInboundCount > 0;
  const actionBusy =
    loading || confirmingHubReceive || batchInbounding || payingTransportFee || releasingTransit;

  const handleDismiss = () => {
    if (canDismiss) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {canDismiss ? (
          <Pressable style={styles.backdrop} onPress={handleDismiss} accessibilityLabel={t.common.close} />
        ) : (
          <View style={styles.backdrop} />
        )}
        <View style={[styles.card, { maxHeight: layout.cardMax }]}>
          <Pressable
            style={styles.closeXBtn}
            onPress={onClose}
            hitSlop={12}
            accessibilityLabel={t.common.close}
            accessibilityRole="button"
          >
            <Text style={styles.closeXText}>✕</Text>
          </Pressable>
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
              {transportFeePaid && ordersAllProcessed ? (
                <Text style={styles.feePaidChip}>{t.common.paid}</Text>
              ) : tripPackCount > 1 ? (
                <Text style={styles.tripPackChip}>
                  {fmt(t.hubReceive.tripPackCount, { count: tripPackCount })}
                </Text>
              ) : null}
            </View>

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
                destinationPack &&
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
                      style={[styles.inboundBtn, (isConfirming || actionBusy) && styles.btnBusy]}
                      onPress={() => onConfirmOrder(line.id)}
                      disabled={isConfirming || actionBusy}
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
            {errorText ? (
              <View style={styles.feedbackError}>
                <Text style={styles.feedbackErrorText}>{errorText}</Text>
              </View>
            ) : null}
            {successText ? (
              <View style={styles.feedbackOk}>
                <Text style={styles.feedbackOkText}>{successText}</Text>
              </View>
            ) : null}

            {canReleaseTransit ? (
              <Pressable
                style={[styles.transitBtn, actionBusy && styles.btnBusy]}
                onPress={onReleaseTransit}
                disabled={actionBusy}
              >
                <Text style={styles.transitBtnText}>
                  {releasingTransit ? t.common.processing : t.hubReceive.modalReleaseTransit}
                </Text>
              </Pressable>
            ) : null}

            {canBatchInbound ? (
              <Pressable
                style={[styles.batchInboundBtn, actionBusy && styles.btnBusy]}
                onPress={onBatchInbound}
                disabled={actionBusy || Boolean(confirmingOrderId)}
              >
                <Text style={styles.batchInboundBtnText}>
                  {batchInbounding || confirmingHubReceive
                    ? t.common.processing
                    : t.hubReceive.modalBatchInbound}
                </Text>
              </Pressable>
            ) : null}

            {showTripFeeWaitHint ? (
              <View style={styles.tripFeeHint}>
                <Text style={styles.tripFeeHintText}>{t.hubReceive.tripFeePayOnPrimary}</Text>
              </View>
            ) : null}

            {showPayFeeButton ? (
              <Pressable
                style={[styles.payFeeBtn, actionBusy && styles.btnBusy]}
                onPress={onPayTransportFee}
                disabled={actionBusy}
              >
                <Text style={styles.payFeeBtnText}>
                  {payingTransportFee
                    ? t.common.processing
                    : tripPackCount > 1
                      ? fmt(t.hubReceive.modalPayTripFee, { fee: feeDisplay, count: tripPackCount })
                      : fmt(t.hubReceive.modalPayFee, { fee: feeDisplay })}
                </Text>
              </Pressable>
            ) : showCloseButton ? (
              <Pressable
                style={styles.closeBtn}
                onPress={onClose}
                accessibilityLabel={t.common.close}
              >
                <Text style={styles.closeBtnText}>{t.common.close}</Text>
              </Pressable>
            ) : null}

            {actionBusy && !payingTransportFee && !releasingTransit && !batchInbounding && !confirmingOrderId ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#38bdf8" size="small" />
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
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
    paddingTop: 4,
    paddingRight: 36,
  },
  closeXBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(51,65,85,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  closeXText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },
  footerBlock: {
    flexShrink: 0,
    marginTop: 2,
  },
  feedbackError: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  feedbackErrorText: { color: '#fca5a5', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  feedbackOk: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
  },
  feedbackOkText: { color: '#86efac', fontSize: 12, lineHeight: 17, fontWeight: '700' },
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
  tripPackChip: {
    color: '#fde68a',
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tripFeeHint: {
    marginTop: 8,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
  },
  tripFeeHintText: { color: '#fde68a', fontSize: 12, lineHeight: 17, fontWeight: '700' },
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
  batchInboundBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 2,
  },
  batchInboundBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
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
