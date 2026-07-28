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
import { useIosBlePrinterGate } from '../hooks/useIosBlePrinterGate';
import { resolvePrintError, useTranslation } from '../i18n';
import { printInboundBarcodeOnly } from '../services/printerService';

export type StockInInvoiceData = InboundInvoiceData;

type Props = {
  visible: boolean;
  data: StockInInvoiceData | null;
  onClose: () => void;
};

export default function StockInInvoiceModal({ visible, data, onClose }: Props) {
  const { t } = useTranslation();
  const [printing, setPrinting] = useState(false);
  const { runWithBleGate, blePicker } = useIosBlePrinterGate({ presentation: 'overlay' });

  const printLabel = async () => {
    if (!data?.barcode) return;
    setPrinting(true);
    await runWithBleGate(
      async () => {
        const ok = await printInboundBarcodeOnly(data.barcode, data.inputBarcode, {
          name: data.productName,
          destination: data.destination,
          customerName: data.recipientName,
        });
        if (!ok) {
          Alert.alert(t.common.tip, t.settings.printDisabled);
          return;
        }
        Alert.alert(t.settings.printSentTitle, t.settings.printSentBody);
      },
      {
        setBusy: setPrinting,
        onError: (e) => {
          Alert.alert(t.settings.printFailed, resolvePrintError(t, e));
        },
      },
    );
    setPrinting(false);
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
        {blePicker}
      </View>
    </Modal>
  );
}
