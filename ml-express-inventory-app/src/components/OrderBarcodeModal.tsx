import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LabelBarcodeContent from './LabelBarcodeContent';
import { useTranslation } from '../i18n';
import { loadSavedBluetoothDevice } from '../services/bluetoothScanner';
import { resolvePrintError, runBarcodeLabelPrint } from '../services/labelPrintFlow';

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
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!visible) setPrinting(false);
  }, [visible]);

  const finish = () => {
    setPrinting(false);
    onDone?.();
    onClose();
  };

  const handlePrint = () => {
    if (printing || !data) return;
    setPrinting(true);
    void (async () => {
      try {
        const saved = await loadSavedBluetoothDevice();
        if (!saved) {
          Alert.alert(t.settings.printFailed, t.settings.scanPrinterNotConfigured);
          return;
        }
        await runBarcodeLabelPrint(data);
        Alert.alert(t.settings.printSentTitle, t.settings.printSentBody, [
          { text: t.common.ok },
        ]);
      } catch (error) {
        Alert.alert(t.settings.printFailed, resolvePrintError(t, error));
      } finally {
        setPrinting(false);
      }
    })();
  };

  if (!data) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={finish}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title ?? t.stockIn.barcodeModalTitle}</Text>

          <LabelBarcodeContent data={data} />

          <Pressable
            style={[styles.btnPrint, printing && styles.btnDisabled]}
            onPress={handlePrint}
            disabled={printing}
            accessibilityRole="button"
            accessibilityLabel={t.itemForm.printLabel}
          >
            {printing ? (
              <View style={styles.printBtnInner}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.btnPrintText}>{t.settings.printWindowSending}</Text>
              </View>
            ) : (
              <Text style={styles.btnPrintText}>{t.itemForm.printLabel}</Text>
            )}
          </Pressable>

          <Pressable style={styles.btnClose} onPress={finish} disabled={printing}>
            <Text style={styles.btnCloseText}>
              {cancelLabel ?? (onDone ? t.common.done : t.common.close)}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
  btnPrint: {
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  printBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnPrintText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnDisabled: { opacity: 0.65 },
  btnClose: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  btnCloseText: { color: '#cbd5e1', fontWeight: '700', fontSize: 15 },
});
