import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ScanInputBar from '../components/ScanInputBar';
import ItemsListRow from '../components/ItemsListRow';
import CustomerSignFlowModal, { type CustomerSignFlowRequest } from '../components/CustomerSignFlowModal';
import { SignaturePreview } from '../components/SignaturePad';
import { useAuth } from '../contexts/AuthContext';
import {
  fmt,
  getOrderStatusLabel,
  getPkgStatusLabel,
  resolveAppError,
  useTranslation,
} from '../i18n';
import type { TranslationDict } from '../i18n/translations';
import { listItems, listPackedShipments, trackOrderByCode } from '../services/inventoryService';
import { findTrackingByAnyCode } from '../services/trackingService';
import type { InventoryItemListRow, PackedShipmentDetail, TrackOrderResult } from '../types/inventory';
import type { OrderTrackingRecord, PkgTrackingDetail } from '../types/tracking';
import { resolvePackagingStockInSignIds } from '../utils/customerBatchSign';
import { canMarkCustomerSigned, isDestinationHubViewer } from '../utils/customerSign';
import { formatCnyAmount, formatMmkAmount, fetchCrossBorderFxRate } from '../utils/crossBorderFx';
import { hasRecordedFee, parseFeeMmk, resolveInvoiceFeeDisplay } from '../utils/crossBorderFxLock';
import { parseInboundMovementNote, pickNotesFxLock } from '../utils/inboundMovementNote';
import { stockUnitLabel } from '../utils/itemFieldFormat';
import { packStatusStyle, type PackDisplayStatus } from '../utils/packDisplayStatus';
import {
  effectivePkgTrackingStatus,
  resolveTrackPackDisplayStatus,
} from '../utils/shipmentTrackVisibility';
import { regionDisplayLabel } from '../constants/destinationOptions';
import { pickupTypeLabel } from '../types/customerSignReceipt';
import { showTaskSuccess } from '../utils/taskSuccessAlert';
import { feedbackService } from '../services/FeedbackService';

type Route = { params?: { presetCode?: string } };

const KEYWORD_RESULT_LIMIT = 40;

function getMatchLabel(t: TranslationDict, matchType: TrackOrderResult['matchType']): string {
  if (matchType === 'express') return t.trackExpress.matchExpress;
  if (matchType === 'inbound') return t.trackExpress.matchInbound;
  return t.trackExpress.matchPackage;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  const text = value === undefined || value === null ? '' : String(value).trim();
  if (!text) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>
        {text}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function LoadStatusBadge({ status }: { status: PackDisplayStatus }) {
  const { t } = useTranslation();
  const colors = packStatusStyle(status);
  return (
    <View style={[styles.statusBadge, { backgroundColor: colors.badgeBg }]}>
      <Text style={[styles.statusText, { color: colors.badgeText }]}>{t.packStatus[status]}</Text>
    </View>
  );
}

function PackSection({
  pack,
  title,
  cloudPkg,
}: {
  pack: PackedShipmentDetail;
  title: string;
  cloudPkg?: PkgTrackingDetail | null;
}) {
  const { t, fmt } = useTranslation();
  const displayStatus = resolveTrackPackDisplayStatus(pack, cloudPkg);
  return (
    <>
      <Section title={title}>
        <View style={styles.packHeader}>
          <DetailRow label={t.trackExpress.packNo} value={pack.bundle_barcode} />
          <LoadStatusBadge status={displayStatus} />
        </View>
        <DetailRow label={t.trackExpress.packName} value={pack.bundle_name} />
        <DetailRow label={t.trackExpress.spec} value={pack.spec} />
        <DetailRow label={t.trackExpress.unit} value={pack.unit} />
        <DetailRow label={t.trackExpress.weight} value={pack.weight} />
        <DetailRow label={t.trackExpress.packer} value={pack.operator} />
        <DetailRow label={t.trackExpress.packTime} value={formatTime(pack.created_at)} />
      </Section>

      <Section title={fmt(t.trackExpress.sectionPackItems, { count: pack.items.length })}>
        {pack.items.map((line) => (
          <View key={line.id} style={styles.packLine}>
            <Text style={styles.packLineName}>{line.item_name}</Text>
            {line.input_barcode ? (
              <Text style={styles.packLineCode} selectable>
                {t.trackExpress.expressNo} {line.input_barcode}
              </Text>
            ) : null}
            <Text style={styles.packLineCode} selectable>
              {t.trackExpress.inboundLabel} {line.item_barcode}
            </Text>
            <Text style={styles.packLineQty}>× {line.qty}</Text>
          </View>
        ))}
      </Section>
    </>
  );
}

function CloudTrackSection({
  pkg,
  order,
}: {
  pkg: PkgTrackingDetail | null;
  order: OrderTrackingRecord | null;
}) {
  const { t, fmt } = useTranslation();
  if (!pkg) return null;
  return (
    <Section title={t.trackExpress.sectionCloud}>
      <DetailRow label={t.trackExpress.cloudPkg} value={pkg.pack_barcode} />
      <DetailRow
        label={t.trackExpress.transitStatus}
        value={getPkgStatusLabel(t, effectivePkgTrackingStatus(pkg))}
      />
      <DetailRow label={t.trackExpress.origin} value={`${pkg.origin_store_code} ${pkg.origin_store_name}`} />
      <DetailRow label={t.trackExpress.destination} value={regionDisplayLabel(pkg.destination_code)} />
      <DetailRow
        label={t.trackExpress.orderProgress}
        value={fmt(t.trackExpress.orderProgressValue, {
          done: pkg.received_order_count,
          total: pkg.item_count,
        })}
      />
      {pkg.hub_received_by_store_code ? (
        <DetailRow label={t.trackExpress.hubStation} value={pkg.hub_received_by_store_code} />
      ) : null}
      {order ? (
        <DetailRow label={t.trackExpress.orderStatus} value={getOrderStatusLabel(t, order.status)} />
      ) : null}
      {pkg.orders.map((line) => (
        <View key={line.id} style={styles.packLine}>
          <Text style={styles.packLineName}>{line.order_name}</Text>
          <Text style={styles.packLineCode}>
            {getOrderStatusLabel(t, line.status)}
            {line.express_barcode ? ` · ${line.express_barcode}` : ''} · {line.order_barcode}
          </Text>
        </View>
      ))}
    </Section>
  );
}

function TrackResultPanel({
  result,
  cloudPkg,
  cloudOrder,
  canSignDelivered,
  signing,
  onSignDelivered,
  liveRate,
  showCnyQuote,
}: {
  result: TrackOrderResult;
  cloudPkg: PkgTrackingDetail | null;
  cloudOrder: OrderTrackingRecord | null;
  canSignDelivered?: boolean;
  signing?: boolean;
  onSignDelivered?: () => void;
  liveRate: number | null;
  showCnyQuote: boolean;
}) {
  const { t, fmt } = useTranslation();
  const { detail, parentPack, truckLoad } = result;
  const activePack = detail.pack ?? parentPack;
  const displayStatus = activePack ? resolveTrackPackDisplayStatus(activePack, cloudPkg) : null;
  const showSign = canSignDelivered && onSignDelivered;
  const feeMmk = parseFeeMmk(detail.total_fee);
  const recordedFee = hasRecordedFee(detail.total_fee);
  const isFree = recordedFee && feeMmk <= 0;
  const signed = Boolean(detail.customer_signed_at?.trim() || detail.sign_receipt);
  const fxLock = pickNotesFxLock(detail.note, detail.inbound_movement_note);
  const feeDisplay =
    feeMmk > 0
      ? resolveInvoiceFeeDisplay({
          feeMmk,
          signed,
          lockedRate: fxLock?.mmkPerCny,
          paidCny: fxLock?.paidCny,
          liveRate,
        })
      : null;
  const userNote =
    parseInboundMovementNote(detail.note || '').userNote ||
    detail.inbound_note?.trim() ||
    '';

  const movementTypeLabel = (type: string) => {
    if (type === 'in') return t.common.inbound;
    if (type === 'out') return t.common.outbound;
    return t.common.adjust;
  };

  return (
    <View style={styles.result}>
      <View style={styles.matchBanner}>
        <Text style={styles.matchLabel}>
          {fmt(t.trackExpress.matchType, { type: getMatchLabel(t, result.matchType) })}
        </Text>
        <Text style={styles.matchQuery} selectable>
          {result.query}
        </Text>
      </View>

      <Text style={styles.heroName}>{detail.name}</Text>
      <Text style={styles.heroMeta}>
        {fmt(t.common.stockQty, { qty: detail.qty_on_hand })} {stockUnitLabel()}
      </Text>

      {activePack && displayStatus ? (
        <View style={styles.loadRow}>
          <Text style={styles.loadLabel}>
            {displayStatus === 'arrived' || displayStatus === 'completed'
              ? t.trackExpress.transitStatus
              : t.trackExpress.loadStatus}
          </Text>
          <LoadStatusBadge status={displayStatus} />
        </View>
      ) : null}

      {truckLoad ? (
        <Section title={t.trackExpress.sectionTruckLoad}>
          <DetailRow label={t.trackExpress.outboundDate} value={truckLoad.outboundDate} />
          <DetailRow label={t.trackExpress.destination} value={regionDisplayLabel(truckLoad.destination)} />
          <DetailRow label={t.trackExpress.operator} value={truckLoad.operator} />
          <DetailRow label={t.trackExpress.recordTime} value={formatTime(truckLoad.created_at)} />
        </Section>
      ) : displayStatus === 'pending_load' ? (
        <View style={styles.pendingHint}>
          <Text style={styles.pendingHintText}>{t.trackExpress.pendingPackHint}</Text>
        </View>
      ) : null}
      {displayStatus === 'arrived' || displayStatus === 'completed' ? (
        <View style={styles.pendingHint}>
          <Text style={styles.pendingHintText}>{t.trackExpress.arrivedPackHint}</Text>
        </View>
      ) : null}

      <Section title={t.trackExpress.sectionShipInfo}>
        <DetailRow label={t.trackExpress.customerName} value={detail.customer_name} />
        <DetailRow label={t.trackExpress.phone} value={detail.recipient_phone} />
        <DetailRow label={t.trackExpress.destination} value={regionDisplayLabel(detail.destination ?? '')} />
        <DetailRow label={t.trackExpress.packaging} value={detail.packaging} />
        {isFree ? (
          showCnyQuote ? (
            <>
              <DetailRow label={t.invoice.quoteCny} value={`¥0 · ${t.invoice.freePromo}`} />
              <DetailRow
                label={t.invoice.totalFee}
                value={fmt(t.invoice.bookedMmk, { amount: formatMmkAmount(0) })}
              />
            </>
          ) : (
            <DetailRow label={t.invoice.totalFee} value={`0 MMK · ${t.invoice.freePromo}`} />
          )
        ) : feeDisplay ? (
          showCnyQuote && feeDisplay.cny != null ? (
            <>
              <DetailRow
                label={feeDisplay.usedLock ? t.invoice.settledCny : t.invoice.quoteCny}
                value={`¥${formatCnyAmount(feeDisplay.cny)}`}
              />
              <DetailRow
                label={t.invoice.totalFee}
                value={fmt(t.invoice.bookedMmk, { amount: formatMmkAmount(feeDisplay.mmk) })}
              />
            </>
          ) : (
            <>
              <DetailRow
                label={t.invoice.totalFee}
                value={`${formatMmkAmount(feeDisplay.mmk)} MMK`}
              />
              {showCnyQuote && feeDisplay.legacySignedMmkOnly ? (
                <Text style={styles.feeHint}>{t.invoice.legacySignedMmkOnly}</Text>
              ) : null}
            </>
          )
        ) : null}
      </Section>

      {detail.sign_receipt ? (
        <Section title={t.invoice.signTrace}>
          {detail.sign_receipt.pickupType === 'proxy' ? (
            <>
              <DetailRow label={t.invoice.proxyPhone} value={detail.sign_receipt.signPhone} />
              <DetailRow label={t.invoice.proxyName} value={detail.sign_receipt.proxyName} />
            </>
          ) : (
            <DetailRow
              label={t.invoice.pickupMethod}
              value={pickupTypeLabel(detail.sign_receipt.pickupType, {
                self: t.sign.pickupSelf,
                proxy: t.sign.pickupProxy,
              })}
            />
          )}
          <DetailRow label={t.invoice.operator} value={detail.sign_receipt.signedByOperator} />
          <DetailRow
            label={t.invoice.signedAt}
            value={detail.sign_receipt.signedAt ? formatTime(detail.sign_receipt.signedAt) : ''}
          />
          {detail.sign_receipt.signatureStrokes.length > 0 ? (
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>{t.invoice.recipientSignature}</Text>
              <SignaturePreview strokes={detail.sign_receipt.signatureStrokes} />
            </View>
          ) : null}
        </Section>
      ) : null}

      <Section title={t.trackExpress.sectionItemInfo}>
        <DetailRow label={t.trackExpress.itemName} value={detail.name} />
        <DetailRow label={t.trackExpress.spec} value={detail.spec} />
        <DetailRow label={t.trackExpress.unit} value={detail.unit} />
        <DetailRow label={t.trackExpress.weight} value={detail.weight} />
      </Section>

      <Section title={t.trackExpress.sectionBarcode}>
        <DetailRow label={t.trackExpress.expressNo} value={detail.input_barcode} />
        <DetailRow label={t.trackExpress.inboundBarcode} value={detail.barcode} />
      </Section>

      {userNote ? (
        <Section title={t.trackExpress.sectionNote}>
          <Text style={styles.noteText} selectable>
            {userNote}
          </Text>
        </Section>
      ) : null}

      {detail.pack ? (
        <PackSection pack={detail.pack} title={t.trackExpress.sectionPack} cloudPkg={cloudPkg} />
      ) : null}
      {parentPack ? (
        <PackSection pack={parentPack} title={t.trackExpress.sectionParentPkg} cloudPkg={cloudPkg} />
      ) : null}

      <CloudTrackSection pkg={cloudPkg} order={cloudOrder} />

      {result.recentMovements.length > 0 ? (
        <Section title={t.trackExpress.sectionMovements}>
          {result.recentMovements.map((m) => (
            <View key={m.id} style={styles.movementLine}>
              <Text style={styles.movementType}>
                {movementTypeLabel(m.type)} · {m.qty}
              </Text>
              <Text style={styles.movementMeta}>
                {formatTime(m.created_at)} · {m.operator}
              </Text>
              {m.note ? (
                <Text style={styles.movementNote} numberOfLines={3} selectable>
                  {m.note}
                </Text>
              ) : null}
            </View>
          ))}
        </Section>
      ) : null}

      {showSign ? (
        <Pressable
          style={[styles.signBtn, signing && styles.signBtnDisabled]}
          onPress={onSignDelivered}
          disabled={signing}
        >
          <Text style={styles.signBtnText}>
            {signing ? t.common.signInProgress : t.common.signedMark}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function CloudOnlyPanel({
  pkg,
  order,
}: {
  pkg: PkgTrackingDetail;
  order: OrderTrackingRecord | null;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.result}>
      <View style={styles.matchBanner}>
        <Text style={styles.matchLabel}>{t.trackExpress.cloudOnly}</Text>
        <Text style={styles.matchQuery} selectable>
          {pkg.pack_barcode}
        </Text>
      </View>
      <CloudTrackSection pkg={pkg} order={order} />
    </View>
  );
}

export default function TrackExpressScreen({ route }: { route?: Route }) {
  const { t, fmt } = useTranslation();
  const { store, hubCode, operatorName } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [signRequest, setSignRequest] = useState<CustomerSignFlowRequest | null>(null);
  const [result, setResult] = useState<TrackOrderResult | null>(null);
  const [cloudPkg, setCloudPkg] = useState<PkgTrackingDetail | null>(null);
  const [cloudOrder, setCloudOrder] = useState<OrderTrackingRecord | null>(null);
  const [keywordMatches, setKeywordMatches] = useState<InventoryItemListRow[]>([]);
  const [keywordTotal, setKeywordTotal] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [liveRate, setLiveRate] = useState<number | null>(null);

  useEffect(() => {
    void fetchCrossBorderFxRate().then(setLiveRate);
  }, []);

  const search = useCallback(async (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setCode(q);
    setLoading(true);
    setNotFound(false);
    setResult(null);
    setCloudPkg(null);
    setCloudOrder(null);
    setKeywordMatches([]);
    setKeywordTotal(0);
    try {
      const scope = store && hubCode ? { store, hubCode } : undefined;
      const [tracked, cloud] = await Promise.all([
        trackOrderByCode(q),
        findTrackingByAnyCode(q),
      ]);
      setCloudPkg(cloud.pkg);
      setCloudOrder(cloud.order);
      if (tracked) {
        setResult(tracked);
        return;
      }

      const matches = await listItems(q, scope);
      if (matches.length === 1) {
        const barcode = matches[0].barcode;
        const [only, cloudForItem] = await Promise.all([
          trackOrderByCode(barcode),
          findTrackingByAnyCode(barcode),
        ]);
        if (only) {
          setCloudPkg(cloudForItem.pkg);
          setCloudOrder(cloudForItem.order);
          setResult(only);
          return;
        }
      }
      if (matches.length > 1) {
        setKeywordTotal(matches.length);
        setKeywordMatches(matches.slice(0, KEYWORD_RESULT_LIMIT));
        return;
      }

      const packs = await listPackedShipments(q, scope);
      if (packs.length === 1) {
        const packCode = packs[0].bundle_barcode;
        const [packTracked, cloudForPack] = await Promise.all([
          trackOrderByCode(packCode),
          findTrackingByAnyCode(packCode),
        ]);
        if (packTracked) {
          setCloudPkg(cloudForPack.pkg);
          setCloudOrder(cloudForPack.order);
          setResult(packTracked);
          return;
        }
      }

      if (cloud.pkg) {
        return;
      }
      setNotFound(true);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [store, hubCode]);

  useEffect(() => {
    const preset = route?.params?.presetCode;
    if (preset) void search(preset);
  }, [route?.params?.presetCode, search]);

  const canSign = Boolean(
    result && store && canMarkCustomerSigned(store, result.detail),
  );

  const handleSign = () => {
    if (!result || !store) return;
    const detail = result.detail;
    const scope = hubCode ? { store, hubCode } : undefined;
    void (async () => {
      const expanded = await resolvePackagingStockInSignIds(
        keywordMatches,
        [detail],
        store,
        (keyword) => listItems(keyword, scope),
      );
      setSignRequest({
        itemIds: expanded.map((item) => item.id),
        operator: operatorName ?? t.common.operator,
        store,
        liveRate,
      });
    })();
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>{t.trackExpress.intro}</Text>

      <ScanInputBar
        value={code}
        onChangeText={setCode}
        onSubmit={search}
        busy={loading}
        preserveCase
        cameraScan={{
          title: t.trackExpress.cameraTitle,
          subtitle: t.trackExpress.cameraSubtitle,
        }}
        placeholder={t.trackExpress.placeholder}
      />

      <Pressable
        style={[styles.searchBtn, loading && styles.searchBtnDisabled]}
        onPress={() => void search(code)}
        disabled={loading}
      >
        <Text style={styles.searchBtnText}>{t.common.query}</Text>
      </Pressable>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#38bdf8" />
          <Text style={styles.loadingText}>{t.common.querying}</Text>
        </View>
      ) : null}

      {notFound ? (
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>{t.trackExpress.notFoundTitle}</Text>
          <Text style={styles.notFoundHint}>{t.trackExpress.notFoundHint}</Text>
        </View>
      ) : null}

      {keywordMatches.length > 0 ? (
        <View style={styles.keywordBox}>
          <Text style={styles.keywordTitle}>
            {fmt(t.trackExpress.keywordResults, { count: keywordTotal })}
          </Text>
          <Text style={styles.keywordHint}>{t.trackExpress.tapForDetail}</Text>
          {keywordMatches.map((item) => (
            <ItemsListRow
              key={item.id}
              item={item}
              hubCode={hubCode ?? undefined}
              selected={false}
              selectActive={false}
              selectAccent="#38bdf8"
              onPress={() => void search(item.barcode)}
            />
          ))}
          {keywordTotal > keywordMatches.length ? (
            <Text style={styles.keywordHint}>
              {fmt(t.trackExpress.resultsCapped, { shown: keywordMatches.length })}
            </Text>
          ) : null}
        </View>
      ) : null}

      {result ? (
        <TrackResultPanel
          result={result}
          cloudPkg={cloudPkg}
          cloudOrder={cloudOrder}
          canSignDelivered={canSign}
          signing={signRequest != null}
          onSignDelivered={handleSign}
          liveRate={liveRate}
          showCnyQuote={Boolean(store && isDestinationHubViewer(store, result.detail))}
        />
      ) : null}
      {!result && keywordMatches.length === 0 && cloudPkg ? (
        <CloudOnlyPanel pkg={cloudPkg} order={cloudOrder} />
      ) : null}

      <CustomerSignFlowModal
        request={signRequest}
        onClose={() => setSignRequest(null)}
        resolveError={(e) => resolveAppError(t, e)}
        onSuccess={async (detail, signedCount) => {
          const refreshed = await trackOrderByCode(result?.query ?? detail.barcode);
          if (refreshed) setResult(refreshed);
          showTaskSuccess(
            t.common.signSuccess,
            signedCount > 1
              ? fmt(t.sign.batchSignedCount, { count: signedCount })
              : fmt(t.common.signMarked, { name: detail.name }),
          );
        }}
        onError={(message) => feedbackService.notify(t.common.signFailed, message)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 32 },
  intro: { color: '#94a3b8', fontSize: 13, lineHeight: 20, marginBottom: 16 },
  searchBtn: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  searchBtnDisabled: { opacity: 0.55 },
  searchBtnText: { color: '#f8fafc', fontSize: 16, fontWeight: '800' },
  loadingBox: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  loadingText: { color: '#94a3b8', fontSize: 13 },
  notFound: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f87171',
  },
  notFoundTitle: { color: '#fca5a5', fontSize: 16, fontWeight: '800' },
  notFoundHint: { color: '#94a3b8', fontSize: 13, marginTop: 6, lineHeight: 20 },
  keywordBox: { gap: 8, marginBottom: 12 },
  keywordTitle: { color: '#7dd3fc', fontSize: 14, fontWeight: '800' },
  keywordHint: { color: '#94a3b8', fontSize: 12, lineHeight: 18, marginBottom: 4 },
  result: { marginTop: 4 },
  matchBanner: {
    backgroundColor: 'rgba(14,165,233,0.12)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.35)',
  },
  matchLabel: { color: '#7dd3fc', fontSize: 12, fontWeight: '800' },
  matchQuery: { color: '#e0f2fe', fontSize: 16, fontWeight: '900', fontFamily: 'monospace', marginTop: 4 },
  heroName: { color: '#f8fafc', fontSize: 22, fontWeight: '900' },
  heroMeta: { color: '#fbbf24', fontSize: 14, fontWeight: '800', marginTop: 6, marginBottom: 12 },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  loadLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusLoaded: { backgroundColor: 'rgba(34,197,94,0.15)' },
  statusPending: { backgroundColor: 'rgba(251,146,60,0.15)' },
  statusText: { fontSize: 12, fontWeight: '900' },
  statusLoadedText: { color: '#4ade80' },
  statusPendingText: { color: '#fb923c' },
  pendingHint: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pendingHintText: { color: '#94a3b8', fontSize: 13 },
  section: { marginBottom: 14 },
  sectionTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionBody: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  row: { gap: 2 },
  rowLabel: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  rowValue: { color: '#e2e8f0', fontSize: 15, fontWeight: '700', fontFamily: 'monospace' },
  noteText: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  feeHint: { color: '#94a3b8', fontSize: 12, fontWeight: '600', textAlign: 'right' as const, marginTop: 4 },
  packHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  packLine: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  packLineName: { color: '#f8fafc', fontSize: 14, fontWeight: '800' },
  packLineCode: { color: '#fde68a', fontSize: 12, marginTop: 2, fontFamily: 'monospace' },
  packLineQty: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  movementLine: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  movementType: { color: '#e2e8f0', fontSize: 14, fontWeight: '800' },
  movementMeta: { color: '#64748b', fontSize: 11, marginTop: 2 },
  movementNote: { color: '#94a3b8', fontSize: 12, marginTop: 4, lineHeight: 18 },
  signBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  signBtnDisabled: { opacity: 0.65 },
  signBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  signatureBox: { marginTop: 8, gap: 8 },
  signatureLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },
});
