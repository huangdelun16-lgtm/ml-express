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
import { fetchCrossBorderFxRate, formatCnyAmount, formatMmkAmount } from '../utils/crossBorderFx';
import { fetchCrossBorderRoutePerKg } from '../utils/crossBorderPricing';
import { parseWeightKg } from '../utils/itemFieldFormat';
import { yangonTodayYmd } from '../utils/yangonFinancePeriod';
import {
  buildBatchSignInvoice,
  applyLockedUnitTotals,
  formatInvoiceUnitRateLines,
  formatInvoiceWeight,
  resolveInvoiceLineUnitCny,
  type BatchSignInvoiceLine,
  type BatchSignInvoiceModel,
} from '../utils/batchSignInvoice';
import {
  buildFrozenSignedInvoiceDocument,
  invoiceLineMeasure,
  type FrozenInvoiceHandoff,
} from '../utils/frozenSignedInvoice';
import { persistInvoicePng, shareInvoicePng } from '../utils/saveInvoiceImage';

type Props = {
  visible: boolean;
  selectedItems: InventoryItemListRow[];
  knownItems: InventoryItemListRow[];
  store: InventoryStoreSession | null;
  hubCode?: string | null;
  onClose: () => void;
  onContinue?: (handoff: FrozenInvoiceHandoff) => void;
  continueLabel?: string;
};

type InvoiceHeading = {
  customer: string;
  phone: string;
  destination: string;
  station: string;
  packBarcode: string;
  trip: string;
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

async function loadPackTrips(
  details: InventoryItemDetail[],
): Promise<{ trips: string[]; incomplete: boolean }> {
  const codes = Array.from(
    new Set(
      details
        .map((row) => row.packed_bundle_barcode?.trim().toUpperCase() || '')
        .filter((code) => code.length > 0),
    ),
  );
  const byPack = new Map<string, string>();
  await Promise.all(
    codes.map(async (code) => {
      const pkg = await getPkgTrackingDetail(code).catch(() => null);
      const trip = pkg?.trip_number?.trim().toUpperCase() || '';
      if (trip) byPack.set(code, trip);
    }),
  );
  const seen = new Set<string>();
  const trips: string[] = [];
  for (const trip of Array.from(byPack.values())) {
    if (!trip || seen.has(trip)) continue;
    seen.add(trip);
    trips.push(trip);
  }
  const incomplete = details.some((row) => {
    const code = row.packed_bundle_barcode?.trim().toUpperCase() || '';
    return !code || !byPack.get(code);
  });
  return { trips, incomplete };
}

function headingFrom(
  details: InventoryItemDetail[],
  store: InventoryStoreSession | null,
  paymentLabel: (raw?: string | null) => string,
  trips: string[],
  tripIncomplete: boolean,
  notLoadedLabel: string,
): InvoiceHeading {
  const first = details[0];
  const destination = details.map((row) => row.final_destination?.trim()).find(Boolean) || '';
  const dateLabel = yangonTodayYmd();
  const trip = trips.length
    ? tripIncomplete
      ? `${trips.join(' · ')} · ${notLoadedLabel}`
      : trips.join(' · ')
    : '';
  return {
    customer: first?.customer_name?.trim() || first?.recipient_name?.trim() || '',
    phone: details.map((row) => row.recipient_phone?.trim()).find(Boolean) || '',
    destination,
    station: store?.storeName?.trim() || store?.storeCode?.trim() || '',
    packBarcode: details.map((row) => row.packed_bundle_barcode?.trim()).find(Boolean) || '',
    trip,
    payment: paymentLabel(details.map((row) => row.payment_label).find(Boolean)),
    dateLabel,
  };
}

function OrderTable({
  line,
  orderLabel,
}: {
  line: BatchSignInvoiceLine;
  orderLabel: string;
}) {
  const { t } = useTranslation();
  const nos = line.expressNos.length ? line.expressNos : ['—'];
  const weightLabel = invoiceLineMeasure(line, {
    lineMeasure: t.invoice.lineMeasure,
    lineWeight: t.invoice.lineWeight,
    packMeasure: t.invoice.packMeasure,
    packWeight: t.invoice.packWeight,
  });
  return (
    <View style={styles.table}>
      <Text style={styles.tableHead}>{orderLabel}</Text>
      {nos.map((no, index) => (
        <View key={`${no}-${index}`} style={styles.orderRow}>
          <Text style={styles.orderIndex}>{String(index + 1).padStart(2, '0')}</Text>
          <Text style={styles.orderNo}>{no}</Text>
        </View>
      ))}
      {weightLabel ? <Text style={styles.packWeight}>{weightLabel}</Text> : null}
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
  onContinue,
  continueLabel,
}: Props) {
  const { t, fmt } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const shotRef = useRef<View>(null);
  const sheetMaxHeight = Math.round(windowHeight * 0.9);
  const listMaxHeight = Math.max(240, sheetMaxHeight - 88);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [model, setModel] = useState<BatchSignInvoiceModel | null>(null);
  const [unitRates, setUnitRates] = useState<string[]>([]);
  const [heading, setHeading] = useState<InvoiceHeading | null>(null);
  const [signedItemIds, setSignedItemIds] = useState<string[]>([]);

  const customerName = useMemo(() => {
    const first = selectedItems[0];
    return first?.customer_name?.trim() || first?.recipient_name?.trim() || '';
  }, [selectedItems]);

  useEffect(() => {
    if (!visible || !store || selectedItems.length === 0) {
      setModel(null);
      setUnitRates([]);
      setHeading(null);
      setSignedItemIds([]);
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
        const packTrips = await loadPackTrips(details);
        const rate = await fetchCrossBorderFxRate({ force: true });
        if (cancelled) return;
        const built = buildBatchSignInvoice(details, rate);
        if (built.missingRate) {
          setModel(null);
          setUnitRates([]);
          setHeading(null);
          setSignedItemIds([]);
          setError(t.invoice.rateRequired);
          return;
        }
        const lineCny = await resolveInvoiceLineUnitCny(built.lines, built.rate, async (route) => {
          const found = await fetchCrossBorderRoutePerKg(
            route.originCode,
            route.destinationCode,
            route.customerCode,
          );
          return {
            perKgMmk: found.perKg,
            mmkPerCny: found.mmkPerCny,
            fromRouteMatrix: found.fromCloud && !found.usedLegacyFallback,
            cnyPerKg: found.cnyPerKg,
          };
        }).catch(() => built.lines.map(() => null));
        if (cancelled) return;
        const priced = applyLockedUnitTotals(built, lineCny);
        setUnitRates(
          formatInvoiceUnitRateLines(lineCny.filter((cny): cny is number => cny != null && cny >= 0)),
        );
        setModel({
          ...priced,
          lines: priced.lines.map((line, index) => ({ ...line, cnyPerKg: lineCny[index] ?? null })),
        });
        setSignedItemIds(details.map((row) => row.id));
        setHeading(
          headingFrom(
            details,
            store,
            (raw) => getPaymentLabelDisplay(t, raw),
            packTrips.trips,
            packTrips.incomplete,
            t.invoice.notLoaded,
          ),
        );
      } catch {
        if (!cancelled) {
          setModel(null);
          setHeading(null);
          setSignedItemIds([]);
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

  const continueSign = () => {
    if (!model || !heading || !onContinue || signedItemIds.length === 0) return;
    const measureTemplates = {
      lineMeasure: t.invoice.lineMeasure,
      lineWeight: t.invoice.lineWeight,
      packMeasure: t.invoice.packMeasure,
      packWeight: t.invoice.packWeight,
    };
    onContinue({
      itemIds: signedItemIds,
      document: buildFrozenSignedInvoiceDocument({
        customerName: heading.customer || customerName,
        phone: heading.phone,
        destination: heading.destination,
        station: heading.station,
        trip: heading.trip,
        notLoadedLabel: t.invoice.notLoaded,
        packNo: heading.packBarcode,
        pieceCount,
        payment: heading.payment,
        issuedOn: heading.dateLabel,
        labels: {
          customer: t.invoice.customerName,
          phone: t.invoice.phone,
          destination: t.invoice.finalDest,
          station: t.invoice.station,
          trip: t.invoice.trip,
          packNo: t.invoice.packNo,
          pieces: t.invoice.pieceCount,
          payment: t.invoice.payment,
          date: t.invoice.issuedOn,
          totalWeight: t.invoice.batchTotalWeight,
          totalFee: t.invoice.batchTotalFee,
          waybill: t.invoice.expressNo,
          orderNos: t.invoice.orderNos,
        },
        lines: model.lines.map((line) => ({
          kind: line.kind,
          expressNos: line.expressNos,
          weightKg: line.weightKg,
          cnyPerKg: line.cnyPerKg,
          title: line.kind === 'packaging' ? t.invoice.orderNos : t.invoice.expressNo,
        })),
        measureTemplates,
        totalWeight: formatInvoiceWeight(model.totalWeightKg),
        totalQuote:
          model.totalFeeCny != null
            ? fmt(t.invoice.settlementQuote, { amount: formatCnyAmount(model.totalFeeCny) })
            : '',
        totalRate:
          model.totalFeeCny != null && model.rate != null
            ? fmt(t.invoice.settlementRate, { rate: formatMmkAmount(model.rate) })
            : '',
        unitRates,
        totalFee: feeLabel(model.totalFeeMmk, t.invoice.freePromo),
        totalFeeCny: model.totalFeeCny,
        totalFeeMmk: model.totalFeeMmk,
        payNote: t.invoice.payNote,
        contactLabel: t.invoice.contact,
        contactPhoneLabel: t.invoice.contactPhoneLabel,
        contactPhones: t.invoice.contactPhones,
        contactKpay: t.invoice.contactKpay,
        contactSite: t.invoice.contactSite,
      }),
    });
  };

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
                    <View style={styles.docPlain}>
                      <Text style={styles.docWord}>INVOICE</Text>
                      <Text style={styles.docMeta}>
                        {t.invoice.invoiceNo} —
                      </Text>
                    </View>
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
                    <MetaRow label={t.invoice.trip} value={heading.trip || t.invoice.notLoaded} />
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
                      <View style={styles.feeStack}>
                        {model.totalFeeCny != null ? (
                          <Text style={styles.feeQuote}>
                            {fmt(t.invoice.settlementQuote, { amount: formatCnyAmount(model.totalFeeCny) })}
                          </Text>
                        ) : null}
                        {model.totalFeeCny != null
                          ? unitRates.map((label) => (
                              <Text key={label} style={styles.feeUnit}>
                                {label}
                              </Text>
                            ))
                          : null}
                        {model.totalFeeCny != null && model.rate != null ? (
                          <Text style={styles.feeRate}>
                            {fmt(t.invoice.settlementRate, { rate: formatMmkAmount(model.rate) })}
                          </Text>
                        ) : null}
                        <Text style={styles.feeValue} myanmarWeight="bold">
                          {feeLabel(model.totalFeeMmk, t.invoice.freePromo)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.payNote}>{t.invoice.payNote}</Text>
                  <View style={styles.contact}>
                    <Text style={styles.contactLabel}>{t.invoice.contact}</Text>
                    <Text style={styles.contactLine}>
                      <Text style={styles.contactLineLabel}>{t.invoice.contactPhoneLabel}</Text>
                      {t.invoice.contactPhones}
                    </Text>
                    <Text style={styles.contactLine}>
                      <Text style={styles.contactLineLabel}>Kpay：</Text>
                      {t.invoice.contactKpay}
                    </Text>
                    <Text style={styles.contactSite}>{t.invoice.contactSite}</Text>
                  </View>
                  <Text style={styles.footerBrand}>MARKET LINK EXPRESS</Text>
                </View>
              </View>
            </ScrollView>
          ) : null}

          <View style={styles.actions}>
            {onContinue ? (
              <Pressable
                style={[styles.continueBtn, (!model || saving) && styles.btnDisabled]}
                onPress={continueSign}
                disabled={!model || !heading || signedItemIds.length === 0 || saving}
                accessibilityRole="button"
                accessibilityLabel={continueLabel || t.invoice.continueSign}
              >
                <Text style={styles.continueBtnText} myanmarWeight="bold">
                  {continueLabel || t.invoice.continueSign}
                </Text>
              </Pressable>
            ) : null}
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
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
    transform: [{ rotate: '-18deg' }],
  },
  paperBody: {
    position: 'relative',
    zIndex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
  },
  brand: {
    color: '#1c1917',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  brandSub: {
    marginTop: 1,
    color: '#1c1917',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
  },
  docPlain: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  docWord: {
    color: '#1c1917',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  docMeta: {
    marginTop: 2,
    color: '#57534e',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
  },
  rule: {
    marginTop: 8,
    height: 2,
    backgroundColor: '#1c1917',
  },
  ruleThin: {
    marginTop: 2,
    height: 1,
    backgroundColor: '#1c1917',
  },
  meta: {
    marginTop: 8,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  metaLabel: {
    color: '#57534e',
    fontSize: 10,
    fontWeight: '600',
  },
  metaValue: {
    flex: 1,
    flexShrink: 1,
    color: '#1c1917',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  table: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1c1917',
  },
  tableHead: {
    paddingTop: 6,
    paddingBottom: 4,
    color: '#57534e',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#a8a29e',
  },
  orderIndex: {
    width: 22,
    color: '#a8a29e',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 16,
  },
  orderNo: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    color: '#1c1917',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  packWeight: {
    marginTop: 4,
    marginBottom: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(28, 25, 23, 0.05)',
    color: '#1c1917',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'right',
  },
  totals: {
    marginTop: 10,
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
    fontSize: 11,
    fontWeight: '600',
  },
  totalValue: {
    color: '#1c1917',
    fontSize: 14,
    fontWeight: '700',
  },
  feeRow: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#1c1917',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    color: '#f6f3ec',
    fontSize: 11,
    fontWeight: '600',
  },
  feeStack: { alignItems: 'flex-end', flexShrink: 1, maxWidth: '74%' },
  feeQuote: {
    color: '#f6f3ec',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  feeUnit: {
    color: '#f6f3ec',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
    textAlign: 'right',
  },
  feeRate: {
    color: '#d6d3d1',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
    marginBottom: 2,
    textAlign: 'right',
  },
  feeValue: {
    color: '#f6f3ec',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
  },
  payNote: {
    marginTop: 8,
    textAlign: 'center',
    color: '#1c1917',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  contact: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(28, 25, 23, 0.28)',
    backgroundColor: 'rgba(28, 25, 23, 0.035)',
    alignItems: 'center',
  },
  contactLabel: {
    color: '#57534e',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  contactLine: {
    marginTop: 3,
    color: '#1c1917',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  contactLineLabel: {
    color: '#57534e',
    fontSize: 11,
    fontWeight: '700',
  },
  contactSite: {
    marginTop: 3,
    color: '#1c1917',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  footerBrand: {
    marginTop: 6,
    textAlign: 'center',
    color: '#78716c',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
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
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  continueBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 88,
    alignItems: 'center',
  },
  continueBtnText: { color: '#f6f3ec', fontWeight: '800', fontSize: 14 },
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
