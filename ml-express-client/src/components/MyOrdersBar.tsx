import React, { useId } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { useApp } from '../contexts/AppContext';
import { ClayBox, ClayClipboard, ClayScooter } from './ProfileClayIcons';

const TEAL = '#2C98A6';
const NAVY = '#1A2B48';
const MUTED = '#8A94A6';

function SealIcon({ kind, size = 40 }: { kind: 'done' | 'cancel'; size?: number }) {
  const id = `s${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const hi = kind === 'done' ? '#7EE0EA' : '#D5DCE3';
  const mid = kind === 'done' ? TEAL : '#94A3B8';
  const lo = kind === 'done' ? '#176978' : '#64748B';
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <RadialGradient id={`${id}g`} cx="34%" cy="28%" r="70%">
          <Stop offset="0" stopColor={hi} />
          <Stop offset="0.5" stopColor={mid} />
          <Stop offset="1" stopColor={lo} />
        </RadialGradient>
      </Defs>
      <Ellipse cx="32" cy="56" rx="14" ry="4" fill={lo} opacity="0.18" />
      <Circle cx="32" cy="30" r="22" fill={`url(#${id}g)`} />
      <Ellipse cx="24" cy="22" rx="8" ry="5" fill="#FFFFFF" opacity="0.35" />
      {kind === 'done' ? (
        <Path
          d="M21 31 L28 38 L44 22"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <Path
          d="M23 21 L41 39 M41 21 L23 39"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="5"
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}

const ITEMS = [
  {
    key: 'accept',
    label: { zh: '待接单', en: 'Pending', my: 'လက်ခံရန်' },
    filter: '待确认',
    render: (size: number) => <ClayBox size={size} />,
  },
  {
    key: 'pickup',
    label: { zh: '待取件', en: 'Pickup', my: 'ထုပ်ယူရန်' },
    filter: '待取件',
    render: (size: number) => <ClayClipboard size={size} />,
  },
  {
    key: 'ship',
    label: { zh: '配送中', en: 'In delivery', my: 'ပို့ဆောင်နေ' },
    filter: '配送中',
    render: (size: number) => <ClayScooter size={size} />,
  },
  {
    key: 'done',
    label: { zh: '已完成', en: 'Done', my: 'ပြီးပါပြီ' },
    filter: '已送达',
    render: (size: number) => <SealIcon kind="done" size={size} />,
  },
  {
    key: 'cancel',
    label: { zh: '已取消', en: 'Cancelled', my: 'ပယ်ဖျက်ပြီး' },
    filter: '已取消',
    muted: true,
    render: (size: number) => <SealIcon kind="cancel" size={size} />,
  },
] as const;

export default function MyOrdersBar({
  counts,
  onPressItem,
  onPressAll,
}: {
  counts?: Record<string, number>;
  onPressItem?: (key: string, filter: string) => void;
  onPressAll?: () => void;
}) {
  const { language } = useApp();
  const lang = language === 'en' || language === 'my' ? language : 'zh';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {lang === 'en' ? 'My orders' : lang === 'my' ? 'ကျွန်ုပ်၏အော်ဒါ' : '我的订单'}
        </Text>
        <TouchableOpacity onPress={onPressAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.all}>
            {lang === 'en' ? 'All orders ›' : lang === 'my' ? 'အားလုံး ›' : '全部订单 ›'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        {ITEMS.map((item) => {
          const n = counts?.[item.key] ?? 0;
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.item}
              onPress={() => onPressItem?.(item.key, item.filter)}
              activeOpacity={0.82}
            >
              <View style={styles.iconStage}>
                <View style={styles.iconShadow} />
                <View style={styles.iconLift}>{item.render(40)}</View>
                {n > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{n > 99 ? '99+' : String(n)}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, item.muted && styles.labelMuted]}>{item.label[lang]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    marginBottom: 16,
    shadowColor: '#1A2B48',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  title: { fontSize: 17, fontWeight: '800', color: NAVY, letterSpacing: -0.2 },
  all: { fontSize: 13, color: MUTED, fontWeight: '600' },
  row: { flexDirection: 'row' },
  item: { flex: 1, alignItems: 'center', gap: 7 },
  iconStage: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconShadow: {
    position: 'absolute',
    bottom: 2,
    width: 28,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2C98A6',
    opacity: 0.12,
  },
  iconLift: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: '#FF5A5F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#FF5A5F',
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  label: { fontSize: 12, color: NAVY, fontWeight: '600' },
  labelMuted: { color: MUTED },
});
