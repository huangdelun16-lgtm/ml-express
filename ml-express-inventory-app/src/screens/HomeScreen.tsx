import React, { useCallback, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Text from '../components/AppText';
import HomeTodoQueue from '../components/HomeTodoQueue';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { getHomeOverview } from '../services/inventoryService';
import { fetchHomeTodoCounts } from '../services/homeTodoService';
import type { PackedShipmentListRow } from '../types/inventory';
import { packStatusStyle } from '../utils/packDisplayStatus';
import {
  buildHomeTodoQueue,
  emptyHomeTodoCounts,
  type HomeTodoItem,
} from '../utils/homeTodoQueue';
import { LOGIN_LOGO } from '../constants/branding';
import { regionDisplayLabel } from '../constants/destinationOptions';
import { getPackStatusLabel, resolveAppError, useTranslation } from '../i18n';
import { feedbackService } from '../services/FeedbackService';
import type { RootStackParamList } from '../navigation/AppNavigator';

type HomeProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const PRIMARY_STAT_KEYS = [
  { key: 'itemCount' as const, labelKey: 'statSku' as const },
  { key: 'totalQty' as const, labelKey: 'statTotalQty' as const },
  { key: 'packCount' as const, labelKey: 'statPack' as const },
  { key: 'todayIn' as const, labelKey: 'statTodayIn' as const },
] as const;

export default function HomeScreen({ navigation }: HomeProps) {
  const insets = useSafeAreaInsets();
  const { operatorName, storeCode, hubCode, store, logout } = useAuth();
  const { t, fmt, language } = useTranslation();
  const [stats, setStats] = useState({
    itemCount: 0,
    totalQty: 0,
    lowStockCount: 0,
    todayIn: 0,
    todayOut: 0,
    packCount: 0,
  });
  const [recentPacks, setRecentPacks] = useState<PackedShipmentListRow[]>([]);
  const [todoItems, setTodoItems] = useState<HomeTodoItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    const scope = store && hubCode ? { store, hubCode } : undefined;
    const todoPromise =
      store && hubCode
        ? fetchHomeTodoCounts({ store, hubCode })
        : Promise.resolve(emptyHomeTodoCounts());
    const [overviewResult, todoResult] = await Promise.allSettled([
      getHomeOverview(scope),
      todoPromise,
    ]);
    if (overviewResult.status === 'fulfilled') {
      setStats(overviewResult.value.stats);
      setRecentPacks(overviewResult.value.recentPacks);
      setLoadError('');
    } else {
      setLoadError(resolveAppError(t, overviewResult.reason) || t.home.loadFailed);
    }
    if (todoResult.status === 'fulfilled') {
      setTodoItems(buildHomeTodoQueue(todoResult.value));
    } else {
      setTodoItems([]);
    }
  }, [store, hubCode, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const tiles = [
    { title: t.home.tileStockIn, icon: '📥', screen: 'StockIn', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    {
      title: t.home.tilePackagingStockIn,
      icon: '📦',
      screen: 'PackagingStockIn',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.12)',
    },
    { title: t.home.tileItems, icon: '📋', screen: 'Items', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    { title: t.home.tilePkg, icon: '📦', screen: 'Pkg', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
    { title: t.home.tileStockOut, icon: '🚚', screen: 'StockOut', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    { title: t.home.tileHubReceive, icon: '✅', screen: 'HubReceive', color: '#14b8a6', bg: 'rgba(20,184,166,0.12)' },
    { title: t.home.tileExceptions, icon: '⚠️', screen: 'Exceptions', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { title: t.home.tileShipmentTrack, icon: '🛰️', screen: 'ShipmentTrack', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
    { title: t.home.tileMovements, icon: '📜', screen: 'Movements', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    { title: t.home.tileFinance, icon: '🌏', screen: 'CrossBorderFinance', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
    { title: t.home.tileScan, icon: '📷', screen: 'CameraScan', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
    { title: t.home.tileSettings, icon: '⚙️', screen: 'Settings', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  ];
  const outboundTiles = tiles.filter((tile) =>
    ['StockIn', 'PackagingStockIn', 'Items', 'Pkg', 'StockOut'].includes(tile.screen),
  );
  const inboundTiles = tiles.filter((tile) =>
    ['HubReceive', 'Exceptions', 'CrossBorderFinance'].includes(tile.screen),
  );
  const moreTiles = tiles.filter((tile) =>
    ['ShipmentTrack', 'Movements', 'CameraScan', 'Settings'].includes(tile.screen),
  );

  const goQueryExpress = () => {
    const q = query.trim();
    if (!q) {
      feedbackService.info(t.home.queryExpressEmpty);
      return;
    }
    navigation.navigate('TrackExpress', { presetCode: q });
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor="#38bdf8"
          onRefresh={async () => {
            setRefreshing(true);
            try {
              await load();
            } finally {
              setRefreshing(false);
            }
          }}
        />
      }
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View style={styles.brandRow}>
            <View style={styles.headerLogoWrap}>
              <Image source={LOGIN_LOGO} style={styles.headerLogo} resizeMode="contain" />
            </View>
            <View>
              <Text style={styles.brandTitle}>ML Inventory</Text>
              <Text style={styles.brandSub}>{t.home.brandSub}</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
            onPress={() => logout()}
          >
            <Text style={styles.logout}>{t.common.logout}</Text>
          </Pressable>
        </View>

        <View style={styles.headerDivider} />

        <Text style={styles.hello}>{fmt(t.home.hello, { name: operatorName ?? '' })}</Text>

        <View style={styles.chipRow}>
          {storeCode ? (
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>{t.common.store}</Text>
              <Text style={styles.chipValue}>{storeCode}</Text>
            </View>
          ) : null}
          {hubCode ? (
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>{t.common.region}</Text>
              <Text style={styles.chipValue}>{regionDisplayLabel(hubCode)}</Text>
            </View>
          ) : null}
          <View style={styles.chipMuted}>
            <Text style={styles.chipMutedText}>{t.home.localCloud}</Text>
          </View>
        </View>
      </View>

      {loadError ? (
        <View style={styles.inlineError}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => void load()}
            accessibilityRole="button"
            accessibilityLabel={t.common.retry}
          >
            <Text style={styles.retryBtnText}>{t.common.retry}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.queryCard}>
        <View style={styles.queryHeader}>
          <View style={styles.queryIconWrap}>
            <Text style={styles.queryIcon}>🔍</Text>
          </View>
          <View style={styles.queryHeaderText}>
            <Text style={styles.queryTitle}>{t.home.queryExpressTitle}</Text>
            <Text style={styles.queryHint}>{t.home.queryExpressHint}</Text>
          </View>
        </View>
        <View style={styles.queryRow}>
          <TextInput
            style={styles.queryInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t.home.queryExpressPlaceholder}
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={goQueryExpress}
          />
          <Pressable
            style={({ pressed }) => [styles.queryBtn, pressed && styles.queryBtnPressed]}
            onPress={goQueryExpress}
          >
            <Text style={styles.queryBtnText}>{t.common.query}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.home.todayOverview}</Text>
          <View style={styles.statsGrid}>
            {PRIMARY_STAT_KEYS.map((item) => (
              <StatCard
                key={item.key}
                label={t.home[item.labelKey]}
                value={String(stats[item.key])}
              />
            ))}
          </View>
          <View style={styles.todayOutCard}>
            <View>
              <Text style={styles.todayOutLabel}>{t.home.statTodayOut}</Text>
              <Text style={styles.todayOutHint}>{t.home.todayOutHint}</Text>
            </View>
            <Text style={styles.todayOutValue}>{stats.todayOut}</Text>
          </View>
        </View>

        {stats.lowStockCount > 0 ? (
          <View style={styles.alertBanner}>
            <Text style={styles.alertWarn}>
              {fmt(t.home.lowStockWarn, { count: stats.lowStockCount })}
            </Text>
          </View>
        ) : null}

        <HomeTodoQueue
          t={t}
          items={todoItems}
          onOpen={(item) => {
            if (item.screen === 'Items') {
              navigation.navigate('Items', { initialMode: item.itemsMode });
              return;
            }
            navigation.navigate(item.screen);
          }}
        />

        <Pressable
          style={styles.pkgCard}
          onPress={() => navigation.navigate('Pkg')}
        >
          <View style={styles.pkgCardHeader}>
            <View style={styles.pkgTitleRow}>
              <View style={styles.pkgIconWrap}>
                <Text style={styles.pkgIcon}>📦</Text>
              </View>
              <Text style={styles.pkgCardTitle}>{t.home.packSection}</Text>
            </View>
            <Text style={styles.pkgCardMore}>
              {stats.packCount > 0
                ? fmt(t.home.packTotal, { count: stats.packCount })
                : t.home.packViewAll}
            </Text>
          </View>
          {recentPacks.length === 0 ? (
            <Text style={styles.pkgEmpty}>{t.home.packEmpty}</Text>
          ) : (
            recentPacks.map((pack, index) => {
              const statusStyle = packStatusStyle(pack.display_status);
              return (
                <View
                  key={pack.id}
                  style={[styles.pkgRow, index > 0 && styles.pkgRowBorder]}
                >
                  <View style={styles.pkgRowMain}>
                    <Text style={styles.pkgName} numberOfLines={1}>
                      {pack.bundle_name}
                    </Text>
                    <Text style={styles.pkgBarcode} numberOfLines={1}>
                      {pack.bundle_barcode}
                    </Text>
                  </View>
                  <View style={styles.pkgRowRight}>
                    <View
                      style={[styles.loadBadge, { backgroundColor: statusStyle.badgeBg }]}
                    >
                      <Text style={[styles.loadBadgeText, { color: statusStyle.badgeText }]}>
                        {getPackStatusLabel(language, pack.display_status)}
                      </Text>
                    </View>
                    <Text style={styles.pkgQty}>
                      {pack.items.length} {t.common.pieces}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.home.sectionOutbound}</Text>
          <TileGrid tiles={outboundTiles} navigation={navigation} />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.home.sectionInboundHub}</Text>
          <TileGrid tiles={inboundTiles} navigation={navigation} />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.home.sectionMore}</Text>
          <TileGrid tiles={moreTiles} navigation={navigation} />
        </View>
    </ScrollView>
  );
}

function TileGrid({
  tiles,
  navigation,
}: {
  tiles: { title: string; icon: string; screen: string; bg: string }[];
  navigation: HomeProps['navigation'];
}) {
  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <Pressable
          key={tile.screen}
          style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
          onPress={() => navigation.navigate(tile.screen as keyof RootStackParamList)}
        >
          <View style={[styles.tileIconWrap, { backgroundColor: tile.bg }]}>
            <Text style={styles.tileIcon}>{tile.icon}</Text>
          </View>
          <Text style={styles.tileTitle}>{tile.title}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: { paddingHorizontal: 16 },
  headerCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.16)',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerLogo: {
    width: 38,
    height: 38,
  },
  brandTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  brandSub: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
  },
  logoutBtnPressed: { opacity: 0.75 },
  logout: { color: '#fca5a5', fontWeight: '800', fontSize: 13 },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 14,
  },
  hello: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.22)',
  },
  chipLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  chipValue: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  chipMuted: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  chipMutedText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  chipSync: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  chipSyncText: {
    color: '#c4b5fd',
    fontSize: 11,
    fontWeight: '800',
  },
  chipOffline: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  chipOfflineText: {
    color: '#fcd34d',
    fontSize: 11,
    fontWeight: '800',
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.28)',
  },
  errorText: { color: '#fca5a5', flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  retryBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f87171',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retryBtnText: { color: '#fecaca', fontWeight: '800', fontSize: 12 },
  section: { marginBottom: 16 },
  sectionLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.1)',
  },
  statValue: {
    color: '#38bdf8',
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  todayOutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  todayOutLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '800',
  },
  todayOutHint: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  todayOutValue: {
    color: '#fbbf24',
    fontSize: 28,
    fontWeight: '900',
  },
  alertBanner: {
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  alertWarn: { color: '#fbbf24', fontSize: 13, fontWeight: '600' },
  pkgCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.22)',
    shadowColor: '#a855f7',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  pkgCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pkgTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pkgIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pkgIcon: { fontSize: 18 },
  pkgCardTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '900' },
  pkgCardMore: { color: '#c4b5fd', fontSize: 12, fontWeight: '700' },
  pkgEmpty: { color: '#64748b', fontSize: 13, lineHeight: 20 },
  pkgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  pkgRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  pkgRowMain: { flex: 1 },
  pkgName: { color: '#e2e8f0', fontSize: 14, fontWeight: '800' },
  pkgBarcode: {
    color: '#a78bfa',
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 3,
  },
  pkgRowRight: { alignItems: 'flex-end', gap: 6 },
  loadBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  loadBadgeText: { fontSize: 10, fontWeight: '900' },
  pkgQty: { color: '#c4b5fd', fontSize: 12, fontWeight: '800' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '47.5%',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tilePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  tileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tileIcon: { fontSize: 22 },
  tileTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '800' },
  queryCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.28)',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  queryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  queryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queryIcon: { fontSize: 18 },
  queryHeaderText: { flex: 1 },
  queryTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '900' },
  queryHint: { color: '#64748b', fontSize: 12, marginTop: 2, lineHeight: 17 },
  queryRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  queryInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  queryBtn: {
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    minWidth: 72,
  },
  queryBtnPressed: { opacity: 0.85 },
  queryBtnText: { color: '#f8fafc', fontSize: 15, fontWeight: '900', textAlign: 'center' },
});
