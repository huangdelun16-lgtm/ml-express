import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import OnlineRequiredBanner from '../components/OnlineRequiredBanner';
import OrderBarcodeModal, { type OrderBarcodeData } from '../components/OrderBarcodeModal';
import { InboundWizardFooter, InboundWizardHeader, type WizardStep } from '../components/stockIn/InboundWizardChrome';
import StockInStepCustomer from '../components/stockIn/StockInStepCustomer';
import StockInStepFee from '../components/stockIn/StockInStepFee';
import StockInStepScan from '../components/stockIn/StockInStepScan';
import { useAuth } from '../contexts/AuthContext';
import { useFormFieldChain } from '../hooks/useFormFieldChain';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { applyStockMovement, getItemByBarcode, getStockInPrefillByCode } from '../services/inventoryService';
import { feedbackService } from '../services/FeedbackService';
import type { InventoryItem } from '../types/inventory';
import { generateUniqueInboundBarcode } from '../utils/inboundBarcode';
import { formatSpec, formatWeight, parseSpec, parseWeight } from '../utils/itemFieldFormat';
import { inboundDateToIso, todayInMyanmar } from '../utils/stockInDate';
import { destinationFromCustomerCode, normalizePackDestination } from '../constants/destinationOptions';
import { resolveStoreHubCode } from '../utils/storeZone';
import {
  calculateCrossBorderTotalFee,
  fetchCrossBorderRoutePerKg,
  formatCrossBorderFeeHint,
} from '../utils/crossBorderPricing';
import { loadStockInContactDraft, saveStockInContactDraft } from '../utils/stockInDraft';
import { resolveAppError, useTranslation } from '../i18n';
import {
  applyCrossBorderCustomerToForm,
  useCrossBorderCustomerLookup,
} from '../hooks/useCrossBorderCustomerLookup';
import { colors, space } from '../theme';

type Route = { params?: { presetBarcode?: string } };

type Props = {
  route?: Route;
  navigation: NativeStackNavigationProp<RootStackParamList, 'StockIn'>;
};

export default function StockInScreen({ route, navigation }: Props) {
  const { operatorName, store, hubCode } = useAuth();
  const { t, fmt } = useTranslation();
  const stepLabels: Record<WizardStep, string> = {
    1: t.stockIn.step1,
    2: t.stockIn.step2,
    3: t.stockIn.step3,
  };
  const [step, setStep] = useState<WizardStep>(1);
  const [scan, setScan] = useState('');
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [productName, setProductName] = useState('');
  const [specL, setSpecL] = useState('');
  const [specW, setSpecW] = useState('');
  const [specH, setSpecH] = useState('');
  const [weightN, setWeightN] = useState('');
  const [packaging, setPackaging] = useState('');
  const [customerCode, setCustomerCode] = useState('');
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
  const [barcodeModalData, setBarcodeModalData] = useState<OrderBarcodeData | null>(null);
  const [lookupHint, setLookupHint] = useState('');
  const [customerLookupHint, setCustomerLookupHint] = useState('');
  const [scanLoading, setScanLoading] = useState(false);

  const applyCustomerRegistry = useCallback(
    (match: Parameters<typeof applyCrossBorderCustomerToForm>[0]) => {
      applyCrossBorderCustomerToForm(match, {
        setRecipientName,
        setRecipientPhone,
        setDestination: (v) => setDestination(normalizePackDestination(v)),
      });
      setCustomerLookupHint(
        fmt(t.stockIn.customerCodeMatched, { name: match.customer_name, phone: match.phone }),
      );
    },
    [t, fmt],
  );

  const { lookup: lookupCustomerCode, lookupNow: lookupCustomerCodeNow } =
    useCrossBorderCustomerLookup(applyCustomerRegistry);

  const step2Chain = useFormFieldChain(['code', 'name', 'phone', 'product']);
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
    const originHub = hubCode ?? (store ? resolveStoreHubCode(store) : '');
    let cancelled = false;
    void fetchCrossBorderRoutePerKg(originHub, destination, customerCode).then(
      ({ perKg, originCode, destinationCode, usedLegacyFallback }) => {
        if (cancelled) return;
        setFeeFormulaHint(
          formatCrossBorderFeeHint(
            originCode,
            destinationCode,
            perKg,
            weightKg,
            usedLegacyFallback,
            customerCode.trim().toUpperCase(),
          ),
        );
        setTotalFee(String(calculateCrossBorderTotalFee(perKg, weightStr)));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [step, destination, weightStr, weightN, totalFeeManual, canAutoTotalFee, hubCode, store, customerCode]);

  useEffect(() => {
    void loadStockInContactDraft().then((d) => {
      setCustomerCode(d.customerCode);
      setRecipientName(d.recipientName);
      setRecipientPhone(d.recipientPhone);
      setDestination(
        destinationFromCustomerCode(d.customerCode) || normalizePackDestination(d.destination),
      );
      setDetailAddress(d.detailAddress);
      setPackaging(d.packaging);
    });
  }, []);

  useEffect(() => {
    const fromCode = destinationFromCustomerCode(customerCode);
    if (!fromCode) return;
    setDestination((prev) => (prev === fromCode ? prev : fromCode));
    setTotalFeeManual(false);
  }, [customerCode]);

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
    setDestination(
      destinationFromCustomerCode(customerCode) || normalizePackDestination(prefill.destination),
    );
    setDetailAddress(prefill.detailAddress);
    setQty(String(prefill.qty));
    setNote(prefill.note);
    const label =
      prefill.matchLabel === 'express' ? t.trackExpress.matchExpress : t.trackExpress.matchInbound;
    setLookupHint(fmt(t.stockIn.matchedRecord, { type: label }));
  };

  const resolveBarcode = async (code: string) => {
    if (scanLoading || loading) return;
    const trimmed = code.trim();
    if (!trimmed) return;
    setScan(trimmed);
    setScanLoading(true);
    try {
      const prefill = await getStockInPrefillByCode(trimmed);
      if (prefill) {
        applyPrefill(prefill);
      } else {
        setItem(null);
        setLookupHint('');
      }
      setProductName(trimmed);
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
      const trimmedScan = scan.trim();
      if (trimmedScan) setProductName(trimmedScan);
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!recipientName.trim()) {
        feedbackService.notify(t.common.tip, t.stockIn.alertName);
        return;
      }
      if (!recipientPhone.trim()) {
        feedbackService.notify(t.common.tip, t.stockIn.alertPhone);
        return;
      }
      if (!productName.trim()) {
        feedbackService.notify(t.common.tip, t.stockIn.alertItemName);
        return;
      }
      const fromCode = destinationFromCustomerCode(customerCode);
      if (fromCode) {
        setDestination(fromCode);
        setTotalFeeManual(false);
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

  /** 财务/Admin 只认中文业务标签；多语言 UI 文案勿写入 note */
  const buildNote = () => {
    const parts: string[] = [];
    if (totalFee.trim()) parts.push(`总费用 ${totalFee.trim()} MMK`);
    if (payCod) parts.push('到付');
    if (payPrepaid) parts.push('预付');
    if (note.trim()) parts.push(note.trim());
    return parts.join(' · ');
  };

  const submit = async () => {
    if (loading) return;
    if (!destination.trim()) {
      feedbackService.notify(t.common.tip, t.stockIn.alertDestination);
      return;
    }
    if (!weightFilled) {
      feedbackService.notify(t.common.tip, t.stockIn.alertWeight);
      return;
    }
    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) {
      feedbackService.notify(t.common.tip, t.stockIn.alertQty);
      return;
    }
    if (!paymentSelected) {
      feedbackService.notify(t.common.tip, t.stockIn.paymentRequired);
      return;
    }

    setLoading(true);
    try {
      const dest = destination.trim();
      const barcode = await generateUniqueInboundBarcode(dest, async (code) => !!(await getItemByBarcode(code)));
      const inboundAt = inboundDateToIso(inboundDate);
      const fullNote = buildNote();

      await saveStockInContactDraft({
        customerCode: customerCode.trim().toUpperCase(),
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
        operator: operatorName ?? t.common.operator,
        note: fullNote,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        customerCode: customerCode.trim(),
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
      setBarcodeModalData({
        productName: trimmedProduct,
        barcode,
        inputBarcode: inputBarcode || undefined,
        destination: dest,
        customerName: recipientName.trim(),
        kind: 'inbound',
      });

      resetWizard();
    } catch (e: unknown) {
      feedbackService.notify(t.common.fail, resolveAppError(t, e));
    } finally {
      setLoading(false);
    }
  };

  const primaryLabel =
    step === 3 ? (loading ? t.common.loading : t.stockIn.submit) : t.stockIn.next;
  const primaryAction = step === 3 ? () => void submit() : goNext;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <InboundWizardHeader title={t.stockIn.title} step={step} stepLabels={stepLabels} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <OnlineRequiredBanner />
        {step === 1 ? (
          <StockInStepScan
            scan={scan}
            inboundDate={inboundDate}
            scanLoading={scanLoading}
            lookupHint={lookupHint}
            item={item}
            onScanChange={(text) => {
              setScan(text);
              setProductName(text.trim());
            }}
            onResolveBarcode={(code) => void resolveBarcode(code)}
            onInboundDateChange={setInboundDate}
          />
        ) : null}

        {step === 2 ? (
          <StockInStepCustomer
            scan={scan}
            customerCode={customerCode}
            customerLookupHint={customerLookupHint}
            recipientName={recipientName}
            recipientPhone={recipientPhone}
            productName={productName}
            packaging={packaging}
            chain={{
              code: step2Chain.propsFor('code'),
              name: step2Chain.propsFor('name'),
              phone: step2Chain.propsFor('phone'),
              product: step2Chain.propsFor('product'),
            }}
            onCustomerCodeChange={(v) => {
              setCustomerCode(v.toUpperCase());
              setCustomerLookupHint('');
              lookupCustomerCode(v);
            }}
            onCustomerCodeSubmit={() => void lookupCustomerCodeNow(customerCode)}
            onRecipientNameChange={setRecipientName}
            onRecipientPhoneChange={setRecipientPhone}
            onProductNameChange={setProductName}
            onPackagingChange={setPackaging}
          />
        ) : null}

        {step === 3 ? (
          <StockInStepFee
            scan={scan}
            destination={destination}
            detailAddress={detailAddress}
            specL={specL}
            specW={specW}
            specH={specH}
            weightN={weightN}
            qty={qty}
            payCod={payCod}
            payPrepaid={payPrepaid}
            totalFee={totalFee}
            feeFormulaHint={feeFormulaHint}
            canAutoTotalFee={canAutoTotalFee}
            totalFeeManual={totalFeeManual}
            note={note}
            chain={{
              detail: step3Chain.propsFor('detail', { multiline: true }),
              specL: step3Chain.propsFor('specL'),
              specW: step3Chain.propsFor('specW'),
              specH: step3Chain.propsFor('specH'),
              weight: step3Chain.propsFor('weight'),
              qty: step3Chain.propsFor('qty'),
              totalFee: step3Chain.propsFor('totalFee'),
              note: step3Chain.propsFor('note', { multiline: true }),
            }}
            onDestinationChange={(v) => {
              setDestination(v);
              setTotalFeeManual(false);
            }}
            onDetailAddressChange={setDetailAddress}
            onSpecChange={({ l, w, h }) => {
              setSpecL(l);
              setSpecW(w);
              setSpecH(h);
            }}
            onWeightChange={(v) => {
              setWeightN(v);
              setTotalFeeManual(false);
            }}
            onQtyChange={setQty}
            onToggleCod={toggleCod}
            onTogglePrepaid={togglePrepaid}
            onTotalFeeChange={(v) => {
              setTotalFeeManual(true);
              setTotalFee(v);
            }}
            onNoteChange={setNote}
          />
        ) : null}
      </ScrollView>

      <InboundWizardFooter
        cancelLabel={t.stockIn.cancel}
        primaryLabel={primaryLabel}
        loading={loading}
        onCancel={handleCancel}
        onPrimary={primaryAction}
      />

      <OrderBarcodeModal
        visible={!!barcodeModalData}
        data={barcodeModalData}
        title={t.stockIn.barcodeModalTitle}
        cancelLabel={t.stockIn.cancel}
        onClose={() => setBarcodeModalData(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xl },
});
