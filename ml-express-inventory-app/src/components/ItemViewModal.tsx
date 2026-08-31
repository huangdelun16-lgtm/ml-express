import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Text from './AppText';
import ExceptionReportModal from './ExceptionReportModal';
import ArrivalNotifySheet from './ArrivalNotifySheet';
import {
  InboundInvoiceContent,
  InboundInvoiceFooter,
  inboundInvoiceStyles,
  type InboundInvoiceData,
} from './InboundInvoiceView';
import { useAuth } from '../contexts/AuthContext';
import { getExceptionTypeLabel, useTranslation, fmt } from '../i18n';
import { getItemDetail } from '../services/inventoryService';
import { listInventoryExceptions } from '../services/inventoryExceptionService';
import type { InventoryExceptionRecord } from '../types/inventoryException';
import type { InventoryItemDetail } from '../types/inventory';
import { exceptionTargetFromItem } from '../utils/inventoryException';
import { canMarkCustomerSigned } from '../utils/customerSign';
import type { ArrivalNotifyTarget } from '../utils/arrivalNotify';
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
  const { store } = useAuth();
  const [detail, setDetail] = useState<InventoryItemDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [exceptions, setExceptions] = useState<InventoryExceptionRecord[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [notifyTarget, setNotifyTarget] = useState<ArrivalNotifyTarget | null>(null);

  const invoiceData = useMemo(
    () => (detail ? mapDetailToInvoice(detail) : null),
    [detail],
  );

  const loadExceptions = (barcode?: string) => {
    if (!barcode) {
      setExceptions([]);
      return;
    }
    void listInventoryExceptions({ itemBarcode: barcode, limit: 20 })
      .then(setExceptions)
      .catch(() => setExceptions([]));
  };

  useEffect(() => {
    if (!visible || !itemId) {
      setDetail(null);
      setExceptions([]);
      setReportOpen(false);
      setNotifyTarget(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getItemDetail(itemId).then((d) => {
      if (!cancelled) {
        setDetail(d);
        setLoading(false);
        if (d?.barcode) loadExceptions(d.barcode);
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
              {exceptions.length > 0 ? (
                <View style={styles.exceptionBox}>
                  <Text style={styles.exceptionTitle}>{t.exception.existing}</Text>
                  {exceptions.map((row) => (
                    <Text key={row.id} style={styles.exceptionLine}>
                      {getExceptionTypeLabel(t, row.exception_type)}
                      {row.status === 'open' ? ` · ${t.exception.statusOpen}` : ` · ${t.exception.statusResolved}`}
                      {row.qty_expected != null && row.qty_actual != null
                        ? ` · ${fmt(t.exception.qtyLine, {
                            expected: row.qty_expected,
                            actual: row.qty_actual,
                          })}`
                        : ''}
                      {` · ${row.note}`}
                    </Text>
                  ))}
                </View>
              ) : null}
            </ScrollView>

            <InboundInvoiceFooter
              recipientPhone={invoiceData.recipientPhone}
              onClose={onClose}
              onNotifyCustomer={
                store && detail && canMarkCustomerSigned(store, detail)
                  ? () =>
                      setNotifyTarget({
                        barcode: detail.barcode,
                        expressBarcode: detail.input_barcode,
                        recipientName:
                          detail.recipient_name?.trim() || detail.customer_name?.trim() || '',
                        recipientPhone: detail.recipient_phone?.trim() || '',
                        hubCode: store.hubCode ?? '',
                        storeName: store.storeName,
                      })
                  : undefined
              }
              onReportException={store && detail ? () => setReportOpen(true) : undefined}
            />
          </View>
        )}
      </View>
      <ExceptionReportModal
        visible={reportOpen && !!detail}
        target={detail ? exceptionTargetFromItem(detail) : null}
        onClose={() => setReportOpen(false)}
        onSubmitted={() => loadExceptions(detail?.barcode)}
      />
      <ArrivalNotifySheet
        visible={!!notifyTarget}
        targets={notifyTarget ? [notifyTarget] : []}
        onClose={() => setNotifyTarget(null)}
        onNotified={() => {
          if (itemId) {
            void getItemDetail(itemId).then((d) => {
              if (d) setDetail(d);
            });
          }
        }}
      />
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
  exceptionBox: {
    marginTop: 16,
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fdba74',
    gap: 6,
  },
  exceptionTitle: { color: '#9a3412', fontSize: 13, fontWeight: '900' as const },
  exceptionLine: { color: '#7c2d12', fontSize: 12, lineHeight: 18 },
};
