import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, Package } from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import { formatYangonStamp } from '../utils/yangonTime';

const HISTORY_STATUSES = ['已送达', '已完成', '已取消', '配送失败', 'Delivered', 'Cancelled'];
const DONE_STATUSES = new Set(['已送达', '已完成', 'Delivered']);
type HistoryFilter = 'all' | 'done' | 'cancelled' | 'failed';

function moneyAmount(price: unknown): number {
  const n = parseFloat(String(price ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function eventStamp(pkg: Package): string {
  const raw = DONE_STATUSES.has(pkg.status)
    ? pkg.delivery_time || pkg.updated_at || pkg.create_time
    : pkg.updated_at || pkg.create_time || pkg.created_at;
  return raw || '';
}

function eventTime(pkg: Package): number {
  const t = new Date(eventStamp(pkg) || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function ordererIdentity(description?: string): string | null {
  const match = description?.match(
    /\[(?:下单身份|Orderer Identity|Orderer|အော်ဒါတင်သူ အမျိုးအစား|အော်ဒါတင်သူ): (.*?)\]/,
  );
  return match?.[1] || null;
}

function balancePaid(description?: string): string | null {
  const match = description?.match(
    /\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း|平台支付|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း): (.*?) MMK\]/,
  );
  return match?.[1] || null;
}

export default function DeliveryHistoryScreen({ navigation }: any) {
  const { language } = useApp();
  const insets = useSafeAreaInsets();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [totalStats, setTotalStats] = useState({ deliveryFee: 0, cod: 0 });
  const [showCODModal, setShowCODModal] = useState(false);
  const [lastSettledDate, setLastSettledDate] = useState<string | null>(null);

  const zh = language === 'zh';
  const my = language === 'my';
  const copy = {
    title: zh ? '配送历史' : my ? 'ပို့ဆောင်မှတ်တမ်း' : 'Delivery History',
    done: zh ? '已完成' : my ? 'ပြီးပါပြီ' : 'Done',
    distance: zh ? '里程 km' : my ? 'အကွာအဝေး km' : 'km',
    unsettled: zh ? '未结清' : my ? 'မရှင်းရသေး' : 'Unsettled',
    settled: zh ? '已结清' : my ? 'ရှင်းပြီး' : 'Settled',
    fee: zh ? '未结清配送费' : my ? 'မရှင်းရသေးသော ပို့ခ' : 'Unsettled fee',
    cod: zh ? '未结清代收款' : my ? 'မရှင်းရသေးသော COD' : 'Unsettled COD',
    feeHint: zh ? '还没和财务结清' : my ? 'ဘဏ္ဍာရေးနှင့် မရှင်းရသေး' : 'Not settled with finance',
    lastSettled: zh ? '上次结清 ' : my ? 'နောက်ဆုံးရှင်းချိန် ' : 'Last settled ',
    search: zh ? '搜单号、收件人或地址' : my ? 'အော်ဒါ၊ လက်ခံသူ၊ လိပ်စာ' : 'Order, name, or address',
    all: zh ? '全部' : my ? 'အားလုံး' : 'All',
    cancelled: zh ? '已取消' : my ? 'ပယ်ဖျက်' : 'Cancelled',
    failed: zh ? '失败' : my ? 'မအောင်မြင်' : 'Failed',
    delivered: zh ? '已送达' : my ? 'ပေးပို့ပြီး' : 'Delivered',
    empty: zh ? '没有符合的记录' : my ? 'မှတ်တမ်းမရှိပါ' : 'No matching records',
    loadFailed: zh ? '历史加载失败，下拉重试' : my ? 'ဖွင့်မရပါ။ ပြန်ဆွဲပါ' : 'Could not load history. Pull to retry.',
    codTitle: zh ? '未结清代收款' : my ? 'မရှင်းရသေးသော COD' : 'Unsettled COD',
    codEmpty: zh ? '没有未结清的代收款' : my ? 'မရှင်းရသေးသော COD မရှိပါ' : 'No unsettled COD',
    ok: zh ? '确定' : my ? 'အိုကေ' : 'OK',
    balance: zh ? '余额支付' : my ? 'လက်ကျန်ငွေ' : 'Balance',
    noAccount: zh ? '没有读到骑手账号，请重新登录' : my ? 'အကောင့်မတွေ့ပါ။ ပြန်ဝင်ပါ' : 'Courier account missing. Sign in again.',
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoadError('');
      const currentUser = (await AsyncStorage.getItem('currentUserName')) || '';
      if (!currentUser) {
        setPackages([]);
        setTotalStats({ deliveryFee: 0, cod: 0 });
        setLastSettledDate(null);
        setLoadError(copy.noAccount);
        return;
      }

      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('courier', currentUser)
        .in('status', HISTORY_STATUSES);

      if (error) throw error;

      const history = ((data || []) as Package[]).sort((a, b) => eventTime(b) - eventTime(a));
      setPackages(history);

      let deliveryFee = 0;
      let cod = 0;
      history.forEach((pkg) => {
        if (DONE_STATUSES.has(pkg.status) && !pkg.rider_settled) {
          deliveryFee += moneyAmount(pkg.price);
          cod += Number(pkg.cod_amount || 0);
        }
      });
      setTotalStats({ deliveryFee, cod });

      const settled = history
        .filter((pkg) => pkg.rider_settled && pkg.rider_settled_at)
        .sort((a, b) => new Date(b.rider_settled_at!).getTime() - new Date(a.rider_settled_at!).getTime());
      setLastSettledDate(settled[0]?.rider_settled_at || null);
    } catch (error) {
      console.error('加载历史失败:', error);
      setLoadError(copy.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const counts = useMemo(() => {
    let done = 0;
    let cancelled = 0;
    let failed = 0;
    let unsettled = 0;
    let distance = 0;
    packages.forEach((pkg) => {
      if (DONE_STATUSES.has(pkg.status)) {
        done += 1;
        if (!pkg.rider_settled) unsettled += 1;
      } else if (pkg.status === '已取消' || pkg.status === 'Cancelled') {
        cancelled += 1;
      } else {
        failed += 1;
      }
      distance += Number(pkg.delivery_distance) || 0;
    });
    return { done, cancelled, failed, unsettled, distance };
  }, [packages]);

  const filteredPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return packages.filter((pkg) => {
      if (filter === 'done' && !DONE_STATUSES.has(pkg.status)) return false;
      if (filter === 'cancelled' && pkg.status !== '已取消' && pkg.status !== 'Cancelled') return false;
      if (filter === 'failed' && pkg.status !== '配送失败') return false;
      if (!q) return true;
      return [pkg.id, pkg.receiver_name, pkg.receiver_address]
        .some((value) => String(value || '').toLowerCase().includes(q));
    });
  }, [packages, filter, searchQuery]);

  const codRows = useMemo(
    () => packages.filter((pkg) => DONE_STATUSES.has(pkg.status) && !pkg.rider_settled && Number(pkg.cod_amount || 0) > 0),
    [packages],
  );

  const statusLabel = (status: string) => {
    if (DONE_STATUSES.has(status)) return copy.delivered;
    if (status === '已取消' || status === 'Cancelled') return copy.cancelled;
    return copy.failed;
  };

  const renderPackageItem = ({ item }: { item: Package }) => {
    const identity = ordererIdentity(item.description);
    const paid = balancePaid(item.description);
    const done = DONE_STATUSES.has(item.status);
    const cancelled = item.status === '已取消' || item.status === 'Cancelled';
    const unsettled = done && !item.rider_settled;
    const statusColor = done ? '#5eead4' : cancelled ? '#f87171' : '#fbbf24';
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.card}
        onPress={() => navigation.navigate('PackageDetail', { package: item })}
      >
        <Text style={styles.packageId} numberOfLines={1}>{item.id}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.dateText}>{formatYangonStamp(eventStamp(item))}</Text>
          <View style={styles.badgeRow}>
            {identity ? (
              <View style={[styles.badge, { backgroundColor: identity === '商家' || identity === 'MERCHANTS' ? '#2563eb' : '#b45309' }]}>
                <Text style={styles.badgeText}>{identity}</Text>
              </View>
            ) : null}
            <View style={[styles.badge, { backgroundColor: 'transparent', borderColor: statusColor }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel(item.status)}</Text>
            </View>
            {done ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.payment_method === 'qr' ? 'QR' : 'CASH'}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={14} color="#94a3b8" />
          <Text style={styles.receiverName} numberOfLines={1}>{item.receiver_name || '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color="#94a3b8" />
          <Text style={styles.addressText} numberOfLines={1}>{item.receiver_address || '—'}</Text>
        </View>
        {paid ? (
          <Text style={styles.balanceText}>{copy.balance} {paid} MMK</Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={styles.priceText}>{moneyAmount(item.price).toLocaleString()} MMK</Text>
          <View style={styles.footerRight}>
            {done ? (
              <Text style={[styles.settleTag, { color: unsettled ? '#fbbf24' : '#64748b' }]}>
                {unsettled ? copy.unsettled : copy.settled}
              </Text>
            ) : null}
            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filters: { key: HistoryFilter; label: string; count: number }[] = [
    { key: 'all', label: copy.all, count: packages.length },
    { key: 'done', label: copy.done, count: counts.done },
    { key: 'cancelled', label: copy.cancelled, count: counts.cancelled },
    { key: 'failed', label: copy.failed, count: counts.failed },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color="#e2e8f0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{copy.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={loading && packages.length === 0 ? [] : filteredPackages}
        keyExtractor={(item) => item.id}
        renderItem={renderPackageItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#94a3b8" />}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.summaryBar}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{counts.done}</Text>
                <Text style={styles.summaryLabel}>{copy.done}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{counts.distance.toFixed(1)}</Text>
                <Text style={styles.summaryLabel}>{copy.distance}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryNumber, { color: counts.unsettled > 0 ? '#fbbf24' : '#f8fafc' }]}>{counts.unsettled}</Text>
                <Text style={styles.summaryLabel}>{copy.unsettled}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statsCard}>
                <Text style={styles.statsLabel}>{copy.fee}</Text>
                <Text style={[styles.statsValue, { color: '#7dd3fc' }]}>{totalStats.deliveryFee.toLocaleString()}</Text>
                <Text style={styles.statsUnit}>MMK · {copy.feeHint}</Text>
              </View>
              <TouchableOpacity style={styles.statsCard} onPress={() => setShowCODModal(true)}>
                <View style={styles.statsLabelRow}>
                  <Text style={styles.statsLabel}>{copy.cod}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#94a3b8" />
                </View>
                <Text style={[styles.statsValue, { color: '#fbbf24' }]}>{totalStats.cod.toLocaleString()}</Text>
                <Text style={styles.statsUnit}>MMK · {copy.feeHint}</Text>
              </TouchableOpacity>
            </View>

            {lastSettledDate ? (
              <Text style={styles.settleInfo}>{copy.lastSettled}{formatYangonStamp(lastSettledDate)}</Text>
            ) : null}

            <View style={styles.searchInner}>
              <Ionicons name="search" size={18} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder={copy.search}
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
            </View>

            <View style={styles.filterRow}>
              {filters.map((item) => {
                const selected = filter === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.filterChip, selected && styles.filterChipOn]}
                    onPress={() => setFilter(item.key)}
                  >
                    <Text style={[styles.filterText, selected && styles.filterTextOn]}>{item.label} {item.count}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 32 }} size="large" color="#7dd3fc" />
          ) : (
            <Text style={styles.emptyText}>{copy.empty}</Text>
          )
        }
      />

      <Modal visible={showCODModal} transparent animationType="fade" onRequestClose={() => setShowCODModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{copy.codTitle}</Text>
              <TouchableOpacity onPress={() => setShowCODModal(false)} style={styles.iconButton}>
                <Ionicons name="close" size={20} color="#e2e8f0" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {codRows.length === 0 ? (
                <Text style={styles.emptyText}>{copy.codEmpty}</Text>
              ) : (
                codRows.map((pkg) => (
                  <View key={pkg.id} style={styles.codItem}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={styles.codOrderId} numberOfLines={1}>{pkg.id}</Text>
                      <Text style={styles.codTime}>{formatYangonStamp(pkg.delivery_time)} · {pkg.receiver_name}</Text>
                    </View>
                    <Text style={styles.codAmount}>{Number(pkg.cod_amount).toLocaleString()} MMK</Text>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalButton} onPress={() => setShowCODModal(false)}>
              <Text style={styles.modalButtonText}>{copy.ok}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.28)',
  },
  headerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700' },
  summaryBar: {
    marginTop: 4,
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNumber: { fontSize: 20, fontWeight: '800', color: '#f8fafc' },
  summaryLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 4 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(148, 163, 184, 0.2)' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  statsCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
  },
  statsLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statsLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginBottom: 6 },
  statsValue: { fontSize: 22, fontWeight: '800' },
  statsUnit: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 4 },
  settleInfo: { color: '#94a3b8', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 10 },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
    marginTop: 14,
  },
  searchInput: { flex: 1, color: '#f8fafc', fontSize: 15, fontWeight: '600', marginLeft: 8 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 12 },
  filterChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
    justifyContent: 'center',
  },
  filterChipOn: { borderColor: 'rgba(125, 211, 252, 0.7)', backgroundColor: 'rgba(125, 211, 252, 0.08)' },
  filterText: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  filterTextOn: { color: '#e0f2fe' },
  errorText: { color: '#fca5a5', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
  },
  packageId: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 10, gap: 8 },
  dateText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, justifyContent: 'flex-end' },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#152033',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.28)',
  },
  badgeText: { color: '#e2e8f0', fontSize: 10, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  receiverName: { flex: 1, color: '#f8fafc', fontSize: 14, fontWeight: '700' },
  addressText: { flex: 1, color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  balanceText: { marginTop: 8, color: '#5eead4', fontSize: 12, fontWeight: '700' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.16)',
  },
  priceText: { color: '#5eead4', fontSize: 15, fontWeight: '800' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settleTag: { fontSize: 12, fontWeight: '700' },
  emptyText: { color: '#64748b', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 28 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#152033',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
    padding: 16,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700' },
  codItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.16)',
  },
  codOrderId: { color: '#f8fafc', fontSize: 13, fontWeight: '700' },
  codTime: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  codAmount: { color: '#fbbf24', fontSize: 14, fontWeight: '800' },
  modalButton: {
    marginTop: 14,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
