import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProxiedImage from './ProxiedImage';
import { formatProductPriceLabel } from '../utils/productVariants';
import type { LatLng } from '../utils/geoDistance';
import {
  fetchNearbyDiscountProducts,
  type NearbyDealProduct,
} from '../services/clientApi/nearbyDealService';
import LoggerService from '../services/LoggerService';

const TEAL = '#2C98A6';
const NAVY = '#1A2B48';
const MUTED = '#8A94A6';
const CARD = '#FFFFFF';

type Lang = 'zh' | 'en' | 'my';

const COPY: Record<
  Lang,
  {
    title: string;
    hint: string;
    needLocation: string;
    enable: string;
    empty: string;
    retry: string;
    locFail: string;
  }
> = {
  zh: {
    title: '附近优惠',
    hint: '当前定位 1.5 公里内 · 折扣 30% 起',
    needLocation: '开启定位后，才能显示附近 1.5 公里内的优惠商品',
    enable: '开启定位',
    empty: '附近 1.5 公里内暂无 3 折以上商品',
    retry: '重新定位',
    locFail: '定位失败，请检查定位权限后重试',
  },
  en: {
    title: 'Nearby deals',
    hint: 'Within 1.5 km of you · 30% off and up',
    needLocation: 'Turn on location to see deals within 1.5 km',
    enable: 'Enable location',
    empty: 'No 30%+ deals within 1.5 km',
    retry: 'Retry location',
    locFail: 'Could not get your location. Check permission and retry.',
  },
  my: {
    title: 'အနီးအနား လျှော့စျေး',
    hint: 'သင့်တည်နေရာ ၁.၅ ကီလိုမီတာအတွင်း · ၃၀% နှင့်အထက်',
    needLocation: 'အနီးအနား လျှော့စျေးကြည့်ရန် တည်နေရာဖွင့်ပါ',
    enable: 'တည်နေရာဖွင့်ရန်',
    empty: '၁.၅ ကီလိုမီတာအတွင်း ၃၀%+ ကုန်ပစ္စည်း မရှိသေးပါ',
    retry: 'ပြန်လည်ရှာဖွေရန်',
    locFail: 'တည်နေရာ မရရှိပါ။ ခွင့်ပြုချက် စစ်ပြီး ထပ်ကြိုးစားပါ။',
  },
};

type Status = 'loading' | 'need_permission' | 'ready' | 'error';

type GpsStatus = 'locating' | 'denied' | 'error' | 'ready';

type Props = {
  language: string;
  origin: LatLng | null;
  gpsStatus: GpsStatus;
  onRequestLocate: () => void;
  onOpenProduct: (deal: NearbyDealProduct) => void;
};

function formatMeters(meters: number, lang: Lang): string {
  const rounded = Math.max(1, Math.round(meters));
  if (lang === 'zh') return `${rounded} 米`;
  return `${rounded} m`;
}

export default function NearbyDealsSection({
  language,
  origin,
  gpsStatus,
  onRequestLocate,
  onOpenProduct,
}: Props) {
  const lang: Lang = language === 'en' ? 'en' : language === 'my' ? 'my' : 'zh';
  const t = COPY[lang];
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [deals, setDeals] = useState<NearbyDealProduct[]>([]);

  useEffect(() => {
    if (!origin) {
      setDeals([]);
      setLoadingDeals(false);
      return;
    }
    let cancelled = false;
    setLoadingDeals(true);
    void fetchNearbyDiscountProducts(origin)
      .then((rows) => {
        if (!cancelled) setDeals(rows);
      })
      .catch((error) => {
        LoggerService.error('附近优惠商品加载失败:', error);
        if (!cancelled) setDeals([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDeals(false);
      });
    return () => {
      cancelled = true;
    };
  }, [origin?.latitude, origin?.longitude]);

  const status: Status =
    gpsStatus === 'denied'
      ? 'need_permission'
      : gpsStatus === 'error' && !origin
        ? 'error'
        : (gpsStatus === 'locating' && !origin) || loadingDeals
          ? 'loading'
          : 'ready';

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.headAccent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.hint}>{t.hint}</Text>
        </View>
      </View>

      {status === 'loading' ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={TEAL} />
        </View>
      ) : null}

      {status === 'need_permission' || status === 'error' ? (
        <TouchableOpacity style={styles.stateCard} onPress={onRequestLocate} activeOpacity={0.86}>
          <Ionicons
            name={status === 'need_permission' ? 'navigate-outline' : 'refresh-outline'}
            size={22}
            color={TEAL}
          />
          <Text style={styles.stateText}>{status === 'need_permission' ? t.needLocation : t.locFail}</Text>
          <Text style={styles.stateCta}>{status === 'need_permission' ? t.enable : t.retry}</Text>
        </TouchableOpacity>
      ) : null}

      {status === 'ready' && deals.length === 0 ? (
        <View style={styles.stateCard}>
          <Ionicons name="pricetag-outline" size={22} color={MUTED} />
          <Text style={styles.stateText}>{t.empty}</Text>
        </View>
      ) : null}

      {status === 'ready' && deals.length > 0 ? (
        <View style={styles.list}>
          {deals.map((deal) => (
            <TouchableOpacity
              key={deal.id}
              style={styles.card}
              activeOpacity={0.88}
              onPress={() => onOpenProduct(deal)}
            >
              <View style={styles.imageWrap}>
                <ProxiedImage uri={deal.image_url} style={styles.image} iconSize={22} />
                <View style={styles.offBadge}>
                  <Text style={styles.offText}>-{Math.round(deal.discountPercent)}%</Text>
                </View>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name} numberOfLines={2}>
                  {deal.name}
                </Text>
                <Text style={styles.price} numberOfLines={1}>
                  {formatProductPriceLabel(deal, lang)}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {deal.storeName} · {formatMeters(deal.distanceM, lang)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#1A2B48',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  default: { elevation: 2 },
});

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  headAccent: {
    width: 4,
    height: 28,
    borderRadius: 2,
    backgroundColor: TEAL,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
  },
  hint: {
    marginTop: 2,
    fontSize: 12,
    color: MUTED,
    fontWeight: '600',
  },
  centerBox: {
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    ...cardShadow,
  },
  stateText: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 18,
  },
  stateCta: {
    fontSize: 13,
    color: TEAL,
    fontWeight: '800',
  },
  list: {
    gap: 10,
  },
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 10,
    gap: 12,
    ...cardShadow,
  },
  imageWrap: {
    width: 92,
    height: 92,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#EEF3F5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  offBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#E11D48',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  offText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
  },
  price: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '800',
    color: TEAL,
  },
  meta: {
    marginTop: 2,
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
  },
});
