import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Dimensions, TextInput, ScrollView, Vibration, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Skeleton, { GridSkeleton, ListItemSkeleton } from '../components/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { deliveryStoreService, merchantService, reviewService, bannerService, Banner } from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import LoggerService from '../services/LoggerService';
import { formatProductPriceLabel, productHasVariants } from '../utils/productVariants';
import { CITY_MALL_CATEGORIES, getMerchantStoreTypeLabel } from '../services/_shared/merchantStoreTypes';
import type { StoreTypeLang } from '../services/_shared/merchantStoreTypes';
import { remoteImageUri } from '../services/clientApi/nativeSupabaseUrl';
import { storeAvatarDisplayUri } from '../utils/storeAvatar';
import ProxiedImage from '../components/ProxiedImage';

const { width } = Dimensions.get('window');
const TEAL = '#2C98A6';
const PAGE_BG = '#F3F5F7';
const NAVY = '#0f172a';

/** 商户类型 → 图标区渐变（高级感点缀） */
const STORE_TYPE_GRADIENT: Record<string, [string, string]> = {
  restaurant: ['#f59e0b', '#ea580c'],
  tea_shop: ['#14b8a6', '#0d9488'],
  drinks_snacks: ['#f472b6', '#db2777'],
  grocery: ['#22c55e', '#16a34a'],
  supermarket: ['#3b82f6', '#4f46e5'],
  breakfast: ['#fb923c', '#f97316'],
  cake_shop: ['#ec4899', '#be185d'],
  flower_shop: ['#a855f7', '#7c3aed'],
  clothing_store: ['#6366f1', '#4338ca'],
  hardware_store: ['#64748b', '#475569'],
  transit_station: ['#0ea5e9', '#0284c7'],
};
const DEFAULT_STORE_GRADIENT: [string, string] = ['#38bdf8', '#6366f1'];

interface DeliveryStore {
  id: string;
  store_name: string;
  store_code: string;
  address: string;
  phone: string;
  store_type: string;
  status: string;
  operating_hours: string;
  is_closed_today?: boolean;
  vacation_dates?: string[];
}

const AllMerchantsSectionHeader = React.memo(({ title, count, language }: { title: string; count: number; language: string }) => {
  const kicker =
    language === 'zh' ? '精选商户' : language === 'en' ? 'Curated stores' : 'ရွေးချယ်ထားသော ဆိုင်များ';
  return (
    <View style={styles.allMerchantsHeader}>
      <View style={styles.allMerchantsTitleRow}>
        <LinearGradient
          colors={[TEAL, '#1F7A86', 'rgba(44,152,166,0.18)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.allMerchantsAccentBar}
        />
        <View style={styles.allMerchantsTitleBlock}>
          <Text style={styles.allMerchantsKicker}>{kicker}</Text>
          <View style={styles.allMerchantsTitleLine}>
            <Text style={styles.allMerchantsTitleText}>{title}</Text>
            {count > 0 ? (
              <View style={styles.allMerchantsCountPill}>
                <Text style={styles.allMerchantsCountText}>{count}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
      <LinearGradient
        colors={['rgba(44,152,166,0.45)', 'rgba(148,163,184,0.12)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.allMerchantsDivider}
      />
    </View>
  );
});

// 🚀 优化：使用 React.memo 包装组件，减少不必要的重绘
const StoreCard = React.memo(({ item, status, language, t, productMatches, stats, onVisit, onShowReviews }: any) => {
  const matchedProducts = productMatches[item.id] || [];
  const statusLabel = status.isOpen
    ? t.openNow
    : status.reason === 'closed_today'
      ? t.closedToday
      : status.reason === 'vacation'
        ? t.onVacation
        : t.closedNow;
  const iconGradient = STORE_TYPE_GRADIENT[item.store_type] || DEFAULT_STORE_GRADIENT;
  const rating = stats?.average > 0 ? stats.average : 4.9;
  const avatarUri = storeAvatarDisplayUri(item.avatar_url, item.updated_at);

  return (
    <TouchableOpacity
      style={[styles.storeCard, !status.isOpen && styles.storeCardClosed]}
      onPress={() => onVisit(item, status)}
      activeOpacity={status.isOpen ? 0.86 : 1}
    >
      <View style={styles.storeHeader}>
        <LinearGradient colors={status.isOpen ? iconGradient : ['#94a3b8', '#64748b']} style={[styles.storeLogo, { overflow: 'hidden' }]}>
          {avatarUri ? (
            <ProxiedImage
              uri={avatarUri}
              style={styles.storeLogoImage}
              fallback={
                <Text style={[styles.storeIcon, !status.isOpen && { opacity: 0.55 }]}>
                  {getStoreIcon(item.store_type)}
                </Text>
              }
            />
          ) : (
            <Text style={[styles.storeIcon, !status.isOpen && { opacity: 0.55 }]}>
              {getStoreIcon(item.store_type)}
            </Text>
          )}
        </LinearGradient>

        <View style={styles.storeMainInfo}>
          <View style={styles.storeTitleRow}>
            <Text style={[styles.storeName, !status.isOpen && styles.storeNameClosed]} numberOfLines={1}>
              {item.store_name}
            </Text>
            <View style={[styles.statusPill, status.isOpen ? styles.statusPillOpen : styles.statusPillClosed]}>
              <View style={[styles.statusDot, { backgroundColor: status.isOpen ? '#22c55e' : '#ef4444' }]} />
              <Text
                style={[styles.statusPillText, { color: status.isOpen ? '#15803d' : '#b91c1c' }]}
                numberOfLines={1}
              >
                {statusLabel}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="star" size={13} color="#F5B942" />
            <Text style={styles.ratingText}>{Number(rating).toFixed(1)}</Text>
            {stats?.count > 0 ? (
              <TouchableOpacity onPress={() => onShowReviews(item)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                <Text style={styles.metaMuted}>
                  · {stats.count} {t.reviews}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.metaMuted}>· {getStoreTypeLabel(item.store_type, language)}</Text>
            )}
          </View>

          <View style={styles.etaPill}>
            <Ionicons name="bicycle-outline" size={13} color="#fff" />
            <Text style={styles.etaPillText}>{t.eta}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color="#64748b" />
            <Text style={styles.metaMuted} numberOfLines={1}>
              {item.address || t.distanceCity}
            </Text>
          </View>
          <Text style={styles.freeDeliveryText}>{t.freeDelivery}</Text>

          {matchedProducts.length > 0 ? (
            <View style={styles.matchChip}>
              <Ionicons name="sparkles" size={11} color={TEAL} />
              <Text style={styles.matchText} numberOfLines={1}>
                {matchedProducts.join(' · ')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const ProductCard = React.memo(({ item, t, onVisit, onAddToCart, language }: any) => {
  const store = item.delivery_stores;
  const storeStatus = store ? checkStoreOpenStatus(store as any) : { isOpen: true };
  const langKey = language === 'zh' ? 'zh' : language === 'my' ? 'my' : 'en';

  return (
    <TouchableOpacity style={styles.productCard} onPress={() => onVisit(item, store)} activeOpacity={0.86}>
      <View style={styles.productMain}>
        <ProxiedImage uri={item.image_url} style={styles.productImage} iconSize={22} />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productPrice}>{formatProductPriceLabel(item, langKey)}</Text>
          {store ? (
            <View style={styles.productStoreInfo}>
              <Ionicons name="storefront-outline" size={13} color="#94a3b8" />
              <Text style={styles.productStoreName} numberOfLines={1}>{store.store_name}</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.addCircle, !storeStatus.isOpen && styles.disabledBtn]}
          disabled={!storeStatus.isOpen}
          onPress={() => onAddToCart(item, store)}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const getStoreIcon = (type: string) => {
  switch (type) {
    case 'restaurant': return '🍽️';
    case 'tea_shop': return '🍵';
    case 'drinks_snacks': return '🥤';
    case 'grocery': return '🛒';
    case 'supermarket': return '🏪';
    case 'breakfast': return '🍳';
    case 'cake_shop': return '🎂';
    case 'flower_shop': return '💐';
    case 'clothing_store': return '👕';
    case 'hardware_store': return '🔧';
    case 'transit_station': return '🚚';
    default: return '🏪';
  }
};

const getStoreTypeLabel = (type: string, language: string) => {
  const lang: StoreTypeLang = language === 'en' ? 'en' : language === 'my' ? 'my' : 'zh';
  return getMerchantStoreTypeLabel(type, lang);
};

const checkStoreOpenStatus = (store: DeliveryStore) => {
  const isClosed = !!store.is_closed_today;
  if (isClosed) return { isOpen: false, reason: 'closed_today' };
  
  if (store.vacation_dates && Array.isArray(store.vacation_dates)) {
    const today = new Date().toISOString().split('T')[0];
    if (store.vacation_dates.includes(today)) {
      return { isOpen: false, reason: 'vacation' };
    }
  }
  
  try {
    const hours = store.operating_hours || '09:00 - 21:00';
    const parts = hours.split(/\s*-\s*/);
    if (parts.length < 2) return { isOpen: true, reason: 'parse_error' };
    
    const [start, end] = parts;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (startTime <= endTime) {
      if (currentTime >= startTime && currentTime <= endTime) return { isOpen: true, reason: 'open' };
    } else {
      if (currentTime >= startTime || currentTime <= endTime) return { isOpen: true, reason: 'open' };
    }
    return { isOpen: false, reason: 'outside_hours' };
  } catch (e) {
    return { isOpen: true, reason: 'parse_error' };
  }
};

export default function CityMallScreen({ navigation }: any) {
  const { language } = useApp();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stores, setStores] = useState<DeliveryStore[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('MDY');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [searchMode, setSearchMode] = useState<'stores' | 'products'>('stores');
  const [foundProducts, setFoundProducts] = useState<any[]>([]);
  const [productMatches, setProductMatches] = useState<Record<string, string[]>>({});
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [storeReviewStats, setStoreReviewStats] = useState<Record<string, any>>({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedStoreForReviews, setSelectedStoreForReviews] = useState<any>(null);
  const [currentStoreReviews, setCurrentStoreReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [recommendedStores, setRecommendedStores] = useState<DeliveryStore[]>([]);
  
  // 🚀 分页相关状态
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  const regions = useMemo(() => [
    { id: 'MDY', zh: '曼德勒', en: 'Mandalay', my: 'မန္တလေး' },
    { id: 'YGN', zh: '仰光', en: 'Yangon', my: 'ရန်ကုန်' },
    { id: 'POL', zh: '彬乌伦', en: 'Pyin Oo Lwin', my: 'ပြင်ဦးလွင်' },
    { id: 'NPW', zh: '内比都', en: 'Naypyidaw', my: 'နေပြည်တော်' },
    { id: 'TGI', zh: '东枝', en: 'Taunggyi', my: 'တောင်ကြီး' },
    { id: 'LSO', zh: '腊戌', en: 'Lashio', my: 'လားရှိုး' },
    { id: 'MSE', zh: '木姐', en: 'Muse', my: 'မူဆယ်' }
  ], []);

  const categories = useMemo(() => CITY_MALL_CATEGORIES, []);

  const t: any = useMemo(() => ({
    zh: {
      title: '同城商场',
      searchPlaceholder: '搜索商户或商品...',
      productMatches: '匹配商品',
      searchingProducts: '正在搜索商品...',
      noStores: '该区域暂无商户',
      operatingHours: '营业时间',
      contact: '联系电话',
      visitStore: '进入店铺',
      openNow: '正在营业',
      closedNow: '休息中',
      closedToday: '今日暂停营业',
      onVacation: '预设休假',
      tryOtherRegion: '请尝试切换到其他地区看看',
      tryOtherKeyword: '换个关键词搜搜看吧',
      anonymous: '匿名用户',
      notice: '提示',
      reviews: '条评价',
      noReviews: '暂无评价内容',
      merchantReply: '商家回复',
      close: '关闭',
      storesTab: '店铺',
      productsTab: '商品',
      noProducts: '未搜索到相关商品',
      addToCart: '加入购物车',
      guessYouLike: '为你推荐',
      allMerchants: '所有商户',
      eta: '按配送选项送达',
      freeDelivery: '满额免配',
      distanceCity: '同城配送',
    },
    en: {
      title: 'City Mall',
      searchPlaceholder: 'Search store or product...',
      productMatches: 'Matching items',
      searchingProducts: 'Searching products...',
      noStores: 'No stores found in this region',
      operatingHours: 'Hours',
      contact: 'Phone',
      visitStore: 'Visit Store',
      openNow: 'Open Now',
      closedNow: 'Closed',
      closedToday: 'Closed Today',
      onVacation: 'On vacation',
      tryOtherRegion: 'Try switching to another region',
      tryOtherKeyword: 'Try another keyword',
      anonymous: 'Anonymous',
      notice: 'Notice',
      reviews: 'Reviews',
      noReviews: 'No reviews yet',
      merchantReply: 'Merchant Reply',
      close: 'Close',
      storesTab: 'Stores',
      productsTab: 'Products',
      noProducts: 'No products found',
      addToCart: 'Add to Cart',
      guessYouLike: 'Recommended',
      allMerchants: 'All Merchants',
      eta: 'By delivery option',
      freeDelivery: 'Free delivery over min.',
      distanceCity: 'City delivery',
    },
    my: {
      title: 'မြို့တွင်းဈေးဝယ်စင်တာ',
      searchPlaceholder: 'ဆိုင် သို့မဟုတ် ပစ္စည်းရှာရန်...',
      productMatches: 'ကိုက်ညီသောကုန်ပစ္စည်း',
      searchingProducts: 'ကုန်ပစ္စည်းရှာနေသည်...',
      noStores: 'ဤဒေသတွင် ဆိုင်များမရှိသေးပါ',
      operatingHours: 'ဖွင့်ချိန်',
      contact: 'ဖုန်းနံပါတ်',
      visitStore: 'ဆိုင်သို့ဝင်ရန်',
      openNow: 'ဆိုင်ဖွင့်ထားသည်',
      closedNow: 'ဆိုင်ပိတ်ထားသည်',
      closedToday: 'ယနေ့ ဆိုင်ပိတ်သည်',
      onVacation: 'အားလပ်ရက်',
      tryOtherRegion: 'အခြားဒေသသို့ ပြောင်းကြည့်ပါ',
      tryOtherKeyword: 'အခြားစကားလုံးဖြင့် ရှာကြည့်ပါ',
      anonymous: 'အမည်မဖော်သူ',
      notice: 'အသိပေးချက်',
      reviews: 'ခု မှတ်ချက်',
      noReviews: 'မှတ်ချက်မရှိသေးပါ',
      merchantReply: 'ဆိုင်၏ပြန်လည်ဖြေကြားချက်',
      close: 'ပိတ်မည်',
      storesTab: 'ဆိုင်များ',
      productsTab: 'ကုန်ပစ္စည်းများ',
      noProducts: 'ကုန်ပစ္စည်းမရှိပါ',
      addToCart: 'ခြင်းထဲသို့ထည့်ရန်',
      guessYouLike: 'သင့်အတွက် အကြံပြုချက်',
      allMerchants: 'ဆိုင်အားလုံး',
      eta: 'ပို့ဆောင်မှု ရွေးချယ်မှုအတိုင်း',
      freeDelivery: 'ပြည့်ရင် ပို့ခအခမဲ့',
      distanceCity: 'မြို့တွင်းပို့ဆောင်',
    },
  }[language] || {}), [language]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        const userStr = await AsyncStorage.getItem('currentUser');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.address) {
            const addr = user.address.toUpperCase();
            if (addr.includes('YANGON') || addr.includes('YGN')) setSelectedRegion('YGN');
            else if (addr.includes('PYIN OO LWIN') || addr.includes('POL')) setSelectedRegion('POL');
            else if (addr.includes('NAYPYIDAW') || addr.includes('NPW')) setSelectedRegion('NPW');
            else if (addr.includes('TAUNGGYI') || addr.includes('TGI')) setSelectedRegion('TGI');
            else if (addr.includes('LASHIO') || addr.includes('LSO')) setSelectedRegion('LSO');
            else if (addr.includes('MUSE') || addr.includes('MSE')) setSelectedRegion('MSE');
            else setSelectedRegion('MDY');
          }
        }
      } catch (e) {
        console.warn('Failed to detect user region');
      }
      loadInitialData();
    };
    initializeData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStores(0, true),
        loadBanners()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadBanners = async () => {
    try {
      const data = await bannerService.getActiveBanners();
      setBanners(data);
    } catch (error) {
      console.warn('Failed to load banners');
    }
  };

  // 🚀 优化：分页加载店铺，并批量获取评分统计
  const loadStores = async (pageIndex: number, reset: boolean = false) => {
    if (loadingMore) return;
    if (pageIndex > 0) setLoadingMore(true);

    try {
      const data = await deliveryStoreService.getActiveStores(); // 暂不支持后端分页，前端模拟
      // 注意：如果后端支持分页，请传入 pageIndex * PAGE_SIZE 等参数
      
      if (reset) {
        setStores(data);
        setPage(0);
        setHasMore(data.length >= PAGE_SIZE); // 假设如果有足够多数据则认为还有更多
      } else {
        // 如果是模拟分页，这里逻辑需要调整。暂且假设后端返回全部，我们只更新统计。
        setStores(data);
      }

      // 🚀 核心优化：批量获取评分，减少 HTTP 请求
      if (data.length > 0) {
        const storeIds = data.map(s => s.id);
        const stats = await reviewService.getMultipleStoresReviewStats(storeIds);
        setStoreReviewStats(prev => ({ ...prev, ...stats }));
      }
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  const onEndReached = () => {
    // 如果后端支持分页，则加载下一页
    // if (hasMore && !loadingMore) {
    //   loadStores(page + 1);
    // }
  };

  useEffect(() => {
    const query = searchText.trim();
    if (!query) {
      setProductMatches({});
      setSearchingProducts(false);
      return;
    }
    let isCancelled = false;
    const timer = setTimeout(async () => {
      setSearchingProducts(true);
      const results = await merchantService.searchProductsByName(query);
      if (isCancelled) return;
      
      setFoundProducts(results);
      
      const matchMap: Record<string, string[]> = {};
      results.forEach((item: any) => {
        const storeId = item.store_id || item.delivery_stores?.id;
        if (!storeId) return;
        const list = matchMap[storeId] || [];
        if (!list.includes(item.name)) list.push(item.name);
        matchMap[storeId] = list;
      });
      setProductMatches(matchMap);
      setSearchingProducts(false);
    }, 400);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchText]);

  const getDetectedRegion = (address?: string) => {
    const addr = (address || '').toUpperCase();
    if (addr.includes('YANGON') || addr.includes('YGN')) return 'YGN';
    if (addr.includes('PYIN OO LWIN') || addr.includes('POL')) return 'POL';
    if (addr.includes('NAYPYIDAW') || addr.includes('NPW')) return 'NPW';
    if (addr.includes('TAUNGGYI') || addr.includes('TGI')) return 'TGI';
    if (addr.includes('LASHIO') || addr.includes('LSO')) return 'LSO';
    if (addr.includes('MUSE') || addr.includes('MSE')) return 'MSE';
    return 'MDY';
  };

  const filteredStores = useMemo(() => {
    return stores
      .filter(store => {
        const searchLower = searchText.toLowerCase();
        const matchesSearch = store.store_name.toLowerCase().includes(searchLower) ||
          (store.store_code && store.store_code.toLowerCase().includes(searchLower)) ||
          Boolean(productMatches[store.id]?.length);
        
        const storeRegion = getDetectedRegion(store.address);
        const matchesRegion = storeRegion === selectedRegion;
        
        let matchesCategory = true;
        if (selectedCategory !== '全部') {
          matchesCategory = store.store_type === selectedCategory;
        }

        return matchesSearch && matchesRegion && matchesCategory;
      })
      .sort((a, b) => {
        const matchA = Boolean(productMatches[a.id]?.length);
        const matchB = Boolean(productMatches[b.id]?.length);
        if (matchA !== matchB) return matchA ? -1 : 1;
        const statusA = checkStoreOpenStatus(a);
        const statusB = checkStoreOpenStatus(b);
        if (statusA.isOpen === statusB.isOpen) return 0;
        return statusA.isOpen ? -1 : 1;
      });
  }, [stores, searchText, productMatches, selectedRegion, selectedCategory]);

  useEffect(() => {
    if (stores.length > 0) {
      const recommended = [...stores]
        .filter(s => {
          const sRegion = getDetectedRegion(s.address);
          return sRegion === selectedRegion && !s.is_closed_today;
        })
        .sort((a, b) => {
          const ratingA = storeReviewStats[a.id]?.average || 0;
          const ratingB = storeReviewStats[b.id]?.average || 0;
          return ratingB - ratingA;
        })
        .slice(0, 6);
      setRecommendedStores(recommended);
    }
  }, [stores, selectedRegion, storeReviewStats]);

  const handleStoreVisit = useCallback((item: any, status: any) => {
    if (!status.isOpen) {
      Alert.alert(t.notice, t.closedToday);
      return;
    }
    navigation.navigate('MerchantProducts', { storeId: item.id, storeName: item.store_name });
  }, [t.closedToday, navigation]);

  const handleProductVisit = useCallback((item: any, store: any) => {
    if (store) {
      navigation.navigate('MerchantProducts', { 
        storeId: store.id, 
        storeName: store.store_name,
        highlightProductId: item.id 
      });
    }
  }, [navigation]);

  const handleAddToCart = useCallback((item: any, store: any) => {
    if (store) {
      const params: Record<string, string> = {
        storeId: store.id,
        storeName: store.store_name,
      };
      if (productHasVariants(item)) {
        params.openProductDetailId = item.id;
      } else {
        params.autoAddProductId = item.id;
      }
      navigation.navigate('MerchantProducts', params);
    }
  }, [navigation]);

  const loadStoreReviews = async (store: any) => {
    setSelectedStoreForReviews(store);
    setShowReviewModal(true);
    setLoadingReviews(true);
    try {
      const reviews = await reviewService.getStoreReviews(store.id);
      setCurrentStoreReviews(reviews);
    } catch (error) {
      LoggerService.error('Failed to load reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const listData = useMemo(() => {
    if (loading) return [];
    const baseItems = [];
    baseItems.push({ type: 'header', id: 'list-header' });
    baseItems.push({ type: 'region', id: 'sticky-region' });

    if (!searchText.trim()) {
      baseItems.push({ type: 'categories', id: 'categories' });
      baseItems.push({ type: 'banners', id: 'banners' });
      if (recommendedStores.length > 0) baseItems.push({ type: 'recommended', id: 'recommended' });
      baseItems.push({ type: 'all_title', id: 'all_title' });
      baseItems.push(...filteredStores.map(s => ({ ...s, type: 'store' })));
    } else {
      baseItems.push({ type: 'search_tabs', id: 'search_tabs' });
      if (searchMode === 'stores') {
        baseItems.push(...filteredStores.map(s => ({ ...s, type: 'store' })));
      } else {
        baseItems.push(...foundProducts.map(p => ({ ...p, type: 'product' })));
      }
    }
    
    return baseItems;
  }, [loading, searchText, filteredStores, foundProducts, searchMode, recommendedStores, selectedRegion, selectedCategory, storeReviewStats]);

  const renderItem = ({ item }: { item: any }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>{t.title}</Text>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#94a3b8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t.searchPlaceholder}
                  placeholderTextColor="#94a3b8"
                  value={searchText}
                  onChangeText={setSearchText}
                />
              </View>
              {searchingProducts && <Text style={styles.searchHint}>{t.searchingProducts}</Text>}
            </View>
          </View>
        );
      case 'region':
        return (
          <View style={styles.regionContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionScroll}>
              {regions.map((region) => (
                <TouchableOpacity
                  key={region.id}
                  onPress={() => {
                    Vibration.vibrate(10);
                    setSelectedRegion(region.id);
                  }}
                  style={[styles.regionTab, selectedRegion === region.id && styles.regionTabActive]}
                >
                  <Text style={[styles.regionTabText, selectedRegion === region.id && styles.regionTabTextActive]}>
                    {language === 'zh' ? region.zh : (language === 'en' ? region.en : region.my)}
                  </Text>
                  {selectedRegion === region.id && <View style={styles.activeIndicator} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );
      case 'categories':
        return (
          <View style={styles.categoryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => {
                    Vibration.vibrate(10);
                    setSelectedCategory(cat.id);
                  }}
                  style={[styles.categoryItem, selectedCategory === cat.id && styles.categoryItemActive]}
                >
                  <View style={[styles.categoryIconCircle, selectedCategory === cat.id && styles.categoryIconCircleActive]}>
                    <Ionicons name={cat.icon as any} size={20} color={selectedCategory === cat.id ? '#fff' : '#94a3b8'} />
                  </View>
                  <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>
                    {language === 'zh' ? cat.zh : (language === 'en' ? cat.en : cat.my)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );
      case 'banners':
        if (banners.length === 0) return null;
        return (
          <View style={styles.bannerContainer}>
            <FlatList
              data={banners}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id || Math.random().toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.bannerItem}
                  onPress={() => {
                    if (item.link_url) {
                      if (item.link_url.startsWith('store:')) {
                        const storeId = item.link_url.split(':')[1];
                        navigation.navigate('MerchantProducts', { storeId, storeName: language === 'zh' ? item.title : item.burmese_title });
                      } else if (item.link_url.startsWith('category:')) {
                        setSelectedCategory(item.link_url.split(':')[1]);
                      }
                    }
                  }}
                >
                  <LinearGradient
                    colors={[item.bg_color_start || '#2C98A6', item.bg_color_end || '#1E6F7A']}
                    style={styles.bannerGradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.bannerTextContainer}>
                      <Text style={styles.bannerTitle}>{language === 'my' ? item.burmese_title : item.title}</Text>
                      {item.subtitle && <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>}
                      <View style={styles.bannerTag}><Text style={styles.bannerTagText}>Partner 🤝</Text></View>
                    </View>
                    {remoteImageUri(item.image_url) ? (
                      <ProxiedImage uri={item.image_url} style={styles.bannerImage} />
                    ) : null}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            />
          </View>
        );
      case 'recommended':
        return (
          <View style={styles.sectionContainer}>
            <View style={[styles.sectionHeader, { paddingHorizontal: 20 }]}>
              <Text style={styles.sectionTitle}>{t.guessYouLike}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
              <View style={{ width: 20 }} />
              {recommendedStores.map(store => {
                const status = checkStoreOpenStatus(store);
                const stats = storeReviewStats[store.id];
                const recAvatarUri = storeAvatarDisplayUri(store.avatar_url, store.updated_at);
                return (
                  <TouchableOpacity
                    key={store.id}
                    style={styles.hStoreCard}
                    onPress={() => handleStoreVisit(store, status)}
                  >
                    <View style={styles.hStoreIconContainer}>
                      {recAvatarUri ? (
                        <ProxiedImage uri={recAvatarUri} style={styles.hStoreAvatar} />
                      ) : (
                        <Text style={styles.hStoreIcon}>{getStoreIcon(store.store_type)}</Text>
                      )}
                      {!status.isOpen && <View style={styles.hStoreClosedOverlay}><Text style={styles.hStoreClosedText}>{t.closedNow}</Text></View>}
                    </View>
                    <Text style={styles.hStoreName} numberOfLines={1}>{store.store_name}</Text>
                    <View style={styles.hStoreStats}>
                    <Text style={styles.hStoreRating}>★ {stats?.average || '4.9'}</Text>
                      <Text style={styles.hStoreDistance}>{getStoreTypeLabel(store.store_type, language).slice(0, 4)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );
      case 'all_title':
        return (
          <AllMerchantsSectionHeader
            title={t.allMerchants}
            count={filteredStores.length}
            language={language}
          />
        );
      case 'store':
        return (
          <StoreCard 
            item={item} 
            status={checkStoreOpenStatus(item)}
            language={language}
            t={t}
            productMatches={productMatches}
            stats={storeReviewStats[item.id]}
            onVisit={handleStoreVisit}
            onShowReviews={loadStoreReviews}
          />
        );
      case 'product':
        return (
          <ProductCard 
            item={item} 
            t={t}
            language={language}
            onVisit={handleProductVisit} 
            onAddToCart={handleAddToCart}
          />
        );
      case 'search_tabs':
        return (
          <View style={styles.searchTabsContainer}>
            <TouchableOpacity 
              style={[styles.searchTab, searchMode === 'stores' && styles.searchTabActive]}
              onPress={() => setSearchMode('stores')}
            >
              <Text style={[styles.searchTabText, searchMode === 'stores' && styles.searchTabTextActive]}>
                {t.storesTab} ({filteredStores.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.searchTab, searchMode === 'products' && styles.searchTabActive]}
              onPress={() => setSearchMode('products')}
            >
              <Text style={[styles.searchTabText, searchMode === 'products' && styles.searchTabTextActive]}>
                {t.productsTab} ({foundProducts.length})
              </Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {loading && listData.length === 0 ? (
        <ScrollView style={styles.loadingContainer} contentContainerStyle={[styles.loadingContent, { paddingTop: insets.top + 24 }]}>
          <ListItemSkeleton />
          <GridSkeleton columns={2} itemHeight={100} />
          <ListItemSkeleton /><ListItemSkeleton />
        </ScrollView>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, index) => item.id || `${item.type}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: 24 + insets.bottom }]}
          stickyHeaderIndices={[1]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} colors={[TEAL]} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={TEAL} style={{ marginVertical: 20 }} /> : null}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}><Ionicons name={searchMode === 'stores' ? "business-outline" : "cube-outline"} size={60} color="#cbd5e1" /></View>
                <Text style={styles.emptyText}>{searchMode === 'stores' ? t.noStores : t.noProducts}</Text>
                <Text style={styles.emptySubtext}>
                  {searchMode === 'stores' ? t.tryOtherRegion : t.tryOtherKeyword}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* 评价详情模态框 */}
      <Modal visible={showReviewModal} transparent animationType="slide" onRequestClose={() => setShowReviewModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={[TEAL, '#1F7A86']} style={styles.modalHeader}>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowReviewModal(false)}><Ionicons name="close" size={24} color="white" /></TouchableOpacity>
              <View style={styles.modalHeaderIconContainer}><Text style={{ fontSize: 40 }}>⭐</Text></View>
              <Text style={styles.modalStoreName}>{selectedStoreForReviews?.store_name}</Text>
              {selectedStoreForReviews && storeReviewStats[selectedStoreForReviews.id] && (
                <View style={styles.modalHeaderStats}>
                  <Text style={styles.modalAverageScore}>{storeReviewStats[selectedStoreForReviews.id].average} / 5.0</Text>
                  <Text style={styles.modalReviewCount}>• {storeReviewStats[selectedStoreForReviews.id].count} {t.reviews}</Text>
                </View>
              )}
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.reviewsList}>
              {loadingReviews ? (
                <View style={{ padding: 40 }}><ActivityIndicator color={TEAL} /></View>
              ) : currentStoreReviews.length > 0 ? (
                currentStoreReviews.map((review) => (
                  <View key={review.id} style={styles.reviewItem}>
                    <View style={styles.reviewUserRow}>
                      <View style={styles.userInfoLeft}>
                        <View style={styles.userAvatar}><Text style={styles.avatarText}>{review.is_anonymous ? '匿' : (review.user_name?.charAt(0).toUpperCase() || 'U')}</Text></View>
                        <Text style={styles.userNameText}>{review.is_anonymous ? t.anonymous : review.user_name}</Text>
                      </View>
                      <Text style={styles.reviewStars}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
                    </View>
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                    {review.images?.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reviewImagesScroll}>
                        {review.images.map((img: string, idx: number) => <Image key={idx} source={{ uri: img }} style={styles.reviewImageThumb} />)}
                      </ScrollView>
                    )}
                    {review.reply_text && (
                      <View style={styles.merchantReplyBox}>
                        <Text style={styles.replyLabel}>{t.merchantReply}</Text>
                        <Text style={styles.replyContent}>{review.reply_text}</Text>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.noReviewsContainer}><Text style={styles.noReviewsText}>{t.noReviews}</Text></View>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalFooterButton} onPress={() => setShowReviewModal(false)}><Text style={styles.modalFooterButtonText}>{t.close}</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  header: {
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: PAGE_BG,
  },
  headerContent: {
    marginTop: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 14,
    letterSpacing: -0.4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: NAVY,
  },
  searchHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
  },
  regionContainer: {
    backgroundColor: PAGE_BG,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf2',
  },
  regionScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  regionTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
    minWidth: 72,
    alignItems: 'center',
  },
  regionTabActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  regionTabText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  regionTabTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  activeIndicator: {
    display: 'none',
  },
  categoryContainer: {
    paddingVertical: 14,
    backgroundColor: PAGE_BG,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 14,
  },
  categoryItem: {
    alignItems: 'center',
    gap: 6,
    width: 64,
  },
  categoryItemActive: {},
  categoryIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryIconCircleActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  categoryText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryTextActive: {
    color: TEAL,
    fontWeight: '800',
  },
  searchTabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  searchTabActive: {
    backgroundColor: TEAL,
  },
  searchTabText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  searchTabTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#eef2f6',
  },
  productMain: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  productImage: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    paddingRight: 8,
  },
  productName: {
    fontSize: 15,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: TEAL,
    marginBottom: 6,
  },
  productStoreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productStoreName: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    flex: 1,
  },
  addCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    backgroundColor: '#cbd5e1',
    opacity: 0.7,
  },
  bannerContainer: {
    height: 140,
    marginBottom: 10,
  },
  bannerItem: {
    width: width - 40,
    marginHorizontal: 20,
    height: 130,
    borderRadius: 20,
    overflow: 'hidden',
  },
  bannerGradient: {
    flex: 1,
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
  },
  bannerTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bannerTagText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  bannerImage: {
    width: 100,
    height: 100,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  listContent: {
    paddingBottom: 40,
  },
  allMerchantsHeader: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 14,
  },
  allMerchantsTitleRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  allMerchantsAccentBar: {
    width: 3,
    borderRadius: 4,
    minHeight: 44,
  },
  allMerchantsTitleBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  allMerchantsKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: TEAL,
    marginBottom: 4,
  },
  allMerchantsTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  allMerchantsTitleText: {
    fontSize: 19,
    fontWeight: '800',
    color: NAVY,
    letterSpacing: 0.2,
  },
  allMerchantsCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(44, 152, 166, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(44, 152, 166, 0.16)',
  },
  allMerchantsCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: TEAL,
    fontVariant: ['tabular-nums'],
  },
  allMerchantsDivider: {
    height: 1,
    marginTop: 12,
    borderRadius: 1,
  },
  storeCard: {
    marginBottom: 12,
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#eef2f6',
  },
  storeCardClosed: {
    opacity: 0.72,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  storeLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeLogoImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  storeIcon: {
    fontSize: 26,
  },
  storeMainInfo: {
    flex: 1,
    minWidth: 0,
  },
  storeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  storeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: NAVY,
    letterSpacing: -0.2,
  },
  storeNameClosed: {
    color: '#94a3b8',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    minWidth: 0,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '800',
    color: NAVY,
  },
  metaMuted: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    flexShrink: 1,
  },
  etaPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: TEAL,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  etaPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  freeDeliveryText: {
    marginTop: 4,
    fontSize: 12,
    color: TEAL,
    fontWeight: '700',
  },
  matchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(44, 152, 166, 0.08)',
  },
  matchText: {
    flex: 1,
    fontSize: 11,
    color: TEAL,
    lineHeight: 15,
    fontWeight: '600',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
    maxWidth: '48%',
    borderWidth: 1,
  },
  statusPillOpen: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  statusPillClosed: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
    letterSpacing: 0.2,
  },
  hScroll: {
    gap: 12,
    paddingRight: 20,
  },
  hStoreCard: {
    width: 140,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eef2f6',
  },
  hStoreIconContainer: {
    width: '100%',
    height: 80,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  hStoreIcon: {
    fontSize: 32,
  },
  hStoreAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  hStoreClosedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hStoreClosedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  hStoreName: {
    color: NAVY,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  hStoreStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hStoreRating: {
    color: '#d97706',
    fontSize: 11,
    fontWeight: 'bold',
  },
  hStoreDistance: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 32,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 30,
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    zIndex: 10,
  },
  modalHeaderIconContainer: {
    marginBottom: 10,
  },
  modalStoreName: {
    color: 'white',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalHeaderStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  modalAverageScore: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: '900',
  },
  modalReviewCount: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewsList: {
    padding: 20,
  },
  reviewItem: {
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 20,
  },
  reviewUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
  },
  userNameText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#1e293b',
  },
  reviewStars: {
    color: '#fbbf24',
    fontSize: 12,
  },
  reviewComment: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewImagesScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  reviewImageThumb: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f1f5f9',
  },
  merchantReplyBox: {
    backgroundColor: '#e8f6f7',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: TEAL,
  },
  replyLabel: {
    color: TEAL,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  replyContent: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
  },
  noReviewsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noReviewsText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  modalFooterButton: {
    padding: 16,
    backgroundColor: TEAL,
    margin: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalFooterButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  loadingContent: {
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e8edf2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 18,
    color: NAVY,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
