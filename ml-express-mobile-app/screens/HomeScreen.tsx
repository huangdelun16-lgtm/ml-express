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

export default function HomeScreen({ navigation }: any) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');

  useEffect(() => {
    loadUserInfo();
    loadPackages();
  }, []);

  const loadUserInfo = async () => {
    const userName = await AsyncStorage.getItem('currentUserName') || '用户';
    const userRole = await AsyncStorage.getItem('currentUserRole') || 'operator';
    setCurrentUserName(userName);
    setCurrentUserRole(userRole);
  };

  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await packageService.getAllPackages();
      setPackages(data);
    } catch (error) {
      console.error('加载包裹失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPackages();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    // 重置导航栈到客户专区
    navigation.getParent()?.getParent()?.reset({
      index: 0,
      routes: [{ name: 'CustomerZone' }],
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待取件': return '#f39c12';
      case '已取件': return '#3498db';
      case '配送中': return '#9b59b6';
      case '已送达': return '#27ae60';
      case '已取消': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getRoleName = (role: string) => {
    const map: Record<string, string> = {
      'admin': '管理员',
      'manager': '经理',
      'operator': '操作员',
      'finance': '财务'
    };
    return map[role] || role;
  };

  const renderPackageItem = ({ item }: { item: Package }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PackageDetail', { package: item })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.packageId}>{item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.label}>收件人: <Text style={styles.value}>{item.receiver_name}</Text></Text>
        <Text style={styles.label}>电话: <Text style={styles.value}>{item.receiver_phone}</Text></Text>
        <Text style={styles.label} numberOfLines={1}>
          地址: <Text style={styles.value}>{item.receiver_address}</Text>
        </Text>
        <Text style={styles.label}>重量: <Text style={styles.value}>{item.weight}</Text></Text>
      </View>
    </TouchableOpacity>
  );

  // 统计数据
  const totalPackages = packages.length;
  const pendingPackages = packages.filter(p => p.status === '待取件').length;
  const inProgressPackages = packages.filter(p => ['已取件', '配送中'].includes(p.status)).length;
  const completedPackages = packages.filter(p => p.status === '已送达').length;

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>欢迎回来</Text>
          <Text style={styles.userName}>{currentUserName}</Text>
          <Text style={styles.userRole}>{getRoleName(currentUserRole)}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>退出</Text>
        </TouchableOpacity>
      </View>

      {/* 统计卡片 */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#3182ce' }]}>
          <Text style={styles.statNumber}>{totalPackages}</Text>
          <Text style={styles.statLabel}>总包裹</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#f39c12' }]}>
          <Text style={styles.statNumber}>{pendingPackages}</Text>
          <Text style={styles.statLabel}>待取件</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#9b59b6' }]}>
          <Text style={styles.statNumber}>{inProgressPackages}</Text>
          <Text style={styles.statLabel}>配送中</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#27ae60' }]}>
          <Text style={styles.statNumber}>{completedPackages}</Text>
          <Text style={styles.statLabel}>已完成</Text>
        </View>
      </View>

      {/* 包裹列表 */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>📦 包裹列表</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2c5282" />
          </View>
        ) : (
          <FlatList
            data={packages}
            renderItem={renderPackageItem}
            keyExtractor={item => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>暂无包裹数据</Text>
              </View>
            }
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  userRole: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 4,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2c3e50',
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
    alignItems: 'center',
    marginBottom: 12,
  },
  packageId: {
    fontSize: 16,
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
  cardBody: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    color: '#2c3e50',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
});
