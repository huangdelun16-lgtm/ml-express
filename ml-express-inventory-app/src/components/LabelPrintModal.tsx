import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BarcodeImage from './BarcodeImage';
import type { OrderBarcodeData } from './OrderBarcodeModal';
import { useTranslation } from '../i18n';
import type { TranslationDict } from '../i18n/translations';
import { printOrderBarcodeLabel } from '../services/bleLabelPrinter';
import type { ScannedBluetoothDevice } from '../utils/bluetoothDeviceMerge';

type Props = {
  visible: boolean;
  data: OrderBarcodeData | null;
  printer: ScannedBluetoothDevice | null;
  onClose: () => void;
};

export default function LabelPrintModal({ visible, data, printer, onClose }: Props) {
  const { t, fmt } = useTranslation();
  const [printing, setPrinting] = useState(false);

  if (!visible || !data || !printer) return null;

  const handlePrint = () => {
    if (printing) return;
    setPrinting(true);
    void (async () => {
      try {
        await printOrderBarcodeLabel(data);
        Alert.alert(t.settings.printSentTitle, t.settings.printSentBody, [
          { text: t.common.ok, onPress: onClose },
        ]);
      } catch (error) {
        Alert.alert(t.settings.printFailed, resolvePrintError(t, error));
      } finally {
        setPrinting(false);
      }
    })();
  };

  const expressNo = data.inputBarcode?.trim() ?? '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{t.settings.printWindowTitle}</Text>
          <Text style={styles.hint}>{t.settings.printWindowHint}</Text>
          <Text style={styles.printerLine}>
            {fmt(t.settings.printWindowPrinter, { name: printer.name })}
          </Text>

          <Text style={styles.productName} numberOfLines={2}>
            {data.productName}
          </Text>

          <View style={styles.barcodeSection}>
            {expressNo ? (
              <Text style={styles.expressValue} selectable numberOfLines={2}>
                {expressNo}
              </Text>
            ) : null}
            <BarcodeImage code={data.barcode} height={72} maxWidth={260} showCodeText />
          </View>

          <Pressable
            style={[styles.printBtn, printing && styles.btnDisabled]}
            onPress={handlePrint}
            disabled={printing}
          >
            {printing ? (
              <View style={styles.printBtnInner}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.printBtnText}>{t.settings.printWindowSending}</Text>
              </View>
            ) : (
              <Text style={styles.printBtnText}>{t.settings.printWindowAction}</Text>
            )}
          </Pressable>

          <Pressable style={styles.cancelBtn} onPress={onClose} disabled={printing}>
            <Text style={styles.cancelBtnText}>{t.common.cancel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function resolvePrintError(t: TranslationDict, error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  if (msg === 'BLE_PRINTER_NOT_CONNECTED') return t.settings.scanPrinterConnectFailed;
  if (msg === 'BLE_WRITE_CHAR_NOT_FOUND') return t.settings.printWindowWriteCharMissing;
  if (/connect|timeout|not connected/i.test(msg)) return t.settings.scanPrinterConnectFailed;
  return msg || t.settings.printFailed;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.82)',
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
  title: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  printerLine: {
    color: '#6ee7b7',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
  },
  productName: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
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
  printBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  printBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  printBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  cancelBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  cancelBtnText: { color: '#cbd5e1', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.65 },
});
