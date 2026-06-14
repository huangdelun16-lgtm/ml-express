import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  InboundInvoiceContent,
  InboundInvoiceFooter,
  inboundInvoiceStyles,
  type InboundInvoiceData,
} from './InboundInvoiceView';
import { useAuth } from '../contexts/AuthContext';
import { getItemDetail } from '../services/inventoryService';
import { printInboundBarcodeOnly } from '../services/printerService';
import type { InventoryItemDetail } from '../types/inventory';
import { canMarkCustomerSigned } from '../utils/customerSign';
import { confirmAndMarkCustomerSigned } from '../utils/customerSignConfirm';
import { showTaskSuccess } from '../utils/taskSuccessAlert';

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
  };
}

export default function ItemViewModal({ visible, itemId, onClose, onSigned }: Props) {
  const { store, operatorName } = useAuth();
  const [detail, setDetail] = useState<InventoryItemDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [signing, setSigning] = useState(false);

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

  const canSign = Boolean(
    detail && store && canMarkCustomerSigned(store, detail),
  );

  const signDelivered = () => {
    if (!detail || !store) return;
    setSigning(true);
    confirmAndMarkCustomerSigned({
      itemId: detail.id,
      operator: operatorName ?? '工作人员',
      store,
      onSuccess: () => {
        void getItemDetail(detail.id).then((refreshed) => {
          setDetail(refreshed);
          onSigned?.();
          showTaskSuccess('签收成功', `${detail.name} 已标记为客户已签收`);
        });
      },
      onError: (message) => Alert.alert('签收失败', message),
      onDismiss: () => setSigning(false),
    });
  };

  const printLabel = async () => {
    if (!invoiceData?.barcode) return;
    setPrinting(true);
    try {
      const ok = await printInboundBarcodeOnly(invoiceData.barcode, invoiceData.inputBarcode);
      if (!ok) {
        Alert.alert('提示', '打印已关闭，请在设置中启用打印');
        return;
      }
      Alert.alert('已发送打印', '请在系统对话框选择标签打印机');
    } catch (e: unknown) {
      Alert.alert('打印失败', e instanceof Error ? e.message : '请重试');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={inboundInvoiceStyles.overlay}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color="#60a5fa" size="large" />
            <Text style={styles.loadingText}>加载订单…</Text>
          </View>
        ) : !invoiceData ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyText}>订单不存在或已删除</Text>
            <Pressable style={inboundInvoiceStyles.btnClose} onPress={onClose}>
              <Text style={inboundInvoiceStyles.btnCloseText}>关闭</Text>
            </Pressable>
          </View>
        ) : (
          <View style={inboundInvoiceStyles.sheet}>
            <ScrollView
              contentContainerStyle={inboundInvoiceStyles.scroll}
              showsVerticalScrollIndicator={false}
            >
              <InboundInvoiceContent data={invoiceData} />
            </ScrollView>

            <InboundInvoiceFooter
              recipientPhone={invoiceData.recipientPhone}
              printing={printing}
              signing={signing}
              canSignDelivered={canSign}
              onSignDelivered={() => void signDelivered()}
              onPrint={() => void printLabel()}
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
