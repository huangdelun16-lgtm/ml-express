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
import PkgPickerField from '../components/PkgPickerField';
import StockOutSuccessModal, { type StockOutSuccessData } from '../components/StockOutSuccessModal';
import { useAuth } from '../contexts/AuthContext';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { requestAutoCloudSync } from '../services/cloudAutoSync';
import { applyTruckLoadOutbound, listOutboundPackages } from '../services/inventoryService';
import type { PackedShipmentDetail } from '../types/inventory';
import OutboundDateField from '../components/OutboundDateField';
import { formatDisplayDate, isValidIsoDate, todayIsoDate } from '../utils/dateFormat';
import { sanitizeNumberInput, sumPackageWeightsKg } from '../utils/itemFieldFormat';
import { resolveStoreOriginLabel, listOutboundDestinationOptions, isOwnStationOutboundDestination } from '../utils/storeZone';
import { fetchTruckRouteFee, formatTruckRouteLabel } from '../utils/truckRouteFee';
import { showTaskSuccess } from '../utils/taskSuccessAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'StockOut'>;

export default function StockOutScreen({ navigation }: Props) {
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
      if (store && hubCode) {
        requestAutoCloudSync(store, hubCode);
      }
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
    if (!destination.trim()) {
      Alert.alert('提示', '请选择目的地');
      return;
    }
    if (store && isOwnStationOutboundDestination(destination, store)) {
      Alert.alert('提示', '目的地不能为本站，请选择其他中转站');
      return;
    }
    if (selectedPacks.length === 0) {
      Alert.alert('提示', '请至少选择一个包装号');
      return;
    }
    if (!isValidIsoDate(outboundDate)) {
      Alert.alert('提示', '请选择有效的出库日期');
      return;
    }

    setLoading(true);
    try {
      const result = await applyTruckLoadOutbound({
        operator: operatorName ?? '工作人员',
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
      const cloudHint = result.cloudSynced
        ? '已同步云端，目的地站点可扫码收货'
        : result.cloudError
          ? `⚠️ 云端同步失败：${result.cloudError}\n目的地站点将无法扫码收货，请修复后补传云端`
          : store
            ? '⚠️ 未同步云端，目的地站点将无法扫码收货'
            : '';
      const destLabel = destination.trim();
      setSuccessData({
        destination: destLabel,
        count: result.count,
        totalWeight,
        cloudHint,
      });
      showTaskSuccess(
        '装车出库成功',
        `已成功出库 ${result.count} 包，目的地 ${destLabel}${
          totalWeight ? `，总重 ${totalWeight} Kg` : ''
        }${cloudHint ? `\n${cloudHint}` : ''}`,
      );
      resetForm();
      await loadPacks();
    } catch (e: unknown) {
      Alert.alert('失败', e instanceof Error ? e.message : '请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>🚚 装车出库</Text>
        <Text style={styles.subtitle}>
          先选 PKG 包装号，再选本段运达站（可与包装号标注的最终目的地不同，如经 MDY 中转）
        </Text>

        <View style={styles.formCard}>
          <PkgPickerField
            packs={packs}
            selectedIds={selectedIds}
            loading={loadingPacks}
            onToggle={togglePack}
            onClear={clearSelection}
          />

          <DestinationPickerField
            label="目的地"
            hint="本段卡车运达的中转站或终点站（不可选择本站）"
            value={destination}
            onChange={setDestination}
            options={outboundDestinationOptions}
          />

          <OutboundDateField value={outboundDate} onChange={setOutboundDate} />

          <Text style={styles.label}>出库数据</Text>
          <View style={styles.outboundStatsRow}>
            <View style={styles.outboundStat}>
              <Text style={styles.outboundStatValue}>
                {packageCount > 0 ? String(packageCount) : '—'}
              </Text>
              <Text style={styles.outboundStatUnit}>包</Text>
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
            <Text style={styles.fieldHint}>选择包装号后自动统计件数与总重量</Text>
          ) : null}

          <Text style={styles.label}>
            车费
            {routeLabel ? <Text style={styles.routeHint}> · {routeLabel}</Text> : null}
          </Text>
          <View style={styles.feeRow}>
            <TextInput
              style={styles.feeInput}
              value={transportFee}
              onChangeText={(v) => setTransportFee(sanitizeNumberInput(v))}
              placeholder={feeLoading ? '查询中…' : routeLabel ? '路线车费' : '请先选择目的地'}
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              editable={!feeLoading}
            />
            <Text style={styles.feeUnit}>MMK</Text>
          </View>
          {routeLabel ? (
            <Text style={styles.fieldHint}>
              按发站 {originLabel} 至目的地 {destination.trim().toUpperCase()} 的路线车费自动带出，可手动修改
            </Text>
          ) : null}

          <Text style={styles.label}>备注（可选）</Text>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder="车牌、司机、班次等"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {selectedPacks.length > 0 ? (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>装车摘要</Text>
            <Text style={styles.summaryLine}>
              运达 {destination || '未选目的地'} · {packageCount} 包
              {totalWeight ? ` · ${totalWeight} Kg` : ''}
              {transportFee ? ` · 车费 ${transportFee} MMK` : ''}
            </Text>
            <Text style={styles.summaryLine}>出库日期 {formatDisplayDate(outboundDate)}</Text>
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
        >
          <Text style={styles.btnText}>{loading ? '处理中…' : '确认装车出库'}</Text>
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
