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

export default function CourierHomeScreen({ navigation }: any) {
  const { language } = useApp();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');

  useEffect(() => {
    loadUserInfo();
    loadMyPackages();
  }, []);

  const loadUserInfo = async () => {
    const userName = await AsyncStorage.getItem('currentUserName') || '骑手';
    setCurrentUserName(userName);
  };

  const loadMyPackages = async () => {
    try {
      setLoading(true);
      const currentUser = await AsyncStorage.getItem('currentUserName') || '';
      const allPackages = await packageService.getAllPackages();
      
      // 筛选分配给当前快递员的包裹，且未完成的
      const myPackages = allPackages.filter(pkg => 
        pkg.courier === currentUser && 
        !['已送达', '已取消'].includes(pkg.status)
      );
      
      setPackages(myPackages);
    } catch (error) {
      console.error('加载包裹失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMyPackages();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待取件': return '#f39c12';
      case '已取件': return '#3498db';
      case '配送中': return '#9b59b6';
      default: return '#95a5a6';
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case '待取件': return '已取件';
      case '已取件': return '配送中';
      case '配送中': return '已送达';
      default: return '';
    }
  };

  const renderPackageItem = ({ item }: { item: Package }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PackageDetail', { package: item })}
    >
      {/* 状态横条 */}
      <View style={[styles.statusBar, { backgroundColor: getStatusColor(item.status) }]} />
      
      <View style={styles.cardContent}>
        {/* 头部：编号和状态 */}
        <View style={styles.cardHeader}>
          <Text style={styles.packageId}>{item.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        
        {/* 收件人信息 */}
        <View style={styles.receiverInfo}>
          <Text style={styles.receiverName}>📍 {item.receiver_name}</Text>
          <Text style={styles.receiverPhone}>📞 {item.receiver_phone}</Text>
          <Text style={styles.address} numberOfLines={2}>{item.receiver_address}</Text>
        </View>

        {/* 包裹信息 */}
        <View style={styles.packageInfo}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{language === 'zh' ? '类型' : 'Type'}</Text>
            <Text style={styles.infoValue}>{item.package_type}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{language === 'zh' ? '重量' : 'Weight'}</Text>
            <Text style={styles.infoValue}>{item.weight}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{language === 'zh' ? '价格' : 'Price'}</Text>
            <Text style={styles.infoValue}>{item.price}</Text>
          </View>
        </View>

        {/* 快捷操作按钮 */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickButton}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate('PackageDetail', { package: item, action: 'call' });
            }}
          >
            <Text style={styles.quickButtonText}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickButton}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate('PackageDetail', { package: item, action: 'navigate' });
            }}
          >
            <Text style={styles.quickButtonText}>🗺️</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.nextStatusButton, { backgroundColor: getStatusColor(getNextStatus(item.status)) }]}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate('PackageDetail', { package: item, action: 'updateStatus' });
            }}
          >
            <Text style={styles.nextStatusText}>{getNextStatus(item.status)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  // 统计
  const todoCount = packages.filter(p => p.status === '待取件').length;
  const pickedCount = packages.filter(p => p.status === '已取件').length;
  const deliveringCount = packages.filter(p => p.status === '配送中').length;

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>👋 {language === 'zh' ? '你好' : 'Hello'}</Text>
          <Text style={styles.userName}>{currentUserName}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{packages.length}</Text>
          <Text style={styles.badgeLabel}>{language === 'zh' ? '待完成' : 'Pending'}</Text>
        </View>
      </View>

      {/* 统计卡片 */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#f39c12' }]}>
          <Text style={styles.statNumber}>{todoCount}</Text>
          <Text style={styles.statLabel}>{language === 'zh' ? '待取件' : 'Pending Pickup'}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#3498db' }]}>
          <Text style={styles.statNumber}>{pickedCount}</Text>
          <Text style={styles.statLabel}>{language === 'zh' ? '已取件' : 'Picked Up'}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#9b59b6' }]}>
          <Text style={styles.statNumber}>{deliveringCount}</Text>
          <Text style={styles.statLabel}>{language === 'zh' ? '配送中' : 'Delivering'}</Text>
        </View>
      </View>

      {/* 任务列表 */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>📦 {language === 'zh' ? '我的任务' : 'My Tasks'}</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2c5282" />
          </View>
        ) : packages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>{language === 'zh' ? '太棒了！' : 'Great!'}</Text>
            <Text style={styles.emptySubtext}>{language === 'zh' ? '暂无待配送的包裹' : 'No packages to deliver'}</Text>
          </View>
        ) : (
          <FlatList
            data={packages}
            renderItem={renderPackageItem}
            keyExtractor={item => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
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
    padding: 20,
    paddingTop: 50,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
  },
  userName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  badgeLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    marginTop: 4,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2c3e50',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusBar: {
    height: 4,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5282',
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
  receiverInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  receiverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  receiverPhone: {
    fontSize: 14,
    color: '#3182ce',
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  packageInfo: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickButton: {
    width: 48,
    height: 48,
    backgroundColor: '#3182ce',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 20,
  },
  nextStatusButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextStatusText: {
    color: '#fff',
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
  },
});
