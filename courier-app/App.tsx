import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './services/supabase';

export default function StaffApp() {
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [userInfo, setUserInfo] = useState({
    name: '',
    role: '',
    username: ''
  });
  const [packages, setPackages] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserInfo();
    loadData();
  }, []);

  const loadUserInfo = async () => {
    const name = await AsyncStorage.getItem('currentUserName') || 'Staff User';
    const role = await AsyncStorage.getItem('currentUserRole') || 'operator';
    const username = await AsyncStorage.getItem('currentUser') || 'staff';
    
    setUserInfo({ name, role, username });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 加载包裹数据
      const { data: packagesData } = await supabase
        .from('packages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      setPackages(packagesData || []);

      // 加载骑手数据
      const { data: couriersData } = await supabase
        .from('couriers')
        .select('*')
        .order('name');
      
      setCouriers(couriersData || []);
    } catch (error) {
      console.error('加载数据失败:', error);
      Alert.alert('错误', '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      '确认退出',
      '确定要退出登录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '退出',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            // 这里应该导航到登录页面
            Alert.alert('已退出', '请重新登录');
          }
        }
      ]
    );
  };

  const renderDashboard = () => (
    <ScrollView style={styles.screenContent}>
      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeTitle}>欢迎回来，{userInfo.name}！</Text>
        <Text style={styles.welcomeSubtitle}>角色: {userInfo.role}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{packages.length}</Text>
          <Text style={styles.statLabel}>总包裹数</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{couriers.length}</Text>
          <Text style={styles.statLabel}>骑手数量</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {packages.filter(p => p.status === '已送达').length}
          </Text>
          <Text style={styles.statLabel}>已完成</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>快速操作</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setCurrentScreen('packages')}
          >
            <Ionicons name="cube" size={24} color="#2c5282" />
            <Text style={styles.actionText}>包裹管理</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setCurrentScreen('couriers')}
          >
            <Ionicons name="people" size={24} color="#2c5282" />
            <Text style={styles.actionText}>骑手管理</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setCurrentScreen('scanner')}
          >
            <Ionicons name="qr-code" size={24} color="#2c5282" />
            <Text style={styles.actionText}>扫码管理</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setCurrentScreen('map')}
          >
            <Ionicons name="map" size={24} color="#2c5282" />
            <Text style={styles.actionText}>地图监控</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderPackages = () => (
    <ScrollView style={styles.screenContent}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
          <Ionicons name="arrow-back" size={24} color="#2c5282" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>包裹管理</Text>
        <TouchableOpacity onPress={loadData}>
          <Ionicons name="refresh" size={24} color="#2c5282" />
        </TouchableOpacity>
      </View>

      {packages.map((pkg, index) => (
        <View key={pkg.id || index} style={styles.packageCard}>
          <View style={styles.packageHeader}>
            <Text style={styles.packageId}>#{pkg.id}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(pkg.status) }
            ]}>
              <Text style={styles.statusText}>{pkg.status}</Text>
            </View>
          </View>
          
          <Text style={styles.packageInfo}>
            {pkg.sender_name} → {pkg.receiver_name}
          </Text>
          <Text style={styles.packageAddress}>{pkg.receiver_address}</Text>
          
          <View style={styles.packageActions}>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>查看详情</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>编辑</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderCouriers = () => (
    <ScrollView style={styles.screenContent}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
          <Ionicons name="arrow-back" size={24} color="#2c5282" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>骑手管理</Text>
        <TouchableOpacity onPress={loadData}>
          <Ionicons name="refresh" size={24} color="#2c5282" />
        </TouchableOpacity>
      </View>

      {couriers.map((courier, index) => (
        <View key={courier.id || index} style={styles.courierCard}>
          <View style={styles.courierHeader}>
            <Text style={styles.courierName}>{courier.name}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: courier.status === 'active' ? '#27ae60' : '#95a5a6' }
            ]}>
              <Text style={styles.statusText}>
                {courier.status === 'active' ? '在线' : '离线'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.courierInfo}>
            车辆: {courier.vehicle_type} | 电话: {courier.phone}
          </Text>
          
          <View style={styles.packageActions}>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>查看详情</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>分配任务</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  const renderScanner = () => (
    <View style={styles.screenContent}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
          <Ionicons name="arrow-back" size={24} color="#2c5282" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>扫码管理</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.scannerContainer}>
        <Ionicons name="qr-code" size={80} color="#2c5282" />
        <Text style={styles.scannerTitle}>扫码功能</Text>
        <Text style={styles.scannerSubtitle}>
          扫描包裹二维码或中转码
        </Text>
        
        <TouchableOpacity style={styles.scanButton}>
          <Text style={styles.scanButtonText}>开始扫描</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.manualButton}>
          <Text style={styles.manualButtonText}>手动输入</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMap = () => (
    <View style={styles.screenContent}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentScreen('dashboard')}>
          <Ionicons name="arrow-back" size={24} color="#2c5282" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>地图监控</Text>
        <TouchableOpacity onPress={loadData}>
          <Ionicons name="refresh" size={24} color="#2c5282" />
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <Ionicons name="map" size={80} color="#2c5282" />
        <Text style={styles.mapTitle}>地图功能</Text>
        <Text style={styles.mapSubtitle}>
          实时监控骑手位置和配送路线
        </Text>
        
        <TouchableOpacity style={styles.mapButton}>
          <Text style={styles.mapButtonText}>打开地图</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.routeButton}>
          <Text style={styles.routeButtonText}>规划路线</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已送达': return '#27ae60';
      case '配送中': return '#f39c12';
      case '待取件': return '#3498db';
      default: return '#95a5a6';
    }
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'packages': return renderPackages();
      case 'couriers': return renderCouriers();
      case 'scanner': return renderScanner();
      case 'map': return renderMap();
      default: return renderDashboard();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2c5282" />
      
      {/* 顶部导航栏 */}
      <View style={styles.topBar}>
        <Text style={styles.appTitle}>ML Express Staff</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* 主内容区域 */}
      {renderCurrentScreen()}

      {/* 底部导航栏 */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={[styles.navItem, currentScreen === 'dashboard' && styles.navItemActive]}
          onPress={() => setCurrentScreen('dashboard')}
        >
          <Ionicons 
            name={currentScreen === 'dashboard' ? 'home' : 'home-outline'} 
            size={24} 
            color={currentScreen === 'dashboard' ? '#2c5282' : '#666'} 
          />
          <Text style={[
            styles.navText, 
            currentScreen === 'dashboard' && styles.navTextActive
          ]}>工作台</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, currentScreen === 'packages' && styles.navItemActive]}
          onPress={() => setCurrentScreen('packages')}
        >
          <Ionicons 
            name={currentScreen === 'packages' ? 'cube' : 'cube-outline'} 
            size={24} 
            color={currentScreen === 'packages' ? '#2c5282' : '#666'} 
          />
          <Text style={[
            styles.navText, 
            currentScreen === 'packages' && styles.navTextActive
          ]}>包裹</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, currentScreen === 'couriers' && styles.navItemActive]}
          onPress={() => setCurrentScreen('couriers')}
        >
          <Ionicons 
            name={currentScreen === 'couriers' ? 'people' : 'people-outline'} 
            size={24} 
            color={currentScreen === 'couriers' ? '#2c5282' : '#666'} 
          />
          <Text style={[
            styles.navText, 
            currentScreen === 'couriers' && styles.navTextActive
          ]}>骑手</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, currentScreen === 'scanner' && styles.navItemActive]}
          onPress={() => setCurrentScreen('scanner')}
        >
          <Ionicons 
            name={currentScreen === 'scanner' ? 'qr-code' : 'qr-code-outline'} 
            size={24} 
            color={currentScreen === 'scanner' ? '#2c5282' : '#666'} 
          />
          <Text style={[
            styles.navText, 
            currentScreen === 'scanner' && styles.navTextActive
          ]}>扫码</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navItem, currentScreen === 'map' && styles.navItemActive]}
          onPress={() => setCurrentScreen('map')}
        >
          <Ionicons 
            name={currentScreen === 'map' ? 'map' : 'map-outline'} 
            size={24} 
            color={currentScreen === 'map' ? '#2c5282' : '#666'} 
          />
          <Text style={[
            styles.navText, 
            currentScreen === 'map' && styles.navTextActive
          ]}>地图</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  topBar: {
    backgroundColor: '#2c5282',
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  screenContent: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  welcomeCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  quickActions: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 12,
    color: '#2c3e50',
    marginTop: 8,
    textAlign: 'center',
  },
  packageCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  packageInfo: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
  },
  packageAddress: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  packageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    backgroundColor: '#2c5282',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  actionBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  courierCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  courierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courierName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  courierInfo: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  scannerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  scannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 8,
  },
  scannerSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 40,
  },
  scanButton: {
    backgroundColor: '#2c5282',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  manualButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  manualButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  mapTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 8,
  },
  mapSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 40,
  },
  mapButton: {
    backgroundColor: '#2c5282',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  mapButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  routeButton: {
    backgroundColor: '#e67e22',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  routeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomNav: {
    backgroundColor: 'white',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navItemActive: {
    backgroundColor: '#f7fafc',
    borderRadius: 8,
  },
  navText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  navTextActive: {
    color: '#2c5282',
    fontWeight: 'bold',
  },
});