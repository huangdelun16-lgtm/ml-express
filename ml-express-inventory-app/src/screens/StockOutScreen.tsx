import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import ScanInputBar from '../components/ScanInputBar';
import { useAuth } from '../contexts/AuthContext';
import { applyStockMovement, getItemByBarcode } from '../services/inventoryService';
import type { InventoryItem } from '../types/inventory';
import { stockUnitLabel } from '../utils/itemFieldFormat';

type Route = { params?: { presetBarcode?: string } };

export default function StockOutScreen({ route }: { route?: Route }) {
  const { operatorName } = useAuth();
  const [scan, setScan] = useState('');
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const resolveBarcode = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setScan(trimmed);
    const found = await getItemByBarcode(trimmed);
    setItem(found);
    if (!found) Alert.alert('未找到', '该条码未建档，请先在商品库添加或走入库流程');
  };

  useEffect(() => {
    const preset = route?.params?.presetBarcode;
    if (preset) void resolveBarcode(preset);
  }, [route?.params?.presetBarcode]);

  const submit = async () => {
    const code = scan.trim();
    const n = Number(qty);
    if (!code || !item) {
      Alert.alert('提示', '请先扫描已建档商品');
      return;
    }
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert('提示', '请输入有效数量');
      return;
    }
    setLoading(true);
    try {
      const { item: updated } = await applyStockMovement({
        barcode: code,
        type: 'out',
        qty: n,
        operator: operatorName ?? '工作人员',
        note,
      });
      Alert.alert('出库成功', `${updated.name}\n剩余：${updated.qty_on_hand}`);
      setScan('');
      setItem(null);
      setQty('1');
      setNote('');
    } catch (e: unknown) {
      Alert.alert('失败', e instanceof Error ? e.message : '请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>📤 出库</Text>
        <ScanInputBar
          value={scan}
          onChangeText={setScan}
          onSubmit={resolveBarcode}
        />
        {item ? (
          <View style={styles.card}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardMeta}>
              条码 {item.barcode} · 库存 {item.qty_on_hand} {stockUnitLabel()}
              {item.unit ? ` · ${item.unit}` : ''}
            </Text>
          </View>
        ) : null}
        <Text style={styles.label}>出库数量</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={qty}
          onChangeText={setQty}
        />
        <Text style={styles.label}>备注（可选）</Text>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="领用人、用途等"
          placeholderTextColor="#94a3b8"
        />
        <Pressable style={[styles.btn, !item && styles.btnDisabled]} onPress={submit} disabled={loading || !item}>
          <Text style={styles.btnText}>{loading ? '处理中…' : '确认出库'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '800', marginBottom: 16 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  cardName: { color: '#f8fafc', fontSize: 17, fontWeight: '800' },
  cardMeta: { color: '#94a3b8', marginTop: 6, fontSize: 13 },
  label: { color: '#e2e8f0', fontWeight: '700', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    fontSize: 16,
  },
  btn: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
