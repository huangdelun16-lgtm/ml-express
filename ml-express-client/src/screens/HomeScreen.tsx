import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  Dimensions,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import TutorialModal from '../components/TutorialModal';
import BrandRider from '../components/BrandRider';
import {
  ClayBook,
  ClayBox,
  ClayHeadset,
  ClayMapBoard,
  ClayPagodas,
  ClayScooter,
  ClayShoppingBag,
  ClayStoreFront,
  ProfileAvatar3D,
} from '../components/ProfileClayIcons';
import { packageService, bannerService, Banner } from '../services/supabase';
import { errorService } from '../services/ErrorService';
import { APP_CONFIG } from '../config/constants';
import { analytics } from '../services/AnalyticsService';
import { avatarDisplayUri, hydrateUserAvatarFromServer, loadUserAvatarUrl } from '../utils/userAvatar';

const { width } = Dimensions.get('window');
const TEAL = '#2C98A6';
const NAVY = '#1A2B48';
const MUTED = '#8A94A6';
const PAGE = '#F4F7FA';
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
      inProgress: '进行中',
      pendingPickup: '待取件',
      orderNow: '立即下单',
      nearbyStores: '附近商店',
      trackOrder: '订单追踪',
      support: '客服',
      promoUntil: '活动至 2026年1月',
      newBadge: 'NEW',
    },
    en: {
      slogan: 'City flash · 30 min delivery',
      hello: 'Hi',
      guest: 'Guest',
      howToUse: 'How to use',
      howToUseHint: 'Beginner guide',
      logistics: 'My logistics',
      inProgress: 'In progress',
      pendingPickup: 'Pickup',
      orderNow: 'Order now',
      nearbyStores: 'Nearby stores',
      trackOrder: 'Track order',
      support: 'Support',
      promoUntil: 'Until Jan 2026',
      newBadge: 'NEW',
    },
    my: {
      slogan: 'မြို့တွင်း · ၃၀ မိနစ်',
      hello: 'မင်္ဂလာပါ',
      guest: 'ဧည့်သည်',
      howToUse: 'အသုံးပြုနည်း',
      howToUseHint: 'စတင်သူလမ်းညွှန်',
      logistics: 'ကျွန်ုပ်၏ပို့ဆောင်မှု',
      inProgress: 'ဆောင်ရွက်နေဆဲ',
      pendingPickup: 'ထုပ်ယူရန်',
      orderNow: 'ယခုမှာယူ',
      nearbyStores: 'အနီးဆိုင်',
      trackOrder: 'ခြေရာခံ',
      support: 'ဝန်ဆောင်မှု',
      promoUntil: '၂၀၂၆ ဇန်နဝါရီ အထိ',
      newBadge: 'NEW',
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

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUserData(), loadBanners()]);
    setRefreshing(false);
  };

  const requireLogin = () => {
    if (isGuest || !userId) {
      navigation.navigate('Login');
      return false;
    }
    return true;
  };

  const handleCallHotline = () => {
    const cancelText = language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'မဆက်တော့ပါ';
    const title =
      language === 'zh' ? '选择拨打的客服热线' : language === 'en' ? 'Choose a hotline number' : 'ဖုန်းနံပါတ်ကို ရွေးချယ်ပါ';
    Alert.alert(title, '', [
      ...HOTLINE_NUMBERS.map((item) => ({
        text: item.display,
        onPress: () => Linking.openURL(`tel:${item.tel}`),
      })),
      { text: cancelText, style: 'cancel' as const },
    ]);
  };

  const openOrders = (filterStatus: string) => {
    if (!requireLogin()) return;
    navigation.navigate('MyOrders', { filterStatus });
  };

  const greetName = userName || (isGuest ? t.guest : '');
  const avatarSrc = avatarDisplayUri(avatarUri);

  const quickActions = [
    { key: 'order', label: t.orderNow, icon: <ClayScooter size={42} />, onPress: () => navigation.navigate('PlaceOrder') },
    { key: 'mall', label: t.nearbyStores, icon: <ClayStoreFront size={42} />, onPress: () => navigation.navigate('CityMall') },
    { key: 'track', label: t.trackOrder, icon: <ClayMapBoard size={42} />, onPress: () => navigation.navigate('TrackOrder') },
    { key: 'support', label: t.support, icon: <ClayHeadset size={42} />, onPress: handleCallHotline },
  ];

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
          <View style={styles.logoTile}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <View style={styles.brandCol}>
            <Text style={styles.brandName}>MARKET LINK</Text>
            <Text style={styles.brandSub}>EXPRESS</Text>
            <Text style={styles.slogan}>{t.slogan}</Text>
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
                <ProfileAvatar3D size={28} />
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

        <View style={styles.sectionHead}>
          <View style={styles.sectionBar} />
          <Text style={styles.sectionTitle}>{t.logistics}</Text>
        </View>
        <View style={styles.logisticsRow}>
          <TouchableOpacity style={styles.logisticsCard} onPress={() => openOrders('配送中')} activeOpacity={0.88}>
            <Text style={styles.logisticsLabel}>{t.inProgress}</Text>
            <Text style={styles.logisticsValue}>{orderStats.inTransit}</Text>
            <View style={styles.logisticsIcon}>
              <ClayBox size={40} />
            </View>
            <Ionicons name="chevron-forward" size={16} color="#C5CDD6" style={styles.logisticsChevron} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logisticsCard} onPress={() => openOrders('待取件')} activeOpacity={0.88}>
            <Text style={styles.logisticsLabel}>{t.pendingPickup}</Text>
            <Text style={styles.logisticsValue}>{orderStats.pending}</Text>
            <View style={styles.logisticsIcon}>
              <ClayShoppingBag size={40} />
            </View>
            <Ionicons name="chevron-forward" size={16} color="#C5CDD6" style={styles.logisticsChevron} />
          </TouchableOpacity>
        </View>

        <View style={styles.actionsRow}>
          {quickActions.map((item) => (
            <TouchableOpacity key={item.key} style={styles.actionCard} onPress={item.onPress} activeOpacity={0.88}>
              {item.icon}
              <Text style={styles.actionLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TutorialModal isVisible={showTutorialModal} onClose={() => setShowTutorialModal(false)} />
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
  logoTile: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...cardShadow,
  },
  logo: {
    width: 44,
    height: 44,
  },
  brandCol: {
    flex: 1,
    minWidth: 0,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '800',
    color: NAVY,
    letterSpacing: 0.2,
  },
  brandSub: {
    marginTop: -1,
    fontSize: 15,
    fontWeight: '800',
    color: TEAL,
    letterSpacing: 0.6,
  },
  slogan: {
    marginTop: 2,
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
  },
  helloPill: {
    maxWidth: 132,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 4,
    gap: 6,
    ...cardShadow,
  },
  helloText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    color: NAVY,
  },
  helloAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E7F7F9',
  },
  helloAvatarImg: {
    width: 28,
    height: 28,
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
  sectionHead: {
    marginTop: 18,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: TEAL,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: NAVY,
  },
  logisticsRow: {
    marginTop: 12,
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: 12,
  },
  logisticsCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 16,
    minHeight: 108,
    ...cardShadow,
  },
  logisticsLabel: {
    fontSize: 13,
    color: MUTED,
    fontWeight: '700',
  },
  logisticsValue: {
    marginTop: 6,
    fontSize: 32,
    fontWeight: '800',
    color: TEAL,
  },
  logisticsIcon: {
    position: 'absolute',
    right: 14,
    bottom: 12,
  },
  logisticsChevron: {
    position: 'absolute',
    right: 12,
    top: 16,
  },
  actionsRow: {
    marginTop: 14,
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 8,
    ...cardShadow,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: NAVY,
    textAlign: 'center',
  },
});
