import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  Vibration,
} from 'react-native';
import { packageService, Package, routeService, courierService, Courier, RouteOptimization } from '../services/supabase';
import ScannerScreen from './ScannerScreen';
import MapViewScreen from './MapViewScreen';
import { useApp } from '../contexts/AppContext';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';

export default function PackageManagementScreen({ navigation }: any) {
  const { language } = useApp();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [updating, setUpdating] = useState(false);
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    completionRate: 0,
  });
  const [batchMode, setBatchMode] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [routeOptimizations, setRouteOptimizations] = useState<RouteOptimization[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [showPackageDetailModal, setShowPackageDetailModal] = useState(false);
  const [showPickupCodeModal, setShowPickupCodeModal] = useState(false);
  const [showDeliveryScanModal, setShowDeliveryScanModal] = useState(false);
  const [showPhotoUploadModal, setShowPhotoUploadModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadPackages();
    loadCouriers();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await packageService.getAllPackages();
      setPackages(data);
      calculateStatistics(data);
    } catch (error) {
      console.error('加载包裹失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 计算统计数据
  const calculateStatistics = (packagesData: Package[]) => {
    const today = new Date().toLocaleDateString('zh-CN');
    const todayPackages = packagesData.filter(pkg => {
      const createDate = new Date(pkg.create_time).toLocaleDateString('zh-CN');
      return createDate === today;
    });

    const total = todayPackages.length;
    const pending = todayPackages.filter(p => p.status === '待取件').length;
    const inProgress = todayPackages.filter(p => ['已取件', '配送中'].includes(p.status)).length;
    const completed = todayPackages.filter(p => p.status === '已送达').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    setStatistics({
      total,
      pending,
      inProgress,
      completed,
      completionRate,
    });
  };

  const loadCouriers = async () => {
    try {
      const data = await courierService.getAllCouriers();
      setCouriers(data);
    } catch (error) {
      console.error('加载快递员失败:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPackages();
    await loadCouriers();
    setRefreshing(false);
  };

  // 快速状态更新功能
  const handleLongPress = (pkg: Package) => {
    Vibration.vibrate(50);
    setSelectedPackage(pkg);
    setShowStatusModal(true);
  };

  const updatePackageStatus = async (newStatus: string) => {
    if (!selectedPackage) return;
    
    setUpdating(true);
    try {
      const currentTime = new Date().toLocaleString('zh-CN');
      let pickupTime = '';
      let deliveryTime = '';
      
      // 根据状态设置时间
      if (newStatus === '已取件' && selectedPackage.status === '待取件') {
        pickupTime = currentTime;
      } else if (newStatus === '已送达' && selectedPackage.status === '配送中') {
        deliveryTime = currentTime;
      }
      
      const success = await packageService.updatePackageStatus(
        selectedPackage.id,
        newStatus,
        pickupTime,
        deliveryTime
      );
      
      if (success) {
        // 更新本地状态
        const updatedPackages = packages.map(pkg => 
          pkg.id === selectedPackage.id 
            ? { 
                ...pkg, 
                status: newStatus, 
                pickup_time: pickupTime || pkg.pickup_time,
                delivery_time: deliveryTime || pkg.delivery_time
              } 
            : pkg
        );
        setPackages(updatedPackages);
        calculateStatistics(updatedPackages);
        
        Alert.alert('成功', `包裹状态已更新为 "${newStatus}"`);
      } else {
        Alert.alert('错误', '状态更新失败，请重试');
      }
    } catch (error) {
      console.error('更新状态失败:', error);
      Alert.alert('错误', '网络错误，请检查连接');
    } finally {
      setUpdating(false);
      setShowStatusModal(false);
      setSelectedPackage(null);
    }
  };

  // 获取可用的下一步状态
  const getNextStatusOptions = (currentStatus: string) => {
    switch (currentStatus) {
      case '待取件':
        return [
          { label: '已取件', value: '已取件', color: '#3498db', icon: '📦' },
          { label: '已取消', value: '已取消', color: '#e74c3c', icon: '❌' },
        ];
      case '已取件':
        return [
          { label: '配送中', value: '配送中', color: '#9b59b6', icon: '🚚' },
          { label: '已取消', value: '已取消', color: '#e74c3c', icon: '❌' },
        ];
      case '配送中':
        return [
          { label: '已送达', value: '已送达', color: '#27ae60', icon: '✅' },
          { label: '配送失败', value: '配送失败', color: '#e67e22', icon: '⚠️' },
        ];
      case '已分配':
        return [
          { label: '已取件', value: '已取件', color: '#3498db', icon: '📦' },
          { label: '已取消', value: '已取消', color: '#e74c3c', icon: '❌' },
        ];
      default:
        return [];
    }
  };

  // 批量操作相关函数
  const toggleBatchMode = () => {
    setBatchMode(!batchMode);
    setSelectedPackages(new Set());
  };

  const togglePackageSelection = (packageId: string) => {
    const newSelected = new Set(selectedPackages);
    if (newSelected.has(packageId)) {
      newSelected.delete(packageId);
    } else {
      newSelected.add(packageId);
    }
    setSelectedPackages(newSelected);
  };

  const selectAllPackages = () => {
    if (selectedPackages.size === filteredPackages.length) {
      setSelectedPackages(new Set());
    } else {
      setSelectedPackages(new Set(filteredPackages.map(pkg => pkg.id)));
    }
  };

  const batchUpdateStatus = async (newStatus: string) => {
    if (selectedPackages.size === 0) return;
    
    setUpdating(true);
    const currentTime = new Date().toLocaleString('zh-CN');
    
    try {
      let successCount = 0;
      const packageIds = Array.from(selectedPackages);
      
      for (const packageId of packageIds) {
        const pkg = packages.find(p => p.id === packageId);
        if (!pkg) continue;
        
        let pickupTime = '';
        let deliveryTime = '';
        
        if (newStatus === '已取件' && pkg.status === '待取件') {
          pickupTime = currentTime;
        } else if (newStatus === '已送达' && pkg.status === '配送中') {
          deliveryTime = currentTime;
        }
        
        const success = await packageService.updatePackageStatus(
          packageId,
          newStatus,
          pickupTime,
          deliveryTime
        );
        
        if (success) successCount++;
      }
      
      if (successCount > 0) {
        // 更新本地状态
        const updatedPackages = packages.map(pkg => 
          selectedPackages.has(pkg.id) 
            ? { 
                ...pkg, 
                status: newStatus,
                pickup_time: newStatus === '已取件' && pkg.status === '待取件' 
                  ? currentTime : pkg.pickup_time,
                delivery_time: newStatus === '已送达' && pkg.status === '配送中' 
                  ? currentTime : pkg.delivery_time
              }
            : pkg
        );
        setPackages(updatedPackages);
        calculateStatistics(updatedPackages);
        
        Alert.alert('成功', `成功更新 ${successCount} 个包裹状态为 "${newStatus}"`);
        setSelectedPackages(new Set());
      }
      
      if (successCount < selectedPackages.size) {
        Alert.alert('部分成功', `${successCount}/${selectedPackages.size} 个包裹更新成功`);
      }
      
    } catch (error) {
      console.error('批量更新失败:', error);
      Alert.alert('错误', '批量更新失败，请重试');
    } finally {
      setUpdating(false);
      setShowBatchModal(false);
    }
  };

  // 智能分配相关函数
  const handleSmartAssignment = async () => {
    if (selectedPackages.size === 0) {
      Alert.alert('提示', '请先选择要分配的包裹');
      return;
    }

    setAssignmentLoading(true);
    try {
      // 获取选中的包裹
      const selectedPackageList = packages.filter(pkg => selectedPackages.has(pkg.id));
      
      // 只对待分配的包裹进行智能分配
      const unassignedPackages = selectedPackageList.filter(pkg => 
        pkg.status === '待取件' || pkg.courier === '未分配' || !pkg.courier || pkg.courier === '待分配'
      );

      if (unassignedPackages.length === 0) {
        Alert.alert('提示', '选中的包裹都已经分配了快递员');
        setAssignmentLoading(false);
        return;
      }

      console.log(`🧠 开始智能分配 ${unassignedPackages.length} 个包裹...`);

      // 执行智能分配算法
      const optimizations = await routeService.assignOptimalCourier(unassignedPackages);
      
      if (optimizations.length === 0) {
        Alert.alert('分配失败', '没有可用的快递员或智能分配失败');
        setAssignmentLoading(false);
        return;
      }

      console.log(`✅ 智能分配完成，生成 ${optimizations.length} 个分配方案`);
      setRouteOptimizations(optimizations);
      setShowAssignModal(true);
    } catch (error) {
      console.error('智能分配失败:', error);
      Alert.alert('错误', '智能分配失败，请重试');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const confirmAssignment = async (optimization: RouteOptimization) => {
    setUpdating(true);
    try {
      const packageIds = optimization.packages.map(pkg => pkg.id);
      const success = await routeService.assignPackagesToCourier(
        packageIds,
        optimization.courier_id,
        optimization.courier_name
      );

      if (success) {
        // 更新本地状态
        const updatedPackages = packages.map(pkg => 
          packageIds.includes(pkg.id)
            ? { ...pkg, courier: optimization.courier_name, status: '已分配' }
            : pkg
        );
        setPackages(updatedPackages);
        calculateStatistics(updatedPackages);
        
        Alert.alert('成功', `已将 ${packageIds.length} 个包裹分配给 ${optimization.courier_name}`);
        setSelectedPackages(new Set());
        setShowAssignModal(false);
        setBatchMode(false);
      } else {
        Alert.alert('失败', '包裹分配失败，请重试');
      }
    } catch (error) {
      console.error('确认分配失败:', error);
      Alert.alert('错误', '分配确认失败，请重试');
    } finally {
      setUpdating(false);
    }
  };

  // 扫码相关函数
  const handleScanResult = (scannedPackage: Package) => {
    // 显示包裹详情模态框
    setSelectedPackage(scannedPackage);
    setShowPackageDetailModal(true);
    setShowScanner(false);
  };

  // 筛选逻辑
  const filteredPackages = packages.filter(pkg => {
    const matchSearch = 
      pkg.id.toLowerCase().includes(searchText.toLowerCase()) ||
      pkg.receiver_name.toLowerCase().includes(searchText.toLowerCase()) ||
      pkg.sender_name.toLowerCase().includes(searchText.toLowerCase());
    
    const matchStatus = filterStatus === 'all' || pkg.status === filterStatus;
    
    return matchSearch && matchStatus;
  });

  const statusFilters = [
    { label: '全部', value: 'all' },
    { label: '待取件', value: '待取件' },
    { label: '已取件', value: '已取件' },
    { label: '配送中', value: '配送中' },
    { label: '已送达', value: '已送达' },
    { label: '已取消', value: '已取消' },
    { label: '配送失败', value: '配送失败' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待取件': return '#f39c12';
      case '已取件': return '#3498db';
      case '配送中': return '#9b59b6';
      case '已送达': return '#27ae60';
      case '已取消': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const renderPackageItem = ({ item }: { item: Package }) => {
    const isSelected = selectedPackages.has(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.packageCard,
          isSelected && styles.packageCardSelected
        ]}
        onPress={() => {
          if (batchMode) {
            togglePackageSelection(item.id);
          } else {
            setSelectedPackage(item);
            setShowPackageDetailModal(true);
          }
        }}
        onLongPress={() => !batchMode && handleLongPress(item)}
        activeOpacity={0.7}
        delayLongPress={800}
      >
      {/* 左侧彩色边条 */}
      <View style={[styles.colorBar, { backgroundColor: getStatusColor(item.status) }]} />
      
      <View style={styles.cardContent}>
        {/* 头部 */}
        <View style={styles.cardHeader}>
          {batchMode && (
            <TouchableOpacity
              style={[styles.checkbox, isSelected && styles.checkboxSelected]}
              onPress={() => togglePackageSelection(item.id)}
            >
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          )}
          <Text style={[styles.packageId, batchMode && styles.packageIdWithCheckbox]}>
            {item.id}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        {/* 信息 */}
        <View style={styles.infoRow}>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>收件人</Text>
            <Text style={styles.infoValue}>{item.receiver_name}</Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>快递员</Text>
            <Text style={styles.infoValue}>{item.courier}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>类型</Text>
            <Text style={styles.infoValue}>{item.package_type}</Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.infoLabel}>价格</Text>
            <Text style={[styles.infoValue, { color: '#27ae60', fontWeight: 'bold' }]}>
              {item.price}
            </Text>
          </View>
        </View>

        {/* 时间 */}
        <Text style={styles.timeText}>创建: {item.create_time}</Text>
      </View>
    </TouchableOpacity>
  );
};

  // 生成送件扫码
  const generateDeliveryQRCode = (packageId: string) => {
    return `DELIVERY_${packageId}_${Date.now()}`;
  };

  // 上传照片功能
  const uploadDeliveryPhoto = async () => {
    if (!selectedPackage) return;
    
    setUploadingPhoto(true);
    try {
      // 请求相机权限
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('需要相机权限', '需要相机权限才能拍照');
        return;
      }

      // 获取当前位置
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        Alert.alert('需要位置权限', '需要位置权限才能记录送达位置');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      
      // 拍照
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled) {
        const photoUri = result.assets[0].uri;
        
        // 这里可以上传照片到服务器或保存到本地
        // 同时记录位置信息
        const deliveryData = {
          packageId: selectedPackage.id,
          photoUri: photoUri,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: new Date().toISOString(),
        };

        console.log('送达照片和位置信息:', deliveryData);
        
        Alert.alert(
          '✅ 上传成功！',
          '送达照片和位置信息已记录\n骑手可获得KM积分',
          [{ text: '确定' }]
        );
      }
    } catch (error) {
      console.error('上传照片失败:', error);
      Alert.alert('上传失败', '请重试');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          📦 {language === 'zh' ? '包裹管理' : 'Package Management'}
        </Text>
        <TouchableOpacity 
          onPress={() => setShowMapView(true)} 
          style={styles.mapViewButton}
        >
          <Text style={styles.mapViewIcon}>🗺️</Text>
        </TouchableOpacity>
      </View>

      {/* 统计仪表板 */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>
          📊 {language === 'zh' ? '今日统计' : "Today's Statistics"}
        </Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#3498db20' }]}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>📦</Text>
            </View>
            <Text style={styles.statNumber}>{statistics.total}</Text>
            <Text style={styles.statLabel}>{language === 'zh' ? '总包裹' : 'Total'}</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#f39c1220' }]}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>⏳</Text>
            </View>
            <Text style={styles.statNumber}>{statistics.pending}</Text>
            <Text style={styles.statLabel}>{language === 'zh' ? '待取件' : 'Pending'}</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#9b59b620' }]}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>🚚</Text>
            </View>
            <Text style={styles.statNumber}>{statistics.inProgress}</Text>
            <Text style={styles.statLabel}>{language === 'zh' ? '配送中' : 'In Transit'}</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#27ae6020' }]}>
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>✅</Text>
            </View>
            <Text style={styles.statNumber}>{statistics.completed}</Text>
            <Text style={styles.statLabel}>{language === 'zh' ? '已完成' : 'Completed'}</Text>
          </View>
        </View>
        
        {/* 完成率进度条 */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>完成率</Text>
            <Text style={styles.progressPercent}>{statistics.completionRate}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${statistics.completionRate}%` }
              ]} 
            />
          </View>
        </View>
      </View>

      {/* 搜索栏和扫码 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={language === 'zh' ? '搜索包裹编号、收件人、寄件人...' : 'Search package ID, receiver, sender...'}
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setShowScanner(true)}
          >
            <Text style={styles.scanButtonIcon}>📱</Text>
            <Text style={styles.scanButtonText}>扫码</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 状态筛选 */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {statusFilters.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterChip,
              filterStatus === filter.value && styles.filterChipActive
            ]}
            onPress={() => setFilterStatus(filter.value)}
          >
            <Text style={[
              styles.filterChipText,
              filterStatus === filter.value && styles.filterChipTextActive
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 结果计数和批量操作 */}
      <View style={styles.resultBar}>
        {!batchMode ? (
          <>
            <Text style={styles.resultText}>
              共 {filteredPackages.length} 个包裹
            </Text>
            <TouchableOpacity 
              style={styles.batchButton}
              onPress={toggleBatchMode}
            >
              <Text style={styles.batchButtonText}>批量操作</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.batchControls}>
              <TouchableOpacity 
                style={styles.selectAllButton}
                onPress={selectAllPackages}
              >
                <Text style={styles.selectAllText}>
                  {selectedPackages.size === filteredPackages.length ? '取消全选' : '全选'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.selectedCount}>
                已选择 {selectedPackages.size} 个
              </Text>
            </View>
            <View style={styles.batchActionButtons}>
              {selectedPackages.size > 0 && (
                <>
                  <TouchableOpacity
                    style={styles.smartAssignButton}
                    onPress={handleSmartAssignment}
                    disabled={assignmentLoading}
                  >
                    <Text style={styles.smartAssignButtonText}>
                      {assignmentLoading ? '分配中...' : '🧠 智能分配'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.batchActionButton}
                    onPress={() => setShowBatchModal(true)}
                  >
                    <Text style={styles.batchActionButtonText}>批量更新</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity 
                style={styles.cancelBatchButton}
                onPress={toggleBatchMode}
              >
                <Text style={styles.cancelBatchText}>取消</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* 包裹列表 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c5282" />
        </View>
      ) : (
        <FlatList
          data={filteredPackages}
          renderItem={renderPackageItem}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>暂无符合条件的包裹</Text>
            </View>
          }
        />
      )}

      {/* 快速状态更新模态框 */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.centeredModalOverlay}>
          <View style={styles.centeredModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>更新包裹状态</Text>
              <TouchableOpacity
                onPress={() => setShowStatusModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {selectedPackage && (
              <>
                <View style={styles.packageInfo}>
                  <Text style={styles.packageInfoText}>
                    包裹编号: {selectedPackage.id}
                  </Text>
                  <Text style={styles.packageInfoText}>
                    收件人: {selectedPackage.receiver_name}
                  </Text>
                  <Text style={styles.packageInfoText}>
                    当前状态: {selectedPackage.status}
                  </Text>
                </View>

                <Text style={styles.optionsTitle}>选择新状态:</Text>
                <View style={styles.statusOptions}>
                  {getNextStatusOptions(selectedPackage.status).map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.statusOption, { backgroundColor: option.color }]}
                      onPress={() => updatePackageStatus(option.value)}
                      disabled={updating}
                    >
                      <Text style={styles.statusOptionIcon}>{option.icon}</Text>
                      <Text style={styles.statusOptionText}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {getNextStatusOptions(selectedPackage.status).length === 0 && (
                  <View style={styles.noOptionsContainer}>
                    <Text style={styles.noOptionsText}>
                      此状态无法进一步更新
                    </Text>
                  </View>
                )}

                {updating && (
                  <View style={styles.updatingContainer}>
                    <ActivityIndicator color="#2c5282" size="small" />
                    <Text style={styles.updatingText}>更新中...</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 批量操作模态框 */}
      <Modal
        visible={showBatchModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBatchModal(false)}
      >
        <View style={styles.centeredModalOverlay}>
          <View style={styles.centeredModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>批量更新状态</Text>
              <TouchableOpacity
                onPress={() => setShowBatchModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.packageInfo}>
              <Text style={styles.packageInfoText}>
                选择了 {selectedPackages.size} 个包裹
              </Text>
              <Text style={styles.packageInfoText}>
                将批量更新它们的状态
              </Text>
            </View>

            <Text style={styles.optionsTitle}>选择新状态:</Text>
            <View style={styles.statusOptions}>
              {[
                { label: '已取件', value: '已取件', color: '#3498db', icon: '📦' },
                { label: '配送中', value: '配送中', color: '#9b59b6', icon: '🚚' },
                { label: '已送达', value: '已送达', color: '#27ae60', icon: '✅' },
                { label: '已取消', value: '已取消', color: '#e74c3c', icon: '❌' },
                { label: '配送失败', value: '配送失败', color: '#e67e22', icon: '⚠️' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.statusOption, { backgroundColor: option.color }]}
                  onPress={() => batchUpdateStatus(option.value)}
                  disabled={updating}
                >
                  <Text style={styles.statusOptionIcon}>{option.icon}</Text>
                  <Text style={styles.statusOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {updating && (
              <View style={styles.updatingContainer}>
                <ActivityIndicator color="#2c5282" size="small" />
                <Text style={styles.updatingText}>批量更新中...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 智能分配模态框 */}
      <Modal
        visible={showAssignModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.centeredModalOverlay}>
          <View style={styles.largeModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🧠 智能分配推荐</Text>
              <TouchableOpacity
                onPress={() => setShowAssignModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {routeOptimizations.length > 0 ? (
                routeOptimizations.map((optimization, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.routeCard}
                    onPress={() => confirmAssignment(optimization)}
                    disabled={updating}
                  >
                    <View style={styles.routeHeader}>
                      <View style={styles.courierInfo}>
                        <Text style={styles.courierName}>
                          👤 {optimization.courier_name}
                        </Text>
                        <Text style={styles.courierStats}>
                          评分: {Math.round(optimization.priority_score)} 分
                        </Text>
                      </View>
                      <View style={styles.routeStats}>
                        <Text style={styles.routeStatsText}>
                          📦 {optimization.packages.length} 个包裹
                        </Text>
                        <Text style={styles.routeStatsText}>
                          🛣️ {optimization.total_distance} km
                        </Text>
                        <Text style={styles.routeStatsText}>
                          ⏰ {Math.round(optimization.estimated_time / 60)} 小时
                        </Text>
                      </View>
                    </View>

                    <View style={styles.packagesList}>
                      <Text style={styles.packagesTitle}>分配包裹:</Text>
                      {optimization.packages.slice(0, 3).map((pkg, pkgIndex) => (
                        <Text key={pkgIndex} style={styles.packageItem}>
                          • {pkg.id} → {pkg.receiver_name}
                        </Text>
                      ))}
                      {optimization.packages.length > 3 && (
                        <Text style={styles.morePackages}>
                          还有 {optimization.packages.length - 3} 个包裹...
                        </Text>
                      )}
                    </View>

                    <View style={styles.assignButton}>
                      <Text style={styles.assignButtonText}>
                        点击确认分配 ✅
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noOptimizationContainer}>
                  <Text style={styles.noOptimizationText}>
                    暂无可用的分配方案
                  </Text>
                </View>
              )}
            </ScrollView>

            {updating && (
              <View style={styles.updatingContainer}>
                <ActivityIndicator color="#2c5282" size="small" />
                <Text style={styles.updatingText}>分配中...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 扫码组件 */}
      <ScannerScreen
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onPackageFound={handleScanResult}
      />

      {/* 地图视图组件 */}
      <MapViewScreen
        visible={showMapView}
        onClose={() => setShowMapView(false)}
      />

      {/* 包裹详情模态框 */}
      <Modal
        visible={showPackageDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPackageDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.packageDetailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                📦 {language === 'zh' ? '包裹详情' : 'Package Details'}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowPackageDetailModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedPackage && (
              <ScrollView style={styles.packageDetailContent}>
                {/* 包裹基本信息 */}
                <View style={styles.packageInfoSection}>
                  <Text style={styles.sectionTitle}>
                    {language === 'zh' ? '📋 基本信息' : '📋 Basic Info'}
                  </Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>
                      {language === 'zh' ? '包裹编号' : 'Package ID'}:
                    </Text>
                    <Text style={styles.infoValueRight}>{selectedPackage.id}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>
                      {language === 'zh' ? '收件人' : 'Receiver'}:
                    </Text>
                    <Text style={styles.infoValueRight}>{selectedPackage.receiver_name}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>
                      {language === 'zh' ? '收件人电话' : 'Receiver Phone'}:
                    </Text>
                    <Text style={styles.infoValueRight}>{selectedPackage.receiver_phone}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>
                      {language === 'zh' ? '收件地址' : 'Delivery Address'}:
                    </Text>
                    <Text style={styles.infoValueRight}>{selectedPackage.receiver_address}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>
                      {language === 'zh' ? '快递员' : 'Courier'}:
                    </Text>
                    <Text style={styles.infoValueRight}>{selectedPackage.courier}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>
                      {language === 'zh' ? '状态' : 'Status'}:
                    </Text>
                    <Text style={[styles.infoValueRight, { color: getStatusColor(selectedPackage.status) }]}>
                      {selectedPackage.status}
                    </Text>
                  </View>
                </View>

                {/* 包裹详细信息 */}
                <View style={styles.packageInfoSection}>
                  <Text style={styles.sectionTitle}>
                    {language === 'zh' ? '📦 包裹详情' : '📦 Package Details'}
                  </Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>
                      {language === 'zh' ? '包裹类型' : 'Package Type'}:
                    </Text>
                    <Text style={styles.infoValueRight}>{selectedPackage.package_type}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>
                      {language === 'zh' ? '重量' : 'Weight'}:
                    </Text>
                    <Text style={styles.infoValueRight}>{selectedPackage.weight} kg</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>
                      {language === 'zh' ? '描述' : 'Description'}:
                    </Text>
                    <Text style={styles.infoValueRight}>{selectedPackage.description}</Text>
                  </View>
                </View>

                {/* 时间信息 */}
                <View style={styles.packageInfoSection}>
                  <Text style={styles.sectionTitle}>
                    {language === 'zh' ? '⏰ 时间信息' : '⏰ Time Info'}
                  </Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>
                      {language === 'zh' ? '创建时间' : 'Created Time'}:
                    </Text>
                    <Text style={styles.infoValueRight}>
                      {new Date(selectedPackage.created_at || Date.now()).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>
                      {language === 'zh' ? '取件时间' : 'Pickup Time'}:
                    </Text>
                    <Text style={styles.infoValueRight}>
                      {selectedPackage.pickup_time ? 
                        new Date(selectedPackage.pickup_time).toLocaleString() : 
                        (language === 'zh' ? '未取件' : 'Not Picked Up')
                      }
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>
                      {language === 'zh' ? '送达时间' : 'Delivery Time'}:
                    </Text>
                    <Text style={styles.infoValueRight}>
                      {selectedPackage.delivery_time ? 
                        new Date(selectedPackage.delivery_time).toLocaleString() : 
                        (language === 'zh' ? '未送达' : 'Not Delivered')
                      }
                    </Text>
                  </View>
                </View>

                {/* 功能按钮 */}
                <View style={styles.functionSection}>
                  <Text style={styles.sectionTitle}>
                    {language === 'zh' ? '🔧 功能操作' : '🔧 Functions'}
                  </Text>
                  
                  {/* 寄件码 */}
                  <TouchableOpacity 
                    style={styles.functionButton}
                    onPress={() => setShowPickupCodeModal(true)}
                  >
                    <Text style={styles.functionButtonIcon}>🔑</Text>
                    <Text style={styles.functionButtonText}>
                      {language === 'zh' ? '寄件码' : 'Pickup Code'}
                    </Text>
                    <Text style={styles.functionButtonDesc}>
                      {language === 'zh' ? '客户下单时的二维码' : 'Customer order QR code'}
                    </Text>
                  </TouchableOpacity>

                  {/* 送件扫码 */}
                  <TouchableOpacity 
                    style={styles.functionButton}
                    onPress={() => setShowDeliveryScanModal(true)}
                  >
                    <Text style={styles.functionButtonIcon}>📱</Text>
                    <Text style={styles.functionButtonText}>
                      {language === 'zh' ? '送件扫码' : 'Delivery Scan'}
                    </Text>
                    <Text style={styles.functionButtonDesc}>
                      {language === 'zh' ? '店长扫码确认送达' : 'Manager scan to confirm delivery'}
                    </Text>
                  </TouchableOpacity>

                  {/* 上传照片 */}
                  <TouchableOpacity 
                    style={styles.functionButton}
                    onPress={() => setShowPhotoUploadModal(true)}
                    disabled={uploadingPhoto}
                  >
                    <Text style={styles.functionButtonIcon}>📸</Text>
                    <Text style={styles.functionButtonText}>
                      {language === 'zh' ? '上传照片' : 'Upload Photo'}
                    </Text>
                    <Text style={styles.functionButtonDesc}>
                      {language === 'zh' ? '送达证明+定位记录' : 'Delivery proof + location record'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 寄件码模态框 */}
      <Modal
        visible={showPickupCodeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPickupCodeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.codeModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                🔑 {language === 'zh' ? '寄件码' : 'Pickup Code'}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowPickupCodeModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.codeContent}>
              <Text style={styles.codeLabel}>
                {language === 'zh' ? '客户下单二维码' : 'Customer Order QR Code'}
              </Text>
              <View style={styles.qrCodeContainer}>
                <QRCode
                  value={selectedPackage ? selectedPackage.id : ''}
                  size={200}
                  color="#2c5282"
                  backgroundColor="#fff"
                />
              </View>
              <Text style={styles.codeDescription}>
                {language === 'zh' ? 
                  '客户下单时生成的二维码\n快递员可扫描此码进行取件\n请妥善保管此二维码' : 
                  'QR code generated when customer placed order\nCourier can scan this code for pickup\nPlease keep this QR code safe'
                }
              </Text>
              <View style={styles.qrCodeActions}>
                <TouchableOpacity 
                  style={styles.qrCodeButton}
                  onPress={() => setShowPickupCodeModal(false)}
                >
                  <Text style={styles.qrCodeButtonText}>
                    {language === 'zh' ? '关闭' : 'Close'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 送件扫码模态框 */}
      <Modal
        visible={showDeliveryScanModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeliveryScanModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.codeModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                📱 {language === 'zh' ? '送件扫码' : 'Delivery Scan'}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowDeliveryScanModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.codeContent}>
              <Text style={styles.codeLabel}>
                {language === 'zh' ? '送件扫码窗口' : 'Delivery Scan Window'}
              </Text>
              
              <View style={styles.scanWindowContainer}>
                <View style={styles.scanFrame}>
                  <View style={styles.scanFrameCorner} />
                  <View style={[styles.scanFrameCorner, styles.scanFrameCornerTopRight]} />
                  <View style={[styles.scanFrameCorner, styles.scanFrameCornerBottomLeft]} />
                  <View style={[styles.scanFrameCorner, styles.scanFrameCornerBottomRight]} />
                </View>
                <Text style={styles.scanInstruction}>
                  {language === 'zh' ? '请将二维码放入扫描框内' : 'Please place QR code within scan frame'}
                </Text>
              </View>

              <View style={styles.deliveryQRContainer}>
                <Text style={styles.deliveryQRTitle}>
                  {language === 'zh' ? '送件二维码' : 'Delivery QR Code'}
                </Text>
                <QRCode
                  value={selectedPackage ? selectedPackage.id : ''}
                  size={150}
                  color="#27ae60"
                  backgroundColor="#fff"
                />
                <Text style={styles.deliveryQRDescription}>
                  {language === 'zh' ? 
                    '店长扫描此码确认送达\n包裹ID: ' + (selectedPackage ? selectedPackage.id : '') : 
                    'Manager scan this code to confirm delivery\nPackage ID: ' + (selectedPackage ? selectedPackage.id : '')
                  }
                </Text>
              </View>

              <View style={styles.qrCodeActions}>
                <TouchableOpacity 
                  style={styles.qrCodeButton}
                  onPress={() => setShowDeliveryScanModal(false)}
                >
                  <Text style={styles.qrCodeButtonText}>
                    {language === 'zh' ? '关闭' : 'Close'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 上传照片模态框 */}
      <Modal
        visible={showPhotoUploadModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPhotoUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.photoModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                📸 {language === 'zh' ? '上传送达照片' : 'Upload Delivery Photo'}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowPhotoUploadModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.photoContent}>
              <Text style={styles.photoInstruction}>
                {language === 'zh' ? 
                  '📸 包裹送达留底证明\n\n请拍摄包裹送达证明照片\n系统将自动记录当前位置\n完成后可获得KM积分' : 
                  '📸 Delivery Proof Photo\n\nPlease take delivery proof photo\nSystem will automatically record current location\nComplete to earn KM points'
                }
              </Text>
              
              <View style={styles.photoInfoContainer}>
                <Text style={styles.photoInfoTitle}>
                  {language === 'zh' ? '包裹信息' : 'Package Info'}
                </Text>
                <Text style={styles.photoInfoText}>
                  {language === 'zh' ? 
                    `包裹编号: ${selectedPackage ? selectedPackage.id : ''}\n收件人: ${selectedPackage ? selectedPackage.receiver_name : ''}\n地址: ${selectedPackage ? selectedPackage.receiver_address : ''}` :
                    `Package ID: ${selectedPackage ? selectedPackage.id : ''}\nReceiver: ${selectedPackage ? selectedPackage.receiver_name : ''}\nAddress: ${selectedPackage ? selectedPackage.receiver_address : ''}`
                  }
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.photoButton}
                onPress={uploadDeliveryPhoto}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.photoButtonIcon}>📷</Text>
                    <Text style={styles.photoButtonText}>
                      {language === 'zh' ? '拍照上传送达证明' : 'Take Delivery Proof Photo'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              <Text style={styles.photoNote}>
                {language === 'zh' ? 
                  '💡 提示: 请确保照片清晰显示包裹和收件地址\n拍照后系统将自动记录GPS位置信息' : 
                  '💡 Tip: Please ensure photo clearly shows package and delivery address\nGPS location will be automatically recorded after photo'
                }
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mapViewButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
  },
  mapViewIcon: {
    fontSize: 20,
  },
  statsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    width: '23%',
    minWidth: 75,
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statIconContainer: {
    marginBottom: 4,
  },
  statIcon: {
    fontSize: 20,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f4f8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 4,
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  scanButton: {
    backgroundColor: '#2c5282',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  scanButtonIcon: {
    fontSize: 16,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#2c3e50',
  },
  clearIcon: {
    fontSize: 18,
    color: '#999',
    padding: 4,
  },
  filterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    minWidth: 85,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f4f8',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: '#2c5282',
    borderColor: '#2c5282',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  resultBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  resultText: {
    fontSize: 13,
    color: '#666',
  },
  batchButton: {
    backgroundColor: '#2c5282',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  batchButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  batchControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectAllButton: {
    backgroundColor: '#f0f4f8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2c5282',
  },
  selectAllText: {
    color: '#2c5282',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedCount: {
    fontSize: 12,
    color: '#666',
  },
  batchActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  batchActionButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  batchActionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelBatchButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelBatchText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  smartAssignButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  smartAssignButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  packageCardSelected: {
    borderWidth: 2,
    borderColor: '#2c5282',
    backgroundColor: '#f8fafc',
  },
  colorBar: {
    width: 5,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageId: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2c5282',
  },
  packageIdWithCheckbox: {
    flex: 1,
    marginRight: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#cbd5e0',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#2c5282',
    borderColor: '#2c5282',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 16,
  },
  infoColumn: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  timeText: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
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
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  largeModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
    maxWidth: 450,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  packageDetailModal: {
    width: '95%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#2c5282',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 17.5,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  packageDetailContent: {
    padding: 20,
  },
  packageInfoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 16,
  },
  infoValueRight: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  functionSection: {
    marginBottom: 20,
  },
  functionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  functionButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  functionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 4,
  },
  functionButtonDesc: {
    fontSize: 12,
    color: '#666',
  },
  codeModal: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  codeContent: {
    padding: 24,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  qrCodeContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  codeDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  qrCodeActions: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  qrCodeButton: {
    backgroundColor: '#2c5282',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  qrCodeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanWindowContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  scanFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#27ae60',
    borderRadius: 12,
    position: 'relative',
    marginBottom: 16,
  },
  scanFrameCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#27ae60',
    borderWidth: 3,
  },
  scanFrameCornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  scanFrameCornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  scanFrameCornerBottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  scanInstruction: {
    fontSize: 14,
    color: '#27ae60',
    textAlign: 'center',
    fontWeight: '500',
  },
  deliveryQRContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  deliveryQRTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 12,
  },
  deliveryQRDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  photoModal: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoContent: {
    padding: 24,
    alignItems: 'center',
  },
  photoInstruction: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  photoInfoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
  },
  photoInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 8,
  },
  photoInfoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  photoButton: {
    backgroundColor: '#2c5282',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    flexDirection: 'row',
  },
  photoButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  photoNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  packageInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  packageInfoText: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  statusOptions: {
    gap: 12,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusOptionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  statusOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  updatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  updatingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2c5282',
  },
  noOptionsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noOptionsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  routeCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
  courierStats: {
    fontSize: 14,
    color: '#9b59b6',
    fontWeight: '600',
  },
  routeStats: {
    alignItems: 'flex-end',
  },
  routeStatsText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  packagesList: {
    marginBottom: 12,
  },
  packagesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
  },
  packageItem: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
    paddingLeft: 8,
  },
  morePackages: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    paddingLeft: 8,
  },
  assignButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  noOptimizationContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noOptimizationText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
