import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
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
import OnlineRequiredBanner from '../components/OnlineRequiredBanner';
import ScanInputBar from '../components/ScanInputBar';
import OrderBarcodeModal, { type OrderBarcodeData } from '../components/OrderBarcodeModal';
import { DimensionSpecField, LockedSuffixField } from '../components/StructuredItemFields';
import { useAuth } from '../contexts/AuthContext';
import type { RootStackParamList } from '../navigation/AppNavigator';
import {
  generatePackageNumber,
  getItemByBarcode,
  getStockInPrefillByCode,
  submitPackagingStockIn,
} from '../services/inventoryService';
import { feedbackService } from '../services/FeedbackService';
import { generatePackagingStockInLineBarcodes } from '../utils/inboundBarcode';
import { normalizeScanCode, vibrateScanSuccess } from '../utils/barcodeScan';
import {
  formatSpec,
  formatWeight,
  parseWeight,
  sanitizeNumberInput,
} from '../utils/itemFieldFormat';
import { inboundBarcodeTimestampFromPackDate, inboundDateToIso, todayInMyanmar } from '../utils/stockInDate';
import { normalizePackDestination } from '../constants/destinationOptions';
import { resolveStoreHubCode } from '../utils/storeZone';
import {
  calculateCrossBorderTotalFee,
  fetchCrossBorderRoutePerKg,
  formatCrossBorderFeeHint,
} from '../utils/crossBorderPricing';
import { loadStockInContactDraft, saveStockInContactDraft } from '../utils/stockInDraft';
import { normalizePackageOriginPrefix } from '../utils/packageNumber';
import { fmt, resolveAppError, useTranslation } from '../i18n';
import {
  applyCrossBorderCustomerToForm,
  useCrossBorderCustomerLookup,
} from '../hooks/useCrossBorderCustomerLookup';

type Step = 1 | 2 | 3;

type PackagingScanLine = {
  id: string;
  code: string;
  count: number;
  productName: string;
  existingItemId?: string;
  existingBarcode?: string;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PackagingStockIn'>;
};

function newLineId(): string {
  return `ps-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyLine(code: string): PackagingScanLine {
  return {
    id: newLineId(),
    code: code.trim(),
    count: 1,
    productName: '',
  };
}

export default function PackagingStockInScreen({ navigation }: Props) {
  const { operatorName, store, hubCode } = useAuth();
  const { t, fmt } = useTranslation();
  const stepLabels: Record<Step, string> = {
    1: t.packagingStockIn.step1,
    2: t.packagingStockIn.step2,
    3: t.packagingStockIn.step3,
  };

  const [step, setStep] = useState<Step>(1);
  const [customerCode, setCustomerCode] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [customerLookupHint, setCustomerLookupHint] = useState('');
  const [packDate, setPackDate] = useState(todayInMyanmar());
  const [scanInput, setScanInput] = useState('');
  const [lines, setLines] = useState<PackagingScanLine[]>([]);
  const [batchDestination, setBatchDestination] = useState('');
  const [specL, setSpecL] = useState('');
  const [specW, setSpecW] = useState('');
  const [specH, setSpecH] = useState('');
  const [batchWeightN, setBatchWeightN] = useState('');
  const [totalFee, setTotalFee] = useState('');
  const [totalFeeManual, setTotalFeeManual] = useState(false);
  const [payCod, setPayCod] = useState(false);
  const [payPrepaid, setPayPrepaid] = useState(false);
  const [batchNote, setBatchNote] = useState('');
  const [feeFormulaHint, setFeeFormulaHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [barcodeModalData, setBarcodeModalData] = useState<OrderBarcodeData | null>(null);
  const [editLine, setEditLine] = useState<PackagingScanLine | null>(null);
  const [editCodeDraft, setEditCodeDraft] = useState('');

  const paymentSelected = payCod || payPrepaid;
  const totalPieceCount = useMemo(
    () => lines.reduce((sum, line) => sum + line.count, 0),
    [lines],
  );

  const specStr = useMemo(
    () => formatSpec({ l: specL, w: specW, h: specH }),
    [specL, specW, specH],
  );
  const batchWeightStr = useMemo(() => formatWeight({ n: batchWeightN }), [batchWeightN]);
  const batchWeightFilled = useMemo(() => {
    const trimmed = batchWeightN.trim();
    if (!trimmed) return false;
    const n = Number(trimmed);
    return Number.isFinite(n) && n > 0;
  }, [batchWeightN]);
  const canAutoTotalFee = batchDestination.trim() && batchWeightFilled && paymentSelected;
  const grandTotalFee = useMemo(() => {
    const fee = Number(totalFee);
    return Number.isFinite(fee) && fee > 0 ? Math.round(fee * 100) / 100 : 0;
  }, [totalFee]);

  const applyCustomerRegistry = useCallback(
    (match: Parameters<typeof applyCrossBorderCustomerToForm>[0]) => {
      applyCrossBorderCustomerToForm(match, {
        setRecipientName,
        setRecipientPhone,
        setDestination: (v) => setBatchDestination(normalizePackDestination(v)),
      });
      setCustomerLookupHint(
        fmt(t.stockIn.customerCodeMatched, { name: match.customer_name, phone: match.phone }),
      );
    },
    [t],
  );

  const { lookup: lookupCustomerCode, lookupNow: lookupCustomerCodeNow } =
    useCrossBorderCustomerLookup(applyCustomerRegistry);

  useEffect(() => {
    void loadStockInContactDraft().then((d) => {
      setCustomerCode(d.customerCode);
      setRecipientName(d.recipientName);
      setRecipientPhone(d.recipientPhone);
      setBatchDestination(normalizePackDestination(d.destination));
    });
  }, []);

  useEffect(() => {
    if (step !== 3 || totalFeeManual || !canAutoTotalFee) return;
    let cancelled = false;
    const originHub = hubCode ?? (store ? resolveStoreHubCode(store) : '');
    const dest = normalizePackDestination(batchDestination);
    const weightKg = Number(batchWeightN.trim()) || 0;
    void (async () => {
      const { perKg, originCode, destinationCode, usedLegacyFallback } =
        await fetchCrossBorderRoutePerKg(originHub, dest);
      if (cancelled) return;
      setFeeFormulaHint(
        formatCrossBorderFeeHint(
          originCode,
          destinationCode,
          perKg,
          weightKg,
          usedLegacyFallback,
        ),
      );
      setTotalFee(String(calculateCrossBorderTotalFee(perKg, batchWeightStr)));
    })();
    return () => {
      cancelled = true;
    };
  }, [
    step,
    batchDestination,
    batchWeightN,
    batchWeightStr,
    canAutoTotalFee,
    totalFeeManual,
    hubCode,
    store,
  ]);

  const addScanCode = async (raw: string) => {
    if (scanLoading || loading) return;
    const code = normalizeScanCode(raw);
    if (!code) return;
    setScanLoading(true);
    try {
      const existingIdx = lines.findIndex((l) => l.code.toUpperCase() === code);
      if (existingIdx >= 0) {
        vibrateScanSuccess();
        setLines((prev) =>
          prev.map((l, i) => (i === existingIdx ? { ...l, count: l.count + 1 } : l)),
        );
        setScanInput('');
        return;
      }

      const prefill = await getStockInPrefillByCode(code);
      let line = emptyLine(code);
      if (prefill) {
        line = {
          ...line,
          productName: prefill.productName || code,
          existingItemId: prefill.item.id,
          existingBarcode: prefill.item.barcode,
        };
        if (prefill.recipientName && !recipientName.trim()) setRecipientName(prefill.recipientName);
        if (prefill.recipientPhone && !recipientPhone.trim()) setRecipientPhone(prefill.recipientPhone);
        if (prefill.destination && !batchDestination.trim()) {
          setBatchDestination(normalizePackDestination(prefill.destination));
        }
        const prefillWeight = Number(parseWeight(prefill.weight).n);
        if (Number.isFinite(prefillWeight) && prefillWeight > 0) {
          setBatchWeightN((prev) => {
            const cur = Number(prev.trim()) || 0;
            return String(Math.round((cur + prefillWeight) * 100) / 100);
          });
        }
      }
      vibrateScanSuccess();
      setLines((prev) => [line, ...prev]);
      setScanInput('');
    } finally {
      setScanLoading(false);
    }
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const openEditLine = (line: PackagingScanLine) => {
    setEditLine(line);
    setEditCodeDraft(line.code);
  };

  const saveEditLine = () => {
    if (!editLine) return;
    const nextCode = normalizeScanCode(editCodeDraft);
    if (!nextCode) {
      feedbackService.notify(t.common.tip, t.packagingStockIn.alertScanCode);
      return;
    }
    setLines((prev) =>
      prev.map((l) =>
        l.id === editLine.id
          ? { ...l, code: nextCode }
          : l,
      ),
    );
    setEditLine(null);
    setEditCodeDraft('');
  };

  const resetWizard = () => {
    setStep(1);
    setScanInput('');
    setLines([]);
    setBatchDestination('');
    setSpecL('');
    setSpecW('');
    setSpecH('');
    setBatchWeightN('');
    setTotalFee('');
    setTotalFeeManual(false);
    setPayCod(false);
    setPayPrepaid(false);
    setBatchNote('');
    setFeeFormulaHint('');
    setPackDate(todayInMyanmar());
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
      if (!recipientName.trim()) {
        feedbackService.notify(t.common.tip, t.packagingStockIn.alertName);
        return;
      }
      if (!recipientPhone.trim()) {
        feedbackService.notify(t.common.tip, t.packagingStockIn.alertPhone);
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (lines.length === 0) {
        feedbackService.notify(t.common.tip, t.packagingStockIn.alertScanList);
        return;
      }
      setStep(3);
    }
  };

  /** 财务/Admin 只认中文业务标签；多语言 UI 文案勿写入 note */
  const buildLineNote = () => {
    const parts: string[] = [];
    if (grandTotalFee > 0) parts.push(`总费用 ${grandTotalFee} MMK`);
    if (payCod) parts.push('到付');
    if (payPrepaid) parts.push('预付');
    if (batchNote.trim()) parts.push(batchNote.trim());
    parts.push(`${t.packagingStockIn.packDateLabel} ${packDate}`);
    return parts.join(' · ');
  };

  const submit = async () => {
    if (loading) return;
    if (!batchDestination.trim()) {
      feedbackService.notify(t.common.tip, t.stockIn.alertDestination);
      return;
    }
    if (!paymentSelected) {
      feedbackService.notify(t.common.tip, t.stockIn.paymentRequired);
      return;
    }
    if (!batchWeightFilled) {
      feedbackService.notify(t.common.tip, t.packagingStockIn.alertBatchWeight);
      return;
    }

    setLoading(true);
    try {
      if (!store) throw new Error(t.common.loginStoreFirst);

      const dest = normalizePackDestination(batchDestination);
      const inboundAt = inboundDateToIso(packDate);
      const lineNote = buildLineNote();
      const barcodeAt = inboundBarcodeTimestampFromPackDate(packDate);
      const lineBarcodes = await generatePackagingStockInLineBarcodes(
        dest,
        lines.length,
        barcodeAt,
        async (code) => !!(await getItemByBarcode(code)),
      );
      const stockInLines = lines.map((line, index) => ({
        barcode: lineBarcodes[index],
        inputBarcode: line.code,
        name: line.productName.trim() || line.code,
        qty: line.count,
      }));

      const originPrefix = normalizePackageOriginPrefix(store.storeCode || hubCode || 'PKG');
      let packNo = '';
      let lastError: unknown;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        packNo = await generatePackageNumber(
          batchDestination.trim(),
          totalPieceCount,
          originPrefix,
        );
        try {
          const { bundleItem } = await submitPackagingStockIn({
            operator: operatorName ?? t.common.operator,
            store,
            destination: dest,
            recipientName: recipientName.trim(),
            recipientPhone: recipientPhone.trim(),
            customerCode: customerCode.trim(),
            inboundAt,
            lineNote,
            bundle: {
              barcode: packNo,
              name: fmt(t.packagingStockIn.packName, { name: recipientName.trim() }),
              spec: specStr,
              unit: `${totalPieceCount} Pcs`,
              weight: batchWeightStr,
              note: fmt(t.packagingStockIn.packNote, {
                fee: String(grandTotalFee),
                phone: recipientPhone.trim(),
              }),
            },
            lines: stockInLines,
          });

          await saveStockInContactDraft({
            customerCode: customerCode.trim().toUpperCase(),
            recipientName: recipientName.trim(),
            recipientPhone: recipientPhone.trim(),
            destination: batchDestination.trim(),
            detailAddress: '',
            packaging: '',
          });

          setBarcodeModalData({
            productName: bundleItem.name,
            barcode: packNo,
            destination: batchDestination.trim(),
            customerName: recipientName.trim(),
            kind: 'pack',
          });
          resetWizard();
          lastError = null;
          break;
        } catch (error: unknown) {
          lastError = error;
          const message = error instanceof Error ? error.message : String(error ?? '');
          if (!/package barcode taken/i.test(message)) throw error;
        }
      }
      if (lastError) throw lastError;
    } catch (e: unknown) {
      feedbackService.notify(t.common.fail, resolveAppError(t, e));
    } finally {
      setLoading(false);
    }
  };

  const primaryLabel =
    step === 3
      ? loading
        ? t.common.loading
        : t.packagingStockIn.submit
      : t.stockIn.next;
  const primaryAction = step === 3 ? () => void submit() : goNext;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t.packagingStockIn.title}</Text>
        <View style={styles.stepRow}>
          {([1, 2, 3] as Step[]).map((n) => (
            <View key={n} style={styles.stepItem}>
              <View style={[styles.stepDot, step >= n && styles.stepDotActive]}>
                <Text style={[styles.stepDotText, step >= n && styles.stepDotTextActive]}>{n}</Text>
              </View>
              <Text style={[styles.stepLabel, step === n && styles.stepLabelActive]}>
                {stepLabels[n]}
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
        <OnlineRequiredBanner />

        {step === 1 ? (
          <InboundFormSection title={t.packagingStockIn.customerSection} accent="#0891b2">
            <InboundFormField
              label={t.stockIn.customerCode}
              value={customerCode}
              onChange={(v) => {
                setCustomerCode(v.toUpperCase());
                setCustomerLookupHint('');
                lookupCustomerCode(v);
              }}
              placeholder={t.stockIn.customerCodePlaceholder}
              autoCapitalize="characters"
              onSubmitEditing={() => void lookupCustomerCodeNow(customerCode)}
            />
            {customerLookupHint ? (
              <Text style={styles.lookupHint}>{customerLookupHint}</Text>
            ) : (
              <Text style={styles.customerCodeHint}>{t.stockIn.customerCodeHint}</Text>
            )}
            <InboundFormField
              label={t.stockIn.nameRequired}
              value={recipientName}
              onChange={setRecipientName}
              placeholder={t.stockIn.nameRequired.replace(' *', '')}
            />
            <InboundFormField
              label={t.stockIn.phone}
              value={recipientPhone}
              onChange={setRecipientPhone}
              placeholder="09xxxxxxxxx"
              keyboard="phone-pad"
            />
            <InboundDateField
              label={t.packagingStockIn.packDateLabel}
              value={packDate}
              onChange={setPackDate}
              maximumDate={todayInMyanmar()}
            />
          </InboundFormSection>
        ) : null}

        {step === 2 ? (
          <InboundFormSection title={t.packagingStockIn.scanSection} accent="#3b82f6">
            <ScanInputBar
              value={scanInput}
              onChangeText={setScanInput}
              onSubmit={(code) => void addScanCode(code)}
              busy={scanLoading}
              cameraScan={{
                title: t.packagingStockIn.scanLabel,
                subtitle: t.trackExpress.cameraSubtitle,
              }}
              placeholder={t.packagingStockIn.scanPlaceholder}
            />
            <Text style={styles.scanHint}>{t.packagingStockIn.scanHint}</Text>
            {lines.length === 0 ? (
              <Text style={styles.emptyScan}>{t.packagingStockIn.scanEmpty}</Text>
            ) : (
              lines.map((line) => (
                <View key={line.id} style={styles.scanRow}>
                  <View style={styles.scanRowMain}>
                    <Text style={styles.scanCode} selectable>
                      {line.code}
                      {line.count > 1 ? (
                        <Text style={styles.scanCount}> ×{line.count}</Text>
                      ) : null}
                    </Text>
                    {line.productName !== line.code ? (
                      <Text style={styles.scanMeta} numberOfLines={1}>
                        {line.productName}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.scanActions}>
                    <Pressable style={styles.scanBtn} onPress={() => openEditLine(line)}>
                      <Text style={styles.scanBtnText}>{t.packagingStockIn.edit}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.scanBtn, styles.scanBtnDanger]}
                      onPress={() => removeLine(line.id)}
                    >
                      <Text style={[styles.scanBtnText, styles.scanBtnDangerText]}>
                        {t.packagingStockIn.delete}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
            {lines.length > 0 ? (
              <Text style={styles.scanSummary}>
                {fmt(t.packagingStockIn.scanSummary, {
                  lines: String(lines.length),
                  pieces: String(totalPieceCount),
                })}
              </Text>
            ) : null}
          </InboundFormSection>
        ) : null}

        {step === 3 ? (
          <>
            <InboundFormSection title={t.packagingStockIn.feeSection} accent="#059669">
              <Text style={styles.pieceSummary}>
                {fmt(t.packagingStockIn.grandTotalMeta, { count: String(totalPieceCount) })}
              </Text>
              <DestinationPickerField
                label={t.stockIn.finalDest}
                hint={t.stockOut.destinationHint}
                value={batchDestination}
                onChange={(v) => {
                  setBatchDestination(v);
                  setTotalFeeManual(false);
                }}
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
              />
              <LockedSuffixField
                label={t.packagingStockIn.batchWeightLabel}
                value={batchWeightN}
                suffix="Kg"
                onChange={(v) => {
                  setBatchWeightN(v);
                  setTotalFeeManual(false);
                }}
                placeholder="0"
              />
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>{t.stockIn.paymentRequired}</Text>
                <View style={styles.payChecks}>
                  <Pressable
                    style={[styles.payCheck, payCod && styles.payCheckOn]}
                    onPress={() => {
                      setPayCod(true);
                      setPayPrepaid(false);
                    }}
                  >
                    <Text style={[styles.payCheckText, payCod && styles.payCheckTextOn]}>
                      {t.stockIn.cod}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.payCheck, payPrepaid && styles.payCheckOn]}
                    onPress={() => {
                      setPayPrepaid(true);
                      setPayCod(false);
                    }}
                  >
                    <Text style={[styles.payCheckText, payPrepaid && styles.payCheckTextOn]}>
                      {t.stockIn.prepaid}
                    </Text>
                  </Pressable>
                </View>
              </View>
              <InboundFormField
                label={t.stockIn.totalFee}
                value={totalFee}
                onChange={(v) => {
                  setTotalFeeManual(true);
                  setTotalFee(sanitizeNumberInput(v));
                }}
                keyboard="decimal-pad"
                placeholder={t.manualEntry.amount}
              />
              {feeFormulaHint && canAutoTotalFee && !totalFeeManual ? (
                <Text style={styles.feeHint}>{feeFormulaHint}</Text>
              ) : null}
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>{t.packagingStockIn.grandTotal}</Text>
                <Text style={styles.grandTotalValue}>
                  {grandTotalFee.toLocaleString()} MMK
                </Text>
              </View>
              <InboundFormField
                label={t.stockIn.noteOptional}
                value={batchNote}
                onChange={setBatchNote}
                placeholder={t.manualEntry.notePlaceholder}
                multiline
              />
            </InboundFormSection>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.cancelBtn, loading && styles.nextBtnDisabled]}
          onPress={handleCancel}
          disabled={loading}
        >
          <Text style={styles.cancelBtnText}>{t.stockIn.cancel}</Text>
        </Pressable>
        <Pressable
          style={[styles.nextBtn, loading && styles.nextBtnDisabled]}
          onPress={primaryAction}
          disabled={loading}
        >
          <Text style={styles.nextBtnText}>{primaryLabel}</Text>
        </Pressable>
      </View>

      <Modal visible={!!editLine} transparent animationType="fade" onRequestClose={() => setEditLine(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditLine(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t.packagingStockIn.editCodeTitle}</Text>
            <TextInput
              style={styles.modalInput}
              value={editCodeDraft}
              onChangeText={setEditCodeDraft}
              autoCapitalize="characters"
              placeholder={t.packagingStockIn.scanPlaceholder}
              placeholderTextColor="#64748b"
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setEditLine(null)}>
                <Text style={styles.modalCancelText}>{t.common.cancel}</Text>
              </Pressable>
              <Pressable style={styles.modalSave} onPress={saveEditLine}>
                <Text style={styles.modalSaveText}>{t.common.save}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <OrderBarcodeModal
        visible={!!barcodeModalData}
        data={barcodeModalData}
        title={t.packagingStockIn.packNoModalTitle}
        cancelLabel={t.stockIn.cancel}
        onClose={() => setBarcodeModalData(null)}
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
  stepDotActive: { backgroundColor: '#f59e0b' },
  stepDotText: { color: '#94a3b8', fontWeight: '900', fontSize: 13 },
  stepDotTextActive: { color: '#fff' },
  stepLabel: { color: '#64748b', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  stepLabelActive: { color: '#fcd34d' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  scanHint: { color: '#94a3b8', fontSize: 12, marginTop: 8, lineHeight: 18 },
  lookupHint: { color: '#6ee7b7', fontSize: 13, marginTop: 8, fontWeight: '700' },
  customerCodeHint: { color: '#64748b', fontSize: 12, marginTop: 4, marginBottom: 4, lineHeight: 18 },
  emptyScan: { color: '#64748b', fontSize: 13, marginTop: 12, textAlign: 'center' },
  scanRow: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanRowMain: { flex: 1, minWidth: 0 },
  scanCode: { color: '#e2e8f0', fontSize: 14, fontWeight: '800', fontFamily: 'monospace' },
  scanCount: { color: '#fbbf24', fontWeight: '900' },
  scanMeta: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  scanActions: { flexDirection: 'row', gap: 6 },
  scanBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#475569',
  },
  scanBtnDanger: { borderColor: '#f87171' },
  scanBtnText: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
  scanBtnDangerText: { color: '#fca5a5' },
  scanSummary: { color: '#6ee7b7', fontSize: 12, fontWeight: '700', marginTop: 12 },
  pieceSummary: { color: '#cbd5e1', fontSize: 13, fontWeight: '800', marginBottom: 12 },
  payRow: { marginBottom: 12 },
  payLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  payChecks: { flexDirection: 'row', gap: 10 },
  payCheck: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
  },
  payCheckOn: { backgroundColor: '#059669', borderColor: '#10b981' },
  payCheckText: { color: '#94a3b8', fontWeight: '800' },
  payCheckTextOn: { color: '#fff' },
  feeHint: { color: '#64748b', fontSize: 11, marginBottom: 8 },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 8,
    marginBottom: 4,
  },
  grandTotalLabel: { color: '#f8fafc', fontSize: 16, fontWeight: '900' },
  grandTotalValue: { color: '#6ee7b7', fontSize: 22, fontWeight: '900' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#cbd5e1', fontWeight: '800' },
  nextBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.55 },
  nextBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.78)',
    justifyContent: 'center',
    padding: 24,
  },
  modalSheet: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '900', marginBottom: 12 },
  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'monospace',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
  },
  modalCancelText: { color: '#cbd5e1', fontWeight: '700' },
  modalSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
  },
  modalSaveText: { color: '#0f172a', fontWeight: '900' },
});
