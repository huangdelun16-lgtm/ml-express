import React, { useCallback, useState } from 'react';
import {
  Alert,
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
import ExportCostCard from '../components/ExportCostCard';
import SignedInvoiceCard from '../components/SignedInvoiceCard';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { getHomeOverview, listItems, listPackedShipments } from '../services/inventoryService';
import { fetchHomeTodoCounts } from '../services/homeTodoService';
import type { PackedShipmentListRow } from '../types/inventory';
import { packStatusStyle } from '../utils/packDisplayStatus';
import {
  buildHomeTodoQueue,
  emptyHomeTodoCounts,
  type HomeTodoItem,
} from '../utils/homeTodoQueue';
import { LOGIN_LOGO } from '../constants/branding';
import {
  buildExportCostBoard,
  exportCostOptionsFromPacks,
  type ExportCostBoard,
} from '../utils/exportCostBoard';
import {
  addExportCost,
  listExportCosts,
  listLoadedPackTrips,
  type SavedExportCost,
} from '../services/exportCostService';
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

type HomeTab = 'overview' | 'outbound' | 'inbound' | 'more';

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
  const [tab, setTab] = useState<HomeTab>('overview');
  const [exportBoard, setExportBoard] = useState<ExportCostBoard>({ singles: [], packages: [] });
  const [exportSaved, setExportSaved] = useState<SavedExportCost[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState('');

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

  const loadExportBoard = useCallback(
    async (force = false) => {
      if (!store || !hubCode) {
        setExportBoard({ singles: [], packages: [] });
        setExportSaved([]);
        setExportError('');
        return;
      }
      setExportLoading(true);
      try {
        const scope = { store, hubCode };
        const [items, packs, trips, saved] = await Promise.all([
          listItems(undefined, scope, { force }),
          listPackedShipments(undefined, scope),
          listLoadedPackTrips().catch(() => []),
          listExportCosts().catch(() => [] as SavedExportCost[]),
        ]);
        setExportBoard(buildExportCostBoard(items, exportCostOptionsFromPacks(packs, trips)));
        setExportSaved(saved);
        setExportError('');
      } catch (error) {
        setExportError(resolveAppError(t, error) || t.home.exportCostLoadFailed);
      } finally {
        setExportLoading(false);
      }
    },
    [store, hubCode, t],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const tiles: ActionTile[] = [
    { title: t.home.tileStockIn, hint: t.home.tileStockInHint, icon: '📥', screen: 'StockIn' },
    {
      title: t.home.tilePackagingStockIn,
      hint: t.home.tilePackagingStockInHint,
      icon: '📦',
      screen: 'PackagingStockIn',
    },
    { title: t.home.tileItems, hint: t.home.tileItemsHint, icon: '📋', screen: 'Items' },
    { title: t.home.tilePkg, hint: t.home.tilePkgHint, icon: '📦', screen: 'Pkg' },
    { title: t.home.tileStockOut, hint: t.home.tileStockOutHint, icon: '🚚', screen: 'StockOut' },
    { title: t.home.tileHubReceive, hint: t.home.tileHubReceiveHint, icon: '✅', screen: 'HubReceive' },
    { title: t.home.tileExceptions, hint: t.home.tileExceptionsHint, icon: '⚠️', screen: 'Exceptions' },
    { title: t.home.tileShipmentTrack, hint: t.home.tileShipmentTrackHint, icon: '🛰️', screen: 'ShipmentTrack' },
    { title: t.home.tileMovements, hint: t.home.tileMovementsHint, icon: '📜', screen: 'Movements' },
    { title: t.home.tileFinance, hint: t.home.tileFinanceHint, icon: '🌏', screen: 'CrossBorderFinance' },
    { title: t.home.tileSettings, hint: t.home.tileSettingsHint, icon: '⚙️', screen: 'Settings' },
  ];
  const outboundTiles = tiles.filter((tile) =>
    ['StockIn', 'PackagingStockIn', 'Items', 'Pkg', 'StockOut'].includes(tile.screen),
  );
  const inboundTiles = tiles.filter((tile) =>
    ['HubReceive', 'Exceptions', 'CrossBorderFinance'].includes(tile.screen),
  );
  const moreTiles = tiles.filter((tile) =>
    ['ShipmentTrack', 'Movements', 'Settings'].includes(tile.screen),
  );

  const goQueryExpress = () => {
    const q = query.trim();
    if (!q) {
      feedbackService.info(t.home.queryExpressEmpty);
      return;
    }
    navigation.navigate('TrackExpress', { presetCode: q });
  };

  const tabs: { id: HomeTab | 'scan'; label: string; icon: string }[] = [
    { id: 'overview', label: t.home.tabOverview, icon: '🏠' },
    { id: 'outbound', label: t.home.tabOutbound, icon: '📤' },
    { id: 'inbound', label: t.home.tabInbound, icon: '✅' },
    { id: 'scan', label: t.home.tabScan, icon: '📷' },
    { id: 'more', label: t.home.tabMore, icon: 'grid' },
  ];

  const headerMeta = [storeCode, hubCode ? regionDisplayLabel(hubCode) : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.root}>
      <ScrollView
        key={tab}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 6 },
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
        <View style={styles.headerBar}>
          <View style={styles.headerLogoWrap}>
            <Image source={LOGIN_LOGO} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <View style={styles.headerIdentity}>
            <Text style={styles.headerName} numberOfLines={1}>
              {operatorName || 'ML Inventory'}
            </Text>
            {headerMeta ? (
              <Text style={styles.headerMeta} numberOfLines={1}>
                {headerMeta}
              </Text>
            ) : null}
          </View>
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
            onPress={() => {
              Alert.alert(t.settings.logoutTitle, t.settings.logoutConfirm, [
                { text: t.common.cancel, style: 'cancel' },
                { text: t.common.logout, style: 'destructive', onPress: () => void logout() },
              ]);
            }}
            hitSlop={8}
          >
            <Text style={styles.logout}>{t.common.logout}</Text>
          </Pressable>
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

        {tab === 'overview' ? (
          <>
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
          </>
        ) : null}

        {tab === 'outbound' ? (
          <ActionSection
            title={t.home.sectionOutbound}
            hint={t.home.sectionOutboundHint}
            tone="outbound"
            tiles={outboundTiles}
            navigation={navigation}
            insertBeforeScreen="StockOut"
            insertBefore={
              <ExportCostCard
                board={exportBoard}
                loading={exportLoading}
                error={exportError}
                saved={exportSaved}
                onOpen={() => {
                  void loadExportBoard(true);
                }}
                onAdd={async (draft) => {
                  const saved = await addExportCost({
                    subjectKind: draft.kind,
                    subjectKey: draft.subjectKey,
                    displayBarcode: draft.displayBarcode,
                    customerName: draft.customer,
                    finalDestination: draft.destination,
                    legDestination: draft.legDestination,
                    weightKg: draft.weightKg,
                    unitPriceCny: draft.unitPriceCny,
                    tripNumber: draft.tripNumber,
                    createdBy: operatorName || '',
                  });
                  setExportSaved((current) => [
                    saved,
                    ...current.filter(
                      (row) => !(row.subjectKind === saved.subjectKind && row.subjectKey === saved.subjectKey),
                    ),
                  ]);
                }}
              />
            }
          />
        ) : null}

        {tab === 'inbound' ? (
          <ActionSection
            title={t.home.sectionInboundHub}
            hint={t.home.sectionInboundHint}
            tone="inbound"
            tiles={inboundTiles}
            navigation={navigation}
            insertBeforeScreen="HubReceive"
            insertBefore={<SignedInvoiceCard />}
          />
        ) : null}

        {tab === 'more' ? (
          <ActionSection
            title={t.home.sectionMore}
            hint={t.home.sectionMoreHint}
            tone="more"
            tiles={moreTiles}
            navigation={navigation}
          />
        ) : null}
      </ScrollView>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <Pressable
              key={item.id}
              style={styles.tabItem}
              onPress={() => {
                if (item.id === 'scan') {
                  navigation.navigate('CameraScan');
                  return;
                }
                setTab(item.id);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.id === 'scan' ? t.home.tileScan : item.label}
            >
              {item.icon === 'grid' ? (
                <MoreGridIcon active={active} />
              ) : (
                <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{item.icon}</Text>
              )}
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MoreGridIcon({ active }: { active: boolean }) {
  const color = active ? '#7dd3fc' : '#94a3b8';
  return (
    <View style={styles.moreGrid} accessibilityElementsHidden>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.moreDot, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

type ActionTone = 'outbound' | 'inbound' | 'more';

type ActionTile = {
  title: string;
  hint: string;
  icon: string;
  screen: 'StockIn' | 'PackagingStockIn' | 'Items' | 'Pkg' | 'StockOut' | 'HubReceive' | 'Exceptions' | 'ShipmentTrack' | 'Movements' | 'CrossBorderFinance' | 'Settings';
};

const ACTION_TONE: Record<ActionTone, { title: string; bar: string; wash: string; border: string; chevron: string }> = {
  outbound: {
    title: '#fbbf24',
    bar: '#f59e0b',
    wash: 'rgba(245, 158, 11, 0.14)',
    border: 'rgba(245, 158, 11, 0.32)',
    chevron: '#fbbf24',
  },
  inbound: {
    title: '#5eead4',
    bar: '#14b8a6',
    wash: 'rgba(20, 184, 166, 0.14)',
    border: 'rgba(45, 212, 191, 0.32)',
    chevron: '#5eead4',
  },
  more: {
    title: '#e2e8f0',
    bar: '#94a3b8',
    wash: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.28)',
    chevron: '#cbd5e1',
  },
};

function ActionSection({
  title,
  hint,
  tone,
  tiles,
  navigation,
  insertBeforeScreen,
  insertBefore,
}: {
  title: string;
  hint: string;
  tone: ActionTone;
  tiles: ActionTile[];
  navigation: HomeProps['navigation'];
  insertBeforeScreen?: string;
  insertBefore?: React.ReactNode;
}) {
  const palette = ACTION_TONE[tone];
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionBar, { backgroundColor: palette.bar }]} />
        <View style={styles.sectionHeadText}>
          <Text style={[styles.sectionLabel, { color: palette.title }]}>{title}</Text>
          <Text style={styles.sectionHint}>{hint}</Text>
        </View>
      </View>
      <View style={styles.actionList}>
        {tiles.map((tile) => (
          <React.Fragment key={tile.screen}>
            {insertBefore && tile.screen === insertBeforeScreen ? insertBefore : null}
            <Pressable
              style={({ pressed }) => [
                styles.actionRow,
                { borderColor: palette.border },
                pressed && styles.actionRowPressed,
              ]}
              onPress={() => navigation.navigate(tile.screen)}
              accessibilityRole="button"
              accessibilityLabel={tile.title}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: palette.wash }]}>
                <Text style={styles.actionIcon}>{tile.icon}</Text>
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>{tile.title}</Text>
                <Text style={styles.actionHint}>{tile.hint}</Text>
              </View>
              <Text style={[styles.actionChevron, { color: palette.chevron }]}>›</Text>
            </Pressable>
          </React.Fragment>
        ))}
      </View>
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
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 20 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(56, 189, 248, 0.14)',
    backgroundColor: '#0f172a',
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  tabIcon: { fontSize: 18, opacity: 0.55 },
  tabIconActive: { opacity: 1 },
  moreGrid: {
    width: 18,
    height: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  moreDot: {
    width: 7,
    height: 7,
    borderRadius: 2,
  },
  tabLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#7dd3fc',
    fontWeight: '800',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingVertical: 4,
  },
  headerLogoWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerLogo: {
    width: 26,
    height: 26,
  },
  headerIdentity: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerMeta: {
    color: '#7dd3fc',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
    letterSpacing: 0.2,
  },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.32)',
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
  },
  logoutBtnPressed: { opacity: 0.75 },
  logout: { color: '#fca5a5', fontWeight: '800', fontSize: 12 },
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
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 4,
    textTransform: 'none',
  },
  sectionHint: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 12,
  },
  sectionBar: {
    width: 4,
    borderRadius: 2,
  },
  sectionHeadText: { flex: 1, minWidth: 0 },
  actionList: { gap: 8 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  actionRowPressed: { opacity: 0.82 },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: { fontSize: 22 },
  actionCopy: { flex: 1, minWidth: 0 },
  actionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '800' },
  actionHint: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginTop: 2, lineHeight: 16 },
  actionChevron: { fontSize: 28, fontWeight: '300', lineHeight: 28 },
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
