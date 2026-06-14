import React, { useEffect, useMemo, useState } from 'react';
import { useFormFieldChain } from '../hooks/useFormFieldChain';
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DestinationPickerField from '../components/DestinationPickerField';
import InboundDateField from '../components/InboundDateField';
import { InboundFormField, InboundFormSection } from '../components/InboundFormPrimitives';
import PackagingPickerField from '../components/PackagingPickerField';
import ScanInputBar from '../components/ScanInputBar';
import StockInInvoiceModal, { type StockInInvoiceData } from '../components/StockInInvoiceModal';
import { DimensionSpecField, LockedSuffixField } from '../components/StructuredItemFields';
import { useAuth } from '../contexts/AuthContext';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { applyStockMovement, getItemByBarcode, getStockInPrefillByCode } from '../services/inventoryService';
import type { InventoryItem } from '../types/inventory';
import { generateUniqueInboundBarcode } from '../utils/inboundBarcode';
import {
  formatSpec,
  formatWeight,
  parseSpec,
  parseWeight,
  sanitizeNumberInput,
  stockUnitLabel,
} from '../utils/itemFieldFormat';
import {
  formatInboundDateLabel,
  inboundDateToIso,
  todayInMyanmar,
} from '../utils/stockInDate';
import { normalizePackDestination } from '../constants/destinationOptions';
import {
  calculateCrossBorderTotalFee,
  fetchCrossBorderBaseFee,
  formatCrossBorderFeeHint,
} from '../utils/crossBorderPricing';
import { loadStockInContactDraft, saveStockInContactDraft } from '../utils/stockInDraft';
import { showTaskSuccess } from '../utils/taskSuccessAlert';

type Route = { params?: { presetBarcode?: string } };
type Step = 1 | 2 | 3;

type Props = {
  route?: Route;
  navigation: NativeStackNavigationProp<RootStackParamList, 'StockIn'>;
};

const STEP_LABELS: Record<Step, string> = {
  1: '扫码识别',
  2: '客户信息',
  3: '费用计算',
};

function ScanRefBanner({ code, hint }: { code: string; hint?: string }) {
  const trimmed = code.trim();
  if (!trimmed) {
    return (
      <View style={styles.scanBannerEmpty}>
        <Text style={styles.scanBannerEmptyText}>未关联快递单 / 入库条码（可在上一步扫码）</Text>
      </View>
    );
  }
  return (
    <View style={styles.scanBanner}>
      <Text style={styles.scanBannerLabel}>{hint ?? '关联条码'}</Text>
      <Text style={styles.scanBannerValue} selectable>{trimmed}</Text>
    </View>
  );
}

export default function StockInScreen({ route, navigation }: Props) {
  const { operatorName, store } = useAuth();
  const [step, setStep] = useState<Step>(1);
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
  const [detailAddress, setDetailAddress] = useState('');
  const [inboundDate, setInboundDate] = useState(todayInMyanmar());
  const [qty, setQty] = useState('1');
  const [totalFee, setTotalFee] = useState('');
  const [totalFeeManual, setTotalFeeManual] = useState(false);
  const [feeFormulaHint, setFeeFormulaHint] = useState('');
  const [payCod, setPayCod] = useState(false);
  const [payPrepaid, setPayPrepaid] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<StockInInvoiceData | null>(null);
  const [lookupHint, setLookupHint] = useState('');
  const [scanLoading, setScanLoading] = useState(false);

  const step2Chain = useFormFieldChain(['name', 'phone', 'product']);
  const step3Chain = useFormFieldChain([
    'detail',
    'specL',
    'specW',
    'specH',
    'weight',
    'qty',
    'totalFee',
    'note',
  ]);

  const specStr = useMemo(
    () => formatSpec({ l: specL, w: specW, h: specH }),
    [specL, specW, specH],
  );
  const weightStr = useMemo(() => formatWeight({ n: weightN }), [weightN]);
  const paymentSelected = payCod || payPrepaid;
  const weightFilled = useMemo(() => {
    const trimmed = weightN.trim();
    if (!trimmed) return false;
    const n = Number(trimmed);
    return Number.isFinite(n) && n > 0;
  }, [weightN]);
  const destinationFilled = destination.trim().length > 0;
  const canAutoTotalFee = destinationFilled && weightFilled && paymentSelected;

  useEffect(() => {
    if (step !== 3 || totalFeeManual) return;
    if (!canAutoTotalFee) {
      setTotalFee('');
      setFeeFormulaHint('');
      return;
    }
    const weightKg = Number(weightN.trim()) || 0;
    let cancelled = false;
    void fetchCrossBorderBaseFee(destination).then(({ baseFee, destinationCode }) => {
      if (cancelled) return;
      setFeeFormulaHint(formatCrossBorderFeeHint(destinationCode, baseFee, weightKg));
      setTotalFee(String(calculateCrossBorderTotalFee(baseFee, weightStr)));
    });
    return () => {
      cancelled = true;
    };
  }, [step, destination, weightStr, weightN, totalFeeManual, canAutoTotalFee]);

  useEffect(() => {
    void loadStockInContactDraft().then((d) => {
      setRecipientName(d.recipientName);
      setRecipientPhone(d.recipientPhone);
      setDestination(normalizePackDestination(d.destination));
      setDetailAddress(d.detailAddress);
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
    setDetailAddress(prefill.detailAddress);
    setQty(String(prefill.qty));
    setNote(prefill.note);
    const label = prefill.matchLabel === 'express' ? '快递单' : '入库单';
    setLookupHint(`已匹配${label}记录，已自动填入相关信息`);
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

  const resetWizard = () => {
    setStep(1);
    setScan('');
    setItem(null);
    setProductName('');
    setSpecL('');
    setSpecW('');
    setSpecH('');
    setWeightN('');
    setQty('1');
    setTotalFee('');
    setTotalFeeManual(false);
    setFeeFormulaHint('');
    setDetailAddress('');
    setPayCod(false);
    setPayPrepaid(false);
    setNote('');
    setLookupHint('');
    setInboundDate(todayInMyanmar());
  };

  const handleCancel = () => {
    if (step === 1) {
      navigation.goBack();
      return;
    }
    setStep((s) => (s === 3 ? 2 : 1));
  };

  const goNext = () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!recipientName.trim()) {
        Alert.alert('提示', '请填写姓名');
        return;
      }
      if (!productName.trim()) {
        Alert.alert('提示', '请填写商品名称');
        return;
      }
      if (!packaging) {
        Alert.alert('提示', '请选择商品包装');
        return;
      }
      setStep(3);
    }
  };

  const toggleCod = () => {
    setPayCod(true);
    setPayPrepaid(false);
    setTotalFeeManual(false);
  };

  const togglePrepaid = () => {
    setPayPrepaid(true);
    setPayCod(false);
    setTotalFeeManual(false);
  };

  const validateStep3Required = (): string | null => {
    const missing: string[] = [];
    if (!destination.trim()) missing.push('最终目的地');
    if (!weightFilled) missing.push('重量');
    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) missing.push('数量');
    if (!paymentSelected) missing.push('付款方式（到付或预付）');
    if (missing.length === 0) return null;
    return `请完善以下必填项：\n${missing.map((m) => `· ${m}`).join('\n')}`;
  };

  const buildNote = () => {
    const parts: string[] = [];
    if (totalFee.trim()) parts.push(`总费用 ${totalFee.trim()} MMK`);
    if (payCod) parts.push('到付');
    if (payPrepaid) parts.push('预付');
    if (note.trim()) parts.push(note.trim());
    return parts.join(' · ');
  };

  const paymentLabel = payCod ? '到付' : payPrepaid ? '预付' : '';

  const submit = async () => {
    const step3Error = validateStep3Required();
    if (step3Error) {
      Alert.alert('提示', step3Error);
      return;
    }
    const n = Number(qty);

    setLoading(true);
    try {
      const dest = destination.trim();
      const barcode = await generateUniqueInboundBarcode(dest, async (code) => !!(await getItemByBarcode(code)));
      const inboundAt = inboundDateToIso(inboundDate);
      const fullNote = buildNote();

      await saveStockInContactDraft({
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        destination: dest,
        detailAddress: detailAddress.trim(),
        packaging,
      });

      const inputBarcode = scan.trim();
      await applyStockMovement({
        barcode,
        type: 'in',
        qty: n,
        operator: operatorName ?? '工作人员',
        note: fullNote,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        destination: dest,
        detailAddress: detailAddress.trim(),
        packaging,
        inputBarcode,
        inboundAt,
        originStore: store
          ? { id: store.id, storeCode: store.storeCode, storeName: store.storeName }
          : undefined,
        actingStore: store ?? undefined,
        createIfMissing: {
          name: productName.trim(),
          spec: specStr,
          unit: `${n} Pcs`,
          weight: weightStr,
        },
      });

      const trimmedProduct = productName.trim();
      setInvoiceData({
        barcode,
        inputBarcode: inputBarcode || undefined,
        productName: trimmedProduct,
        inboundDateLabel: formatInboundDateLabel(inboundDate),
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim() || undefined,
        destination: dest,
        detailAddress: detailAddress.trim() || undefined,
        qty: n,
        packaging,
        spec: specStr || undefined,
        weight: weightStr || undefined,
        totalFee: totalFee.trim() || undefined,
        paymentLabel: paymentLabel || undefined,
        note: note.trim() || undefined,
        storeName: store?.storeName,
      });

      resetWizard();
      showTaskSuccess(
        '入库成功',
        `${trimmedProduct} 已登记入库\n入库条码：${barcode}`,
      );
    } catch (e: unknown) {
      Alert.alert('失败', e instanceof Error ? e.message : '请重试');
    } finally {
      setLoading(false);
    }
  };

  const primaryLabel = step === 3 ? (loading ? '处理中…' : '确认入库') : '下一步';
  const primaryAction = step === 3 ? () => void submit() : goNext;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>📥 入库</Text>
        <View style={styles.stepRow}>
          {([1, 2, 3] as Step[]).map((n) => (
            <View key={n} style={styles.stepItem}>
              <View style={[styles.stepDot, step >= n && styles.stepDotActive]}>
                <Text style={[styles.stepDotText, step >= n && styles.stepDotTextActive]}>{n}</Text>
              </View>
              <Text style={[styles.stepLabel, step === n && styles.stepLabelActive]}>
                {STEP_LABELS[n]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 ? (
          <InboundFormSection title="扫码识别（可选）" accent="#3b82f6">
            <ScanInputBar
              value={scan}
              onChangeText={setScan}
              onSubmit={(code) => void resolveBarcode(code)}
              busy={scanLoading}
              cameraScan={{
                title: '扫快递单 / 入库条码',
                subtitle: '识别后自动填充后续步骤',
              }}
              placeholder="快递单 / 入库条码"
            />
            {lookupHint ? <Text style={styles.lookupHint}>{lookupHint}</Text> : null}
            {item ? (
              <Text style={styles.lookupMeta}>
                {item.name} · 库存 {item.qty_on_hand} {stockUnitLabel()}（本次将生成新入库条码）
              </Text>
            ) : null}

            <InboundDateField
              value={inboundDate}
              onChange={setInboundDate}
              maximumDate={todayInMyanmar()}
            />
          </InboundFormSection>
        ) : null}

        {step === 2 ? (
          <>
            <ScanRefBanner code={scan} hint="扫码 / 输入的条码" />
            <InboundFormSection title="客户信息" accent="#0891b2">
              <InboundFormField
                label="姓名 *"
                value={recipientName}
                onChange={setRecipientName}
                placeholder="收件人 / 联系人姓名"
                inputRef={step2Chain.propsFor('name').inputRef}
                returnKeyType={step2Chain.propsFor('name').returnKeyType}
                onSubmitEditing={step2Chain.propsFor('name').onSubmitEditing}
                blurOnSubmit={step2Chain.propsFor('name').blurOnSubmit}
              />
              <InboundFormField
                label="电话号码"
                value={recipientPhone}
                onChange={setRecipientPhone}
                placeholder="09xxxxxxxxx"
                keyboard="phone-pad"
                inputRef={step2Chain.propsFor('phone').inputRef}
                returnKeyType={step2Chain.propsFor('phone').returnKeyType}
                onSubmitEditing={step2Chain.propsFor('phone').onSubmitEditing}
                blurOnSubmit={step2Chain.propsFor('phone').blurOnSubmit}
              />
              <InboundFormField
                label="商品名称 *"
                value={productName}
                onChange={setProductName}
                placeholder="输入商品名称"
                inputRef={step2Chain.propsFor('product').inputRef}
                returnKeyType={step2Chain.propsFor('product').returnKeyType}
                onSubmitEditing={step2Chain.propsFor('product').onSubmitEditing}
                blurOnSubmit={step2Chain.propsFor('product').blurOnSubmit}
              />
              <PackagingPickerField value={packaging} onChange={setPackaging} />
            </InboundFormSection>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <ScanRefBanner code={scan} hint="扫码 / 输入的条码" />
            <InboundFormSection title="费用计算" accent="#059669">
              <DestinationPickerField
                label="最终目的地"
                hint="订单最终送达地区，全程不变；总费用按此地领区跨境起步价计费"
                value={destination}
                onChange={(v) => {
                  setDestination(v);
                  setTotalFeeManual(false);
                }}
              />
              <InboundFormField
                label="详细地址"
                value={detailAddress}
                onChange={setDetailAddress}
                placeholder="街道、门牌、小区等具体地址"
                multiline
                inputRef={step3Chain.propsFor('detail', { multiline: true }).inputRef}
                returnKeyType={step3Chain.propsFor('detail', { multiline: true }).returnKeyType}
                onSubmitEditing={step3Chain.propsFor('detail', { multiline: true }).onSubmitEditing}
                blurOnSubmit={step3Chain.propsFor('detail', { multiline: true }).blurOnSubmit}
              />
              <DimensionSpecField
                l={specL}
                w={specW}
                h={specH}
                onChange={({ l, w, h }) => {
                  setSpecL(l);
                  setSpecW(w);
                  setSpecH(h);
                }}
                lInput={step3Chain.propsFor('specL')}
                wInput={step3Chain.propsFor('specW')}
                hInput={step3Chain.propsFor('specH')}
              />
              <LockedSuffixField
                label="重量 *"
                value={weightN}
                suffix="Kg"
                onChange={(v) => {
                  setWeightN(v);
                  setTotalFeeManual(false);
                }}
                placeholder="重量"
                inputRef={step3Chain.propsFor('weight').inputRef}
                returnKeyType={step3Chain.propsFor('weight').returnKeyType}
                onSubmitEditing={step3Chain.propsFor('weight').onSubmitEditing}
                blurOnSubmit={step3Chain.propsFor('weight').blurOnSubmit}
              />
              <View style={styles.qtyRow}>
                <Text style={styles.qtyLabel}>数量 *</Text>
                <View style={styles.qtyControls}>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => setQty(String(Math.max(1, (Number(qty) || 1) - 1)))}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </Pressable>
                  <TextInput
                    ref={step3Chain.propsFor('qty').inputRef}
                    style={styles.qtyInput}
                    keyboardType="decimal-pad"
                    value={qty}
                    onChangeText={setQty}
                    returnKeyType={step3Chain.propsFor('qty').returnKeyType}
                    onSubmitEditing={step3Chain.propsFor('qty').onSubmitEditing}
                    blurOnSubmit={step3Chain.propsFor('qty').blurOnSubmit}
                    submitBehavior="submit"
                  />
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => setQty(String((Number(qty) || 0) + 1))}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </Pressable>
                  <Text style={styles.qtyUnit}>{stockUnitLabel()}</Text>
                </View>
              </View>
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>付款方式 *</Text>
                <View style={styles.payChecks}>
                  <Pressable
                    style={[styles.payCheck, payCod && styles.payCheckOn]}
                    onPress={toggleCod}
                  >
                    <Text style={[styles.payCheckText, payCod && styles.payCheckTextOn]}>到付</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.payCheck, payPrepaid && styles.payCheckOn]}
                    onPress={togglePrepaid}
                  >
                    <Text style={[styles.payCheckText, payPrepaid && styles.payCheckTextOn]}>
                      预付
                    </Text>
                  </Pressable>
                </View>
              </View>
              <InboundFormField
                label="总费用"
                value={totalFee}
                onChange={(v) => {
                  setTotalFeeManual(true);
                  setTotalFee(sanitizeNumberInput(v));
                }}
                placeholder="金额（MMK）"
                keyboard="decimal-pad"
                inputRef={step3Chain.propsFor('totalFee').inputRef}
                returnKeyType={step3Chain.propsFor('totalFee').returnKeyType}
                onSubmitEditing={step3Chain.propsFor('totalFee').onSubmitEditing}
                blurOnSubmit={step3Chain.propsFor('totalFee').blurOnSubmit}
              />
              {!canAutoTotalFee && !totalFeeManual ? (
                <Text style={styles.feeHint}>
                  选择最终目的地、填写重量并选择付款方式后，总费用 = 该目的地领区跨境起步价 × 重量
                </Text>
              ) : null}
              {feeFormulaHint && canAutoTotalFee ? (
                <Text style={styles.feeHint}>
                  {totalFeeManual
                    ? '已手动修改，改重量/数量/付款方式不会自动重算'
                    : `按 Admin 跨境物流自动计算：${feeFormulaHint}`}
                </Text>
              ) : null}
              <InboundFormField
                label="备注（可选）"
                value={note}
                onChange={setNote}
                placeholder="其它说明"
                multiline
                inputRef={step3Chain.propsFor('note', { multiline: true }).inputRef}
                returnKeyType={step3Chain.propsFor('note', { multiline: true }).returnKeyType}
                onSubmitEditing={step3Chain.propsFor('note', { multiline: true }).onSubmitEditing}
                blurOnSubmit={step3Chain.propsFor('note', { multiline: true }).blurOnSubmit}
              />
            </InboundFormSection>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>取消</Text>
        </Pressable>
        <Pressable
          style={[styles.nextBtn, loading && styles.nextBtnDisabled]}
          onPress={primaryAction}
          disabled={loading}
        >
          <Text style={styles.nextBtnText}>{primaryLabel}</Text>
        </Pressable>
      </View>

      <StockInInvoiceModal
        visible={!!invoiceData}
        data={invoiceData}
        onClose={() => setInvoiceData(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '900', marginBottom: 12 },
  stepRow: { flexDirection: 'row', gap: 8 },
  stepItem: { flex: 1, alignItems: 'center', gap: 4 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#059669' },
  stepDotText: { color: '#94a3b8', fontWeight: '900', fontSize: 13 },
  stepDotTextActive: { color: '#fff' },
  stepLabel: { color: '#64748b', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  stepLabelActive: { color: '#6ee7b7' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  lookupHint: { color: '#6ee7b7', fontSize: 13, marginTop: 8, fontWeight: '700' },
  lookupMeta: { color: '#94a3b8', fontSize: 12, marginTop: 4, lineHeight: 18 },
  scanBanner: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  scanBannerEmpty: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  scanBannerEmptyText: { color: '#64748b', fontSize: 12 },
  scanBannerLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  scanBannerValue: {
    color: '#7dd3fc',
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  qtyRow: { marginBottom: 12 },
  qtyLabel: { color: '#e2e8f0', fontWeight: '700', marginBottom: 8, fontSize: 13 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
  payRow: { marginBottom: 12 },
  payLabel: { color: '#e2e8f0', fontWeight: '700', marginBottom: 8, fontSize: 13 },
  payChecks: { flexDirection: 'row', gap: 10 },
  payCheck: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#0f172a',
  },
  payCheckOn: {
    borderColor: '#059669',
    backgroundColor: 'rgba(5,150,105,0.15)',
  },
  payCheckText: { color: '#94a3b8', fontWeight: '800', fontSize: 14 },
  payCheckTextOn: { color: '#6ee7b7' },
  feeHint: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
    marginTop: -4,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    backgroundColor: '#0f172a',
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  cancelBtnText: { color: '#94a3b8', fontWeight: '800', fontSize: 15 },
  nextBtn: {
    flex: 1.4,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#059669',
  },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
