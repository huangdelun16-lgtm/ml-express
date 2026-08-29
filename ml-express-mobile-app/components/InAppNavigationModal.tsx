import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Dimensions,
  BackHandler,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, UrlTile } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  computeDrivingRoute,
  formatRouteDistance,
  formatRouteDuration,
  pickRouteEtaSeconds,
  type ComputedRoute,
  type RouteCoordinate,
} from '../services/routingService';
import { openGoogleMapsDrivingNavigation } from '../utils/googleMapsNavigation';
import { sequenceLabelForIndex } from '../utils/routeSequenceLabels';
import { startRouteNavigationSession } from '../services/routeNavigationSession';
import {
  distanceFromPoint,
  fillRemainingNearest,
  formatShortDistance,
  isDeliveryStop,
  isPickupStop,
  nextNearestStopId,
} from '../utils/manualRoutePlan';

export type NavStop = {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  /** 原始站点标识，如 P1、D3 */
  badge?: string;
  kind?: 'pickup' | 'delivery';
};

export type InAppNavigationModalProps = {
  visible: boolean;
  onClose: () => void;
  language: string;
  origin: RouteCoordinate | null;
  /** 已排好序的停靠点（单站 / 自动规划） */
  stops: NavStop[];
  /** 手动规划：全部可选站点 */
  availableStops?: NavStop[];
  manualPlanning?: boolean;
  mapFocused?: boolean;
  t?: {
    map?: string;
    a11yMapRoutePreviewClose?: string;
    a11yMapOpenGoogleNav?: string;
  };
};

export default function InAppNavigationModal({
  visible,
  onClose,
  language,
  origin,
  stops,
  availableStops = [],
  manualPlanning = false,
  mapFocused = true,
  t,
}: InAppNavigationModalProps) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [route, setRoute] = useState<ComputedRoute | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [stopFilter, setStopFilter] = useState<'all' | 'pickup' | 'delivery'>('all');
  /** Android 自定义 Marker 必须先 tracksViewChanges=true 才能快照渲染 */
  const [markerTracks, setMarkerTracks] = useState(Platform.OS === 'android');
  /** Android Modal 内 MapView 延迟挂载，避免 Marker 空白 */
  const [androidMapMounted, setAndroidMapMounted] = useState(Platform.OS !== 'android');
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapEpoch, setMapEpoch] = useState(0);
  /** 收起导航/派单卡片，露出背后地图 */
  const [panelsCollapsed, setPanelsCollapsed] = useState(true);
  const mapSizeReady = mapSize.width > 20 && mapSize.height > 20;
  const canMountMap =
    mapFocused && mapSizeReady && (Platform.OS !== 'android' || androidMapMounted);
  const listMaxHeight = Math.min(220, Math.round(Dimensions.get('window').height * 0.26));
  const mapEdgePadding = useMemo(
    () => ({
      top: 72,
      right: 48,
      bottom: panelsCollapsed ? 108 : manualPlanning ? 268 : 200,
      left: 48,
    }),
    [panelsCollapsed, manualPlanning],
  );

  const poolStops = manualPlanning ? availableStops : stops;

  const refreshAndroidMarkers = useCallback(() => {
    if (Platform.OS !== 'android') return;
    setMarkerTracks(true);
    setTimeout(() => setMarkerTracks(false), 2000);
  }, []);

  useEffect(() => {
    if (!visible) {
      setOrderedIds([]);
      setRoute(null);
      setStopFilter('all');
      setPanelsCollapsed(true);
      setMapReady(false);
      setMapFailed(false);
      if (Platform.OS === 'android') {
        setAndroidMapMounted(false);
      }
      return;
    }
    setPanelsCollapsed(manualPlanning);
    setMapReady(false);
    setMapFailed(false);
    if (Platform.OS === 'android') {
      const mountTimer = setTimeout(() => setAndroidMapMounted(true), 500);
      return () => clearTimeout(mountTimer);
    }
    refreshAndroidMarkers();
  }, [visible, manualPlanning, refreshAndroidMarkers]);

  useEffect(() => {
    if (!visible || !canMountMap || mapReady) return undefined;
    const timer = setTimeout(() => setMapFailed(true), 10000);
    return () => clearTimeout(timer);
  }, [visible, canMountMap, mapReady, mapEpoch]);

  const retryMap = useCallback(() => {
    setMapFailed(false);
    setMapReady(false);
    setMapEpoch((n) => n + 1);
    if (Platform.OS === 'android') {
      setAndroidMapMounted(false);
      setTimeout(() => setAndroidMapMounted(true), 400);
    }
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  useEffect(() => {
    if (!visible || !androidMapMounted) return;
    refreshAndroidMarkers();
  }, [visible, androidMapMounted, poolStops.length, orderedIds.join('|'), refreshAndroidMarkers]);

  const orderedStops = useMemo(() => {
    if (manualPlanning) {
      return orderedIds
        .map((id) => poolStops.find((s) => s.id === id))
        .filter(Boolean) as NavStop[];
    }
    return stops;
  }, [manualPlanning, orderedIds, poolStops, stops]);

  const destinationStop = orderedStops.length > 0 ? orderedStops[orderedStops.length - 1] : null;
  const intermediateStops = useMemo(() => orderedStops.slice(0, -1), [orderedStops]);

  const sequenceMap = useMemo(() => {
    const map = new Map<string, string>();
    orderedStops.forEach((s, i) => map.set(s.id, sequenceLabelForIndex(i)));
    return map;
  }, [orderedStops]);

  const toggleStop = useCallback((id: string) => {
    setOrderedIds((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }, []);

  const removeStop = useCallback((id: string) => {
    setOrderedIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const undoLast = useCallback(() => {
    setOrderedIds((prev) => prev.slice(0, -1));
  }, []);

  const clearOrder = useCallback(() => {
    setOrderedIds([]);
    setStopFilter('all');
  }, []);

  const moveStop = useCallback((id: string, direction: -1 | 1) => {
    setOrderedIds((prev) => {
      const idx = prev.indexOf(id);
      const nextIdx = idx + direction;
      if (idx < 0 || nextIdx < 0 || nextIdx >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[idx];
      next[idx] = next[nextIdx];
      next[nextIdx] = tmp;
      return next;
    });
  }, []);

  const smartFill = useCallback(() => {
    setOrderedIds((prev) => fillRemainingNearest(origin, prev, poolStops));
  }, [origin, poolStops]);

  const referencePoint = useMemo(() => {
    const last = orderedStops[orderedStops.length - 1];
    if (last) return { latitude: last.latitude, longitude: last.longitude };
    return origin;
  }, [orderedStops, origin]);

  const suggestedId = useMemo(
    () => (manualPlanning ? nextNearestStopId(origin, orderedIds, poolStops) : null),
    [manualPlanning, origin, orderedIds, poolStops],
  );

  const remainingStops = useMemo(() => {
    const selected = new Set(orderedIds);
    return poolStops
      .filter((s) => !selected.has(s.id))
      .filter((s) => {
        if (stopFilter === 'pickup') return isPickupStop(s);
        if (stopFilter === 'delivery') return isDeliveryStop(s);
        return true;
      })
      .sort(
        (a, b) => distanceFromPoint(referencePoint, a) - distanceFromPoint(referencePoint, b),
      );
  }, [poolStops, orderedIds, stopFilter, referencePoint]);

  const loadRoute = useCallback(async () => {
    if (!visible || !origin || !destinationStop || orderedStops.length === 0) {
      setRoute(null);
      return;
    }
    setLoadingRoute(true);
    try {
      const result = await computeDrivingRoute(
        origin,
        {
          latitude: destinationStop.latitude,
          longitude: destinationStop.longitude,
        },
        intermediateStops.map((s) => ({
          latitude: s.latitude,
          longitude: s.longitude,
        })),
      );
      setRoute(result);
    } finally {
      setLoadingRoute(false);
    }
  }, [visible, origin, destinationStop, orderedStops, intermediateStops]);

  useEffect(() => {
    void loadRoute();
  }, [loadRoute]);

  const polylineCoords = useMemo(() => {
    if (route?.coordinates?.length) return route.coordinates;
    if (!origin || orderedStops.length === 0) return [];
    return [
      origin,
      ...orderedStops.map((s) => ({ latitude: s.latitude, longitude: s.longitude })),
    ];
  }, [route, origin, orderedStops]);

  useEffect(() => {
    if (!visible || polylineCoords.length < 2 || !mapRef.current) return;
    mapRef.current.fitToCoordinates(
      polylineCoords.map((c) => ({ latitude: c.latitude, longitude: c.longitude })),
      {
        edgePadding: mapEdgePadding,
        animated: true,
      },
    );
  }, [visible, polylineCoords, mapEdgePadding]);

  const etaSeconds = route ? pickRouteEtaSeconds(route) : 0;

  const handleGoogleNav = useCallback(async () => {
    if (!destinationStop || orderedStops.length === 0) return;

    await startRouteNavigationSession(
      orderedStops.map((s, i) => ({
        id: s.id,
        latitude: s.latitude,
        longitude: s.longitude,
        sequenceLabel: sequenceLabelForIndex(i),
        title: s.title,
        originBadge: s.badge,
      })),
      language,
    );

    await openGoogleMapsDrivingNavigation({
      origin: origin ? { lat: origin.latitude, lng: origin.longitude } : undefined,
      destination: {
        lat: destinationStop.latitude,
        lng: destinationStop.longitude,
      },
      waypoints: intermediateStops.map((s) => ({
        lat: s.latitude,
        lng: s.longitude,
      })),
    });
  }, [origin, destinationStop, orderedStops, intermediateStops, language]);

  const title = manualPlanning
    ? language === 'zh'
      ? '📍 手动规划路线'
      : language === 'en'
        ? '📍 Plan your route'
        : '📍 လမ်းကြောင်း စီစဉ်ပါ'
    : orderedStops.length > 1
      ? language === 'zh'
        ? '📍 路线预览 · 实时路况'
        : language === 'en'
          ? '📍 Route · Live traffic'
          : '📍 လမ်းကြောင်း · ယာဉ်ကြောအခြေအနေ'
      : language === 'zh'
        ? '📍 App 内导航'
        : language === 'en'
          ? '📍 In-app navigation'
          : '📍 App တွင် လမ်းညွှန်';

  const canStartNav = orderedStops.length > 0;
  const collapseLabel =
    language === 'zh' ? '收起看地图' : language === 'en' ? 'Hide panels' : 'မြေပုံကြည့်ရန်';
  const expandLabel =
    language === 'zh' ? '展开面板' : language === 'en' ? 'Show panels' : 'ပန်နယ်ဖွင့်';
  const collapsedSummary = canStartNav
    ? language === 'zh'
      ? `${orderedStops.length}/${poolStops.length || orderedStops.length} 站 · ${
          route ? formatRouteDuration(etaSeconds, language) : '—'
        }`
      : `${orderedStops.length}/${poolStops.length || orderedStops.length} · ${
          route ? formatRouteDuration(etaSeconds, language) : '—'
        }`
    : language === 'zh'
      ? '点地图选站，或展开面板排线'
      : language === 'en'
        ? 'Tap map pins, or expand to plan'
        : 'မြေပုံမှတ်တိုင်ကို နှိပ်ပါ';

  const renderStopBadge = (stop: NavStop) => {
    const seq = sequenceMap.get(stop.id);
    const selected = Boolean(seq);
    const suggested = suggestedId === stop.id && !selected;
    return (
      <View
        collapsable={false}
        renderToHardwareTextureAndroid
        style={[
          styles.stopBadge,
          selected
            ? styles.stopBadgeSelected
            : suggested
              ? styles.stopBadgeSuggested
              : stop.kind === 'delivery'
                ? styles.stopBadgeDest
                : styles.stopBadgeMid,
        ]}
      >
        <Text style={styles.stopBadgeText}>{seq || stop.badge || '?'}</Text>
      </View>
    );
  };

  const markerTracksViewChanges = Platform.OS === 'android' ? markerTracks : false;

  if (!visible) return null;

  return (
    <View style={styles.fullscreen} pointerEvents="auto">
        <LinearGradient
          colors={['#0f172a', '#1e293b']}
          style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}
        >
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t?.a11yMapRoutePreviewClose || 'Close'}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setPanelsCollapsed((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={
              panelsCollapsed
                ? language === 'zh'
                  ? '展开面板'
                  : 'Expand panels'
                : language === 'zh'
                  ? '收起看地图'
                  : 'Collapse to see map'
            }
          >
            <Ionicons name={panelsCollapsed ? 'chevron-up' : 'chevron-down'} size={22} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <View
          style={styles.mapWrap}
          collapsable={false}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 20 && height > 20) {
              setMapSize((prev) =>
                prev.width === Math.round(width) && prev.height === Math.round(height)
                  ? prev
                  : { width: Math.round(width), height: Math.round(height) },
              );
            }
          }}
        >
          {canMountMap ? (
            <MapView
              key={`route-map-${mapEpoch}`}
              ref={mapRef}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              style={{ width: mapSize.width, height: mapSize.height }}
              mapType="standard"
              showsTraffic={false}
              showsUserLocation
              showsMyLocationButton={Platform.OS === 'android'}
              pitchEnabled={false}
              rotateEnabled
              loadingEnabled={false}
              toolbarEnabled={false}
              initialRegion={{
                latitude: origin?.latitude || destinationStop?.latitude || poolStops[0]?.latitude || 21.9588,
                longitude: origin?.longitude || destinationStop?.longitude || poolStops[0]?.longitude || 96.0891,
                latitudeDelta: 0.06,
                longitudeDelta: 0.06,
              }}
              onMapReady={() => {
                setMapReady(true);
                setMapFailed(false);
                refreshAndroidMarkers();
                const fitCoords =
                  polylineCoords.length >= 2
                    ? polylineCoords
                    : poolStops.map((s) => ({
                        latitude: s.latitude,
                        longitude: s.longitude,
                      }));
                if (fitCoords.length >= 1 && mapRef.current) {
                  mapRef.current.fitToCoordinates(
                    origin
                      ? [{ latitude: origin.latitude, longitude: origin.longitude }, ...fitCoords]
                      : fitCoords,
                    {
                      edgePadding: mapEdgePadding,
                      animated: false,
                    },
                  );
                }
              }}
            >
              <UrlTile
                urlTemplate="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                maximumZ={19}
                flipY={false}
                shouldReplaceMapContent
                zIndex={-1}
              />
              {polylineCoords.length >= 2 ? (
                <Polyline
                  coordinates={polylineCoords}
                  strokeColor={
                    route?.fromRoadNetwork
                      ? 'rgba(37, 99, 235, 0.95)'
                      : 'rgba(148, 163, 184, 0.85)'
                  }
                  strokeWidth={5}
                  lineCap="round"
                  lineJoin="round"
                />
              ) : null}

              {origin ? (
                <Marker coordinate={origin} tracksViewChanges={markerTracksViewChanges} anchor={{ x: 0.5, y: 0.5 }}>
                  <View style={styles.courierDot} collapsable={false} renderToHardwareTextureAndroid>
                    <Text style={styles.courierEmoji}>🛵</Text>
                  </View>
                </Marker>
              ) : null}

              {poolStops.map((stop) => {
                const seq = sequenceMap.get(stop.id);
                return (
                  <Marker
                    key={`${stop.id}-${seq ?? 'idle'}`}
                    coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
                    title={stop.title}
                    description={stop.subtitle}
                    tracksViewChanges={markerTracksViewChanges}
                    anchor={{ x: 0.5, y: 0.5 }}
                    onPress={() => manualPlanning && toggleStop(stop.id)}
                  >
                    {renderStopBadge(stop)}
                  </Marker>
                );
              })}
            </MapView>
          ) : (
            <View style={styles.mapPaused}>
              {mapFocused ? (
                <ActivityIndicator size="large" color="#0d9488" />
              ) : (
                <Text style={styles.mapPausedText}>
                  {language === 'zh' ? '地图已暂停' : 'Map paused'}
                </Text>
              )}
            </View>
          )}

          {canMountMap && !mapReady ? (
            <View style={styles.mapLoadingOverlay} pointerEvents={mapFailed ? 'auto' : 'none'}>
              {mapFailed ? (
                <>
                  <Text style={styles.mapFailedText}>
                    {language === 'zh'
                      ? '地图加载较慢。可点重试，或先用下方列表选站。'
                      : language === 'en'
                        ? 'Map is slow to load. Retry, or pick stops from the list.'
                        : 'မြေပုံ နှေးနေပါသည်။ ထပ်စမ်းပါ သို့မဟုတ် စာရင်းမှ ရွေးပါ။'}
                  </Text>
                  <TouchableOpacity style={styles.mapRetryBtn} onPress={retryMap}>
                    <Text style={styles.mapRetryText}>
                      {language === 'zh' ? '重试地图' : language === 'en' ? 'Retry map' : 'မြေပုံ ထပ်စမ်း'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <ActivityIndicator size="large" color="#0d9488" />
              )}
            </View>
          ) : null}

          <View style={styles.overlay} pointerEvents="box-none">
            {panelsCollapsed ? (
              <View style={styles.collapsedDock}>
                <TouchableOpacity
                  style={styles.collapseBtn}
                  onPress={() => setPanelsCollapsed(false)}
                  accessibilityRole="button"
                  accessibilityLabel={expandLabel}
                >
                  <Ionicons name="chevron-up" size={16} color="#334155" />
                  <Text style={styles.collapseBtnText}>{expandLabel}</Text>
                </TouchableOpacity>
                <Text style={styles.collapsedMeta} numberOfLines={1}>
                  {collapsedSummary}
                </Text>
                <TouchableOpacity
                  style={[styles.collapsedNavBtn, !canStartNav && styles.googleNavBtnDisabled]}
                  onPress={() => void handleGoogleNav()}
                  disabled={!canStartNav}
                  accessibilityRole="button"
                  accessibilityLabel={t?.a11yMapOpenGoogleNav || 'Start Google Maps navigation'}
                >
                  <Ionicons name="navigate" size={16} color="#fff" />
                  <Text style={styles.collapsedNavText}>
                    {language === 'zh' ? '导航' : language === 'en' ? 'Nav' : 'လမ်းညွှန်'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
            <View style={styles.statsCard}>
              <View style={styles.panelToolbar}>
                <Text style={styles.panelToolbarTitle}>
                  {manualPlanning
                    ? language === 'zh'
                      ? '规划操作'
                      : language === 'en'
                        ? 'Route tools'
                        : 'လမ်းကြောင်း'
                    : language === 'zh'
                      ? '导航'
                      : 'Navigation'}
                </Text>
                <TouchableOpacity
                  style={styles.collapseBtn}
                  onPress={() => setPanelsCollapsed(true)}
                  accessibilityRole="button"
                  accessibilityLabel={collapseLabel}
                >
                  <Ionicons name="chevron-down" size={16} color="#334155" />
                  <Text style={styles.collapseBtnText}>{collapseLabel}</Text>
                </TouchableOpacity>
              </View>
              {manualPlanning ? (
                <Text style={styles.manualHint} numberOfLines={2}>
                  {language === 'zh'
                    ? '地图点未选站点即可加入；绿圈为建议下一站。已选站点请用列表调整。'
                    : language === 'en'
                      ? 'Tap unselected stops to add. Green = suggested next. Reorder in the list.'
                      : 'မရွေးရသေးသော မှတ်တိုင်ကို နှိပ်ပြီး ထည့်ပါ။ အစိမ်းရောင် = အကြံပြုသည့် နောက်တစ်ခု။'}
                </Text>
              ) : null}

              {loadingRoute ? (
                <ActivityIndicator color="#3b82f6" style={{ marginVertical: 8 }} />
              ) : route && canStartNav ? (
                <>
                  <Text style={styles.statsMain}>
                    ⏱ {formatRouteDuration(etaSeconds, language)}
                    {route.durationInTrafficSeconds &&
                    route.durationInTrafficSeconds > route.durationSeconds ? (
                      <Text style={styles.statsTraffic}>
                        {' '}
                        · {language === 'zh' ? '含路况' : 'traffic'}
                      </Text>
                    ) : null}
                  </Text>
                  <Text style={styles.statsSub}>
                    📏 {formatRouteDistance(route.distanceMeters, language)}
                    {manualPlanning
                      ? language === 'zh'
                        ? `  · 已选 ${orderedStops.length}/${poolStops.length} 站`
                        : `  · ${orderedStops.length}/${poolStops.length}`
                      : ''}
                  </Text>
                </>
              ) : manualPlanning ? (
                <Text style={styles.statsSub}>
                  {language === 'zh'
                    ? orderedStops.length === 0
                      ? '点地图或列表加第一站，或点「最近优先」一键排线'
                      : `已选 ${orderedStops.length}/${poolStops.length} 站 · ${orderedStops
                          .map((_, i) => sequenceLabelForIndex(i))
                          .join('→')}`
                    : orderedStops.length === 0
                      ? 'Add first stop, or tap Nearest-first'
                      : `${orderedStops.length}/${poolStops.length} · ${orderedStops
                          .map((_, i) => sequenceLabelForIndex(i))
                          .join('→')}`}
                </Text>
              ) : null}

              {manualPlanning ? (
                <View style={styles.toolRow}>
                  <TouchableOpacity
                    style={[
                      styles.toolBtnPrimary,
                      (poolStops.length === 0 || orderedIds.length >= poolStops.length) && {
                        opacity: 0.45,
                      },
                    ]}
                    onPress={smartFill}
                    accessibilityRole="button"
                    disabled={
                      poolStops.length === 0 || orderedIds.length >= poolStops.length
                    }
                  >
                    <Ionicons name="flash" size={16} color="#fff" />
                    <Text style={styles.toolBtnPrimaryText}>
                      {language === 'zh'
                        ? orderedIds.length === 0
                          ? '最近优先'
                          : '补全未选'
                        : language === 'en'
                          ? orderedIds.length === 0
                            ? 'Nearest first'
                            : 'Fill rest'
                          : 'အနီးဆုံး'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.toolBtn}
                    onPress={undoLast}
                    disabled={orderedIds.length === 0}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.toolBtnText, orderedIds.length === 0 && styles.toolBtnDisabled]}>
                      {language === 'zh' ? '撤销' : language === 'en' ? 'Undo' : 'ပြန်ဖြည်'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.toolBtn}
                    onPress={clearOrder}
                    disabled={orderedIds.length === 0}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.toolBtnText, orderedIds.length === 0 && styles.toolBtnDisabled]}>
                      {language === 'zh' ? '重置' : 'Reset'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.googleNavBtn, !canStartNav && styles.googleNavBtnDisabled]}
                onPress={() => void handleGoogleNav()}
                disabled={!canStartNav}
                accessibilityRole="button"
                accessibilityLabel={t?.a11yMapOpenGoogleNav || 'Start Google Maps navigation'}
              >
                <LinearGradient
                  colors={canStartNav ? ['#3b82f6', '#1d4ed8'] : ['#94a3b8', '#64748b']}
                  style={styles.googleNavGradient}
                >
                  <Ionicons name="navigate" size={18} color="#fff" />
                  <Text style={styles.googleNavText}>
                    {language === 'zh'
                      ? 'Google 语音导航'
                      : language === 'en'
                        ? 'Google voice nav'
                        : 'Google လမ်းညွှန်'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              {canStartNav ? (
                <Text style={styles.voiceHint}>
                  {orderedStops.length > 10
                    ? language === 'zh'
                      ? '⚠️ Google Maps 一次最多约 10 站，将按前段途经点导航'
                      : '⚠️ Maps may only keep the first ~10 stops'
                    : language === 'zh'
                      ? '🔊 到达各站时将自动语音播报'
                      : '🔊 Voice alert at each stop'}
                </Text>
              ) : null}
            </View>

            {manualPlanning && poolStops.length > 0 ? (
              <View style={[styles.listCard, { maxHeight: listMaxHeight }]}>
                <View style={styles.filterRow}>
                  {(
                    [
                      { key: 'all' as const, zh: '全部', en: 'All', my: 'အားလုံး' },
                      { key: 'pickup' as const, zh: '取货', en: 'Pickup', my: 'ယူ' },
                      { key: 'delivery' as const, zh: '送货', en: 'Drop', my: 'ပို့' },
                    ]
                  ).map((f) => (
                    <TouchableOpacity
                      key={f.key}
                      style={[styles.filterChip, stopFilter === f.key && styles.filterChipOn]}
                      onPress={() => setStopFilter(f.key)}
                    >
                      <Text style={[styles.filterChipText, stopFilter === f.key && styles.filterChipTextOn]}>
                        {language === 'zh' ? f.zh : language === 'en' ? f.en : f.my}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <Text style={styles.filterCount}>
                    {language === 'zh' ? `未选 ${remainingStops.length}` : `${remainingStops.length} left`}
                  </Text>
                  <TouchableOpacity
                    style={styles.collapseBtn}
                    onPress={() => setPanelsCollapsed(true)}
                    accessibilityRole="button"
                    accessibilityLabel={collapseLabel}
                  >
                    <Ionicons name="chevron-down" size={16} color="#334155" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: listMaxHeight - 44 }} nestedScrollEnabled>
                  {orderedStops.length > 0 ? (
                    <>
                      <Text style={styles.sectionLabel}>
                        {language === 'zh' ? '已选顺序' : language === 'en' ? 'Your order' : 'ရွေးပြီးအစဉ်'}
                      </Text>
                      {orderedStops.map((stop, index) => {
                        const seq = sequenceLabelForIndex(index);
                        return (
                          <View key={stop.id} style={[styles.listRow, styles.listRowSelected]}>
                            <View style={[styles.listNum, styles.listNumSelected]}>
                              <Text style={styles.listNumText}>{seq}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.listName} numberOfLines={1}>
                                {stop.badge ? `${stop.badge} · ` : ''}
                                {stop.title}
                              </Text>
                              {stop.subtitle ? (
                                <Text style={styles.listSub} numberOfLines={1}>
                                  {stop.subtitle}
                                </Text>
                              ) : null}
                            </View>
                            <TouchableOpacity
                              onPress={() => moveStop(stop.id, -1)}
                              disabled={index === 0}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="chevron-up" size={20} color={index === 0 ? '#cbd5e1' : '#334155'} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => moveStop(stop.id, 1)}
                              disabled={index === orderedStops.length - 1}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons
                                name="chevron-down"
                                size={20}
                                color={index === orderedStops.length - 1 ? '#cbd5e1' : '#334155'}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => removeStop(stop.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="close-circle" size={20} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </>
                  ) : null}

                  {remainingStops.length > 0 ? (
                    <>
                      <Text style={styles.sectionLabel}>
                        {language === 'zh'
                          ? '未选 · 距当前最近在前'
                          : language === 'en'
                            ? 'Remaining · nearest first'
                            : 'မရွေးရသေး'}
                      </Text>
                      {remainingStops.map((stop) => {
                        const suggested = suggestedId === stop.id;
                        const dist = formatShortDistance(
                          distanceFromPoint(referencePoint, stop),
                          language,
                        );
                        return (
                          <TouchableOpacity
                            key={stop.id}
                            style={[styles.listRow, suggested && styles.listRowSuggested]}
                            onPress={() => toggleStop(stop.id)}
                            accessibilityRole="button"
                          >
                            <View
                              style={[
                                styles.listNum,
                                suggested ? styles.listNumSuggested : styles.listNumIdle,
                              ]}
                            >
                              <Text style={styles.listNumText}>{stop.badge || '?'}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.listName} numberOfLines={1}>
                                {stop.title}
                                {suggested
                                  ? language === 'zh'
                                    ? ' · 建议下一站'
                                    : ' · next'
                                  : ''}
                              </Text>
                              <Text style={styles.listSub} numberOfLines={1}>
                                {dist
                                  ? language === 'zh'
                                    ? `距${orderedStops.length ? '上一站' : '你'} ${dist}`
                                    : dist
                                  : ''}
                                {stop.subtitle ? ` · ${stop.subtitle}` : ''}
                              </Text>
                            </View>
                            <Ionicons name="add-circle-outline" size={22} color={suggested ? '#16a34a' : '#64748b'} />
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  ) : orderedStops.length > 0 && orderedIds.length >= poolStops.length ? (
                    <Text style={styles.allPicked}>
                      {language === 'zh' ? '已选完所有站点' : 'All stops added'}
                    </Text>
                  ) : remainingStops.length === 0 ? (
                    <Text style={styles.allPicked}>
                      {language === 'zh' ? '该筛选下没有未选站点' : 'Nothing left in this filter'}
                    </Text>
                  ) : null}
                </ScrollView>
              </View>
            ) : orderedStops.length === 1 ? (
              <View style={styles.listCard}>
                <Text style={styles.listName}>{orderedStops[0].title}</Text>
                {orderedStops[0].subtitle ? (
                  <Text style={styles.listSub} numberOfLines={2}>
                    {orderedStops[0].subtitle}
                  </Text>
                ) : null}
              </View>
            ) : null}
              </>
            )}
          </View>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingHorizontal: 12,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  mapWrap: { flex: 1, position: 'relative', backgroundColor: '#e2e8f0', overflow: 'hidden' },
  mapPaused: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapPausedText: { color: '#94a3b8' },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226, 232, 240, 0.72)',
    paddingHorizontal: 28,
  },
  mapFailedText: {
    textAlign: 'center',
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 12,
  },
  mapRetryBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  mapRetryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  collapsedDock: {
    marginHorizontal: 12,
    marginBottom: Platform.OS === 'ios' ? 24 : 14,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  collapsedMeta: { flex: 1, fontSize: 12, fontWeight: '700', color: '#0f172a' },
  collapsedNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  collapsedNavText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  panelToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  panelToolbarTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  collapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  collapseBtnText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  statsCard: {
    margin: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  manualHint: { fontSize: 13, color: '#475569', marginBottom: 8, lineHeight: 18 },
  statsMain: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  statsTraffic: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
  statsSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  voiceHint: { fontSize: 11, color: '#64748b', marginTop: 8, textAlign: 'center' },
  googleNavBtn: { marginTop: 10, borderRadius: 12, overflow: 'hidden' },
  googleNavBtnDisabled: { opacity: 0.85 },
  googleNavGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  googleNavText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  listCard: {
    marginHorizontal: 12,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 14,
    padding: 12,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  toolBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toolBtnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  toolBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toolBtnText: { color: '#334155', fontWeight: '700', fontSize: 13 },
  toolBtnDisabled: { color: '#94a3b8' },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterChipOn: { backgroundColor: '#1d4ed8' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterChipTextOn: { color: '#fff' },
  filterCount: { marginLeft: 'auto', fontSize: 11, color: '#64748b', fontWeight: '600' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 6,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  listRowSuggested: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  listNumSuggested: { backgroundColor: '#16a34a' },
  allPicked: {
    textAlign: 'center',
    color: '#16a34a',
    fontWeight: '700',
    paddingVertical: 8,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listTitle: { fontWeight: '700', color: '#0f172a' },
  resetText: { color: '#ef4444', fontWeight: '600', fontSize: 13 },
  listScroll: { maxHeight: 180 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  listRowSelected: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  listNum: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    paddingHorizontal: 4,
  },
  listNumIdle: { backgroundColor: '#f59e0b' },
  listNumSelected: { backgroundColor: '#2563eb' },
  listNumText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  listName: { fontWeight: '600', color: '#0f172a' },
  listSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  courierDot: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  courierEmoji: { fontSize: 18 },
  stopBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    paddingHorizontal: 4,
  },
  stopBadgeMid: { backgroundColor: '#f59e0b' },
  stopBadgeDest: { backgroundColor: '#ef4444' },
  stopBadgeSelected: { backgroundColor: '#2563eb' },
  stopBadgeSuggested: { backgroundColor: '#16a34a' },
  stopBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
