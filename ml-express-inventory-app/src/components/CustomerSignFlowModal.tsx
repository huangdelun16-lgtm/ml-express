import React, { useEffect, useState } from 'react';
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
import { getItemDetail, markCustomerSigned } from '../services/inventoryService';
import type { InventoryItemDetail } from '../types/inventory';
import type {
  CustomerSignPickupType,
  CustomerSignReceiptInput,
  SignatureStroke,
} from '../types/customerSignReceipt';
import { validateCustomerSignReceipt } from '../types/customerSignReceipt';
import { svc } from '../errors/serviceError';
import { fmt, formatServiceError, useTranslation } from '../i18n';

export type CustomerSignFlowRequest = {
  itemIds: string[];
  operator: string;
  store: InventoryStoreSession;
};

type Props = {
  request: CustomerSignFlowRequest | null;
  onClose: () => void;
  onSuccess?: (detail: InventoryItemDetail, signedCount: number) => void;
  onError?: (message: string) => void;
  resolveError?: (error: unknown) => string;
};

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
  const batchCount = itemIds.length;
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<InventoryItemDetail | null>(null);
  const [formReady, setFormReady] = useState(false);
  const [signPhone, setSignPhone] = useState('');
  const [pickupType, setPickupType] = useState<CustomerSignPickupType>('self');
  const [proxyName, setProxyName] = useState('');
  const [signatureStrokes, setSignatureStrokes] = useState<SignatureStroke[]>([]);

  useEffect(() => {
    if (!visible || !request || itemIds.length === 0) {
      setDetail(null);
      setFormReady(false);
      setSignPhone('');
      setPickupType('self');
      setProxyName('');
      setSignatureStrokes([]);
      setLoading(false);
      setSubmitting(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFormReady(false);

    void (async () => {
      try {
        const details = await Promise.all(itemIds.map((id) => getItemDetail(id)));
        if (cancelled) return;
        const loaded = details.find(Boolean);
        if (!loaded) throw svc('orderNotFoundOrDeleted');
        setDetail(loaded);

        const codItems = details.filter((row) => row?.payment_label === '到付');
        if (codItems.length > 0) {
          const feeLines = codItems
            .map((row, index) => {
              const feeRaw = row?.total_fee?.trim();
              const feeLine = feeRaw ? `${feeRaw} MMK` : t.hubReceive.feeNotRegistered;
              return batchCount > 1
                ? fmt(t.sign.batchFeeLine, {
                    index: index + 1,
                    name: row?.name ?? t.sign.orderFallback,
                    fee: feeLine,
                  })
                : fmt(t.sign.totalFeeLine, { fee: feeLine });
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
  }, [visible, request, itemIds.join(','), batchCount, onClose, onError, resolveError, t]);

  const submit = async () => {
    if (!request || !detail || submitting || itemIds.length === 0) return;

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
      for (const id of itemIds) {
        await markCustomerSigned(id, request.operator, request.store, payload);
      }
      const refreshed = await getItemDetail(itemIds[0]);
      if (refreshed) onSuccess?.(refreshed, itemIds.length);
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
                  {batchCount > 1 ? (
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
                  ) : (
                    <Text style={styles.summaryMeta}>{t.sign.batchShareHint}</Text>
                  )}
                </View>
              ) : null}

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
  batchBadge: { color: '#6ee7b7', fontSize: 12, fontWeight: '800', marginBottom: 2 },
  summaryTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800' },
  summaryMeta: { color: '#94a3b8', fontSize: 13 },
  fieldLabel: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginTop: 4 },
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
