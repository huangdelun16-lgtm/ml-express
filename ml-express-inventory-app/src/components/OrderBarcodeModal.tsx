import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BarcodeImage from './BarcodeImage';
import { resolvePrintError, useTranslation } from '../i18n';
import type { LabelPrintPayload } from '../services/printerService';
import { printInboundBarcodeOnly } from '../services/printerService';

export type OrderBarcodeData = {
  productName: string;
  barcode: string;
  inputBarcode?: string;
  destination?: string;
  customerName?: string;
  kind?: 'inbound' | 'pack';
  packLabel?: LabelPrintPayload;
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

  const printBarcode = async () => {
    if (!data?.barcode) return;
    setPrinting(true);
    try {
      const ok = await printInboundBarcodeOnly(
        data.barcode,
        data.inputBarcode?.trim() || undefined,
        {
          name: data.productName,
          destination: data.destination,
          customerName: data.customerName,
        },
      );
      if (!ok) {
        Alert.alert(t.common.tip, t.settings.printDisabled);
        return;
      }
      Alert.alert(t.settings.printSentTitle, t.settings.printSentBody);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e ?? '');
      if (msg === 'PRINT_CANCELLED') return;
      Alert.alert(t.settings.printFailed, resolvePrintError(t, e));
    } finally {
      setPrinting(false);
    }
  };

  const finish = () => {
    onDone?.();
    onClose();
  };

  if (!data) return null;

  const expressNo = data.inputBarcode?.trim() ?? '';

  return (
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

          <Pressable
            style={[styles.btnPrint, printing && styles.btnDisabled]}
            onPress={() => void printBarcode()}
            disabled={printing}
          >
            <Text style={styles.btnPrintText}>
              {printing ? t.settings.sendingPrint : t.settings.labelPrintAction}
            </Text>
          </Pressable>
          <Pressable style={styles.btnClose} onPress={finish}>
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
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnPrintText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnClose: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  btnCloseText: { color: '#cbd5e1', fontWeight: '700', fontSize: 15 },
});
