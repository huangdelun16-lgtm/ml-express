import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { packageService, auditLogService, Package } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PackageDetailScreen({ route, navigation }: any) {
  const { package: pkg } = route.params;
  const [currentPackage, setCurrentPackage] = useState<Package>(pkg);
  const [updating, setUpdating] = useState(false);

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

  const handleCall = () => {
    Linking.openURL(`tel:${currentPackage.receiver_phone}`);
  };

  const handleNavigate = () => {
    const address = encodeURIComponent(currentPackage.receiver_address);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
  };

  const updateStatus = async (newStatus: string) => {
    const oldStatus = currentPackage.status;
    
    Alert.alert(
      '确认更新',
      `将包裹状态从「${oldStatus}」更新为「${newStatus}」？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          onPress: async () => {
            setUpdating(true);
            try {
              let pickupTime = '';
              let deliveryTime = '';
              
              if (newStatus === '已取件') {
                pickupTime = new Date().toLocaleString('zh-CN');
              }
              if (newStatus === '已送达') {
                deliveryTime = new Date().toLocaleString('zh-CN');
              }

              const success = await packageService.updatePackageStatus(
                currentPackage.id,
                newStatus,
                pickupTime,
                deliveryTime
              );

              if (success) {
                // 记录审计日志
                const currentUser = await AsyncStorage.getItem('currentUser') || 'unknown';
                const currentUserName = await AsyncStorage.getItem('currentUserName') || '未知用户';
                
                await auditLogService.log({
                  user_id: currentUser,
                  user_name: currentUserName,
                  action_type: 'update',
                  module: 'packages',
                  target_id: currentPackage.id,
                  target_name: `包裹 ${currentPackage.id}`,
                  action_description: `移动端更新包裹状态：${oldStatus} → ${newStatus}`,
                  old_value: oldStatus,
                  new_value: newStatus
                });

                setCurrentPackage({ ...currentPackage, status: newStatus });
                Alert.alert('成功', '包裹状态已更新');
              } else {
                Alert.alert('失败', '状态更新失败，请重试');
              }
            } catch (error) {
              console.error('更新状态失败:', error);
              Alert.alert('失败', '网络错误，请检查连接');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>包裹详情</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* 包裹编号和状态 */}
        <View style={styles.section}>
          <Text style={styles.packageId}>{currentPackage.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentPackage.status) }]}>
            <Text style={styles.statusText}>{currentPackage.status}</Text>
          </View>
        </View>

        {/* 收件信息 */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>📍 收件信息</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>收件人</Text>
            <Text style={styles.infoValue}>{currentPackage.receiver_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>电话</Text>
            <Text style={styles.infoValue}>{currentPackage.receiver_phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>地址</Text>
            <Text style={[styles.infoValue, { flex: 1 }]}>{currentPackage.receiver_address}</Text>
          </View>
        </View>

        {/* 寄件信息 */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>📤 寄件信息</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>寄件人</Text>
            <Text style={styles.infoValue}>{currentPackage.sender_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>电话</Text>
            <Text style={styles.infoValue}>{currentPackage.sender_phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>地址</Text>
            <Text style={[styles.infoValue, { flex: 1 }]}>{currentPackage.sender_address}</Text>
          </View>
        </View>

        {/* 包裹信息 */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>📦 包裹信息</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>类型</Text>
            <Text style={styles.infoValue}>{currentPackage.package_type}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>重量</Text>
            <Text style={styles.infoValue}>{currentPackage.weight}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>价格</Text>
            <Text style={styles.infoValue}>{currentPackage.price}</Text>
          </View>
          {currentPackage.description && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>备注</Text>
              <Text style={[styles.infoValue, { flex: 1 }]}>{currentPackage.description}</Text>
            </View>
          )}
        </View>

        {/* 操作按钮 */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <Text style={styles.actionButtonText}>📞 拨打电话</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleNavigate}>
            <Text style={styles.actionButtonText}>🗺️ 导航</Text>
          </TouchableOpacity>
        </View>

        {/* 状态更新按钮 */}
        <View style={styles.statusUpdateContainer}>
          <Text style={styles.sectionTitle}>更新状态</Text>
          <View style={styles.statusButtons}>
            {currentPackage.status === '待取件' && (
              <TouchableOpacity
                style={[styles.statusUpdateButton, { backgroundColor: '#3498db' }]}
                onPress={() => updateStatus('已取件')}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.statusUpdateText}>✓ 已取件</Text>
                )}
              </TouchableOpacity>
            )}

            {currentPackage.status === '已取件' && (
              <TouchableOpacity
                style={[styles.statusUpdateButton, { backgroundColor: '#9b59b6' }]}
                onPress={() => updateStatus('配送中')}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.statusUpdateText}>🚚 配送中</Text>
                )}
              </TouchableOpacity>
            )}

            {['已取件', '配送中'].includes(currentPackage.status) && (
              <TouchableOpacity
                style={[styles.statusUpdateButton, { backgroundColor: '#27ae60' }]}
                onPress={() => updateStatus('已送达')}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.statusUpdateText}>✓ 已送达</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 60,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  packageId: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c5282',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    width: 80,
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3182ce',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusUpdateContainer: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusButtons: {
    gap: 10,
  },
  statusUpdateButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  statusUpdateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
