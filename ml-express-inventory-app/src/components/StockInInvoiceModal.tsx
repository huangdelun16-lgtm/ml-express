import React, { useState } from 'react';
import {
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
import { printInboundBarcodeOnly } from '../services/printerService';

export type StockInInvoiceData = InboundInvoiceData;

type Props = {
  visible: boolean;
  data: StockInInvoiceData | null;
  onClose: () => void;
};

export default function StockInInvoiceModal({ visible, data, onClose }: Props) {
  const [printing, setPrinting] = useState(false);

  const printLabel = async () => {
    if (!data?.barcode) return;
    setPrinting(true);
    try {
      const ok = await printInboundBarcodeOnly(data.barcode, data.inputBarcode);
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

  if (!data) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={inboundInvoiceStyles.overlay}>
        <View style={inboundInvoiceStyles.sheet}>
          <ScrollView
            contentContainerStyle={inboundInvoiceStyles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <InboundInvoiceContent data={data} />
          </ScrollView>

          <InboundInvoiceFooter
            recipientPhone={data.recipientPhone}
            printing={printing}
            onPrint={() => void printLabel()}
            onClose={onClose}
          />
        </View>
      </View>
    </Modal>
  );
}
