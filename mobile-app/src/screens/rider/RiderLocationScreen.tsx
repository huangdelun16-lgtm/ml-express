import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Switch,
  Divider,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { riderService } from '../../services/api';
import { colors } from '../../theme/theme';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  address?: string;
  timestamp: number;
}

export default function RiderLocationScreen() {
  const { user } = useAuth();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationStatus, setLocationStatus] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped');
  const [uploadCount, setUploadCount] = useState(0);
  const [lastUploadTime, setLastUploadTime] = useState<Date | null>(null);

  let locationSubscription: Location.LocationSubscription | null = null;
  let uploadInterval: NodeJS.Timeout | null = null;

  useEffect(() => {
    checkLocationPermission();
    
    return () => {
      stopLocationTracking();
    };
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            '位置权限',
            '需要位置权限才能进行实时跟踪。请在设置中开启位置权限。'
          );
          return;
        }
      }

      // 检查后台位置权限
      if (Platform.OS === 'android') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          Alert.alert(
            '后台位置权限',
            '建议开启后台位置权限，以便在应用后台运行时也能上传位置信息。'
          );
        }
      }
    } catch (error) {
      console.error('检查位置权限失败:', error);
    }
  };

  const startLocationTracking = async () => {
    try {
      setLocationStatus('starting');
      
      // 获取当前位置
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        speed: location.coords.speed || undefined,
        heading: location.coords.heading || undefined,
        timestamp: Date.now(),
      };

      // 获取地址信息
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        });
        
        if (addresses.length > 0) {
          const address = addresses[0];
          locationData.address = `${address.district || ''} ${address.street || ''} ${address.name || ''}`.trim();
        }
      } catch (error) {
        console.error('获取地址信息失败:', error);
        locationData.address = `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`;
      }

      setCurrentLocation(locationData);
      
      // 开始监听位置变化
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // 30秒更新一次
          distanceInterval: 50, // 移动50米更新一次
        },
        (location) => {
          const newLocationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            speed: location.coords.speed || undefined,
            heading: location.coords.heading || undefined,
            timestamp: Date.now(),
          };
          
          setCurrentLocation(newLocationData);
        }
      );

      // 开始定期上传位置
      uploadInterval = setInterval(() => {
        if (currentLocation) {
          uploadLocation(currentLocation);
        }
      }, 60000); // 每分钟上传一次

      // 立即上传一次
      await uploadLocation(locationData);
      
      setLocationStatus('running');
      setLocationEnabled(true);
      
    } catch (error) {
      console.error('启动位置跟踪失败:', error);
      setLocationStatus('error');
      Alert.alert('启动失败', '无法启动位置跟踪，请检查GPS设置');
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }
    
    if (uploadInterval) {
      clearInterval(uploadInterval);
      uploadInterval = null;
    }
    
    setLocationStatus('stopped');
    setLocationEnabled(false);
  };

  const uploadLocation = async (locationData: LocationData) => {
    try {
      const response = await riderService.updateLocation(user?.id || '', {
        lat: locationData.latitude,
        lng: locationData.longitude,
        address: locationData.address || `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`,
        accuracy: locationData.accuracy,
        speed: locationData.speed ? locationData.speed * 3.6 : undefined, // 转换为 km/h
        heading: locationData.heading,
        deviceId: user?.id,
      });

      if (response.success) {
        setUploadCount(prev => prev + 1);
        setLastUploadTime(new Date());
      } else {
        console.error('上传位置失败:', response.message);
      }
    } catch (error) {
      console.error('上传位置失败:', error);
    }
  };

  const toggleLocationTracking = () => {
    if (locationEnabled) {
      Alert.alert(
        '停止位置跟踪',
        '确定要停止位置跟踪吗？这将影响订单派送的实时监控。',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '确定',
            onPress: stopLocationTracking,
            style: 'destructive'
          }
        ]
      );
    } else {
      startLocationTracking();
    }
  };

  const getStatusText = () => {
    switch (locationStatus) {
      case 'stopped':
        return '已停止';
      case 'starting':
        return '启动中...';
      case 'running':
        return '运行中';
      case 'error':
        return '错误';
      default:
        return '未知';
    }
  };

  const getStatusColor = () => {
    switch (locationStatus) {
      case 'running':
        return colors.success;
      case 'starting':
        return colors.warning;
      case 'error':
        return colors.error;
      default:
        return colors.gray;
    }
  };

  return (
    <View style={styles.container}>
      {/* 位置服务状态 */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <Title style={styles.cardTitle}>位置服务</Title>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor() }]}
              textStyle={{ color: colors.white }}
            >
              {getStatusText()}
            </Chip>
          </View>
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>启用实时位置跟踪</Text>
            <Switch
              value={locationEnabled}
              onValueChange={toggleLocationTracking}
              disabled={locationStatus === 'starting'}
            />
          </View>
          
          <Text style={styles.description}>
            开启后，您的位置信息将实时上传到调度中心，便于管理员跟踪配送进度。
          </Text>
        </Card.Content>
      </Card>

      {/* 当前位置信息 */}
      {currentLocation && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>当前位置</Title>
            
            <View style={styles.locationInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>📍 坐标:</Text>
                <Text style={styles.infoValue}>
                  {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </Text>
              </View>
              
              {currentLocation.address && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>🏠 地址:</Text>
                  <Text style={styles.infoValue}>{currentLocation.address}</Text>
                </View>
              )}
              
              {currentLocation.accuracy && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>🎯 精度:</Text>
                  <Text style={styles.infoValue}>±{currentLocation.accuracy.toFixed(1)}米</Text>
                </View>
              )}
              
              {currentLocation.speed && currentLocation.speed > 0 && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>🚀 速度:</Text>
                  <Text style={styles.infoValue}>{(currentLocation.speed * 3.6).toFixed(1)} km/h</Text>
                </View>
              )}
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>⏰ 更新时间:</Text>
                <Text style={styles.infoValue}>
                  {new Date(currentLocation.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* 上传统计 */}
      {locationEnabled && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>上传统计</Title>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{uploadCount}</Text>
                <Text style={styles.statLabel}>上传次数</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {lastUploadTime ? lastUploadTime.toLocaleTimeString() : '--'}
                </Text>
                <Text style={styles.statLabel}>最后上传</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* 注意事项 */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>注意事项</Title>
          
          <Text style={styles.noteText}>
            • 位置跟踪会消耗电池电量，建议在工作时间开启
          </Text>
          <Text style={styles.noteText}>
            • 确保手机GPS功能已开启
          </Text>
          <Text style={styles.noteText}>
            • 在室内或信号不好的地方可能影响定位精度
          </Text>
          <Text style={styles.noteText}>
            • 位置信息仅用于配送跟踪，严格保护隐私
          </Text>
        </Card.Content>
      </Card>

      {locationStatus === 'starting' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>正在启动位置服务...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statusChip: {
    borderRadius: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: colors.dark,
  },
  description: {
    fontSize: 14,
    color: colors.gray,
    lineHeight: 20,
  },
  locationInfo: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 14,
    color: colors.primary,
    width: 80,
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 14,
    color: colors.dark,
    flex: 1,
    flexWrap: 'wrap',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 4,
  },
  noteText: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 8,
    lineHeight: 20,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white,
    fontSize: 16,
    marginTop: 16,
  },
});
