import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Text from './AppText';
import SignaturePad from './SignaturePad';
import type { InventoryStoreSession } from '../services/authService';
import { feedbackService } from '../services/FeedbackService';
import { getItemDetail, getItemDetails, markCustomerSigned } from '../services/inventoryService';
import type { InventoryItemDetail } from '../types/inventory';
import type {
  CustomerSignPickupType,
  CustomerSignReceiptInput,
  SignatureStroke,
} from '../types/customerSignReceipt';
import { validateCustomerSignReceipt } from '../types/customerSignReceipt';
import { svc } from '../errors/serviceError';
import { fmt, formatServiceError, useTranslation } from '../i18n';
import { fetchCrossBorderFxRate, formatCnyAmount, formatMmkAmount, mmkToCny } from '../utils/crossBorderFx';
import {
  buildCodAlertFeeGroups,
  fxLockFeeMmkForItem,
  packagingStockInSignBatch,
  uniqueSignFeeMmk,
} from '../utils/customerBatchSign';
import {
  buildSignFxLock,
  parseFeeMmk,
  type CrossBorderPaidCurrency,
} from '../utils/crossBorderFxLock';

export type CustomerSignFlowRequest = {
  itemIds: string[];
  operator: string;
  store: InventoryStoreSession;
  /** 调用方已拉到的活汇率，拉取失败时作兜底 */
  liveRate?: number | null;
};

type Props = {
  request: CustomerSignFlowRequest | null;
  onClose: () => void;
  onSuccess?: (detail: InventoryItemDetail, signedCount: number) => void;
  onError?: (message: string) => void;
  resolveError?: (error: unknown) => string;
};

function feeLineText(
  feeRaw: string | undefined,
  mmkPerCny: number | null,
  missingLabel: string,
): string {
  const feeMmk = parseFeeMmk(feeRaw);
  if (feeMmk <= 0) return missingLabel;
  const cny = mmkToCny(feeMmk, mmkPerCny);
  const mmkText = `${formatMmkAmount(feeMmk)} MMK`;
  return cny != null ? `${mmkText} · ¥${formatCnyAmount(cny)}` : mmkText;
}

export default function CustomerSignFlowModal({
  request,
  onClose,
  onSuccess,
  onError,
  resolveError,
}: Props) {
  const { t } = useTranslation();
  const visible = request != null;
  const itemIds = request?.itemIds ?? [];
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<InventoryItemDetail | null>(null);
  const [details, setDetails] = useState<InventoryItemDetail[]>([]);
  const batchCount = details.length > 0 ? details.length : itemIds.length;
  const [formReady, setFormReady] = useState(false);
  const [signPhone, setSignPhone] = useState('');
  const [pickupType, setPickupType] = useState<CustomerSignPickupType>('self');
  const [proxyName, setProxyName] = useState('');
  const [signatureStrokes, setSignatureStrokes] = useState<SignatureStroke[]>([]);
  const [payCurrency, setPayCurrency] = useState<CrossBorderPaidCurrency>('MMK');
  const [mmkPerCny, setMmkPerCny] = useState<number | null>(null);
  const [rateBusy, setRateBusy] = useState(false);

  useEffect(() => {
    if (!visible || !request || itemIds.length === 0) {
      setDetail(null);
      setDetails([]);
      setFormReady(false);
      setSignPhone('');
      setPickupType('self');
      setProxyName('');
      setSignatureStrokes([]);
      setPayCurrency('MMK');
      setMmkPerCny(null);
      setRateBusy(false);
      setLoading(false);
      setSubmitting(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFormReady(false);

    void (async () => {
      try {
        const [loadedDetails, rate] = await Promise.all([
          getItemDetails(itemIds),
          fetchCrossBorderFxRate(),
        ]);
        if (cancelled) return;
        const loaded = loadedDetails[0];
        if (!loaded) throw svc('orderNotFoundOrDeleted');
        // 只签收加载成功的行，避免漏载兄弟件时用第一件的费用去锁汇/提交
        setDetail(loaded);
        setDetails(loadedDetails);
        const resolvedRate = rate ?? request.liveRate ?? null;
        setMmkPerCny(resolvedRate);
        setPayCurrency('MMK');

        const codGroups = buildCodAlertFeeGroups(loadedDetails);
        if (codGroups.length > 0) {
          const feeLines = codGroups
            .flatMap((group, index) => {
              if (group.kind === 'packaging') {
                const feeLine = feeLineText(
                  String(group.fee),
                  resolvedRate,
                  t.hubReceive.feeNotRegistered,
                );
                return [
                  fmt(t.sign.packagingBatchFeeLine, { count: group.count, fee: feeLine }),
                  ...group.barcodes.map((barcode, siblingIndex) =>
                    fmt(t.sign.packagingSiblingLine, {
                      index: siblingIndex + 1,
                      barcode,
                    }),
                  ),
                ];
              }
              const feeLine = feeLineText(
                String(group.fee),
                resolvedRate,
                t.hubReceive.feeNotRegistered,
              );
              return batchCount > 1
                ? [
                    fmt(t.sign.batchFeeLine, {
                      index: index + 1,
                      name: group.name || t.sign.orderFallback,
                      fee: feeLine,
                    }),
                  ]
                : [fmt(t.sign.totalFeeLine, { fee: feeLine })];
            })
            .join('\n');
          Alert.alert(
            t.sign.codAlertTitle,
            fmt(t.sign.codAlertBody, { feeLines }),
            [
              { text: t.common.cancel, style: 'cancel', onPress: onClose },
              { text: t.sign.codPaidContinue, onPress: () => setFormReady(true) },
            ],
          );
        } else {
          setFormReady(true);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          onError?.(resolveError?.(e) ?? (e instanceof Error ? e.message : t.sign.loadFailed));
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, request, itemIds.join(','), onClose, onError, resolveError, t]);

  const hasCod = details.some((row) => row.payment_label === '到付');
  const hasPrepaid = details.some((row) => row.payment_label === '预付');
  const packagingBatch = useMemo(() => packagingStockInSignBatch(details), [details]);
  const feeMmk = useMemo(() => uniqueSignFeeMmk(details), [details]);
  const collectCny = mmkToCny(feeMmk, mmkPerCny);

  const selectPayCurrency = async (currency: CrossBorderPaidCurrency) => {
    if (currency === 'MMK') {
      setPayCurrency('MMK');
      return;
    }
    let rate = mmkPerCny;
    if (rate == null || rate <= 0) {
      setRateBusy(true);
      try {
        rate = await fetchCrossBorderFxRate({ force: true });
        if (rate == null && request?.liveRate != null && request.liveRate > 0) {
          rate = request.liveRate;
        }
        setMmkPerCny(rate);
      } finally {
        setRateBusy(false);
      }
    }
    if (rate == null || rate <= 0) {
      feedbackService.notify(t.sign.needComplete, t.sign.cnyNeedsRate);
      return;
    }
    setPayCurrency('CNY');
  };

  const submit = async () => {
    if (!request || !detail || submitting || itemIds.length === 0) return;

    if (payCurrency === 'CNY' && (mmkPerCny == null || mmkPerCny <= 0)) {
      feedbackService.notify(t.sign.needComplete, t.sign.cnyNeedsRate);
      return;
    }

    const payload: CustomerSignReceiptInput = {
      signPhone:
        pickupType === 'proxy'
          ? signPhone.trim()
          : detail.recipient_phone?.trim() || '',
      pickupType,
      proxyName: pickupType === 'proxy' ? proxyName : '',
      signatureStrokes,
    };
    const validationError = validateCustomerSignReceipt(payload);
    if (validationError) {
      feedbackService.notify(t.sign.needComplete, formatServiceError(t, validationError));
      return;
    }

    setSubmitting(true);
    try {
      const signIds = details.map((row) => row.id);
      for (const id of signIds) {
        const row = details.find((item) => item.id === id) ?? detail;
        const lock = buildSignFxLock({
          feeMmk: fxLockFeeMmkForItem(row, details),
          currency: payCurrency,
          mmkPerCny,
        });
        await markCustomerSigned(id, request.operator, request.store, {
          ...payload,
          fxLock: lock ?? undefined,
        });
      }
      const refreshed = await getItemDetail(signIds[0]);
      if (refreshed) onSuccess?.(refreshed, signIds.length);
      onClose();
    } catch (e: unknown) {
      onError?.(resolveError?.(e) ?? (e instanceof Error ? e.message : t.sign.signFailed));
    } finally {
      setSubmitting(false);
    }
  };

  const customerName =
    detail?.customer_name?.trim() || detail?.recipient_name?.trim() || '—';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t.sign.title}</Text>
          <Text style={styles.intro}>{t.sign.intro}</Text>

          {loading || !formReady ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#38bdf8" size="large" />
              <Text style={styles.loadingText}>
                {loading ? t.sign.loadingOrder : t.sign.waitingPayment}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              {detail ? (
                <View style={styles.summaryBox}>
                  {packagingBatch && batchCount > 1 ? (
                    <Text style={styles.batchBadge}>
                      {fmt(t.sign.packagingBatchBadge, { count: batchCount })}
                    </Text>
                  ) : batchCount > 1 ? (
                    <Text style={styles.batchBadge}>
                      {fmt(t.sign.batchBadge, { count: batchCount })}
                    </Text>
                  ) : null}
                  <Text style={styles.summaryTitle}>{detail.name}</Text>
                  <Text style={styles.summaryMeta}>
                    {fmt(t.sign.customerLine, { name: customerName })}
                  </Text>
                  {batchCount === 1 ? (
                    <Text style={styles.summaryMeta}>
                      {fmt(t.sign.inboundCodeLine, { barcode: detail.barcode })}
                    </Text>
                  ) : packagingBatch ? (
                    <>
                      {details.map((row) => (
                        <Text key={row.id} style={styles.siblingLine}>
                          {row.barcode}
                        </Text>
                      ))}
                      <Text style={styles.summaryMeta}>{t.sign.packagingBatchShareHint}</Text>
                      {packagingBatch.count < packagingBatch.declaredTotal ? (
                        <Text style={styles.summaryMeta}>
                          {fmt(t.sign.packagingBatchIncomplete, {
                            count: packagingBatch.count,
                            total: packagingBatch.declaredTotal,
                          })}
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <Text style={styles.summaryMeta}>{t.sign.batchShareHint}</Text>
                  )}
                </View>
              ) : null}

              <View style={styles.payBox}>
                <Text style={styles.fieldLabel}>{t.sign.payCurrency}</Text>
                <View style={styles.choiceRow}>
                  <Pressable
                    style={[styles.choiceBtn, payCurrency === 'MMK' && styles.choiceBtnActive]}
                    onPress={() => void selectPayCurrency('MMK')}
                  >
                    <Text
                      style={[
                        styles.choiceBtnText,
                        payCurrency === 'MMK' && styles.choiceBtnTextActive,
                      ]}
                    >
                      {t.sign.payMmk}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.choiceBtn,
                      payCurrency === 'CNY' && styles.choiceBtnActive,
                      mmkPerCny == null && !rateBusy && styles.choiceBtnMuted,
                    ]}
                    onPress={() => void selectPayCurrency('CNY')}
                    disabled={rateBusy}
                  >
                    <Text
                      style={[
                        styles.choiceBtnText,
                        payCurrency === 'CNY' && styles.choiceBtnTextActive,
                      ]}
                    >
                      {rateBusy ? t.sign.loadingRate : t.sign.payCny}
                    </Text>
                  </Pressable>
                </View>

                {feeMmk > 0 ? (
                  <Text style={styles.payAmount}>
                    {payCurrency === 'CNY' && collectCny != null
                      ? fmt(t.sign.collectCny, { amount: formatCnyAmount(collectCny) })
                      : fmt(t.sign.collectMmk, { amount: formatMmkAmount(feeMmk) })}
                  </Text>
                ) : null}

                {mmkPerCny != null ? (
                  <>
                    <Text style={styles.payMeta}>
                      {fmt(t.sign.rateLine, { rate: formatMmkAmount(mmkPerCny) })}
                    </Text>
                    <Text style={styles.payHint}>{t.sign.fxLockedHint}</Text>
                  </>
                ) : (
                  <Text style={styles.payHint}>{t.sign.noRateHint}</Text>
                )}

                {hasPrepaid ? (
                  <Text style={styles.payHint}>
                    {hasCod ? t.sign.prepaidMixedHint : t.sign.prepaidLockHint}
                  </Text>
                ) : null}
              </View>

              <Text style={styles.fieldLabel}>{t.sign.pickupMethod}</Text>
              <View style={styles.choiceRow}>
                <Pressable
                  style={[styles.choiceBtn, pickupType === 'self' && styles.choiceBtnActive]}
                  onPress={() => {
                    setPickupType('self');
                    setSignPhone('');
                    setProxyName('');
                  }}
                >
                  <Text
                    style={[
                      styles.choiceBtnText,
                      pickupType === 'self' && styles.choiceBtnTextActive,
                    ]}
                  >
                    {t.sign.pickupSelf}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.choiceBtn, pickupType === 'proxy' && styles.choiceBtnActive]}
                  onPress={() => setPickupType('proxy')}
                >
                  <Text
                    style={[
                      styles.choiceBtnText,
                      pickupType === 'proxy' && styles.choiceBtnTextActive,
                    ]}
                  >
                    {t.sign.pickupProxy}
                  </Text>
                </Pressable>
              </View>

              {pickupType === 'proxy' ? (
                <>
                  <Text style={styles.fieldLabel}>{t.sign.proxyPhone}</Text>
                  <TextInput
                    style={styles.input}
                    value={signPhone}
                    onChangeText={setSignPhone}
                    keyboardType="phone-pad"
                    placeholder={t.sign.proxyPhonePlaceholder}
                    placeholderTextColor="#64748b"
                  />
                  <Text style={styles.fieldLabel}>{t.sign.proxyName}</Text>
                  <TextInput
                    style={styles.input}
                    value={proxyName}
                    onChangeText={setProxyName}
                    placeholder={t.sign.proxyNamePlaceholder}
                    placeholderTextColor="#64748b"
                  />
                </>
              ) : (
                <Text style={styles.selfHint}>{t.sign.selfHint}</Text>
              )}

              <SignaturePad strokes={signatureStrokes} onChange={setSignatureStrokes} />
            </ScrollView>
          )}

          <View style={styles.footer}>
            <Pressable style={styles.btnCancel} onPress={onClose} disabled={submitting}>
              <Text style={styles.btnCancelText}>{t.common.cancel}</Text>
            </Pressable>
            <Pressable
              style={[styles.btnConfirm, (!formReady || submitting) && styles.btnDisabled]}
              onPress={() => void submit()}
              disabled={!formReady || submitting}
            >
              <Text style={styles.btnConfirmText}>
                {submitting
                  ? t.sign.submitting
                  : batchCount > 1
                    ? fmt(t.sign.confirmSignCount, { count: batchCount })
                    : t.sign.confirmSign}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '900' },
  intro: { color: '#94a3b8', fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 12 },
  loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  form: { paddingBottom: 12, gap: 10 },
  summaryBox: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 4,
  },
  payBox: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 8,
  },
  batchBadge: { color: '#6ee7b7', fontSize: 12, fontWeight: '800', marginBottom: 2 },
  summaryTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800' },
  summaryMeta: { color: '#94a3b8', fontSize: 13 },
  siblingLine: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
  fieldLabel: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginTop: 4 },
  payAmount: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  payMeta: { color: '#7dd3fc', fontSize: 13, fontWeight: '700' },
  payHint: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
  input: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 15,
  },
  choiceRow: { flexDirection: 'row', gap: 10 },
  choiceBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  choiceBtnActive: { borderColor: '#38bdf8', backgroundColor: '#172554' },
  choiceBtnMuted: { opacity: 0.72 },
  choiceBtnText: { color: '#94a3b8', fontSize: 14, fontWeight: '700' },
  choiceBtnTextActive: { color: '#bae6fd' },
  selfHint: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 2 },
  footer: { flexDirection: 'row', gap: 10, paddingTop: 10 },
  btnCancel: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnCancelText: { color: '#cbd5e1', fontSize: 15, fontWeight: '700' },
  btnConfirm: {
    flex: 1.2,
    borderRadius: 12,
    backgroundColor: '#059669',
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnConfirmText: { color: '#ecfdf5', fontSize: 15, fontWeight: '800' },
  btnDisabled: { opacity: 0.65 },
});
