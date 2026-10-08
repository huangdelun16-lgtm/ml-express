import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import BarcodeScannerView from '../components/BarcodeScannerView';
import BatchSignInvoiceModal from '../components/BatchSignInvoiceModal';
import CustomerSignFlowModal, { type CustomerSignFlowRequest } from '../components/CustomerSignFlowModal';
import ExceptionReportModal from '../components/ExceptionReportModal';
import { useAuth } from '../contexts/AuthContext';
import { getPkgStatusLabel, resolveAppError, useTranslation } from '../i18n';
import { feedbackService } from '../services/FeedbackService';
import { isHubTransportFeePaid } from '../services/hubTransportFeeService';
import { getItemByBarcode, listItems } from '../services/inventoryService';
import { findTrackingByAnyCode } from '../services/trackingService';
import type { InventoryItem, InventoryItemListRow } from '../types/inventory';
import type { ExceptionReportTarget } from '../types/inventoryException';
import { resolvePackagingStockInSignIds } from '../utils/customerBatchSign';
import type { FrozenInvoiceHandoff } from '../utils/frozenSignedInvoice';
import {
  cameraScanManualActions,
  formatScanCloudRoute,
  resolveCameraScanRoute,
  type CameraScanRoute,
} from '../utils/cameraScanRoute';
import { explainCloudOperationFailure } from '../utils/cloudOperationFailure';
import { canMarkCustomerSigned } from '../utils/customerSign';
import { parsePackagingStockInLineBarcode } from '../utils/inboundBarcode';
import {
  assessPackagingArrival,
  decidePaidSignAdd,
  isAlreadyInPaidSignBasket,
  isSameSignCustomer,
  type PackagingArrival,
} from '../utils/scanPaidSign';
import { showTaskSuccess } from '../utils/taskSuccessAlert';

type Nav = {
  navigate: (
    name: string,
    params?: { presetBarcode?: string; presetCode?: string; openPackBarcode?: string },
  ) => void;
};

type ScanResult = {
  code: string;
  item: InventoryItem | null;
  cloudStatus: string | null;
  cloudRoute: string | null;
  route: CameraScanRoute | null;
  hubPackBarcode: string;
  feePaid: boolean;
};

type ShortagePrompt = {
  target: ExceptionReportTarget;
  note: string;
  qtyActual: string;
};

function asInvoiceRow(item: InventoryItem): InventoryItemListRow {
  const extra = item as Partial<InventoryItemListRow>;
  return {
    ...item,
    stocked_in: extra.stocked_in ?? true,
    packed: extra.packed ?? Boolean(item.packed_at || item.packed_bundle_barcode),
    hub_arrived: extra.hub_arrived ?? Boolean(item.hub_arrived_at),
    hub_transit_released: extra.hub_transit_released ?? Boolean(item.hub_transit_released_at),
    hub_transit_shipped: extra.hub_transit_shipped ?? Boolean(item.hub_transit_shipped_at),
    customer_signed: extra.customer_signed ?? Boolean(item.customer_signed_at),
  };
}

export default function CameraScanScreen({ navigation }: { navigation: Nav }) {
  const { t, fmt } = useTranslation();
  const { store, hubCode, operatorName } = useAuth();
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [signRequest, setSignRequest] = useState<CustomerSignFlowRequest | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InventoryItemListRow[] | null>(null);
  const [shortage, setShortage] = useState<ShortagePrompt | null>(null);
  const [multiMode, setMultiMode] = useState(false);
  const [basket, setBasket] = useState<InventoryItem[]>([]);
  const busyRef = useRef(false);
  const pauseScanRef = useRef(false);
  const multiModeRef = useRef(false);
  const basketRef = useRef<InventoryItem[]>([]);
  multiModeRef.current = multiMode;
  basketRef.current = basket;

  const scope = store && hubCode ? { store, hubCode } : undefined;
  const dialogOpen = signRequest != null || invoiceItems != null || shortage != null;

  const openShortage = (
    item: InventoryItem,
    arrival: Extract<PackagingArrival, { kind: 'incomplete' }>,
  ) => {
    pauseScanRef.current = true;
    setShortage({
      target: {
        itemId: item.id,
        itemBarcode: item.barcode,
        expressBarcode: item.input_barcode,
        packBarcode: item.packed_bundle_barcode,
        itemName: item.name,
        qtyExpected: arrival.expected,
      },
      note: fmt(t.cameraScan.batchIncompleteNote, {
        expected: arrival.expected,
        arrived: arrival.arrived,
        missing: arrival.missing,
      }),
      qtyActual: String(arrival.arrived),
    });
  };

  const loadArrival = async (item: InventoryItem): Promise<PackagingArrival> => {
    const parsed = parsePackagingStockInLineBarcode(item.barcode);
    if (!parsed || parsed.total <= 1) return { kind: 'not_batch' };
    const pool = await listItems(parsed.base, scope, { force: true });
    const pieces = pool.map((row) => ({
      barcode: row.barcode,
      hub_arrived_at: row.id === item.id ? row.hub_arrived_at || item.hub_arrived_at : row.hub_arrived_at,
    }));
    if (!pool.some((row) => row.id === item.id)) {
      pieces.unshift({ barcode: item.barcode, hub_arrived_at: item.hub_arrived_at });
    }
    return assessPackagingArrival(item.barcode, pieces);
  };

  const presentInvoice = async (seeds: InventoryItem[]) => {
    if (!store || seeds.length === 0 || busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    try {
      for (const seed of seeds) {
        const arrival = await loadArrival(seed);
        if (arrival.kind === 'incomplete') {
          openShortage(seed, arrival);
          return;
        }
      }
      const selected = seeds.map(asInvoiceRow);
      const expanded = await resolvePackagingStockInSignIds(
        selected,
        selected,
        store,
        (keyword) => listItems(keyword, scope, { force: true }),
      );
      const rows = expanded.map((row) => asInvoiceRow(row as InventoryItem));
      if (rows.length === 0) {
        feedbackService.notify(t.common.tip, t.cameraScan.rejectSign);
        return;
      }
      pauseScanRef.current = true;
      setInvoiceItems(rows);
    } catch (e: unknown) {
      feedbackService.notify(t.common.fail, resolveAppError(t, e));
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  const rejectMulti = (reason: 'not_signable' | 'other_customer' | 'duplicate' | 'fee_unpaid') => {
    const message = {
      not_signable: t.cameraScan.rejectSign,
      other_customer: t.cameraScan.rejectCustomer,
      duplicate: t.cameraScan.rejectDuplicate,
      fee_unpaid: t.cameraScan.rejectFee,
    }[reason];
    feedbackService.notify(t.common.tip, message);
  };

  const handleMultiScan = async (item: InventoryItem | null, signable: boolean, feePaid: boolean) => {
    const anchor = basketRef.current[0];
    if (!item || !anchor) {
      rejectMulti('not_signable');
      return;
    }
    const sameCustomer = isSameSignCustomer(anchor, item);
    const alreadyIncluded = isAlreadyInPaidSignBasket(basketRef.current, item);
    const shouldCheckBatch = signable && sameCustomer && !alreadyIncluded && feePaid;
    const arrival = shouldCheckBatch ? await loadArrival(item) : { kind: 'not_batch' as const };
    const decision = decidePaidSignAdd({
      signable,
      sameCustomer,
      alreadyIncluded,
      feePaid,
      arrival,
    });
    if (!decision.ok) {
      if (decision.reason === 'incomplete_batch' && arrival.kind === 'incomplete') {
        openShortage(item, arrival);
        return;
      }
      if (decision.reason !== 'incomplete_batch') rejectMulti(decision.reason);
      return;
    }
    setBasket((prev) => {
      const next = [...prev, item];
      basketRef.current = next;
      return next;
    });
  };

  const handleScan = async (code: string) => {
    if (busyRef.current || pauseScanRef.current) return;
    busyRef.current = true;
    setLoading(true);
    setLookupError('');
    try {
      const [item, cloud] = await Promise.all([
        getItemByBarcode(code),
        findTrackingByAnyCode(code),
      ]);
      const pkg = cloud.pkg;
      const signable = Boolean(item && store && canMarkCustomerSigned(store, item));
      const route = resolveCameraScanRoute({
        code,
        hubCode: hubCode ?? '',
        hasLocalItem: item != null,
        canSign: signable,
        pkg: pkg
          ? {
              pack_barcode: pkg.pack_barcode,
              leg_destination_code: pkg.leg_destination_code,
              destination_code: pkg.destination_code,
              status: pkg.status,
            }
          : null,
      });
      let feePaid = false;
      if (signable && item?.packed_bundle_barcode?.trim()) {
        try {
          feePaid = await isHubTransportFeePaid(item.packed_bundle_barcode);
        } catch {
          feePaid = false;
        }
      }
      const actions = cameraScanManualActions({
        route,
        code,
        packBarcode: pkg?.pack_barcode,
      });
      const next: ScanResult = {
        code,
        item,
        cloudStatus: pkg ? getPkgStatusLabel(t, pkg.status) : null,
        cloudRoute: pkg ? formatScanCloudRoute(pkg) : null,
        route,
        hubPackBarcode: actions.hubPackBarcode,
        feePaid,
      };
      setResult(next);

      if (multiModeRef.current) {
        await handleMultiScan(item, signable, feePaid);
        return;
      }
      if (route.kind === 'hub_receive') {
        navigation.navigate('HubReceive', { openPackBarcode: route.packBarcode });
        return;
      }
      if (route.kind === 'stock_in') {
        navigation.navigate('StockIn', { presetBarcode: route.barcode });
        return;
      }
      if (route.kind === 'sign' && item && store && !feePaid) {
        await openSign(item);
      }
    } catch (e: unknown) {
      setLookupError(explainCloudOperationFailure(t, e, 'scan') ?? resolveAppError(t, e));
      setResult({
        code,
        item: null,
        cloudStatus: null,
        cloudRoute: null,
        route: null,
        hubPackBarcode: '',
        feePaid: false,
      });
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  const goTrack = () => {
    if (!result) return;
    navigation.navigate('TrackExpress', { presetCode: result.code });
  };

  const goStockIn = () => {
    if (!result) return;
    navigation.navigate('StockIn', { presetBarcode: result.code });
  };

  const goHubReceive = () => {
    if (!result?.hubPackBarcode) return;
    navigation.navigate('HubReceive', { openPackBarcode: result.hubPackBarcode });
  };

  const canSign = Boolean(result?.item && store && canMarkCustomerSigned(store, result.item));
  const showPaidSign = canSign && Boolean(result?.feePaid) && !multiMode;

  const openSign = async (item: InventoryItem) => {
    if (!store) return;
    const expanded = await resolvePackagingStockInSignIds(
      [item],
      [item],
      store,
      (keyword) => listItems(keyword, scope),
    );
    pauseScanRef.current = true;
    setSignRequest({
      itemIds: expanded.map((row) => row.id),
      operator: operatorName ?? t.common.operator,
      store,
    });
  };

  const beginSingle = () => {
    if (!result?.item) return;
    void presentInvoice([result.item]);
  };

  const beginMulti = async () => {
    const item = result?.item;
    if (!item || !store || busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    try {
      const arrival = await loadArrival(item);
      if (arrival.kind === 'incomplete') {
        openShortage(item, arrival);
        return;
      }
      basketRef.current = [item];
      multiModeRef.current = true;
      setBasket([item]);
      setMultiMode(true);
    } catch (e: unknown) {
      feedbackService.notify(t.common.fail, resolveAppError(t, e));
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  const finishMulti = () => {
    void presentInvoice(basketRef.current);
  };

  const cancelMulti = () => {
    multiModeRef.current = false;
    basketRef.current = [];
    setMultiMode(false);
    setBasket([]);
  };

  const continueToSign = (handoff: FrozenInvoiceHandoff) => {
    if (!store || handoff.itemIds.length === 0) return;
    pauseScanRef.current = true;
    setSignRequest({
      itemIds: handoff.itemIds,
      operator: operatorName ?? t.common.operator,
      store,
      frozenInvoice: handoff.document,
    });
    setInvoiceItems(null);
  };

  const releaseScan = () => {
    pauseScanRef.current = false;
  };

  return (
    <View style={styles.root}>
      <View style={styles.scannerArea}>
        <BarcodeScannerView
          active={isFocused && !dialogOpen}
          suspended={loading}
          preferLabelBarcodes={false}
          onScan={(code) => void handleScan(code)}
          subtitle={multiMode ? fmt(t.cameraScan.multiHint, { count: basket.length }) : t.cameraScan.subtitle}
        />
      </View>

      <View style={styles.resultPanel}>
        {multiMode ? (
          <View style={styles.multiBox}>
            <Text style={styles.multiHint}>{fmt(t.cameraScan.multiHint, { count: basket.length })}</Text>
            {basket.map((item) => (
              <Text key={item.id} style={styles.multiCode} selectable>
                {item.barcode}
              </Text>
            ))}
            <View style={styles.actions}>
              <Pressable
                style={[styles.actionSign, (loading || basket.length === 0) && styles.actionDisabled]}
                onPress={finishMulti}
                disabled={loading || basket.length === 0}
              >
                <Text style={styles.actionSignText}>{t.cameraScan.multiDone}</Text>
              </Pressable>
              <Pressable style={styles.action} onPress={cancelMulti} disabled={loading}>
                <Text style={styles.actionText}>{t.common.cancel}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#38bdf8" />
            <Text style={styles.loadingText}>{t.common.querying}</Text>
          </View>
        ) : null}
        {!result && !loading ? (
          <Text style={styles.placeholder}>{t.cameraScan.placeholder}</Text>
        ) : result && lookupError && !loading ? (
          <>
            <Text style={styles.code} selectable>
              {result.code}
            </Text>
            <Text style={styles.lookupError}>{lookupError}</Text>
          </>
        ) : result ? (
          <View style={loading ? styles.resultDimmed : undefined} pointerEvents={loading ? 'none' : 'auto'}>
            <Text style={styles.code} selectable>
              {result.code}
            </Text>
            <Text style={styles.meta}>
              {result.item
                ? `${t.common.localPrefix}${result.item.name} · ${fmt(t.common.stockQty, { qty: result.item.qty_on_hand })}`
                : t.common.localNotFound}
            </Text>
            {result.cloudStatus ? (
              <Text style={styles.meta}>
                {t.common.cloudPrefix}
                {result.cloudStatus}
                {result.cloudRoute ? ` · ${result.cloudRoute}` : ''}
              </Text>
            ) : (
              <Text style={styles.meta}>{t.common.cloudNoRecord}</Text>
            )}
            {result.feePaid ? <Text style={styles.feePaid}>{t.common.feePaid}</Text> : null}

            <View style={styles.actions}>
              <Pressable style={styles.actionPrimary} onPress={goTrack}>
                <Text style={styles.actionPrimaryText}>{t.cameraScan.trackDetail}</Text>
              </Pressable>
              {showPaidSign ? (
                <>
                  <Pressable style={styles.actionSign} onPress={beginSingle} disabled={loading}>
                    <Text style={styles.actionSignText}>{t.cameraScan.singleSign}</Text>
                  </Pressable>
                  <Pressable style={styles.actionMulti} onPress={() => void beginMulti()} disabled={loading}>
                    <Text style={styles.actionSignText}>{t.cameraScan.multiSign}</Text>
                  </Pressable>
                </>
              ) : null}
              {canSign && !result.feePaid ? (
                <Pressable
                  style={[styles.actionSign, signRequest && styles.actionDisabled]}
                  onPress={() => {
                    if (result.item) void openSign(result.item);
                  }}
                  disabled={signRequest != null}
                >
                  <Text style={styles.actionSignText}>
                    {signRequest ? t.common.signInProgress : t.common.signed}
                  </Text>
                </Pressable>
              ) : null}
              {result.route?.kind === 'stock_in' ? (
                <Pressable style={styles.action} onPress={goStockIn}>
                  <Text style={styles.actionText}>{t.cameraScan.goStockIn}</Text>
                </Pressable>
              ) : null}
              {result.hubPackBarcode ? (
                <Pressable style={styles.action} onPress={goHubReceive}>
                  <Text style={styles.actionText}>{t.cameraScan.goHubReceive}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>

      <BatchSignInvoiceModal
        visible={invoiceItems != null}
        selectedItems={invoiceItems ?? []}
        knownItems={invoiceItems ?? []}
        store={store}
        hubCode={hubCode}
        onClose={() => {
          setInvoiceItems(null);
          releaseScan();
        }}
        onContinue={continueToSign}
      />

      <CustomerSignFlowModal
        request={signRequest}
        onClose={() => {
          setSignRequest(null);
          releaseScan();
        }}
        resolveError={(e) => resolveAppError(t, e)}
        onSuccess={async (detail, signedCount) => {
          cancelMulti();
          const item = await getItemByBarcode(result?.code ?? detail.barcode);
          if (result) setResult({ ...result, item, feePaid: false });
          showTaskSuccess(
            t.common.signSuccess,
            signedCount > 1
              ? fmt(t.sign.batchSignedCount, { count: signedCount })
              : fmt(t.common.signMarked, { name: detail.name }),
          );
        }}
        onError={(message) => feedbackService.notify(t.common.signFailed, message)}
      />

      <ExceptionReportModal
        visible={shortage != null}
        target={shortage?.target ?? null}
        initialType={shortage ? 'shortage' : null}
        initialNote={shortage?.note ?? ''}
        initialQtyActual={shortage?.qtyActual ?? ''}
        onClose={() => {
          setShortage(null);
          releaseScan();
        }}
        onSubmitted={() => {
          setShortage(null);
          releaseScan();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  scannerArea: { flex: 1, minHeight: 300 },
  resultPanel: {
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.18)',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  placeholder: { color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 12 },
  resultDimmed: { opacity: 0.45 },
  loadingText: { color: '#94a3b8' },
  code: { color: '#fde68a', fontSize: 16, fontWeight: '900', fontFamily: 'monospace' },
  meta: { color: '#94a3b8', fontSize: 13, marginTop: 6, lineHeight: 18 },
  feePaid: { color: '#86efac', fontSize: 13, fontWeight: '800', marginTop: 6 },
  lookupError: { color: '#fca5a5', fontSize: 14, fontWeight: '700', marginTop: 8, lineHeight: 20 },
  multiBox: {
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.45)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  multiHint: { color: '#fde68a', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  multiCode: { color: '#e2e8f0', fontSize: 13, fontFamily: 'monospace', marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionPrimary: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  action: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#475569',
  },
  actionText: { color: '#cbd5e1', fontWeight: '700', fontSize: 13 },
  actionSign: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionMulti: {
    backgroundColor: '#b45309',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionSignText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  actionDisabled: { opacity: 0.65 },
});
