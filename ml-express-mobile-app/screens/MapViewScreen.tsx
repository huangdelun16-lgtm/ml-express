import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import { requestForegroundPermissionsIfDisclosed } from '../utils/locationPermissionGate';
import { packageService, Package, Courier, courierService } from '../services/supabase';

interface MapViewScreenProps {
  visible: boolean;
  onClose: () => void;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

interface CourierLocation extends Courier {
  location?: LocationData;
  currentPackages?: Package[];
}

export default function MapViewScreen({ visible, onClose }: MapViewScreenProps) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [courierLocations, setCourierLocations] = useState<CourierLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<CourierLocation | null>(null);

  useEffect(() => {
    if (visible) {
      loadMapData();
    }
  }, [visible]);

  const loadMapData = async () => {
    setLoading(true);
    try {
      // 获取当前位置
      await getCurrentLocation();
      
      // 获取快递员和包裹数据
      await loadCourierLocations();
    } catch (error) {
      console.error('加载地图数据失败:', error);
      Alert.alert('错误', '加载地图数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await requestForegroundPermissionsIfDisclosed();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要位置权限才能显示地图');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: '当前位置'
      });
    } catch (error) {
      console.error('获取当前位置失败:', error);
      // 设置默认位置（例如公司位置）
      setCurrentLocation({
        latitude: 24.4539,
        longitude: 118.0822,
        address: '厦门市'
      });
    }
  };

  const loadCourierLocations = async () => {
    try {
      const [couriers, packages] = await Promise.all([
        courierService.getActiveCouriers(),
        packageService.getAllPackages()
      ]);

      // 为每个快递员分配包裹和模拟位置
      const courierData: CourierLocation[] = couriers.map((courier, index) => {
        // 获取分配给该快递员的包裹
        const assignedPackages = packages.filter(pkg => 
          pkg.courier === courier.name && 
          ['已分配', '配送中', '已取件'].includes(pkg.status)
        );

        // 模拟快递员位置（在实际应用中，这应该来自GPS追踪）
        const simulatedLocation = generateSimulatedLocation(index, currentLocation);

        return {
          ...courier,
          location: simulatedLocation,
          currentPackages: assignedPackages
        };
      });

      setCourierLocations(courierData);
    } catch (error) {
      console.error('加载快递员位置失败:', error);
    }
  };

  // 生成模拟位置（围绕当前位置的随机坐标）
  const generateSimulatedLocation = (index: number, center: LocationData | null): LocationData => {
    if (!center) {
      return {
        latitude: 24.4539 + (Math.random() - 0.5) * 0.1,
        longitude: 118.0822 + (Math.random() - 0.5) * 0.1,
        address: `配送区域 ${index + 1}`
      };
    }

    const radius = 0.05; // 约5km范围
    const randomLat = center.latitude + (Math.random() - 0.5) * radius;
    const randomLng = center.longitude + (Math.random() - 0.5) * radius;

    return {
      latitude: randomLat,
      longitude: randomLng,
      address: `配送区域 ${index + 1}`
    };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMapData();
    setRefreshing(false);
  };

  const openInMaps = (location: LocationData, title: string) => {
    const url = `https://maps.google.com/maps?q=${location.latitude},${location.longitude}&z=15`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('错误', '无法打开地图应用');
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#27ae60';
      case 'busy': return '#f39c12';
      case 'inactive': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'motorcycle': return '🏍️';
      case 'car': return '🚗';
      case 'bicycle': return '🚲';
      case 'truck': return '🚚';
      default: return '🚚';
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {/* 头部 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🗺️ 配送地图</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Text style={styles.refreshIcon}>🔄</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2c5282" />
            <Text style={styles.loadingText}>加载地图数据...</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* 当前位置 */}
            {currentLocation && (
              <View style={styles.locationCard}>
                <View style={styles.locationHeader}>
                  <Text style={styles.locationIcon}>📍</Text>
                  <Text style={styles.locationTitle}>当前位置</Text>
                </View>
                <Text style={styles.locationAddress}>{currentLocation.address}</Text>
                <Text style={styles.locationCoords}>
                  纬度: {currentLocation?.latitude?.toFixed(6) || 'N/A'} | 
                  经度: {currentLocation?.longitude?.toFixed(6) || 'N/A'}
                </Text>
                <TouchableOpacity
                  style={styles.openMapButton}
                  onPress={() => openInMaps(currentLocation, '当前位置')}
                >
                  <Text style={styles.openMapButtonText}>在地图中打开</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 快递员位置列表 */}
            <View style={styles.couriersSection}>
              <Text style={styles.sectionTitle}>
                👥 快递员实时位置 ({courierLocations.length})
              </Text>
              
              {courierLocations.length === 0 ? (
                <View style={styles.emptyCouriers}>
                  <Text style={styles.emptyCouriersText}>暂无活跃快递员</Text>
                </View>
              ) : (
                courierLocations.map((courier) => (
                  <TouchableOpacity
                    key={courier.id}
                    style={styles.courierCard}
                    onPress={() => setSelectedCourier(courier)}
                  >
                    <View style={styles.courierHeader}>
                      <View style={styles.courierInfo}>
                        <Text style={styles.courierName}>
                          {getVehicleIcon(courier.vehicle_type)} {courier.name}
                        </Text>
                        <View style={[
                          styles.courierStatus,
                          { backgroundColor: getStatusColor(courier.status) }
                        ]}>
                          <Text style={styles.courierStatusText}>
                            {courier.status === 'active' ? '空闲' : 
                             courier.status === 'busy' ? '配送中' : '离线'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.packageCount}>
                        <Text style={styles.packageCountText}>
                          📦 {courier.currentPackages?.length || 0}
                        </Text>
                      </View>
                    </View>
                    
                    {courier.location && (
                      <>
                        <Text style={styles.courierLocation}>
                          📍 {courier.location.address}
                        </Text>
                        <Text style={styles.courierCoords}>
                          {courier.location?.latitude?.toFixed(4) || 'N/A'}, {courier.location?.longitude?.toFixed(4) || 'N/A'}
                        </Text>
                      </>
                    )}
                    
                    <View style={styles.courierActions}>
                      {courier.location && (
                        <TouchableOpacity
                          style={styles.mapButton}
                          onPress={() => openInMaps(courier.location!, courier.name)}
                        >
                          <Text style={styles.mapButtonText}>查看地图</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.detailButton}
                        onPress={() => setSelectedCourier(courier)}
                      >
                        <Text style={styles.detailButtonText}>查看详情</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        )}

        {/* 快递员详情模态框 */}
        {selectedCourier && (
          <Modal
            visible={!!selectedCourier}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setSelectedCourier(null)}
          >
            <View style={styles.centeredModalOverlay}>
              <View style={styles.centeredModalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {getVehicleIcon(selectedCourier.vehicle_type)} {selectedCourier.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedCourier(null)}
                    style={styles.modalCloseButton}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalScroll}>
                  {/* 基本信息 */}
                  <View style={styles.infoSection}>
                    <Text style={styles.infoTitle}>基本信息</Text>
                    <Text style={styles.infoText}>电话: {selectedCourier.phone}</Text>
                    <Text style={styles.infoText}>
                      状态: <Text style={{ color: getStatusColor(selectedCourier.status) }}>
                        {selectedCourier.status === 'active' ? '空闲' : 
                         selectedCourier.status === 'busy' ? '配送中' : '离线'}
                      </Text>
                    </Text>
                    <Text style={styles.infoText}>
                      评分: ⭐ {selectedCourier.rating || 5.0}
                    </Text>
                    <Text style={styles.infoText}>
                      配送总数: {selectedCourier.total_deliveries || 0}
                    </Text>
                  </View>

                  {/* 当前配送包裹 */}
                  <View style={styles.infoSection}>
                    <Text style={styles.infoTitle}>
                      当前配送 ({selectedCourier.currentPackages?.length || 0})
                    </Text>
                    {selectedCourier.currentPackages && selectedCourier.currentPackages.length > 0 ? (
                      selectedCourier.currentPackages.map((pkg, index) => (
                        <View key={index} style={styles.packageItem}>
                          <Text style={styles.packageId}>{pkg.id}</Text>
                          <Text style={styles.packageReceiver}>→ {pkg.receiver_name}</Text>
                          <Text style={styles.packageAddress}>{pkg.receiver_address}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noPackagesText}>暂无配送任务</Text>
                    )}
                  </View>

                  {/* 位置信息 */}
                  {selectedCourier.location && (
                    <View style={styles.infoSection}>
                      <Text style={styles.infoTitle}>位置信息</Text>
                      <Text style={styles.infoText}>📍 {selectedCourier.location.address}</Text>
                      <Text style={styles.infoText}>
                        坐标: {selectedCourier.location?.latitude?.toFixed(6) || 'N/A'}, {selectedCourier.location?.longitude?.toFixed(6) || 'N/A'}
                      </Text>
                      <TouchableOpacity
                        style={styles.fullWidthMapButton}
                        onPress={() => openInMaps(selectedCourier.location!, selectedCourier.name)}
                      >
                        <Text style={styles.fullWidthMapButtonText}>在地图中打开</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
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
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: '#fff',
    fontSize: 24,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  refreshButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#3498db',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  locationAddress: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 4,
  },
  locationCoords: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  openMapButton: {
    backgroundColor: '#3498db',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  openMapButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  couriersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  emptyCouriers: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyCouriersText: {
    fontSize: 16,
    color: '#666',
  },
  courierCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  courierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courierInfo: {
    flex: 1,
  },
  courierName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  courierStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  courierStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  packageCount: {
    backgroundColor: '#f0f4f8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  packageCountText: {
    fontSize: 12,
    color: '#2c5282',
    fontWeight: '600',
  },
  courierLocation: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 2,
  },
  courierCoords: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  courierActions: {
    flexDirection: 'row',
    gap: 8,
  },
  mapButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  detailButton: {
    backgroundColor: '#2c5282',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  detailButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // 优化后的模态框样式
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  centeredModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#666',
  },
  modalScroll: {
    flex: 1,
  },
  infoSection: {
    marginVertical: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
    lineHeight: 20,
  },
  packageItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  packageId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c5282',
  },
  packageReceiver: {
    fontSize: 14,
    color: '#2c3e50',
    marginTop: 2,
  },
  packageAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  noPackagesText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  fullWidthMapButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  fullWidthMapButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
