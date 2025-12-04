import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { packageService, Package } from '../services/supabase';
import { useApp } from '../contexts/AppContext';

export default function DeliveryHistoryScreen({ navigation }: any) {
  const { language } = useApp();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const currentUser = await AsyncStorage.getItem('currentUserName') || '';
      const allPackages = await packageService.getAllPackages();
      
      // 获取历史包裹（已送达或已取消）
      const history = allPackages.filter(pkg => 
        pkg.courier === currentUser && 
        ['已送达', '已取消'].includes(pkg.status)
      );
      
      setPackages(history);
    } catch (error) {
      console.error('加载历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case '已取件':
        return language === 'zh' ? '已取件' : language === 'en' ? 'Picked Up' : 'ကောက်ယူပြီး';
      case '配送中':
      case '配送进行中':
        return language === 'zh' ? '配送中' : language === 'en' ? 'Delivering' : 'ပို့ဆောင်နေသည်';
      case '已送达':
        return language === 'zh' ? '已送达' : language === 'en' ? 'Delivered' : 'ပေးပို့ပြီး';
      case '已取消':
        return language === 'zh' ? '已取消' : language === 'en' ? 'Cancelled' : 'ပယ်ဖျက်ပြီး';
      default:
        return language === 'zh' ? '未知状态' : language === 'en' ? 'Unknown' : 'အခြေအနေမသိ';
    }
  };

  const filteredPackages = packages.filter(pkg => {
    // 状态筛选
    if (filter === 'completed' && pkg.status !== '已送达') return false;
    if (filter === 'cancelled' && pkg.status !== '已取消') return false;
    
    // 日期筛选
    if (dateFilter !== 'all') {
      const dateStr = pkg.delivery_time || pkg.create_time;
      if (!dateStr) return false;
      
      const date = new Date(dateStr);
      const today = new Date();
      
      if (dateFilter === 'today') {
        return date.getDate() === today.getDate() && 
               date.getMonth() === today.getMonth() && 
               date.getFullYear() === today.getFullYear();
      }
      
      if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        return date >= weekAgo;
      }
    }
    
    return true;
  });

  const renderPackageItem = ({ item }: { item: Package }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PackageDetail', { package: item })}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.packageId}>{item.id}</Text>
          <Text style={styles.date}>
            {item.status === '已送达' 
              ? `${language === 'zh' ? '送达' : language === 'en' ? 'Delivered' : 'ပေးပို့ပြီး'}: ${item.delivery_time}` 
              : `${language === 'zh' ? '取消' : language === 'en' ? 'Cancelled' : 'ပယ်ဖျက်ပြီး'}: ${item.create_time}`}
          </Text>
        </View>
        {/* 支付方式标识（替换原来的状态标识） */}
        {item.status === '已取消' ? (
          <View style={[styles.statusBadge, { backgroundColor: '#e74c3c' }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        ) : (
          <View>
            {item.payment_method === 'cash' && (
              <View style={[styles.paymentBadge, { backgroundColor: '#f59e0b' }]}>
                <Text style={styles.paymentBadgeText}>
                  💵 {language === 'zh' ? '现金' : language === 'en' ? 'Cash' : 'ငွေသား'}
                </Text>
              </View>
            )}
            {item.payment_method === 'qr' && (
              <View style={[styles.paymentBadge, { backgroundColor: '#3b82f6' }]}>
                <Text style={styles.paymentBadgeText}>
                  📱 {language === 'zh' ? '二维码' : language === 'en' ? 'QR Code' : 'QR Code'}
                </Text>
              </View>
            )}
            {!item.payment_method && (
              <View style={[styles.paymentBadge, { backgroundColor: '#6b7280' }]}>
                <Text style={styles.paymentBadgeText}>
                  💰 {language === 'zh' ? '已支付' : language === 'en' ? 'Paid' : 'ပေးချေပြီး'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.receiver}>
          {language === 'zh' ? '收件人' : language === 'en' ? 'Receiver' : 'လက်ခံသူ'}: {item.receiver_name}
        </Text>
        <Text style={styles.address} numberOfLines={1}>
          {language === 'zh' ? '地址' : language === 'en' ? 'Address' : 'လိပ်စာ'}: {item.receiver_address}
        </Text>
        <Text style={styles.price}>
          {language === 'zh' ? '价格' : language === 'en' ? 'Price' : 'စျေးနှုန်း'}: {item.price}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const completedCount = packages.filter(p => p.status === '已送达').length;
  const cancelledCount = packages.filter(p => p.status === '已取消').length;

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'zh' ? '配送历史' : language === 'en' ? 'Delivery History' : 'ပို့ဆောင်မှုမှတ်တမ်း'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 统计栏 */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{completedCount}</Text>
          <Text style={styles.summaryLabel}>
            {language === 'zh' ? '已完成' : language === 'en' ? 'Completed' : 'ပြီးစီးပြီး'}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{cancelledCount}</Text>
          <Text style={styles.summaryLabel}>
            {language === 'zh' ? '已取消' : language === 'en' ? 'Cancelled' : 'ပယ်ဖျက်ပြီး'}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{packages.length}</Text>
          <Text style={styles.summaryLabel}>
            {language === 'zh' ? '总计' : language === 'en' ? 'Total' : 'စုစုပေါင်း'}
          </Text>
        </View>
      </View>

      {/* 筛选标签 */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            {language === 'zh' ? '全部' : language === 'en' ? 'All' : 'အားလုံး'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'completed' && styles.filterButtonActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            {language === 'zh' ? '已完成' : language === 'en' ? 'Completed' : 'ပြီးစီးပြီး'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'cancelled' && styles.filterButtonActive]}
          onPress={() => setFilter('cancelled')}
        >
          <Text style={[styles.filterText, filter === 'cancelled' && styles.filterTextActive]}>
            {language === 'zh' ? '已取消' : language === 'en' ? 'Cancelled' : 'ပယ်ဖျက်ပြီး'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 历史列表 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c5282" />
        </View>
      ) : filteredPackages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>
            {language === 'zh' ? '暂无历史记录' : language === 'en' ? 'No History Records' : 'မှတ်တမ်းမရှိပါ'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredPackages}
          renderItem={renderPackageItem}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  header: {
    backgroundColor: '#2c5282',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    color: '#fff',
    fontSize: 28,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryBar: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c5282',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  filterContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
    width: 40,
    fontWeight: '500',
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#2c5282',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  packageId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c5282',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    gap: 4,
  },
  receiver: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  address: {
    fontSize: 13,
    color: '#666',
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27ae60',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
  },
});
