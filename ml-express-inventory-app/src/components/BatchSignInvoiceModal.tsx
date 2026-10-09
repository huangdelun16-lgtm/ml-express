import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
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
import { freezeSignedInvoice } from '../services/signedInvoiceArchive';

type Props = {
  visible: boolean;
  selectedItems: InventoryItemListRow[];
  knownItems: InventoryItemListRow[];
  store: InventoryStoreSession | null;
  hubCode?: string | null;
  onClose: () => void;
  onContinue?: (handoff: FrozenInvoiceHandoff) => void;
  continueLabel?: string;
  signedBy?: string;
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

const PAPER_WIDTH = 640;
const WATERMARK_TOPS = [48, 228, 408, 588, 768];
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

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
  signedBy,
}: Props) {
  const { t, fmt } = useTranslation();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const shotRef = useRef<View>(null);
  const paperHeightRef = useRef(0);
  const [paperHeight, setPaperHeight] = useState(1100);
  const sheetMaxHeight = Math.round(windowHeight * 0.9);
  const listMaxHeight = Math.max(240, sheetMaxHeight - 88);
  const frameWidth = Math.max(280, windowWidth - 48);
  const paperScale = frameWidth / PAPER_WIDTH;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [model, setModel] = useState<BatchSignInvoiceModel | null>(null);
  const [unitRates, setUnitRates] = useState<string[]>([]);
  const [heading, setHeading] = useState<InvoiceHeading | null>(null);
  const [signedItemIds, setSignedItemIds] = useState<string[]>([]);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [issuing, setIssuing] = useState(false);

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
      setInvoiceNo('');
      setIssuing(false);
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
          setInvoiceNo('');
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
          setInvoiceNo('');
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
        useRenderInContext: true,
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

  const issuedDocument = () => {
    if (!model || !heading) return null;
    const measureTemplates = {
      lineMeasure: t.invoice.lineMeasure,
      lineWeight: t.invoice.lineWeight,
      packMeasure: t.invoice.packMeasure,
      packWeight: t.invoice.packWeight,
    };
    return {
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
    };
  };

  const issueInvoice = async () => {
    if (!onContinue || issuing || invoiceNo) return;
    const handoff = issuedDocument();
    if (!handoff) return;
    setIssuing(true);
    try {
      const no = await freezeSignedInvoice({
        document: handoff.document,
        itemIds: handoff.itemIds,
        signedBy: signedBy || '',
      });
      setInvoiceNo(no);
    } catch (err) {
      feedbackService.notify(t.invoice.issueFailed, err instanceof Error ? err.message : undefined);
    } finally {
      setIssuing(false);
    }
  };

  const finishIssued = () => {
    if (!onContinue || !invoiceNo) return;
    const handoff = issuedDocument();
    if (!handoff) return;
    onContinue({
      ...handoff,
      document: { ...handoff.document, invoiceNo },
    });
  };

  const quoteLabel = (amount: string) => {
    const parts = t.invoice.settlementQuote.split('{amount}');
    return { prefix: (parts[0] || '').replace(/¥\s*$/, '').trim() || t.invoice.batchQuote, amount: `¥${amount}` };
  };
  const rateLabel = (rate: string) => {
    const raw = fmt(t.invoice.settlementRate, { rate });
    const idx = raw.search(/1 CNY/i);
    if (idx < 0) return { prefix: t.invoice.batchRate, value: raw };
    return { prefix: raw.slice(0, idx).trim() || t.invoice.batchRate, value: raw.slice(idx).trim() };
  };
  const renderPaper = () => {
    if (!model || !heading) return null;
    const quote = model.totalFeeCny != null ? quoteLabel(formatCnyAmount(model.totalFeeCny)) : null;
    const rate = model.totalFeeCny != null && model.rate != null ? rateLabel(formatMmkAmount(model.rate)) : null;
    return (
      <View style={styles.paper}>
        <View pointerEvents="none" style={styles.watermarkWrap}>
          {WATERMARK_TOPS.map((top) => (
            <Text key={top} numberOfLines={1} clipMyanmar style={[styles.watermark, { top }]}>
              MARKET LINK
            </Text>
          ))}
        </View>
        <View style={styles.frame}>
          <View style={styles.paperBody}>
            <View style={styles.brandRow}>
              <View style={styles.wordmark}>
                <Text style={styles.brand} myanmarWeight="bold">
                  MARKET LINK
                </Text>
                <Text style={styles.brandSub}>EXPRESS</Text>
              </View>
              <View style={styles.docPlain}>
                <Text style={styles.docWord} numberOfLines={1}>
                  invoice no
                </Text>
                <Text style={styles.docNo} numberOfLines={1}>
                  {invoiceNo || '—'}
                </Text>
              </View>
            </View>
            <View style={styles.rule} />
            <View style={styles.ruleThin} />
            <View style={styles.meta}>
              <MetaRow label={t.invoice.customerName} value={heading.customer || customerName || '—'} />
              {heading.phone ? <MetaRow label={t.invoice.phone} value={heading.phone} /> : null}
              {heading.destination ? <MetaRow label={t.invoice.finalDest} value={heading.destination} /> : null}
              {heading.station ? <MetaRow label={t.invoice.station} value={heading.station} /> : null}
              <MetaRow label={t.invoice.trip} value={heading.trip || t.invoice.notLoaded} />
              {heading.packBarcode ? <MetaRow label={t.invoice.packNo} value={heading.packBarcode} /> : null}
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
              {quote ? (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{quote.prefix}</Text>
                  <Text style={styles.totalValue}>{quote.amount}</Text>
                </View>
              ) : null}
              {rate ? (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{rate.prefix}</Text>
                  <Text style={styles.totalValue}>{rate.value}</Text>
                </View>
              ) : null}
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>{t.invoice.batchTotalFee}</Text>
                <Text style={styles.feeValue} myanmarWeight="bold">
                  {feeLabel(model.totalFeeMmk, t.invoice.freePromo)}
                </Text>
              </View>
            </View>
            <View style={styles.closeout}>
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
        </View>
      </View>
    );
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
              <View style={[styles.paperFrame, { width: frameWidth, height: paperHeight * paperScale }]}>
                <View style={[styles.paperScale, { transform: [{ scale: paperScale }] }]}>
                  {renderPaper()}
                </View>
              </View>
              <View style={styles.captureHost} pointerEvents="none">
                <View
                  ref={shotRef}
                  collapsable={false}
                  onLayout={(event) => {
                    const next = event.nativeEvent.layout.height;
                    if (next > 0) {
                      paperHeightRef.current = next;
                      if (Math.abs(next - paperHeight) > 1) setPaperHeight(next);
                    }
                  }}
                >
                  {renderPaper()}
                </View>
              </View>
            </ScrollView>
          ) : null}

          <View style={styles.actions}>
            {invoiceNo ? (
              <>
                <Pressable
                  style={[styles.saveBtn, saving && styles.btnDisabled]}
                  onPress={() => void handleSave()}
                  disabled={saving}
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
                  style={styles.continueBtn}
                  onPress={finishIssued}
                  accessibilityRole="button"
                  accessibilityLabel={t.invoice.finishIssued}
                >
                  <Text style={styles.continueBtnText} myanmarWeight="bold">
                    {t.invoice.finishIssued}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                {onContinue ? (
                  <Pressable
                    style={[styles.continueBtn, (!model || issuing || saving) && styles.btnDisabled]}
                    onPress={() => void issueInvoice()}
                    disabled={!model || !heading || signedItemIds.length === 0 || issuing || saving}
                    accessibilityRole="button"
                    accessibilityLabel={continueLabel || t.invoice.signAction}
                  >
                    {issuing ? (
                      <ActivityIndicator color="#f6f3ec" size="small" />
                    ) : (
                      <Text style={styles.continueBtnText} myanmarWeight="bold">
                        {continueLabel || t.invoice.signAction}
                      </Text>
                    )}
                  </Pressable>
                ) : null}
                <Pressable
                  style={[styles.saveBtn, (!model || saving || issuing) && styles.btnDisabled]}
                  onPress={() => void handleSave()}
                  disabled={!model || saving || issuing}
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
              </>
            )}
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
  listContent: { paddingBottom: 4, alignItems: 'center' },
  paperFrame: { overflow: 'hidden' },
  paperScale: { width: PAPER_WIDTH, transformOrigin: 'left top' },
  captureHost: { position: 'absolute', width: PAPER_WIDTH, left: -4000, top: 0, opacity: 0 },
  paper: {
    width: PAPER_WIDTH,
    position: 'relative',
    backgroundColor: '#f7f3ea',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1c1917',
    padding: 5,
  },
  frame: { borderWidth: 1, borderColor: 'rgba(28, 25, 23, 0.28)' },
  watermarkWrap: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 },
  watermark: {
    position: 'absolute',
    left: -40,
    right: -40,
    color: 'rgba(28, 25, 23, 0.045)',
    fontFamily: SERIF,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
    transform: [{ rotate: '-16deg' }],
  },
  paperBody: { position: 'relative', zIndex: 1, paddingHorizontal: 28, paddingTop: 28, paddingBottom: 22 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 },
  wordmark: { flexShrink: 1 },
  brand: { color: '#1c1917', fontFamily: SERIF, fontSize: 28, fontWeight: '700', letterSpacing: 1.1, lineHeight: 28 },
  brandSub: { marginTop: 4, color: '#1c1917', fontSize: 11, fontWeight: '700', letterSpacing: 4.6 },
  docPlain: { width: 168, flexShrink: 0, alignItems: 'flex-end' },
  docWord: { width: '100%', color: '#1c1917', fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textAlign: 'right' },
  docNo: { width: '100%', marginTop: 2, color: '#1c1917', fontFamily: MONO, fontSize: 13, fontWeight: '800', letterSpacing: 0.2, textAlign: 'right' },
  rule: { marginTop: 12, height: 2, backgroundColor: '#1c1917' },
  ruleThin: { marginTop: 3, height: 1, backgroundColor: '#1c1917' },
  meta: { marginTop: 16 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(28, 25, 23, 0.1)',
  },
  metaLabel: { color: '#78716c', fontSize: 12, fontWeight: '600' },
  metaValue: { flex: 1, color: '#1c1917', fontSize: 14, fontWeight: '700', textAlign: 'right' },
  table: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#1c1917' },
  tableHead: { paddingTop: 12, paddingBottom: 4, color: '#78716c', fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  orderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#a8a29e' },
  orderIndex: { width: 28, paddingTop: 2, color: '#a8a29e', fontSize: 12, fontWeight: '700' },
  orderNo: { flex: 1, minWidth: 0, color: '#1c1917', fontFamily: MONO, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  packWeight: { marginTop: 8, marginBottom: 2, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: 'rgba(28, 25, 23, 0.05)', color: '#1c1917', fontSize: 13, fontWeight: '700', textAlign: 'right' },
  totals: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#1c1917' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 10, gap: 12 },
  totalLabel: { color: '#44403c', fontSize: 13, fontWeight: '600' },
  totalValue: { flexShrink: 1, color: '#1c1917', fontSize: 14, fontWeight: '700', textAlign: 'right' },
  feeRow: { marginTop: 10, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#1c1917', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  feeLabel: { color: '#f6f3ec', fontSize: 13, fontWeight: '600' },
  feeValue: { flexShrink: 1, color: '#f6f3ec', fontSize: 18, fontWeight: '800', textAlign: 'right' },
  closeout: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1c1917' },
  payNote: { textAlign: 'center', color: '#1c1917', fontSize: 13, fontWeight: '800', letterSpacing: 1.8 },
  contact: { marginTop: 10, alignSelf: 'center', width: 460, maxWidth: '100%', paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(28, 25, 23, 0.16)', backgroundColor: 'rgba(28, 25, 23, 0.035)', alignItems: 'center' },
  contactLabel: { color: '#57534e', fontSize: 11, fontWeight: '800', letterSpacing: 2.4 },
  contactLine: { marginTop: 7, color: '#1c1917', fontSize: 13, fontWeight: '800', textAlign: 'center', lineHeight: 18 },
  contactLineLabel: { color: '#57534e', fontSize: 13, fontWeight: '700' },
  contactSite: { marginTop: 7, color: '#1c1917', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  footerBrand: { marginTop: 10, textAlign: 'center', color: '#78716c', fontSize: 11, fontWeight: '700', letterSpacing: 2.4 },
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
  listContent: { paddingBottom: 4, alignItems: 'center' },
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
