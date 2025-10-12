import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { packageService, Package } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MapScreen({ navigation }: any) {
  const [location, setLocation] = useState<any>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requestLocationPermission();
    loadPackages();
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
      return {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2])
      };
    }

    // 如果没有坐标，使用 Google Geocoding API
    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=AIzaSyBLoZGBfjaywi5Nfr-aMfsOg6dL4VeSetY`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return { lat: location.lat, lng: location.lng };
      }
    } catch (error) {
      console.error('地理编码失败:', error);
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
          const distance = coords 
            ? calculateDistance(location.latitude, location.longitude, coords.lat, coords.lng)
            : 999; // 如果无法获取坐标，设置为最远
          
          // 计算优先级分数（越小越优先）
          let priorityScore = distance;
          
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

  // 导航到所有包裹地址（智能优化路线）
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

      // 3. 构建 Google Maps 导航 URL
      const origin = `${location.latitude},${location.longitude}`;
      
      if (optimizedPackages.length === 1) {
        // 只有一个包裹，直接导航
        const destination = encodeURIComponent(optimizedPackages[0].receiver_address);
        const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
        Linking.openURL(url);
      } else {
        // 多个包裹，按优化后的顺序添加途经点
        const destination = encodeURIComponent(optimizedPackages[optimizedPackages.length - 1].receiver_address);
        
        // Google Maps 最多支持9个途经点
        const waypointsLimit = Math.min(optimizedPackages.length - 1, 9);
        const waypoints = optimizedPackages.slice(0, waypointsLimit).map(pkg => 
          encodeURIComponent(pkg.receiver_address)
        ).join('|');
        
        // 使用 optimize:true 让 Google Maps 进一步优化路线
        const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
        
        console.log('🗺️ 导航 URL:', url);
        Linking.openURL(url);
      }
    } catch (error) {
      console.error('路线规划失败:', error);
      Alert.alert('错误', '路线规划失败，请重试');
    }
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
    // 显示距离信息（如果有）
    const distanceText = (item as any).distance 
      ? `📏 ${((item as any).distance as number).toFixed(1)}km` 
      : '';
    
    // 显示配送速度图标
    const speedIcon = item.delivery_speed === '急送达' ? '⚡' : 
                     item.delivery_speed === '定时达' ? '⏰' : '✓';
    
    return (
      <TouchableOpacity
        style={styles.packageCard}
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
});