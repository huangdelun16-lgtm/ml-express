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
  Linking,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { packageService, deliveryStoreService, supabase } from '../services/supabase';
import { cacheService } from '../services/cacheService';
import NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';

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
  delivery_store_id?: string;
  store_fee?: number | string;
  payment_method?: string;
}

const { width, height } = Dimensions.get('window');

const MyTasksScreen: React.FC = () => {
  const { language } = useApp();
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
          const deliveryDate = new Date(pkg.delivery_time);
          if (!isNaN(deliveryDate.getTime())) {
            dateKey = deliveryDate.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
          }
        } else if (pkg.pickup_time) {
          const pickupDate = new Date(pkg.pickup_time);
          if (!isNaN(pickupDate.getTime())) {
            dateKey = pickupDate.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
          }
        } else if (pkg.created_at) {
          const createDate = new Date(pkg.created_at);
          if (!isNaN(createDate.getTime())) {
            dateKey = createDate.toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
          }
        }
        
        if (!dateKey) {
          dateKey = '未知日期';
        }
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(pkg);
      } catch (error) {
        console.error('日期解析错误:', error, pkg);
        const defaultKey = '未知日期';
        if (!grouped[defaultKey]) {
          grouped[defaultKey] = [];
        }
        grouped[defaultKey].push(pkg);
      }
    });
    
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
      const userName = await AsyncStorage.getItem('currentUserName') || '';
      const netInfo = await NetInfo.fetch();
      
      let allPackages: any[] = [];
      
      if (netInfo.isConnected) {
        try {
          allPackages = await packageService.getAllPackages();
          if (allPackages && allPackages.length > 0) {
            await cacheService.savePackages(allPackages);
          }
        } catch (err) {
          console.warn('网络请求失败，尝试使用缓存:', err);
          const cached = await cacheService.getCachedPackages();
          if (cached) allPackages = cached;
        }
      } else {
        console.log('📶 离线模式，使用缓存数据');
        const cached = await cacheService.getCachedPackages();
        if (cached) {
          allPackages = cached;
        } else {
          Alert.alert(
            language === 'zh' ? '离线状态' : 'Offline Mode',
            language === 'zh' ? '当前无网络连接且无本地缓存数据' : 'No network connection and no cached data'
          );
        }
      }
      
      const myPackages = allPackages.filter(pkg => 
        pkg.courier === userName && 
        (pkg.status === '已取件' || pkg.status === '配送中' || pkg.status === '配送进行中' || pkg.status === '已送达')
      );
      
      setPackages(myPackages);
      const grouped = groupPackagesByDate(myPackages);
      setGroupedPackages(grouped);
      
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
      Alert.alert(
        language === 'zh' ? '加载失败' : 'Load Failed',
        language === 'zh' ? '无法加载任务列表，请重试' : 'Unable to load task list, please try again'
      );
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
      case '已取件': return '#27ae60';
      case '配送中':
      case '配送进行中': return '#f39c12';
      case '已送达': return '#3498db';
      case '已取消': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case '已取件': return language === 'zh' ? '已取件' : language === 'en' ? 'Picked Up' : 'ကောက်ယူပြီး';
      case '配送中':
      case '配送进行中': return language === 'zh' ? '配送中' : language === 'en' ? 'Delivering' : 'ပို့ဆောင်နေသည်';
      case '已送达': return language === 'zh' ? '已送达' : language === 'en' ? 'Delivered' : 'ပေးပို့ပြီး';
      case '已取消': return language === 'zh' ? '已取消' : language === 'en' ? 'Cancelled' : 'ပယ်ဖျက်ပြီး';
      default: return language === 'zh' ? '未知状态' : language === 'en' ? 'Unknown' : 'အခြေအနေမသိ';
    }
  };

  const handlePackagePress = (packageItem: Package) => {
    setSelectedPackage(packageItem);
    setShowDetailModal(true);
  };

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

  const handleConfirmPayment = async () => {
    if (!selectedPackage) return;
    
    Alert.alert(
      language === 'zh' ? '确认收款' : language === 'en' ? 'Confirm Payment' : 'ငွေကောက်ခံမှုအတည်ပြုရန်',
      `${language === 'zh' ? '确认已收到' : language === 'en' ? 'Confirm received' : 'လက်ခံရရှိပြီးဖြစ်ကြောင်း အတည်ပြုရန်'} ${selectedPackage.estimated_cost} ${language === 'zh' ? '吗？' : language === 'en' ? '?' : '?'}`,
      [
        { text: language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'ပယ်ဖျက်', style: 'cancel' },
        {
          text: language === 'zh' ? '确认' : language === 'en' ? 'Confirm' : 'အတည်ပြု',
          onPress: async () => {
            try {
              const success = await packageService.updatePackageStatus(selectedPackage.id, '待取件');
              if (success) {
                Alert.alert(
                  language === 'zh' ? '成功' : language === 'en' ? 'Success' : 'အောင်မြင်ပါသည်',
                  language === 'zh' ? '收款确认成功！' : 'Payment confirmed!',
                  [{ text: 'OK', onPress: () => { setShowDetailModal(false); loadMyPackages(); }}]
                );
              }
            } catch (error) {
              Alert.alert('错误', '操作失败');
            }
          }
        }
      ]
    );
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
      Alert.alert('错误', '无法打开相机');
    }
  };

  const handleManualPickup = async () => {
    if (!selectedPackage) return;
    
    Alert.alert(
      language === 'zh' ? '确认取件' : language === 'en' ? 'Confirm Pickup' : 'ကောက်ယူမှုကိုအတည်ပြုပါ',
      language === 'zh' ? '确定已收到此包裹吗？' : language === 'en' ? 'Are you sure you have received this package?' : 'ဤအထုပ်ကိုလက်ခံရရှိသည်မှာသေချာပါသလား?',
      [
        { text: language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'ပယ်ဖျက်', style: 'cancel' },
        {
          text: language === 'zh' ? '确认' : language === 'en' ? 'Confirm' : 'အတည်ပြု',
          onPress: async () => {
            try {
              const success = await packageService.updatePackageStatus(
                selectedPackage.id,
                '已取件',
                new Date().toLocaleString('zh-CN'),
                undefined,
                currentCourierName
              );

              if (success) {
                Alert.alert(
                  language === 'zh' ? '成功' : language === 'en' ? 'Success' : 'အောင်မြင်ပါသည်',
                  language === 'zh' ? '已确认取件' : language === 'en' ? 'Pickup confirmed' : 'ကောက်ယူမှုကိုအတည်ပြုပြီးပါပြီ'
                );
                setShowCameraModal(false);
                setShowDetailModal(false);
                loadMyPackages();
              }
            } catch (error) {
              Alert.alert('错误', '操作失败');
            }
          }
        }
      ]
    );
  };

  const handleUploadPhoto = async () => {
    if (!capturedPhoto || !selectedPackage) return;
    try {
      setUploadingPhoto(true);
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      const success = await packageService.updatePackageStatus(
        selectedPackage.id,
        '已送达',
        undefined,
        new Date().toISOString(),
        currentCourierName
      );

      if (success) {
        Alert.alert('配送完成！', '包裹已成功送达', [{
          text: '确定',
          onPress: async () => {
            setShowPhotoModal(false);
            setCapturedPhoto(null);
            await loadMyPackages();
          }
        }]);
      }
    } catch (error) {
      Alert.alert('上传失败', '请检查网络连接');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleScanCode = async (data: string) => {
    if (scannedOnce.current) return;
    scannedOnce.current = true;
    setScannedData(data);
    setScanning(false);
    setShowScanModal(false);
    
    if (data.startsWith('STORE_')) {
      const storeId = data.replace('STORE_', '').split('_')[0];
      try {
        const storeDetails = await deliveryStoreService.getStoreById(storeId);
        const storeName = storeDetails ? storeDetails.store_name : `店铺${storeId}`;
        
        Alert.alert('✅ 已送达', `包裹已送达至：${storeName}`, [{
          text: '确定',
          onPress: async () => {
            if (selectedPackage) {
              const success = await packageService.updatePackageStatus(
                selectedPackage.id, '已送达', undefined, new Date().toISOString(), currentCourierName,
                undefined, { storeId, storeName, receiveCode: data }
              );
              if (success) await loadMyPackages();
            }
          }
        }]);
      } catch (error) {
        Alert.alert('错误', '更新失败');
      }
    } else {
      Alert.alert('扫码成功', `扫描结果: ${data}`);
    }
  };

  const renderDetailModal = () => {
    if (!selectedPackage) return null;
    return (
      <Modal visible={showDetailModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.glassModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{language === 'zh' ? '任务详情' : 'Task Details'}</Text>
                <Text style={styles.modalSubtitle}>{selectedPackage.id}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.glassInfoCard}>
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>📦 {language === 'zh' ? '包裹信息' : 'Package'}</Text>
                  <View style={styles.infoLine}>
                    <Text style={styles.infoLineLabel}>{language === 'zh' ? '类型' : 'Type'}</Text>
                    <Text style={styles.infoLineValue}>{selectedPackage.package_type}</Text>
                  </View>
                  <View style={styles.infoLine}>
                    <Text style={styles.infoLineLabel}>{language === 'zh' ? '重量' : 'Weight'}</Text>
                    <Text style={styles.infoLineValue}>{selectedPackage.weight}kg</Text>
                  </View>
                </View>
                <View style={styles.glassDivider} />
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>👥 {language === 'zh' ? '联系人' : 'Contacts'}</Text>
                  <View style={styles.contactCard}>
                    <Text style={styles.contactRole}>{language === 'zh' ? '收件人' : 'Receiver'}</Text>
                    <Text style={styles.contactName}>{selectedPackage.receiver_name}</Text>
                    <Text style={styles.contactPhone}>{selectedPackage.receiver_phone}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.modalActionsGrid}>
                <TouchableOpacity style={styles.gridActionBtn} onPress={handleShowAddress}>
                  <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']} style={styles.gridBtnGradient}>
                    <Ionicons name="location" size={26} color="#3b82f6" />
                    <Text style={styles.gridBtnText}>{language === 'zh' ? '查看地址' : 'Address'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.gridActionBtn} onPress={() => setShowCameraModal(true)}>
                  <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']} style={styles.gridBtnGradient}>
                    <Ionicons name="camera" size={26} color="#10b981" />
                    <Text style={styles.gridBtnText}>{language === 'zh' ? '拍照/扫码' : 'Proof'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0f172a', '#1e3a8a', '#334155']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{language === 'zh' ? '我的任务' : 'My Tasks'}</Text>
          <Text style={styles.headerSubtitle}>{currentCourierName || 'Rider'}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={22} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={onRefresh}>
            <Ionicons name={refreshing ? "sync" : "refresh-outline"} size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}>
        {selectedDate && (
          <View style={styles.activeFilter}>
            <Text style={styles.filterText}>📅 {selectedDate}</Text>
            <TouchableOpacity onPress={() => setSelectedDate(null)}><Ionicons name="close-circle" size={20} color="#fff" /></TouchableOpacity>
          </View>
        )}
        
        {packages.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>{language === 'zh' ? '暂无任务' : 'No Tasks'}</Text>
          </View>
        ) : (
          (selectedDate ? [selectedDate] : Object.keys(groupedPackages)).map(date => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateGroupTitle}>{date}</Text>
              {groupedPackages[date]?.map(item => (
                <TouchableOpacity key={item.id} style={styles.packageCard} onPress={() => handlePackagePress(item)} activeOpacity={0.8}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardId}>{item.id}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.cardRow}><Ionicons name="person" size={14} color="rgba(255,255,255,0.4)" /><Text style={styles.cardValue}>{item.receiver_name}</Text></View>
                    <View style={styles.cardRow}><Ionicons name="location" size={14} color="rgba(255,255,255,0.4)" /><Text style={styles.cardValue} numberOfLines={1}>{item.receiver_address}</Text></View>
                  </View>
                  <View style={styles.cardFooter}>
                    <View style={styles.tag}><Text style={styles.tagText}>{item.package_type}</Text></View>
                    <View style={styles.tag}><Text style={styles.tagText}>{item.weight}kg</Text></View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {renderDetailModal()}

      {/* 地址模态框 */}
      <Modal visible={showAddressModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.glassModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📍 {language === 'zh' ? '送货地址' : 'Address'}</Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)} style={styles.closeBtn}><Ionicons name="close" size={24} color="white" /></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.glassInfoCard}>
                <Text style={styles.infoLineLabel}>{language === 'zh' ? '收件人' : 'Receiver'}</Text>
                <Text style={styles.infoLineValue}>{selectedPackage?.receiver_name}</Text>
                <View style={styles.glassDivider} />
                <Text style={styles.infoLineLabel}>{language === 'zh' ? '详细地址' : 'Address'}</Text>
                <Text style={styles.infoLineValue}>{selectedPackage?.receiver_address}</Text>
              </View>
              <View style={styles.modalActionsGrid}>
                <TouchableOpacity style={styles.gridActionBtn} onPress={handleCall}><LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.gridBtnGradient}><Text style={styles.gridBtnText}>📞 {language === 'zh' ? '拨打电话' : 'Call'}</Text></LinearGradient></TouchableOpacity>
                <TouchableOpacity style={styles.gridActionBtn} onPress={handleNavigate}><LinearGradient colors={['#10b981', '#059669']} style={styles.gridBtnGradient}><Text style={styles.gridBtnText}>🗺️ {language === 'zh' ? '导航前往' : 'Map'}</Text></LinearGradient></TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 扫码选择模态框 */}
      <Modal visible={showCameraModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.glassModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📷 {language === 'zh' ? '选择操作' : 'Operation'}</Text>
              <TouchableOpacity onPress={() => setShowCameraModal(false)} style={styles.closeBtn}><Ionicons name="close" size={24} color="white" /></TouchableOpacity>
            </View>
            <View style={[styles.modalBody, { flexDirection: 'row', gap: 16, flexWrap: 'wrap' }]}>
              {selectedPackage?.status === '待取件' ? (
                <>
                  <TouchableOpacity style={styles.gridActionBtn} onPress={() => { setShowCameraModal(false); setShowScanModal(true); setScanning(true); }}>
                    <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.gridBtnGradient}>
                      <Ionicons name="qr-code" size={32} color="white" />
                      <Text style={styles.gridBtnText}>{language === 'zh' ? '扫码取件' : 'Scan'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.gridActionBtn} onPress={handleManualPickup}>
                    <LinearGradient colors={['#10b981', '#059669']} style={styles.gridBtnGradient}>
                      <Ionicons name="hand-right" size={32} color="white" />
                      <Text style={styles.gridBtnText}>{language === 'zh' ? '手动取件' : 'Manual'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.gridActionBtn} onPress={handleOpenCamera}>
                    <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.gridBtnGradient}>
                      <Ionicons name="camera" size={32} color="white" />
                      <Text style={styles.gridBtnText}>{language === 'zh' ? '拍照送达' : 'Photo'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.gridActionBtn} onPress={() => { setShowCameraModal(false); setShowScanModal(true); setScanning(true); }}>
                    <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.gridBtnGradient}>
                      <Ionicons name="qr-code" size={32} color="white" />
                      <Text style={styles.gridBtnText}>{language === 'zh' ? '扫码送达' : 'Scan'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* 日期选择模态框 */}
      <Modal visible={showDatePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.glassModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📅 {language === 'zh' ? '选择日期' : 'Select Date'}</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.closeBtn}><Ionicons name="close" size={24} color="white" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <TouchableOpacity style={[styles.dateItem, !selectedDate && styles.dateItemSelected]} onPress={() => { setSelectedDate(null); setShowDatePicker(false); }}>
                <Text style={styles.dateItemText}>{language === 'zh' ? '全部任务' : 'All'}</Text>
                {!selectedDate && <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />}
              </TouchableOpacity>
              {availableDates.map(d => (
                <TouchableOpacity key={d} style={[styles.dateItem, selectedDate === d && styles.dateItemSelected]} onPress={() => { setSelectedDate(d); setShowDatePicker(false); }}>
                  <Text style={styles.dateItemText}>{d}</Text>
                  {selectedDate === d && <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 扫码相机 */}
      <Modal visible={showScanModal} transparent animationType="slide">
        <View style={styles.scanOverlay}>
          <CameraView style={StyleSheet.absoluteFill} facing="back" onBarcodeScanned={({ data }) => handleScanCode(data)} />
          <View style={styles.scanFrameContainer}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 }]} />
              <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 }]} />
              <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 }]} />
              <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 }]} />
            </View>
            <Text style={styles.scanHint}>{language === 'zh' ? '对准二维码/条形码' : 'Align code'}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowScanModal(false)} style={styles.scanCloseBtn}><Ionicons name="close" size={32} color="white" /></TouchableOpacity>
        </View>
      </Modal>

      {/* 照片预览 */}
      <Modal visible={showPhotoModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.glassModal, { backgroundColor: '#fff', maxWidth: 450 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: '#f1f5f9' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="image" size={24} color="#3b82f6" />
                </View>
                <Text style={[styles.modalTitle, { color: '#1e293b' }]}>
                  {language === 'zh' ? '上传配送证明' : 'Upload Proof'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowPhotoModal(false)} style={[styles.closeBtn, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.photoPreviewWrapper}>
                {capturedPhoto ? (
                  <Image source={{ uri: capturedPhoto }} style={styles.photoPreview} />
                ) : (
                  <View style={[styles.photoPreview, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' }]}>
                    <ActivityIndicator color="#3b82f6" />
                  </View>
                )}
                <View style={styles.photoBadge}>
                  <Text style={styles.photoBadgeText}>
                    {language === 'zh' ? '待上传证明' : 'Proof to Upload'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.photoActionRow}>
                <TouchableOpacity
                  onPress={() => {
                    setShowPhotoModal(false);
                    setCapturedPhoto(null);
                  }}
                  style={styles.retakeButtonFixed}
                >
                  <Ionicons name="refresh" size={18} color="#64748b" />
                  <Text style={styles.retakeButtonTextFixed}>
                    {language === 'zh' ? '重新拍摄' : 'Retake'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleUploadPhoto}
                  style={[styles.uploadButtonFixed, uploadingPhoto && styles.disabledBtn]}
                  disabled={uploadingPhoto}
                >
                  <LinearGradient
                    colors={uploadingPhoto ? ['#9ca3af', '#6b7280'] : ['#10b981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.uploadButtonGradientFixed}
                  >
                    {uploadingPhoto ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    )}
                    <Text style={styles.uploadButtonTextFixed}>
                      {uploadingPhoto 
                        ? (language === 'zh' ? '正在上传...' : 'Uploading...') 
                        : (language === 'zh' ? '确认送达' : 'Confirm')}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '700' },
  headerRight: { flexDirection: 'row', gap: 12 },
  headerBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  scroll: { flex: 1, paddingHorizontal: 20 },
  activeFilter: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(59, 130, 246, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 16 },
  filterText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 18, fontWeight: '700' },
  dateGroup: { marginBottom: 24 },
  dateGroupTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: '800', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  packageCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardId: { color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  cardBody: { gap: 6, marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardValue: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', flex: 1 },
  cardFooter: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  tag: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  glassModal: { width: '100%', backgroundColor: 'rgba(30, 41, 59, 0.98)', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  modalHeader: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  modalSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  modalBody: { padding: 24 },
  glassInfoCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  infoSectionTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', marginBottom: 16, textTransform: 'uppercase' },
  infoLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  infoLineLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' },
  infoLineValue: { color: '#fff', fontSize: 13, fontWeight: '800' },
  glassDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 16 },
  contactCard: { gap: 4 },
  contactRole: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '800' },
  contactName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  contactPhone: { color: '#3b82f6', fontSize: 14, fontWeight: '700' },
  modalActionsGrid: { flexDirection: 'row', gap: 12 },
  gridActionBtn: { flex: 1, height: 90, borderRadius: 20, overflow: 'hidden' },
  gridBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 12 },
  gridBtnText: { color: '#fff', fontSize: 12, fontWeight: '800', marginTop: 8 },
  dateItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.02)' },
  dateItemSelected: { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)' },
  dateItemText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  scanOverlay: { flex: 1, backgroundColor: '#000' },
  scanFrameContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 250, height: 250, position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#3b82f6' },
  scanHint: { color: '#fff', marginTop: 40, fontSize: 14, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  scanCloseBtn: { position: 'absolute', top: 60, right: 30 },
  photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoPreviewWrapper: {
    width: '100%',
    aspectRatio: 4/3,
    borderRadius: 24,
    marginBottom: 24,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  photoBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  photoBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  retakeButtonFixed: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  retakeButtonTextFixed: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '700',
  },
  uploadButtonFixed: {
    flex: 2,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  uploadButtonGradientFixed: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  uploadButtonTextFixed: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoSection: {
    marginBottom: 20,
  },
  disabledBtn: {
    opacity: 0.5,
  },
});

export default MyTasksScreen;
