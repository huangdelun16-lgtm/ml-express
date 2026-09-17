import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import TutorialModal from '../components/TutorialModal';
import HotlinePickerModal from '../components/HotlinePickerModal';
import BrandRider from '../components/BrandRider';
import HomeToolsSection from '../components/HomeToolsSection';
import NearbyDealsSection from '../components/NearbyDealsSection';
import type { NearbyDealProduct } from '../services/clientApi/nearbyDealService';
import {
  accountGpsStorageId,
  capturePhoneGps,
  loadSavedAccountGps,
  resolvePlaceLabel,
  saveAccountGps,
  type AccountGpsFix,
} from '../services/clientApi/customerGpsService';
import { feedbackService } from '../services/FeedbackService';
import {
  ClayBook,
  ClayPagodas,
  ClayPin,
  ProfileAvatar3D,
} from '../components/ProfileClayIcons';
import { packageService, bannerService, Banner } from '../services/supabase';
import { errorService } from '../services/ErrorService';
import { APP_CONFIG } from '../config/constants';
import { analytics } from '../services/AnalyticsService';
import { avatarDisplayUri, hydrateUserAvatarFromServer, loadUserAvatarUrl } from '../utils/userAvatar';
import { common } from '../i18n';

const { width } = Dimensions.get('window');
const TEAL = '#2C98A6';
const NAVY = '#1A2B48';
const MUTED = '#8A94A6';
const PAGE = '#F2F5F7';
const CARD = '#FFFFFF';
const BANNER_W = width - 32;

const HOTLINE_NUMBERS = [
  { display: APP_CONFIG.CONTACT.PHONE_DISPLAY, tel: APP_CONFIG.CONTACT.PHONE },
  { display: '(+95) 09941118588', tel: '+959941118588' },
  { display: '(+95) 09941118688', tel: '+959941118688' },
];

const FALLBACK_BANNERS: Banner[] = [
  {
    id: 'fallback-mdy',
    title: '曼德勒同城',
    subtitle: '2,000 Ks / 趟',
    burmese_title: 'မန္တလေးမြို့တွင်း ၂၀၀၀ ကျပ် / ခရီး',
    bg_color_start: '#D7F3F6',
    bg_color_end: '#F2FBFC',
  },
  {
    id: 'fallback-track',
    title: '实时定位追踪',
    subtitle: '5 分钟接单 · 全程可视',
    burmese_title: 'အချိန်နှင့်တပြေးညီ ခြေရာခံနိုင်သည်',
    bg_color_start: '#E4F6F8',
    bg_color_end: '#F7FCFD',
  },
  {
    id: 'fallback-fast',
    title: '同城闪送',
    subtitle: '急送 30 分钟到家',
    burmese_title: '၃၀ မိနစ်အတွင်း အိမ်အရောက်',
    bg_color_start: '#DDF1F4',
    bg_color_end: '#F4FBFC',
  },
];

interface OrderStats {
  total: number;
  pending: number;
  inTransit: number;
  delivered: number;
  cancelled: number;
}

export default function HomeScreen({ navigation }: any) {
  const { language } = useApp();
  const c = common(language);
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [userName, setUserName] = useState('');
  const [avatarUri, setAvatarUri] = useState('');
  const [orderStats, setOrderStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    inTransit: 0,
    delivered: 0,
    cancelled: 0,
  });
  const bannerScrollRef = useRef<ScrollView>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isBannerPaused, setIsBannerPaused] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showHotlineModal, setShowHotlineModal] = useState(false);
  const [gpsFix, setGpsFix] = useState<AccountGpsFix | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'denied' | 'error' | 'ready'>('locating');
  const gpsAutoLocateAlive = useRef(true);

  const displayBanners = banners.length > 0 ? banners : FALLBACK_BANNERS;
  const totalBanners = displayBanners.length;

  const t = {
    zh: {
      slogan: '同城闪送 · 30 分钟到家',
      hello: '你好',
      guest: '访客',
      howToUse: '使用教学',
      howToUseHint: '新手上路 · 图文详解',
      logistics: '我的物流',
      viewAll: '查看全部',
      inProgress: '进行中',
      pendingPickup: '待取件',
      inTransitHint: '运输中',
      pendingHint: '待处理',
      orderNow: '立即下单',
      orderNowHint: '同城闪送 · 30分钟送达',
      nearbyStores: '附近商家',
      nearbyHint: '逛商场 · 就近买',
      trackOrder: '订单追踪',
      trackHint: '实时查看物流动态',
      support: '客服',
      supportHint: '在线为您服务',
      promoUntil: '活动至 2026年1月',
      newBadge: 'NEW',
      gpsLocating: '正在读取这台手机的 GPS…',
      gpsDenied: '需要定位权限，才能按你的位置推荐附近优惠',
      gpsError: '定位失败，点图标重新读取 GPS',
      gpsReady: '已绑定这台手机位置',
      gpsAccuracy: '精度',
    },
    en: {
      slogan: 'City flash · 30 min delivery',
      hello: 'Hi',
      guest: 'Guest',
      howToUse: 'How to use',
      howToUseHint: 'Beginner guide',
      logistics: 'My logistics',
      viewAll: 'See all',
      inProgress: 'Ongoing',
      pendingPickup: 'Pickup',
      inTransitHint: 'In transit',
      pendingHint: 'Pending',
      orderNow: 'Order now',
      orderNowHint: 'City flash · 30 min delivery',
      nearbyStores: 'Nearby stores',
      nearbyHint: 'Malls · buy nearby',
      trackOrder: 'Tracking',
      trackHint: 'Live shipment updates',
      support: 'Support',
      supportHint: 'We are online for you',
      promoUntil: 'Until Jan 2026',
      newBadge: 'NEW',
      gpsLocating: 'Reading GPS on this phone…',
      gpsDenied: 'Location permission is required for nearby deals',
      gpsError: 'Could not locate. Tap the pin to retry',
      gpsReady: 'This phone is pinned',
      gpsAccuracy: 'Accuracy',
    },
    my: {
      slogan: 'မြို့တွင်း · ၃၀ မိနစ်',
      hello: 'မင်္ဂလာပါ',
      guest: 'ဧည့်သည်',
      howToUse: 'အသုံးပြုနည်း',
      howToUseHint: 'စတင်သူလမ်းညွှန်',
      logistics: 'ကျွန်ုပ်ပို့ဆောင်မှု',
      viewAll: 'အားလုံးကြည့်ရန်',
      inProgress: 'ဆောင်ရွက်ဆဲ',
      pendingPickup: 'ထုပ်ယူရန်',
      inTransitHint: 'ပို့ဆောင်ဆဲ',
      pendingHint: 'စောင့်ဆိုင်း',
      orderNow: 'ယခုမှာယူ',
      orderNowHint: 'မြို့တွင်း · ၃၀ မိနစ်ပို့ဆောင်',
      nearbyStores: 'အနီးဆိုင်',
      nearbyHint: 'စျေးဝယ် · အနီး',
      trackOrder: 'ခြေရာခံ',
      trackHint: 'ပို့ဆောင်မှုကို အချိန်နှင့်တပြေးညီကြည့်ရန်',
      support: 'ဝန်ဆောင်မှု',
      supportHint: 'အွန်လိုင်းမှ ကူညီပေးပါသည်',
      promoUntil: '၂၀၂၆ ဇန်နဝါရီ အထိ',
      newBadge: 'NEW',
      gpsLocating: 'ဤဖုန်း GPS ဖတ်နေသည်…',
      gpsDenied: 'အနီးအနား လျှော့စျေးအတွက် တည်နေရာခွင့်ပြုချက် လိုအပ်သည်',
      gpsError: 'တည်နေရာ မရပါ။ ပင်ကိုနှိပ်၍ GPS ယူပါ',
      gpsReady: 'ဤဖုန်း တည်နေရာ ချိတ်ပြီး',
      gpsAccuracy: 'တိကျမှု',
    },
  }[language];

  useEffect(() => {
    analytics.trackPageView('HomeScreen');
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      const activeBanners = await bannerService.getActiveBanners();
      setBanners(activeBanners);
    } catch (error) {
      console.error('Failed to load banners:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const checkAuthAndLoadData = async () => {
        try {
          const storedUserId = await AsyncStorage.getItem('userId');
          const guestMode = await AsyncStorage.getItem('isGuest');
          if (!storedUserId && guestMode !== 'true') {
            navigation.replace('Login');
            return;
          }
          loadUserData();
        } catch (error) {
          console.error('Auth check failed:', error);
        }
      };
      checkAuthAndLoadData();
    }, [])
  );

  useEffect(() => {
    if (isBannerPaused || totalBanners <= 1) return;
    const timer = setInterval(() => {
      const nextIndex = (currentBannerIndex + 1) % totalBanners;
      bannerScrollRef.current?.scrollTo({ x: nextIndex * BANNER_W, animated: true });
      setCurrentBannerIndex(nextIndex);
    }, 5000);
    return () => clearInterval(timer);
  }, [currentBannerIndex, isBannerPaused, totalBanners]);

  const loadUserData = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      const storedUserName = await AsyncStorage.getItem('userName');
      const storedUserEmail = await AsyncStorage.getItem('userEmail');
      const storedUserPhone = await AsyncStorage.getItem('userPhone');
      const guestMode = await AsyncStorage.getItem('isGuest');

      setUserId(storedUserId);
      setUserName(storedUserName || '');
      setIsGuest(guestMode === 'true');

      if (storedUserId && guestMode !== 'true') {
        const [photo, remote] = await Promise.all([
          loadUserAvatarUrl(storedUserId),
          hydrateUserAvatarFromServer(storedUserId).catch(() => ''),
        ]);
        setAvatarUri(remote || photo);
        await loadOrderData(storedUserId, storedUserEmail || undefined, storedUserPhone || undefined);
      } else {
        setAvatarUri('');
        setOrderStats({ total: 0, pending: 0, inTransit: 0, delivered: 0, cancelled: 0 });
      }
    } catch (error) {
      errorService.handleError(error, { context: 'HomeScreen.loadUserData', silent: true });
    }
  };

  const loadOrderData = async (customerId: string, email?: string, phone?: string) => {
    try {
      const stats = await packageService.getOrderStats(customerId, email, phone, 'customer');
      setOrderStats(stats);
    } catch (error) {
      errorService.handleError(error, { context: 'HomeScreen.loadOrderData', silent: true });
    }
  };

  const locateAccountGps = useCallback(async (opts?: { silent?: boolean }) => {
    const accountId = accountGpsStorageId(userId, isGuest);
    if (!accountId) return;
    setGpsStatus('locating');
    const captured = await capturePhoneGps();
    if (opts?.silent && !gpsAutoLocateAlive.current) return;
    if (!captured.ok) {
      setGpsStatus(captured.reason === 'denied' ? 'denied' : 'error');
      if (!opts?.silent) {
        feedbackService.warning(captured.reason === 'denied' ? t.gpsDenied : t.gpsError);
      }
      return;
    }
    const placeLabel = await resolvePlaceLabel(captured.coords);
    if (opts?.silent && !gpsAutoLocateAlive.current) return;
    const fix: AccountGpsFix = {
      userId: accountId,
      latitude: captured.coords.latitude,
      longitude: captured.coords.longitude,
      accuracyM: captured.accuracyM,
      placeLabel,
      updatedAt: new Date().toISOString(),
    };
    setGpsFix(fix);
    setGpsStatus('ready');
    await saveAccountGps(fix);
    if (!opts?.silent) feedbackService.success(t.gpsReady);
  }, [userId, isGuest, t.gpsDenied, t.gpsError, t.gpsReady]);

  useEffect(() => {
    const accountId = accountGpsStorageId(userId, isGuest);
    if (!accountId) return;
    let cancelled = false;
    gpsAutoLocateAlive.current = true;
    void (async () => {
      const saved = await loadSavedAccountGps(accountId);
      if (cancelled) return;
      if (saved) {
        setGpsFix(saved);
        setGpsStatus('ready');
      }
      if (cancelled) return;
      await locateAccountGps({ silent: true });
    })();
    return () => {
      cancelled = true;
      gpsAutoLocateAlive.current = false;
    };
  }, [userId, isGuest, locateAccountGps]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUserData(), loadBanners(), locateAccountGps({ silent: true })]);
    setRefreshing(false);
  };

  const openNearbyDeal = (deal: NearbyDealProduct) => {
    navigation.navigate('MerchantProducts', {
      storeId: deal.storeId,
      storeName: deal.storeName,
      highlightProductId: deal.id,
    });
  };

  const requireLogin = () => {
    if (isGuest || !userId) {
      navigation.navigate('Login');
      return false;
    }
    return true;
  };

  const handleCallHotline = () => {
    setShowHotlineModal(true);
  };

  const openOrders = (filterStatus: string) => {
    if (!requireLogin()) return;
    navigation.navigate('MyOrders', { filterStatus });
  };

  const greetName = userName || (isGuest ? t.guest : '');
  const avatarSrc = avatarDisplayUri(avatarUri);

  const renderBanner = (banner: Banner, index: number) => (
    <TouchableOpacity
      key={banner.id || String(index)}
      activeOpacity={0.92}
      onPress={() => banner.link_url && Linking.openURL(banner.link_url)}
      onPressIn={() => setIsBannerPaused(true)}
      onPressOut={() => setIsBannerPaused(false)}
      style={styles.bannerCard}
    >
      <LinearGradient
        colors={[banner.bg_color_start || '#D7F3F6', banner.bg_color_end || '#F2FBFC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bannerGradient}
      >
        <View style={styles.pagodaWrap}>
          <ClayPagodas width={170} height={92} />
        </View>
        <View style={styles.bannerCopy}>
          <Text style={styles.bannerTitle} numberOfLines={2}>
            {banner.title}
          </Text>
          {banner.subtitle ? (
            <Text style={styles.bannerPrice} numberOfLines={1}>
              {banner.subtitle}
            </Text>
          ) : null}
          <Text style={styles.bannerUntil}>{t.promoUntil}</Text>
          {banner.burmese_title ? (
            <Text style={styles.bannerMy} numberOfLines={2}>
              {banner.burmese_title}
            </Text>
          ) : null}
        </View>
        <BrandRider width={118} style={styles.bannerRider} />
        {index === 0 ? (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>{t.newBadge}</Text>
          </View>
        ) : null}
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} colors={[TEAL]} />}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
          <TouchableOpacity
            style={styles.gpsTile}
            onPress={() => void locateAccountGps({ silent: false })}
            activeOpacity={0.82}
            accessibilityRole="button"
          >
            <View style={styles.gpsHalo} />
            {gpsStatus === 'locating' ? (
              <ActivityIndicator size="small" color={TEAL} />
            ) : (
              <ClayPin size={34} />
            )}
          </TouchableOpacity>
          <View style={styles.gpsCol}>
            <Text style={styles.gpsHint} numberOfLines={2}>
              {gpsStatus === 'locating'
                ? t.gpsLocating
                : gpsStatus === 'denied'
                  ? t.gpsDenied
                  : gpsStatus === 'error'
                    ? t.gpsError
                    : `${gpsFix?.placeLabel || t.gpsReady}${
                        gpsFix?.accuracyM != null
                          ? ` · ${t.gpsAccuracy} ${Math.round(gpsFix.accuracyM)}m`
                          : ''
                      }`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.helloPill}
            onPress={() => navigation.navigate(isGuest ? 'Login' : 'Profile')}
            activeOpacity={0.86}
          >
            <Text style={styles.helloText} numberOfLines={1}>
              {t.hello}{greetName ? `, ${greetName}` : ''}
            </Text>
            <View style={styles.helloAvatar}>
              {avatarSrc ? (
                <Image source={{ uri: avatarSrc }} style={styles.helloAvatarImg} />
              ) : (
                <ProfileAvatar3D size={26} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.tutorialCard} onPress={() => setShowTutorialModal(true)} activeOpacity={0.88}>
          <ClayBook size={46} />
          <View style={{ flex: 1 }}>
            <Text style={styles.tutorialTitle}>{t.howToUse}</Text>
            <Text style={styles.tutorialHint}>{t.howToUseHint}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#C5CDD6" />
        </TouchableOpacity>

        <View style={styles.bannerWrap}>
          <ScrollView
            ref={bannerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={BANNER_W}
            decelerationRate="fast"
            onMomentumScrollEnd={(event) => {
              const next = Math.round(event.nativeEvent.contentOffset.x / BANNER_W);
              if (next >= 0 && next < totalBanners) setCurrentBannerIndex(next);
            }}
          >
            {displayBanners.map(renderBanner)}
          </ScrollView>
          <View style={styles.dots}>
            {displayBanners.map((banner, index) => (
              <View
                key={banner.id || `dot-${index}`}
                style={[styles.dot, currentBannerIndex === index && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        <HomeToolsSection
          t={t}
          inTransit={orderStats.inTransit}
          pending={orderStats.pending}
          onViewAll={() => openOrders('all')}
          onOpenInProgress={() => openOrders('配送中')}
          onOpenPickup={() => openOrders('待取件')}
          onOrderNow={() => navigation.navigate('PlaceOrder')}
          onNearby={() => navigation.navigate('CityMall')}
          onTrack={() => navigation.navigate('TrackOrder')}
          onSupport={handleCallHotline}
        />

        <NearbyDealsSection
          language={language}
          origin={
            gpsFix
              ? { latitude: gpsFix.latitude, longitude: gpsFix.longitude }
              : null
          }
          gpsStatus={gpsStatus}
          onRequestLocate={() => void locateAccountGps({ silent: false })}
          onOpenProduct={openNearbyDeal}
        />
      </ScrollView>

      <TutorialModal isVisible={showTutorialModal} onClose={() => setShowTutorialModal(false)} />
      <HotlinePickerModal
        visible={showHotlineModal}
        title={c.hotlineTitle}
        numbers={HOTLINE_NUMBERS}
        cancelLabel={c.cancel}
        onClose={() => setShowHotlineModal(false)}
      />
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
  container: {
    flex: 1,
    backgroundColor: PAGE,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  gpsTile: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...cardShadow,
  },
  gpsHalo: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(44,152,166,0.12)',
  },
  gpsCol: {
    flex: 1,
    minWidth: 0,
    marginRight: 4,
  },
  gpsHint: {
    fontSize: 12,
    color: MUTED,
    fontWeight: '600',
    lineHeight: 16,
  },
  helloPill: {
    flexShrink: 0,
    maxWidth: 118,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 999,
    paddingLeft: 8,
    paddingRight: 3,
    paddingVertical: 3,
    gap: 5,
    ...cardShadow,
  },
  helloText: {
    flexShrink: 1,
    maxWidth: 72,
    fontSize: 11,
    fontWeight: '700',
    color: NAVY,
  },
  helloAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: '#E7F7F9',
  },
  helloAvatarImg: {
    width: 26,
    height: 26,
  },
  tutorialCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: CARD,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...cardShadow,
  },
  tutorialTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: NAVY,
  },
  tutorialHint: {
    marginTop: 3,
    fontSize: 12,
    color: MUTED,
    fontWeight: '600',
  },
  bannerWrap: {
    marginTop: 14,
    paddingHorizontal: 16,
  },
  bannerCard: {
    width: BANNER_W,
    height: 168,
    borderRadius: 24,
    overflow: 'hidden',
    ...cardShadow,
  },
  bannerGradient: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  pagodaWrap: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    opacity: 0.9,
  },
  bannerCopy: {
    maxWidth: '58%',
    zIndex: 2,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: NAVY,
  },
  bannerPrice: {
    marginTop: 6,
    fontSize: 20,
    fontWeight: '800',
    color: TEAL,
  },
  bannerUntil: {
    marginTop: 6,
    fontSize: 12,
    color: MUTED,
    fontWeight: '600',
  },
  bannerMy: {
    marginTop: 4,
    fontSize: 11,
    color: '#7A8899',
  },
  bannerRider: {
    position: 'absolute',
    right: 4,
    bottom: -6,
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: TEAL,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D5DEE6',
  },
  dotActive: {
    width: 16,
    backgroundColor: TEAL,
  },
});

