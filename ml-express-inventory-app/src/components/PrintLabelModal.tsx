import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BarcodeImage from './BarcodeImage';
import { printBarcodeLabel, type LabelPrintPayload } from '../services/printerService';

type Props = {
  visible: boolean;
  title?: string;
  payload: LabelPrintPayload | null;
  /** 须先打印才能点「完成」 */
  requirePrintBeforeDone?: boolean;
  onClose: () => void;
  /** 打印流程结束（点「完成」且已满足打印要求） */
  onDone?: () => void;
};

export default function PrintLabelModal({
  visible,
  title = '打印标签',
  payload,
  requirePrintBeforeDone = false,
  onClose,
  onDone,
}: Props) {
  const [printing, setPrinting] = useState(false);
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    if (visible) setPrinted(false);
  }, [visible, payload?.barcode]);

  const print = async () => {
    if (!payload?.barcode) {
      Alert.alert('提示', '缺少条码');
      return;
    }
    setPrinting(true);
    try {
      const ok = await printBarcodeLabel(payload);
      if (!ok) {
        Alert.alert('提示', '打印已关闭，请在设置中启用打印');
        return;
      }
      setPrinted(true);
      Alert.alert('已发送打印', '请在系统对话框选择标签打印机');
    } catch (e: unknown) {
      Alert.alert('打印失败', e instanceof Error ? e.message : '请重试');
    } finally {
      setPrinting(false);
    }
  };

  const finish = () => {
    if (requirePrintBeforeDone && !printed) {
      Alert.alert('提示', '请先点击「打印 Barcode」完成打印');
      return;
    }
    onDone?.();
    onClose();
  };

  if (!payload) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.cancel}>关闭</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>标签预览 · 含 Code128 条码</Text>

          <View style={styles.previewCard}>
            <View style={styles.barcodeBox}>
              <BarcodeImage code={payload.barcode} height={80} showCodeText />
            </View>
            <Text style={styles.brand}>MARKET LINK · Inventory</Text>
          </View>

          <Pressable style={[styles.btnPrimary, printing && styles.btnDisabled]} onPress={print} disabled={printing}>
            <Text style={styles.btnPrimaryText}>{printing ? '发送中…' : '🖨 打印 Barcode'}</Text>
          </Pressable>
          <Pressable
            style={[styles.btnGhost, requirePrintBeforeDone && !printed && styles.btnGhostDisabled]}
            onPress={finish}
          >
            <Text style={styles.btnGhostText}>
              {requirePrintBeforeDone && !printed ? '完成（请先打印）' : '完成'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  cancel: { color: '#60a5fa', fontWeight: '700', fontSize: 16, width: 48 },
  headerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 40 },
  subtitle: { color: '#94a3b8', fontSize: 14, marginBottom: 14 },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  barcodeBox: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  brand: { color: '#94a3b8', fontSize: 11, textAlign: 'center', marginTop: 12, fontWeight: '700' },
  btnPrimary: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnDisabled: { opacity: 0.7 },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnGhost: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  btnGhostText: { color: '#e2e8f0', fontWeight: '700' },
  btnGhostDisabled: { opacity: 0.55 },
});
