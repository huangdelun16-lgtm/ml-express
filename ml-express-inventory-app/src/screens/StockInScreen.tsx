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
import PackagingPickerField from '../components/PackagingPickerField';
import ScanInputBar from '../components/ScanInputBar';
import StockInSuccessModal, { type StockInSuccessData } from '../components/StockInSuccessModal';
import { useAuth } from '../contexts/AuthContext';
import { applyStockMovement, getItemByBarcode } from '../services/inventoryService';
import type { InventoryItem } from '../types/inventory';
import { generateUniqueInboundBarcode, extractDestinationCode } from '../utils/inboundBarcode';
import { stockUnitLabel } from '../utils/itemFieldFormat';
import { loadStockInContactDraft, saveStockInContactDraft } from '../utils/stockInDraft';

type Route = { params?: { presetBarcode?: string } };

export default function StockInScreen({ route }: { route?: Route }) {
  const { operatorName } = useAuth();
  const [scan, setScan] = useState('');
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [productName, setProductName] = useState('');
  const [packaging, setPackaging] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [destination, setDestination] = useState('');
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<StockInSuccessData | null>(null);

  useEffect(() => {
    void loadStockInContactDraft().then((d) => {
      setRecipientName(d.recipientName);
      setRecipientPhone(d.recipientPhone);
      setDestination(d.destination);
      setPackaging(d.packaging);
    });
  }, []);

  const resolveBarcode = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setScan(trimmed);
    const found = await getItemByBarcode(trimmed);
    setItem(found);
    if (found) setProductName(found.name);
  };

  useEffect(() => {
    const preset = route?.params?.presetBarcode;
    if (preset) void resolveBarcode(preset);
  }, [route?.params?.presetBarcode]);

  const submit = async () => {
    const n = Number(qty);
    if (!recipientName.trim()) {
      Alert.alert('提示', '请填写姓名');
      return;
    }
    if (!destination.trim()) {
      Alert.alert('提示', '请填写目的地');
      return;
    }
    if (!productName.trim()) {
      Alert.alert('提示', '请填写商品名称');
      return;
    }
    if (!Number.isFinite(n) || n <= 0) {
      Alert.alert('提示', '请输入有效入库数量');
      return;
    }
    if (!packaging) {
      Alert.alert('提示', '请选择商品包装');
      return;
    }

    setLoading(true);
    try {
      const dest = destination.trim();
      const barcode = await generateUniqueInboundBarcode(dest, async (code) => !!(await getItemByBarcode(code)));

      await saveStockInContactDraft({
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        destination: dest,
        packaging,
      });

      const inputBarcode = scan.trim();
      await applyStockMovement({
        barcode,
        type: 'in',
        qty: n,
        operator: operatorName ?? '工作人员',
        note: note.trim(),
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        destination: dest,
        packaging,
        inputBarcode,
        createIfMissing: { name: productName.trim() },
      });

      setSuccessData({ barcode, inputBarcode: inputBarcode || undefined });
      setScan('');
      setItem(null);
      setProductName('');
      setQty('1');
      setNote('');
    } catch (e: unknown) {
      Alert.alert('失败', e instanceof Error ? e.message : '请重试');
    } finally {
      setLoading(false);
    }
  };

  const barcodePreview = destination.trim()
    ? `${extractDestinationCode(destination)}·秒分时日月年（确认后按缅甸时间生成）`
    : '填写目的地后自动生成条码';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.title}>📥 入库</Text>
          <Text style={styles.subtitle}>确认入库时按目的地 + 缅甸时间自动生成条码</Text>
        </View>

        <Section title="扫码识别（可选）" accent="#3b82f6">
          <ScanInputBar
            value={scan}
            onChangeText={setScan}
            onSubmit={resolveBarcode}
            placeholder="扫描已有条码可带出商品名称"
          />
          {item ? (
            <Text style={styles.lookupHint}>已匹配：{item.name}（入库将使用新条码）</Text>
          ) : null}
        </Section>

        <Section title="商品信息" accent="#059669">
          <Field
            label="商品名称 *"
            value={productName}
            onChange={setProductName}
            placeholder="输入商品名称"
          />
          <PackagingPickerField value={packaging} onChange={setPackaging} />
          <View style={styles.barcodePreview}>
            <Text style={styles.barcodePreviewLabel}>入库条码（自动生成）</Text>
            <Text style={styles.barcodePreviewValue}>{barcodePreview}</Text>
          </View>
        </Section>

        <Section title="收发信息" accent="#0891b2">
          <Field
            label="姓名 *"
            value={recipientName}
            onChange={setRecipientName}
            placeholder="收件人 / 联系人姓名"
          />
          <Field
            label="电话号码"
            value={recipientPhone}
            onChange={setRecipientPhone}
            placeholder="09xxxxxxxxx"
            keyboard="phone-pad"
          />
          <Field
            label="目的地 *"
            value={destination}
            onChange={setDestination}
            placeholder="如 MDY（用作条码前缀）"
          />
          <Text style={styles.hint}>目的地码取前 3 位字母数字，如 MDY → MDY秒分时日月年</Text>
        </Section>

        <Section title="入库数量" accent="#059669">
          <View style={styles.qtyRow}>
            <Pressable style={styles.qtyBtn} onPress={() => setQty(String(Math.max(1, (Number(qty) || 1) - 1)))}>
              <Text style={styles.qtyBtnText}>−</Text>
            </Pressable>
            <TextInput
              style={styles.qtyInput}
              keyboardType="decimal-pad"
              value={qty}
              onChangeText={setQty}
            />
            <Pressable style={styles.qtyBtn} onPress={() => setQty(String((Number(qty) || 0) + 1))}>
              <Text style={styles.qtyBtnText}>+</Text>
            </Pressable>
            <Text style={styles.qtyUnit}>{stockUnitLabel()}</Text>
          </View>
          <Field
            label="备注（可选）"
            value={note}
            onChange={setNote}
            placeholder="采购单号、供应商、批次等"
            multiline
          />
        </Section>

        <Pressable style={[styles.btn, loading && styles.btnDisabled]} onPress={submit} disabled={loading}>
          <Text style={styles.btnText}>{loading ? '处理中…' : '确认入库'}</Text>
        </Pressable>
      </ScrollView>

      <StockInSuccessModal
        visible={!!successData}
        data={successData}
        onClose={() => setSuccessData(null)}
      />
    </KeyboardAvoidingView>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionDot, { backgroundColor: accent }]} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={[styles.sectionBody, { borderLeftColor: accent }]}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboard,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: 'default' | 'phone-pad' | 'decimal-pad';
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboard}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 48 },
  hero: { marginBottom: 18 },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '900' },
  subtitle: { color: '#94a3b8', marginTop: 8, fontSize: 14, lineHeight: 20 },
  section: { marginBottom: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { color: '#64748b', fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  sectionBody: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderLeftWidth: 3,
  },
  lookupHint: { color: '#6ee7b7', fontSize: 13, marginTop: 8, fontWeight: '600' },
  barcodePreview: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  barcodePreviewLabel: { color: '#64748b', fontSize: 11, fontWeight: '800', marginBottom: 4 },
  barcodePreviewValue: { color: '#fbbf24', fontSize: 14, fontFamily: 'monospace', fontWeight: '700' },
  field: { marginBottom: 12 },
  label: { color: '#e2e8f0', fontWeight: '700', marginBottom: 6, fontSize: 13 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  hint: { color: '#64748b', fontSize: 12, lineHeight: 18 },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  qtyBtnText: { color: '#f8fafc', fontSize: 22, fontWeight: '800' },
  qtyInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    color: '#0f172a',
  },
  qtyUnit: { color: '#94a3b8', fontWeight: '800', fontSize: 14, minWidth: 36 },
  btn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
