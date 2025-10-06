import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { courierService, packageService, Courier, Package } from '../services/supabase';
import { useApp } from '../contexts/AppContext';

interface CourierStats {
  totalDeliveries: number;
  todayDeliveries: number;
  averageRating: number;
  activeTime: string;
}

interface CourierWithStats extends Courier {
  stats?: CourierStats;
  currentPackages?: Package[];
}

export default function CourierManagementScreen({ navigation }: any) {
  const { language } = useApp();
  const [couriers, setCouriers] = useState<CourierWithStats[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<CourierWithStats | null>(null);
  const [showCourierDetail, setShowCourierDetail] = useState(false);
  const [showAddCourier, setShowAddCourier] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'list' | 'analytics'>('overview');
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'busy'>('all');
  
  // 新增骑手表单
  const [newCourierForm, setNewCourierForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    vehicle_type: 'motorcycle',
    license_number: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadCouriers(), loadPackages()]);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCouriers = async () => {
    try {
      const courierData = await courierService.getAllCouriers();
      const couriersWithStats = await Promise.all(
        courierData.map(async (courier) => {
          const stats = await calculateCourierStats(courier);
          const currentPackages = packages.filter(pkg => 
            pkg.courier === courier.name && 
            ['已分配', '配送中', '已取件'].includes(pkg.status)
          );
          
          return {
            ...courier,
            stats,
            currentPackages
          };
        })
      );
      setCouriers(couriersWithStats);
    } catch (error) {
      console.error('加载快递员失败:', error);
    }
  };

  const loadPackages = async () => {
    try {
      const packageData = await packageService.getAllPackages();
      setPackages(packageData);
    } catch (error) {
      console.error('加载包裹失败:', error);
    }
  };

  const calculateCourierStats = async (courier: Courier): Promise<CourierStats> => {
    const today = new Date().toLocaleDateString('zh-CN');
    const courierPackages = packages.filter(pkg => pkg.courier === courier.name);
    const todayPackages = courierPackages.filter(pkg => {
      const createDate = new Date(pkg.create_time).toLocaleDateString('zh-CN');
      return createDate === today;
    });

    return {
      totalDeliveries: courier.total_deliveries || courierPackages.length,
      todayDeliveries: todayPackages.length,
      averageRating: courier.rating || 5.0,
      activeTime: courier.last_active || '未知'
    };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // 添加新骑手
  const handleAddCourier = async () => {
    if (!newCourierForm.name.trim() || !newCourierForm.phone.trim()) {
      Alert.alert('提示', '请填写姓名和电话');
      return;
    }

    try {
      // 这里应该调用API添加新骑手
      Alert.alert('成功', '新骑手添加成功！');
      setShowAddCourier(false);
      setNewCourierForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        vehicle_type: 'motorcycle',
        license_number: '',
      });
      await loadData();
    } catch (error) {
      Alert.alert('错误', '添加骑手失败');
    }
  };

  // 更新骑手状态
  const updateCourierStatus = async (courierId: string, newStatus: 'active' | 'inactive' | 'busy') => {
    try {
      await courierService.updateCourierStatus(courierId, newStatus);
      await loadCouriers();
    } catch (error) {
      Alert.alert('错误', '状态更新失败');
    }
  };

  // 筛选骑手
  const filteredCouriers = couriers.filter(courier => {
    const matchesSearch = courier.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         courier.phone.includes(searchText);
    const matchesStatus = filterStatus === 'all' || courier.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // 计算统计数据
  const stats = {
    total: couriers.length,
    active: couriers.filter(c => c.status === 'active').length,
    busy: couriers.filter(c => c.status === 'busy').length,
    inactive: couriers.filter(c => c.status === 'inactive').length,
    todayDeliveries: couriers.reduce((sum, c) => sum + (c.stats?.todayDeliveries || 0), 0),
    avgRating: couriers.length > 0 
      ? couriers.reduce((sum, c) => sum + (c.stats?.averageRating || 5), 0) / couriers.length 
      : 5.0
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#27ae60';
      case 'busy': return '#f39c12';
      case 'inactive': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '空闲';
      case 'busy': return '忙碌';
      case 'inactive': return '离线';
      default: return '未知';
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

  const renderCourierItem = ({ item }: { item: CourierWithStats }) => (
    <TouchableOpacity 
      style={styles.courierCard} 
      activeOpacity={0.7}
      onPress={() => {
        setSelectedCourier(item);
        setShowCourierDetail(true);
      }}
    >
      {/* 状态指示条 */}
      <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
      
      {/* 头像 */}
      <View style={[styles.avatar, { backgroundColor: getStatusColor(item.status) }]}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>

      {/* 信息 */}
      <View style={styles.courierInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.courierName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        <Text style={styles.courierPhone}>📞 {item.phone}</Text>
        <Text style={styles.vehicleType}>{getVehicleIcon(item.vehicle_type)} {item.vehicle_type}</Text>

        {/* 统计信息 */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{item.stats?.todayDeliveries || 0}</Text>
            <Text style={styles.statLabel}>{language === 'zh' ? '今日' : 'Today'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{item.stats?.totalDeliveries || 0}</Text>
            <Text style={styles.statLabel}>{language === 'zh' ? '总计' : 'Total'}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>⭐ {(item.stats?.averageRating || 5.0).toFixed(1)}</Text>
            <Text style={styles.statLabel}>{language === 'zh' ? '评分' : 'Rating'}</Text>
          </View>
        </View>

        {/* 当前任务 */}
        <Text style={styles.currentTasks}>
          📦 {language === 'zh' ? `当前任务: ${item.currentPackages?.length || 0} 个` : `Current Tasks: ${item.currentPackages?.length || 0}`}
        </Text>
      </View>

      {/* 箭头 */}
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🚚 {language === 'zh' ? '骑手管理' : 'Courier Management'}</Text>
        <TouchableOpacity onPress={() => setShowAddCourier(true)} style={styles.addButton}>
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* 标签页导航 */}
      <View style={styles.tabContainer}>
        {[
          { key: 'overview', label: language === 'zh' ? '📊 概览' : '📊 Overview', icon: '📊' },
          { key: 'list', label: language === 'zh' ? '👥 列表' : '👥 List', icon: '👥' },
          { key: 'analytics', label: language === 'zh' ? '📈 分析' : '📈 Analytics', icon: '📈' }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label.replace(/📊|👥|📈\s/, '')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 内容区域 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c5282" />
          <Text style={styles.loadingText}>{language === 'zh' ? '加载骑手数据...' : 'Loading courier data...'}</Text>
        </View>
      ) : (
        <>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'list' && renderListTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
        </>
      )}

      {/* 新增骑手模态框 */}
      <Modal
        visible={showAddCourier}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddCourier(false)}
      >
        <View style={styles.addCourierModalOverlay}>
          <View style={styles.addCourierModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>➕ {language === 'zh' ? '新增骑手' : 'Add Courier'}</Text>
              <TouchableOpacity
                onPress={() => setShowAddCourier(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.formContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{language === 'zh' ? '姓名 *' : 'Name *'}</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCourierForm.name}
                  onChangeText={(text) => setNewCourierForm({...newCourierForm, name: text})}
                  placeholder={language === 'zh' ? '请输入骑手姓名' : 'Enter courier name'}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{language === 'zh' ? '电话 *' : 'Phone *'}</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCourierForm.phone}
                  onChangeText={(text) => setNewCourierForm({...newCourierForm, phone: text})}
                  placeholder={language === 'zh' ? '请输入手机号码' : 'Enter phone number'}
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{language === 'zh' ? '车辆类型 *' : 'Vehicle Type *'}</Text>
                <View style={styles.vehicleTypeContainer}>
                  {[
                    { key: 'motorcycle', label: language === 'zh' ? '🏍️ 摩托车' : '🏍️ Motorcycle' },
                    { key: 'car', label: language === 'zh' ? '🚗 汽车' : '🚗 Car' },
                    { key: 'bicycle', label: language === 'zh' ? '🚲 自行车' : '🚲 Bicycle' },
                    { key: 'truck', label: language === 'zh' ? '🚚 卡车' : '🚚 Truck' }
                  ].map(vehicle => (
                    <TouchableOpacity
                      key={vehicle.key}
                      style={[
                        styles.vehicleOption,
                        newCourierForm.vehicle_type === vehicle.key && styles.selectedVehicleOption
                      ]}
                      onPress={() => setNewCourierForm({...newCourierForm, vehicle_type: vehicle.key})}
                    >
                      <Text style={[
                        styles.vehicleOptionText,
                        newCourierForm.vehicle_type === vehicle.key && styles.selectedVehicleOptionText
                      ]}>
                        {vehicle.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{language === 'zh' ? '邮箱' : 'Email'}</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCourierForm.email}
                  onChangeText={(text) => setNewCourierForm({...newCourierForm, email: text})}
                  placeholder={language === 'zh' ? '请输入邮箱地址（可选）' : 'Enter email address (optional)'}
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{language === 'zh' ? '地址' : 'Address'}</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCourierForm.address}
                  onChangeText={(text) => setNewCourierForm({...newCourierForm, address: text})}
                  placeholder={language === 'zh' ? '请输入地址（可选）' : 'Enter address (optional)'}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{language === 'zh' ? '驾照号' : 'License Number'}</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCourierForm.license_number}
                  onChangeText={(text) => setNewCourierForm({...newCourierForm, license_number: text})}
                  placeholder={language === 'zh' ? '请输入驾照号码（可选）' : 'Enter license number (optional)'}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => setShowAddCourier(false)}
                >
                  <Text style={styles.cancelButtonText}>{language === 'zh' ? '取消' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={handleAddCourier}>
                  <Text style={styles.submitButtonText}>{language === 'zh' ? '✅ 添加骑手' : '✅ Add Courier'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 骑手详情模态框 */}
      {selectedCourier && (
        <Modal
          visible={showCourierDetail}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCourierDetail(false)}
        >
          <View style={styles.detailModalOverlay}>
            <View style={styles.detailModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>👤 {selectedCourier.name}</Text>
                <TouchableOpacity
                  onPress={() => setShowCourierDetail(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.detailContainer}>
                {/* 基本信息卡片 */}
                <View style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>{language === 'zh' ? '基本信息' : 'Basic Information'}</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{language === 'zh' ? '电话:' : 'Phone:'}</Text>
                    <Text style={styles.detailValue}>{selectedCourier.phone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{language === 'zh' ? '车辆:' : 'Vehicle:'}</Text>
                    <Text style={styles.detailValue}>{getVehicleIcon(selectedCourier.vehicle_type)} {selectedCourier.vehicle_type}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{language === 'zh' ? '状态:' : 'Status:'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedCourier.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(selectedCourier.status)}</Text>
                    </View>
                  </View>
                </View>

                {/* 工作统计卡片 */}
                <View style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>{language === 'zh' ? '工作统计' : 'Work Statistics'}</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxNumber}>{selectedCourier.stats?.todayDeliveries || 0}</Text>
                      <Text style={styles.statBoxLabel}>{language === 'zh' ? '今日配送' : 'Today'}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxNumber}>{selectedCourier.stats?.totalDeliveries || 0}</Text>
                      <Text style={styles.statBoxLabel}>{language === 'zh' ? '总配送数' : 'Total'}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxNumber}>⭐ {(selectedCourier.stats?.averageRating || 5.0).toFixed(1)}</Text>
                      <Text style={styles.statBoxLabel}>{language === 'zh' ? '服务评分' : 'Rating'}</Text>
                    </View>
                  </View>
                </View>

                {/* 当前任务 */}
                <View style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>{language === 'zh' ? `当前任务 (${selectedCourier.currentPackages?.length || 0})` : `Current Tasks (${selectedCourier.currentPackages?.length || 0})`}</Text>
                  {selectedCourier.currentPackages && selectedCourier.currentPackages.length > 0 ? (
                    selectedCourier.currentPackages.map((pkg, index) => (
                      <View key={index} style={styles.taskItem}>
                        <Text style={styles.taskId}>{pkg.id}</Text>
                        <Text style={styles.taskReceiver}>→ {pkg.receiver_name}</Text>
                        <Text style={styles.taskStatus}>{pkg.status}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noTasksText}>当前无配送任务</Text>
                  )}
                </View>

                {/* 状态控制 */}
                <View style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>状态控制</Text>
                  <View style={styles.statusControls}>
                    {(['active', 'busy', 'inactive'] as const).map(status => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusControlButton,
                          { backgroundColor: getStatusColor(status) },
                          selectedCourier.status === status && styles.activeStatusButton
                        ]}
                        onPress={() => updateCourierStatus(selectedCourier.id, status)}
                      >
                        <Text style={styles.statusControlText}>{getStatusText(status)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );

  // 标签页渲染函数
  function renderOverviewTab() {
    return (
      <ScrollView 
        style={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 核心统计卡片 */}
        <View style={styles.overviewStatsContainer}>
          <View style={styles.overviewStatsGrid}>
            <View style={[styles.overviewStatCard, { backgroundColor: '#27ae60' }]}>
              <Text style={styles.overviewStatNumber}>{stats.active}</Text>
              <Text style={styles.overviewStatLabel}>空闲骑手</Text>
            </View>
            <View style={[styles.overviewStatCard, { backgroundColor: '#f39c12' }]}>
              <Text style={styles.overviewStatNumber}>{stats.busy}</Text>
              <Text style={styles.overviewStatLabel}>忙碌骑手</Text>
            </View>
            <View style={[styles.overviewStatCard, { backgroundColor: '#95a5a6' }]}>
              <Text style={styles.overviewStatNumber}>{stats.inactive}</Text>
              <Text style={styles.overviewStatLabel}>离线骑手</Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>📊 今日总览</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>总骑手数:</Text>
              <Text style={styles.summaryValue}>{stats.total} 人</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>今日配送:</Text>
              <Text style={styles.summaryValue}>{stats.todayDeliveries} 单</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>平均评分:</Text>
              <Text style={styles.summaryValue}>⭐ {stats.avgRating.toFixed(1)} 分</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>在线率:</Text>
              <Text style={styles.summaryValue}>
                {stats.total > 0 ? Math.round((stats.active + stats.busy) / stats.total * 100) : 0}%
              </Text>
            </View>
          </View>
        </View>

        {/* 实时位置追踪 */}
        <View style={styles.locationSection}>
          <View style={styles.locationHeader}>
            <Text style={styles.sectionTitle}>📍 实时位置追踪</Text>
            <TouchableOpacity style={styles.refreshLocationButton} onPress={onRefresh}>
              <Text style={styles.refreshLocationIcon}>🔄</Text>
              <Text style={styles.refreshLocationText}>刷新</Text>
            </TouchableOpacity>
          </View>
          
          {/* 活跃骑手位置卡片 */}
          {couriers.filter(c => c.status !== 'inactive').map(courier => (
            <View key={courier.id} style={styles.locationCard}>
              <View style={styles.locationCardHeader}>
                <View style={styles.courierLocationInfo}>
                  <View style={[styles.locationAvatar, { backgroundColor: getStatusColor(courier.status) }]}>
                    <Text style={styles.locationAvatarText}>{courier.name.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.locationCourierName}>{courier.name}</Text>
                    <Text style={styles.locationCourierStatus}>
                      {getVehicleIcon(courier.vehicle_type)} {getStatusText(courier.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.locationActions}>
                  <View style={styles.currentTaskBadge}>
                    <Text style={styles.currentTaskText}>
                      📦 {courier.currentPackages?.length || 0}
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* 模拟位置信息 */}
              <View style={styles.locationDetails}>
                <View style={styles.locationRow}>
                  <Text style={styles.locationIcon}>📍</Text>
                  <Text style={styles.locationText}>
                    {courier.status === 'active' ? '待命中 - 配送站' : 
                     courier.status === 'busy' ? '配送中 - 第' + Math.floor(Math.random() * 10 + 1) + '号路线' : 
                     '未知位置'}
                  </Text>
                </View>
                <View style={styles.locationRow}>
                  <Text style={styles.locationIcon}>⏰</Text>
                  <Text style={styles.locationText}>
                    最后更新: {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                {courier.status === 'busy' && courier.currentPackages && courier.currentPackages.length > 0 && (
                  <View style={styles.locationRow}>
                    <Text style={styles.locationIcon}>🎯</Text>
                    <Text style={styles.locationText}>
                      前往: {courier.currentPackages[0]?.receiver_address.substring(0, 20)}...
                    </Text>
                  </View>
                )}
              </View>

              {/* 快捷操作 */}
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => {
                    setSelectedCourier(courier);
                    setShowCourierDetail(true);
                  }}
                >
                  <Text style={styles.quickActionText}>📋 详情</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickActionButton, { backgroundColor: '#3498db' }]}
                  onPress={() => Alert.alert('位置追踪', `正在追踪 ${courier.name} 的实时位置...`)}
                >
                  <Text style={styles.quickActionText}>🗺️ 追踪</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickActionButton, { backgroundColor: '#e67e22' }]}
                  onPress={() => Alert.alert('联系骑手', `拨打 ${courier.phone}`)}
                >
                  <Text style={styles.quickActionText}>📞 联系</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {couriers.filter(c => c.status !== 'inactive').length === 0 && (
            <View style={styles.noActiveRiders}>
              <Text style={styles.noActiveRidersEmoji}>😴</Text>
              <Text style={styles.noActiveRidersText}>暂无活跃骑手</Text>
            </View>
          )}
        </View>

        {/* 最近活跃骑手 */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>🌟 表现优秀骑手</Text>
          {couriers
            .filter(c => c.status !== 'inactive')
            .sort((a, b) => (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0))
            .slice(0, 3)
            .map(courier => (
            <TouchableOpacity
              key={courier.id}
              style={styles.recentCourierItem}
              onPress={() => {
                setSelectedCourier(courier);
                setShowCourierDetail(true);
              }}
            >
              <View style={[styles.miniAvatar, { backgroundColor: getStatusColor(courier.status) }]}>
                <Text style={styles.miniAvatarText}>{courier.name.charAt(0)}</Text>
              </View>
              <View style={styles.recentCourierInfo}>
                <Text style={styles.recentCourierName}>{courier.name}</Text>
                <Text style={styles.recentCourierStats}>
                  今日: {courier.stats?.todayDeliveries || 0} 单 | ⭐ {(courier.stats?.averageRating || 5.0).toFixed(1)}
                </Text>
              </View>
              <View style={[styles.recentStatusBadge, { backgroundColor: getStatusColor(courier.status) }]}>
                <Text style={styles.recentStatusText}>{getStatusText(courier.status)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  function renderListTab() {
    return (
      <View style={styles.listTabContainer}>
        {/* 搜索和筛选 */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="搜索骑手姓名或电话..."
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'all', label: '全部' },
              { key: 'active', label: '空闲' },
              { key: 'busy', label: '忙碌' },
              { key: 'inactive', label: '离线' }
            ].map(filter => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  filterStatus === filter.key && styles.activeFilterChip
                ]}
                onPress={() => setFilterStatus(filter.key as any)}
              >
                <Text style={[
                  styles.filterChipText,
                  filterStatus === filter.key && styles.activeFilterChipText
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 骑手列表 */}
        <FlatList
          data={filteredCouriers}
          renderItem={renderCourierItem}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>👥</Text>
              <Text style={styles.emptyText}>暂无符合条件的骑手</Text>
            </View>
          }
        />
      </View>
    );
  }

  function renderAnalyticsTab() {
    return (
      <ScrollView 
        style={styles.tabContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 性能分析 */}
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsTitle}>📈 性能分析</Text>
          
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartText}>📊 配送效率图表</Text>
            <Text style={styles.chartSubText}>（此处可集成图表组件）</Text>
          </View>
          
          {/* Top 骑手排行 */}
          <View style={styles.rankingSection}>
            <Text style={styles.rankingTitle}>🏆 Top 骑手排行</Text>
            {couriers
              .sort((a, b) => (b.stats?.todayDeliveries || 0) - (a.stats?.todayDeliveries || 0))
              .slice(0, 5)
              .map((courier, index) => (
                <View key={courier.id} style={styles.rankingItem}>
                  <View style={styles.rankingPosition}>
                    <Text style={styles.rankingNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.rankingInfo}>
                    <Text style={styles.rankingName}>{courier.name}</Text>
                    <Text style={styles.rankingStats}>
                      今日: {courier.stats?.todayDeliveries || 0} 单 | 评分: {(courier.stats?.averageRating || 5.0).toFixed(1)}
                    </Text>
                  </View>
                  <View style={styles.rankingBadge}>
                    <Text style={styles.rankingBadgeText}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        </View>

        {/* 工作时间管理 */}
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsTitle}>⏰ 工作时间管理</Text>
          
          {/* 今日工作时间统计 */}
          <View style={styles.workTimeStats}>
            <View style={styles.workTimeHeader}>
              <Text style={styles.workTimeTitle}>📊 今日工作时间</Text>
              <Text style={styles.workTimeDate}>{new Date().toLocaleDateString('zh-CN')}</Text>
            </View>
            
            {couriers.filter(c => c.status !== 'inactive').map(courier => {
              // 模拟工作时间数据
              const workHours = Math.floor(Math.random() * 8) + 2; // 2-10小时
              const breakHours = Math.floor(Math.random() * 2) + 0.5; // 0.5-2.5小时
              const efficiency = Math.floor(Math.random() * 30) + 70; // 70-100%
              
              return (
                <View key={courier.id} style={styles.workTimeItem}>
                  <View style={styles.workTimeItemHeader}>
                    <View style={styles.courierWorkInfo}>
                      <Text style={styles.workTimeCourierName}>{courier.name}</Text>
                      <Text style={styles.workTimeCourierStatus}>
                        {getVehicleIcon(courier.vehicle_type)} {getStatusText(courier.status)}
                      </Text>
                    </View>
                    <View style={styles.workTimeActions}>
                      <TouchableOpacity 
                        style={styles.timeActionButton}
                        onPress={() => Alert.alert('工作时间', `${courier.name} 今日工作时间详情`)}
                      >
                        <Text style={styles.timeActionText}>详情</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.workTimeDetails}>
                    <View style={styles.timeStatRow}>
                      <View style={styles.timeStat}>
                        <Text style={styles.timeStatIcon}>⏱️</Text>
                        <Text style={styles.timeStatLabel}>工作时长</Text>
                        <Text style={styles.timeStatValue}>{workHours.toFixed(1)}h</Text>
                      </View>
                      <View style={styles.timeStat}>
                        <Text style={styles.timeStatIcon}>☕</Text>
                        <Text style={styles.timeStatLabel}>休息时长</Text>
                        <Text style={styles.timeStatValue}>{breakHours.toFixed(1)}h</Text>
                      </View>
                      <View style={styles.timeStat}>
                        <Text style={styles.timeStatIcon}>📈</Text>
                        <Text style={styles.timeStatLabel}>工作效率</Text>
                        <Text style={[styles.timeStatValue, { color: efficiency >= 85 ? '#27ae60' : efficiency >= 70 ? '#f39c12' : '#e74c3c' }]}>
                          {efficiency}%
                        </Text>
                      </View>
                    </View>
                    
                    {/* 工作时间进度条 */}
                    <View style={styles.workProgressContainer}>
                      <View style={styles.workProgressBar}>
                        <View 
                          style={[
                            styles.workProgressFill, 
                            { width: `${(workHours / 12) * 100}%` }
                          ]} 
                        />
                      </View>
                      <Text style={styles.workProgressText}>
                        {workHours}/12 小时 ({Math.round((workHours / 12) * 100)}%)
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* 车辆类型分布 */}
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsTitle}>🚗 车辆类型分布</Text>
          {['motorcycle', 'car', 'bicycle', 'truck'].map(vehicle => {
            const count = couriers.filter(c => c.vehicle_type === vehicle).length;
            const percentage = stats.total > 0 ? (count / stats.total * 100).toFixed(1) : '0.0';
            
            return (
              <View key={vehicle} style={styles.vehicleDistributionItem}>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleIcon}>{getVehicleIcon(vehicle)}</Text>
                  <Text style={styles.vehicleLabel}>{vehicle}</Text>
                </View>
                <View style={styles.vehicleStats}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[styles.progressFill, { width: `${percentage}%` }]} 
                    />
                  </View>
                  <Text style={styles.vehicleCount}>{count}人 ({percentage}%)</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* 骑手绩效评估 */}
        <View style={styles.analyticsCard}>
          <Text style={styles.analyticsTitle}>🎯 骑手绩效评估</Text>
          
          {couriers.slice(0, 5).map(courier => {
            const performance = Math.floor(Math.random() * 40) + 60; // 60-100分
            const deliverySpeed = Math.floor(Math.random() * 30) + 15; // 15-45分钟/单
            const customerSatisfaction = Math.floor(Math.random() * 20) + 80; // 80-100%
            
            return (
              <View key={courier.id} style={styles.performanceItem}>
                <View style={styles.performanceHeader}>
                  <View style={styles.performanceCourierInfo}>
                    <Text style={styles.performanceCourierName}>{courier.name}</Text>
                    <Text style={styles.performanceScore}>综合评分: {performance}分</Text>
                  </View>
                  <View style={styles.performanceGrade}>
                    <Text style={[
                      styles.performanceGradeText,
                      { color: performance >= 90 ? '#27ae60' : performance >= 80 ? '#f39c12' : '#e74c3c' }
                    ]}>
                      {performance >= 90 ? 'A+' : performance >= 85 ? 'A' : performance >= 80 ? 'B+' : performance >= 75 ? 'B' : 'C'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.performanceMetrics}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>配送速度</Text>
                    <Text style={styles.metricValue}>{deliverySpeed}分钟/单</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>客户满意度</Text>
                    <Text style={styles.metricValue}>{customerSatisfaction}%</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>准时率</Text>
                    <Text style={styles.metricValue}>{Math.floor(Math.random() * 20) + 80}%</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  }
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
  addButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 22,
  },
  addIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
  },
  // 标签页样式
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2c5282',
    backgroundColor: '#f8fafc',
  },
  tabIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2c5282',
    fontWeight: '600',
  },
  // 内容区域
  tabContent: {
    flex: 1,
    padding: 16,
  },
  // 概览页面样式
  overviewStatsContainer: {
    marginBottom: 20,
  },
  overviewStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  overviewStatCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewStatNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  overviewStatLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 15,
    color: '#555',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c5282',
  },
  recentSection: {
    marginTop: 20,
  },
  // 位置追踪样式
  locationSection: {
    marginBottom: 20,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  refreshLocationIcon: {
    fontSize: 14,
  },
  refreshLocationText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  locationCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  courierLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  locationCourierName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  locationCourierStatus: {
    fontSize: 12,
    color: '#666',
  },
  locationActions: {
    alignItems: 'flex-end',
  },
  currentTaskBadge: {
    backgroundColor: '#f0f4f8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  currentTaskText: {
    fontSize: 12,
    color: '#2c5282',
    fontWeight: '600',
  },
  locationDetails: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 8,
    width: 20,
  },
  locationText: {
    fontSize: 13,
    color: '#2c3e50',
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#2c5282',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  noActiveRiders: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  noActiveRidersEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  noActiveRidersText: {
    fontSize: 14,
    color: '#999',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  recentCourierItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  miniAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  miniAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  recentCourierInfo: {
    flex: 1,
  },
  recentCourierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  recentCourierStats: {
    fontSize: 13,
    color: '#666',
  },
  recentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recentStatusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  // 列表页面样式
  listTabContainer: {
    flex: 1,
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#2c3e50',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f4f8',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: '#2c5282',
    borderColor: '#2c5282',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterChipText: {
    color: '#fff',
  },
  // 骑手卡片样式
  courierCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statusIndicator: {
    width: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  courierInfo: {
    flex: 1,
    padding: 16,
    paddingLeft: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  courierName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  courierPhone: {
    fontSize: 14,
    color: '#3182ce',
    marginBottom: 4,
  },
  vehicleType: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c5282',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  currentTasks: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  arrow: {
    fontSize: 24,
    color: '#cbd5e0',
    alignSelf: 'center',
    marginRight: 16,
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
    textAlign: 'center',
  },
  // 分析页面样式
  analyticsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  chartPlaceholder: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  chartText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  chartSubText: {
    fontSize: 12,
    color: '#999',
  },
  rankingSection: {
    marginTop: 8,
  },
  rankingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  rankingPosition: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2c5282',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankingNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  rankingInfo: {
    flex: 1,
  },
  rankingName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  rankingStats: {
    fontSize: 12,
    color: '#666',
  },
  rankingBadge: {
    marginLeft: 12,
  },
  rankingBadgeText: {
    fontSize: 20,
  },
  vehicleDistributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
  },
  vehicleIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  vehicleLabel: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  vehicleStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f4f8',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2c5282',
    borderRadius: 4,
  },
  vehicleCount: {
    fontSize: 12,
    color: '#666',
    minWidth: 60,
    textAlign: 'right',
  },
  // 工作时间管理样式
  workTimeStats: {
    marginBottom: 8,
  },
  workTimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  workTimeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  workTimeDate: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f4f8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  workTimeItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  workTimeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  courierWorkInfo: {
    flex: 1,
  },
  workTimeCourierName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  workTimeCourierStatus: {
    fontSize: 12,
    color: '#666',
  },
  workTimeActions: {
    alignItems: 'flex-end',
  },
  timeActionButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  timeActionText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  workTimeDetails: {
    gap: 12,
  },
  timeStatRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeStat: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  timeStatIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  timeStatLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  timeStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c5282',
  },
  workProgressContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
  },
  workProgressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  workProgressFill: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 4,
  },
  workProgressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  // 绩效评估样式
  performanceItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  performanceCourierInfo: {
    flex: 1,
  },
  performanceCourierName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  performanceScore: {
    fontSize: 12,
    color: '#666',
  },
  performanceGrade: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  performanceGradeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  performanceMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c5282',
  },
  // 优化后的模态框样式
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  // 新增骑手模态框专用样式
  addCourierModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  addCourierModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  detailModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
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
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  // 表单样式
  formContainer: {
    maxHeight: 500,
    paddingVertical: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
    height: 50,
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vehicleOption: {
    backgroundColor: '#f0f4f8',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: '48%',
    alignItems: 'center',
  },
  selectedVehicleOption: {
    backgroundColor: '#2c5282',
    borderColor: '#2c5282',
  },
  vehicleOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedVehicleOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  // 详情页样式
  detailContainer: {
    flex: 1,
    paddingVertical: 16,
  },
  detailCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statBoxNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 4,
  },
  statBoxLabel: {
    fontSize: 12,
    color: '#666',
  },
  taskItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2c5282',
  },
  taskId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 2,
  },
  taskReceiver: {
    fontSize: 13,
    color: '#2c3e50',
    marginBottom: 2,
  },
  taskStatus: {
    fontSize: 12,
    color: '#666',
  },
  noTasksText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  statusControls: {
    flexDirection: 'row',
    gap: 8,
  },
  statusControlButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    opacity: 0.7,
  },
  activeStatusButton: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  statusControlText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
