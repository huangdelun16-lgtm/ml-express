import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import InboundOrderFormBody from '../components/InboundOrderFormBody';
import { InboundFormSection } from '../components/InboundFormPrimitives';
import ScanInputBar from '../components/ScanInputBar';
import StockInSuccessModal, { type StockInSuccessData } from '../components/StockInSuccessModal';
import { useAuth } from '../contexts/AuthContext';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { applyStockMovement, getItemByBarcode, getStockInPrefillByCode } from '../services/inventoryService';
import type { InventoryItem } from '../types/inventory';
import { generateUniqueInboundBarcode, extractDestinationCode } from '../utils/inboundBarcode';
import {
  formatSpec,
  formatWeight,
  parseSpec,
  parseWeight,
  stockUnitLabel,
} from '../utils/itemFieldFormat';
import {
  formatInboundDateLabel,
  formatInboundDateYmd,
  inboundDateToIso,
  todayInMyanmar,
} from '../utils/stockInDate';
import { normalizePackDestination } from '../constants/destinationOptions';
import { loadStockInContactDraft, saveStockInContactDraft } from '../utils/stockInDraft';

type Route = { params?: { presetBarcode?: string } };

type Props = {
  route?: Route;
  navigation: NativeStackNavigationProp<RootStackParamList, 'StockIn'>;
};

export default function StockInScreen({ route, navigation }: Props) {
  const { operatorName, store } = useAuth();
  const [scan, setScan] = useState('');
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [productName, setProductName] = useState('');
  const [specL, setSpecL] = useState('');
  const [specW, setSpecW] = useState('');
  const [specH, setSpecH] = useState('');
  const [weightN, setWeightN] = useState('');
  const [packaging, setPackaging] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [destination, setDestination] = useState('');
  const [inboundDate, setInboundDate] = useState(todayInMyanmar());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<StockInSuccessData | null>(null);
  const [lookupHint, setLookupHint] = useState('');
  const [scanLoading, setScanLoading] = useState(false);

  const specStr = useMemo(
    () => formatSpec({ l: specL, w: specW, h: specH }),
    [specL, specW, specH],
  );
  const weightStr = useMemo(() => formatWeight({ n: weightN }), [weightN]);

  useEffect(() => {
    void loadStockInContactDraft().then((d) => {
      setRecipientName(d.recipientName);
      setRecipientPhone(d.recipientPhone);
      setDestination(normalizePackDestination(d.destination));
      setPackaging(d.packaging);
    });
  }, []);

  const applyPrefill = (prefill: NonNullable<Awaited<ReturnType<typeof getStockInPrefillByCode>>>) => {
    setItem(prefill.item);
    setProductName(prefill.productName);
    const spec = parseSpec(prefill.spec);
    setSpecL(spec.l);
    setSpecW(spec.w);
    setSpecH(spec.h);
    setWeightN(parseWeight(prefill.weight).n);
    setPackaging(prefill.packaging);
    setRecipientName(prefill.recipientName);
    setRecipientPhone(prefill.recipientPhone);
    setDestination(normalizePackDestination(prefill.destination));
    setQty(String(prefill.qty));
    setNote(prefill.note);
    const label = prefill.matchLabel === 'express' ? '快递单' : '入库单';
    setLookupHint(`已匹配${label}记录，已自动填入商品、规格、收发与入库数量`);
  };

  const resolveBarcode = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setScan(trimmed);
    setScanLoading(true);
    try {
      const prefill = await getStockInPrefillByCode(trimmed);
      if (prefill) {
        applyPrefill(prefill);
        return;
      }
      setItem(null);
      setProductName('');
      setLookupHint('');
    } finally {
      setScanLoading(false);
    }
  };

  useEffect(() => {
    const preset = route?.params?.presetBarcode;
    if (preset) void resolveBarcode(preset);
  }, [route?.params?.presetBarcode]);

  const handleSuccessDone = useCallback(() => {
    setSuccessData(null);
    navigation.navigate('Home');
  }, [navigation]);

  const submit = async () => {
    const n = Number(qty);
    if (!recipientName.trim()) {
      Alert.alert('提示', '请填写姓名');
      return;
    }
    if (!destination.trim()) {
      Alert.alert('提示', '请选择最终目的地');
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
      const inboundAt = inboundDateToIso(inboundDate);

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
        inboundAt,
        originStore: store
          ? { id: store.id, storeCode: store.storeCode, storeName: store.storeName }
          : undefined,
        createIfMissing: {
          name: productName.trim(),
          spec: specStr,
          unit: `${n} Pcs`,
          weight: weightStr,
        },
      });

      setSuccessData({
        barcode,
        inputBarcode: inputBarcode || undefined,
        productName: productName.trim(),
        inboundDateLabel: formatInboundDateLabel(inboundDate),
        recipientName: recipientName.trim(),
        destination: dest,
        qty: n,
        spec: specStr || undefined,
        weight: weightStr || undefined,
      });

      setScan('');
      setItem(null);
      setProductName('');
      setSpecL('');
      setSpecW('');
      setSpecH('');
      setWeightN('');
      setQty('1');
      setNote('');
      setLookupHint('');
      setInboundDate(todayInMyanmar());
    } catch (e: unknown) {
      Alert.alert('失败', e instanceof Error ? e.message : '请重试');
    } finally {
      setLoading(false);
    }
  };

  const barcodePreview = destination.trim()
    ? `${extractDestinationCode(destination)}·秒分时日月年（确认后按缅甸时间生成）`
    : '选择最终目的地后自动生成条码';

  const onDateChange = (_event: unknown, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setInboundDate(date);
  };

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

        <InboundFormSection title="扫码识别（可选）" accent="#3b82f6">
          <ScanInputBar
            value={scan}
            onChangeText={setScan}
            onSubmit={(code) => void resolveBarcode(code)}
            busy={scanLoading}
            cameraScan={{
              title: '扫快递单 / 入库条码',
              subtitle: '识别后自动填充商品与收发资料',
            }}
            placeholder="快递单 / 入库条码"
          />
          {lookupHint ? <Text style={styles.lookupHint}>{lookupHint}</Text> : null}
          {item ? (
            <Text style={styles.lookupMeta}>
              {item.name} · 库存 {item.qty_on_hand} {stockUnitLabel()}（本次入库将生成新条码）
            </Text>
          ) : null}
        </InboundFormSection>

        <InboundOrderFormBody
          mode="stock-in"
          editable
          values={{
            productName,
            specL,
            specW,
            specH,
            weightN,
            packaging,
            recipientName,
            recipientPhone,
            destination,
            note,
          }}
          specStr={specStr}
          weightStr={weightStr}
          onProductNameChange={setProductName}
          onSpecChange={({ l, w, h }) => {
            setSpecL(l);
            setSpecW(w);
            setSpecH(h);
          }}
          onWeightChange={setWeightN}
          onPackagingChange={setPackaging}
          onRecipientNameChange={setRecipientName}
          onRecipientPhoneChange={setRecipientPhone}
          onDestinationChange={setDestination}
          onNoteChange={setNote}
          barcodeText={barcodePreview}
          inboundDateLabel={formatInboundDateLabel(inboundDate)}
          inboundDateYmd={formatInboundDateYmd(inboundDate)}
          inboundDate={inboundDate}
          showDatePicker={showDatePicker}
          onOpenDatePicker={() => setShowDatePicker(true)}
          onCloseDatePicker={() => setShowDatePicker(false)}
          onDateChange={onDateChange}
          maxInboundDate={todayInMyanmar()}
          qty={qty}
          onQtyChange={setQty}
          onQtyDec={() => setQty(String(Math.max(1, (Number(qty) || 1) - 1)))}
          onQtyInc={() => setQty(String((Number(qty) || 0) + 1))}
        />

        <Pressable style={[styles.btn, loading && styles.btnDisabled]} onPress={submit} disabled={loading}>
          <Text style={styles.btnText}>{loading ? '处理中…' : '确认入库'}</Text>
        </Pressable>
      </ScrollView>

      <StockInSuccessModal
        visible={!!successData}
        data={successData}
        onDone={handleSuccessDone}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 48 },
  hero: { marginBottom: 18 },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '900' },
  subtitle: { color: '#94a3b8', marginTop: 8, fontSize: 14, lineHeight: 20 },
  lookupHint: { color: '#6ee7b7', fontSize: 13, marginTop: 8, fontWeight: '700' },
  lookupMeta: { color: '#94a3b8', fontSize: 12, marginTop: 4, lineHeight: 18 },
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
