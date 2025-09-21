import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import * as Location from 'expo-location';
import { riderService } from '../services/api';

export default function LocationService({ userData, isActive, onStatusChange }) {
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [uploadCount, setUploadCount] = useState(0);
  const [lastUpload, setLastUpload] = useState(null);
  const [locationWatcher, setLocationWatcher] = useState(null);
  const [uploadInterval, setUploadInterval] = useState(null);

  useEffect(() => {
    checkLocationPermission();
    
    return () => {
      stopLocationTracking();
    };
  }, []);

  useEffect(() => {
    if (isActive && locationEnabled) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [isActive, locationEnabled]);

  const checkLocationPermission = async () => {
    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            '位置权限',
            '需要位置权限才能进行实时跟踪。请在设置中开启位置权限。',
            [{ text: '确定' }]
          );
          return false;
        }
      }

      // 请求后台位置权限
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        Alert.alert(
          '后台位置权限',
          '建议开启后台位置权限，以便在应用后台运行时也能上传位置信息。',
          [{ text: '确定' }]
        );
      }

      return true;
    } catch (error) {
      console.error('检查位置权限失败:', error);
      return false;
    }
  };

  const startLocationTracking = async () => {
    try {
      console.log('🚀 开始位置跟踪');
      
      const hasPermission = await checkLocationPermission();
      if (!hasPermission) return;

      // 获取当前位置
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        speed: location.coords.speed,
        heading: location.coords.heading,
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
        console.error('获取地址失败:', error);
        locationData.address = `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`;
      }

      setCurrentLocation(locationData);

      // 开始监听位置变化
      const watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // 30秒更新一次
          distanceInterval: 50, // 移动50米更新一次
        },
        (newLocation) => {
          const newLocationData = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            accuracy: newLocation.coords.accuracy,
            speed: newLocation.coords.speed,
            heading: newLocation.coords.heading,
            timestamp: Date.now(),
          };
          
          setCurrentLocation(newLocationData);
          console.log('📍 位置更新:', newLocationData);
        }
      );

      setLocationWatcher(watcher);

      // 开始定期上传位置
      const interval = setInterval(() => {
        if (currentLocation) {
          uploadLocation(currentLocation);
        }
      }, 60000); // 每分钟上传一次

      setUploadInterval(interval);

      // 立即上传一次
      await uploadLocation(locationData);
      
      Alert.alert('位置跟踪已开启', '系统将每分钟自动上传您的位置信息');
      
    } catch (error) {
      console.error('启动位置跟踪失败:', error);
      Alert.alert('启动失败', '无法启动位置跟踪，请检查GPS设置');
    }
  };

  const stopLocationTracking = () => {
    console.log('🛑 停止位置跟踪');
    
    if (locationWatcher) {
      locationWatcher.remove();
      setLocationWatcher(null);
    }
    
    if (uploadInterval) {
      clearInterval(uploadInterval);
      setUploadInterval(null);
    }
    
    setCurrentLocation(null);
  };

  const uploadLocation = async (locationData) => {
    try {
      console.log('📤 上传位置:', locationData);
      
      const response = await riderService.updateLocation(userData.id, {
        lat: locationData.latitude,
        lng: locationData.longitude,
        address: locationData.address || `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`,
        accuracy: locationData.accuracy,
        speed: locationData.speed ? locationData.speed * 3.6 : 0, // 转换为 km/h
        heading: locationData.heading,
        deviceId: userData.id,
        batteryLevel: 85, // 模拟电池电量
      });

      if (response.success) {
        setUploadCount(prev => prev + 1);
        setLastUpload(new Date());
        console.log('✅ 位置上传成功');
      } else {
        console.error('❌ 位置上传失败:', response.message);
      }
    } catch (error) {
      console.error('❌ 位置上传错误:', error);
    }
  };

  const toggleLocationService = async (enabled) => {
    setLocationEnabled(enabled);
    
    if (onStatusChange) {
      onStatusChange(enabled);
    }
    
    if (enabled) {
      Alert.alert(
        '开启位置服务',
        '位置服务将在您上线工作时自动开始跟踪',
        [{ text: '确定' }]
      );
    } else {
      Alert.alert(
        '关闭位置服务',
        '位置跟踪已停止',
        [{ text: '确定' }]
      );
    }
  };

  const manualUpload = async () => {
    if (!currentLocation) {
      Alert.alert('提示', '请先开启位置服务');
      return;
    }
    
    await uploadLocation(currentLocation);
    Alert.alert('上传成功', '位置信息已手动上传');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📍 位置服务</Text>
        <Switch
          value={locationEnabled}
          onValueChange={toggleLocationService}
          trackColor={{ false: '#ccc', true: '#4caf50' }}
          thumbColor={locationEnabled ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>服务状态:</Text>
          <View style={[styles.statusIndicator, { 
            backgroundColor: (isActive && locationEnabled) ? '#4caf50' : '#ff9800' 
          }]}>
            <Text style={styles.statusText}>
              {(isActive && locationEnabled) ? '🟢 运行中' : '🟡 待机中'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.statusDescription}>
          {locationEnabled 
            ? (isActive 
                ? '位置跟踪运行中，每分钟自动上传位置信息' 
                : '位置服务已准备，上线后开始跟踪')
            : '位置服务已关闭'
          }
        </Text>
      </View>

      {currentLocation && (
        <View style={styles.locationCard}>
          <Text style={styles.cardTitle}>📍 当前位置</Text>
          
          <View style={styles.locationInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>坐标:</Text>
              <Text style={styles.infoValue}>
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </Text>
            </View>
            
            {currentLocation.address && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>地址:</Text>
                <Text style={styles.infoValue}>{currentLocation.address}</Text>
              </View>
            )}
            
            {currentLocation.accuracy && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>精度:</Text>
                <Text style={styles.infoValue}>±{currentLocation.accuracy.toFixed(1)}米</Text>
              </View>
            )}
            
            {currentLocation.speed && currentLocation.speed > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>速度:</Text>
                <Text style={styles.infoValue}>{(currentLocation.speed * 3.6).toFixed(1)} km/h</Text>
              </View>
            )}
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>更新时间:</Text>
              <Text style={styles.infoValue}>
                {new Date(currentLocation.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.uploadButton} onPress={manualUpload}>
            <Text style={styles.uploadButtonText}>📤 手动上传</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statsCard}>
        <Text style={styles.cardTitle}>📊 上传统计</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{uploadCount}</Text>
            <Text style={styles.statLabel}>上传次数</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {lastUpload ? lastUpload.toLocaleTimeString() : '--:--'}
            </Text>
            <Text style={styles.statLabel}>最后上传</Text>
          </View>
        </View>
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>💡 使用说明</Text>
        <Text style={styles.noteText}>• 开启位置服务后，上线工作时自动开始跟踪</Text>
        <Text style={styles.noteText}>• 系统每分钟自动上传一次位置信息</Text>
        <Text style={styles.noteText}>• 位置信息仅用于配送跟踪，严格保护隐私</Text>
        <Text style={styles.noteText}>• 建议在WiFi环境下开启，节省流量</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
    color: '#333',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  locationCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 15,
  },
  locationInfo: {
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  uploadButton: {
    backgroundColor: '#1976d2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  noteCard: {
    backgroundColor: '#e3f2fd',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1976d2',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 10,
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
});
