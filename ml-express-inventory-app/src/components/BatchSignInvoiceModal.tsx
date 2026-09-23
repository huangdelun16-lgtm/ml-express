import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import Text from './AppText';
import { getPaymentLabelDisplay, useTranslation } from '../i18n';
import { getItemDetails, listItems } from '../services/inventoryService';
import { getPkgTrackingDetail } from '../services/trackingService';
import { feedbackService } from '../services/FeedbackService';
import type { InventoryStoreSession } from '../services/authService';
import type { InventoryItemDetail, InventoryItemListRow } from '../types/inventory';
import { resolvePackagingStockInSignIds } from '../utils/customerBatchSign';
import { formatMmkAmount } from '../utils/crossBorderFx';
import { parseWeightKg } from '../utils/itemFieldFormat';
import { yangonTodayYmd } from '../utils/yangonFinancePeriod';
import {
  buildBatchSignInvoice,
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

type InvoiceHeading = {
  customer: string;
  phone: string;
  destination: string;
  station: string;
  packBarcode: string;
  payment: string;
  dateLabel: string;
};

const WATERMARK_TOPS = [16, 72, 128, 184, 240, 296, 352, 408, 464, 520];

function feeLabel(mmk: number, freeLabel: string): string {
  if (!(mmk > 0)) return `0 MMK · ${freeLabel}`;
  return `${formatMmkAmount(mmk)} MMK`;
}

async function attachTrackedPackWeights(details: InventoryItemDetail[]): Promise<InventoryItemDetail[]> {
  const missing = new Set<string>();
  for (const row of details) {
    const code = row.packed_bundle_barcode?.trim().toUpperCase() || '';
    if (!code) continue;
    if (parseWeightKg(row.pack?.weight || row.weight || '') > 0) continue;
    missing.add(code);
  }
  const weights = new Map<string, string>();
  await Promise.all(
    [...missing].map(async (code) => {
      const pkg = await getPkgTrackingDetail(code).catch(() => null);
      const weight = pkg?.total_weight?.trim() || '';
      if (parseWeightKg(weight) > 0) weights.set(code, weight);
    }),
  );
  if (weights.size === 0) return details;
  return details.map((row) => {
    const code = row.packed_bundle_barcode?.trim().toUpperCase() || '';
    const tracked = code ? weights.get(code) : '';
    if (!tracked) return row;
    return { ...row, tracked_pack_weight: tracked };
  });
}

function headingFrom(
  details: InventoryItemDetail[],
  store: InventoryStoreSession | null,
  paymentLabel: (raw?: string | null) => string,
): InvoiceHeading {
  const first = details[0];
  return {
    customer: first?.customer_name?.trim() || first?.recipient_name?.trim() || '',
    phone: details.map((row) => row.recipient_phone?.trim()).find(Boolean) || '',
    destination: details.map((row) => row.final_destination?.trim()).find(Boolean) || '',
    station: store?.storeName?.trim() || store?.storeCode?.trim() || '',
    packBarcode: details.map((row) => row.packed_bundle_barcode?.trim()).find(Boolean) || '',
    payment: paymentLabel(details.map((row) => row.payment_label).find(Boolean)),
    dateLabel: yangonTodayYmd(),
  };
}

function OrderTable({
  line,
  orderLabel,
}: {
  line: BatchSignInvoiceLine;
  orderLabel: string;
}) {
  const nos = line.expressNos.length ? line.expressNos : ['—'];
  return (
    <View style={styles.table}>
      <Text style={styles.tableHead}>{orderLabel}</Text>
      {nos.map((no, index) => (
        <View key={`${no}-${index}`} style={styles.orderRow}>
          <Text style={styles.orderIndex}>{String(index + 1).padStart(2, '0')}</Text>
          <Text style={styles.orderNo}>{no}</Text>
        </View>
      ))}
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
  const { height: windowHeight } = useWindowDimensions();
  const shotRef = useRef<View>(null);
  const sheetMaxHeight = Math.round(windowHeight * 0.9);
  const listMaxHeight = Math.max(240, sheetMaxHeight - 88);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [model, setModel] = useState<BatchSignInvoiceModel | null>(null);
  const [heading, setHeading] = useState<InvoiceHeading | null>(null);

  const customerName = useMemo(() => {
    const first = selectedItems[0];
    return first?.customer_name?.trim() || first?.recipient_name?.trim() || '';
  }, [selectedItems]);

  useEffect(() => {
    if (!visible || !store || selectedItems.length === 0) {
      setModel(null);
      setHeading(null);
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
        const details = await attachTrackedPackWeights(
          await getItemDetails(expanded.map((item) => item.id)),
        );
        if (cancelled) return;
        setModel(buildBatchSignInvoice(details));
        setHeading(headingFrom(details, store, (raw) => getPaymentLabelDisplay(t, raw)));
      } catch {
        if (!cancelled) {
          setModel(null);
          setHeading(null);
          setError(t.invoice.batchLoadFailed);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, selectedItems, knownItems, store, hubCode, t]);

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

  const pieceCount = model?.lines.reduce((sum, line) => sum + Math.max(line.expressNos.length, 1), 0) ?? 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t.invoice.close} />
        <View style={[styles.sheet, { maxHeight: sheetMaxHeight }]}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#1c1917" size="large" />
              <Text style={styles.loadingText}>{t.invoice.loadingOrder}</Text>
            </View>
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : model && heading ? (
            <ScrollView
              style={[styles.list, { maxHeight: listMaxHeight }]}
              contentContainerStyle={styles.listContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              <View ref={shotRef} collapsable={false} style={styles.paper}>
                <View pointerEvents="none" style={styles.watermarkWrap}>
                  {WATERMARK_TOPS.map((top) => (
                    <Text key={top} numberOfLines={1} clipMyanmar style={[styles.watermark, { top }]}>
                      MARKET LINK
                    </Text>
                  ))}
                </View>

                <View style={styles.paperBody}>
                  <View style={styles.brandRow}>
                    <View>
                      <Text style={styles.brand} myanmarWeight="bold">
                        MARKET LINK
                      </Text>
                      <Text style={styles.brandSub}>EXPRESS</Text>
                    </View>
                    <Text style={styles.invoiceWord}>INVOICE</Text>
                  </View>
                  <View style={styles.rule} />
                  <View style={styles.ruleThin} />

                  <View style={styles.meta}>
                    <MetaRow label={t.invoice.customerName} value={heading.customer || customerName || '—'} />
                    {heading.phone ? <MetaRow label={t.invoice.phone} value={heading.phone} /> : null}
                    {heading.destination ? (
                      <MetaRow label={t.invoice.finalDest} value={heading.destination} />
                    ) : null}
                    {heading.station ? <MetaRow label={t.invoice.station} value={heading.station} /> : null}
                    {heading.packBarcode ? (
                      <MetaRow label={t.invoice.packNo} value={heading.packBarcode} />
                    ) : null}
                    <MetaRow label={t.invoice.pieceCount} value={String(pieceCount)} />
                    {heading.payment ? <MetaRow label={t.invoice.payment} value={heading.payment} /> : null}
                    <MetaRow label={t.invoice.issuedOn} value={heading.dateLabel} />
                  </View>

                  {model.lines.map((line, index) => (
                    <OrderTable
                      key={`${line.kind}-${index}`}
                      line={line}
                      orderLabel={line.kind === 'packaging' ? t.invoice.orderNos : t.invoice.expressNo}
                    />
                  ))}

                  <View style={styles.totals}>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>{t.invoice.batchTotalWeight}</Text>
                      <Text style={styles.totalValue}>{formatInvoiceWeight(model.totalWeightKg) || '—'}</Text>
                    </View>
                    <View style={styles.feeRow}>
                      <Text style={styles.feeLabel}>{t.invoice.batchTotalFee}</Text>
                      <Text style={styles.feeValue} myanmarWeight="bold">
                        {feeLabel(model.totalFeeMmk, t.invoice.freePromo)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.payNote}>{t.invoice.payNote}</Text>
                  <Text style={styles.footerBrand}>MARKET LINK EXPRESS</Text>
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
                <ActivityIndicator color="#f6f3ec" size="small" />
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
        </View>
      </View>
    </Modal>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(18, 16, 14, 0.72)',
    justifyContent: 'center',
    padding: 16,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    width: '100%',
    flexShrink: 1,
    padding: 12,
    overflow: 'hidden',
  },
  paper: {
    position: 'relative',
    backgroundColor: '#f6f3ec',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1c1917',
  },
  watermarkWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  watermark: {
    position: 'absolute',
    left: -24,
    right: -24,
    color: '#1c1917',
    opacity: 0.1,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.6,
    textAlign: 'center',
    transform: [{ rotate: '-18deg' }],
  },
  paperBody: {
    position: 'relative',
    zIndex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  brand: {
    color: '#1c1917',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  brandSub: {
    marginTop: 1,
    color: '#1c1917',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 4,
  },
  invoiceWord: {
    color: '#1c1917',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
  },
  rule: {
    marginTop: 12,
    height: 2,
    backgroundColor: '#1c1917',
  },
  ruleThin: {
    marginTop: 3,
    height: 1,
    backgroundColor: '#1c1917',
  },
  meta: {
    marginTop: 14,
    gap: 7,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  metaLabel: {
    color: '#57534e',
    fontSize: 12,
    fontWeight: '600',
  },
  metaValue: {
    flex: 1,
    color: '#1c1917',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  table: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1c1917',
  },
  tableHead: {
    paddingTop: 8,
    paddingBottom: 6,
    color: '#57534e',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#a8a29e',
  },
  orderIndex: {
    width: 24,
    color: '#78716c',
    fontSize: 12,
    fontWeight: '700',
  },
  orderNo: {
    flex: 1,
    color: '#1c1917',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  totals: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1c1917',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 10,
  },
  totalLabel: {
    color: '#44403c',
    fontSize: 13,
    fontWeight: '600',
  },
  totalValue: {
    color: '#1c1917',
    fontSize: 16,
    fontWeight: '700',
  },
  feeRow: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#1c1917',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    color: '#f6f3ec',
    fontSize: 13,
    fontWeight: '600',
  },
  feeValue: {
    color: '#f6f3ec',
    fontSize: 18,
    fontWeight: '800',
  },
  payNote: {
    marginTop: 14,
    textAlign: 'center',
    color: '#44403c',
    fontSize: 12,
    fontWeight: '600',
  },
  footerBrand: {
    marginTop: 4,
    textAlign: 'center',
    color: '#a8a29e',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
    backgroundColor: '#f6f3ec',
  },
  loadingText: { color: '#57534e', fontSize: 13 },
  error: { color: '#b91c1c', fontSize: 13, paddingVertical: 16 },
  list: {
    flexGrow: 0,
    flexShrink: 1,
    overflow: 'hidden',
  },
  listContent: { paddingBottom: 4 },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  saveBtn: {
    backgroundColor: '#1c1917',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 88,
    alignItems: 'center',
  },
  saveBtnText: { color: '#f6f3ec', fontWeight: '800', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    backgroundColor: '#f6f3ec',
  },
  closeText: { color: '#1c1917', fontWeight: '700' },
});
