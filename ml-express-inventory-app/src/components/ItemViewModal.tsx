import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Text from './AppText';
import {
  InboundInvoiceContent,
  InboundInvoiceFooter,
  inboundInvoiceStyles,
  type InboundInvoiceData,
} from './InboundInvoiceView';
import { useTranslation } from '../i18n';
import { getItemDetail } from '../services/inventoryService';
import type { InventoryItemDetail } from '../types/inventory';
import { resolvePackagingStockInItemLabel } from '../utils/packItemSequence';

type Props = {
  visible: boolean;
  itemId: string | null;
  onClose: () => void;
  onSigned?: () => void;
};

function mapDetailToInvoice(detail: InventoryItemDetail): InboundInvoiceData {
  return {
    barcode: detail.barcode,
    inputBarcode: detail.input_barcode?.trim() || undefined,
    productName: detail.name,
    inboundDateLabel: detail.inbound_date_label,
    recipientName: detail.customer_name?.trim() || '—',
    recipientPhone: detail.recipient_phone?.trim() || undefined,
    destination: (detail.destination || detail.final_destination || '').trim(),
    detailAddress: detail.detail_address?.trim() || undefined,
    qty: detail.inbound_qty,
    packaging: detail.packaging?.trim() || undefined,
    spec: detail.spec?.trim() || undefined,
    weight: detail.weight?.trim() || undefined,
    totalFee: detail.total_fee,
    paymentLabel: detail.payment_label,
    note: detail.inbound_note,
    storeName: detail.inbound_store_name?.trim() || undefined,
    signReceipt: detail.sign_receipt,
    packItemLabel: resolvePackagingStockInItemLabel(
      detail.id,
      detail.barcode,
      detail.pack,
      detail.inbound_movement_note,
    ),
  };
}

export default function ItemViewModal({ visible, itemId, onClose, onSigned }: Props) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<InventoryItemDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const invoiceData = useMemo(
    () => (detail ? mapDetailToInvoice(detail) : null),
    [detail],
  );

  useEffect(() => {
    if (!visible || !itemId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getItemDetail(itemId).then((d) => {
      if (!cancelled) {
        setDetail(d);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, itemId]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={inboundInvoiceStyles.overlay}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color="#60a5fa" size="large" />
            <Text style={styles.loadingText}>{t.invoice.loadingOrder}</Text>
          </View>
        ) : !invoiceData ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyText}>{t.invoice.orderMissing}</Text>
            <Pressable style={inboundInvoiceStyles.btnClose} onPress={onClose}>
              <Text style={inboundInvoiceStyles.btnCloseText}>{t.common.close}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={inboundInvoiceStyles.sheet}>
            <ScrollView
              style={inboundInvoiceStyles.scrollView}
              contentContainerStyle={inboundInvoiceStyles.scroll}
              showsVerticalScrollIndicator={false}
            >
              <InboundInvoiceContent
                data={invoiceData}
                packItemSeqLabel={t.items.packItemSeq}
                copyLabels={{
                  copied: t.common.copied,
                  tapToCopy: t.common.tapToCopy,
                  expressNo: t.items.expressNo,
                  inbound: t.items.inbound,
                }}
              />
            </ScrollView>

            <InboundInvoiceFooter
              recipientPhone={invoiceData.recipientPhone}
              onClose={onClose}
            />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = {
  centerBox: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 24,
    gap: 16,
  },
  loadingText: { color: '#94a3b8', fontSize: 14, marginTop: 12 },
  emptyText: { color: '#e2e8f0', fontSize: 15, fontWeight: '700' as const, marginBottom: 8 },
};
