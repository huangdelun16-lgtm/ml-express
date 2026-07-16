import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DestinationPickerField from '../components/DestinationPickerField';
import OnlineRequiredBanner from '../components/OnlineRequiredBanner';
import PkgPickerField from '../components/PkgPickerField';
import StockOutSuccessModal, { type StockOutSuccessData } from '../components/StockOutSuccessModal';
import { useAuth } from '../contexts/AuthContext';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTranslation, resolveAppError } from '../i18n';
import { applyTruckLoadOutbound, listOutboundPackages } from '../services/inventoryService';
import type { PackedShipmentDetail } from '../types/inventory';
import OutboundDateField from '../components/OutboundDateField';
import { formatDisplayDate, isValidIsoDate, todayIsoDate } from '../utils/dateFormat';
import { sanitizeNumberInput, sumPackageWeightsKg } from '../utils/itemFieldFormat';
import { resolveStoreOriginLabel, listOutboundDestinationOptions, isOwnStationOutboundDestination } from '../utils/storeZone';
import { fetchTruckRouteFee, formatTruckRouteLabel } from '../utils/truckRouteFee';

type Props = NativeStackScreenProps<RootStackParamList, 'StockOut'>;

export default function StockOutScreen({ navigation }: Props) {
  const { t, fmt } = useTranslation();
  const { operatorName, store, hubCode } = useAuth();
  const [packs, setPacks] = useState<PackedShipmentDetail[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [destination, setDestination] = useState('');
  const [outboundDate, setOutboundDate] = useState(todayIsoDate());
  const [transportFee, setTransportFee] = useState('');
  const [feeLoading, setFeeLoading] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<StockOutSuccessData | null>(null);

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

  const clearSelection = () => setSelectedIds(new Set());

  const resetForm = () => {
    setSelectedIds(new Set());
    setDestination('');
    setOutboundDate(todayIsoDate());
    setTransportFee('');
    setNote('');
  };

  const handleSuccessDone = useCallback(() => {
    setSuccessData(null);
    navigation.navigate('Home');
  }, [navigation]);

  const submit = async () => {
    if (loading) return;
    if (!destination.trim()) {
      Alert.alert(t.common.tip, t.stockOut.alertSelectDest);
      return;
    }
    if (store && isOwnStationOutboundDestination(destination, store)) {
      Alert.alert(t.common.tip, t.stockOut.alertOwnStation);
      return;
    }
    if (selectedPacks.length === 0) {
      Alert.alert(t.common.tip, t.stockOut.alertSelectPack);
      return;
    }
    if (!isValidIsoDate(outboundDate)) {
      Alert.alert(t.common.tip, t.stockOut.alertInvalidDate);
      return;
    }
    if (!transportFee.trim() || Number(transportFee) <= 0) {
      Alert.alert(t.common.tip, t.stockOut.alertTransportFee);
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
        cloudStatus,
        cloudError: result.cloudError
          ? resolveAppError(t, new Error(result.cloudError))
          : undefined,
        packBarcodes: selectedPacks.map((p) => p.bundle_barcode),
      });
      resetForm();
      await loadPacks();
    } catch (e: unknown) {
      Alert.alert(t.common.fail, resolveAppError(t, e));
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
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t.stockOut.title}</Text>
        <Text style={styles.subtitle}>{t.stockOut.subtitle}</Text>
        <OnlineRequiredBanner />

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

      <StockOutSuccessModal
        visible={!!successData}
        data={successData}
        onDone={handleSuccessDone}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  subtitle: { color: '#94a3b8', fontSize: 13, lineHeight: 20, marginBottom: 16 },
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
