import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { packageService } from '../services/supabase';

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 模拟当前骑手账号，实际应该从登录状态获取
  const currentCourierName = '骑手账号';

  useEffect(() => {
    loadMyPackages();
  }, []);

  const loadMyPackages = async () => {
    try {
      setLoading(true);
      const allPackages = await packageService.getAllPackages();
      
      // 过滤出分配给当前骑手的包裹
      const myPackages = allPackages.filter(pkg => 
        pkg.courier === currentCourierName && 
        (pkg.status === '已取件' || pkg.status === '配送中' || pkg.status === '配送进行中')
      );
      
      setPackages(myPackages);
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
        <Text style={styles.headerTitle}>我的任务</Text>
        <Text style={styles.headerSubtitle}>当前骑手：{currentCourierName}</Text>
      </View>

      {packages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>暂无任务</Text>
          <Text style={styles.emptySubtitle}>您当前没有分配的包裹任务</Text>
        </View>
      ) : (
        <FlatList
          data={packages}
          renderItem={renderPackageItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}

      {showDetailModal && renderDetailModal()}
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
});

export default MyTasksScreen;
