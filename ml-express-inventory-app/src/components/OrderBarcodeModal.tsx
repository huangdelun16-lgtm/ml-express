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
}: Props) {
  const [printing, setPrinting] = useState(false);

  const printBarcode = async () => {
    if (!data?.barcode) return;
    setPrinting(true);
    try {
      const ok =
        data.kind === 'pack' && data.packLabel
          ? await printBarcodeLabel(data.packLabel)
          : await printInboundBarcodeOnly(
              data.barcode,
              data.inputBarcode?.trim() || undefined,
            );
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

  const finish = () => {
    onDone?.();
    onClose();
  };

  if (!data) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={finish}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>订单 Barcode</Text>
          <Text style={styles.productName} numberOfLines={2}>
            {data.productName}
          </Text>

          <View style={styles.infoBox}>
            <InfoRow label="客户" value={data.customerName} />
            <InfoRow label="目的地" value={data.destination} />
          </View>

          <View style={styles.barcodeSection}>
            {data.inputBarcode ? (
              <Text style={styles.inputCodeText} selectable>
                快递单 {data.inputBarcode}
              </Text>
            ) : null}
            <BarcodeImage code={data.barcode} height={80} showCodeText={false} />
            <Text style={styles.codeText} selectable>
              {data.barcode}
            </Text>
          </View>

          <Pressable
            style={[styles.btnPrint, printing && styles.btnDisabled]}
            onPress={() => void printBarcode()}
            disabled={printing}
          >
            <Text style={styles.btnPrintText}>{printing ? '发送中…' : '🖨 打印 Barcode'}</Text>
          </Pressable>
          <Pressable style={styles.btnClose} onPress={finish}>
            <Text style={styles.btnCloseText}>{onDone ? '完成' : '关闭'}</Text>
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
  productName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
  },
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
