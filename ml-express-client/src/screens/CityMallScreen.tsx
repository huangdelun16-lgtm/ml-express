import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TextInput,
  ScrollView,
  Vibration,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { deliveryStoreService, merchantService, reviewService, bannerService, Banner } from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import { theme } from '../config/theme';
import BackToHomeButton from '../components/BackToHomeButton';
import LoggerService from '../services/LoggerService';

const { width } = Dimensions.get('window');

interface DeliveryStore {
  id: string;
  store_name: string;
  store_code: string;
  address: string;
  phone: string;
  store_type: string;
  status: string;
  operating_hours: string;
  is_closed_today?: boolean; // 🚀 新增
}

export default function CityMallScreen({ navigation }: any) {
  const { language } = useApp();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stores, setStores] = useState<DeliveryStore[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('MDY');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部'); // 🚀 新增
  const [searchMode, setSearchMode] = useState<'stores' | 'products'>('stores'); // 🚀 新增
  const [foundProducts, setFoundProducts] = useState<any[]>([]); // 🚀 新增
  const [productMatches, setProductMatches] = useState<Record<string, string[]>>({});
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [storeReviewStats, setStoreReviewStats] = useState<Record<string, any>>({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedStoreForReviews, setSelectedStoreForReviews] = useState<any>(null);
  const [currentStoreReviews, setCurrentStoreReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]); // 🚀 新增

  const regions = [
    { id: 'MDY', zh: '曼德勒', en: 'Mandalay', my: 'မန္တလေး' },
    { id: 'YGN', zh: '仰光', en: 'Yangon', my: 'ရန်ကုန်' },
    { id: 'POL', zh: '彬乌伦', en: 'Pyin Oo Lwin', my: 'ပြင်ဦးလွင်' },
    { id: 'NPW', zh: '内比都', en: 'Naypyidaw', my: 'နေပြည်တော်' },
    { id: 'TGI', zh: '东枝', en: 'Taunggyi', my: 'တောင်ကြီး' },
    { id: 'LSO', zh: '腊戌', en: 'Lashio', my: 'လားရှိုး' },
    { id: 'MSE', zh: '木姐', en: 'Muse', my: 'မူဆယ်' }
  ];

  const categories = [
    { id: '全部', zh: '全部', en: 'All', my: 'အားလုံး', icon: 'grid-outline' },
    { id: '餐厅', zh: '餐饮', en: 'Dining', my: 'စားသောက်ဆိုင်', icon: 'restaurant-outline' },
    { id: '生鲜', zh: '生鲜', en: 'Fresh', my: 'လတ်ဆတ်စာ', icon: 'leaf-outline' },
    { id: '生活用品', zh: '生活', en: 'Daily', my: 'လူသုံးကုန်', icon: 'cart-outline' },
    { id: '茶铺', zh: '茶铺', en: 'Tea', my: 'လက်ဖက်ရည်ဆိုင်', icon: 'cafe-outline' },
    { id: '饮料和小吃', zh: '零食', en: 'Snacks', my: 'မုန့်မျိုးစုံ', icon: 'fast-food-outline' },
  ];

  const t = {
    zh: {
      title: '同城商场',
      searchPlaceholder: '搜索商户或商品...',
      productMatches: '匹配商品',
      searchingProducts: '正在搜索商品...',
      allStores: '全部分类',
      noStores: '该区域暂无商户',
      operatingHours: '营业时间',
      contact: '联系电话',
      visitStore: '进入店铺',
      openNow: '正在营业',
      closedNow: '休息中',
      closedToday: '今日暂停营业',
      selectRegion: '选择地区',
      reviews: '条评价',
      noReviews: '暂无评价内容',
      merchantReply: '商家回复',
      close: '关闭',
      storesTab: '店铺',
      productsTab: '商品',
      noProducts: '未搜索到相关商品',
      addToCart: '加入购物车',
      price: '价格',
    },
    en: {
      title: 'City Mall',
      searchPlaceholder: 'Search store or product...',
      productMatches: 'Matching items',
      searchingProducts: 'Searching products...',
      allStores: 'All Categories',
      noStores: 'No stores found in this region',
      operatingHours: 'Hours',
      contact: 'Phone',
      visitStore: 'Visit Store',
      openNow: 'Open Now',
      closedNow: 'Closed',
      closedToday: 'Closed Today',
      selectRegion: 'Select Region',
      reviews: 'Reviews',
      noReviews: 'No reviews yet',
      merchantReply: 'Merchant Reply',
      close: 'Close',
      storesTab: 'Stores',
      productsTab: 'Products',
      noProducts: 'No products found',
      addToCart: 'Add to Cart',
      price: 'Price',
    },
    my: {
      title: 'မြို့တွင်းဈေးဝယ်စင်တာ',
      searchPlaceholder: 'ဆိုင် သို့မဟုတ် ပစ္စည်းရှာရန်...',
      productMatches: 'ကိုက်ညီသောကုန်ပစ္စည်း',
      searchingProducts: 'ကုန်ပစ္စည်းရှာနေသည်...',
      allStores: 'ကဏ္ဍအားလုံး',
      noStores: 'ဤဒေသတွင် ဆိုင်များမရှိသေးပါ',
      operatingHours: 'ဖွင့်ချိန်',
      contact: 'ဖုန်းနံပါတ်',
      visitStore: 'ဆိုင်သို့ဝင်ရန်',
      openNow: 'ဆိုင်ဖွင့်ထားသည်',
      closedNow: 'ဆိုင်ပိတ်ထားသည်',
      closedToday: 'ယနေ့ ဆိုင်ပိတ်သည်',
      selectRegion: 'ဒေသရွေးချယ်ပါ',
      reviews: 'ခု မှတ်ချက်',
      noReviews: 'မှတ်ချက်မရှိသေးပါ',
      merchantReply: 'ဆိုင်၏ပြန်လည်ဖြေကြားချက်',
      close: 'ပိတ်မည်',
      storesTab: 'ဆိုင်များ',
      productsTab: 'ကုန်ပစ္စည်းများ',
      noProducts: 'ကုန်ပစ္စည်းမရှိပါ',
      addToCart: 'ခြင်းထဲသို့ထည့်ရန်',
      price: 'ဈေးနှုန်း',
    },
  }[language] || {
    title: 'City Mall',
    searchPlaceholder: 'Search store name...',
    productMatches: 'Matching items',
    searchingProducts: 'Searching products...',
    allStores: 'All Categories',
    noStores: 'No stores found',
    operatingHours: 'Hours',
    contact: 'Phone',
    visitStore: 'Visit Store',
    openNow: 'Open Now',
    closedNow: 'Closed',
    closedToday: 'Closed Today',
    selectRegion: 'Select Region'
  };

  useEffect(() => {
    const initializeData = async () => {
      // 尝试从用户信息中获取默认地区
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
      loadStores();
      loadBanners(); // 🚀 新增
    };
    initializeData();
  }, []);

  const loadBanners = async () => {
    try {
      const data = await bannerService.getActiveBanners();
      setBanners(data);
    } catch (error) {
      console.warn('Failed to load banners');
    }
  };

  const loadStores = async () => {
    setLoading(true);
    try {
      const data = await deliveryStoreService.getActiveStores();
      setStores(data);

      // 🚀 加载所有店铺的评价统计
      const statsPromises = data.map(store => reviewService.getStoreReviewStats(store.id));
      const statsResults = await Promise.all(statsPromises);
      
      const statsMap: Record<string, any> = {};
      data.forEach((store, index) => {
        statsMap[store.id] = statsResults[index];
      });
      setStoreReviewStats(statsMap);
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadStores(),
      loadBanners()
    ]);
    setRefreshing(false);
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
      
      setFoundProducts(results); // 🚀 保存搜索到的商品
      
      // 如果搜索到了商品，且当前不是搜索模式，自动切换到商品模式或者保持
      // 这里可以根据需求决定是否自动切换
      
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

  // 🚀 核心逻辑：判断店铺是否正在营业
  const checkStoreOpenStatus = (store: DeliveryStore) => {
    if (store.is_closed_today) return { isOpen: false, reason: 'closed_today' };
    
    try {
      const hours = store.operating_hours || '09:00 - 21:00';
      // 使用正则兼容 "09:00 - 21:00" 和 "09:00-21:00"
      const parts = hours.split(/\s*-\s*/);
      if (parts.length < 2) return { isOpen: true, reason: 'parse_error' };
      
      const [start, end] = parts;
      
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      
      // 🚀 24小时算法优化：处理跨子夜的营业时间（如 22:00 - 02:00）
      if (startTime <= endTime) {
        // 普通情况：09:00 - 21:00
      if (currentTime >= startTime && currentTime <= endTime) {
        return { isOpen: true, reason: 'open' };
        }
      } else {
        // 跨子夜情况：22:00 - 02:00
        if (currentTime >= startTime || currentTime <= endTime) {
          return { isOpen: true, reason: 'open' };
        }
      }
      return { isOpen: false, reason: 'outside_hours' };
    } catch (e) {
      return { isOpen: true, reason: 'parse_error' };
    }
  };

  const filteredStores = stores
    .filter(store => {
      const searchLower = searchText.toLowerCase();
      const matchesSearch = store.store_name.toLowerCase().includes(searchLower) ||
        (store.store_code && store.store_code.toLowerCase().includes(searchLower)) ||
        Boolean(productMatches[store.id]?.length);
      
      const storeAddr = (store.address || '').toUpperCase();
      let storeRegion = 'MDY';
      
      if (storeAddr.includes('YANGON') || storeAddr.includes('YGN')) storeRegion = 'YGN';
      else if (storeAddr.includes('PYIN OO LWIN') || storeAddr.includes('POL')) storeRegion = 'POL';
      else if (storeAddr.includes('NAYPYIDAW') || storeAddr.includes('NPW')) storeRegion = 'NPW';
      else if (storeAddr.includes('TAUNGGYI') || storeAddr.includes('TGI')) storeRegion = 'TGI';
      else if (storeAddr.includes('LASHIO') || storeAddr.includes('LSO')) storeRegion = 'LSO';
      else if (storeAddr.includes('MUSE') || storeAddr.includes('MSE')) storeRegion = 'MSE';
      else storeRegion = 'MDY';

      const matchesRegion = storeRegion === selectedRegion;
      
      // 🚀 分类过滤逻辑
      let matchesCategory = true;
      if (selectedCategory !== '全部') {
        // 支持模糊匹配分类，例如 '餐厅' 匹配 '餐饮'
        const type = store.store_type || '';
        if (selectedCategory === '餐厅') {
          matchesCategory = type.includes('餐') || type.includes('饭') || type.includes('Food') || type.includes('Restaurant');
        } else if (selectedCategory === '生鲜') {
          matchesCategory = type.includes('鲜') || type.includes('菜') || type.includes('肉') || type.includes('Fresh') || type.includes('Market');
        } else if (selectedCategory === '生活用品') {
          matchesCategory = type.includes('活') || type.includes('杂') || type.includes('超市') || type.includes('Mart') || type.includes('Shop');
        } else {
          matchesCategory = type.includes(selectedCategory);
        }
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
      return statusA.isOpen ? -1 : 1; // 营业中的排前面
    });

  const getStoreIcon = (type: string) => {
    switch (type) {
      case '餐厅': return '🍽️';
      case '茶铺': return '🍵';
      case '饮料和小吃': return '🥤';
      case '杂货店': return '🛒';
      default: return '🏪';
    }
  };

  // 🚀 新增：渲染商品项
  const renderProductItem = ({ item }: { item: any }) => {
    const store = item.delivery_stores;
    const storeStatus = store ? checkStoreOpenStatus(store as any) : { isOpen: true };
    
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => {
          if (store) {
            navigation.navigate('MerchantProducts', { 
              storeId: store.id, 
              storeName: store.store_name,
              highlightProductId: item.id 
            });
          }
        }}
      >
        <View style={styles.productMain}>
          <Image 
            source={{ uri: item.image_url || 'https://via.placeholder.com/150' }} 
            style={styles.productImage}
          />
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>
            
            <View style={styles.productPriceRow}>
              <Text style={styles.productPrice}>{Number(item.price).toLocaleString()} MMK</Text>
              {item.original_price && (
                <Text style={styles.originalPrice}>{Number(item.original_price).toLocaleString()} MMK</Text>
              )}
            </View>

            {store && (
              <View style={styles.productStoreInfo}>
                <Ionicons name="business-outline" size={14} color="#94a3b8" />
                <Text style={styles.productStoreName} numberOfLines={1}>{store.store_name}</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.productFooter}>
          <View style={[
            styles.statusTagSmall,
            { backgroundColor: storeStatus.isOpen ? '#dcfce7' : '#fee2e2' }
          ]}>
            <Text style={[
              styles.statusTagTextSmall,
              { color: storeStatus.isOpen ? '#15803d' : '#ef4444' }
            ]}>
              {storeStatus.isOpen ? t.openNow : t.closedNow}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.addToCartBtn, !storeStatus.isOpen && styles.disabledBtn]}
            disabled={!storeStatus.isOpen}
            onPress={() => {
              if (store) {
                navigation.navigate('MerchantProducts', { 
                  storeId: store.id, 
                  storeName: store.store_name,
                  autoAddProductId: item.id 
                });
              }
            }}
          >
            <Ionicons name="cart-outline" size={18} color="#fff" />
            <Text style={styles.addToCartBtnText}>{t.addToCart}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStoreItem = ({ item }: { item: DeliveryStore }) => {
    const status = checkStoreOpenStatus(item);
    const matchedProducts = productMatches[item.id] || [];
    
    return (
      <TouchableOpacity
        style={[
          styles.storeCard,
          !status.isOpen && { opacity: 0.7 } // 休息中透明度
        ]}
        onPress={() => {
          if (!status.isOpen) {
            Alert.alert('提示', t.closedToday);
            return;
          }
          navigation.navigate('MerchantProducts', { storeId: item.id, storeName: item.store_name });
        }}
        activeOpacity={status.isOpen ? 0.7 : 1}
      >
        <View style={styles.storeHeader}>
          <View style={[
            styles.storeIconContainer,
            !status.isOpen && { backgroundColor: '#f1f5f9' }
          ]}>
            <Text style={[
              styles.storeIcon,
              !status.isOpen && { opacity: 0.5 }
            ]}>
              {getStoreIcon(item.store_type)}
            </Text>
          </View>
          <View style={styles.storeMainInfo}>
            <Text style={[
              styles.storeName,
              !status.isOpen && { color: '#64748b' }
            ]}>
              {item.store_name}
            </Text>
            {matchedProducts.length > 0 && (
              <Text style={styles.matchText} numberOfLines={2}>
                {t.productMatches}: {matchedProducts.join(', ')}
              </Text>
            )}
            <View style={styles.tagContainer}>
              <View style={styles.typeTag}>
                <Text style={styles.typeTagText}>{item.store_type}</Text>
              </View>
              <View style={[
                styles.statusTag,
                { backgroundColor: status.isOpen ? '#dcfce7' : '#fee2e2' }
              ]}>
                <Text style={[
                  styles.statusTagText,
                  { color: status.isOpen ? '#15803d' : '#ef4444' }
                ]}>
                  {status.isOpen ? t.openNow : (status.reason === 'closed_today' ? t.closedToday : t.closedNow)}
                </Text>
              </View>
            </View>
            
            {/* 🚀 新增：评价统计显示 */}
            {storeReviewStats[item.id] && storeReviewStats[item.id].count > 0 && (
              <TouchableOpacity 
                style={styles.reviewStatsContainer}
                onPress={() => loadStoreReviews(item)}
              >
                <View style={styles.starsRow}>
                  <Text style={styles.starsText}>
                    {'★'.repeat(Math.round(storeReviewStats[item.id].average))}
                    <Text style={{ color: 'rgba(255,255,255,0.2)' }}>
                      {'★'.repeat(5 - Math.round(storeReviewStats[item.id].average))}
                    </Text>
                  </Text>
                </View>
                <Text style={styles.reviewCountText}>
                  {storeReviewStats[item.id].average} ({storeReviewStats[item.id].count} {t.reviews})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.storeDetails, !status.isOpen && { opacity: 0.6 }]}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color="#64748b" />
            <Text style={styles.detailText}>{t.operatingHours}: {item.operating_hours || '09:00 - 21:00'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={16} color="#64748b" />
            <Text style={styles.detailText} numberOfLines={1}>{item.address}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="call-outline" size={16} color="#64748b" />
            <Text style={styles.detailText}>{t.contact}: {item.phone}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={[
            styles.visitText,
            { color: status.isOpen ? '#2563eb' : '#94a3b8' }
          ]}>
            {status.isOpen ? t.visitStore : t.closedToday} {status.isOpen ? '→' : '🔒'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#334155']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      {/* 背景装饰性圆圈 */}
      <View style={{
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        zIndex: 0
      }} />

      <View style={styles.header}>
        <BackToHomeButton navigation={navigation} color="white" />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t.title}</Text>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder={t.searchPlaceholder}
              placeholderTextColor="#9ca3af"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          {searchingProducts && (
            <Text style={styles.searchHint}>{t.searchingProducts}</Text>
          )}
        </View>
      </View>

      {/* 🚀 新增：地区选择滑动条 */}
      <View style={styles.regionContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionScroll}>
          {regions.map((region) => (
            <TouchableOpacity
              key={region.id}
              onPress={() => {
                Vibration.vibrate(10);
                setSelectedRegion(region.id);
              }}
              style={[
                styles.regionTab,
                selectedRegion === region.id && styles.regionTabActive
              ]}
            >
              <Text style={[
                styles.regionTabText,
                selectedRegion === region.id && styles.regionTabTextActive
              ]}>
                {language === 'zh' ? region.zh : (language === 'en' ? region.en : region.my)}
              </Text>
              {selectedRegion === region.id && (
                <View style={styles.activeIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 🚀 新增：分类聚合滑动条 */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => {
                Vibration.vibrate(10);
                setSelectedCategory(cat.id);
              }}
              style={[
                styles.categoryItem,
                selectedCategory === cat.id && styles.categoryItemActive
              ]}
            >
              <View style={[
                styles.categoryIconCircle,
                selectedCategory === cat.id && styles.categoryIconCircleActive
              ]}>
                <Ionicons 
                  name={cat.icon as any} 
                  size={20} 
                  color={selectedCategory === cat.id ? '#fff' : '#94a3b8'} 
                />
              </View>
              <Text style={[
                styles.categoryText,
                selectedCategory === cat.id && styles.categoryTextActive
              ]}>
                {language === 'zh' ? cat.zh : (language === 'en' ? cat.en : cat.my)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 🚀 新增：精选推荐 Banner */}
      {banners.length > 0 && (
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
                    // 支持跳转到具体店铺或分类
                    // 例如 link_url 可以是 "store:id" 或 "category:catId"
                    if (item.link_url.startsWith('store:')) {
                      const storeId = item.link_url.split(':')[1];
                      navigation.navigate('MerchantProducts', { storeId, storeName: language === 'zh' ? item.title : item.burmese_title });
                    } else if (item.link_url.startsWith('category:')) {
                      const catId = item.link_url.split(':')[1];
                      setSelectedCategory(catId);
                    }
                  }
                }}
              >
                <LinearGradient
                  colors={[item.bg_color_start || '#3b82f6', item.bg_color_end || '#1e40af']}
                  style={styles.bannerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.bannerTextContainer}>
                    <Text style={styles.bannerTitle}>
                      {language === 'my' ? item.burmese_title : item.title}
                    </Text>
                    {item.subtitle && (
                      <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
                    )}
                    <View style={styles.bannerTag}>
                      <Text style={styles.bannerTagText}>Partner 🤝</Text>
                    </View>
                  </View>
                  {item.image_url && (
                    <Image source={{ uri: item.image_url }} style={styles.bannerImage} />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* 🚀 新增：搜索结果切换标签 (仅在搜索时显示) */}
      {searchText.trim().length > 0 && (
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
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={searchMode === 'stores' || !searchText.trim() ? filteredStores : foundProducts}
          keyExtractor={(item) => item.id}
          renderItem={searchMode === 'stores' || !searchText.trim() ? renderStoreItem : renderProductItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons 
                  name={searchMode === 'stores' ? "business-outline" : "cube-outline"} 
                  size={60} 
                  color="rgba(255,255,255,0.2)" 
                />
              </View>
              <Text style={styles.emptyText}>
                {searchMode === 'stores' ? t.noStores : t.noProducts}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchMode === 'stores' 
                  ? (language === 'zh' ? '请尝试切换到其他地区看看' : 'Try switching to another region')
                  : (language === 'zh' ? '换个关键词搜搜看吧' : 'Try another keyword')
                }
              </Text>
            </View>
          }
        />
      )}

      {/* 🚀 新增：店铺评价详情弹窗 */}
      <Modal
        visible={showReviewModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* 页眉 */}
            <LinearGradient
              colors={['#3b82f6', '#1e40af']}
              style={styles.modalHeader}
            >
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowReviewModal(false)}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              
              <View style={styles.modalHeaderIconContainer}>
                <Text style={{ fontSize: 40 }}>⭐</Text>
              </View>
              <Text style={styles.modalStoreName}>
                {selectedStoreForReviews?.store_name}
              </Text>
              
              {selectedStoreForReviews && storeReviewStats[selectedStoreForReviews.id] && (
                <View style={styles.modalHeaderStats}>
                  <Text style={styles.modalAverageScore}>
                    {storeReviewStats[selectedStoreForReviews.id].average} / 5.0
                  </Text>
                  <Text style={styles.modalReviewCount}>
                    • {storeReviewStats[selectedStoreForReviews.id].count} {t.reviews}
                  </Text>
                </View>
              )}
            </LinearGradient>

            {/* 评分分布 */}
            {selectedStoreForReviews && storeReviewStats[selectedStoreForReviews.id] && (
              <View style={styles.distributionContainer}>
                {[5, 4, 3, 2, 1].map(star => {
                  const count = storeReviewStats[selectedStoreForReviews.id].distribution[star] || 0;
                  const total = storeReviewStats[selectedStoreForReviews.id].count;
                  const percent = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <View key={star} style={styles.distributionRow}>
                      <Text style={styles.starLabel}>{star} ⭐</Text>
                      <View style={styles.progressBarBg}>
                        <View style={[
                          styles.progressBarFill, 
                          { width: `${percent}%`, backgroundColor: star >= 4 ? '#10b981' : star === 3 ? '#fbbf24' : '#ef4444' }
                        ]} />
                      </View>
                      <Text style={styles.countLabel}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* 评论列表 */}
            <ScrollView style={styles.reviewsList}>
              {loadingReviews ? (
                <View style={{ padding: 40 }}>
                  <ActivityIndicator color="#3b82f6" />
                </View>
              ) : currentStoreReviews.length > 0 ? (
                currentStoreReviews.map((review) => (
                  <View key={review.id} style={styles.reviewItem}>
                    <View style={styles.reviewUserRow}>
                      <View style={styles.userInfoLeft}>
                        <View style={styles.userAvatar}>
                          <Text style={styles.avatarText}>
                            {review.is_anonymous ? '匿' : (review.user_name?.charAt(0).toUpperCase() || 'U')}
                          </Text>
                        </View>
                        <Text style={styles.userNameText}>
                          {review.is_anonymous ? (language === 'zh' ? '匿名用户' : 'Anonymous') : review.user_name}
                        </Text>
                      </View>
                      <Text style={styles.reviewStars}>
                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                      </Text>
                    </View>
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                    
                    {review.images && review.images.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImagesScroll}>
                        {review.images.map((img: string, idx: number) => (
                          <Image key={idx} source={{ uri: img }} style={styles.reviewImageThumb} />
                        ))}
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
                <View style={styles.noReviewsContainer}>
                  <Text style={styles.noReviewsText}>{t.noReviews}</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalFooterButton}
              onPress={() => setShowReviewModal(false)}
            >
              <Text style={styles.modalFooterButtonText}>{t.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerContent: {
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#ffffff',
  },
  searchHint: {
    marginTop: 8,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  regionContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  regionScroll: {
    paddingHorizontal: 20,
    gap: 15,
  },
  regionTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
    minWidth: 80,
    alignItems: 'center',
  },
  regionTabActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3b82f6',
  },
  regionTabText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  regionTabTextActive: {
    color: '#3b82f6',
    fontWeight: '800',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 20,
    height: 3,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  // 🚀 分类样式
  categoryContainer: {
    paddingVertical: 15,
    backgroundColor: 'transparent',
  },
  categoryScroll: {
    paddingHorizontal: 20,
    gap: 20,
  },
  categoryItem: {
    alignItems: 'center',
    gap: 8,
    width: 65,
  },
  categoryIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryIconCircleActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  // 🚀 搜索标签样式
  searchTabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  searchTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  searchTabActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchTabText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  searchTabTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  // 🚀 商品卡片样式
  productCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  productMain: {
    flexDirection: 'row',
    gap: 12,
  },
  productImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#1e293b',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  productDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
    lineHeight: 16,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fbbf24',
  },
  originalPrice: {
    fontSize: 12,
    color: '#64748b',
    textDecorationLine: 'line-through',
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
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusTagSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagTextSmall: {
    fontSize: 10,
    fontWeight: '800',
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addToCartBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  disabledBtn: {
    backgroundColor: '#475569',
    opacity: 0.5,
  },
  // 🚀 Banner 样式
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
    ...theme.shadows.medium,
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
    padding: 20,
    paddingBottom: 40,
  },
  storeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  storeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  storeIcon: {
    fontSize: 30,
  },
  storeMainInfo: {
    flex: 1,
  },
  matchText: {
    fontSize: 12,
    color: '#fbbf24',
    marginTop: 2,
    marginBottom: 6,
  },
  storeName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  tagContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeTagText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '700',
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  storeDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 16,
    gap: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    flex: 1,
    fontWeight: '500',
  },
  cardFooter: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  visitText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // 🚀 新增评价样式
  reviewStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  starsRow: {
    flexDirection: 'row',
  },
  starsText: {
    color: '#fbbf24',
    fontSize: 14,
    letterSpacing: 1,
  },
  reviewCountText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '700',
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
  distributionContainer: {
    padding: 20,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  starLabel: {
    width: 35,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  countLabel: {
    width: 25,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
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
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  replyLabel: {
    color: '#3b82f6',
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
    backgroundColor: '#1e293b',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});
