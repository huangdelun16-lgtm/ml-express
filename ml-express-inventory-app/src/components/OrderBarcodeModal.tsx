import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LabelPrintPreviewCard from './LabelPrintPreviewCard';
import { resolvePrintError, useTranslation } from '../i18n';
import type { LabelPrintPayload } from '../services/printerService';
import { printBarcodeLabel, printInboundBarcodeOnly } from '../services/printerService';

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
  /** 打包等流程：点「完成」后回调（不要求先打印） */
  onDone?: () => void;
  /** 弹窗标题（默认「订单 Barcode」） */
  title?: string;
  /** 次要按钮文案（如入库后「取消」） */
  cancelLabel?: string;
};

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

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
      const ok =
        data.kind === 'pack' && data.packLabel
          ? await printBarcodeLabel(data.packLabel)
          : await printInboundBarcodeOnly(data.barcode, data.inputBarcode?.trim() || undefined, {
              name: data.productName,
              destination: data.destination,
              customerName: data.customerName,
            });
      if (!ok) {
        Alert.alert(t.common.tip, t.settings.printDisabled);
        return;
      }
      Alert.alert(t.settings.printSentTitle, t.settings.printSentBody);
    } catch (e: unknown) {
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={finish}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title ?? '订单 Barcode'}</Text>

          {data.destination?.trim() ? (
            <View style={styles.infoBox}>
              <InfoRow label={t.stockIn.finalDest} value={data.destination} />
            </View>
          ) : null}

          <View style={styles.barcodeSection}>
            <LabelPrintPreviewCard
              barcode={data.barcode}
              inputBarcode={data.inputBarcode}
              destination={data.destination}
            />
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
  title: { color: '#7dd3fc', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  infoBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoRow: { flexDirection: 'row', gap: 10 },
  infoLabel: { color: '#64748b', fontSize: 12, fontWeight: '700', width: 52 },
  infoValue: { flex: 1, color: '#e2e8f0', fontSize: 13, fontWeight: '700' },
  barcodeSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    width: '100%',
  },
  inputCodeText: {
    color: '#0284c7',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 10,
  },
  codeText: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: 10,
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
