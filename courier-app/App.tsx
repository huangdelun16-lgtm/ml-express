import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, StatusBar } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface Package {
  id: string;
  sender_name: string;
  receiver_name: string;
  receiver_address: string;
  status: string;
  latitude: number;
  longitude: number;
}

export default function App() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 获取当前位置
  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      
      // 请求位置权限
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限被拒绝', '需要位置权限来获取当前位置');
        return;
      }

      // 获取当前位置
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
      };

      setLocation(locationData);
      
      Alert.alert(
        '位置获取成功！',
        `纬度: ${locationData.latitude.toFixed(6)}\n经度: ${locationData.longitude.toFixed(6)}\n精度: ${locationData.accuracy?.toFixed(0)}米`,
        [{ text: '确定' }]
      );

    } catch (error) {
      console.error('获取位置失败:', error);
      Alert.alert('获取位置失败', '请检查GPS设置和网络连接');
    } finally {
      setIsLoading(false);
    }
  };

  // 模拟获取包裹数据
  const loadPackages = () => {
    const mockPackages: Package[] = [
      {
        id: 'PKG001',
        sender_name: '张三',
        receiver_name: '李四',
        receiver_address: '曼德勒市中心商业区',
        status: '待配送',
        latitude: 21.9588,
        longitude: 96.0891,
      },
      {
        id: 'PKG002',
        sender_name: '王五',
        receiver_name: '赵六',
        receiver_address: '曼德勒大学附近',
        status: '配送中',
        latitude: 21.9688,
        longitude: 96.0991,
      },
      {
        id: 'PKG003',
        sender_name: '孙七',
        receiver_name: '周八',
        receiver_address: '茵雅湖畔',
        status: '待取件',
        latitude: 21.9488,
        longitude: 96.0791,
      },
    ];
    setPackages(mockPackages);
  };

  // 更新包裹状态
  const updatePackageStatus = (packageId: string, newStatus: string) => {
    setPackages(prev => 
      prev.map(pkg => 
        pkg.id === packageId ? { ...pkg, status: newStatus } : pkg
      )
    );
    Alert.alert('状态更新', `包裹 ${packageId} 状态已更新为: ${newStatus}`);
  };

  useEffect(() => {
    loadPackages();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a365d" />
      
      {/* 头部 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚴 骑手工作台</Text>
        <Text style={styles.headerSubtitle}>MARKET LINK EXPRESS</Text>
      </View>

      {/* 地图区域 */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: 21.9588,
            longitude: 96.0891,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          showsScale={true}
        >
          {/* 当前位置标记 */}
          {location && (
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="我的位置"
              description={`精度: ${location.accuracy?.toFixed(0)}米`}
              pinColor="blue"
            />
          )}

          {/* 包裹位置标记 */}
          {packages.map((pkg) => (
            <Marker
              key={pkg.id}
              coordinate={{
                latitude: pkg.latitude,
                longitude: pkg.longitude,
              }}
              title={`包裹 ${pkg.id}`}
              description={`${pkg.sender_name} → ${pkg.receiver_name}`}
              pinColor={pkg.status === '配送中' ? 'red' : pkg.status === '待配送' ? 'orange' : 'green'}
              onPress={() => setSelectedPackage(pkg)}
            />
          ))}
        </MapView>

        {/* 当前位置按钮 */}
        <TouchableOpacity
          style={styles.locationButton}
          onPress={getCurrentLocation}
          disabled={isLoading}
        >
          <Text style={styles.locationButtonText}>
            {isLoading ? '📍' : '📍'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 包裹列表 */}
      <View style={styles.packageList}>
        <Text style={styles.sectionTitle}>📦 我的包裹 ({packages.length})</Text>
        {packages.map((pkg) => (
          <View key={pkg.id} style={styles.packageItem}>
            <View style={styles.packageInfo}>
              <Text style={styles.packageId}>#{pkg.id}</Text>
              <Text style={styles.packageRoute}>
                {pkg.sender_name} → {pkg.receiver_name}
              </Text>
              <Text style={styles.packageAddress}>{pkg.receiver_address}</Text>
              <Text style={[
                styles.packageStatus,
                { color: pkg.status === '配送中' ? '#e74c3c' : pkg.status === '待配送' ? '#f39c12' : '#27ae60' }
              ]}>
                状态: {pkg.status}
              </Text>
            </View>
            <View style={styles.packageActions}>
              {pkg.status === '待取件' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.pickupButton]}
                  onPress={() => updatePackageStatus(pkg.id, '配送中')}
                >
                  <Text style={styles.actionButtonText}>取件</Text>
                </TouchableOpacity>
              )}
              {pkg.status === '配送中' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deliverButton]}
                  onPress={() => updatePackageStatus(pkg.id, '已送达')}
                >
                  <Text style={styles.actionButtonText}>送达</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* 底部操作栏 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.refreshButton} onPress={loadPackages}>
          <Text style={styles.refreshButtonText}>🔄 刷新包裹</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
          <Text style={styles.refreshButtonText}>📍 获取位置</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1a365d',
    paddingTop: Constants.statusBarHeight + 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  locationButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#38a169',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationButtonText: {
    fontSize: 20,
    color: 'white',
  },
  packageList: {
    backgroundColor: 'white',
    padding: 15,
    maxHeight: 200,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2c3e50',
  },
  packageItem: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  packageInfo: {
    flex: 1,
  },
  packageId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  packageRoute: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  packageAddress: {
    fontSize: 11,
    color: '#95a5a6',
    marginTop: 2,
  },
  packageStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  packageActions: {
    justifyContent: 'center',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 8,
  },
  pickupButton: {
    backgroundColor: '#f39c12',
  },
  deliverButton: {
    backgroundColor: '#27ae60',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  refreshButton: {
    flex: 1,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});