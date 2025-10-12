import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { packageService, Package, supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function MapScreen({ navigation }: any) {
  const [location, setLocation] = useState<any>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDeliveringPackageId, setCurrentDeliveringPackageId] = useState<string | null>(null);
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [optimizedPackagesWithCoords, setOptimizedPackagesWithCoords] = useState<any[]>([]);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    requestLocationPermission();
    loadPackages();
    loadCurrentDeliveringPackage();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限被拒绝', '需要位置权限才能使用导航功能');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (error) {
      console.error('获取位置失败:', error);
    }
  };

  const loadPackages = async () => {
    try {
      setLoading(true);
      const currentUser = await AsyncStorage.getItem('currentUserName') || '';
      const allPackages = await packageService.getAllPackages();
      
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

  // 🚚 加载当前正在配送的包裹ID
  const loadCurrentDeliveringPackage = async () => {
    try {
      const courierId = await AsyncStorage.getItem('currentCourierId');
      if (!courierId) return;

      const { data, error } = await supabase
        .from('couriers')
        .select('current_delivering_package_id')
        .eq('id', courierId)
        .single();

      if (error) {
        console.error('加载当前配送包裹失败:', error);
        return;
      }

      setCurrentDeliveringPackageId(data?.current_delivering_package_id || null);
    } catch (error) {
      console.error('加载当前配送包裹异常:', error);
    }
  };

  // 🚀 开始配送此包裹
  const startDelivering = async (packageId: string) => {
    try {
      const courierId = await AsyncStorage.getItem('currentCourierId');
      if (!courierId) {
        Alert.alert('错误', '未找到快递员ID，请重新登录');
        return;
      }

      // 更新数据库中骑手的当前配送包裹ID
      const { error } = await supabase
        .from('couriers')
        .update({ current_delivering_package_id: packageId })
        .eq('id', courierId);

      if (error) {
        console.error('更新当前配送包裹失败:', error);
        Alert.alert('错误', '开始配送失败，请重试');
        return;
      }

      // 更新包裹状态为"配送中"
      await packageService.updatePackageStatus(
        packageId,
        '配送中',
        new Date().toLocaleString('zh-CN')
      );

      setCurrentDeliveringPackageId(packageId);
      Alert.alert(
        '✅ 开始配送',
        '您已开始配送此包裹，客户现在可以实时跟踪您的位置',
        [{ text: '确定' }]
      );

      // 刷新包裹列表
      loadPackages();
    } catch (error) {
      console.error('开始配送异常:', error);
      Alert.alert('错误', '开始配送失败，请重试');
    }
  };

  // 🏁 完成配送此包裹
  const finishDelivering = async (packageId: string) => {
    try {
      const courierId = await AsyncStorage.getItem('currentCourierId');
      if (!courierId) return;

      // 清除当前配送包裹ID
      const { error } = await supabase
        .from('couriers')
        .update({ current_delivering_package_id: null })
        .eq('id', courierId);

      if (error) {
        console.error('清除当前配送包裹失败:', error);
        return;
      }

      setCurrentDeliveringPackageId(null);
      Alert.alert('提示', '配送完成，客户将无法继续跟踪您的位置');
    } catch (error) {
      console.error('完成配送异常:', error);
    }
  };

  // 导航到单个地址
  const handleNavigate = (address: string) => {
    if (!location) {
      Alert.alert('提示', '正在获取您的位置，请稍后再试');
      return;
    }

    // 使用 Google Maps Directions 从当前位置导航到目标地址
    const origin = `${location.latitude},${location.longitude}`;
    const destination = encodeURIComponent(address);
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    
    Linking.openURL(url);
  };

  // 🧮 计算两点之间的直线距离（哈弗辛公式）
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 🗺️ 解析地址中的坐标（如果有）或使用地理编码
  const parseCoordinatesFromAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    // 尝试从地址中提取坐标（某些系统会在地址中包含坐标）
    const coordMatch = address.match(/(\d+\.\d+),\s*(\d+\.\d+)/);
    if (coordMatch) {
      const coords = {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2])
      };
      console.log(`✅ 从地址中提取坐标: ${address} → ${coords.lat}, ${coords.lng}`);
      return coords;
    }

    // 如果没有坐标，使用 Google Geocoding API
    try {
      const encodedAddress = encodeURIComponent(address);
      const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&region=mm&key=AIzaSyBLoZGBfjaywi5Nfr-aMfsOg6dL4VeSetY`;
      
      console.log(`🌐 调用地理编码API: ${address.substring(0, 50)}...`);
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const coords = { lat: location.lat, lng: location.lng };
        console.log(`✅ 地理编码成功: ${address.substring(0, 30)}... → ${coords.lat}, ${coords.lng}`);
        return coords;
      } else {
        console.warn(`⚠️ 地理编码失败: ${address}`);
        console.warn(`   状态: ${data.status}, 结果数: ${data.results?.length || 0}`);
        if (data.error_message) {
          console.warn(`   错误: ${data.error_message}`);
        }
      }
    } catch (error) {
      console.error(`❌ 地理编码API错误: ${address}`, error);
    }

    return null;
  };

  // 🎯 智能路线优化算法（贪心 + 优先级）
  const optimizeDeliveryRoute = async (packagesList: Package[]): Promise<Package[]> => {
    if (!location || packagesList.length <= 1) {
      return packagesList;
    }

    try {
      // 1. 为每个包裹计算坐标和距离
      const packagesWithCoords = await Promise.all(
        packagesList.map(async (pkg) => {
          const coords = await parseCoordinatesFromAddress(pkg.receiver_address);
          let distance = null;
          
          if (coords) {
            distance = calculateDistance(location.latitude, location.longitude, coords.lat, coords.lng);
          } else {
            console.warn(`⚠️ 无法解析地址: ${pkg.receiver_address}`);
          }
          
          // 计算优先级分数（越小越优先）
          // 如果无法获取坐标，设置为最远（999）用于排序，但不显示
          let priorityScore = distance !== null ? distance : 999;
          
          // 急送达优先级最高（减少50%距离权重）
          if (pkg.delivery_speed === '急送达') {
            priorityScore *= 0.5;
          }
          // 定时达根据时间紧迫度调整
          else if (pkg.delivery_speed === '定时达' && pkg.scheduled_delivery_time) {
            const scheduledTime = new Date(pkg.scheduled_delivery_time).getTime();
            const currentTime = new Date().getTime();
            const timeLeft = scheduledTime - currentTime;
            const hoursLeft = timeLeft / (1000 * 60 * 60);
            
            // 如果剩余时间少于1小时，优先级提高
            if (hoursLeft < 1) {
              priorityScore *= 0.3;
            } else if (hoursLeft < 2) {
              priorityScore *= 0.6;
            }
          }

          return {
            ...pkg,
            coords,
            distance,
            priorityScore
          };
        })
      );

      // 2. 按优先级排序（距离近 + 紧急程度高的优先）
      const sortedPackages = packagesWithCoords.sort((a, b) => {
        return a.priorityScore - b.priorityScore;
      });

      // 3. 使用贪心算法进一步优化路线（最近邻算法）
      const optimizedRoute: Package[] = [];
      const remaining = [...sortedPackages];
      let currentLat = location.latitude;
      let currentLng = location.longitude;

      while (remaining.length > 0) {
        // 找到距离当前位置最近的包裹
        let nearestIndex = 0;
        let nearestDistance = Infinity;

        for (let i = 0; i < remaining.length; i++) {
          const pkg = remaining[i];
          if (pkg.coords) {
            const dist = calculateDistance(currentLat, currentLng, pkg.coords.lat, pkg.coords.lng);
            // 考虑优先级：急送达的包裹即使稍远也可能被选中
            const adjustedDist = pkg.delivery_speed === '急送达' ? dist * 0.7 : dist;
            
            if (adjustedDist < nearestDistance) {
              nearestDistance = adjustedDist;
              nearestIndex = i;
            }
          }
        }

        // 将最近的包裹加入路线
        const nearest = remaining.splice(nearestIndex, 1)[0];
        optimizedRoute.push(nearest);
        
        // 更新当前位置
        if (nearest.coords) {
          currentLat = nearest.coords.lat;
          currentLng = nearest.coords.lng;
        }
      }

      console.log('🎯 路线优化完成:', optimizedRoute.map(p => `${p.id} (${p.distance?.toFixed(2)}km, 优先级:${p.priorityScore?.toFixed(2)})`));
      
      return optimizedRoute;
    } catch (error) {
      console.error('路线优化失败:', error);
      // 如果优化失败，返回原始列表
      return packagesList;
    }
  };

  // 导航到所有包裹地址（智能优化路线 + 地图预览）
  const handleNavigateAll = async () => {
    if (packages.length === 0) {
      Alert.alert('提示', '暂无待配送包裹');
      return;
    }

    if (!location) {
      Alert.alert('提示', '正在获取您的位置，请稍后再试');
      return;
    }

    // 显示加载提示
    Alert.alert('🔄 路线规划中...', '正在为您优化最佳配送路线，请稍候');

    try {
      // 1. 智能优化路线
      const optimizedPackages = await optimizeDeliveryRoute(packages);
      
      // 2. 更新包裹列表显示（按优化后的顺序）
      setPackages(optimizedPackages);

      // 3. 保存带坐标的优化包裹数据
      setOptimizedPackagesWithCoords(optimizedPackages);

      // 4. 显示地图预览（带数字标记 1,2,3,4）
      setShowMapPreview(true);
    } catch (error) {
      console.error('路线规划失败:', error);
      Alert.alert('错误', '路线规划失败，请重试');
    }
  };

  // 🚀 跳转到Google Maps导航
  const openGoogleMapsNavigation = () => {
    if (!location || optimizedPackagesWithCoords.length === 0) return;

    const origin = `${location.latitude},${location.longitude}`;
    
    if (optimizedPackagesWithCoords.length === 1) {
      const destination = encodeURIComponent(optimizedPackagesWithCoords[0].receiver_address);
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
      Linking.openURL(url);
    } else {
      const destination = encodeURIComponent(optimizedPackagesWithCoords[optimizedPackagesWithCoords.length - 1].receiver_address);
      const waypointsLimit = Math.min(optimizedPackagesWithCoords.length - 1, 9);
      const waypoints = optimizedPackagesWithCoords.slice(0, waypointsLimit).map(pkg => 
        encodeURIComponent(pkg.receiver_address)
      ).join('|');
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
      Linking.openURL(url);
    }
    
    // 关闭地图预览
    setShowMapPreview(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待取件': return '#f39c12';
      case '已取件': return '#3498db';
      case '配送中': return '#9b59b6';
      default: return '#95a5a6';
    }
  };

  const renderPackageItem = ({ item, index }: { item: Package, index: number }) => {
    // 显示距离信息（如果有且有效）
    const itemDistance = (item as any).distance;
    const distanceText = itemDistance !== null && itemDistance !== undefined && itemDistance !== 999
      ? `📏 ${itemDistance.toFixed(1)}km` 
      : '';
    
    // 显示配送速度图标
    const speedIcon = item.delivery_speed === '急送达' ? '⚡' : 
                     item.delivery_speed === '定时达' ? '⏰' : '✓';
    
    // 判断是否为当前配送的包裹
    const isCurrentDelivering = currentDeliveringPackageId === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.packageCard,
          isCurrentDelivering && styles.currentDeliveringCard
        ]}
        onPress={() => navigation.navigate('PackageDetail', { package: item })}
      >
        <View style={[styles.numberBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.numberText}>{index + 1}</Text>
        </View>
        
        <View style={styles.packageInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.packageId}>{item.id}</Text>
            {item.delivery_speed && (
              <View style={styles.speedBadge}>
                <Text style={styles.speedIcon}>{speedIcon}</Text>
                <Text style={styles.speedText}>{item.delivery_speed}</Text>
              </View>
            )}
            {isCurrentDelivering && (
              <View style={styles.deliveringBadge}>
                <Text style={styles.deliveringText}>🚚 配送中</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.receiverName}>📍 {item.receiver_name}</Text>
          <Text style={styles.address} numberOfLines={2}>{item.receiver_address}</Text>
          
          <View style={styles.packageMeta}>
            <View style={[styles.statusTag, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
            <Text style={styles.packageType}>{item.package_type} · {item.weight}</Text>
            {distanceText && (
              <Text style={styles.distanceText}>{distanceText}</Text>
            )}
          </View>

          {/* 开始/结束配送按钮 */}
          {item.status === '已取件' || item.status === '配送中' ? (
            <View style={styles.deliveryActions}>
              {!isCurrentDelivering ? (
                <TouchableOpacity 
                  style={styles.startDeliveryButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    startDelivering(item.id);
                  }}
                >
                  <Text style={styles.startDeliveryText}>🚀 开始配送</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.finishDeliveryButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    finishDelivering(item.id);
                  }}
                >
                  <Text style={styles.finishDeliveryText}>🏁 完成配送</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={(e) => {
            e.stopPropagation();
            handleNavigate(item.receiver_address);
          }}
        >
          <Text style={styles.navButtonText}>🗺️</Text>
          <Text style={styles.navButtonLabel}>导航</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🗺️ 配送路线</Text>
        <TouchableOpacity onPress={loadPackages} style={styles.refreshButton}>
          <Text style={styles.refreshText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {location && (
        <View style={styles.locationCard}>
          <Text style={styles.locationIcon}>📍</Text>
          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>我的位置</Text>
            <Text style={styles.locationCoords}>
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.navigateAllButton, packages.length === 0 && styles.navigateAllButtonDisabled]}
            onPress={handleNavigateAll}
            disabled={packages.length === 0}
          >
            <Text style={styles.navigateAllIcon}>🧭</Text>
            <Text style={styles.navigateAllText}>
              {packages.length > 0 ? `规划路线 (${packages.length}站)` : '暂无任务'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>
          📦 配送顺序 ({packages.length})
        </Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2c5282" />
          </View>
        ) : packages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>暂无待配送包裹</Text>
          </View>
        ) : (
          <FlatList
            data={packages}
            renderItem={renderPackageItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      {/* 🗺️ 地图预览Modal（显示数字标记 1,2,3,4） */}
      <Modal
        visible={showMapPreview}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowMapPreview(false)}
      >
        <View style={styles.mapModalContainer}>
          {/* 地图标题栏 */}
          <View style={styles.mapModalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowMapPreview(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.mapModalTitle}>📍 配送路线预览</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* 地图视图 */}
          {location && optimizedPackagesWithCoords.length > 0 && (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }}
            >
              {/* 骑手当前位置标记（绿色圆点） */}
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title="我的位置"
                description="骑手当前位置"
              >
                <View style={styles.courierMarker}>
                  <Text style={styles.courierMarkerText}>🏍️</Text>
                </View>
              </Marker>

              {/* 包裹目的地标记（数字 1,2,3,4） */}
              {optimizedPackagesWithCoords.map((pkg: any, index: number) => {
                if (!pkg.coords) return null;
                return (
                  <Marker
                    key={pkg.id}
                    coordinate={{
                      latitude: pkg.coords.lat,
                      longitude: pkg.coords.lng,
                    }}
                    title={`${index + 1}. ${pkg.receiver_name}`}
                    description={pkg.receiver_address}
                  >
                    <View style={styles.packageMarker}>
                      <Text style={styles.packageMarkerNumber}>{index + 1}</Text>
                    </View>
                  </Marker>
                );
              })}

              {/* 路线连线 */}
              {location && optimizedPackagesWithCoords.length > 0 && (
                <Polyline
                  coordinates={[
                    { latitude: location.latitude, longitude: location.longitude },
                    ...optimizedPackagesWithCoords
                      .filter((pkg: any) => pkg.coords)
                      .map((pkg: any) => ({
                        latitude: pkg.coords.lat,
                        longitude: pkg.coords.lng,
                      })),
                  ]}
                  strokeColor="#3182ce"
                  strokeWidth={3}
                  lineDashPattern={[5, 5]}
                />
              )}
            </MapView>
          )}

          {/* 底部操作按钮 */}
          <View style={styles.mapModalFooter}>
            <TouchableOpacity 
              style={styles.startNavigationButton}
              onPress={openGoogleMapsNavigation}
            >
              <Text style={styles.startNavigationText}>🚀 开始导航</Text>
            </TouchableOpacity>
          </View>

          {/* 配送顺序列表 */}
          <View style={styles.routeList}>
            <Text style={styles.routeListTitle}>配送顺序：</Text>
            {optimizedPackagesWithCoords.map((pkg: any, index: number) => (
              <View key={pkg.id} style={styles.routeListItem}>
                <View style={styles.routeNumber}>
                  <Text style={styles.routeNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeName}>{pkg.receiver_name}</Text>
                  <Text style={styles.routeDistance}>
                    {pkg.distance !== null && pkg.distance !== 999
                      ? `📏 ${pkg.distance.toFixed(1)}km`
                      : '📍 地址待确认'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  refreshButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 20,
  },
  locationCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  locationCoords: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  navigateAllButton: {
    backgroundColor: '#3182ce',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navigateAllButtonDisabled: {
    backgroundColor: '#cbd5e0',
  },
  navigateAllIcon: {
    fontSize: 16,
  },
  navigateAllText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  numberBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  numberText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  packageInfo: {
    flex: 1,
  },
  packageId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 4,
  },
  receiverName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  packageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  packageType: {
    fontSize: 12,
    color: '#999',
  },
  speedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
    gap: 4,
  },
  speedIcon: {
    fontSize: 12,
  },
  speedText: {
    fontSize: 11,
    color: '#856404',
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  currentDeliveringCard: {
    borderWidth: 2,
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  deliveringBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  deliveringText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  deliveryActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  startDeliveryButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  startDeliveryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  finishDeliveryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  finishDeliveryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  navButton: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3182ce',
    borderRadius: 12,
    paddingVertical: 10,
  },
  navButtonText: {
    fontSize: 24,
  },
  navButtonLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
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
  // 🗺️ 地图预览Modal样式
  mapModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapModalHeader: {
    backgroundColor: '#2c5282',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  mapModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  map: {
    width: width,
    height: height * 0.5,
  },
  courierMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  courierMarkerText: {
    fontSize: 20,
  },
  packageMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3182ce',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  packageMarkerNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapModalFooter: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  startNavigationButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startNavigationText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  routeList: {
    flex: 1,
    backgroundColor: '#f7fafc',
    padding: 16,
  },
  routeListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  routeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  routeNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3182ce',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  routeNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  routeDistance: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
});