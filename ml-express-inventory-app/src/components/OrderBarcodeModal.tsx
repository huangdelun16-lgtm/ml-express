import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BarcodeImage from './BarcodeImage';
import LabelPrintModal from './LabelPrintModal';
import { useTranslation } from '../i18n';
import { getActiveBluetoothDevice } from '../services/bluetoothScanner';
import type { ScannedBluetoothDevice } from '../utils/bluetoothDeviceMerge';

export type OrderBarcodeData = {
  productName: string;
  barcode: string;
  inputBarcode?: string;
  destination?: string;
  customerName?: string;
  kind?: 'inbound' | 'pack';
};

type Props = {
  visible: boolean;
  data: OrderBarcodeData | null;
  onClose: () => void;
  onDone?: () => void;
  title?: string;
  cancelLabel?: string;
};

export default function OrderBarcodeModal({
  visible,
  data,
  onClose,
  onDone,
  title,
  cancelLabel,
}: Props) {
  const { t } = useTranslation();
  const [connectedPrinter, setConnectedPrinter] = useState<ScannedBluetoothDevice | null>(null);
  const [printModalVisible, setPrintModalVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPrintModalVisible(false);
      return;
    }
    void getActiveBluetoothDevice().then(setConnectedPrinter);
  }, [visible]);

  const finish = () => {
    setPrintModalVisible(false);
    onDone?.();
    onClose();
  };

  if (!data) return null;

  const expressNo = data.inputBarcode?.trim() ?? '';

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={finish}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>{title ?? t.stockIn.barcodeModalTitle}</Text>

            <View style={styles.barcodeSection}>
              {expressNo ? (
                <Text style={styles.expressValue} selectable numberOfLines={2}>
                  {expressNo}
                </Text>
              ) : null}
              <BarcodeImage code={data.barcode} height={72} maxWidth={260} showCodeText />
            </View>

            {connectedPrinter ? (
              <Pressable
                style={styles.btnPrint}
                onPress={() => setPrintModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t.itemForm.printLabel}
              >
                <Text style={styles.btnPrintText}>{t.itemForm.printLabel}</Text>
              </Pressable>
            ) : null}

            <Pressable style={styles.btnClose} onPress={finish}>
              <Text style={styles.btnCloseText}>
                {cancelLabel ?? (onDone ? t.common.done : t.common.close)}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <LabelPrintModal
        visible={printModalVisible}
        data={data}
        printer={connectedPrinter}
        onClose={() => setPrintModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.78)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: { color: '#7dd3fc', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  barcodeSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    width: '100%',
  },
  expressValue: {
    width: '100%',
    color: '#0284c7',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 12,
  },
  btnPrint: {
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnPrintText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnClose: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  btnCloseText: { color: '#cbd5e1', fontWeight: '700', fontSize: 15 },
});
