import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
        if (!loaded) throw new Error('订单不存在或已删除');
        setDetail(loaded);

        const codItems = details.filter((row) => row?.payment_label === '到付');
        if (codItems.length > 0) {
          const feeLines = codItems
            .map((row, index) => {
              const feeRaw = row?.total_fee?.trim();
              const feeLine = feeRaw ? `${feeRaw} MMK` : '未登记';
              const label =
                batchCount > 1
                  ? `${index + 1}. ${row?.name ?? '订单'} · ${feeLine}`
                  : `总费用：${feeLine}`;
              return label;
            })
            .join('\n');
          Alert.alert(
            '确认客户付款',
            `付款方式：到付\n${feeLines}\n\n客户是否已支付完毕？`,
            [
              { text: '取消', style: 'cancel', onPress: onClose },
              { text: '已收款，继续签收', onPress: () => setFormReady(true) },
            ],
          );
        } else {
          setFormReady(true);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          onError?.(resolveError?.(e) ?? (e instanceof Error ? e.message : '加载失败'));
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, request, itemIds.join(','), batchCount, onClose, onError, resolveError]);

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
      feedbackService.notify('请完善签收信息', validationError);
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
      onError?.(resolveError?.(e) ?? (e instanceof Error ? e.message : '签收失败'));
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
          <Text style={styles.title}>签收确认</Text>
          <Text style={styles.intro}>
            请登记签收人信息，便于送错包裹或丢失包裹时快速追溯原因。
          </Text>

          {loading || !formReady ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#38bdf8" size="large" />
              <Text style={styles.loadingText}>
                {loading ? '加载订单…' : '等待付款确认…'}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              {detail ? (
                <View style={styles.summaryBox}>
                  {batchCount > 1 ? (
                    <Text style={styles.batchBadge}>批量签收 · 共 {batchCount} 单</Text>
                  ) : null}
                  <Text style={styles.summaryTitle}>{detail.name}</Text>
                  <Text style={styles.summaryMeta}>客户：{customerName}</Text>
                  {batchCount === 1 ? (
                    <Text style={styles.summaryMeta}>入库码：{detail.barcode}</Text>
                  ) : (
                    <Text style={styles.summaryMeta}>同一客户的多件快递将共用本次签名</Text>
                  )}
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>签收方式</Text>
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
                    本人签收
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
                    代收
                  </Text>
                </Pressable>
              </View>

              {pickupType === 'proxy' ? (
                <>
                  <Text style={styles.fieldLabel}>代收人电话</Text>
                  <TextInput
                    style={styles.input}
                    value={signPhone}
                    onChangeText={setSignPhone}
                    keyboardType="phone-pad"
                    placeholder="请输入代收人联系电话"
                    placeholderTextColor="#64748b"
                  />
                  <Text style={styles.fieldLabel}>代收人姓名</Text>
                  <TextInput
                    style={styles.input}
                    value={proxyName}
                    onChangeText={setProxyName}
                    placeholder="请输入代收人姓名"
                    placeholderTextColor="#64748b"
                  />
                </>
              ) : (
                <Text style={styles.selfHint}>本人签收只需收件人签名，登记电话沿用订单收件人信息。</Text>
              )}

              <SignaturePad strokes={signatureStrokes} onChange={setSignatureStrokes} />
            </ScrollView>
          )}

          <View style={styles.footer}>
            <Pressable style={styles.btnCancel} onPress={onClose} disabled={submitting}>
              <Text style={styles.btnCancelText}>取消</Text>
            </Pressable>
            <Pressable
              style={[styles.btnConfirm, (!formReady || submitting) && styles.btnDisabled]}
              onPress={() => void submit()}
              disabled={!formReady || submitting}
            >
              <Text style={styles.btnConfirmText}>
                {submitting
                  ? '提交中…'
                  : batchCount > 1
                    ? `确认签收 ${batchCount} 单`
                    : '确认签收'}
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
