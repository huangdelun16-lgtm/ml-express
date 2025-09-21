import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { financeService } from '../services/api';

export default function FinanceManager({ userData }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadFinanceRecords();
  }, [filter]);

  const loadFinanceRecords = async () => {
    try {
      setLoading(true);
      
      let params = {};
      if (filter !== 'all') {
        params.status = filter;
      }
      
      const response = await financeService.getFinanceRecords(params);
      
      if (response.success) {
        setRecords(response.data || []);
      } else {
        Alert.alert('加载失败', response.message || '无法获取财务记录');
      }
    } catch (error) {
      console.error('加载财务记录失败:', error);
      Alert.alert('加载失败', '网络连接失败，请稍后重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateRecordStatus = async (record, newStatus) => {
    try {
      const response = await financeService.updateFinanceStatus(record.id, newStatus);
      
      if (response.success) {
        Alert.alert('更新成功', `订单 ${record.trackingNumber} 状态已更新为 ${newStatus}`);
        loadFinanceRecords();
      } else {
        Alert.alert('更新失败', response.message || '请稍后重试');
      }
    } catch (error) {
      console.error('更新状态失败:', error);
      Alert.alert('更新失败', '网络错误，请稍后重试');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFinanceRecords();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '待付费':
        return '#f44336';
      case '已预付':
        return '#4caf50';
      case '待签收':
        return '#ff9800';
      case '已完成':
        return '#4caf50';
      default:
        return '#666';
    }
  };

  const getStatusActions = (record) => {
    const actions = [];
    
    if (record.status === '待付费') {
      actions.push({
        title: '确认预付',
        color: '#4caf50',
        onPress: () => updateRecordStatus(record, '已预付')
      });
    }
    
    if (record.status === '待签收') {
      actions.push({
        title: '确认完成',
        color: '#4caf50',
        onPress: () => updateRecordStatus(record, '已完成')
      });
    }

    return actions;
  };

  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
            全部 ({records.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === '待付费' && styles.filterButtonActive]}
          onPress={() => setFilter('待付费')}
        >
          <Text style={[styles.filterButtonText, filter === '待付费' && styles.filterButtonTextActive]}>
            待付费 ({records.filter(r => r.status === '待付费').length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === '已预付' && styles.filterButtonActive]}
          onPress={() => setFilter('已预付')}
        >
          <Text style={[styles.filterButtonText, filter === '已预付' && styles.filterButtonTextActive]}>
            已预付 ({records.filter(r => r.status === '已预付').length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === '已完成' && styles.filterButtonActive]}
          onPress={() => setFilter('已完成')}
        >
          <Text style={[styles.filterButtonText, filter === '已完成' && styles.filterButtonTextActive]}>
            已完成 ({records.filter(r => r.status === '已完成').length})
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderRecordCard = (record, index) => (
    <View key={record.id || index} style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <Text style={styles.trackingNumber}>
          {record.trackingNumber || `FINANCE-${record.id}`}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) }]}>
          <Text style={styles.statusText}>{record.status}</Text>
        </View>
      </View>

      <View style={styles.recordInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>客户:</Text>
          <Text style={styles.infoValue}>{record.customerName || '未知'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>金额:</Text>
          <Text style={[styles.infoValue, styles.amountText]}>
            ¥{record.amount || record.totalAmount || '0'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>业务类型:</Text>
          <Text style={styles.infoValue}>
            {record.businessType === 'city' ? '同城快递' : '跨境物流'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>创建时间:</Text>
          <Text style={styles.infoValue}>
            {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : '未知'}
          </Text>
        </View>
      </View>

      {getStatusActions(record).length > 0 && (
        <View style={styles.actionButtons}>
          {getStatusActions(record).map((action, actionIndex) => (
            <TouchableOpacity
              key={actionIndex}
              style={[styles.actionButton, { backgroundColor: action.color }]}
              onPress={action.onPress}
            >
              <Text style={styles.actionButtonText}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={styles.loadingText}>加载财务数据...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderFilterButtons()}
      
      <ScrollView
        style={styles.recordsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {records.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>📭</Text>
            <Text style={styles.emptyTitle}>暂无财务记录</Text>
            <Text style={styles.emptySubtitle}>下拉刷新或稍后再试</Text>
          </View>
        ) : (
          <>
            <Text style={styles.countText}>共 {records.length} 条记录</Text>
            {records.map(renderRecordCard)}
          </>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: '#1976d2',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  countText: {
    padding: 15,
    fontSize: 14,
    color: '#666',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  recordsList: {
    flex: 1,
  },
  recordCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackingNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recordInfo: {
    marginBottom: 12,
  },
  infoRow: {
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
  amountText: {
    fontWeight: 'bold',
    color: '#4caf50',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
  },
  bottomSpace: {
    height: 20,
  },
});
