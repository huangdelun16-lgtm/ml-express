import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useApp } from '../contexts/AppContext';
import {
  ClayBox,
  ClayWallet,
  ClayShoppingBag,
  ClayClipboard,
  ClayMapBoard,
  ClayScooter,
  ClayCheckSeal,
  ClayCancelSeal,
} from './ProfileClayIcons';
import { COMPLETED_STATUS_FILTER } from '../utils/orderStatusFilter';

const NAVY = '#1A2B48';
const MUTED = '#8A94A6';

const ITEMS = [
  {
    key: 'accept',
    label: { zh: '待接单', en: 'Pending', my: 'လက်ခံရန်' },
    filter: '待确认',
    muted: false,
    render: (size: number) => <ClayBox size={size} />,
  },
  {
    key: 'pay',
    label: { zh: '待收款', en: 'To pay', my: 'ငွေကောက်ရန်' },
    filter: '待收款',
    muted: false,
    render: (size: number) => <ClayWallet size={size} />,
  },
  {
    key: 'pack',
    label: { zh: '打包中', en: 'Packing', my: 'ထုပ်ပိုးနေ' },
    filter: '打包中',
    muted: false,
    render: (size: number) => <ClayShoppingBag size={size} />,
  },
  {
    key: 'pickup',
    label: { zh: '待取件', en: 'Pickup', my: 'ထုပ်ယူရန်' },
    filter: '待取件',
    muted: false,
    render: (size: number) => <ClayClipboard size={size} />,
  },
  {
    key: 'picked',
    label: { zh: '已取件', en: 'Picked up', my: 'ထုပ်ယူပြီး' },
    filter: '已取件',
    muted: false,
    render: (size: number) => <ClayMapBoard size={size} />,
  },
  {
    key: 'ship',
    label: { zh: '配送中', en: 'In delivery', my: 'ပို့ဆောင်နေ' },
    filter: '配送中',
    muted: false,
    render: (size: number) => <ClayScooter size={size} />,
  },
  {
    key: 'done',
    label: { zh: '已完成', en: 'Done', my: 'ပြီးပါပြီ' },
    filter: COMPLETED_STATUS_FILTER,
    muted: false,
    render: (size: number) => <ClayCheckSeal size={size} />,
  },
  {
    key: 'cancel',
    label: { zh: '已取消', en: 'Cancelled', my: 'ပယ်ဖျက်ပြီး' },
    filter: '已取消',
    muted: true,
    render: (size: number) => <ClayCancelSeal size={size} />,
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

      <View style={styles.grid}>
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
                <View style={styles.iconGlass} />
                <View style={styles.iconShadow} />
                <View style={styles.iconLift}>{item.render(36)}</View>
                {n > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{n > 99 ? '99+' : String(n)}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, item.muted && styles.labelMuted]} numberOfLines={1}>
                {item.label[lang]}
              </Text>
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
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 6,
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
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  title: { fontSize: 17, fontWeight: '800', color: NAVY, letterSpacing: -0.2 },
  all: { fontSize: 13, color: MUTED, fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    width: '25%',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  iconStage: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconGlass: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(236,253,250,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  iconShadow: {
    position: 'absolute',
    bottom: 4,
    width: 30,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F766E',
    opacity: 0.14,
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
  label: { fontSize: 11, color: NAVY, fontWeight: '600' },
  labelMuted: { color: MUTED },
});
