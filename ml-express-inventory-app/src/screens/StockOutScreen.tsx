import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import CollapsingHomeHeader, { useCollapsingHomeScroll } from '../components/CollapsingHomeHeader';
import ScrollPositionRail from '../components/ScrollPositionRail';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DestinationPickerField from '../components/DestinationPickerField';
import PkgPickerField from '../components/PkgPickerField';
import ScanInputBar from '../components/ScanInputBar';
import StockOutSuccessModal, { type StockOutSuccessData } from '../components/StockOutSuccessModal';
import { useAuth } from '../contexts/AuthContext';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTranslation, resolveAppError } from '../i18n';
import { explainCloudOperationFailure } from '../utils/cloudOperationFailure';
import {
  applyTruckLoadOutbound,
  ensureCloudPackRegistered,
  getItemByBarcode,
  getPackedShipmentByBarcode,
  getPackedShipmentContainingItem,
  listOutboundPackages,
} from '../services/inventoryService';
import { feedbackService } from '../services/FeedbackService';
import { refreshCache } from '../services/inventoryCloudStore';
import type { PackedShipmentDetail } from '../types/inventory';
import OutboundDateField from '../components/OutboundDateField';
import { formatDisplayDate, isValidIsoDate, todayIsoDate } from '../utils/dateFormat';
import { sanitizeNumberInput, sumPackageWeightsKg } from '../utils/itemFieldFormat';
import {
  classifyUnresolvedTruckLoadScan,
  matchPendingTruckLoadScan,
  packOutboundDestination,
  truckLoadDestinationConflict,
  type TruckLoadScanReject,
} from '../utils/matchTruckLoadScan';
import { destinationCodesMatch } from '../utils/destinationCode';
import { resolveStoreOriginLabel, listOutboundDestinationOptions, isOwnStationOutboundDestination } from '../utils/storeZone';
import { fetchTruckRouteFee, formatTruckRouteLabel } from '../utils/truckRouteFee';
import { peekNextTripNumber } from '../services/tripNumberService';

type Props = NativeStackScreenProps<RootStackParamList, 'StockOut'>;

export default function StockOutScreen({ navigation }: Props) {
  const { t, fmt } = useTranslation();
  const { scrollY, onScroll } = useCollapsingHomeScroll();
  const [listViewport, setListViewport] = useState(0);
  const [listContent, setListContent] = useState(0);
  const { operatorName, store, hubCode } = useAuth();
  const [packs, setPacks] = useState<PackedShipmentDetail[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [destination, setDestination] = useState('');
  const destinationRef = useRef(destination);
  destinationRef.current = destination;
  const [outboundDate, setOutboundDate] = useState(todayIsoDate());
  const [transportFee, setTransportFee] = useState('');
  const [tripNumberPreview, setTripNumberPreview] = useState('');
  const [tripLoading, setTripLoading] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanBusy, setScanBusy] = useState(false);
  const [successData, setSuccessData] = useState<StockOutSuccessData | null>(null);
  const [lastScan, setLastScan] = useState<{ tone: 'ok' | 'warn' | 'bad'; text: string } | null>(null);

  const originLabel = store ? resolveStoreOriginLabel(store) : '';
  const routeLabel = formatTruckRouteLabel(originLabel, destination);
  const outboundDestinationOptions = useMemo(
    () => listOutboundDestinationOptions(store),
    [store],
  );

  useEffect(() => {
    if (store && destination && isOwnStationOutboundDestination(destination, store)) {
      setDestination('');
      setTransportFee('');
    }
  }, [store, destination]);

  const loadPacks = useCallback(async () => {
    setLoadingPacks(true);
    try {
      const scope = store && hubCode ? { store, hubCode } : undefined;
      if (scope) {
        await refreshCache(scope.store, scope.hubCode, { force: true });
      }
      setPacks(await listOutboundPackages(scope));
    } finally {
      setLoadingPacks(false);
    }
  }, [store, hubCode]);

  useFocusEffect(
    useCallback(() => {
      void loadPacks();
    }, [loadPacks]),
  );

  useEffect(() => {
    if (!store) {
      setTripNumberPreview('');
      return;
    }
    let cancelled = false;
    setTripLoading(true);
    void peekNextTripNumber(store)
      .then((trip) => {
        if (!cancelled) setTripNumberPreview(trip ?? '');
      })
      .finally(() => {
        if (!cancelled) setTripLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  useEffect(() => {
    if (!store || !destination.trim()) {
      setTransportFee('');
      return;
    }
    let cancelled = false;
    setFeeLoading(true);
    void fetchTruckRouteFee(originLabel, destination)
      .then((fee) => {
        if (cancelled) return;
        if (fee != null) setTransportFee(String(fee % 1 === 0 ? fee : fee.toFixed(2)));
      })
      .finally(() => {
        if (!cancelled) setFeeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [store, originLabel, destination]);

  const selectedPacks = useMemo(
    () => packs.filter((p) => selectedIds.has(p.id)),
    [packs, selectedIds],
  );

  const packageCount = selectedPacks.length;
  const totalWeight = useMemo(
    () => sumPackageWeightsKg(selectedPacks.map((p) => p.weight)),
    [selectedPacks],
  );

  const togglePack = (pack: PackedShipmentDetail) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pack.id)) next.delete(pack.id);
      else next.add(pack.id);
      return next;
    });
  };

  const addScannedPack = (pack: PackedShipmentDetail, dest: string) => {
    let duplicate = false;
    setSelectedIds((prev) => {
      if (prev.has(pack.id)) {
        duplicate = true;
        return prev;
      }
      const next = new Set(prev);
      next.add(pack.id);
      return next;
    });
    if (duplicate) {
      const text = t.stockOut.scanLoadDuplicate;
      setLastScan({ tone: 'warn', text });
      feedbackService.info(text);
      return;
    }
    const text = dest
      ? fmt(t.stockOut.scanLoadAddedDest, { code: pack.bundle_barcode, dest })
      : fmt(t.stockOut.scanLoadAdded, { code: pack.bundle_barcode });
    setLastScan({ tone: 'ok', text });
    feedbackService.info(text);
  };

  const rejectScan = (reason: TruckLoadScanReject) => {
    const message =
      reason === 'already_selected'
        ? t.stockOut.scanLoadDuplicate
        : reason === 'not_inbound'
          ? t.stockOut.scanLoadNotInbound
          : reason === 'not_packed'
            ? t.stockOut.scanLoadNotPacked
            : reason === 'already_loaded'
              ? t.stockOut.scanLoadAlreadyLoaded
              : t.stockOut.scanLoadNotFound;
    setLastScan({ tone: reason === 'already_selected' ? 'warn' : 'bad', text: message });
    feedbackService.notify(t.common.tip, message);
  };

  const acceptPackForLoad = (pack: PackedShipmentDetail): string | null => {
    const dest = packOutboundDestination(pack);
    if (store && dest && isOwnStationOutboundDestination(dest, store)) {
      setLastScan({ tone: 'bad', text: t.stockOut.alertOwnStation });
      feedbackService.notify(t.common.tip, t.stockOut.alertOwnStation);
      return null;
    }
    const gate = truckLoadDestinationConflict(dest, destinationRef.current);
    if (gate === 'conflict') {
      const message = fmt(t.stockOut.scanLoadWrongDest, {
        dest,
        current: destinationRef.current.trim(),
      });
      setLastScan({ tone: 'bad', text: message });
      feedbackService.notify(t.common.tip, message);
      return null;
    }
    if (gate === 'fill') {
      const option = outboundDestinationOptions.find((item) => destinationCodesMatch(item, dest));
      if (option) {
        destinationRef.current = option;
        setDestination(option);
      }
    }
    return dest;
  };

  const handleScanLoad = async (raw: string) => {
    if (scanBusy || loading) return;
    setScanInput('');
    const pending = matchPendingTruckLoadScan(raw, packs, selectedIds);
    if (pending.kind === 'hit') {
      const dest = acceptPackForLoad(pending.pack);
      if (dest == null) return;
      addScannedPack(pending.pack, dest);
      return;
    }
    if (pending.reason === 'already_selected') {
      rejectScan('already_selected');
      return;
    }

    setScanBusy(true);
    try {
      const item = await getItemByBarcode(raw);
      let pack = await getPackedShipmentByBarcode(raw);
      if (!pack && item) {
        pack = await getPackedShipmentContainingItem(item.id);
        if (!pack && item.packed_bundle_barcode?.trim()) {
          pack = await getPackedShipmentByBarcode(item.packed_bundle_barcode);
        }
      }
      const listed = pack
        ? packs.find(
            (row) =>
              row.id === pack!.id ||
              row.bundle_barcode.trim().toUpperCase() === pack!.bundle_barcode.trim().toUpperCase(),
          )
        : undefined;
      if (listed) {
        const dest = acceptPackForLoad(listed);
        if (dest == null) return;
        addScannedPack(listed, dest);
        return;
      }
      if (pack && store) {
        const dest = acceptPackForLoad(pack);
        if (dest == null) return;
        const registered = await ensureCloudPackRegistered(pack, store).catch(() => false);
        if (registered) {
          addScannedPack(pack, dest);
          setPacks((prev) => (prev.some((row) => row.id === pack.id) ? prev : [...prev, pack]));
          return;
        }
      }
      rejectScan(classifyUnresolvedTruckLoadScan({ item, pack }));
    } catch (e: unknown) {
      feedbackService.notify(
        t.common.fail,
        explainCloudOperationFailure(t, e, 'stockOut') ?? resolveAppError(t, e),
      );
    } finally {
      setScanBusy(false);
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const resetForm = () => {
    setSelectedIds(new Set());
    setScanInput('');
    setLastScan(null);
    setDestination('');
    setOutboundDate(todayIsoDate());
    setTransportFee('');
    setTripNumberPreview('');
    setNote('');
  };

  const refreshTripPreview = useCallback(async () => {
    if (!store) {
      setTripNumberPreview('');
      return;
    }
    setTripLoading(true);
    try {
      setTripNumberPreview((await peekNextTripNumber(store)) ?? '');
    } finally {
      setTripLoading(false);
    }
  }, [store]);

  const handleSuccessDone = useCallback(() => {
    setSuccessData(null);
    navigation.navigate('Home');
  }, [navigation]);

  const submit = async () => {
    if (loading) return;
    if (!destination.trim()) {
      feedbackService.notify(t.common.tip, t.stockOut.alertSelectDest);
      return;
    }
    if (store && isOwnStationOutboundDestination(destination, store)) {
      feedbackService.notify(t.common.tip, t.stockOut.alertOwnStation);
      return;
    }
    if (selectedPacks.length === 0) {
      feedbackService.notify(t.common.tip, t.stockOut.alertSelectPack);
      return;
    }
    if (!isValidIsoDate(outboundDate)) {
      feedbackService.notify(t.common.tip, t.stockOut.alertInvalidDate);
      return;
    }
    if (!transportFee.trim() || Number(transportFee) <= 0) {
      feedbackService.notify(t.common.tip, t.stockOut.alertTransportFee);
      return;
    }

    setLoading(true);
    try {
      const result = await applyTruckLoadOutbound({
        operator: operatorName ?? t.common.operator,
        destination: destination.trim(),
        outboundDate: outboundDate.trim(),
        packs: selectedPacks,
        totalWeightKg: totalWeight,
        transportFee: transportFee.trim(),
        note: note.trim(),
        originStore: store
          ? { id: store.id, storeCode: store.storeCode, storeName: store.storeName }
          : undefined,
        actingStore: store ?? undefined,
      });
      const cloudStatus = result.cloudSynced
        ? ('synced' as const)
        : result.cloudError
          ? ('failed' as const)
          : store
            ? ('skipped' as const)
            : ('synced' as const);
      const destLabel = destination.trim();
      setSuccessData({
        destination: destLabel,
        count: result.count,
        totalWeight,
        tripNumber: result.tripNumber,
        transportFee: transportFee.trim(),
        cloudStatus,
        cloudError: result.cloudError
          ? explainCloudOperationFailure(t, new Error(result.cloudError), 'stockOut') ??
            resolveAppError(t, new Error(result.cloudError))
          : undefined,
        packBarcodes: selectedPacks.map((p) => p.bundle_barcode),
      });
      resetForm();
      await loadPacks();
      await refreshTripPreview();
    } catch (e: unknown) {
      feedbackService.notify(
        t.common.fail,
        explainCloudOperationFailure(t, e, 'stockOut') ?? resolveAppError(t, e),
      );
    } finally {
      setLoading(false);
    }
  };

  const summaryWeightPart = totalWeight
    ? fmt(t.stockOut.summaryWeight, { weight: totalWeight })
    : '';
  const summaryFeePart = transportFee
    ? fmt(t.stockOut.summaryFee, { fee: transportFee })
    : '';

  return (
    <View style={styles.root}>
    <CollapsingHomeHeader title={t.nav.stockOut} onHome={() => navigation.goBack()} scrollY={scrollY} />
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.scroll} onLayout={(event) => setListViewport(event.nativeEvent.layout.height)}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
        onContentSizeChange={(_, height) => setListContent(height)}
      >
        <Text style={styles.subtitle}>{t.stockOut.subtitle}</Text>

        <ScanInputBar
          value={scanInput}
          onChangeText={setScanInput}
          onSubmit={(code) => void handleScanLoad(code)}
          busy={scanBusy || loading || loadingPacks}
          scanBtnLabel={t.scanInput.cameraContinuous}
          tone="dark"
          label={t.stockOut.scanLoadLabel}
          hint={t.stockOut.scanLoadHint}
          placeholder={t.stockOut.scanLoadPlaceholder}
          cameraScan={{
            title: t.stockOut.scanLoadCameraTitle,
            subtitle: lastScan?.text || t.stockOut.scanLoadCameraSubtitle,
            continuous: true,
            scannedCount: selectedIds.size,
            scannedList: (
              <TruckLoadScanList
                packs={selectedPacks}
                emptyLabel={t.stockOut.scanLoadListEmpty}
                removeLabel={t.stockOut.scanLoadRemove}
                onRemove={togglePack}
              />
            ),
          }}
        />
        {lastScan ? (
          <View
            style={[
              styles.scanBanner,
              lastScan.tone === 'ok'
                ? styles.scanBannerOk
                : lastScan.tone === 'warn'
                  ? styles.scanBannerWarn
                  : styles.scanBannerBad,
            ]}
          >
            <Text style={styles.scanBannerText}>{lastScan.text}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <PkgPickerField
            packs={packs}
            selectedIds={selectedIds}
            loading={loadingPacks}
            onToggle={togglePack}
            onClear={clearSelection}
          />

          <DestinationPickerField
            label={t.stockOut.destination}
            hint={t.stockOut.destinationHint}
            value={destination}
            onChange={setDestination}
            options={outboundDestinationOptions}
          />

          <OutboundDateField value={outboundDate} onChange={setOutboundDate} />

          <Text style={styles.label}>{t.stockOut.outboundData}</Text>
          <View style={styles.outboundStatsRow}>
            <View style={styles.outboundStat}>
              <Text style={styles.outboundStatValue}>
                {packageCount > 0 ? String(packageCount) : '—'}
              </Text>
              <Text style={styles.outboundStatUnit}>{t.stockOut.packUnit}</Text>
            </View>
            <Text style={styles.outboundDivider}>·</Text>
            <View style={styles.outboundStat}>
              <Text style={styles.outboundStatValue}>
                {totalWeight || (packageCount > 0 ? '0' : '—')}
              </Text>
              <Text style={styles.outboundStatUnit}>Kg</Text>
            </View>
          </View>
          {packageCount === 0 ? (
            <Text style={styles.fieldHint}>{t.stockOut.selectPackHint}</Text>
          ) : null}

          <Text style={styles.label}>
            {t.stockOut.transportFee} *
            {routeLabel ? <Text style={styles.routeHint}> · {routeLabel}</Text> : null}
          </Text>
          <View style={styles.feeRow}>
            <TextInput
              style={styles.feeInput}
              value={transportFee}
              onChangeText={(v) => setTransportFee(sanitizeNumberInput(v))}
              placeholder={
                feeLoading
                  ? t.stockOut.feeLoading
                  : routeLabel
                    ? t.stockOut.feeRoute
                    : t.stockOut.feeSelectDest
              }
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              editable={!feeLoading}
            />
            <Text style={styles.feeUnit}>MMK</Text>
          </View>
          {routeLabel ? (
            <Text style={styles.fieldHint}>
              {fmt(t.stockOut.feeAutoHint, {
                origin: originLabel,
                dest: destination.trim().toUpperCase(),
              })}
            </Text>
          ) : null}
          {packageCount > 0 ? (
            <Text style={styles.fieldHint}>{fmt(t.stockOut.tripFeeHint, { count: packageCount })}</Text>
          ) : null}

          <Text style={styles.label}>{t.stockOut.tripNumber}</Text>
          <View style={styles.tripBox}>
            <Text style={styles.tripValue}>
              {tripLoading ? t.stockOut.tripLoading : tripNumberPreview || '—'}
            </Text>
          </View>
          <Text style={styles.fieldHint}>{t.stockOut.tripHint}</Text>

          <Text style={styles.label}>{t.stockOut.noteOptional}</Text>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder={t.stockOut.notePlaceholder}
            placeholderTextColor="#94a3b8"
          />
        </View>

        {selectedPacks.length > 0 ? (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>{t.stockOut.summaryTitle}</Text>
            <Text style={styles.summaryLine}>
              {fmt(t.stockOut.summaryLine, {
                dest: destination || t.stockOut.noDest,
                count: packageCount,
                weight: summaryWeightPart,
                fee: summaryFeePart,
              })}
            </Text>
            <Text style={styles.summaryLine}>
              {fmt(t.stockOut.summaryDate, { date: formatDisplayDate(outboundDate) })}
            </Text>
            {selectedPacks.map((pack) => (
              <Text key={pack.id} style={styles.summaryPack} numberOfLines={1}>
                · {pack.bundle_barcode}
                {pack.weight ? ` (${pack.weight})` : ''}
              </Text>
            ))}
          </View>
        ) : null}

        <Pressable
          style={[styles.btn, (selectedPacks.length === 0 || loading) && styles.btnDisabled]}
          onPress={submit}
          disabled={loading || selectedPacks.length === 0}
          accessibilityRole="button"
          accessibilityLabel={loading ? t.common.processing : t.stockOut.submit}
        >
          <Text style={styles.btnText}>
            {loading ? t.common.processing : t.stockOut.submit}
          </Text>
        </Pressable>
      </ScrollView>
      <ScrollPositionRail scrollY={scrollY} viewportHeight={listViewport} contentHeight={listContent} />
      </View>

      <StockOutSuccessModal
        visible={!!successData}
        data={successData}
        onDone={handleSuccessDone}
      />
    </KeyboardAvoidingView>
    </View>
  );
}

function TruckLoadScanList({
  packs,
  emptyLabel,
  removeLabel,
  onRemove,
}: {
  packs: PackedShipmentDetail[];
  emptyLabel: string;
  removeLabel: string;
  onRemove: (pack: PackedShipmentDetail) => void;
}) {
  if (packs.length === 0) {
    return <Text style={styles.scanListEmpty}>{emptyLabel}</Text>;
  }
  return (
    <View style={styles.scanList}>
      {packs.map((pack) => {
        const dest = packOutboundDestination(pack);
        return (
          <View key={pack.id} style={styles.scanListRow}>
            <View style={styles.scanListCopy}>
              <Text style={styles.scanListCode} numberOfLines={1}>
                {pack.bundle_barcode}
              </Text>
              <Text style={styles.scanListMeta} numberOfLines={1}>
                {[pack.bundle_name, dest].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Pressable onPress={() => onRemove(pack)} hitSlop={8} accessibilityRole="button">
              <Text style={styles.scanListRemove}>{removeLabel}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  subtitle: { color: '#94a3b8', fontSize: 13, lineHeight: 20, marginBottom: 16 },
  scanBanner: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  scanBannerOk: { backgroundColor: '#064e3b', borderColor: '#34d399' },
  scanBannerWarn: { backgroundColor: '#78350f', borderColor: '#fbbf24' },
  scanBannerBad: { backgroundColor: '#7f1d1d', borderColor: '#fca5a5' },
  scanBannerText: { color: '#f8fafc', fontSize: 14, fontWeight: '800', lineHeight: 20 },
  scanList: { gap: 8 },
  scanListEmpty: { color: '#94a3b8', fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  scanListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  scanListCopy: { flex: 1, minWidth: 0 },
  scanListCode: { color: '#f8fafc', fontSize: 15, fontWeight: '800' },
  scanListMeta: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  scanListRemove: { color: '#fca5a5', fontSize: 13, fontWeight: '800' },
  formCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summary: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  summaryTitle: { color: '#fca5a5', fontSize: 12, fontWeight: '800', marginBottom: 8 },
  summaryLine: { color: '#e2e8f0', fontSize: 15, fontWeight: '800' },
  summaryPack: { color: '#94a3b8', fontSize: 12, marginTop: 4, fontFamily: 'monospace' },
  label: { color: '#e2e8f0', fontWeight: '700', marginBottom: 8, fontSize: 13 },
  routeHint: { color: '#7dd3fc', fontWeight: '700' },
  fieldHint: { color: '#64748b', fontSize: 11, lineHeight: 16, marginBottom: 12 },
  outboundStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 4,
    gap: 10,
  },
  outboundStat: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  outboundStatValue: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  outboundStatUnit: { color: '#475569', fontSize: 14, fontWeight: '800' },
  outboundDivider: { color: '#94a3b8', fontSize: 18, fontWeight: '300' },
  feeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  feeInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '700',
  },
  feeUnit: { color: '#94a3b8', fontWeight: '800', fontSize: 14, paddingBottom: 2 },
  tripBox: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  tripValue: {
    color: '#7dd3fc',
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  btn: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
