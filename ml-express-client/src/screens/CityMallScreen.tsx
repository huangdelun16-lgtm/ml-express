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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { deliveryStoreService } from '../services/supabase';
import { useApp } from '../contexts/AppContext';
import { theme } from '../config/theme';
import BackToHomeButton from '../components/BackToHomeButton';

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

  const t = {
    zh: {
      title: '同城商场',
      searchPlaceholder: '搜索商户名称...',
      allStores: '全部分类',
      noStores: '暂无商户',
      operatingHours: '营业时间',
      contact: '联系电话',
      visitStore: '进入店铺',
      openNow: '正在营业',
      closedNow: '休息中',
      closedToday: '今日暂停营业'
    },
    en: {
      title: 'City Mall',
      searchPlaceholder: 'Search store name...',
      allStores: 'All Categories',
      noStores: 'No stores found',
      operatingHours: 'Hours',
      contact: 'Phone',
      visitStore: 'Visit Store',
      openNow: 'Open Now',
      closedNow: 'Closed',
      closedToday: 'Closed Today'
    },
    my: {
      title: 'မြို့တွင်းဈေးဝယ်စင်တာ',
      searchPlaceholder: 'ဆိုင်အမည်ရှာရန်...',
      allStores: 'ကဏ္ဍအားလုံး',
      noStores: 'ဆိုင်များမရှိသေးပါ',
      operatingHours: 'ဖွင့်ချိန်',
      contact: 'ဖုန်းနံပါတ်',
      visitStore: 'ဆိုင်သို့ဝင်ရန်',
      openNow: 'ဆိုင်ဖွင့်ထားသည်',
      closedNow: 'ဆိုင်ပိတ်ထားသည်',
      closedToday: 'ယနေ့ ဆိုင်ပိတ်သည်'
    },
  }[language] || {
    title: 'City Mall',
    searchPlaceholder: 'Search store name...',
    allStores: 'All Categories',
    noStores: 'No stores found',
    operatingHours: 'Hours',
    contact: 'Phone',
    visitStore: 'Visit Store',
    openNow: 'Open Now',
    closedNow: 'Closed',
    closedToday: 'Closed Today'
  };

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    setLoading(true);
    try {
      const data = await deliveryStoreService.getActiveStores();
      setStores(data);
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStores();
    setRefreshing(false);
  };

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
      
      if (currentTime >= startTime && currentTime <= endTime) {
        return { isOpen: true, reason: 'open' };
      }
      return { isOpen: false, reason: 'outside_hours' };
    } catch (e) {
      return { isOpen: true, reason: 'parse_error' };
    }
  };

  const filteredStores = stores
    .filter(store =>
      store.store_name.toLowerCase().includes(searchText.toLowerCase()) ||
      (store.store_code && store.store_code.toLowerCase().includes(searchText.toLowerCase()))
    )
    .sort((a, b) => {
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

  const renderStoreItem = ({ item }: { item: DeliveryStore }) => {
    const status = checkStoreOpenStatus(item);
    
    return (
      <TouchableOpacity
        style={[
          styles.storeCard,
          !status.isOpen && { opacity: 0.7 } // 休息中透明度
        ]}
        onPress={() => {
          if (!status.isOpen) {
            alert(t.closedToday);
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
        colors={['#1e3a8a', '#2563eb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <BackToHomeButton navigation={navigation} color="white" />
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
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={filteredStores}
          keyExtractor={(item) => item.id}
          renderItem={renderStoreItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🏢</Text>
              <Text style={styles.emptyText}>{t.noStores}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    ...theme.shadows.small,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1e293b',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  storeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.medium,
    elevation: 4,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  storeIcon: {
    fontSize: 28,
  },
  storeMainInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  tagContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeTagText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  statusTag: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 11,
    color: '#15803d',
    fontWeight: '600',
  },
  storeDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  cardFooter: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  visitText: {
    fontSize: 14,
    color: '#3b82f6',
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
    marginTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
  },
});
