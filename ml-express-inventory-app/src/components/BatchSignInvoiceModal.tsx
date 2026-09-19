import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import Text from './AppText';
import { useTranslation } from '../i18n';
import { getItemDetails, listItems } from '../services/inventoryService';
import { feedbackService } from '../services/FeedbackService';
import type { InventoryStoreSession } from '../services/authService';
import type { InventoryItemListRow } from '../types/inventory';
import { resolvePackagingStockInSignIds } from '../utils/customerBatchSign';
import { formatMmkAmount } from '../utils/crossBorderFx';
import {
  buildBatchSignInvoice,
  formatInvoiceExpressNos,
  formatInvoiceWeight,
  type BatchSignInvoiceLine,
  type BatchSignInvoiceModel,
} from '../utils/batchSignInvoice';
import { persistInvoicePng, shareInvoicePng } from '../utils/saveInvoiceImage';

type Props = {
  visible: boolean;
  selectedItems: InventoryItemListRow[];
  knownItems: InventoryItemListRow[];
  store: InventoryStoreSession | null;
  hubCode?: string | null;
  onClose: () => void;
};

function feeLabel(mmk: number): string {
  return mmk > 0 ? `${formatMmkAmount(mmk)} MMK` : '—';
}

function InvoiceLineCard({
  line,
  kindLabel,
  expressLabel,
  weightLabel,
  feeText,
}: {
  line: BatchSignInvoiceLine;
  kindLabel: string;
  expressLabel: string;
  weightLabel: string;
  feeText: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.kind} myanmarWeight="bold">
        {kindLabel}
      </Text>
      <Text style={styles.meta}>
        {expressLabel}
        {'  '}
        {formatInvoiceExpressNos(line.expressNos)}
      </Text>
      <Text style={styles.meta}>
        {weightLabel}
        {'  '}
        {formatInvoiceWeight(line.weightKg) || '—'}
      </Text>
      <Text style={styles.meta}>
        {feeText}
        {'  '}
        {feeLabel(line.feeMmk)}
      </Text>
    </View>
  );
}

export default function BatchSignInvoiceModal({
  visible,
  selectedItems,
  knownItems,
  store,
  hubCode,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const shotRef = useRef<View>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [model, setModel] = useState<BatchSignInvoiceModel | null>(null);

  const customerName = useMemo(() => {
    const first = selectedItems[0];
    return first?.customer_name?.trim() || first?.recipient_name?.trim() || '';
  }, [selectedItems]);

  useEffect(() => {
    if (!visible || !store || selectedItems.length === 0) {
      setModel(null);
      setError('');
      setLoading(false);
      setSaving(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    void (async () => {
      try {
        const scope = hubCode ? { store, hubCode } : undefined;
        const expanded = await resolvePackagingStockInSignIds(
          knownItems,
          selectedItems,
          store,
          (keyword) => listItems(keyword, scope),
        );
        const details = await getItemDetails(expanded.map((item) => item.id));
        if (cancelled) return;
        setModel(buildBatchSignInvoice(details));
      } catch {
        if (!cancelled) {
          setModel(null);
          setError(t.invoice.batchLoadFailed);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, selectedItems, knownItems, store, hubCode, t.invoice.batchLoadFailed]);

  const handleSave = async () => {
    if (!model || saving) return;
    setSaving(true);
    try {
      const uri = await captureRef(shotRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      const result = await persistInvoicePng(uri);
      if (result === 'saved') {
        try {
          await shareInvoicePng(uri, t.invoice.batchSave);
        } catch {
          // 相册已保存，分享取消不视为失败
        }
      }
      feedbackService.notify(t.invoice.batchSaved);
    } catch (e) {
      feedbackService.notify(
        t.invoice.batchSaveFailed,
        e instanceof Error && e.message === 'permission'
          ? t.invoice.batchSaveNeedPermission
          : undefined,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#0369a1" size="large" />
              <Text style={styles.loadingText}>{t.invoice.loadingOrder}</Text>
            </View>
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : model ? (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              <View ref={shotRef} collapsable={false} style={styles.capture}>
                <Text style={styles.title} myanmarWeight="bold">
                  {t.invoice.batchTitle}
                </Text>
                {store?.storeName || customerName ? (
                  <Text style={styles.subtitle}>
                    {[store?.storeName, customerName].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}

                {model.lines.map((line, index) => (
                  <InvoiceLineCard
                    key={`${line.kind}-${line.expressNos.join('|')}-${index}`}
                    line={line}
                    kindLabel={
                      line.kind === 'packaging'
                        ? t.home.tilePackagingStockIn
                        : t.home.tileStockIn
                    }
                    expressLabel={
                      line.kind === 'packaging' ? t.invoice.orderNos : t.invoice.expressNo
                    }
                    weightLabel={
                      line.kind === 'packaging'
                        ? t.invoice.batchTotalWeight
                        : t.invoice.weight
                    }
                    feeText={t.invoice.fee}
                  />
                ))}

                <View style={styles.totals}>
                  <Text style={styles.totalLine} myanmarWeight="bold">
                    {t.invoice.batchTotalWeight}
                    {'  '}
                    {formatInvoiceWeight(model.totalWeightKg) || '—'}
                  </Text>
                  <Text style={styles.totalLine} myanmarWeight="bold">
                    {t.invoice.batchTotalFee}
                    {'  '}
                    {feeLabel(model.totalFeeMmk)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={[styles.saveBtn, (!model || saving) && styles.btnDisabled]}
              onPress={() => void handleSave()}
              disabled={!model || saving}
              accessibilityRole="button"
              accessibilityLabel={t.invoice.batchSave}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText} myanmarWeight="bold">
                  {t.invoice.batchSave}
                </Text>
              )}
            </Pressable>
            <Pressable
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t.invoice.close}
            >
              <Text style={styles.closeText}>{t.invoice.close}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.72)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: '82%',
    padding: 16,
  },
  capture: {
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  title: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: '#475569',
    fontSize: 13,
    marginTop: -4,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  loadingText: { color: '#64748b', fontSize: 13 },
  error: { color: '#b91c1c', fontSize: 13, paddingVertical: 16 },
  list: { maxHeight: 420 },
  listContent: { paddingBottom: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 6,
  },
  kind: { color: '#0369a1', fontSize: 13, fontWeight: '800' },
  meta: { color: '#334155', fontSize: 14, lineHeight: 22 },
  totals: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingTop: 12,
    gap: 8,
  },
  totalLine: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  actions: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  saveBtn: {
    backgroundColor: '#0369a1',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 88,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  closeBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#94a3b8',
  },
  closeText: { color: '#475569', fontWeight: '700' },
});
