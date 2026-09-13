import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, TextStyle, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import MyanmarAwareText from './MyanmarAwareText';
import {
  ClayBox,
  ClayMapTrack,
  ClayPin,
  ClayPlaceOrder,
  ClayStoreFront,
  ClaySupportBot,
} from './ProfileClayIcons';

const TEAL = '#2C98A6';
const NAVY = '#1A2B48';
const GAP = 12;
const RADIUS = 26;
const FEATURE_H = 164;

type Labels = {
  logistics: string;
  viewAll: string;
  inProgress: string;
  pendingPickup: string;
  inTransitHint: string;
  pendingHint: string;
  orderNow: string;
  orderNowHint: string;
  nearbyStores: string;
  nearbyHint: string;
  trackOrder: string;
  trackHint: string;
  support: string;
  supportHint: string;
};

type Props = {
  t: Labels;
  inTransit: number;
  pending: number;
  onViewAll: () => void;
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

function MapTexture({ opacity = 0.1 }: { opacity?: number }) {
  return (
    <Svg
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity }]}
      width="100%"
      height="100%"
      viewBox="0 0 220 160"
      preserveAspectRatio="xMidYMid slice"
    >
      <Path d="M0 38 H220 M0 78 H220 M0 118 H220" stroke="#FFFFFF" strokeWidth="1" />
      <Path d="M36 0 V160 M86 0 V160 M138 0 V160 M186 0 V160" stroke="#FFFFFF" strokeWidth="1" />
      <Rect x="44" y="46" width="34" height="24" rx="3" fill="#FFFFFF" opacity={0.28} />
      <Rect x="94" y="86" width="36" height="24" rx="3" fill="#FFFFFF" opacity={0.28} />
      <Path
        d="M18 142 C62 108 108 128 168 58"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="3 3"
      />
      <Circle cx="18" cy="142" r="2.5" fill="#FFFFFF" />
      <Circle cx="168" cy="58" r="3" fill="#FFFFFF" />
    </Svg>
  );
}

function CircleArrow() {
  return (
    <View style={styles.circleArrow}>
      <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
    </View>
  );
}

function FeatureCard({
  onPress,
  colors,
  iconBg,
  icon,
  title,
  hint,
  titleColor,
  hintColor,
  art,
}: {
  onPress: () => void;
  colors: [string, string];
  iconBg: [string, string];
  icon: React.ReactNode;
  title: string;
  hint: string;
  titleColor: string;
  hintColor: string;
  art: React.ReactNode;
}) {
  return (
    <TouchableOpacity style={styles.featureCard} onPress={onPress} activeOpacity={0.9}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.featureFill}>
        <View style={styles.featureCopy}>
          <LinearGradient
            colors={iconBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconWell}
          >
            {icon}
          </LinearGradient>
          <View style={styles.featureText}>
            <FitLabel text={title} style={{ ...styles.featureTitle, color: titleColor }} />
            <FitLabel text={hint} style={{ ...styles.featureHint, color: hintColor }} weight="semibold" lines={2} />
          </View>
        </View>
        <View style={styles.featureArt}>{art}</View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function HomeToolsSection({
  t,
  inTransit,
  pending,
  onViewAll,
  onOpenInProgress,
  onOpenPickup,
  onOrderNow,
  onNearby,
  onTrack,
  onSupport,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionBar} />
        <FitLabel text={t.logistics} style={styles.sectionTitle} />
        <TouchableOpacity onPress={onViewAll} hitSlop={8} style={styles.viewAllBtn}>
          <FitLabel text={t.viewAll} style={styles.viewAll} weight="semibold" />
          <Ionicons name="chevron-forward" size={14} color={TEAL} />
        </TouchableOpacity>
      </View>

      <View style={styles.logisticsCard}>
        <LinearGradient
          colors={['#1C7A84', '#2C98A6', '#4BB8C4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logisticsGradient}
        >
          <MapTexture opacity={0.09} />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 0.7 }}
            style={StyleSheet.absoluteFill}
          />

          <TouchableOpacity style={styles.logisticsColumn} onPress={onOpenInProgress} activeOpacity={0.88}>
            <FitLabel text={t.inProgress} style={styles.colLabel} weight="semibold" />
            <Text style={styles.colNumber}>{inTransit}</Text>
            <View style={styles.colMeta}>
              <FitLabel
                text={`${t.inTransitHint} · ${inTransit}`}
                style={styles.colHint}
                weight="semibold"
              />
              <CircleArrow />
            </View>
          </TouchableOpacity>

          <View style={styles.colDivider} />

          <TouchableOpacity style={[styles.logisticsColumn, styles.logisticsColumnRight]} onPress={onOpenPickup} activeOpacity={0.88}>
            <FitLabel text={t.pendingPickup} style={styles.colLabel} weight="semibold" />
            <Text style={styles.colNumber}>{pending}</Text>
            <View style={styles.colMeta}>
              <FitLabel
                text={`${t.pendingHint} · ${pending}`}
                style={styles.colHint}
                weight="semibold"
              />
              <CircleArrow />
            </View>
          </TouchableOpacity>

          <View pointerEvents="none" style={styles.logisticsArt}>
            <ClayBox size={54} />
            <View style={styles.logisticsPin}>
              <ClayPin size={28} />
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.row}>
        <FeatureCard
          onPress={onOrderNow}
          colors={['#FFFFFF', '#F3FBFC']}
          iconBg={['#5EC4CF', '#1E7A84']}
          icon={<Ionicons name="cube-outline" size={18} color="#FFFFFF" />}
          title={t.orderNow}
          hint={t.orderNowHint}
          titleColor={NAVY}
          hintColor="#5B6B7C"
          art={
            <View style={styles.artPair}>
              <ClayPlaceOrder size={52} />
              <ClayPin size={26} />
            </View>
          }
        />
        <FeatureCard
          onPress={onNearby}
          colors={['#FFF8EF', '#F7E4C8']}
          iconBg={['#FFC56A', '#E08A3C']}
          icon={<Ionicons name="storefront-outline" size={18} color="#FFFFFF" />}
          title={t.nearbyStores}
          hint={t.nearbyHint}
          titleColor="#5A3A16"
          hintColor="#9A7040"
          art={<ClayStoreFront size={56} accent="orange" />}
        />
      </View>

      <View style={styles.row}>
        <FeatureCard
          onPress={onTrack}
          colors={['#EEF6FF', '#D5E8FA']}
          iconBg={['#7EC8F5', '#2B6CB0']}
          icon={<Ionicons name="navigate-outline" size={18} color="#FFFFFF" />}
          title={t.trackOrder}
          hint={t.trackHint}
          titleColor="#163A5F"
          hintColor="#5B7A99"
          art={<ClayMapTrack size={64} />}
        />
        <FeatureCard
          onPress={onSupport}
          colors={['#F6F1FF', '#E4D9FB']}
          iconBg={['#A78BFA', '#4C3FC8']}
          title={t.support}
          hint={t.supportHint}
          titleColor="#3B2F6A"
          hintColor="#7A6A9A"
          icon={<Ionicons name="headset-outline" size={18} color="#FFFFFF" />}
          art={<ClaySupportBot size={58} />}
        />
      </View>
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#1A2B48',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  default: { elevation: 3 },
});

const styles = StyleSheet.create({
  wrap: {
    marginTop: 6,
    paddingBottom: 8,
  },
  sectionHead: {
    marginTop: 18,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 24,
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
    lineHeight: 22,
    fontWeight: '800',
    color: NAVY,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAll: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: TEAL,
  },
  logisticsCard: {
    marginTop: GAP,
    marginHorizontal: 16,
    borderRadius: RADIUS,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
    ...Platform.select({
      ios: {
        shadowColor: '#1E6F7A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      default: { elevation: 5 },
    }),
  },
  logisticsGradient: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    minHeight: 168,
  },
  logisticsColumn: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  logisticsColumnRight: {
    paddingRight: 8,
    paddingBottom: 28,
  },
  colLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.88)',
    fontWeight: '700',
  },
  colNumber: {
    marginTop: 6,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  colMeta: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  colHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '600',
  },
  circleArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colDivider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: 6,
    marginHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  logisticsArt: {
    position: 'absolute',
    right: 14,
    bottom: 10,
    zIndex: 0,
  },
  logisticsPin: {
    position: 'absolute',
    right: -8,
    top: -6,
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
    padding: 16,
    justifyContent: 'space-between',
  },
  featureCopy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  featureHint: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  featureArt: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    minHeight: 58,
  },
  artPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
});
