import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import { useFocusEffect } from '@react-navigation/native';
import { buildRiderStats, EMPTY_RIDER_STATS, type RiderStats } from '../utils/riderStats';

export default function MyStatisticsScreen({ navigation }: any) {
  const { language } = useApp();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [statistics, setStatistics] = useState<RiderStats>(EMPTY_RIDER_STATS);

  const zh = language === 'zh';
  const my = language === 'my';
  const copy = {
    title: zh ? '我的统计' : my ? 'ကျွန်ုပ်၏ စာရင်း' : 'My Statistics',
    courier: zh ? '骑手' : my ? 'ကောင်ရီယာ' : 'Courier',
    today: zh ? '今日完成' : my ? 'ယနေ့' : 'Today',
    week: zh ? '近 7 天' : my ? '၇ ရက်' : '7 days',
    month: zh ? '近 30 天' : my ? '၃၀ ရက်' : '30 days',
    delivered: zh ? '累计完成' : my ? 'စုစုပေါင်း' : 'Completed',
    failed: zh ? '取消或失败' : my ? 'ပယ်ဖျက်/မအောင်မြင်' : 'Cancelled',
    rate: zh ? '完成率' : my ? 'ပြီးမြောက်နှုန်း' : 'Completion',
    active: zh ? '进行中' : my ? 'လုပ်ဆောင်နေဆဲ' : 'Active',
    rateHint: zh ? '完成数 ÷ 已结束订单，不含还在送的单' : my ? 'ပြီးသွားသော အော်ဒါသာ တွက်သည်' : 'Finished orders only. Active orders are excluded.',
    rating: zh ? '服务评分' : my ? 'အမှတ်' : 'Rating',
    time: zh ? '取件到送达' : my ? 'ကောက်ယူမှ ပို့ဆောင်' : 'Pickup to drop-off',
    noRating: zh ? '还没有评分' : my ? 'အမှတ်မရှိသေး' : 'No ratings yet',
    noTime: zh ? '还算不出耗时' : my ? 'ကြာချိန် မတွက်နိုင်သေး' : 'Not enough trips',
    minutes: zh ? '分钟' : my ? 'မိနစ်' : 'min',
    underMinute: zh ? '不到 1 分钟' : my ? '၁ မိနစ်မပြည့်' : 'Under 1 min',
    badges: zh ? '里程碑' : my ? 'မှတ်တိုင်' : 'Milestones',
    reached: zh ? '已达成' : my ? 'ရောက်ပြီး' : 'Reached',
    loadFailed: zh ? '统计加载失败，下拉重试' : my ? 'ဖွင့်မရပါ။ ပြန်ဆွဲပါ' : 'Could not load stats. Pull to retry.',
    noAccount: zh ? '没有读到骑手账号，请重新登录' : my ? 'အကောင့်မတွေ့ပါ။ ပြန်ဝင်ပါ' : 'Courier account missing. Sign in again.',
  };

  const loadData = useCallback(async () => {
    try {
      setLoadError('');
      const userName = (await AsyncStorage.getItem('currentUserName')) || '';
      setCurrentUserName(userName);
      if (!userName) {
        setStatistics(EMPTY_RIDER_STATS);
        setLoadError(copy.noAccount);
        return;
      }

      const { data, error } = await supabase
        .from('packages')
        .select('status,pickup_time,delivery_time,customer_rating')
        .eq('courier', userName);
      if (error) throw error;
      setStatistics(buildRiderStats((data || []) as Parameters<typeof buildRiderStats>[0]));
    } catch (error) {
      console.error('加载统计数据失败:', error);
      setLoadError(copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [copy.noAccount, copy.loadFailed]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const finished = statistics.delivered + statistics.failed;
  const completion = finished > 0 ? Math.round((statistics.delivered / finished) * 100) : null;
  const timeLabel = statistics.avgMinutes == null
    ? copy.noTime
    : statistics.avgMinutes < 1
      ? copy.underMinute
      : `${Math.round(statistics.avgMinutes)} ${copy.minutes}`;
  const ratingLabel = statistics.rating == null ? copy.noRating : statistics.rating.toFixed(1);

  const milestones = [
    {
      title: zh ? '完成 100 单' : my ? 'အော်ဒါ ၁၀၀' : '100 deliveries',
      progress: `${statistics.delivered}/100`,
      unlocked: statistics.delivered >= 100,
    },
    {
      title: zh ? '平均 30 分钟内' : my ? 'ပျမ်းမျှ ၃၀ မိနစ်' : 'Under 30 min',
      progress: statistics.avgMinutes == null ? '—' : `${Math.max(1, Math.round(statistics.avgMinutes))} ${copy.minutes}`,
      unlocked: statistics.delivered >= 10 && statistics.avgMinutes != null && statistics.avgMinutes < 30,
    },
    {
      title: zh ? '评分 4.8 以上' : my ? 'အမှတ် ၄.၈' : 'Rating 4.8+',
      progress: statistics.rating == null ? '—' : `${statistics.rating.toFixed(1)} · ${statistics.ratingCount}`,
      unlocked: statistics.ratingCount >= 5 && statistics.rating != null && statistics.rating >= 4.8,
    },
    {
      title: zh ? '结束的单全部送达' : my ? 'ပယ်ဖျက်မရှိ' : 'No failed finishes',
      progress: completion == null ? '—' : `${completion}%`,
      unlocked: finished >= 10 && completion === 100,
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color="#e2e8f0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{copy.title}</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.iconButton}>
          <Ionicons name="refresh" size={18} color="#e2e8f0" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#94a3b8" />}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(currentUserName || '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{currentUserName || '—'}</Text>
            <Text style={styles.userRole}>{copy.courier}</Text>
          </View>
        </View>

        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
        {loading && statistics.delivered === 0 && statistics.active === 0 ? (
          <ActivityIndicator style={{ marginVertical: 20 }} color="#7dd3fc" />
        ) : null}

        <View style={styles.periodRow}>
          {[
            { label: copy.today, value: statistics.today },
            { label: copy.week, value: statistics.week },
            { label: copy.month, value: statistics.month },
          ].map((item) => (
            <View key={item.label} style={styles.periodCard}>
              <Text style={styles.periodValue}>{item.value}</Text>
              <Text style={styles.periodLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.metricGrid}>
            <Metric label={copy.delivered} value={String(statistics.delivered)} />
            <Metric label={copy.failed} value={String(statistics.failed)} />
            <Metric label={copy.active} value={String(statistics.active)} />
            <Metric label={copy.rate} value={completion == null ? '—' : `${completion}%`} accent />
          </View>
          <Text style={styles.hint}>{copy.rateHint}</Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.line}>
            <Text style={styles.lineLabel}>{copy.rating}</Text>
            <Text style={styles.lineValue}>{ratingLabel}</Text>
          </View>
          {statistics.rating != null ? (
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${Math.min(100, (statistics.rating / 5) * 100)}%`, backgroundColor: '#fbbf24' }]} />
            </View>
          ) : null}
          <View style={[styles.line, { marginTop: 14 }]}>
            <Text style={styles.lineLabel}>{copy.time}</Text>
            <Text style={styles.lineValue}>{timeLabel}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{copy.badges}</Text>
        <View style={styles.badgeGrid}>
          {milestones.map((item) => (
            <View key={item.title} style={[styles.badgeCard, !item.unlocked && styles.badgeLocked]}>
              <Ionicons name={item.unlocked ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={item.unlocked ? '#5eead4' : '#64748b'} />
              <Text style={styles.badgeTitle}>{item.title}</Text>
              <Text style={styles.badgeProgress}>{item.unlocked ? copy.reached : item.progress}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, accent && { color: '#5eead4' }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
  content: { flex: 1, paddingHorizontal: 20 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#152033',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#7dd3fc', fontSize: 20, fontWeight: '800' },
  userName: { color: '#f8fafc', fontSize: 18, fontWeight: '700' },
  userRole: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginTop: 2 },
  errorText: { color: '#fca5a5', fontSize: 13, fontWeight: '600', marginTop: 12 },
  periodRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  periodCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
  },
  periodValue: { color: '#f8fafc', fontSize: 22, fontWeight: '800' },
  periodLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginTop: 4 },
  sectionCard: {
    marginTop: 12,
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
  },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  metric: { width: '50%', paddingVertical: 8 },
  metricValue: { color: '#f8fafc', fontSize: 20, fontWeight: '800' },
  metricLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginTop: 2 },
  hint: { color: '#64748b', fontSize: 12, fontWeight: '600', marginTop: 6 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineLabel: { color: '#94a3b8', fontSize: 14, fontWeight: '700' },
  lineValue: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  barBg: { height: 6, borderRadius: 3, backgroundColor: '#152033', marginTop: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  sectionTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '700', marginTop: 18, marginBottom: 8, marginLeft: 4 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  badgeCard: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
    gap: 6,
  },
  badgeLocked: { opacity: 0.72 },
  badgeTitle: { color: '#f8fafc', fontSize: 13, fontWeight: '700' },
  badgeProgress: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
});
