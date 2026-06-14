import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ScanInputBar from '../components/ScanInputBar';
import { useAuth } from '../contexts/AuthContext';
import { markCustomerSigned, trackOrderByCode } from '../services/inventoryService';
import { findTrackingByAnyCode } from '../services/trackingService';
import type { PackedShipmentDetail, TrackOrderResult } from '../types/inventory';
import type { OrderTrackingRecord, PkgTrackingDetail } from '../types/tracking';
import { ORDER_STATUS_LABEL, PKG_STATUS_LABEL } from '../types/tracking';
import { canMarkCustomerSigned } from '../utils/customerSign';
import { stockUnitLabel } from '../utils/itemFieldFormat';
import { showTaskSuccess } from '../utils/taskSuccessAlert';

type Route = { params?: { presetCode?: string } };

const MATCH_LABEL: Record<TrackOrderResult['matchType'], string> = {
  express: '快递单',
  inbound: '入库条码',
  package: '包装号',
};

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

function LoadStatusBadge({ loaded }: { loaded: boolean }) {
  return (
    <View style={[styles.statusBadge, loaded ? styles.statusLoaded : styles.statusPending]}>
      <Text style={[styles.statusText, loaded ? styles.statusLoadedText : styles.statusPendingText]}>
        {loaded ? '已装车' : '未装车'}
      </Text>
    </View>
  );
}

function PackSection({ pack, title }: { pack: PackedShipmentDetail; title: string }) {
  return (
    <>
      <Section title={title}>
        <View style={styles.packHeader}>
          <DetailRow label="包装号" value={pack.bundle_barcode} />
          <LoadStatusBadge loaded={pack.loaded} />
        </View>
        <DetailRow label="包裹名称" value={pack.bundle_name} />
        <DetailRow label="规格" value={pack.spec} />
        <DetailRow label="单位" value={pack.unit} />
        <DetailRow label="重量" value={pack.weight} />
        <DetailRow label="打包人" value={pack.operator} />
        <DetailRow label="打包时间" value={formatTime(pack.created_at)} />
      </Section>

      <Section title={`内含商品（${pack.items.length} 件）`}>
        {pack.items.map((line) => (
          <View key={line.id} style={styles.packLine}>
            <Text style={styles.packLineName}>{line.item_name}</Text>
            {line.input_barcode ? (
              <Text style={styles.packLineCode} selectable>
                快递单 {line.input_barcode}
              </Text>
            ) : null}
            <Text style={styles.packLineCode} selectable>
              入库 {line.item_barcode}
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
  if (!pkg) return null;
  return (
    <Section title="云端在途位置">
      <DetailRow label="快递包" value={pkg.pack_barcode} />
      <DetailRow label="在途状态" value={PKG_STATUS_LABEL[pkg.status]} />
      <DetailRow label="发站" value={`${pkg.origin_store_code} ${pkg.origin_store_name}`} />
      <DetailRow label="目的地" value={pkg.destination_code} />
      <DetailRow
        label="订单进度"
        value={`${pkg.received_order_count}/${pkg.item_count} 已确认`}
      />
      {pkg.hub_received_by_store_code ? (
        <DetailRow label="到站站点" value={pkg.hub_received_by_store_code} />
      ) : null}
      {order ? (
        <DetailRow label="本单状态" value={ORDER_STATUS_LABEL[order.status]} />
      ) : null}
      {pkg.orders.map((line) => (
        <View key={line.id} style={styles.packLine}>
          <Text style={styles.packLineName}>{line.order_name}</Text>
          <Text style={styles.packLineCode}>
            {ORDER_STATUS_LABEL[line.status]}
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
}: {
  result: TrackOrderResult;
  cloudPkg: PkgTrackingDetail | null;
  cloudOrder: OrderTrackingRecord | null;
  canSignDelivered?: boolean;
  signing?: boolean;
  onSignDelivered?: () => void;
}) {
  const { detail, parentPack, truckLoad } = result;
  const activePack = detail.pack ?? parentPack;
  const showSign = canSignDelivered && onSignDelivered;

  return (
    <View style={styles.result}>
      <View style={styles.matchBanner}>
        <Text style={styles.matchLabel}>匹配类型：{MATCH_LABEL[result.matchType]}</Text>
        <Text style={styles.matchQuery} selectable>
          {result.query}
        </Text>
      </View>

      <Text style={styles.heroName}>{detail.name}</Text>
      <Text style={styles.heroMeta}>
        库存 {detail.qty_on_hand} {stockUnitLabel()}
      </Text>

      {activePack ? (
        <View style={styles.loadRow}>
          <Text style={styles.loadLabel}>装车状态</Text>
          <LoadStatusBadge loaded={activePack.loaded} />
        </View>
      ) : null}

      {truckLoad ? (
        <Section title="装车出库记录">
          <DetailRow label="出库日期" value={truckLoad.outboundDate} />
          <DetailRow label="目的地" value={truckLoad.destination} />
          <DetailRow label="操作人" value={truckLoad.operator} />
          <DetailRow label="记录时间" value={formatTime(truckLoad.created_at)} />
        </Section>
      ) : activePack && !activePack.loaded ? (
        <View style={styles.pendingHint}>
          <Text style={styles.pendingHintText}>包裹已打包，尚未装车出库</Text>
        </View>
      ) : null}

      <Section title="收发信息">
        <DetailRow label="客户姓名" value={detail.customer_name} />
        <DetailRow label="联系电话" value={detail.recipient_phone} />
        <DetailRow label="目的地" value={detail.destination} />
        <DetailRow label="商品包装" value={detail.packaging} />
      </Section>

      <Section title="商品信息">
        <DetailRow label="商品名称" value={detail.name} />
        <DetailRow label="规格" value={detail.spec} />
        <DetailRow label="单位" value={detail.unit} />
        <DetailRow label="重量" value={detail.weight} />
      </Section>

      <Section title="条码信息">
        <DetailRow label="快递单" value={detail.input_barcode} />
        <DetailRow label="入库条码" value={detail.barcode} />
      </Section>

      {detail.note ? (
        <Section title="备注">
          <Text style={styles.noteText} selectable>
            {detail.note}
          </Text>
        </Section>
      ) : null}

      {detail.pack ? <PackSection pack={detail.pack} title="包裹信息" /> : null}
      {parentPack ? <PackSection pack={parentPack} title="所属 PKG" /> : null}

      <CloudTrackSection pkg={cloudPkg} order={cloudOrder} />

      {result.recentMovements.length > 0 ? (
        <Section title="最近流水">
          {result.recentMovements.map((m) => (
            <View key={m.id} style={styles.movementLine}>
              <Text style={styles.movementType}>
                {m.type === 'in' ? '入库' : m.type === 'out' ? '出库' : '调整'} · {m.qty}
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
          <Text style={styles.signBtnText}>{signing ? '签收中…' : '✓ 已签收'}</Text>
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
  return (
    <View style={styles.result}>
      <View style={styles.matchBanner}>
        <Text style={styles.matchLabel}>云端追踪（跨站包裹）</Text>
        <Text style={styles.matchQuery} selectable>
          {pkg.pack_barcode}
        </Text>
      </View>
      <CloudTrackSection pkg={pkg} order={order} />
    </View>
  );
}

export default function TrackExpressScreen({ route }: { route?: Route }) {
  const { store, operatorName } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [result, setResult] = useState<TrackOrderResult | null>(null);
  const [cloudPkg, setCloudPkg] = useState<PkgTrackingDetail | null>(null);
  const [cloudOrder, setCloudOrder] = useState<OrderTrackingRecord | null>(null);
  const [notFound, setNotFound] = useState(false);

  const search = useCallback(async (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setCode(q);
    setLoading(true);
    setNotFound(false);
    setResult(null);
    setCloudPkg(null);
    setCloudOrder(null);
    try {
      const [tracked, cloud] = await Promise.all([
        trackOrderByCode(q),
        findTrackingByAnyCode(q),
      ]);
      setCloudPkg(cloud.pkg);
      setCloudOrder(cloud.order);
      if (tracked) {
        setResult(tracked);
      } else if (cloud.pkg) {
        setNotFound(false);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const preset = route?.params?.presetCode;
    if (preset) void search(preset);
  }, [route?.params?.presetCode, search]);

  const canSign = Boolean(
    result && store && canMarkCustomerSigned(store, result.detail),
  );

  const handleSign = async () => {
    if (!result || !store) return;
    setSigning(true);
    try {
      await markCustomerSigned(result.detail.id, operatorName ?? '工作人员', store);
      const refreshed = await trackOrderByCode(result.query);
      if (refreshed) setResult(refreshed);
      showTaskSuccess('签收成功', `${result.detail.name} 已标记为客户已签收`);
    } catch (e: unknown) {
      Alert.alert('签收失败', e instanceof Error ? e.message : '请重试');
    } finally {
      setSigning(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>输入或扫描快递单号、入库条码，查看订单完整详情与装车状态。</Text>

      <ScanInputBar
        value={code}
        onChangeText={setCode}
        onSubmit={search}
        busy={loading}
        cameraScan={{
          title: '追踪扫码',
          subtitle: '支持快递单、入库条码、PKG 包装号',
        }}
        placeholder="快递单 / 入库条码 / 包装号"
      />

      <Pressable
        style={[styles.searchBtn, loading && styles.searchBtnDisabled]}
        onPress={() => void search(code)}
        disabled={loading}
      >
        <Text style={styles.searchBtnText}>查询</Text>
      </Pressable>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#38bdf8" />
          <Text style={styles.loadingText}>查询中…</Text>
        </View>
      ) : null}

      {notFound ? (
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>未找到订单</Text>
          <Text style={styles.notFoundHint}>请确认快递单或入库条码是否正确，或先去入库建档。</Text>
        </View>
      ) : null}

      {result ? (
        <TrackResultPanel
          result={result}
          cloudPkg={cloudPkg}
          cloudOrder={cloudOrder}
          canSignDelivered={canSign}
          signing={signing}
          onSignDelivered={() => void handleSign()}
        />
      ) : null}
      {!result && cloudPkg ? <CloudOnlyPanel pkg={cloudPkg} order={cloudOrder} /> : null}
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
});
