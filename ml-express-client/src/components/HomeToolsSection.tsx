import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, TextStyle, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import MyanmarAwareText from './MyanmarAwareText';
import { ClayBox, ClayHeadset, ClayMapBoard, ClayPlaceOrder, ClayShoppingBag, ClayStoreFront } from './ProfileClayIcons';

const TEAL = '#2C98A6';
const TEAL_DEEP = '#1E6F7A';
const NAVY = '#1A2B48';
const GAP = 12;
const RADIUS = 24;
const FEATURE_H = 148;
const UTIL_H = 96;

type Labels = {
  logistics: string;
  inProgress: string;
  pendingPickup: string;
  orderNow: string;
  orderNowHint: string;
  nearbyStores: string;
  nearbyHint: string;
  trackOrder: string;
  support: string;
};

type Props = {
  t: Labels;
  inTransit: number;
  pending: number;
  onOpenInProgress: () => void;
  onOpenPickup: () => void;
  onOrderNow: () => void;
  onNearby: () => void;
  onTrack: () => void;
  onSupport: () => void;
};

function FitLabel({
  text,
  style,
  weight = 'bold',
  lines = 1,
}: {
  text: string;
  style?: TextStyle;
  weight?: 'regular' | 'semibold' | 'bold';
  lines?: number;
}) {
  return (
    <MyanmarAwareText
      text={text}
      myanmarWeight={weight}
      numberOfLines={lines}
      adjustsFontSizeToFit
      minimumFontScale={0.68}
      allowFontScaling={false}
      style={style}
    />
  );
}

/** Faint city-block map grid texture used in backgrounds. */
function MapTexture({
  variant = 'gray',
  opacity = 0.1,
}: {
  variant?: 'gray' | 'white' | 'teal';
  opacity?: number;
}) {
  const stroke =
    variant === 'white' ? '#FFFFFF' : variant === 'teal' ? '#2C98A6' : '#1A2B48';
  return (
    <Svg
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity }]}
      width="100%"
      height="100%"
      viewBox="0 0 220 160"
      preserveAspectRatio="xMidYMid slice"
    >
      <Path d="M0 38 H220 M0 78 H220 M0 118 H220" stroke={stroke} strokeWidth="1" />
      <Path d="M36 0 V160 M86 0 V160 M138 0 V160 M186 0 V160" stroke={stroke} strokeWidth="1" />
      <Rect x="44" y="46" width="34" height="24" rx="3" fill={stroke} opacity={0.3} />
      <Rect x="94" y="86" width="36" height="24" rx="3" fill={stroke} opacity={0.3} />
      <Rect x="146" y="46" width="30" height="22" rx="3" fill={stroke} opacity={0.3} />
      <Rect x="44" y="126" width="28" height="18" rx="3" fill={stroke} opacity={0.3} />
      <Path
        d="M18 142 C62 108 108 128 168 58"
        stroke={stroke}
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="3 3"
      />
      <Circle cx="18" cy="142" r="2.5" fill={stroke} />
      <Circle cx="168" cy="58" r="3" fill={stroke} />
    </Svg>
  );
}

function RouteGlyph() {
  return (
    <Svg width={22} height={14} viewBox="0 0 22 14">
      <Circle cx="3.5" cy="7" r="2.4" fill="#FFFFFF" />
      <Path
        d="M7 7 H15"
        stroke="#FFFFFF"
        strokeWidth="1.6"
        strokeDasharray="2 1.6"
        strokeLinecap="round"
      />
      <Path d="M16.2 3.2 L20.6 7 L16.2 10.8 Z" fill="#FFFFFF" />
    </Svg>
  );
}

function GoButton({ dark }: { dark: boolean }) {
  return (
    <View style={[styles.go, dark ? styles.goDark : styles.goLight]}>
      <Ionicons name="arrow-forward" size={13} color={dark ? '#FFFFFF' : TEAL} />
    </View>
  );
}

export default function HomeToolsSection({
  t,
  inTransit,
  pending,
  onOpenInProgress,
  onOpenPickup,
  onOrderNow,
  onNearby,
  onTrack,
  onSupport,
}: Props) {
  return (
    <View style={styles.wrap}>
      {/* 1. Header: 我的物流 */}
      <View style={styles.sectionHead}>
        <View style={styles.sectionBar} />
        <FitLabel text={t.logistics} style={styles.sectionTitle} />
      </View>

      {/* 2. 我的物流 Card */}
      <View style={styles.logisticsCardContainer}>
        <LinearGradient
          colors={['#1F7A84', '#2C98A6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logisticsGradient}
        >
          <MapTexture variant="white" opacity={0.1} />

          {/* Left Column: 进行中 */}
          <TouchableOpacity
            style={styles.logisticsColumn}
            onPress={onOpenInProgress}
            activeOpacity={0.88}
          >
            <View style={styles.colTopRow}>
              <FitLabel text={t.inProgress} style={styles.colLabel} weight="semibold" />
              <RouteGlyph />
            </View>

            <View style={styles.colMiddleRow}>
              <Text style={styles.colNumber}>{inTransit}</Text>
            </View>

            <View style={styles.colBottomRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressSeg, inTransit > 0 && styles.progressSegActive]} />
                <View style={[styles.progressSeg, inTransit > 1 && styles.progressSegActive]} />
                <View style={[styles.progressSeg, inTransit > 2 && styles.progressSegActive]} />
              </View>
              <ClayBox size={44} />
            </View>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.colDivider} />

          {/* Right Column: 待取件 */}
          <TouchableOpacity
            style={styles.logisticsColumn}
            onPress={onOpenPickup}
            activeOpacity={0.88}
          >
            <View style={styles.colTopRow}>
              <FitLabel text={t.pendingPickup} style={styles.colLabel} weight="semibold" />
              <RouteGlyph />
            </View>

            <View style={styles.colMiddleRow}>
              <Text style={styles.colNumber}>{pending}</Text>
            </View>

            <View style={styles.colBottomRowRight}>
              <ClayShoppingBag size={44} />
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* 3. 立即下单 & 附近商家 Cards */}
      <View style={styles.row}>
        {/* 立即下单 */}
        <TouchableOpacity style={styles.featureCard} onPress={onOrderNow} activeOpacity={0.9}>
          <LinearGradient
            colors={['#2C98A6', TEAL_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featureFill}
          >
            <MapTexture variant="white" opacity={0.08} />
            <View style={styles.featureCopy}>
              <FitLabel text={t.orderNow} style={styles.featureTitleOn} />
              <FitLabel text={t.orderNowHint} style={styles.featureHintOn} weight="semibold" />
            </View>
            <View style={styles.featureBottom}>
              <View style={styles.iconWell}>
                <ClayPlaceOrder size={46} />
              </View>
              <GoButton dark />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* 附近商家 */}
        <TouchableOpacity style={styles.featureCard} onPress={onNearby} activeOpacity={0.9}>
          <LinearGradient
            colors={['#2C98A6', TEAL_DEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featureFill}
          >
            <MapTexture variant="white" opacity={0.08} />
            <View style={styles.featureCopy}>
              <FitLabel text={t.nearbyStores} style={styles.featureTitleOn} />
              <FitLabel text={t.nearbyHint} style={styles.featureHintOn} weight="semibold" />
            </View>
            <View style={styles.featureBottom}>
              <View style={styles.iconWell}>
                <ClayStoreFront size={46} />
              </View>
              <GoButton dark />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* 4. 订单追踪 & 客服 Cards */}
      <View style={styles.row}>
        <TouchableOpacity style={styles.utilCard} onPress={onTrack} activeOpacity={0.88}>
          <ClayMapBoard size={44} />
          <FitLabel text={t.trackOrder} style={styles.utilLabel} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.utilCard} onPress={onSupport} activeOpacity={0.88}>
          <ClayHeadset size={44} />
          <FitLabel text={t.support} style={styles.utilLabel} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#1A2B48',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  default: { elevation: 3 },
});

const styles = StyleSheet.create({
  wrap: {
    marginTop: 6,
    paddingBottom: 4,
  },
  sectionHead: {
    marginTop: 18,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 22,
  },
  sectionBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: TEAL,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: NAVY,
  },
  logisticsCardContainer: {
    marginTop: GAP,
    marginHorizontal: 16,
    borderRadius: RADIUS,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#1E6F7A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
      },
      default: { elevation: 5 },
    }),
  },
  logisticsGradient: {
    flexDirection: 'row',
    padding: 16,
    minHeight: 148,
  },
  logisticsColumn: {
    flex: 1,
    justifyContent: 'space-between',
  },
  colTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  colMiddleRow: {
    marginTop: 2,
    marginBottom: 2,
  },
  colNumber: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  colBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    width: 68,
  },
  progressSeg: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  progressSegActive: {
    backgroundColor: '#B7EEF4',
  },
  colBottomRowRight: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  colDivider: {
    width: 1,
    marginVertical: 4,
    marginHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  row: {
    marginTop: GAP,
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: GAP,
  },
  featureCard: {
    flex: 1,
    height: FEATURE_H,
    borderRadius: RADIUS,
    overflow: 'hidden',
    ...cardShadow,
  },
  featureFill: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  featureCopy: {
    zIndex: 1,
    height: 40,
    justifyContent: 'flex-start',
  },
  featureTitleOn: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  featureHintOn: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.82)',
  },
  featureBottom: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  iconWell: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  go: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goDark: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  goLight: {
    backgroundColor: 'rgba(44,152,166,0.14)',
  },
  utilCard: {
    flex: 1,
    height: UTIL_H,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...cardShadow,
  },
  utilLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: NAVY,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
