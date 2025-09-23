import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput, HelperText, Icon } from 'react-native-paper';
import { Screen } from '../../src/components/Screen';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { EnhancedCard, StatsCard } from '../../src/components/EnhancedCard';
import { StatusIndicator } from '../../src/components/StatusIndicator';
import { LoadingAnimation } from '../../src/components/LoadingAnimation';
import { DesignTokens, getSpacing } from '../../src/theme';
import { api } from '../../src/api';
import { useRouter } from 'expo-router';
import { storage } from '../../src/storage';

export default function Home() {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [track, setTrack] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPackages: 0,
    todayPackages: 0,
    pendingPackages: 0,
    deliveredPackages: 0,
  });
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const raw = await storage.getItem('ml_token_payload');
        if (raw) {
          try { 
            setUser(JSON.parse(raw)); 
            // 模拟获取统计数据
            await new Promise(resolve => setTimeout(resolve, 1000));
            setStats({
              totalPackages: 1248,
              todayPackages: 23,
              pendingPackages: 8,
              deliveredPackages: 1205,
            });
          } catch {}
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <Screen>
        <LoadingAnimation type="skeleton" fullScreen text="加载中..." />
      </Screen>
    );
  }

  return (
    <Screen>
      {/* 欢迎卡片 */}
      <EnhancedCard variant="glass" style={{ marginBottom: getSpacing(4) }}>
        <View style={s.welcomeHeader}>
          <View style={s.logoContainer}>
            <Icon source="truck" size={32} color={DesignTokens.colors.primary[500]} />
          </View>
          <View style={s.welcomeContent}>
            <Text variant="headlineSmall" style={s.brandTitle}>MARKET-LINK EXPRESS</Text>
            <Text variant="bodyMedium" style={s.subtitle}>移动端工作台</Text>
            <View style={s.userStatus}>
              <StatusIndicator 
                status={user ? 'delivered' : 'pending'} 
                label={user ? `${user.username} (${user.role})` : '未登录'}
                size="sm"
                showDot
              />
            </View>
          </View>
        </View>
        
        <View style={s.quickActions}>
          <PrimaryButton 
            title="📱 进入扫码" 
            onPress={() => router.push('/(tabs)/scan')} 
            fullWidth={false}
            mode="contained"
          />
          <PrimaryButton 
            title="📊 查看报表" 
            onPress={() => router.push('/(tabs)/reports')} 
            fullWidth={false}
            mode="outlined"
          />
        </View>
      </EnhancedCard>

      {/* 统计卡片 */}
      <View style={s.statsGrid}>
        <StatsCard
          title="总包裹数"
          value={stats.totalPackages.toLocaleString()}
          icon={<Icon source="package-variant" size={24} color={DesignTokens.colors.primary[500]} />}
          style={s.statCard}
        />
        <StatsCard
          title="今日新增"
          value={stats.todayPackages}
          subtitle="+12% 较昨日"
          trend="up"
          icon={<Icon source="plus-circle" size={24} color={DesignTokens.colors.success} />}
          style={s.statCard}
        />
      </View>
      
      <View style={s.statsGrid}>
        <StatsCard
          title="待处理"
          value={stats.pendingPackages}
          icon={<Icon source="clock" size={24} color={DesignTokens.colors.warning} />}
          style={s.statCard}
        />
        <StatsCard
          title="已送达"
          value={stats.deliveredPackages.toLocaleString()}
          subtitle="99.2% 成功率"
          trend="up"
          icon={<Icon source="check-circle" size={24} color={DesignTokens.colors.success} />}
          style={s.statCard}
        />
      </View>

      {/* 快速操作卡片 */}
      <EnhancedCard 
        title="新增包裹（手动）" 
        variant="default" 
        style={{ marginTop: getSpacing(4) }}
      >
        <TextInput 
          label="单号" 
          value={track} 
          onChangeText={(v) => { setTrack(v); setErr(''); }} 
          autoCapitalize='none'
          mode="outlined"
          style={{ marginBottom: getSpacing(2) }}
        />
        {!!err && <HelperText type="error">{err}</HelperText>}
        <PrimaryButton 
          title="💾 保存包裹" 
          loading={busy} 
          onPress={async () => {
            setBusy(true);
            try {
              await api.createPackage({ trackingNumber: track.trim(), status: '已入库' });
              setTrack('');
            } catch (e: any) {
              const msg = e?.response?.data?.message || e?.message || '失败';
              setErr(String(msg));
            } finally { setBusy(false); }
          }} 
        />
      </EnhancedCard>
    </Screen>
  );
}

const s = StyleSheet.create({
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getSpacing(4),
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: DesignTokens.borderRadius.lg,
    backgroundColor: DesignTokens.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: getSpacing(3),
  },
  welcomeContent: {
    flex: 1,
  },
  brandTitle: {
    color: DesignTokens.colors.text.primary,
    fontWeight: DesignTokens.typography.fontWeight.bold,
    marginBottom: getSpacing(1),
  },
  subtitle: {
    color: DesignTokens.colors.text.secondary,
    marginBottom: getSpacing(2),
  },
  userStatus: {
    alignSelf: 'flex-start',
  },
  quickActions: {
    flexDirection: 'row',
    gap: getSpacing(3),
  },
  statsGrid: {
    flexDirection: 'row',
    gap: getSpacing(3),
    marginBottom: getSpacing(3),
  },
  statCard: {
    flex: 1,
  },
});
