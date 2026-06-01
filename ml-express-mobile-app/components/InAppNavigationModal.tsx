import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MAP_STYLE_LOGISTICS_PRO } from '../utils/mapStyles';
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
  const mapRef = useRef<MapView>(null);
  const [route, setRoute] = useState<ComputedRoute | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  /** Android 自定义 Marker 必须先 tracksViewChanges=true 才能快照渲染 */
  const [markerTracks, setMarkerTracks] = useState(Platform.OS === 'android');
  /** Android Modal 内 MapView 延迟挂载，避免 Marker 空白 */
  const [androidMapMounted, setAndroidMapMounted] = useState(Platform.OS !== 'android');

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
      if (Platform.OS === 'android') {
        setAndroidMapMounted(false);
      }
      return;
    }
    if (Platform.OS === 'android') {
      const mountTimer = setTimeout(() => setAndroidMapMounted(true), 320);
      return () => clearTimeout(mountTimer);
    }
    refreshAndroidMarkers();
  }, [visible, refreshAndroidMarkers]);

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
      const idx = prev.indexOf(id);
      if (idx >= 0) {
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  }, []);

  const clearOrder = useCallback(() => setOrderedIds([]), []);

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
        edgePadding: { top: 80, right: 48, bottom: manualPlanning ? 280 : 220, left: 48 },
        animated: true,
      },
    );
  }, [visible, polylineCoords, manualPlanning]);

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

  const renderStopBadge = (stop: NavStop) => {
    const seq = sequenceMap.get(stop.id);
    const selected = Boolean(seq);
    return (
      <View
        collapsable={false}
        renderToHardwareTextureAndroid
        style={[
          styles.stopBadge,
          selected ? styles.stopBadgeSelected : stop.kind === 'delivery' ? styles.stopBadgeDest : styles.stopBadgeMid,
        ]}
      >
        <Text style={styles.stopBadgeText}>{seq || stop.badge || '?'}</Text>
      </View>
    );
  };

  const markerTracksViewChanges = Platform.OS === 'android' ? markerTracks : false;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t?.a11yMapRoutePreviewClose || 'Close'}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <View style={styles.mapWrap}>
          {mapFocused && androidMapMounted ? (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFillObject}
              customMapStyle={Platform.OS === 'android' ? undefined : MAP_STYLE_LOGISTICS_PRO}
              mapType="standard"
              showsTraffic
              showsUserLocation
              showsMyLocationButton={Platform.OS === 'android'}
              pitchEnabled={false}
              rotateEnabled
              loadingEnabled
              toolbarEnabled={false}
              initialRegion={{
                latitude: origin?.latitude || destinationStop?.latitude || poolStops[0]?.latitude || 21.9588,
                longitude: origin?.longitude || destinationStop?.longitude || poolStops[0]?.longitude || 96.0891,
                latitudeDelta: 0.06,
                longitudeDelta: 0.06,
              }}
              onMapReady={() => {
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
                      edgePadding: { top: 80, right: 48, bottom: manualPlanning ? 280 : 220, left: 48 },
                      animated: false,
                    },
                  );
                }
              }}
            >
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
              <Text style={styles.mapPausedText}>
                {language === 'zh' ? '地图已暂停' : 'Map paused'}
              </Text>
            </View>
          )}

          <View style={styles.overlay} pointerEvents="box-none">
            <View style={styles.statsCard}>
              {manualPlanning ? (
                <Text style={styles.manualHint}>
                  {language === 'zh'
                    ? '👆 点击 P/D 站点按配送顺序添加（显示为 A→B→C）'
                    : language === 'en'
                      ? '👆 Tap stops in order (A→B→C)'
                      : '👆 P/D မှတ်တိုင်များကို အစဉ်လိုက် နှိပ်ပါ'}
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
                  </Text>
                </>
              ) : manualPlanning ? (
                <Text style={styles.statsSub}>
                  {language === 'zh'
                    ? orderedStops.length === 0
                      ? '请选择第一站'
                      : `已选 ${orderedStops.length} 站 · ${orderedStops.map((_, i) => sequenceLabelForIndex(i)).join('→')}`
                    : orderedStops.length === 0
                      ? 'Select first stop'
                      : `${orderedStops.length} stops · ${orderedStops.map((_, i) => sequenceLabelForIndex(i)).join('→')}`}
                </Text>
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
                  {language === 'zh'
                    ? '🔊 到达各 A/B 站时将自动语音播报'
                    : '🔊 Voice alert at each stop'}
                </Text>
              ) : null}
            </View>

            {manualPlanning && poolStops.length > 0 ? (
              <View style={styles.listCard}>
                <View style={styles.listHeaderRow}>
                  <Text style={styles.listTitle}>
                    {language === 'zh' ? '📦 选择站点顺序' : '📦 Tap to order'}
                  </Text>
                  {orderedIds.length > 0 ? (
                    <TouchableOpacity onPress={clearOrder} accessibilityRole="button">
                      <Text style={styles.resetText}>
                        {language === 'zh' ? '重置' : 'Reset'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <ScrollView style={styles.listScroll}>
                  {poolStops.map((stop) => {
                    const seq = sequenceMap.get(stop.id);
                    const selected = Boolean(seq);
                    return (
                      <TouchableOpacity
                        key={stop.id}
                        style={[styles.listRow, selected && styles.listRowSelected]}
                        onPress={() => toggleStop(stop.id)}
                        accessibilityRole="button"
                      >
                        <View
                          style={[
                            styles.listNum,
                            selected ? styles.listNumSelected : styles.listNumIdle,
                          ]}
                        >
                          <Text style={styles.listNumText}>{seq || stop.badge || '?'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.listName}>
                            {stop.badge ? `${stop.badge} · ` : ''}
                            {stop.title}
                          </Text>
                          {stop.subtitle ? (
                            <Text style={styles.listSub} numberOfLines={1}>
                              {stop.subtitle}
                            </Text>
                          ) : null}
                        </View>
                        <Ionicons
                          name={selected ? 'checkmark-circle' : 'add-circle-outline'}
                          size={22}
                          color={selected ? '#2563eb' : '#94a3b8'}
                        />
                      </TouchableOpacity>
                    );
                  })}
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
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 16,
    paddingBottom: 14,
    paddingHorizontal: 12,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  mapWrap: { flex: 1, position: 'relative' },
  mapPaused: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapPausedText: { color: '#94a3b8' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  statsCard: {
    margin: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 16,
    padding: 14,
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
  googleNavBtn: { marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  googleNavBtnDisabled: { opacity: 0.85 },
  googleNavGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  googleNavText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  listCard: {
    marginHorizontal: 12,
    marginBottom: 16,
    maxHeight: 220,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 14,
    padding: 12,
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
  stopBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
});
