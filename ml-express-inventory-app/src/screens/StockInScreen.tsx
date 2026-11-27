import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import OrderBarcodeModal, { type OrderBarcodeData } from '../components/OrderBarcodeModal';
import { InboundWizardFooter, InboundWizardHeader, type WizardStep } from '../components/stockIn/InboundWizardChrome';
import StockInStepCustomer from '../components/stockIn/StockInStepCustomer';
import StockInStepFee from '../components/stockIn/StockInStepFee';
import StockInStepScan from '../components/stockIn/StockInStepScan';
import { useAuth } from '../contexts/AuthContext';
import { useFormFieldChain } from '../hooks/useFormFieldChain';
import type { RootStackParamList } from '../navigation/AppNavigator';
import {
  addStockedItemToPack,
  applyStockMovement,
  createPackedShipment,
  generatePackageNumber,
  getItemByBarcode,
  getPackedShipmentByBarcode,
  getStockInPrefillByCode,
} from '../services/inventoryService';
import { feedbackService } from '../services/FeedbackService';
import type { InventoryItem } from '../types/inventory';
import { generateUniqueInboundBarcode } from '../utils/inboundBarcode';
import { formatSpec, formatWeight, parseSpec, parseWeight, sumPackageWeightsKg } from '../utils/itemFieldFormat';
import { inboundDateToIso, todayInMyanmar } from '../utils/stockInDate';
import { hasInboundScanDraft } from '../utils/inboundLeaveDraft';
import CollapsingHomeHeader, { useCollapsingHomeScroll } from '../components/CollapsingHomeHeader';
import { useInboundLeaveGuard } from '../hooks/useInboundLeaveGuard';
import { destinationFromCustomerCode, normalizePackDestination } from '../constants/destinationOptions';
import { resolveStoreHubCode } from '../utils/storeZone';
import {
  fetchCrossBorderRoutePerKg,
  formatCrossBorderCnyHint,
  quoteCnyForEditedWeight,
} from '../utils/crossBorderPricing';
import { formatCnyInput } from '../utils/crossBorderFx';
import { chargeBasisNote } from '../utils/inboundMovementNote';
import { preferredChargeBasis, volumetricWeightKg } from '../utils/volumetricWeight';
import { loadStockInContactDraft, saveStockInContactDraft } from '../utils/stockInDraft';
import { resolveAppError, useTranslation } from '../i18n';
import {
  applyCrossBorderCustomerToForm,
  useCrossBorderCustomerLookup,
} from '../hooks/useCrossBorderCustomerLookup';
import { normalizePackageOriginPrefix } from '../utils/packageNumber';
import { colors, space } from '../theme';

type HeldStockIn = {
  id: string;
  scan: string;
  productName: string;
  specStr: string;
  weightStr: string;
  qty: number;
  customerCode: string;
  recipientName: string;
  recipientPhone: string;
  destination: string;
  detailAddress: string;
  inboundDate: string;
  totalFee: string;
  chargeBasis: 'volume' | 'weight';
  chargeKg: number;
  payCod: boolean;
  payPrepaid: boolean;
  note: string;
};

type Route = { params?: { presetBarcode?: string; addToPackBarcode?: string } };

type Props = {
  route?: Route;
  navigation: NativeStackNavigationProp<RootStackParamList, 'StockIn'>;
};

export default function StockInScreen({ route, navigation }: Props) {
  const { operatorName, store, hubCode } = useAuth();
  const { t, fmt } = useTranslation();
  const { scrollY, onScroll } = useCollapsingHomeScroll();
  const stepLabels: Record<WizardStep, string> = {
    1: t.stockIn.step1,
    2: t.stockIn.step2,
    3: t.stockIn.step3,
  };
  const [step, setStep] = useState<WizardStep>(1);
  const [heldOrders, setHeldOrders] = useState<HeldStockIn[]>([]);
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
  const [chargeBasis, setChargeBasis] = useState<'volume' | 'weight'>('weight');
  const [chargeManual, setChargeManual] = useState(false);
  const [payCod, setPayCod] = useState(false);
  const [payPrepaid, setPayPrepaid] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [barcodeModalData, setBarcodeModalData] = useState<OrderBarcodeData | null>(null);
  const [lookupHint, setLookupHint] = useState('');
  const [customerLookupHint, setCustomerLookupHint] = useState('');
  const [scanLoading, setScanLoading] = useState(false);

  const addToPackBarcode = route?.params?.addToPackBarcode?.trim().toUpperCase() || '';
  const hasScanDraft = hasInboundScanDraft({
    scanCode: scan,
    hasMatchedItem: Boolean(item),
    scannedLineCount: heldOrders.length,
  });
  const { requestLeave } = useInboundLeaveGuard({
    navigation,
    shouldConfirm: hasScanDraft,
    title: heldOrders.length > 0 ? t.stockIn.leaveKeepTitle : t.stockIn.leaveDraftTitle,
    message: heldOrders.length > 0
      ? fmt(t.stockIn.leaveKeepBody, { count: heldOrders.length })
      : fmt(t.stockIn.leaveDraftBody, { count: hasScanDraft ? 1 : 0 }),
    stayLabel: t.stockIn.leaveDraftStay,
    leaveLabel: heldOrders.length > 0 ? t.stockIn.leaveKeepLeave : t.stockIn.leaveDraftLeave,
    onLeave: () => persistFilledAndLeave(),
  });

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

  const step2Chain = useFormFieldChain(['code', 'name', 'phone']);
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
  const volumetricKg = useMemo(
    () => volumetricWeightKg(specL, specW, specH),
    [specL, specW, specH],
  );
  const chargeKg = chargeBasis === 'volume' ? volumetricKg ?? 0 : Number(weightN.trim()) || 0;
  const autoBasis = preferredChargeBasis(volumetricKg, Number(weightN.trim()) || 0);
  const chargeHint = chargeManual
    ? t.stockIn.chargeManual
    : autoBasis === 'volume'
      ? t.stockIn.chargeAutoVolume
      : autoBasis === 'weight'
        ? t.stockIn.chargeAutoWeight
        : '';

  useEffect(() => {
    if (chargeManual) return;
    if (!autoBasis || autoBasis === chargeBasis) return;
    setTotalFeeManual(false);
    setChargeBasis(autoBasis);
  }, [chargeManual, autoBasis, chargeBasis]);
  const canAutoTotalFee = destinationFilled && chargeKg > 0 && paymentSelected;

  useEffect(() => {
    if (step !== 3 || totalFeeManual) return;
    if (!canAutoTotalFee) {
      setTotalFee('');
      setFeeFormulaHint('');
      return;
    }
    const originHub = hubCode ?? (store ? resolveStoreHubCode(store) : '');
    let cancelled = false;
    void fetchCrossBorderRoutePerKg(originHub, destination, customerCode).then(
      ({ perKg, originCode, destinationCode, mmkPerCny: rate, cnyPerKg }) => {
        if (cancelled) return;
        const weightKg = chargeKg;
        const cny = quoteCnyForEditedWeight({
          cnyPerKg,
          perKgMmk: perKg,
          mmkPerCny: rate,
          weightKg,
        });
        setFeeFormulaHint(
          formatCrossBorderCnyHint(
            originCode,
            destinationCode,
            perKg,
            weightKg,
            customerCode.trim().toUpperCase(),
            rate,
            cnyPerKg,
          ),
        );
        setTotalFee(cny == null ? '' : formatCnyInput(cny));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [step, destination, weightStr, weightN, chargeKg, chargeBasis, totalFeeManual, canAutoTotalFee, hubCode, store, customerCode]);

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
    setHeldOrders([]);
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
    setChargeBasis('weight');
    setChargeManual(false);
    setPayCod(false);
    setPayPrepaid(false);
    setNote('');
    setLookupHint('');
    setInboundDate(todayInMyanmar());
  };

  const handleCancel = () => {
    if (step > 1) {
      setStep((current) => (current === 3 ? 2 : 1));
      return;
    }
    requestLeave();
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
      if (!productName.trim() && !scan.trim()) {
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
  const noteForOrder = (order: Pick<HeldStockIn, 'totalFee' | 'chargeBasis' | 'chargeKg' | 'payCod' | 'payPrepaid' | 'note'>) => {
    const parts: string[] = [];
    if (order.totalFee.trim()) parts.push(`报价 ${order.totalFee.trim()} CNY`);
    parts.push(chargeBasisNote(order.chargeBasis, order.chargeKg));
    if (order.payCod) parts.push('到付');
    if (order.payPrepaid) parts.push('预付');
    if (order.note.trim()) parts.push(order.note.trim());
    return parts.join(' · ');
  };

  const readCurrentOrder = (): HeldStockIn | null => {
    if (!destination.trim()) {
      feedbackService.notify(t.common.tip, t.stockIn.alertDestination);
      return null;
    }
    if (!weightFilled) {
      feedbackService.notify(t.common.tip, t.stockIn.alertWeight);
      return null;
    }
    if (chargeBasis === 'volume' && !(volumetricKg && volumetricKg > 0)) {
      feedbackService.notify(t.common.tip, t.stockIn.alertSpec);
      return null;
    }
    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) {
      feedbackService.notify(t.common.tip, t.stockIn.alertQty);
      return null;
    }
    if (!paymentSelected) {
      feedbackService.notify(t.common.tip, t.stockIn.paymentRequired);
      return null;
    }
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      scan: scan.trim(),
      productName: productName.trim() || scan.trim(),
      specStr,
      weightStr,
      qty: n,
      customerCode: customerCode.trim(),
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim(),
      destination: destination.trim(),
      detailAddress: detailAddress.trim(),
      inboundDate,
      totalFee: totalFee.trim(),
      chargeBasis,
      chargeKg,
      payCod,
      payPrepaid,
      note: note.trim(),
    };
  };

  const clearPieceForNextScan = () => {
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
    setChargeBasis('weight');
    setChargeManual(false);
    setNote('');
    setLookupHint('');
    setStep(1);
  };

  const saveLooseOrder = async (order: HeldStockIn) => {
    const barcode = await generateUniqueInboundBarcode(order.destination, async (code) => !!(await getItemByBarcode(code)));
    const saved = await applyStockMovement({
      barcode,
      type: 'in',
      qty: order.qty,
      operator: operatorName ?? t.common.operator,
      note: noteForOrder(order),
      recipientName: order.recipientName,
      recipientPhone: order.recipientPhone,
      customerCode: order.customerCode,
      destination: order.destination,
      detailAddress: order.detailAddress,
      packaging,
      inputBarcode: order.scan,
      inboundAt: inboundDateToIso(order.inboundDate),
      originStore: store
        ? { id: store.id, storeCode: store.storeCode, storeName: store.storeName }
        : undefined,
      actingStore: store ?? undefined,
      createIfMissing: {
        name: order.productName || order.scan || barcode,
        spec: order.specStr,
        unit: `${order.qty} Pcs`,
        weight: order.weightStr,
      },
    });
    return saved.item;
  };

  const submit = async () => {
    if (loading) return;
    const order = readCurrentOrder();
    if (!order) return;
    setLoading(true);
    try {
      await saveStockInContactDraft({
        customerCode: order.customerCode.toUpperCase(),
        recipientName: order.recipientName,
        recipientPhone: order.recipientPhone,
        destination: order.destination,
        detailAddress: order.detailAddress,
        packaging,
      });
      const saved = await saveLooseOrder(order);
      setBarcodeModalData({
        productName: saved.name,
        barcode: saved.barcode,
        inputBarcode: order.scan || undefined,
        destination: order.destination,
        customerName: order.recipientName,
        kind: 'inbound',
      });
      resetWizard();
    } catch (e: unknown) {
      feedbackService.notify(t.common.fail, resolveAppError(t, e));
    } finally {
      setLoading(false);
    }
  };

  const holdAndScanNext = () => {
    const order = readCurrentOrder();
    if (!order) return;
    setHeldOrders((prev) => [...prev, order]);
    clearPieceForNextScan();
  };

  const packHeld = async () => {
    if (loading) return;
    const current = readCurrentOrder();
    if (!current) return;
    const orders = [...heldOrders, current];
    if (orders.length < 2) {
      feedbackService.notify(t.common.tip, t.stockIn.scanAnother);
      return;
    }
    if (!store) {
      feedbackService.notify(t.common.fail, t.common.loginStoreFirst);
      return;
    }
    setLoading(true);
    try {
      const packNo = await saveOrdersAsPack(orders);
      const names = orders.map((order) => order.productName || order.scan).filter(Boolean).slice(0, 3).join('、');
      await saveStockInContactDraft({
        customerCode: current.customerCode.toUpperCase(),
        recipientName: current.recipientName,
        recipientPhone: current.recipientPhone,
        destination: current.destination,
        detailAddress: current.detailAddress,
        packaging: '',
      });
      setBarcodeModalData({
        productName: names || packNo,
        barcode: packNo,
        destination: orders[0].destination,
        customerName: orders[0].recipientName,
        kind: 'pack',
      });
      resetWizard();
    } catch (e: unknown) {
      feedbackService.notify(t.common.fail, resolveAppError(t, e));
    } finally {
      setLoading(false);
    }
  };

  const saveOrdersAsPack = async (orders: HeldStockIn[]) => {
    if (!store || orders.length === 0) return '';
    const savedItems = [];
    for (const order of orders) {
      savedItems.push(await saveLooseOrder(order));
    }
    const originPrefix = normalizePackageOriginPrefix(store.storeCode || hubCode || 'PKG');
    const packNo = await generatePackageNumber(orders[0].destination, savedItems.length, originPrefix);
    const names = orders.map((order) => order.productName || order.scan).filter(Boolean).slice(0, 3).join('、');
    await createPackedShipment({
      operator: operatorName ?? t.common.operator,
      originStore: { id: store.id, storeCode: store.storeCode, storeName: store.storeName },
      itemLines: savedItems.map((item, index) => ({ itemId: item.id, qty: orders[index].qty })),
      bundle: {
        barcode: packNo,
        name: names || packNo,
        spec: '',
        unit: `${savedItems.length} Pcs`,
        weight: formatWeight({ n: sumPackageWeightsKg(orders.map((order) => order.weightStr)) }),
        note: '单个入库打包，费用在各单上，包装重量是各单实际重量',
      },
      actingStore: store,
    });
    return packNo;
  };

  const appendOrdersToPack = async (packBarcode: string, orders: HeldStockIn[]) => {
    for (const order of orders) {
      const item = await saveLooseOrder(order);
      await addStockedItemToPack({
        packBarcode,
        item,
        qty: order.qty,
        actingStore: store ?? undefined,
      });
    }
  };

  const persistFilledAndLeave = async () => {
    if (heldOrders.length === 0) {
      navigation.goBack();
      return;
    }
    if (!store) {
      feedbackService.notify(t.common.fail, t.common.loginStoreFirst);
      return;
    }
    setLoading(true);
    try {
      if (addToPackBarcode) await appendOrdersToPack(addToPackBarcode, heldOrders);
      else await saveOrdersAsPack(heldOrders);
      navigation.goBack();
    } catch (e: unknown) {
      feedbackService.notify(t.common.fail, resolveAppError(t, e));
    } finally {
      setLoading(false);
    }
  };

  const joinCurrentToPack = async () => {
    if (loading || !addToPackBarcode) return;
    const current = readCurrentOrder();
    if (!current || !store) {
      if (!store) feedbackService.notify(t.common.fail, t.common.loginStoreFirst);
      return;
    }
    setLoading(true);
    try {
      const pack = await getPackedShipmentByBarcode(addToPackBarcode);
      if (!pack) throw new Error(addToPackBarcode);
      await appendOrdersToPack(addToPackBarcode, [...heldOrders, current]);
      setBarcodeModalData({
        productName: pack.bundle_name,
        barcode: pack.bundle_barcode,
        destination: current.destination,
        customerName: current.recipientName,
        kind: 'pack',
      });
      resetWizard();
      navigation.setParams({ addToPackBarcode: undefined });
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
    <View style={styles.root}>
    <CollapsingHomeHeader title={t.nav.stockIn} onHome={requestLeave} scrollY={scrollY} />
    {addToPackBarcode ? (
      <Text style={styles.packTarget}>{fmt(t.stockIn.addingToPack, { barcode: addToPackBarcode })}</Text>
    ) : null}
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' && !Platform.isPad ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
      <InboundWizardHeader step={step} stepLabels={stepLabels} />
        {heldOrders.length > 0 ? (
          <View style={styles.heldBox}>
            <Text style={styles.heldTitle}>{fmt(t.stockIn.heldOrders, { count: heldOrders.length })}</Text>
            {heldOrders.map((order, index) => (
              <View key={order.id} style={styles.heldRow}>
                <Text style={styles.heldLine}>
                  {index + 1}. {order.scan || order.productName} · {order.weightStr || order.specStr}
                </Text>
                <Pressable
                  onPress={() => setHeldOrders((prev) => prev.filter((item) => item.id !== order.id))}
                  hitSlop={8}
                >
                  <Text style={styles.heldRemove}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
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
            packaging={packaging}
            chain={{
              code: step2Chain.propsFor('code'),
              name: step2Chain.propsFor('name'),
              phone: step2Chain.propsFor('phone'),
            }}
            onCustomerCodeChange={(v) => {
              setCustomerCode(v.toUpperCase());
              setCustomerLookupHint('');
              lookupCustomerCode(v);
            }}
            onCustomerCodeSubmit={() => void lookupCustomerCodeNow(customerCode)}
            onRecipientNameChange={setRecipientName}
            onRecipientPhoneChange={setRecipientPhone}
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
            chargeBasis={chargeBasis}
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
            chargeHint={chargeHint}
            onSpecChange={({ l, w, h }) => {
              setSpecL(l);
              setSpecW(w);
              setSpecH(h);
              setChargeManual(false);
            }}
            onWeightChange={(v) => {
              setWeightN(v);
              setTotalFeeManual(false);
              setChargeManual(false);
            }}
            onQtyChange={setQty}
            onChargeBasis={(basis) => {
              setChargeManual(true);
              setChargeBasis(basis);
              setTotalFeeManual(false);
            }}
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

      {step === 3 ? (
        <Pressable style={styles.scanAnother} onPress={holdAndScanNext} disabled={loading}>
          <Text style={styles.scanAnotherText}>{t.stockIn.scanAnother}</Text>
        </Pressable>
      ) : null}
      <InboundWizardFooter
        cancelLabel={step > 1 ? t.stockIn.previousPage : t.stockIn.cancel}
        primaryLabel={
          step === 3 && addToPackBarcode
            ? t.stockIn.addToThisPack
            : step === 3 && heldOrders.length > 0
              ? t.stockIn.packTogether
              : primaryLabel
        }
        loading={loading}
        onCancel={handleCancel}
        onPrimary={
          step === 3 && addToPackBarcode
            ? () => void joinCurrentToPack()
            : step === 3 && heldOrders.length > 0
              ? () => void packHeld()
              : primaryAction
        }
      />

      <OrderBarcodeModal
        visible={!!barcodeModalData}
        data={barcodeModalData}
        title={t.stockIn.barcodeModalTitle}
        cancelLabel={t.stockIn.cancel}
        onClose={() => setBarcodeModalData(null)}
      />
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xl },
  heldBox: {
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(8, 145, 178, 0.12)',
  },
  heldTitle: { color: '#a5f3fc', fontWeight: '800', marginBottom: 6 },
  heldLine: { color: '#e2e8f0', fontSize: 13, marginTop: 2, flex: 1 },
  heldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heldRemove: { color: '#fca5a5', fontSize: 20, fontWeight: '800' },
  packTarget: { color: '#67e8f9', fontWeight: '800', paddingHorizontal: 16, paddingTop: 8 },
  scanAnother: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0891b2',
    paddingVertical: 12,
    alignItems: 'center',
  },
  scanAnotherText: { color: '#67e8f9', fontWeight: '800' },
});
