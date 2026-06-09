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
import { printInboundBarcodeOnly } from '../services/printerService';

export type StockInSuccessData = {
  /** 自动生成的入库条码 */
  barcode: string;
  /** 快递单号（入库时扫码/手动填写） */
  inputBarcode?: string;
};

type Props = {
  visible: boolean;
  data: StockInSuccessData | null;
  onClose: () => void;
};

export default function StockInSuccessModal({ visible, data, onClose }: Props) {
  const [printing, setPrinting] = useState(false);

  const printBarcode = async () => {
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>✓</Text>
          </View>
          <Text style={styles.title}>入库成功</Text>

          <View style={styles.barcodeSection}>
            {data.inputBarcode ? (
              <Text style={styles.inputCodeText} selectable>
                {data.inputBarcode}
              </Text>
            ) : null}
            <BarcodeImage code={data.barcode} height={80} showCodeText={false} />
            <Text style={styles.codeText} selectable>
              {data.barcode}
            </Text>
          </View>

          <Pressable
            style={[styles.btnPrint, printing && styles.btnDisabled]}
            onPress={printBarcode}
            disabled={printing}
          >
            <Text style={styles.btnPrintText}>{printing ? '发送中…' : '🖨 打印 Barcode'}</Text>
          </Pressable>
          <Pressable style={styles.btnDone} onPress={onClose}>
            <Text style={styles.btnDoneText}>完成</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.75)',
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
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(5,150,105,0.2)',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  icon: { color: '#6ee7b7', fontSize: 28, fontWeight: '900' },
  title: { color: '#6ee7b7', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  inputCodeText: {
    color: '#0284c7',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
    textAlign: 'center',
    letterSpacing: 0.5,
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
  barcodeSection: {
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  btnPrint: {
    marginTop: 18,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnPrintText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnDone: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnDoneText: { color: '#94a3b8', fontWeight: '700', fontSize: 15 },
});
