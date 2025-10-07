import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Image,
  Linking
} from 'react-native';
import { packageService } from '../services/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Package {
  id: string;
  sender_name: string;
  sender_phone: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  package_type: string;
  weight: number;
  description: string;
  estimated_cost: number;
  status: string;
  courier: string;
  created_at: string;
  pickup_time?: string;
  delivery_time?: string;
}

const MyTasksScreen: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [groupedPackages, setGroupedPackages] = useState<{[key: string]: Package[]}>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // 新增状态
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // 扫码相关状态
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const scannedOnce = useRef(false); // 跟踪是否已经扫描过一次

  // 当前骑手信息状态
  const [currentCourierName, setCurrentCourierName] = useState('');
  const [currentCourierId, setCurrentCourierId] = useState('');
  
  // 日期过滤状态
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  // 按日期分组包裹
  const groupPackagesByDate = (packages: Package[]) => {
    const grouped: {[key: string]: Package[]} = {};
    
    packages.forEach(pkg => {
      let dateKey = '';
      
      try {
        if (pkg.delivery_time) {
          // 如果有送达时间，按送达时间分组
          const deliveryDate = new Date(pkg.delivery_time);
          if (!isNaN(deliveryDate.getTime())) {
            dateKey = deliveryDate.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
          }
        } else if (pkg.pickup_time) {
          // 如果有取件时间，按取件时间分组
          const pickupDate = new Date(pkg.pickup_time);
          if (!isNaN(pickupDate.getTime())) {
            dateKey = pickupDate.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
          }
        } else if (pkg.created_at) {
          // 否则按创建时间分组
          const createDate = new Date(pkg.created_at);
          if (!isNaN(createDate.getTime())) {
            dateKey = createDate.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
          }
        }
        
        // 如果日期解析失败，使用默认日期
        if (!dateKey) {
          dateKey = '未知日期';
        }
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(pkg);
      } catch (error) {
        console.error('日期解析错误:', error, pkg);
        // 使用默认分组
        const defaultKey = '未知日期';
        if (!grouped[defaultKey]) {
          grouped[defaultKey] = [];
        }
        grouped[defaultKey].push(pkg);
      }
    });
    
    // 按日期排序（最新的在前）
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === '未知日期') return 1;
      if (b === '未知日期') return -1;
      
      try {
        const dateA = new Date(a.replace(/\//g, '-'));
        const dateB = new Date(b.replace(/\//g, '-'));
        return dateB.getTime() - dateA.getTime();
      } catch (error) {
        return 0;
      }
    });
    
    const sortedGrouped: {[key: string]: Package[]} = {};
    sortedKeys.forEach(key => {
      sortedGrouped[key] = grouped[key];
    });
    
    return sortedGrouped;
  };

  useEffect(() => {
    loadMyPackages();
    loadCurrentCourierInfo();
  }, []);

  const loadCurrentCourierInfo = async () => {
    try {
      const userName = await AsyncStorage.getItem('currentUserName') || '';
      const userId = await AsyncStorage.getItem('currentUser') || '';
      setCurrentCourierName(userName);
      setCurrentCourierId(userId);
    } catch (error) {
      console.error('加载骑手信息失败:', error);
    }
  };

  const loadMyPackages = async () => {
    try {
      setLoading(true);
      const allPackages = await packageService.getAllPackages();
      
      // 获取当前骑手信息
      const userName = await AsyncStorage.getItem('currentUserName') || '';
      
      // 过滤出分配给当前骑手的包裹（包括已送达的包裹）
      const myPackages = allPackages.filter(pkg => 
        pkg.courier === userName && 
        (pkg.status === '已取件' || pkg.status === '配送中' || pkg.status === '配送进行中' || pkg.status === '已送达')
      );
      
      setPackages(myPackages);
      
      // 按日期分组包裹
      const grouped = groupPackagesByDate(myPackages);
      setGroupedPackages(grouped);
      
      // 更新可用日期列表
      const dates = Object.keys(grouped).sort((a, b) => {
        if (a === '未知日期') return 1;
        if (b === '未知日期') return -1;
        try {
          const dateA = new Date(a.replace(/\//g, '-'));
          const dateB = new Date(b.replace(/\//g, '-'));
          return dateB.getTime() - dateA.getTime();
        } catch (error) {
          return 0;
        }
      });
      setAvailableDates(dates);
    } catch (error) {
      console.error('加载我的任务失败:', error);
      Alert.alert('加载失败', '无法加载任务列表，请重试');
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
      case '已取件':
        return '#27ae60';
      case '配送中':
      case '配送进行中':
        return '#f39c12';
      case '已送达':
        return '#3498db';
      case '已取消':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case '已取件':
        return '已取件';
      case '配送中':
      case '配送进行中':
        return '配送中';
      case '已送达':
        return '已送达';
      case '已取消':
        return '已取消';
      default:
        return '未知状态';
    }
  };

  const handlePackagePress = (packageItem: Package) => {
    setSelectedPackage(packageItem);
    setShowDetailModal(true);
  };

  // 新增功能处理函数
  const handleCall = () => {
    if (selectedPackage) {
      Linking.openURL(`tel:${selectedPackage.receiver_phone}`);
    }
  };

  const handleNavigate = () => {
    if (selectedPackage) {
      const address = encodeURIComponent(selectedPackage.receiver_address);
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
    }
  };

  const handleShowAddress = () => {
    setShowAddressModal(true);
  };

  const handleOpenCamera = async () => {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        Alert.alert('权限不足', '需要相机权限才能拍照');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedPhoto(result.assets[0].uri);
        setShowPhotoModal(true);
        setShowCameraModal(false);
      }
    } catch (error) {
      console.error('相机错误:', error);
      Alert.alert('错误', '无法打开相机');
    }
  };

  const handleUploadPhoto = async () => {
    if (!capturedPhoto) {
      Alert.alert('提示', '请先拍照');
      return;
    }

    try {
      setUploadingPhoto(true);

      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (locationPermission.status !== 'granted') {
        Alert.alert('权限不足', '需要位置权限才能记录配送位置');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const mediaPermission = await MediaLibrary.requestPermissionsAsync();
      if (mediaPermission.status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(capturedPhoto);
      }

      const deliveryProof = {
        packageId: selectedPackage?.id,
        photoUri: capturedPhoto,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
        courier: currentCourierName,
      };

      console.log('配送证明记录:', deliveryProof);

      // 上传照片成功后，自动更新包裹状态为"已送达"
      if (selectedPackage) {
        const userName = await AsyncStorage.getItem('currentUserName') || '未知骑手';
        
        const success = await packageService.updatePackageStatus(
          selectedPackage.id,
          '已送达',
          undefined, // pickupTime
          new Date().toISOString(), // deliveryTime
          userName
        );

        if (success) {
          Alert.alert(
            '配送完成！',
            `包裹已成功送达\n\n📦 包裹编号：${selectedPackage.id}\n📸 配送照片已保存\n📍 位置：${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n⏰ 送达时间：${new Date().toLocaleString('zh-CN')}\n\n包裹状态已更新为"已送达"`,
            [
              {
                text: '确定',
                onPress: async () => {
                  setShowPhotoModal(false);
                  setCapturedPhoto(null);
                  // 刷新任务列表
                  await loadMyPackages();
                }
              }
            ]
          );
        } else {
          Alert.alert(
            '照片上传成功',
            `配送证明已记录\n位置: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n时间: ${new Date().toLocaleString('zh-CN')}\n\n但包裹状态更新失败，请手动更新`,
            [
              {
                text: '确定',
                onPress: () => {
                  setShowPhotoModal(false);
                  setCapturedPhoto(null);
                }
              }
            ]
          );
        }
      }

    } catch (error) {
      console.error('上传照片失败:', error);
      Alert.alert('上传失败', '网络错误，请重试');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // 扫码功能处理函数
  const handleScanCode = (data: string) => {
    // 如果已经扫描过一次，直接返回，避免重复扫描
    if (scannedOnce.current) {
      return;
    }
    
    // 标记已经扫描过一次
    scannedOnce.current = true;
    
    setScannedData(data);
    setScanning(false);
    setShowScanModal(false);
    
    // 检查是否是店长收件码
    if (data.startsWith('STORE_')) {
      // 解析店长收件码
      const storeInfo = data.replace('STORE_', '');
      const [storeId, storeName] = storeInfo.split('_');
      
      Alert.alert(
        '✅ 已送达',
        `包裹已成功送达至：\n\n🏪 店铺：${storeName}\n📦 包裹ID：${selectedPackage?.id}\n⏰ 送达时间：${new Date().toLocaleString('zh-CN')}\n\n配送任务已完成！`,
        [
          {
            text: '确定',
            onPress: async () => {
              try {
                // 更新包裹状态为"已送达"
                if (selectedPackage) {
                  const userName = await AsyncStorage.getItem('currentUserName') || '未知骑手';
                  await packageService.updatePackageStatus(
                    selectedPackage.id, 
                    '已送达',
                    undefined, // pickupTime
                    new Date().toISOString(), // deliveryTime
                    userName
                  );
                  
                  // 刷新任务列表
                  await loadMyPackages();
                  
                  console.log('包裹状态已更新为已送达:', selectedPackage.id);
                }
              } catch (error) {
                console.error('更新包裹状态失败:', error);
                Alert.alert('错误', '更新包裹状态失败，请重试');
              }
            }
          }
        ]
      );
    } else {
      // 处理其他类型的扫码结果
      Alert.alert(
        '扫码成功',
        `扫描结果: ${data}`,
        [
          {
            text: '确定',
            onPress: () => {
              console.log('扫码结果:', data);
            }
          }
        ]
      );
    }
  };

  const handleStartScan = () => {
    setScanning(true);
    setScannedData(null);
    scannedOnce.current = false; // 重置扫描状态，允许新的扫描
  };

  const handleStopScan = () => {
    setScanning(false);
    setShowScanModal(false);
    scannedOnce.current = false; // 重置扫描状态，为下次扫描做准备
  };

  const renderPackageItem = ({ item }: { item: Package }) => (
    <TouchableOpacity
      style={styles.packageCard}
      onPress={() => handlePackagePress(item)}
    >
      <View style={styles.packageHeader}>
        <Text style={styles.packageId}>{item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <View style={styles.packageInfo}>
        <Text style={styles.infoLabel}>收件人：</Text>
        <Text style={styles.infoValue}>{item.receiver_name}</Text>
      </View>
      
      <View style={styles.packageInfo}>
        <Text style={styles.infoLabel}>收件地址：</Text>
        <Text style={styles.infoValue}>{item.receiver_address}</Text>
      </View>
      
      <View style={styles.packageInfo}>
        <Text style={styles.infoLabel}>包裹类型：</Text>
        <Text style={styles.infoValue}>{item.package_type}</Text>
      </View>
      
      <View style={styles.packageInfo}>
        <Text style={styles.infoLabel}>重量：</Text>
        <Text style={styles.infoValue}>{item.weight}kg</Text>
      </View>
      
      <View style={styles.packageInfo}>
        <Text style={styles.infoLabel}>预估费用：</Text>
        <Text style={styles.infoValue}>¥{item.estimated_cost}</Text>
      </View>
      
      {item.pickup_time && (
        <View style={styles.packageInfo}>
          <Text style={styles.infoLabel}>取件时间：</Text>
          <Text style={styles.infoValue}>{item.pickup_time}</Text>
        </View>
      )}
      
      {item.delivery_time && (
        <View style={styles.packageInfo}>
          <Text style={styles.infoLabel}>送达时间：</Text>
          <Text style={styles.infoValue}>{item.delivery_time}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderDetailModal = () => {
    if (!selectedPackage) return null;

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>包裹详情</Text>
            <TouchableOpacity
              onPress={() => setShowDetailModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>包裹信息</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>包裹编号：</Text>
                <Text style={styles.detailValue}>{selectedPackage.id}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>包裹类型：</Text>
                <Text style={styles.detailValue}>{selectedPackage.package_type}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>重量：</Text>
                <Text style={styles.detailValue}>{selectedPackage.weight}kg</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>描述：</Text>
                <Text style={styles.detailValue}>{selectedPackage.description}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>预估费用：</Text>
                <Text style={styles.detailValue}>¥{selectedPackage.estimated_cost}</Text>
              </View>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>寄件人信息</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>姓名：</Text>
                <Text style={styles.detailValue}>{selectedPackage.sender_name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>电话：</Text>
                <Text style={styles.detailValue}>{selectedPackage.sender_phone}</Text>
              </View>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>收件人信息</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>姓名：</Text>
                <Text style={styles.detailValue}>{selectedPackage.receiver_name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>电话：</Text>
                <Text style={styles.detailValue}>{selectedPackage.receiver_phone}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>地址：</Text>
                <Text style={styles.detailValue}>{selectedPackage.receiver_address}</Text>
              </View>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>配送信息</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>状态：</Text>
                <Text style={[styles.detailValue, { color: getStatusColor(selectedPackage.status) }]}>
                  {getStatusText(selectedPackage.status)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>负责骑手：</Text>
                <Text style={styles.detailValue}>{selectedPackage.courier}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>创建时间：</Text>
                <Text style={styles.detailValue}>{selectedPackage.created_at}</Text>
              </View>
              {selectedPackage.pickup_time && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>取件时间：</Text>
                  <Text style={styles.detailValue}>{selectedPackage.pickup_time}</Text>
                </View>
              )}
              {selectedPackage.delivery_time && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>送达时间：</Text>
                  <Text style={styles.detailValue}>{selectedPackage.delivery_time}</Text>
                </View>
              )}
            </View>
            
            {/* 新增功能按钮 */}
            <View style={styles.newActionsContainer}>
              <TouchableOpacity style={styles.newActionButton} onPress={handleShowAddress}>
                <Text style={styles.newActionButtonText}>📍 送货地址</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.newActionButton} onPress={() => setShowCameraModal(true)}>
                <Text style={styles.newActionButtonText}>📷 摄像机</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.newActionButton} onPress={() => setShowPhotoModal(true)}>
                <Text style={styles.newActionButtonText}>📸 上传照片</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>我的任务</Text>
          <Text style={styles.headerSubtitle}>当前骑手：{currentCourierName || '加载中...'}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              📅 日期
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Text style={styles.refreshButtonText}>
              {refreshing ? '🔄' : '🔄'} 刷新
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {packages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>暂无任务</Text>
          <Text style={styles.emptySubtitle}>您当前没有分配的包裹任务</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* 显示选中的日期过滤 */}
          {selectedDate && (
            <View style={styles.filterInfo}>
              <Text style={styles.filterText}>
                显示日期：{selectedDate} ({groupedPackages[selectedDate]?.length || 0} 个包裹)
              </Text>
              <TouchableOpacity 
                style={styles.clearFilterButton}
                onPress={() => setSelectedDate(null)}
              >
                <Text style={styles.clearFilterText}>清除过滤</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {(selectedDate ? [selectedDate] : Object.keys(groupedPackages)).map((dateKey) => {
            if (!groupedPackages[dateKey]) return null;
            
            return (
              <View key={dateKey} style={styles.dateSection}>
                <View style={styles.dateHeader}>
                  <Text style={styles.dateTitle}>{dateKey}</Text>
                  <Text style={styles.dateSubtitle}>
                    {groupedPackages[dateKey].length} 个包裹
                  </Text>
                </View>
                
                {groupedPackages[dateKey].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.packageCard}
                    onPress={() => handlePackagePress(item)}
                  >
                    <View style={styles.packageHeader}>
                      <Text style={styles.packageId}>{item.id}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.packageInfo}>
                      <Text style={styles.infoLabel}>收件人：</Text>
                      <Text style={styles.infoValue}>{item.receiver_name}</Text>
                    </View>
                    
                    <View style={styles.packageInfo}>
                      <Text style={styles.infoLabel}>收件地址：</Text>
                      <Text style={styles.infoValue}>{item.receiver_address}</Text>
                    </View>
                    
                    <View style={styles.packageInfo}>
                      <Text style={styles.infoLabel}>包裹类型：</Text>
                      <Text style={styles.infoValue}>{item.package_type}</Text>
                    </View>
                    
                    <View style={styles.packageInfo}>
                      <Text style={styles.infoLabel}>重量：</Text>
                      <Text style={styles.infoValue}>{item.weight}kg</Text>
                    </View>
                    
                    {item.delivery_time && (
                      <View style={styles.packageInfo}>
                        <Text style={styles.infoLabel}>送达时间：</Text>
                        <Text style={styles.infoValue}>
                          {new Date(item.delivery_time).toLocaleString('zh-CN')}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}

      {showDetailModal && renderDetailModal()}
      
      {/* 日期选择器模态框 */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📅 选择日期</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.dateList}>
              <TouchableOpacity
                style={[
                  styles.dateItem,
                  !selectedDate && styles.selectedDateItem
                ]}
                onPress={() => {
                  setSelectedDate(null);
                  setShowDatePicker(false);
                }}
              >
                <Text style={[
                  styles.dateItemText,
                  !selectedDate && styles.selectedDateItemText
                ]}>
                  全部日期
                </Text>
                <Text style={[
                  styles.dateItemCount,
                  !selectedDate && styles.selectedDateItemCount
                ]}>
                  {packages.length} 个包裹
                </Text>
              </TouchableOpacity>
              
              {availableDates.map((date) => (
                <TouchableOpacity
                  key={date}
                  style={[
                    styles.dateItem,
                    selectedDate === date && styles.selectedDateItem
                  ]}
                  onPress={() => {
                    setSelectedDate(date);
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={[
                    styles.dateItemText,
                    selectedDate === date && styles.selectedDateItemText
                  ]}>
                    {date}
                  </Text>
                  <Text style={[
                    styles.dateItemCount,
                    selectedDate === date && styles.selectedDateItemCount
                  ]}>
                    {groupedPackages[date]?.length || 0} 个包裹
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* 送货地址模态框 */}
      <Modal
        visible={showAddressModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📍 送货地址</Text>
              <TouchableOpacity
                onPress={() => setShowAddressModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.addressContent}>
              <Text style={styles.addressLabel}>收件人：</Text>
              <Text style={styles.addressValue}>{selectedPackage?.receiver_name}</Text>
              
              <Text style={styles.addressLabel}>联系电话：</Text>
              <Text style={styles.addressValue}>{selectedPackage?.receiver_phone}</Text>
              
              <Text style={styles.addressLabel}>详细地址：</Text>
              <Text style={styles.addressDetail}>{selectedPackage?.receiver_address}</Text>
              
              <View style={styles.addressActions}>
                <TouchableOpacity style={styles.addressActionButton} onPress={handleCall}>
                  <Text style={styles.addressActionText}>📞 拨打电话</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.addressActionButton} onPress={handleNavigate}>
                  <Text style={styles.addressActionText}>🗺️ 导航前往</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 摄像机模态框 */}
      <Modal
        visible={showCameraModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCameraModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📷 拍照功能</Text>
              <TouchableOpacity
                onPress={() => setShowCameraModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.cameraContent}>
              <Text style={styles.cameraInstruction}>
                选择功能：拍照或扫码
              </Text>
              
              <View style={styles.cameraOptions}>
                <TouchableOpacity style={styles.cameraButton} onPress={handleOpenCamera}>
                  <Text style={styles.cameraButtonText}>📷 拍照</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.cameraButton} onPress={() => {
                  setShowCameraModal(false);
                  setShowScanModal(true);
                }}>
                  <Text style={styles.cameraButtonText}>📱 扫码</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 扫码模态框 */}
      <Modal
        visible={showScanModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleStopScan}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.scanModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📱 扫码功能</Text>
              <TouchableOpacity
                onPress={handleStopScan}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.scanContent}>
              {scanning ? (
                <View style={styles.scanCameraContainer}>
                  <CameraView
                    style={styles.scanCamera}
                    facing="back"
                    onBarcodeScanned={({ data }) => handleScanCode(data)}
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr', 'pdf417', 'aztec', 'ean13', 'ean8', 'upc_e', 'code128', 'code39', 'codabar'],
                    }}
                  />
                  <View style={styles.scanOverlay}>
                    <View style={styles.scanFrame}>
                      <View style={[styles.scanCorner, styles.scanCornerTopLeft]} />
                      <View style={[styles.scanCorner, styles.scanCornerTopRight]} />
                      <View style={[styles.scanCorner, styles.scanCornerBottomLeft]} />
                      <View style={[styles.scanCorner, styles.scanCornerBottomRight]} />
                    </View>
                    <Text style={styles.scanInstruction}>
                      将二维码/条形码对准扫描框
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.scanStartContent}>
                  <Text style={styles.scanInstruction}>
                    点击开始扫码，扫描包裹二维码或条形码
                  </Text>
                  
                  <TouchableOpacity style={styles.scanStartButton} onPress={handleStartScan}>
                    <Text style={styles.scanStartButtonText}>📱 开始扫码</Text>
                  </TouchableOpacity>
                  
                  {scannedData && (
                    <View style={styles.scanResult}>
                      <Text style={styles.scanResultLabel}>扫描结果：</Text>
                      <Text style={styles.scanResultText}>{scannedData}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* 上传照片模态框 */}
      <Modal
        visible={showPhotoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📸 上传照片</Text>
              <TouchableOpacity
                onPress={() => setShowPhotoModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.photoContent}>
              {capturedPhoto ? (
                <>
                  <Image source={{ uri: capturedPhoto }} style={styles.photoPreview} />
                  <Text style={styles.photoInstruction}>
                    确认上传此照片作为配送证明？
                  </Text>
                  
                  <View style={styles.photoActions}>
                    <TouchableOpacity 
                      style={styles.photoActionButton} 
                      onPress={() => setCapturedPhoto(null)}
                    >
                      <Text style={styles.photoActionText}>重新拍照</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.photoActionButton, styles.uploadButton]} 
                      onPress={handleUploadPhoto}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.uploadButtonText}>确认上传</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.photoInstruction}>
                    请先拍照，然后上传作为配送证明
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.cameraButton} 
                    onPress={() => {
                      setShowPhotoModal(false);
                      setShowCameraModal(true);
                    }}
                  >
                    <Text style={styles.cameraButtonText}>📷 去拍照</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#2c5282',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  dateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  filterInfo: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '600',
  },
  clearFilterButton: {
    backgroundColor: '#ff5722',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearFilterText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  dateList: {
    maxHeight: 400,
  },
  dateItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedDateItem: {
    backgroundColor: '#e3f2fd',
  },
  dateItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedDateItemText: {
    color: '#1976d2',
    fontWeight: '600',
  },
  dateItemCount: {
    fontSize: 14,
    color: '#666',
  },
  selectedDateItemCount: {
    color: '#1976d2',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  packageCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
    marginBottom: 12,
  },
  packageId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c5282',
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
    flexDirection: 'row',
    marginBottom: 6,
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5282',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  // 新增功能按钮样式
  newActionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  newActionButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  newActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // 地址模态框样式
  addressContent: {
    padding: 20,
  },
  addressLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  addressValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  addressDetail: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    lineHeight: 24,
  },
  addressActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  addressActionButton: {
    flex: 1,
    backgroundColor: '#3182ce',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addressActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // 相机模态框样式
  cameraContent: {
    padding: 20,
    alignItems: 'center',
  },
  cameraInstruction: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  cameraButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // 照片模态框样式
  photoContent: {
    padding: 20,
    alignItems: 'center',
  },
  photoPreview: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 16,
  },
  photoInstruction: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  photoActionText: {
    fontSize: 14,
    color: '#666',
  },
  uploadButton: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // 扫码相关样式
  cameraOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  scanModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '95%',
    height: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanContent: {
    flex: 1,
    padding: 20,
  },
  scanCameraContainer: {
    flex: 1,
    position: 'relative',
  },
  scanCamera: {
    flex: 1,
    borderRadius: 12,
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#27ae60',
    borderWidth: 3,
  },
  scanCornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  scanCornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  scanCornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  scanCornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanStartContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanStartButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  scanStartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanResult: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    width: '100%',
  },
  scanResultLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  scanResultText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  // 日期分组相关样式
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  dateSection: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5282',
  },
  dateSubtitle: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f4f8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});

export default MyTasksScreen;
