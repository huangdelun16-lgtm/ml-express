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

  const handleNavigate = (address: string) => {
    const encoded = encodeURIComponent(address);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
  };

  const handleNavigateAll = () => {
    if (packages.length === 0) return;
    const firstAddress = packages[0].receiver_address;
    const encoded = encodeURIComponent(firstAddress);
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待取件': return '#f39c12';
      case '已取件': return '#3498db';
      case '配送中': return '#9b59b6';
      default: return '#95a5a6';
    }
  };

  const renderPackageItem = ({ item, index }: { item: Package, index: number }) => (
    <TouchableOpacity
      style={styles.packageCard}
      onPress={() => navigation.navigate('PackageDetail', { package: item })}
    >
      <View style={[styles.numberBadge, { backgroundColor: getStatusColor(item.status) }]}>
        <Text style={styles.numberText}>{index + 1}</Text>
      </View>
      
      <View style={styles.packageInfo}>
        <Text style={styles.packageId}>{item.id}</Text>
        <Text style={styles.receiverName}>📍 {item.receiver_name}</Text>
        <Text style={styles.address} numberOfLines={2}>{item.receiver_address}</Text>
        
        <View style={styles.packageMeta}>
          <View style={[styles.statusTag, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <Text style={styles.packageType}>{item.package_type} · {item.weight}</Text>
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
            style={styles.navigateAllButton}
            onPress={handleNavigateAll}
          >
            <Text style={styles.navigateAllText}>开始导航</Text>
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